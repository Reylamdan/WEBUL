
const supabase = require("../src/config/supabase");
const env = require("../src/config/env");

const {
  retrieveOfficialSources,
} = require("../src/services/assistantRetrievalService");

const {
  generateAssistantAnswer,
  isConfigured,
} = require("../src/services/assistantGeminiService");

const {
  buildCitations,
} = require("../src/services/assistantCitationService");

const DEFAULT_QUESTION = "Apa berita terbaru Universitas LIA?";

const main = async () => {
  if (!process.argv.includes("--run")) {
    console.log("Pengujian belum dijalankan.");
    console.log("Gunakan: node scripts/testAssistantLive.js --run");
    return;
  }

  if (!isConfigured()) {
    throw new Error("Konfigurasi Gemini belum tersedia.");
  }

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Konfigurasi koneksi Supabase belum tersedia.");
  }

  const question =
    process.argv.slice(2).filter((arg) => arg !== "--run").join(" ") ||
    DEFAULT_QUESTION;

  console.log("\n========================================");
  console.log(" LIVE TEST AI ASSISTANT UNIVERSITAS LIA");
  console.log("========================================");
  console.log("Mode: Supabase READ ONLY + Gemini LIVE");
  console.log("Pertanyaan:", question);

  // TAHAP 1: Retrieval Supabase asli (hanya SELECT).
  console.log("\n[1/3] Mengambil sumber resmi dari Supabase...");

  const sources = await retrieveOfficialSources(question);

  console.log("Jumlah sumber ditemukan:", sources.length);

  if (sources.length === 0) {
    console.log("HASIL: Tidak ada sumber relevan.");
    console.log("Gemini tidak dipanggil karena tidak ada sumber.");
    return;
  }

  sources.forEach((source, index) => {
    console.log(
      `${index + 1}. [${source.type}] ${String(source.title || "Tanpa judul").slice(0, 120)}`
    );
  });

  // TAHAP 2: Gemini API asli.
  console.log("\n[2/3] Mengirim pertanyaan ke Gemini...");

  const result = await generateAssistantAnswer({
    question,
    history: [],
    sources,
  });

  console.log("Model:", result.model);
  console.log("Answerable:", result.answerable);

  if (!result.answerable) {
    console.log("Gemini tidak menghasilkan jawaban terverifikasi.");
    console.log("Rejection reason:", result.rejectionReason || "-");
    return;
  }

  console.log("\nJawaban Gemini:");
  console.log(result.answer);

  // TAHAP 3: Validasi sitasi dari sumber yang digunakan.
  console.log("\n[3/3] Memeriksa sitasi...");

  const usedSources = result.usedSourceIndexes
    .map((index) => sources[index])
    .filter(Boolean);

  const citations = buildCitations(usedSources);

  console.log("Jumlah sumber digunakan:", usedSources.length);
  console.log("Jumlah sitasi valid:", citations.length);

  citations.forEach((citation, index) => {
    console.log(`\nSitasi ${index + 1}:`);
    console.log("Judul:", citation.title);
    console.log("Jenis:", citation.type);
    console.log("URL:", citation.url || "Tidak tersedia");
  });

  if (citations.length === 0) {
    throw new Error("Jawaban tidak menghasilkan sitasi valid.");
  }

  console.log("\n========================================");
  console.log(" LIVE TEST SELESAI");
  console.log("========================================");
  console.log("Supabase: READ ONLY");
  console.log("Gemini: LIVE REQUEST");
  console.log("Database write: TIDAK DILAKUKAN");
};

main().catch((error) => {
  console.error("\nLIVE TEST GAGAL");
  console.error("Pesan:", error.message);
  console.error("Kode:", error.code || "-");
  process.exitCode = 1;
});
