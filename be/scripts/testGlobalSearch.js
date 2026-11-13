  // Pengujian OFFLINE fitur Global Search (GET /api/search).
  // Supabase diganti versi palsu di memori: TIDAK ada koneksi jaringan dan TIDAK ada data asli
  // yang dibaca atau diubah. Request dikirim lewat HTTP sungguhan ke app Express, jadi validator
  // Zod, route, controller, dan service ikut teruji. Endpoint lama (berita, pengumuman, kalender)
  // juga dipanggil untuk memastikan tetap normal setelah route baru dipasang.
  //
  //   node scripts/testGlobalSearch.js
  //
  // Tidak dicakup (butuh Supabase asli): perilaku operator PostgREST/Postgres yang sebenarnya.
  // Fake meniru semantik ILIKE dan perbandingan tanggal. Lihat README untuk tes manual ke database asli.

  process.env.NODE_ENV = "test";
  process.env.SUPABASE_URL = "https://fake-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
  process.env.FRONTEND_URL = "http://localhost:3000";

  const assert = require("node:assert/strict");
  const crypto = require("node:crypto");
  const path = require("node:path");

  // ---------- Supabase palsu ----------
  const db = {};
  const faults = []; // { table } sekali pakai: query select ke tabel itu menghasilkan error
  const present = (v) => v !== null && v !== undefined;
  const likeToRegExp = (pattern) => {
    let out = "";
    for (let i = 0; i < pattern.length; i += 1) {
      const ch = pattern[i];
      if (ch === "\\" && i + 1 < pattern.length) { out += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); i += 1; }
      else if (ch === "%") out += ".*";
      else if (ch === "_") out += ".";
      else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    return new RegExp(`^${out}$`, "is");
  };
  const sortRows = (rows, orders) =>
    [...rows].sort((a, b) => {
      for (const { col, asc } of orders) {
        const x = a[col], y = b[col];
        if (x === y) continue;
        if (!present(x)) return 1;
        if (!present(y)) return -1;
        return (x < y ? -1 : 1) * (asc ? 1 : -1);
      }
      return 0;
    });

  class FakeQuery {
    constructor(table) { this.table = table; this.filters = []; this.orders = []; this.opts = {}; this.rangeArgs = null; this.limitN = null; this.mode = "many"; }
    select(cols, opts) { this.opts = opts || {}; return this; }
    eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
    lte(c, v) { this.filters.push((r) => present(r[c]) && r[c] <= v); return this; }
    gte(c, v) { this.filters.push((r) => present(r[c]) && r[c] >= v); return this; }
    ilike(c, pattern) { const re = likeToRegExp(String(pattern)); this.filters.push((r) => present(r[c]) && re.test(String(r[c]))); return this; }
    or(expr) {
      const parts = expr.split(",").map((p) => {
        const like = /^([a-z_]+)\.ilike\.%(.*)%$/.exec(p);
        if (like) return { col: like[1], test: (v) => String(v ?? "").toLowerCase().includes(like[2].toLowerCase()) };
        const eq = /^([a-z_]+)\.eq\.(.*)$/.exec(p);
        if (eq) return { col: eq[1], test: (v) => String(v) === eq[2] };
        throw new Error(`filter or() tidak dikenal oleh fake: ${p}`);
      });
      this.filters.push((r) => parts.some((p) => p.test(r[p.col])));
      return this;
    }
    order(col, o) { this.orders.push({ col, asc: !o || o.ascending !== false }); return this; }
    range(a, b) { this.rangeArgs = [a, b]; return this; }
    limit(n) { this.limitN = n; return this; }
    maybeSingle() { this.mode = "maybe"; return this; }
    run() {
      const fi = faults.findIndex((f) => f.table === this.table);
      if (fi >= 0) { faults.splice(fi, 1); return { data: null, error: { code: "XX000", message: "SECRET_INTERNAL_DB_DETAIL" } }; }
      const rows = db[this.table] || [];
      let result = sortRows(rows.filter((r) => this.filters.every((f) => f(r))), this.orders);
      const count = result.length;
      if (this.rangeArgs) {
        const [a, b] = this.rangeArgs;
        if (a > 0 && a >= count) return { data: null, error: { code: "PGRST103", message: "range" } };
        result = result.slice(a, b + 1);
      }
      if (this.limitN !== null) result = result.slice(0, this.limitN);
      if (this.opts.head) return { data: null, count, error: null };
      const out = result.map((r) => ({ ...r }));
      if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
      return { data: out, count: this.opts.count ? count : undefined, error: null };
    }
    then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
  }
  const supabasePath = require.resolve(path.join(__dirname, "../src/config/supabase.js"));
  require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: { from: (t) => new FakeQuery(t), storage: { from: (bucket) => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://fake-project.supabase.co/storage/v1/object/public/${bucket}/${p}` } }) }) } } };

  const origError = console.error;
  let loggedErrors = [];
  console.error = (...args) => { loggedErrors.push(args.join(" ")); };

  // ---------- data uji ----------
  const PAST = new Date(Date.now() - 86400000 * 2).toISOString();
  const PAST2 = new Date(Date.now() - 86400000 * 5).toISOString();
  const FUTURE = new Date(Date.now() + 86400000 * 30).toISOString();
  const SECRET_ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const uid = () => crypto.randomUUID();

  const SEED = () => {
    db.news = [
      { id: uid(), title: "Informasi Akreditasi Universitas LIA", slug: "informasi-akreditasi-universitas-lia", excerpt: "Ringkasan informasi", content_html: "<p>ISI-RAHASIA-NEWS</p>", status: "published", published_at: PAST, author_id: SECRET_ADMIN_ID, cover_image_path: "covers/x.jpg" },
      { id: uid(), title: "Seminar Nasional", slug: "seminar-nasional", excerpt: "Membahas akreditasi dan mutu pendidikan", status: "published", published_at: PAST2, author_id: SECRET_ADMIN_ID },
      { id: uid(), title: "Draft Akreditasi Rahasia", slug: "draft-akreditasi-rahasia", excerpt: "tidak boleh bocor", status: "draft", published_at: null },
      { id: uid(), title: "Berita Terjadwal Akreditasi", slug: "terjadwal", excerpt: "belum waktunya", status: "published", published_at: FUTURE },
      { id: uid(), title: "Wisuda Periode Ganjil", slug: "wisuda-ganjil", excerpt: "Jadwal wisuda", status: "published", published_at: PAST },
    ];
    db.announcements = [
      { id: uid(), title: "Pengumuman Akreditasi", slug: "pengumuman-akreditasi", excerpt: "Ringkasan pengumuman", status: "published", published_at: PAST },
      { id: uid(), title: "Pengumuman Draft Akreditasi", slug: "pengumuman-draft", excerpt: "rahasia", status: "draft", published_at: null },
      { id: uid(), title: "Libur Semester", slug: "libur-semester", excerpt: "Informasi libur", status: "published", published_at: PAST },
    ];
    db.academic_calendar_events = [
      { id: uid(), title: "Visitasi Akreditasi Prodi", description: "Kunjungan asesor", start_date: "2026-12-01", end_date: "2026-12-03", category: "akademik", status: "published" },
      { id: uid(), title: "Draft Agenda Akreditasi", description: "rahasia", start_date: "2026-12-10", end_date: "2026-12-10", category: "akademik", status: "draft" },
      { id: uid(), title: "Ujian Akhir Semester", description: null, start_date: "2026-12-15", end_date: "2026-12-20", category: "akademik", status: "published" },
    ];
    db.academic_calendar_categories = [{ slug: "akademik", name: "Akademik", sort_order: 1, is_active: true }];
    db.accreditation_institutions = [
      { id: uid(), institution_name: "Universitas LIA", rank: "Unggul", sk_number: "100/SK/2025", status: "published", published_at: PAST, document_path: "institutions/secret.pdf", document_drive_file_id: "DRIVE-SECRET-ID", created_by: SECRET_ADMIN_ID },
      { id: uid(), institution_name: "Institusi Draft", rank: "Baik", sk_number: "200/SK/2025", status: "draft", published_at: null },
    ];
    db.accreditation_study_programs = [
      { id: uid(), program_name: "Teknologi Informasi", education_level: "S1", faculty: "Fakultas Teknologi", rank: "Unggul", sk_number: "123/SK/BAN-PT/2024", status: "published", published_at: PAST, document_drive_file_id: "DRIVE-SECRET-ID-2" },
      { id: uid(), program_name: "Prodi Draft Rahasia", education_level: "S1", faculty: null, rank: "Baik", sk_number: "DRAFT/1", status: "draft", published_at: null },
      { id: uid(), program_name: "Prodi Terjadwal", education_level: "S1", faculty: null, rank: "Baik", sk_number: "FUT/1", status: "published", published_at: FUTURE },
    ];
    db.banpt_regulations = [
      { id: uid(), regulation_number: "5", regulation_year: 2025, title: "Peraturan Akreditasi Perguruan Tinggi", determination_date: "2025-03-01", status: "published", published_at: PAST, document_drive_file_id: "DRIVE-SECRET-ID-3", attachments: [{ id: "a1", driveFileId: "SECRET" }] },
      { id: uid(), regulation_number: "9", regulation_year: 2024, title: "Regulasi Draft Rahasia", determination_date: "2024-01-01", status: "draft", published_at: null },
    ];
  };

  // ---------- runner ----------
  let passed = 0, failed = 0;
  const test = async (name, fn) => {
    try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
    catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n")[0]}`); }
  };

  const loadFreshApp = () => {
    for (const key of Object.keys(require.cache)) if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath) delete require.cache[key];
    delete require.cache[require.resolve("../app")];
    return require("../app");
  };

  let base;
  const get = async (url) => {
    const res = await fetch(`${base}${url}`);
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* bukan JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  };
  const search = (params) => get(`/api/search?${new URLSearchParams(params).toString()}`);
  const titles = (r) => r.json.data.results.map((x) => x.title);
  const types = (r) => r.json.data.results.map((x) => x.type);

  (async () => {
    const app = loadFreshApp();
    const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
    base = `http://127.0.0.1:${server.address().port}`;
    SEED();

    console.log("\nGlobal Search: hasil per sumber");
    await test("berita published ditemukan, format seragam, url sesuai route frontend", async () => {
      const r = await search({ q: "wisuda" });
      assert.equal(r.status, 200);
      assert.equal(r.json.success, true);
      assert.equal(r.json.data.query, "wisuda");
      assert.equal(r.json.data.total, 1);
      const item = r.json.data.results[0];
      assert.equal(item.type, "news");
      assert.equal(item.slug, "wisuda-ganjil");
      assert.equal(item.url, "/berita/wisuda-ganjil");
      assert.equal(item.excerpt, "Jadwal wisuda");
    });
    await test("pengumuman published ditemukan", async () => {
      const r = await search({ q: "libur" });
      assert.equal(r.status, 200);
      assert.deepEqual(types(r), ["announcement"]);
      assert.equal(r.json.data.results[0].url, "/pengumuman/libur-semester");
    });
    await test("kalender akademik published ditemukan (judul dan deskripsi)", async () => {
      const r = await search({ q: "visitasi" });
      assert.deepEqual(types(r), ["academic_calendar"]);
      const r2 = await search({ q: "asesor" });
      assert.deepEqual(types(r2), ["academic_calendar"]);
    });
    await test("event kalender tanpa deskripsi tetap punya excerpt string", async () => {
      const r = await search({ q: "ujian akhir" });
      assert.equal(r.json.data.results.length, 1);
      assert.equal(typeof r.json.data.results[0].excerpt, "string");
    });
    await test("akreditasi institusi, program studi, dan regulasi BAN-PT ditemukan", async () => {
      const r = await search({ q: "akreditasi", limit: 20 });
      assert.equal(r.status, 200);
      const got = new Set(types(r));
      for (const t of ["news", "announcement", "academic_calendar", "banpt_regulation"]) assert.ok(got.has(t), `tipe ${t} tidak ada`);
      assert.ok((await search({ q: "Universitas LIA" })).json.data.results.some((x) => x.type === "accreditation_institution"));
      assert.ok((await search({ q: "teknologi informasi" })).json.data.results.some((x) => x.type === "accreditation_study_program"));
      assert.ok((await search({ q: "2025" })).json.data.results.some((x) => x.type === "banpt_regulation"), "tahun 4 digit");
    });
    await test("pencarian tidak sensitif huruf besar/kecil", async () => {
      const r = await search({ q: "WISUDA" });
      assert.equal(r.json.data.total, 1);
    });

    console.log("\nGlobal Search: konten unpublished tidak bocor");
    await test("draft, terjadwal, dan tidak-published tidak muncul di semua sumber", async () => {
      const r = await search({ q: "rahasia", limit: 20 });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.total, 0);
      const all = await search({ q: "akreditasi", limit: 20 });
      const t = titles(all).join("|");
      for (const secret of ["Draft Akreditasi Rahasia", "Terjadwal", "Pengumuman Draft", "Draft Agenda", "Institusi Draft", "Prodi Draft", "Prodi Terjadwal", "Regulasi Draft"]) {
        assert.ok(!t.includes(secret), `bocor: ${secret}`);
      }
    });
    await test("tidak ada data internal di respons (id admin, path/ID Drive, isi artikel, status)", async () => {
      const r = await search({ q: "akreditasi", limit: 20 });
      for (const forbidden of [SECRET_ADMIN_ID, "DRIVE-SECRET", "secret.pdf", "ISI-RAHASIA", "covers/x.jpg", "content_html", "author", "status", "document_path", "attachments"]) {
        assert.ok(!r.text.includes(forbidden), `respons memuat ${forbidden}`);
      }
      const allowed = ["type", "id", "title", "slug", "excerpt", "url", "date"].sort();
      for (const item of r.json.data.results) assert.deepEqual(Object.keys(item).sort(), allowed);
    });

    console.log("\nGlobal Search: validasi query");
    const expect400 = async (params, label) => {
      const r = await search(params);
      assert.equal(r.status, 400, `${label}: status ${r.status}`);
      assert.equal(r.json.success, false);
      assert.equal(r.json.code, "VALIDATION_ERROR");
      assert.ok(Array.isArray(r.json.errors) && r.json.errors.length > 0);
    };
    await test("q kosong ditolak", () => expect400({ q: "" }, "kosong"));
    await test("q tidak dikirim ditolak", async () => { const r = await get("/api/search"); assert.equal(r.status, 400); assert.equal(r.json.code, "VALIDATION_ERROR"); });
    await test("q hanya spasi ditolak", () => expect400({ q: "    " }, "spasi"));
    await test("q 1 karakter ditolak", () => expect400({ q: "a" }, "1 karakter"));
    await test("q hanya karakter khusus ditolak", () => expect400({ q: "%%%__**" }, "khusus"));
    await test("q 101 karakter ditolak, 100 karakter diterima", async () => {
      await expect400({ q: "a".repeat(101) }, "101");
      const ok = await search({ q: "a".repeat(100) });
      assert.equal(ok.status, 200);
    });
    await test("q ganda (?q=a&q=b) ditolak", async () => { const r = await get("/api/search?q=ab&q=cd"); assert.equal(r.status, 400); });
    await test("limit tidak valid ditolak (0, 21, abc, 2.5)", async () => {
      for (const limit of ["0", "21", "abc", "2.5"]) await expect400({ q: "akreditasi", limit }, `limit=${limit}`);
    });
    await test("karakter kontrol/NUL pada q tidak menyebabkan error server", async () => {
      const r = await get("/api/search?q=wisuda%00%01");
      assert.equal(r.status, 200);
      assert.equal(r.json.data.query, "wisuda");
    });
    await test("injeksi filter PostgREST dinetralkan", async () => {
      const r = await search({ q: "x,status.eq.draft),(title.ilike.%" });
      assert.equal(r.status, 200);
      assert.ok(!r.json.data.query.includes(","));
      assert.ok(!r.json.data.query.includes("("));
      assert.equal(r.json.data.total, 0);
    });
    await test("wildcard % dan _ diperlakukan sebagai karakter biasa (tidak cocok semua data)", async () => {
      const r = await search({ q: "wi%" });
      assert.equal(r.status, 200);
      assert.ok(r.json.data.total <= 1);
    });

    console.log("\nGlobal Search: hasil kosong, limit, urutan");
    await test("hasil kosong -> 200 dengan results []", async () => {
      const r = await search({ q: "zzzzzzzz" });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.total, 0);
      assert.deepEqual(r.json.data.results, []);
      assert.equal(r.json.data.partial, undefined);
    });
    await test("limit membatasi results, total tetap jumlah yang cocok", async () => {
      const r = await search({ q: "akreditasi", limit: 2 });
      assert.equal(r.json.data.results.length, 2);
      assert.ok(r.json.data.total > 2);
      assert.equal(r.json.data.limit, 2);
    });
    await test("limit default 10", async () => { const r = await search({ q: "akreditasi" }); assert.equal(r.json.data.limit, 10); });
    await test("judul yang memuat kata kunci diutamakan daripada yang hanya cocok di excerpt", async () => {
      const r = await search({ q: "akreditasi", limit: 20 });
      const first = r.json.data.results[0];
      assert.ok(first.title.toLowerCase().includes("akreditasi"), first.title);
      const idxExcerptOnly = titles(r).indexOf("Seminar Nasional");
      const lastTitleMatch = Math.max(...titles(r).map((t, i) => (t.toLowerCase().includes("akreditasi") ? i : -1)));
      assert.ok(idxExcerptOnly > lastTitleMatch, "excerpt-only harus di belakang");
    });

    console.log("\nGlobal Search: error Supabase");
    await test("satu sumber error -> sumber lain tetap tampil, partial=true, tanpa bocor detail", async () => {
      loggedErrors = [];
      faults.push({ table: "announcements" });
      const r = await search({ q: "akreditasi", limit: 20 });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.partial, true);
      assert.ok(!types(r).includes("announcement"));
      assert.ok(types(r).includes("news"));
      assert.ok(!r.text.includes("SECRET_INTERNAL_DB_DETAIL"));
      assert.ok(loggedErrors.some((l) => l.includes("global search announcements")), "error harus dicatat di log server");
    });
    await test("semua sumber error -> 500 DATABASE_ERROR dengan pesan umum", async () => {
      for (const t of ["news", "announcements", "academic_calendar_events", "accreditation_institutions", "accreditation_study_programs", "banpt_regulations"]) faults.push({ table: t });
      const r = await search({ q: "akreditasi" });
      assert.equal(r.status, 500);
      assert.equal(r.json.success, false);
      assert.equal(r.json.code, "DATABASE_ERROR");
      assert.ok(!r.text.includes("SECRET_INTERNAL_DB_DETAIL"));
      faults.length = 0;
    });
    await test("setelah error, pencarian normal kembali", async () => { assert.equal((await search({ q: "wisuda" })).status, 200); });

    console.log("\nRate limit & endpoint lama");
    await test("respons pencarian membawa header rate limit khusus", async () => {
      const r = await search({ q: "wisuda" });
      assert.ok(r.headers.get("ratelimit") || r.headers.get("ratelimit-policy"), "header ratelimit tidak ada");
    });
    await test("endpoint lama tetap normal: /api/news, /api/news/latest, /api/news/:slug", async () => {
      const list = await get("/api/news");
      assert.equal(list.status, 200);
      assert.ok(Array.isArray(list.json.data.items));
      assert.ok(!list.json.data.items.some((i) => i.slug === "draft-akreditasi-rahasia"));
      const latest = await get("/api/news/latest");
      assert.equal(latest.status, 200);
      const one = await get("/api/news/wisuda-ganjil");
      assert.equal(one.status, 200);
      assert.equal(one.json.data.news.slug, "wisuda-ganjil");
      assert.equal((await get("/api/news/draft-akreditasi-rahasia")).status, 404);
    });
    await test("endpoint lama tetap normal: /api/announcements dan /api/academic-calendar", async () => {
      const a = await get("/api/announcements");
      assert.equal(a.status, 200);
      assert.equal(a.json.data.items.length, 2);
      const c = await get("/api/academic-calendar");
      assert.equal(c.status, 200);
      assert.equal(c.json.data.items.length, 2);
    });
    await test("route tidak dikenal tetap 404 dan root tetap jalan", async () => {
      assert.equal((await get("/api/tidak-ada")).status, 404);
      assert.equal((await get("/")).status, 200);
    });
    await test("method selain GET pada /api/search tidak dilayani", async () => {
      const res = await fetch(`${base}/api/search?q=wisuda`, { method: "POST" });
      assert.equal(res.status, 404);
    });

    server.close();
    console.error = origError;
    console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
    process.exit(failed === 0 ? 0 : 1);
  })().catch((e) => { console.error = origError; console.error(e); process.exit(1); });
