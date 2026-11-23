// Tes OFFLINE untuk data seed Assistant Knowledge. Tidak memakai database, .env, atau jaringan.
// Jalankan dari folder be:   node scripts/testAssistantKnowledgeSeed.js

const entries = require("./data/assistantKnowledgeSeed");
const { runSeed, keyOf } = require("./seedAssistantKnowledge");
const { createKnowledgeSchema, isSafeSourcePath } = require("../src/validators/assistantKnowledgeValidator");

let passed = 0;
let failed = 0;
const check = (name, condition, detail = "") => {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`GAGAL: ${name}${detail ? ` -> ${detail}` : ""}`);
  }
};

const KNOWN_CATEGORIES = new Set([
  "Profil", "Akademik", "Program Studi", "PMB", "Layanan Akademik",
  "Unit dan Bagian", "LPM dan LPPM", "Kehidupan Kampus", "Alumni", "Kontak", "Panduan Website",
]);

// --- Skema & kualitas data ---
const seenKeys = new Set();
for (const entry of entries) {
  const parsed = createKnowledgeSchema.safeParse({ ...entry, status: "published", validUntil: null });
  check(`skema valid: ${entry.title}`, parsed.success, parsed.success ? "" : parsed.error.issues.map((i) => i.message).join("; "));
  check(`kategori dikenal: ${entry.title}`, KNOWN_CATEGORIES.has(entry.category), entry.category);
  check(`sourcePath aman: ${entry.title}`, entry.sourcePath && isSafeSourcePath(entry.sourcePath));
  check(`keyword tidak berubah saat dinormalisasi: ${entry.title}`, parsed.success && parsed.data.keywords.length === entry.keywords.length);
  check(`isi tidak berubah saat dinormalisasi: ${entry.title}`, parsed.success && parsed.data.content === entry.content);
  check(`minimal 5 keyword: ${entry.title}`, entry.keywords.length >= 5);
  check(`judul+kategori unik: ${entry.title}`, !seenKeys.has(keyOf(entry.title, entry.category)));
  seenKeys.add(keyOf(entry.title, entry.category));
  check(`tidak ada placeholder: ${entry.title}`, !/lorem|TODO|XXX|\.\.\.\.|\[isi/i.test(entry.content));
}

// Setiap program studi di FE punya entri sendiri.
const requiredPrograms = ["D3 Bahasa Inggris", "S1 Bahasa Inggris", "S1 Bahasa Jepang", "S1 Desain Komunikasi Visual", "S1 Bisnis Digital", "S1 Informatika", "S1 Sistem Informasi"];
for (const name of requiredPrograms) {
  check(`ada entri program studi ${name}`, entries.some((e) => e.category === "Program Studi" && e.title.includes(name)));
}
check("ada entri kontak", entries.some((e) => e.category === "Kontak"));

// Angka biaya/jadwal PMB sengaja tidak dimasukkan (dikelola di database).
const costEntry = entries.find((e) => e.title.startsWith("Biaya kuliah dan jadwal"));
check("entri biaya tidak memuat nominal Rupiah", costEntry && !/Rp\s?\d/.test(costEntry.content));

// --- Logika seed dengan Supabase palsu ---
const createFakeSupabase = (initialRows = []) => {
  const rows = initialRows.map((row, index) => ({ id: `id-${index}`, ...row }));
  const calls = { inserts: 0, updates: 0 };
  const client = {
    rows,
    calls,
    from(table) {
      if (table !== "assistant_knowledge") throw new Error(`Tabel tak terduga: ${table}`);
      return {
        select: () => ({
          order: () => ({
            range: async (from, to) => ({ data: rows.slice(from, to + 1).map(({ id, title, category }) => ({ id, title, category })), error: null }),
          }),
        }),
        insert: async (batch) => {
          calls.inserts += 1;
          for (const row of batch) rows.push({ id: `new-${rows.length}`, ...row });
          return { error: null };
        },
        update: (patch) => ({
          eq: async (_column, id) => {
            calls.updates += 1;
            const row = rows.find((r) => r.id === id);
            Object.assign(row, patch);
            return { error: null };
          },
        }),
      };
    },
  };
  return client;
};

(async () => {
  const quiet = () => {};

  // 1) dry-run tidak menulis
  let fake = createFakeSupabase();
  let result = await runSeed({ supabase: fake, dryRun: true, log: quiet });
  check("dry-run tidak menambah baris", fake.rows.length === 0 && fake.calls.inserts === 0);
  check("dry-run melaporkan rencana", result.planned.insert === entries.length);

  // 2) seed pertama menambah semua sebagai published, tanpa created_by
  fake = createFakeSupabase();
  result = await runSeed({ supabase: fake, log: quiet });
  check("seed pertama menambah semua", result.inserted === entries.length && fake.rows.length === entries.length);
  check("semua published", fake.rows.every((r) => r.status === "published"));
  check("created_by kosong", fake.rows.every((r) => r.created_by === null && r.updated_by === null));
  check("valid_until kosong", fake.rows.every((r) => r.valid_until === null));
  check("keywords berupa array", fake.rows.every((r) => Array.isArray(r.keywords) && r.keywords.length > 0));

  // 3) seed kedua tidak menduplikasi
  const before = fake.rows.length;
  result = await runSeed({ supabase: fake, log: quiet });
  check("seed ulang tidak menduplikasi", fake.rows.length === before && result.inserted === 0 && result.skipped === entries.length);

  // 4) tanpa --update, hasil edit admin tidak ditimpa
  fake.rows[0].content = "ISI SUDAH DIEDIT ADMIN";
  await runSeed({ supabase: fake, log: quiet });
  check("edit admin tidak ditimpa tanpa --update", fake.rows[0].content === "ISI SUDAH DIEDIT ADMIN");

  // 5) --update menimpa isi
  result = await runSeed({ supabase: fake, update: true, log: quiet });
  check("--update memperbarui item yang ada", result.updated === entries.length && fake.rows[0].content !== "ISI SUDAH DIEDIT ADMIN");

  // 6) --draft
  fake = createFakeSupabase();
  await runSeed({ supabase: fake, draft: true, log: quiet });
  check("--draft menyimpan sebagai draft", fake.rows.every((r) => r.status === "draft"));

  // 7) item buatan admin dengan judul berbeda tidak disentuh, judul sama beda huruf dikenali
  fake = createFakeSupabase([
    { title: "Knowledge buatan admin", category: "Lainnya" },
    { title: entries[0].title.toUpperCase(), category: entries[0].category.toLowerCase() },
  ]);
  result = await runSeed({ supabase: fake, log: quiet });
  check("item admin lain tidak disentuh", fake.rows.some((r) => r.title === "Knowledge buatan admin"));
  check("judul sama beda huruf besar/kecil dianggap sudah ada", result.skipped === 1 && result.inserted === entries.length - 1);

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
