// USULAN REVISI assistantService.js (file terpisah; file asli TIDAK diganti).
// Perubahan terhadap versi asli:
//   1. Jawaban answerable tanpa sitasi valid TIDAK dikirim sebagai jawaban resmi -> fallback WhatsApp.
//   2. Indeks sumber yang tidak menunjuk ke sumber nyata -> fallback.
//   3. Error integritas jawaban AI (ASSISTANT_BAD_RESPONSE, ASSISTANT_INVALID_SOURCE_INDEX) -> fallback
//      WhatsApp, bukan error 502 ke pengunjung. Error penyedia (429/503/timeout) tetap error teknis.
//   4. Pertanyaan dibersihkan dari karakter tersembunyi sebelum retrieval dan sebelum masuk ke URL WhatsApp.
//   5. Bentuk response ({ answerable, answer, citations, fallback }) TIDAK berubah.
// TODO (integrasi frontend): pola URL sitasi (assistantCitationService.SOURCE_CONFIG) masih menunjuk ke
//   endpoint /api/...; tentukan pola URL halaman publik setelah frontend selesai. Tidak diubah di sini.

const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");

const {
  retrieveOfficialSources,
} = require("./assistantRetrievalService");

const {
  generateAssistantAnswer,
  stripHiddenChars,
} = require("./assistantGeminiService");

const {
  buildCitations,
} = require("./assistantCitationService");

const getAssistantSettings = async () => {
  const { data, error } = await supabase
    .from("assistant_settings")
    .select("is_enabled, whatsapp_number, whatsapp_message")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throwDbError("Assistant: load settings", error);
  }

  return data || {
    is_enabled: false,
    whatsapp_number: null,
    whatsapp_message:
      "Informasi tersebut belum tersedia. Silakan hubungi Customer Service Universitas LIA.",
  };
};

const normalizeWhatsAppNumber = (value) => {
  if (typeof value !== "string") return null;

  let number = value.replace(/\D/g, "");

  if (number.startsWith("0")) {
    number = `62${number.slice(1)}`;
  }

  if (!number.startsWith("62")) {
    return null;
  }

  if (number.length < 9 || number.length > 15) {
    return null;
  }

  return number;
};

const buildFallback = (settings, question) => {
  const message =
    typeof settings.whatsapp_message === "string" &&
    settings.whatsapp_message.trim()
      ? settings.whatsapp_message.trim()
      : "Informasi tersebut belum tersedia. Silakan hubungi Customer Service Universitas LIA.";

  const number = normalizeWhatsAppNumber(
    settings.whatsapp_number
  );

  const fallback = {
    type: "whatsapp",
    message,
    url: null,
  };

  if (number) {
    const whatsappMessage = `${message}\n\nPertanyaan saya: ${question}`;

    fallback.url =
      `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage)}`;
  }

  return fallback;
};

// Kegagalan integritas jawaban AI diperlakukan sebagai "tidak ada jawaban terverifikasi".
const FALLBACK_ERROR_CODES = new Set([
  "ASSISTANT_BAD_RESPONSE",
  "ASSISTANT_INVALID_SOURCE_INDEX",
]);

const askAssistant = async (
  question,
  {
    history = [],
    dependencies = {},
  } = {}
) => {
  if (typeof question !== "string" || !question.trim()) {
    throw new AppError(
      "Pertanyaan tidak boleh kosong.",
      400,
      "EMPTY_ASSISTANT_QUESTION"
    );
  }

  const normalizedQuestion = stripHiddenChars(question).trim();

  if (!normalizedQuestion) {
    throw new AppError(
      "Pertanyaan tidak boleh kosong.",
      400,
      "EMPTY_ASSISTANT_QUESTION"
    );
  }

  if (normalizedQuestion.length > 2000) {
    throw new AppError(
      "Pertanyaan terlalu panjang.",
      400,
      "ASSISTANT_QUESTION_TOO_LONG"
    );
  }

  const loadSettings =
    dependencies.getSettings || getAssistantSettings;

  const retrieveSources =
    dependencies.retrieveSources || retrieveOfficialSources;

  const generateAnswer =
    dependencies.generateAnswer || generateAssistantAnswer;

  const createCitations =
    dependencies.buildCitations || buildCitations;

  const settings = await loadSettings();

  if (!settings.is_enabled) {
    throw new AppError(
      "AI Assistant sedang tidak aktif.",
      503,
      "ASSISTANT_DISABLED"
    );
  }

  const sources = await retrieveSources(normalizedQuestion);

  if (!sources.length) {
    return {
      answerable: false,
      answer: null,
      citations: [],
      fallback: buildFallback(settings, normalizedQuestion),
    };
  }

  let result;

  try {
    result = await generateAnswer({
      question: normalizedQuestion,
      history,
      sources,
    });
  } catch (error) {
    if (FALLBACK_ERROR_CODES.has(error?.code)) {
      console.warn(`[ASSISTANT] Jawaban AI tidak lolos validasi (${error.code}); fallback dipakai`);

      return {
        answerable: false,
        answer: null,
        citations: [],
        fallback: buildFallback(settings, normalizedQuestion),
      };
    }

    throw error;
  }

  if (!result || !result.answerable) {
    return {
      answerable: false,
      answer: null,
      citations: [],
      fallback: buildFallback(settings, normalizedQuestion),
    };
  }

  const usedSources = (Array.isArray(result.usedSourceIndexes) ? result.usedSourceIndexes : [])
    .map((sourceIndex) => sources[sourceIndex]);

  // Setiap indeks harus menunjuk ke sumber nyata dan sekurang-kurangnya satu sitasi valid harus terbentuk.
  const citations =
    usedSources.length > 0 && usedSources.every(Boolean)
      ? createCitations(usedSources)
      : [];

  if (!Array.isArray(citations) || citations.length === 0) {
    console.warn("[ASSISTANT] Tidak ada sitasi valid untuk jawaban; fallback dipakai");

    return {
      answerable: false,
      answer: null,
      citations: [],
      fallback: buildFallback(settings, normalizedQuestion),
    };
  }

  return {
    answerable: true,
    answer: result.answer,
    citations,
    fallback: null,
  };
};

module.exports = {
  getAssistantSettings,
  normalizeWhatsAppNumber,
  buildFallback,
  askAssistant,
};
