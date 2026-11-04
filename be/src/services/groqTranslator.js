const env = require("../config/env");
const AppError = require("../utils/AppError");
const {
  SYSTEM_INSTRUCTION,
  selectFields,
  buildPrompt,
  buildJsonSchema,
  parseTranslation,
} = require("./translationCommon");

// Penerjemah konten dinamis (Indonesia -> Inggris) memakai Groq API (groq-sdk).
// - Hanya dipanggil dari backend, oleh admin, atas permintaan eksplisit (preview). Tidak pernah
//   dipanggil saat pengunjung membuka halaman.
// - Satu permintaan = satu panggilan API untuk semua field (hemat kuota free tier).
// - Model dipilih eksplisit lewat GROQ_MODEL. TIDAK ada fallback ke model/provider lain:
//   kuota habis -> error 429 yang jelas.
// - Retry hanya untuk 503 (layanan sementara tidak tersedia), maks. 3 percobaan, jeda 1 dtk lalu
//   2 dtk. Retry bawaan SDK dimatikan (maxRetries: 0) supaya tidak ada panggilan tersembunyi
//   yang menghabiskan kuota. 429, 4xx lain, dan timeout TIDAK pernah di-retry.
// - Teks yang diterjemahkan diperlakukan sebagai DATA, dan keluaran model divalidasi lalu
//   disanitasi ulang (lihat translationCommon.js).
// - API key tidak pernah ditulis ke log maupun ke pesan error.

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000];

// Batas keluaran. Kuota free tier Groq dihitung per menit (TPM) per model, jadi nilai ini sengaja
// tidak dibuat sangat besar. Teks yang lebih panjang dari ini ditolak dengan pesan yang jelas.
const MAX_COMPLETION_TOKENS = 4096;

// Model gpt-oss mendukung Structured Outputs mode strict (constrained decoding) dan
// reasoning_effort. Model lain dipanggil dengan mode best-effort tanpa parameter reasoning.
const isGptOss = (model) => /^openai\/gpt-oss-(?:20b|120b)$/.test(model);

const NOT_CONFIGURED_MESSAGE = "Layanan terjemahan belum dikonfigurasi (GROQ_API_KEY dan GROQ_MODEL).";

const isConfigured = () => Boolean(env.groqApiKey && env.groqModel);

let cachedClient = null;
const getClient = () => {
  if (!isConfigured()) {
    throw new AppError(NOT_CONFIGURED_MESSAGE, 503, "TRANSLATION_NOT_CONFIGURED");
  }
  if (!cachedClient) {
    // require dilakukan di sini agar server tetap bisa berjalan walau paket belum terpasang
    // dan agar pengujian bisa menyuntikkan klien palsu tanpa jaringan.
    const Groq = require("groq-sdk");
    cachedClient = new Groq({
      apiKey: env.groqApiKey,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
  }
  return cachedClient;
};

// Membuang API key dari teks yang akan dicatat di log (key persis dari env, atau pola gsk_...).
const redact = (text) => {
  let safe = String(text);
  if (env.groqApiKey) safe = safe.split(env.groqApiKey).join("[REDACTED]");
  return safe.replace(/gsk_[A-Za-z0-9_-]{8,}/g, "[REDACTED]");
};

const statusOf = (error) => {
  const status = Number(error && error.status);
  return Number.isFinite(status) && status > 0 ? status : 0;
};

// Kelas error groq-sdk tidak mengisi properti name, jadi nama kelas dibaca dari konstruktornya.
const errorName = (error) =>
  String((error && ((error.constructor && error.constructor.name) || error.name)) || "Error").slice(0, 40);

const isTimeout = (error) =>
  Boolean(error) &&
  (errorName(error) === "APIConnectionTimeoutError" || statusOf(error) === 408 || statusOf(error) === 504);

// Mengubah error SDK/jaringan menjadi AppError yang aman ditampilkan (tanpa membocorkan key).
const mapProviderError = (error) => {
  if (error instanceof AppError) return error;
  const status = statusOf(error);
  console.error(
    `[GROQ] permintaan gagal: ${redact(String((error && error.message) || error)).slice(0, 300)} ` +
      `(status: ${status || "-"})`
  );

  if (isTimeout(error)) {
    return new AppError(
      "Groq terlalu lama merespons (batas waktu terlampaui). Silakan coba lagi beberapa saat lagi.",
      502,
      "TRANSLATION_PROVIDER_TIMEOUT"
    );
  }
  if (status === 429) {
    return new AppError(
      "Kuota gratis Groq sedang habis atau batas permintaan tercapai. Coba lagi nanti; tidak ada model berbayar yang dipakai.",
      429,
      "TRANSLATION_QUOTA_EXCEEDED"
    );
  }
  if (status === 413) {
    return new AppError(
      "Teks terlalu panjang untuk diterjemahkan sekaligus dengan batas kuota Groq. Terjemahkan per bagian atau perpendek teksnya.",
      413,
      "TRANSLATION_TOO_LARGE"
    );
  }
  if ([400, 401, 403, 404, 422].includes(status)) {
    return new AppError(
      "Groq menolak permintaan. Periksa GROQ_API_KEY dan GROQ_MODEL di server.",
      502,
      "TRANSLATION_PROVIDER_REJECTED"
    );
  }
  if (status === 503) {
    return new AppError(
      "Groq sedang sibuk karena permintaan tinggi. Silakan coba lagi beberapa saat lagi.",
      502,
      "TRANSLATION_PROVIDER_BUSY"
    );
  }
  return new AppError("Layanan terjemahan sedang tidak tersedia", 502, "TRANSLATION_PROVIDER_ERROR");
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Hanya 503 yang layak dicoba ulang. Status lain (400, 401, 403, 404, 413, 429, 500, dst.) dan
// timeout tidak pernah di-retry.
const isTemporaryUnavailable = (error) => !(error instanceof AppError) && statusOf(error) === 503;

// Memanggil Groq; mengulang hanya untuk 503. Error terakhir dilempar apa adanya agar tetap
// diproses oleh mapProviderError() di pemanggil.
const createWithRetry = async (client, request, sleep) => {
  for (let attempt = 1; ; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await client.chat.completions.create(request);
      // Hanya angka & status (tanpa teks/konten artikel).
      const usage = (response && response.usage) || {};
      const finish = response && response.choices && response.choices[0] && response.choices[0].finish_reason;
      console.info(
        `[GROQ] percobaan ${attempt}/${MAX_ATTEMPTS} berhasil dalam ${Date.now() - startedAt} ms ` +
          `(token masuk: ${usage.prompt_tokens ?? "-"}, keluar: ${usage.completion_tokens ?? "-"}, finish: ${finish ?? "-"})`
      );
      return response;
    } catch (error) {
      // Hanya metadata aman (nomor percobaan, durasi, nama & status error).
      console.warn(
        `[GROQ] percobaan ${attempt}/${MAX_ATTEMPTS} gagal setelah ${Date.now() - startedAt} ms ` +
          `(error: ${errorName(error)}, status: ${statusOf(error) || "-"})`
      );
      if (attempt >= MAX_ATTEMPTS || !isTemporaryUnavailable(error)) throw error;
      const delayMs = RETRY_DELAYS_MS[attempt - 1];
      console.warn(
        `[GROQ] layanan sementara tidak tersedia (percobaan ${attempt}/${MAX_ATTEMPTS}), coba lagi dalam ${delayMs} ms`
      );
      await sleep(delayMs);
    }
  }
};

const buildRequest = (toSend, names, targetLanguage) => {
  const model = env.groqModel;
  const gptOss = isGptOss(model);
  const request = {
    model,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: buildPrompt(toSend, targetLanguage) },
    ],
    temperature: 0.2,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    response_format: {
      type: "json_schema",
      json_schema: { name: "translation", strict: gptOss, schema: buildJsonSchema(names) },
    },
  };
  if (gptOss) {
    // Terjemahan tidak butuh penalaran panjang: hemat token & kuota, dan jangan kembalikan
    // isi penalaran model.
    request.reasoning_effort = "low";
    request.include_reasoning = false;
  }
  return request;
};

/**
 * Menerjemahkan beberapa field sekaligus.
 * @param {Record<string, {kind: "text"|"html", value: string}>} fields
 * @param {{ targetLang?: "en", client?: object, sleep?: (ms: number) => Promise<void> }} [options]
 *   client & sleep: untuk pengujian (klien palsu dan jeda retry tanpa menunggu sungguhan)
 * @returns {Promise<{ targetLang: string, model: string, translation: Record<string,string> }>}
 */
const translateFields = async (fields, { targetLang = "en", client, sleep = defaultSleep } = {}) => {
  const { targetLanguage, toSend, names } = selectFields(fields, targetLang);

  const groq = client || getClient();

  let response;
  try {
    response = await createWithRetry(groq, buildRequest(toSend, names, targetLanguage), sleep);
  } catch (error) {
    throw mapProviderError(error);
  }

  const choice = response && response.choices && response.choices[0];
  if (choice && choice.finish_reason === "length") {
    throw new AppError(
      "Teks terlalu panjang untuk diterjemahkan sekaligus (hasil terpotong). Terjemahkan per bagian atau perpendek teksnya.",
      422,
      "TRANSLATION_TOO_LONG"
    );
  }

  const translation = parseTranslation(choice && choice.message && choice.message.content, toSend);
  return { targetLang, model: env.groqModel, translation };
};

module.exports = { translateFields, isConfigured, SYSTEM_INSTRUCTION, NOT_CONFIGURED_MESSAGE };
