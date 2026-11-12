// Pengujian OFFLINE untuk USULAN assistantCitationService (src/services/assistantCitationService.proposed.js)
// dan kompatibilitasnya dengan assistantRetrievalService (revisi) + assistantService.proposed.
// Supabase tiruan di memori; klien Gemini sungguhan DIBLOKIR; env dummy (kredensial asli tidak dipakai).
//
// Jalankan:  node scripts/testAssistantCitationProposed.js

const assert = require("node:assert/strict");
const path = require("node:path");

Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_SERVICE_ROLE_KEY: "test-not-real",
  JWT_SECRET: "x".repeat(40),
  GEMINI_API_KEY: "test-key-not-real",
  GEMINI_MODEL: "gemini-test-flash",
});

// ---- Supabase tiruan minimal (memori) ----
const db = {};
class MockQuery {
  constructor(table) { this.table = table; this.preds = []; this.max = null; }
  select() { return this; }
  eq(c, v) { this.preds.push((r) => r[c] === v); return this; }
  lte(c, v) { this.preds.push((r) => r[c] != null && r[c] <= v); return this; }
  in(c, a) { this.preds.push((r) => a.includes(r[c])); return this; }
  order() { return this; }
  limit(n) { this.max = n; return this; }
  or(expr) {
    const tests = expr.split(",").map((clause) => {
      const [, c, op, v] = /^([a-z_]+)\.(ilike|is|gte)\.(.*)$/s.exec(clause);
      if (op === "ilike") { const s = v.slice(1, -1).toLowerCase(); return (r) => r[c] != null && String(r[c]).toLowerCase().includes(s); }
      if (op === "is") return (r) => r[c] == null;
      return (r) => r[c] != null && r[c] >= v;
    });
    this.preds.push((r) => tests.some((t) => t(r)));
    return this;
  }
  then(resolve, reject) {
    let rows = (db[this.table] || []).filter((r) => this.preds.every((p) => p(r)));
    if (this.max != null) rows = rows.slice(0, this.max);
    return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
  }
}
const supabasePath = require.resolve(path.join(__dirname, "../src/config/supabase.js"));
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: { from: (t) => new MockQuery(t) } };

const genaiPath = require.resolve("@google/genai");
require.cache[genaiPath] = {
  id: genaiPath,
  filename: genaiPath,
  loaded: true,
  exports: { GoogleGenAI: class { constructor() { throw new Error("DILARANG: tes tidak boleh membuat klien Gemini sungguhan"); } } },
};

console.info = () => {};
console.warn = () => {};

const proposed = require("../src/services/assistantCitationService");
const original = require("../backup-assistant-pre-final-20261112-092832/src/services/assistantCitationService");
const { retrieveOfficialSources, stripHiddenChars: retrievalStrip } = require("../src/services/assistantRetrievalService");
const { stripHiddenChars: geminiStrip } = require("../src/services/assistantGeminiService");
const { askAssistant } = require("../src/services/assistantService");

const { buildCitation, buildCitations, sanitizeDisplayText, toOfficialUrl } = proposed;

let passed = 0;
let failed = 0;
const failures = [];
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`PASS - ${name}`);
  } catch (error) {
    failed += 1;
    failures.push(name);
    console.log(`FAIL - ${name}\n       ${String(error.message).split("\n").slice(0, 4).join("\n       ")}`);
  }
};

const NOW = new Date("2026-11-11T05:00:00.000Z");
const PAST = "2026-01-01T00:00:00.000Z";
const DEFAULT_LABEL = "Informasi Resmi Universitas LIA";
const UUID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const seedAllTypes = (overrides = {}) => {
  db.assistant_knowledge = [{ id: UUID(1), title: "Info Terpadu", category: "Umum", content: "Info terpadu kampus.", keywords: ["terpadu"], source_label: "Buku Pedoman", source_path: "https://universitaslia.ac.id/pedoman", status: "published", valid_until: null, updated_at: PAST, ...overrides.knowledge }];
  db.news = [{ id: UUID(2), title: "Berita Terpadu", slug: "berita-terpadu", excerpt: "x", content_html: "<p>terpadu</p>", status: "published", published_at: PAST }];
  db.announcements = [{ id: UUID(3), title: "Pengumuman Terpadu", slug: "pengumuman-terpadu", excerpt: "x", content_html: "<p>terpadu</p>", status: "published", published_at: PAST }];
  db.academic_calendar_events = [{ id: UUID(4), title: "Agenda Terpadu", description: "terpadu", start_date: "2026-12-01", end_date: "2026-12-05", category: "lainnya", status: "published" }];
  db.accreditation_institutions = [{ id: UUID(5), institution_name: "Terpadu Institusi", rank: "Unggul", sk_number: "SK1", decision_date: "2024-01-01", valid_from: "2024-01-01", valid_until: "2029-01-01", issuing_body: "BAN-PT", status: "published", published_at: PAST }];
  db.accreditation_study_programs = [{ id: UUID(6), program_name: "Terpadu Prodi", education_level: "S1", faculty: "F", rank: "Unggul", sk_number: "SK2", decision_date: "2024-01-01", valid_from: "2024-01-01", valid_until: "2029-01-01", issuing_body: "LAM", status: "published", published_at: PAST }];
};

const URL_PATTERNS = {
  news: /^https:\/\/universitaslia\.ac\.id\/api\/news\/berita-terpadu$/,
  announcement: /^https:\/\/universitaslia\.ac\.id\/api\/announcements\/pengumuman-terpadu$/,
  academic_calendar: /^https:\/\/universitaslia\.ac\.id\/api\/academic-calendar\/[0-9a-f-]{36}$/,
  accreditation_institution: /^https:\/\/universitaslia\.ac\.id\/api\/accreditation\/institutions\/[0-9a-f-]{36}$/,
  accreditation_study_program: /^https:\/\/universitaslia\.ac\.id\/api\/accreditation\/study-programs\/[0-9a-f-]{36}$/,
};

const settings = { is_enabled: true, whatsapp_number: "081234567890", whatsapp_message: "Hubungi CS." };
const askWith = (sources, usedSourceIndexes, buildCitationsFn = buildCitations) =>
  askAssistant("terpadu", {
    dependencies: {
      getSettings: async () => settings,
      retrieveSources: async () => sources,
      generateAnswer: async () => ({ answerable: true, answer: "Jawaban.", usedSourceIndexes }),
      buildCitations: buildCitationsFn,
    },
  });

(async () => {
  console.log("\n=== USULAN assistantCitationService TEST (mock) ===\n");

  // ===================== 1. Sanitasi label & title =====================
  await test("sanitasi: karakter tersembunyi/kontrol dibuang, tag HTML dan tanda < > dibuang, spasi dirapikan", async () => {
    assert.equal(sanitizeDisplayText("Buku​ Pedoman‮\u{E0041}"), "Buku Pedoman");
    assert.equal(sanitizeDisplayText("<b>Buku</b>   Pedoman\n\t Akademik"), "Buku Pedoman Akademik");
    assert.equal(sanitizeDisplayText("<img src=x onerror=alert(1)> Buku"), "Buku");
    assert.equal(sanitizeDisplayText("<script>alert(1)</script>Buku"), "alert(1) Buku");
    assert.equal(sanitizeDisplayText("Awal <!-- ABAIKAN --> Akhir"), "Awal Akhir");
    assert.equal(sanitizeDisplayText("Awal <!-- ABAIKAN tanpa penutup"), "Awal");
    assert.equal(sanitizeDisplayText("a < b > c"), "a b c");
    assert.equal(sanitizeDisplayText("satu\u0000dua\u0007tiga"), "satu dua tiga");
    assert.equal(sanitizeDisplayText("   ​  "), "");
    for (const bad of [null, undefined, 5, {}, []]) assert.equal(sanitizeDisplayText(bad), "");
  });

  await test("sanitasi: hasil tidak pernah memuat < atau > (entitas tidak didekode menjadi tag)", async () => {
    for (const input of ["&lt;img src=x onerror=alert(1)&gt;", "&#60;script&#62;", "<<script>>alert(1)<</script>>", "<a href=\"x>y\">z</a>", "‮<b​>x</b>"]) {
      const out = sanitizeDisplayText(input);
      assert.doesNotMatch(out, /[<>]/, input);
    }
    assert.equal(sanitizeDisplayText("Tom &amp; Jerry"), "Tom &amp; Jerry");
  });

  await test("sanitasi: dibatasi 200 karakter (tidak memotong pasangan surrogate) dan tidak merusak teks valid", async () => {
    assert.equal(sanitizeDisplayText("a".repeat(500)).length, 200);
    const emoji = sanitizeDisplayText("\u{1F600}".repeat(300));
    assert.equal(Array.from(emoji).length, 200);
    assert.doesNotMatch(emoji, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    for (const ok of ["Buku Pedoman Akademik 2026/2027", "Rp 5.000.000 — Pendidikan Bahasa Inggris (S1)", "Kalender Akademik: UTS & UAS"]) {
      assert.equal(sanitizeDisplayText(ok), ok.replace(/&/g, "&"));
    }
  });

  await test("sanitasi: pembersih karakter tersembunyi identik dengan Retrieval dan Gemini untuk seluruh rentang uji", async () => {
    const points = [];
    for (const [from, to] of [[0, 0x9f], [0xa0, 0x2fff], [0x3000, 0x3200], [0xfe00, 0xfe0f], [0xfeff, 0xffff]]) {
      for (let cp = from; cp <= to; cp += 1) points.push(cp);
    }
    points.push(0xe0000, 0xe0041, 0xe007f, 0xe0100, 0xe0fff, 0x1d173);
    const norm = (value) => value.replace(/\s+/g, " ").trim();
    for (const cp of points) {
      const ch = String.fromCodePoint(cp);
      if (ch === "<" || ch === ">") continue;
      const sample = `a${ch}b`;
      assert.equal(retrievalStrip(sample), geminiStrip(sample), `U+${cp.toString(16)}`);
      assert.equal(sanitizeDisplayText(sample), norm(geminiStrip(sample)), `U+${cp.toString(16)} berbeda dengan Gemini`);
    }
  });

  await test("label & title sitasi: knowledge disanitasi; label kosong/hanya spasi/hanya karakter tersembunyi -> label bawaan", async () => {
    const mk = (o) => buildCitation({ type: "knowledge", id: "k", title: "Judul", ...o }, 0);
    assert.equal(mk({ sourceLabel: "<b>Buku</b>​ Pedoman" }).label, "Buku Pedoman");
    assert.equal(mk({ sourceLabel: "<img src=x onerror=alert(1)>" }).label, DEFAULT_LABEL);
    for (const empty of [null, undefined, "", "   ", "​‮", "<>", "<!-- x -->", 5, {}]) {
      assert.equal(mk({ sourceLabel: empty }).label, DEFAULT_LABEL, JSON.stringify(empty));
    }
    assert.equal(mk({ sourceLabel: "x".repeat(500) }).label.length, 200);
    const c = mk({ title: "<i>Judul</i>​ Panjang" });
    assert.equal(c.title, "Judul Panjang");
    assert.equal(mk({ title: "" }).title, DEFAULT_LABEL);
    assert.equal(mk({ title: "<script></script>" }).title, DEFAULT_LABEL);
  });

  await test("label & title sitasi: tipe non-knowledge — title disanitasi, label tetap konstanta, title kosong -> label jenis sumber", async () => {
    const c = buildCitation({ type: "news", id: "n", slug: "s", title: "<b>Libur</b>​ Natal" }, 0);
    assert.equal(c.title, "Libur Natal");
    assert.equal(c.label, "Berita Universitas LIA");
    const e = buildCitation({ type: "news", id: "n", slug: "s", title: "​<>" }, 0);
    assert.equal(e.title, "Berita Universitas LIA");
    for (const t of ["news", "announcement", "academic_calendar", "accreditation_institution", "accreditation_study_program"]) {
      const cit = buildCitation({ type: t, id: UUID(9), slug: "s", title: "x".repeat(400) }, 0);
      assert.ok(cit.title.length <= 200, t);
    }
  });

  // ===================== 2. URL knowledge =====================
  await test("URL knowledge diizinkan: https di universitaslia.ac.id dan www.universitaslia.ac.id; teks dikembalikan APA ADANYA", async () => {
    const allowed = [
      "https://universitaslia.ac.id",
      "https://universitaslia.ac.id/",
      "https://universitaslia.ac.id/pmb",
      "https://www.universitaslia.ac.id/pmb?x=1&y=2#bagian",
      "https://universitaslia.ac.id/a%20b/c",
      "https://universitaslia.ac.id:443/pmb",
      "HTTPS://UniversitasLIA.ac.id/Pmb",
      "  https://universitaslia.ac.id/pmb  ",
      "https://universitaslia.ac.id/pmb\n", // spasi/baris baru di tepi dipangkas; yang di dalam ditolak
    ];
    for (const input of allowed) {
      assert.equal(toOfficialUrl(input), input.trim(), input);
      const c = buildCitation({ type: "knowledge", title: "T", sourcePath: input }, 0);
      assert.equal(c.url, input.trim(), `url berubah: ${input}`);
    }
    // Tidak ada normalisasi: tanpa tambahan "/" dan tanpa mengubah huruf/encoding.
    assert.equal(toOfficialUrl("https://universitaslia.ac.id"), "https://universitaslia.ac.id");
  });

  await test("URL knowledge ditolak: http, port non-standar, kredensial, host tiruan/subdomain lain, dan trik penyamaran", async () => {
    const rejected = [
      "http://universitaslia.ac.id/pmb",
      "http://www.universitaslia.ac.id/pmb",
      "https://universitaslia.ac.id:8443/pmb",
      "https://universitaslia.ac.id:80/pmb",
      "https://www.universitaslia.ac.id:444/",
      "https://user:pw@universitaslia.ac.id/pmb",
      "https://user@universitaslia.ac.id/pmb",
      "https://:pw@universitaslia.ac.id/pmb",
      "https://universitaslia.ac.id.evil.top/pmb",
      "https://evil.top/universitaslia.ac.id",
      "https://evil.top/?u=https://universitaslia.ac.id",
      "https://universitaslia.ac.id@evil.top/pmb",
      "https://evil-universitaslia.ac.id/pmb",
      "https://pmb.universitaslia.ac.id/daftar",
      "https://universitaslia.ac.id./pmb",
      "https://universitaslia.com/pmb",
      "https://evil.top\\@universitaslia.ac.id/pmb",
      "https://universitaslia.ac.id\\pmb",
      "https://уniversitaslia.ac.id/pmb", // huruf Kiril "у"
      "https://universitaslia.ac.id/pm b",
      "https://universita\nslia.ac.id/pmb",
      "https://universita\tslia.ac.id/pmb",
      "https://universitaslia.ac.id/​pmb",
      "https:universitaslia.ac.id/pmb",
      "https:/universitaslia.ac.id/pmb",
      "//universitaslia.ac.id/pmb",
      "/pedoman-akademik",
      "pedoman",
      "javascript:alert(1)",
      "data:text/html,<b>x</b>",
      "ftp://universitaslia.ac.id/x",
      "mailto:cs@universitaslia.ac.id",
      "",
      "   ",
      null,
      undefined,
      5,
      {},
      `https://universitaslia.ac.id/${"a".repeat(2100)}`,
    ];
    for (const input of rejected) {
      assert.equal(toOfficialUrl(input), null, JSON.stringify(input));
      const c = buildCitation({ type: "knowledge", title: "T", sourceLabel: "Buku", sourcePath: input }, 0);
      assert.ok(c, "sitasi knowledge tetap dibuat");
      assert.ok(!("url" in c), `url tidak boleh ada: ${JSON.stringify(input)}`);
      assert.equal(c.label, "Buku");
    }
  });

  await test("perbandingan dengan file ASLI: bug yang dilaporkan (kredensial/port/www) kini tertangani, perilaku aman lain sama", async () => {
    const probe = (impl, sourcePath) => impl.buildCitation({ type: "knowledge", title: "T", sourcePath }, 0).url;
    // Asli: meloloskan kredensial dan port; membuang www.
    assert.equal(probe(original, "https://user:pw@universitaslia.ac.id/x"), "https://user:pw@universitaslia.ac.id/x");
    assert.equal(probe(original, "https://universitaslia.ac.id:8443/x"), "https://universitaslia.ac.id:8443/x");
    assert.equal(probe(original, "https://www.universitaslia.ac.id/x"), undefined);
    // Usulan:
    assert.equal(probe(proposed, "https://user:pw@universitaslia.ac.id/x"), undefined);
    assert.equal(probe(proposed, "https://universitaslia.ac.id:8443/x"), undefined);
    assert.equal(probe(proposed, "https://www.universitaslia.ac.id/x"), "https://www.universitaslia.ac.id/x");
    // Sama: http, host tiruan, path relatif.
    for (const same of ["http://universitaslia.ac.id/x", "https://universitaslia.ac.id.evil.top/x", "/pedoman"]) {
      assert.equal(probe(original, same), undefined);
      assert.equal(probe(proposed, same), undefined);
    }
  });

  // ===================== 3. Kompatibilitas keenam tipe + Knowledge tanpa URL =====================
  await test("kompatibilitas: keenam tipe sumber dari Retrieval menghasilkan sitasi valid (bentuk & URL)", async () => {
    seedAllTypes();
    const sources = await retrieveOfficialSources("terpadu", { now: NOW });
    const types = sources.map((s) => s.type).sort();
    assert.deepEqual(types, ["academic_calendar", "accreditation_institution", "accreditation_study_program", "announcement", "knowledge", "news"]);

    const citations = buildCitations(sources);
    assert.equal(citations.length, 6);
    for (const [i, source] of sources.entries()) {
      const c = buildCitation(source, i);
      assert.ok(c, `sitasi ${source.type} null`);
      assert.equal(c.type, source.type);
      assert.ok(c.title && c.label);
      if (source.type === "knowledge") {
        assert.equal(c.url, "https://universitaslia.ac.id/pedoman");
        assert.equal(c.label, "Buku Pedoman");
      } else {
        assert.match(c.url, URL_PATTERNS[source.type], source.type);
      }
    }
    const cal = citations.find((c) => c.type === "academic_calendar");
    assert.equal(cal.startDate, "2026-12-01");
    assert.equal(cal.endDate, "2026-12-05");
    assert.ok(citations.find((c) => c.type === "news").publishedAt);
  });

  await test("kompatibilitas: untuk data bersih, hasil usulan IDENTIK dengan file asli (bentuk objek tidak berubah)", async () => {
    seedAllTypes();
    const sources = await retrieveOfficialSources("terpadu", { now: NOW });
    assert.deepEqual(buildCitations(sources), original.buildCitations(sources));
    sources.forEach((s, i) => assert.deepEqual(buildCitation(s, i), original.buildCitation(s, i)));
  });

  await test("kompatibilitas: Knowledge TANPA URL tetap sitasi sah dan jawabannya TIDAK jatuh ke fallback", async () => {
    for (const sourcePath of [null, "/pedoman", "http://universitaslia.ac.id/x"]) {
      seedAllTypes({ knowledge: { source_path: sourcePath, source_label: null } });
      const sources = (await retrieveOfficialSources("terpadu", { now: NOW })).filter((s) => s.type === "knowledge");
      assert.equal(sources.length, 1);
      const c = buildCitation(sources[0], 0);
      assert.deepEqual(Object.keys(c).sort(), ["id", "label", "publishedAt", "title", "type"]);
      assert.equal(c.label, DEFAULT_LABEL);

      const result = await askWith(sources, [0]);
      assert.equal(result.answerable, true, `fallback tak terduga untuk sourcePath=${sourcePath}`);
      assert.equal(result.citations.length, 1);
      assert.equal(result.fallback, null);
    }
  });

  await test("kompatibilitas: assistantService.proposed + citation usulan — tiap tipe sendirian menghasilkan jawaban dengan sitasi (tanpa fallback)", async () => {
    seedAllTypes();
    const sources = await retrieveOfficialSources("terpadu", { now: NOW });
    for (const [i, source] of sources.entries()) {
      const result = await askWith(sources, [i]);
      assert.equal(result.answerable, true, `tipe ${source.type} jatuh ke fallback`);
      assert.equal(result.citations.length, 1, source.type);
      assert.deepEqual(Object.keys(result).sort(), ["answerable", "answer", "citations", "fallback"].sort());
    }
    const all = await askWith(sources, sources.map((_, i) => i));
    assert.equal(all.citations.length, 6);
  });

  await test("end-to-end: label knowledge kotor di DB tidak pernah sampai ke frontend dalam bentuk mentah", async () => {
    seedAllTypes({ knowledge: { source_label: "<b>Buku</b>​ Pedoman &amp; Aturan", title: "Panduan &lt;img src=x onerror=alert(1)&gt; Terpadu" } });
    const sources = await retrieveOfficialSources("terpadu", { now: NOW });
    const knowledge = sources.find((s) => s.type === "knowledge");
    assert.equal(knowledge.sourceLabel, "Buku Pedoman & Aturan"); // sanitasi di Retrieval
    const result = await askWith(sources, [sources.indexOf(knowledge)]);
    const c = result.citations[0];
    for (const field of [c.label, c.title]) {
      assert.doesNotMatch(field, /[<>​‮]/);
    }
    assert.equal(c.label, "Buku Pedoman & Aturan");
  });

  await test("kompatibilitas: kontrak yang diasumsikan — id non-string / slug kosong / tipe asing menghasilkan null (jatuh ke fallback)", async () => {
    // id numerik: dengan skema produksi yang belum terverifikasi, ini akan membuat semua jawaban tipe itu jatuh ke fallback.
    assert.equal(buildCitation({ type: "academic_calendar", id: 42, title: "x" }, 0), null);
    assert.equal(buildCitation({ type: "accreditation_institution", id: 42, title: "x" }, 0), null);
    assert.equal(buildCitation({ type: "news", id: "n", slug: "", title: "x" }, 0), null);
    assert.equal(buildCitation({ type: "announcement", id: "n", title: "x" }, 0), null);
    assert.equal(buildCitation({ type: "mystery", id: "x", slug: "x", title: "x" }, 0), null);
    assert.equal(buildCitation(null, 0), null);
    assert.equal(buildCitation("teks", 0), null);

    const result = await askWith([{ type: "academic_calendar", id: 42, title: "Agenda", content: "isi" }], [0]);
    assert.equal(result.answerable, false);
    assert.equal(result.fallback.type, "whatsapp");

    // UUID string (bentuk yang diharapkan dari skema) tetap valid.
    assert.ok(buildCitation({ type: "academic_calendar", id: UUID(7), title: "x" }, 0));
  });

  await test("kompatibilitas: dedup dan penomoran id tidak berubah dari file asli", async () => {
    const list = [
      { type: "knowledge", title: "Biaya", sourceLabel: "A" },
      { type: "knowledge", title: "Biaya", sourceLabel: "B" },
      { type: "news", title: "N", slug: "n" },
      { type: "news", title: "N", slug: "n" },
      { type: "news", title: "X" },
    ];
    assert.deepEqual(buildCitations(list), original.buildCitations(list));
    assert.deepEqual(buildCitations(list).map((c) => c.id), ["source-1", "source-3"]);
    assert.deepEqual(buildCitations(null), []);
    assert.deepEqual(buildCitations("x"), []);
  });

  console.log("\n=======================================");
  console.log(`HASIL: ${passed} PASS, ${failed} FAIL`);
  for (const name of failures) console.log(` - GAGAL: ${name}`);
  console.log("=======================================");
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
