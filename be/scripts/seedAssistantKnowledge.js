// Mengisi data awal Assistant Knowledge dari scripts/data/assistantKnowledgeSeed.js
// (disusun dari konten halaman frontend).
//
// Jalankan dari folder be:
//   node scripts/seedAssistantKnowledge.js --dry-run     (hanya menampilkan rencana, tidak menulis apa pun)
//   node scripts/seedAssistantKnowledge.js               (menambah item yang belum ada)
//   node scripts/seedAssistantKnowledge.js --draft       (menambah sebagai draft, belum dipakai AI)
//   node scripts/seedAssistantKnowledge.js --update      (juga menimpa item seed yang sudah ada)
//
// Aman dijalankan berulang: item dikenali lewat pasangan (judul, kategori), jadi tidak akan terduplikasi.
// Tanpa --update, item yang sudah ada (termasuk yang sudah diedit admin) TIDAK diubah.
// Hanya menyentuh tabel assistant_knowledge. Tidak menghapus apa pun.

const seedEntries = require("./data/assistantKnowledgeSeed");
const { createKnowledgeSchema } = require("../src/validators/assistantKnowledgeValidator");

const TABLE = "assistant_knowledge";

const keyOf = (title, category) =>
  `${String(category).normalize("NFC").trim().toLowerCase()}::${String(title).normalize("NFC").trim().toLowerCase()}`;

const fetchExisting = async (supabase) => {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, title, category")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Gagal membaca ${TABLE}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
};

// Fungsi murni (client Supabase dikirim dari luar) supaya bisa diuji tanpa database sungguhan.
const runSeed = async ({ supabase, entries = seedEntries, dryRun = false, draft = false, update = false, log = console.log }) => {
  const status = draft ? "draft" : "published";

  // Validasi semua item dengan skema yang sama seperti API admin SEBELUM menulis apa pun.
  const prepared = entries.map((entry) => {
    const parsed = createKnowledgeSchema.safeParse({ ...entry, status, validUntil: null });
    if (!parsed.success) {
      const detail = parsed.error.issues.map((issue) => issue.message).join("; ");
      throw new Error(`Data seed tidak valid untuk "${entry.title}": ${detail}`);
    }
    return parsed.data;
  });

  const existing = await fetchExisting(supabase);
  const existingByKey = new Map(existing.map((row) => [keyOf(row.title, row.category), row]));

  const toInsert = [];
  const toUpdate = [];
  const skipped = [];

  for (const item of prepared) {
    const found = existingByKey.get(keyOf(item.title, item.category));
    if (!found) toInsert.push(item);
    else if (update) toUpdate.push({ id: found.id, item });
    else skipped.push(item);
  }

  log(`Total data seed : ${prepared.length}`);
  log(`Baru ditambahkan: ${toInsert.length}`);
  log(`Diperbarui      : ${toUpdate.length}`);
  log(`Dilewati (ada)  : ${skipped.length}`);
  log(`Status item baru: ${status}`);

  if (dryRun) {
    log("\nMode --dry-run: tidak ada yang ditulis ke database.");
    for (const item of toInsert) log(`  + ${item.category} | ${item.title}`);
    for (const { item } of toUpdate) log(`  ~ ${item.category} | ${item.title}`);
    return { inserted: 0, updated: 0, skipped: skipped.length, planned: { insert: toInsert.length, update: toUpdate.length } };
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map((item) => ({
      title: item.title,
      category: item.category,
      content: item.content,
      keywords: item.keywords ?? [],
      source_label: item.sourceLabel ?? null,
      source_path: item.sourcePath ?? null,
      status,
      valid_until: null,
      created_by: null, // seed dari terminal, bukan dari admin tertentu
      updated_by: null,
    }));

    // Dipecah supaya satu permintaan tidak terlalu besar.
    for (let i = 0; i < rows.length; i += 10) {
      const { error } = await supabase.from(TABLE).insert(rows.slice(i, i + 10));
      if (error) throw new Error(`Gagal menambah knowledge (batch ${i / 10 + 1}): ${error.message}`);
    }
  }

  for (const { id, item } of toUpdate) {
    const { error } = await supabase
      .from(TABLE)
      .update({
        content: item.content,
        keywords: item.keywords ?? [],
        source_label: item.sourceLabel ?? null,
        source_path: item.sourcePath ?? null,
      })
      .eq("id", id);
    if (error) throw new Error(`Gagal memperbarui "${item.title}": ${error.message}`);
  }

  log("\nSelesai.");
  return { inserted: toInsert.length, updated: toUpdate.length, skipped: skipped.length };
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const known = new Set(["--dry-run", "--draft", "--update"]);
  const unknown = [...args].filter((arg) => !known.has(arg));
  if (unknown.length > 0) {
    console.error(`Argumen tidak dikenal: ${unknown.join(", ")}`);
    console.error("Argumen yang tersedia: --dry-run, --draft, --update");
    process.exit(1);
  }

  require("../src/config/env"); // memuat .env dan memvalidasi variabel wajib
  const supabase = require("../src/config/supabase");

  if (args.has("--update")) {
    console.log("Peringatan: --update menimpa isi, keyword, dan sumber item seed yang sudah ada (termasuk yang pernah diedit admin).\n");
  }

  await runSeed({
    supabase,
    dryRun: args.has("--dry-run"),
    draft: args.has("--draft"),
    update: args.has("--update"),
  });
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nGagal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runSeed, keyOf };
