// Pengujian OFFLINE untuk penyimpanan & penggabungan terjemahan. Supabase diganti database
// palsu di memori (meniru struktur content_translations hasil pemeriksaan), jadi tidak ada data
// asli yang tersentuh. Jalankan:  node scripts/testTranslationStore.js
//
// Belum dicakup (butuh Supabase asli): constraint/trigger database sungguhan, RLS, performa.

process.env.GEMINI_API_KEY = "test-key-not-real";
process.env.GEMINI_MODEL = "gemini-test-flash";

const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");

// ---------- Supabase palsu ----------
const db = { news: [], announcements: [], content_translations: [] };
let failNextTable = null;

class FakeQuery {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.filters = [];
    this.payload = null;
    this.opts = null;
    this.mode = "many";
  }
  select() { return this; }
  eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
  in(col, arr) { this.filters.push((r) => arr.includes(r[col])); return this; }
  order() { return this; }
  upsert(row, opts) { this.op = "upsert"; this.payload = row; this.opts = opts; return this; }
  delete() { this.op = "delete"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  run() {
    if (failNextTable === this.table) return { data: null, error: { message: "boom", code: "XX000" } };
    const rows = db[this.table];
    const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
    let result;
    if (this.op === "upsert") {
      const keys = this.opts.onConflict.split(",");
      const existing = rows.find((r) => keys.every((k) => r[k] === this.payload[k]));
      const now = new Date().toISOString();
      if (existing) Object.assign(existing, this.payload, { updated_at: now });
      else rows.push({ id: `tr-${rows.length + 1}`, created_at: now, updated_at: now, ...this.payload });
      result = [rows.find((r) => keys.every((k) => r[k] === this.payload[k]))];
    } else if (this.op === "delete") {
      result = match();
      db[this.table] = rows.filter((r) => !result.includes(r));
    } else {
      result = match();
    }
    if (this.mode === "many") return { data: result, error: null };
    if (this.mode === "maybe") return { data: result[0] ?? null, error: null };
    return result[0] ? { data: result[0], error: null } : { data: null, error: { message: "no rows" } };
  }
  then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
}
const fakeSupabase = { from: (table) => new FakeQuery(table) };

const supabasePath = require.resolve(path.join(__dirname, "../src/config/supabase.js"));
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase };

const store = require("../src/services/translationStore");
const withTranslation = require("../src/middleware/withTranslation");

// ---------- Harness ----------
let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${e.message}`); }
};
const rejectsWith = async (p, status, code) => {
  try { await p; } catch (e) { assert.equal(e.statusCode, status); assert.equal(e.code, code); return; }
  assert.fail("seharusnya melempar error");
};

const NEWS_A = "11111111-1111-4111-8111-111111111111";
const NEWS_B = "22222222-2222-4222-8222-222222222222";
const reset = () => {
  db.news = [
    { id: NEWS_A, title: "Wisuda 2026", excerpt: "Ringkasan wisuda", content_html: "<p>Isi wisuda</p>" },
    { id: NEWS_B, title: "Beasiswa", excerpt: "Ringkasan beasiswa", content_html: "<p>Isi beasiswa</p>" },
  ];
  db.announcements = [];
  db.content_translations = [];
  failNextTable = null;
};

(async () => {
  console.log("translationStore");

  await test("loadSource: hash stabil, 404 bila tidak ada", async () => {
    reset();
    const a = await store.loadSource("news", NEWS_A);
    const b = await store.loadSource("news", NEWS_A);
    assert.equal(a.hash, b.hash);
    assert.match(a.hash, /^[0-9a-f]{64}$/);
    await rejectsWith(store.loadSource("news", "33333333-3333-4333-8333-333333333333"), 404, "NEWS_NOT_FOUND");
  });

  await test("save dengan hash salah -> 409 dan tidak ada yang tersimpan", async () => {
    reset();
    await rejectsWith(
      store.saveTranslation("news", NEWS_A, "en", { fields: { title: "Graduation" }, expectedHash: "0".repeat(64), provider: "manual" }),
      409,
      "SOURCE_CHANGED"
    );
    assert.equal(db.content_translations.length, 0);
  });

  await test("save OK: kolom sesuai skema; save kedua = upsert (tetap 1 baris)", async () => {
    reset();
    const { hash } = await store.loadSource("news", NEWS_A);
    const saved = await store.saveTranslation("news", NEWS_A, "en", {
      fields: { title: "Graduation 2026", excerpt: "Graduation summary", contentHtml: "<p>Graduation</p>" },
      expectedHash: hash,
      provider: "gemini:gemini-test-flash",
    });
    assert.equal(saved.stale, false);
    const row = db.content_translations[0];
    assert.equal(row.entity_type, "news");
    assert.equal(row.entity_id, NEWS_A);
    assert.equal(row.lang, "en");
    assert.equal(row.source_hash, hash);
    assert.equal(row.provider, "gemini:gemini-test-flash");
    assert.match(row.source_hash, /^[0-9a-f]{64}$/); // sesuai CHECK hash_format
    assert.notEqual(row.lang, "id"); // sesuai CHECK lang_not_source
    await store.saveTranslation("news", NEWS_A, "en", { fields: { title: "Graduation Day" }, expectedHash: hash, provider: "manual" });
    assert.equal(db.content_translations.length, 1);
    assert.equal(db.content_translations[0].fields.title, "Graduation Day");
  });

  await test("list: stale=true setelah sumber berubah", async () => {
    reset();
    const { hash } = await store.loadSource("news", NEWS_A);
    await store.saveTranslation("news", NEWS_A, "en", { fields: { title: "Graduation" }, expectedHash: hash, provider: "manual" });
    assert.equal((await store.listTranslations("news", NEWS_A)).items[0].stale, false);
    db.news[0].title = "Wisuda 2026 (revisi)";
    assert.equal((await store.listTranslations("news", NEWS_A)).items[0].stale, true);
  });

  await test("overlay: terjemahan dipakai; tanpa terjemahan / usang -> Indonesia", async () => {
    reset();
    const { hash } = await store.loadSource("news", NEWS_A);
    await store.saveTranslation("news", NEWS_A, "en", {
      fields: { title: "Graduation", excerpt: "Summary", contentHtml: "<p>EN body</p>" },
      expectedHash: hash,
      provider: "manual",
    });
    const items = [
      { id: NEWS_A, title: "Wisuda 2026", excerpt: "Ringkasan wisuda", contentHtml: "<p>Isi wisuda</p>" },
      { id: NEWS_B, title: "Beasiswa", excerpt: "Ringkasan beasiswa" },
    ];
    let out = await store.overlayPublicItems("news", "en", items);
    assert.equal(out[0].title, "Graduation");
    assert.equal(out[0].contentHtml, "<p>EN body</p>");
    assert.equal(out[0].translated, true);
    assert.equal(out[1].title, "Beasiswa");
    assert.equal(out[1].translated, false);
    assert.equal(items[0].title, "Wisuda 2026"); // input tidak dimutasi

    db.news[0].content_html = "<p>Isi wisuda diubah</p>"; // sumber berubah -> usang
    out = await store.overlayPublicItems("news", "en", items);
    assert.equal(out[0].title, "Wisuda 2026");
    assert.equal(out[0].translated, false);
  });

  await test("overlay: item daftar (tanpa contentHtml) tidak mendapat contentHtml", async () => {
    reset();
    const { hash } = await store.loadSource("news", NEWS_A);
    await store.saveTranslation("news", NEWS_A, "en", { fields: { title: "G", contentHtml: "<p>x</p>" }, expectedHash: hash, provider: "manual" });
    const out = await store.overlayPublicItems("news", "en", [{ id: NEWS_A, title: "Wisuda 2026", excerpt: "e" }]);
    assert.equal("contentHtml" in out[0], false);
  });

  await test("terjemahan berita tidak bocor ke entity_type lain", async () => {
    reset();
    db.announcements = [{ id: NEWS_A, title: "Pengumuman", excerpt: "x", content_html: "<p>y</p>" }]; // id sama, tabel lain
    const { hash } = await store.loadSource("news", NEWS_A);
    await store.saveTranslation("news", NEWS_A, "en", { fields: { title: "Graduation" }, expectedHash: hash, provider: "manual" });
    const out = await store.overlayPublicItems("announcement", "en", [{ id: NEWS_A, title: "Pengumuman", excerpt: "x" }]);
    assert.equal(out[0].translated, false);
  });

  await test("delete: terhapus; kedua kali -> 404", async () => {
    reset();
    const { hash } = await store.loadSource("news", NEWS_A);
    await store.saveTranslation("news", NEWS_A, "en", { fields: { title: "G" }, expectedHash: hash, provider: "manual" });
    await store.deleteTranslation("news", NEWS_A, "en");
    assert.equal(db.content_translations.length, 0);
    await rejectsWith(store.deleteTranslation("news", NEWS_A, "en"), 404, "TRANSLATION_NOT_FOUND");
  });

  console.log("withTranslation (middleware publik)");
  const app = express();
  const listBody = () => ({
    success: true,
    data: { items: [{ id: NEWS_A, title: "Wisuda 2026", excerpt: "Ringkasan wisuda" }], pagination: { page: 1 } },
  });
  app.get("/news", withTranslation("news"), (req, res) => res.json(listBody()));
  app.get("/news/one", withTranslation("news"), (req, res) =>
    res.json({ success: true, data: { news: { id: NEWS_A, title: "Wisuda 2026", excerpt: "Ringkasan wisuda", contentHtml: "<p>Isi wisuda</p>" } } }));
  app.get("/news/missing", withTranslation("news"), (req, res) =>
    res.status(404).json({ success: false, message: "Berita tidak ditemukan", code: "NEWS_NOT_FOUND" }));
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const get = async (p) => { const res = await fetch(`http://127.0.0.1:${server.address().port}${p}`); return { status: res.status, body: await res.json() }; };

  await test("tanpa ?lang, lang=id, lang=fr -> respons IDENTIK dengan aslinya", async () => {
    reset();
    for (const q of ["", "?lang=id", "?lang=fr", "?lang=en%20"]) {
      const { body } = await get(`/news${q}`);
      assert.deepEqual(body, listBody(), `query ${q}`);
    }
  });

  await test("?lang=en: daftar & detail memakai terjemahan; yang belum ada tetap Indonesia", async () => {
    reset();
    const { hash } = await store.loadSource("news", NEWS_A);
    await store.saveTranslation("news", NEWS_A, "en", {
      fields: { title: "Graduation 2026", excerpt: "Summary", contentHtml: "<p>EN body</p>" },
      expectedHash: hash, provider: "manual",
    });
    let r = await get("/news?lang=en");
    assert.equal(r.body.data.items[0].title, "Graduation 2026");
    assert.equal(r.body.data.items[0].translated, true);
    assert.equal(r.body.data.lang, "en");
    assert.deepEqual(r.body.data.pagination, { page: 1 });
    r = await get("/news/one?lang=EN");
    assert.equal(r.body.data.news.contentHtml, "<p>EN body</p>");
    db.news[0].title = "Wisuda berubah"; // usang -> fallback
    r = await get("/news/one?lang=en");
    assert.equal(r.body.data.news.contentHtml, "<p>Isi wisuda</p>");
    assert.equal(r.body.data.news.translated, false);
  });

  await test("respons error (404) diteruskan apa adanya", async () => {
    const r = await get("/news/missing?lang=en");
    assert.equal(r.status, 404);
    assert.equal(r.body.code, "NEWS_NOT_FOUND");
  });

  await test("database gagal saat menggabung -> tetap 200 dengan versi Indonesia", async () => {
    reset();
    failNextTable = "content_translations";
    const origError = console.error; console.error = () => {};
    const r = await get("/news?lang=en");
    console.error = origError;
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, listBody());
  });

  server.close();
  console.log(`\nSelesai: ${passed} lulus, ${failed} gagal`);
  process.exit(failed === 0 ? 0 : 1);
})();
