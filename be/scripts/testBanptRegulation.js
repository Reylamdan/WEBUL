// Pengujian OFFLINE fitur Manajemen Peraturan BAN-PT.
// Supabase (database + Storage lama) dan Google Drive diganti versi palsu di memori: TIDAK ada data asli yang tersentuh.
// Dokumen utama & lampiran baru disimpan di Google Drive; seed data lama (document_path) menguji kompatibilitas.
// Skenario khusus Drive (preview/download, token admin, migrasi data lama, antrean cleanup) ada di testGoogleDrive.js.
// Request dikirim lewat HTTP sungguhan ke app Express (validator, middleware, controller, service ikut teruji).
//
//   node scripts/testBanptRegulation.js
//
// Tidak dicakup (butuh Supabase asli): kolom/constraint tabel banpt_regulations yang sebenarnya,
// kebijakan bucket publik, dan perilaku operator PostgREST. Fake meniru semantik LIKE/tanggal/NULL.

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const jwt = require("jsonwebtoken");

// ---------- Supabase palsu ----------
const db = {};
const storage = { objects: new Map(), failRemove: false }; // Supabase Storage LAMA (hanya baca/hapus)
const faults = [];
const hooks = { beforeUpdate: null };
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INACTIVE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING = "123e4567-e89b-42d3-a456-426614174000";
const BUCKET = "banpt-regulations";
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
let tick = 0;
const uniqueNow = () => new Date(Date.now() + (tick += 1)).toISOString(); // selalu berbeda, meniru trigger updated_at

class FakeQuery {
  constructor(table) { this.table = table; this.op = "select"; this.filters = []; this.orders = []; this.payload = null; this.mode = "many"; this.opts = {}; this.rangeArgs = null; }
  select(cols, opts) { this.opts = opts || {}; return this; }
  insert(p) { this.op = "insert"; this.payload = p; return this; }
  update(p) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  gte(c, v) { this.filters.push((r) => present(r[c]) && r[c] >= v); return this; }
  lte(c, v) { this.filters.push((r) => present(r[c]) && r[c] <= v); return this; }
  ilike(c, pattern) { const re = likeToRegExp(String(pattern)); this.filters.push((r) => present(r[c]) && re.test(String(r[c]))); return this; }
  or(expr) {
    const parts = expr.split(",").map((p) => {
      const m = /^([a-z_]+)\.(ilike|eq)\.(.*)$/.exec(p);
      assert.ok(m, `or() tidak dikenal: ${p}`);
      return { col: m[1], op: m[2], val: m[3] };
    });
    this.filters.push((r) => parts.some((p) => p.op === "eq"
      ? String(r[p.col]) === p.val
      : likeToRegExp(p.val).test(String(r[p.col] ?? ""))));
    return this;
  }
  order(col, o) { this.orders.push({ col, asc: !o || o.ascending !== false }); return this; }
  range(a, b) { this.rangeArgs = [a, b]; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  run() {
    const fi = faults.findIndex((f) => f.table === this.table && f.op === this.op);
    if (fi >= 0) { const [f] = faults.splice(fi, 1); return { data: null, error: f.error }; }
    if (this.op === "update" && hooks.beforeUpdate) { const h = hooks.beforeUpdate; hooks.beforeUpdate = null; h(this.table); }
    db[this.table] = db[this.table] || [];
    const rows = db[this.table];
    const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
    let result; let count;
    if (this.op === "insert") {
      const now = uniqueNow();
      const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...this.payload };
      const uniqueKey = (r) => (this.table === "banpt_regulations" ? `${r.regulation_number}|${r.regulation_year}` : r.file_id ?? r.id);
      if (rows.some((r) => uniqueKey(r) === uniqueKey(row))) {
        return { data: null, error: { code: "23505", message: "dup" } };
      }
      rows.push(row); result = [row];
    } else if (this.op === "update") {
      result = match(); for (const r of result) Object.assign(r, this.payload, { updated_at: uniqueNow() });
    } else if (this.op === "delete") {
      result = match(); db[this.table] = rows.filter((r) => !result.includes(r));
    } else {
      result = sortRows(match(), this.orders); count = result.length;
      if (this.rangeArgs) {
        const [a, b] = this.rangeArgs;
        if (a > 0 && a >= count) return { data: null, error: { code: "PGRST103", message: "range" } };
        result = result.slice(a, b + 1);
      }
      if (this.opts.head) return { data: null, count, error: null };
    }
    const out = result.map((r) => JSON.parse(JSON.stringify(r)));
    if (this.mode === "many") return { data: out, count, error: null };
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return out[0] ? { data: out[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
  }
  then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
}
const fakeStorage = {
  from: (bucket) => ({
    upload: async () => { throw new Error("Unggahan baru TIDAK boleh ke Supabase Storage"); },
    remove: async (paths) => {
      if (storage.failRemove) return { data: null, error: { message: "remove boom" } };
      for (const p of paths) storage.objects.delete(`${bucket}/${p}`);
      return { data: [], error: null };
    },
    getPublicUrl: (p, options) => ({ data: { publicUrl: `https://fake-project.supabase.co/storage/v1/object/public/${bucket}/${p}${options && options.download ? `?download=${encodeURIComponent(options.download)}` : ""}` } }),
  }),
  listBuckets: async () => ({ data: [], error: null }),
};
const supabasePath = require.resolve(path.join(__dirname, "../src/config/supabase.js"));
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: { from: (t) => new FakeQuery(t), storage: fakeStorage } };

const { createFakeDrive } = require("./lib/fakeDrive");
const fd = createFakeDrive();
const drivePath = fd.install();

const logs = [];
const origError = console.error;
console.error = (...a) => logs.push(a.join(" "));

const loadFreshApp = () => {
  for (const key of Object.keys(require.cache)) if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath && key !== drivePath) delete require.cache[key];
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

let passed = 0, failed = 0, requestCount = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n")[0]}`); }
};

let base; let adminToken;
const call = async (method, url, { body, token = adminToken, form } = {}) => {
  requestCount += 1;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(`${base}${url}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* bukan JSON */ }
  return { status: res.status, json, text };
};
const q = (params) => "?" + new URLSearchParams(params).toString();
const pdf = (extra = "") => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}%%EOF`);
const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const form = (entries) => {
  const f = new FormData();
  for (const [field, bytes, filename, type = "application/pdf"] of entries) f.append(field, new Blob([bytes], { type }), filename);
  return f;
};
const one = (field, bytes, filename, type) => form([[field, bytes, filename, type]]);

const ADMIN = "/api/admin/banpt-regulations";
const PUB = "/api/banpt-regulations";
const T = "banpt_regulations";
const row = (id) => (db[T] || []).find((r) => r.id === id);
const objects = () => fd.live().map((f) => f.id); // file AKTIF di Google Drive (yang di sampah tidak dihitung)
const hasObj = (id) => fd.live().some((f) => f.id === id);
const valid = (o = {}) => ({ regulationNumber: "1", regulationYear: 2024, determinationDate: "2024-03-01", title: "Instrumen Akreditasi Program Studi", ...o });

const reset = () => {
  for (const k of Object.keys(db)) delete db[k];
  db.admins = [
    { id: ADMIN_ID, name: "Admin Tes", email: "a@x.id", is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z" },
    { id: INACTIVE_ID, name: "Nonaktif", email: "n@x.id", is_active: false, last_login_at: null, created_at: "2026-01-01T00:00:00Z" },
  ];
  db[T] = [];
  storage.objects.clear(); storage.failRemove = false; fd.reset();
  faults.length = 0; hooks.beforeUpdate = null; logs.length = 0;
};
const create = async (o) => (await call("POST", ADMIN, { body: valid(o) })).json.data.regulation;
const withDoc = async (id, tag = "m") => (await call("PUT", `${ADMIN}/${id}/document`, { form: one("document", pdf(tag), `${tag}.pdf`) }));

(async () => {
  let server; let signAdminToken;
  const startServer = async () => {
    if (server) await new Promise((r) => server.close(r));
    server = loadFreshApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}`;
    ({ signAdminToken } = require("../src/utils/token"));
    adminToken = signAdminToken({ id: ADMIN_ID });
  };
  await startServer();

  // ===================================================================
  console.log("1. Autentikasi & otorisasi admin");
  reset();
  const A1 = `${ADMIN}/${MISSING}`; const AT = `${A1}/attachments`;
  const adminCalls = [["GET", ADMIN], ["GET", `${ADMIN}/filter-options`], ["GET", A1], ["POST", ADMIN, valid()], ["PATCH", A1, { title: "x" }], ["DELETE", A1],
    ["PUT", `${A1}/document`], ["POST", AT], ["PUT", `${AT}/${MISSING}`], ["DELETE", `${AT}/${MISSING}`]];
  await test(`${adminCalls.length} endpoint admin tanpa token -> 401`, async () => {
    for (const [m, u, b] of adminCalls) { const r = await call(m, u, { body: b, token: null }); assert.equal(r.status, 401, `${m} ${u} -> ${r.status}`); }
  });
  await test("token palsu -> 401; kedaluwarsa -> TOKEN_EXPIRED; role bukan admin -> 403; admin nonaktif/tak ada -> 401", async () => {
    assert.equal((await call("GET", ADMIN, { token: "abc.def.ghi" })).status, 401);
    const base_ = { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID };
    const expired = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { ...base_, expiresIn: -10 });
    const r = await call("GET", ADMIN, { token: expired }); assert.equal(r.json.code, "TOKEN_EXPIRED");
    const user = jwt.sign({ role: "user" }, process.env.JWT_SECRET, { ...base_, expiresIn: "1h" });
    assert.equal((await call("GET", ADMIN, { token: user })).status, 403);
    assert.equal((await call("GET", ADMIN, { token: signAdminToken({ id: INACTIVE_ID }) })).status, 401);
    assert.equal((await call("GET", ADMIN, { token: signAdminToken({ id: MISSING }) })).status, 401);
  });
  await test("request tanpa autentikasi tidak mengubah data maupun Storage", () => {
    assert.equal(db[T].length, 0); assert.equal(objects().length, 0);
  });

  // ===================================================================
  console.log("\n2. CRUD admin & validasi");
  reset();
  let reg;
  await test("POST membuat peraturan (201): draft, tanpa dokumen, lampiran kosong, format respons standar", async () => {
    const r = await call("POST", ADMIN, { body: valid() });
    assert.equal(r.status, 201); assert.equal(r.json.success, true);
    reg = r.json.data.regulation;
    assert.equal(reg.status, "draft"); assert.equal(reg.publishedAt, null); assert.equal(reg.document, null);
    assert.deepEqual(reg.attachments, []);
    assert.deepEqual([reg.regulationNumber, reg.regulationYear, reg.determinationDate, reg.title], ["1", 2024, "2024-03-01", "Instrumen Akreditasi Program Studi"]);
    assert.deepEqual(row(reg.id).attachments, []);
  });
  await test("GET detail & daftar (pagination bawaan)", async () => {
    const d = await call("GET", `${ADMIN}/${reg.id}`); assert.equal(d.status, 200); assert.equal(d.json.data.regulation.id, reg.id);
    const l = await call("GET", ADMIN);
    assert.deepEqual(l.json.data.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });
  });
  await test("PATCH mengubah nomor, tahun, tanggal penetapan, judul", async () => {
    const r = await call("PATCH", `${ADMIN}/${reg.id}`, { body: { regulationNumber: "2", regulationYear: "2025", determinationDate: "2025-01-15", title: "Judul Baru" } });
    assert.equal(r.status, 200);
    const x = r.json.data.regulation;
    assert.deepEqual([x.regulationNumber, x.regulationYear, x.determinationDate, x.title], ["2", 2025, "2025-01-15", "Judul Baru"]);
    await call("PATCH", `${ADMIN}/${reg.id}`, { body: valid() });
  });
  await test("input tidak valid -> 400 VALIDATION_ERROR dan tidak ada data tersimpan", async () => {
    const before = db[T].length;
    const bads = [{}, valid({ regulationNumber: "" }), valid({ title: "   " }), valid({ title: "x".repeat(501) }), valid({ regulationYear: 1899 }), valid({ regulationYear: 2101 }),
      valid({ regulationYear: "abc" }), valid({ regulationYear: 2024.5 }), valid({ determinationDate: "2024-02-30" }), valid({ determinationDate: "01-03-2024" }),
      valid({ determinationDate: null }), valid({ status: "arsip" }), valid({ extra: 1 }), valid({ documentPath: "x" }), valid({ attachments: [] })];
    for (const b of bads) { const r = await call("POST", ADMIN, { body: b }); assert.equal(r.status, 400, JSON.stringify(b)); assert.equal(r.json.code, "VALIDATION_ERROR"); }
    assert.equal(db[T].length, before);
    assert.equal((await call("PATCH", `${ADMIN}/${reg.id}`, { body: {} })).status, 400);
    assert.equal((await call("PATCH", `${ADMIN}/${reg.id}`, { body: { document_path: "x" } })).status, 400);
    assert.equal((await call("PATCH", `${ADMIN}/${reg.id}`, { body: { regulationYear: 3000 } })).status, 400);
  });
  await test("HTML pada teks dibersihkan", async () => {
    const r = await call("POST", ADMIN, { body: valid({ regulationNumber: "9", title: "<b>Judul</b><script>alert(1)</script> Aman" }) });
    assert.equal(r.status, 201); assert.ok(!/[<>]/.test(r.json.data.regulation.title));
    await call("DELETE", `${ADMIN}/${r.json.data.regulation.id}`);
  });
  await test("duplikat (23505) -> 409; ID tidak valid -> 400; tidak ditemukan -> 404", async () => {
    const r = await call("POST", ADMIN, { body: valid() }); assert.equal(r.status, 409); assert.equal(r.json.code, "BANPT_REGULATION_DUPLICATE");
    assert.equal((await call("GET", `${ADMIN}/bukan-uuid`)).status, 400);
    const nf = await call("GET", `${ADMIN}/${MISSING}`); assert.equal(nf.status, 404); assert.equal(nf.json.code, "BANPT_REGULATION_NOT_FOUND");
    assert.equal((await call("PATCH", `${ADMIN}/${MISSING}`, { body: { title: "x" } })).status, 404);
    assert.equal((await call("DELETE", `${ADMIN}/${MISSING}`)).status, 404);
  });
  await test("respons admin tidak membocorkan path storage sebagai field", async () => {
    await withDoc(reg.id);
    const r = await call("GET", `${ADMIN}/${reg.id}`);
    for (const k of ["document_path", "documentPath", "path", "driveFileId", "document_drive_file_id", "md5", "document_md5"]) assert.ok(!r.text.includes(`"${k}"`), k);
    const id = row(reg.id).document_drive_file_id;
    assert.ok(id && !r.text.includes(id), "ID file Drive tidak boleh muncul di respons");
  });

  // ===================================================================
  console.log("\n3. Status draft / published");
  reset();
  await test("tidak bisa dipublikasikan tanpa dokumen utama (POST maupun PATCH)", async () => {
    const r = await call("POST", ADMIN, { body: valid({ status: "published" }) });
    assert.equal(r.status, 400); assert.equal(r.json.code, "DOCUMENT_REQUIRED_TO_PUBLISH"); assert.equal(db[T].length, 0);
    const c = await create();
    const p = await call("PATCH", `${ADMIN}/${c.id}`, { body: { status: "published" } });
    assert.equal(p.status, 400); assert.equal(p.json.code, "DOCUMENT_REQUIRED_TO_PUBLISH"); assert.equal(row(c.id).status, "draft");
  });
  await test("draft -> published (publishedAt terisi) -> draft (hilang dari publik) -> published lagi", async () => {
    const c = (await call("GET", ADMIN)).json.data.items[0];
    await withDoc(c.id);
    const p = await call("PATCH", `${ADMIN}/${c.id}`, { body: { status: "published" } });
    assert.equal(p.status, 200); assert.equal(p.json.data.regulation.status, "published"); assert.ok(p.json.data.regulation.publishedAt);
    assert.equal((await call("GET", `${PUB}/${c.id}`, { token: null })).status, 200);
    const d = await call("PATCH", `${ADMIN}/${c.id}`, { body: { status: "draft" } });
    assert.equal(d.json.data.regulation.status, "draft");
    assert.equal((await call("GET", `${PUB}/${c.id}`, { token: null })).status, 404);
    assert.equal((await call("GET", PUB, { token: null })).json.data.items.length, 0);
    await call("PATCH", `${ADMIN}/${c.id}`, { body: { status: "published" } });
    assert.equal((await call("GET", `${PUB}/${c.id}`, { token: null })).status, 200);
  });

  // ===================================================================
  console.log("\n4. Validasi file PDF");
  reset();
  const v = await create();
  const DOC = `${ADMIN}/${v.id}/document`; const ATT = `${ADMIN}/${v.id}/attachments`;
  const rejects = async (url, f, status, code) => {
    const r = await call(url === DOC ? "PUT" : "POST", url, { form: f });
    assert.equal(r.status, status, `${status} diharapkan, dapat ${r.status} ${r.text.slice(0, 120)}`);
    if (code) assert.equal(r.json.code, code);
    assert.equal(objects().length, 0, "tidak boleh ada file tersimpan"); assert.equal(row(v.id).document_drive_file_id ?? null, null);
  };
  await test("hanya PDF: PNG/JPG/DOCX/TXT ditolak 415", async () => {
    await rejects(DOC, one("document", png(), "a.png", "image/png"), 415, "UNSUPPORTED_FILE_TYPE");
    await rejects(DOC, one("document", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "a.jpg", "image/jpeg"), 415);
    await rejects(DOC, one("document", Buffer.from("PK"), "a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), 415);
    await rejects(DOC, one("document", Buffer.from("hai"), "a.txt", "text/plain"), 415);
  });
  await test("MIME PDF tapi ekstensi lain (atau sebaliknya) ditolak 415", async () => {
    await rejects(DOC, one("document", pdf(), "a.png", "application/pdf"), 415);
    await rejects(DOC, one("document", pdf(), "a.pdf", "image/png"), 415);
    await rejects(DOC, one("document", pdf(), "a.pdf", "application/octet-stream"), 415);
    await rejects(DOC, one("document", pdf(), "a", "application/pdf"), 415);
  });
  await test("ekstensi & MIME PDF tetapi isi bukan PDF (PNG diganti nama) ditolak 400 INVALID_DOCUMENT", async () => {
    await rejects(DOC, one("document", png(), "palsu.pdf", "application/pdf"), 400, "INVALID_DOCUMENT");
    await rejects(DOC, one("document", Buffer.from("<html>%PDF-</html>"), "palsu.pdf", "application/pdf"), 400, "INVALID_DOCUMENT");
  });
  await test("file kosong ditolak; tanpa file -> 400 FILE_REQUIRED", async () => {
    await rejects(DOC, one("document", Buffer.alloc(0), "kosong.pdf"), 400);
    await rejects(DOC, new FormData(), 400, "FILE_REQUIRED");
  });
  await test("batas 20 MB: 21 MB ditolak 413, tepat di bawah batas diterima", async () => {
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(21 * 1024 * 1024)]);
    await rejects(DOC, one("document", big, "besar.pdf"), 413, "FILE_TOO_LARGE");
    const okBuf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(20 * 1024 * 1024 - 100)]);
    const r = await call("PUT", DOC, { form: one("document", okBuf, "ok.pdf") });
    assert.equal(r.status, 200); assert.equal(objects().length, 1); fd.state.files.clear(); row(v.id).document_drive_file_id = null;
  });
  await test("nama field salah / lebih dari satu file di /document / terlalu banyak file lampiran -> 400", async () => {
    await rejects(DOC, one("file", pdf(), "a.pdf"), 400, "VALIDATION_ERROR");
    await rejects(DOC, form([["document", pdf("1"), "1.pdf"], ["document", pdf("2"), "2.pdf"]]), 400);
    await rejects(ATT, one("document", pdf(), "a.pdf"), 400);
    await rejects(ATT, form(Array.from({ length: 6 }, (_, i) => ["attachments", pdf(String(i)), `${i}.pdf`])), 400);
    await rejects(ATT, new FormData(), 400, "FILE_REQUIRED");
  });
  await test("field teks tambahan di request upload ditolak (tidak bisa menyelundupkan path)", async () => {
    const f = one("document", pdf(), "a.pdf"); f.append("document_path", "../../x");
    await rejects(DOC, f, 400);
  });
  await test("upload ke data yang tidak ada -> 404 sebelum file diproses", async () => {
    const r = await call("PUT", `${ADMIN}/${MISSING}/document`, { form: one("document", pdf(), "a.pdf") });
    assert.equal(r.status, 404); assert.equal(objects().length, 0);
  });

  // ===================================================================
  console.log("\n5. Dokumen utama: upload & penggantian");
  startServer; reset(); await startServer();
  const m = await create();
  const MD = `${ADMIN}/${m.id}/document`;
  let firstId;
  await test("upload dokumen utama: tersimpan di Drive (bukan Supabase), nama pengguna tidak jadi path, link lewat backend", async () => {
    const r = await call("PUT", MD, { form: one("document", pdf("a"), "../../../etc/passwd/Nama Asli.pdf") });
    assert.equal(r.status, 200, r.text);
    firstId = row(m.id).document_drive_file_id;
    assert.match(firstId, /^drv_/); assert.equal(row(m.id).document_path, null);
    assert.ok(hasObj(firstId)); assert.equal(storage.objects.size, 0, "tidak ada objek di Supabase Storage");
    const up = fd.state.calls.find((c) => c.op === "upload");
    assert.ok(!up.name.includes("/") && !up.name.includes("passwd"), up.name);
    assert.equal(up.parentId, "folder-regulasi-banpt");
    const d = r.json.data.regulation.document;
    assert.match(d.url, /^\/api\/files\/[\w-]+\.[\w-]+\.[\w-]+$/); assert.match(d.downloadUrl, /\?download=1$/);
    assert.equal(d.mimeType, "application/pdf"); assert.ok(d.urlExpiresAt);
    assert.ok(!("path" in d) && !("driveFileId" in d) && !r.text.includes(firstId) && !r.text.includes("service-role"));
  });
  await test("ganti dokumen utama: file baru unik, file lama dibersihkan setelah DB menunjuk file baru", async () => {
    const r = await call("PUT", MD, { form: one("document", pdf("b"), "baru.pdf") });
    assert.equal(r.status, 200);
    const nid = row(m.id).document_drive_file_id;
    assert.notEqual(nid, firstId); assert.ok(hasObj(nid)); assert.ok(!hasObj(firstId)); assert.equal(objects().length, 1);
    const ops = fd.state.calls.filter((c) => ["upload", "remove"].includes(c.op)).map((c) => `${c.op}:${c.id}`);
    assert.deepEqual(ops.slice(-2), [`upload:${nid}`, `remove:${firstId}`], "unggah baru dulu, hapus lama sesudahnya");
  });
  await test("upload gagal -> 502 STORAGE_ERROR, data & file lama tidak berubah", async () => {
    const before = row(m.id).document_drive_file_id; fd.state.failUpload = true;
    const r = await call("PUT", MD, { form: one("document", pdf("c"), "c.pdf") });
    fd.state.failUpload = false;
    assert.equal(r.status, 502); assert.equal(r.json.code, "STORAGE_ERROR"); assert.ok(!r.text.includes("boom"));
    assert.equal(row(m.id).document_drive_file_id, before); assert.ok(hasObj(before)); assert.equal(objects().length, 1);
  });
  await test("DB gagal saat simpan -> 500, file baru dibersihkan, file lama utuh", async () => {
    const before = row(m.id).document_drive_file_id;
    faults.push({ table: T, op: "update", error: { message: "secret detail", code: "XX000" } });
    const r = await call("PUT", MD, { form: one("document", pdf("d"), "d.pdf") });
    assert.equal(r.status, 500); assert.equal(r.json.code, "DATABASE_ERROR"); assert.ok(!r.text.includes("secret detail"));
    assert.equal(row(m.id).document_drive_file_id, before); assert.deepEqual(objects(), [before]);
  });
  await test("perubahan bersamaan (CAS gagal) -> 409, file baru dibersihkan, file pihak lain tidak ikut terhapus", async () => {
    const original = row(m.id).document_drive_file_id;
    hooks.beforeUpdate = () => { row(m.id).document_drive_file_id = "drv_diganti_pihak_lain"; };
    const r = await call("PUT", MD, { form: one("document", pdf("e"), "e.pdf") });
    assert.equal(r.status, 409); assert.equal(r.json.code, "REGULATION_CONFLICT");
    assert.deepEqual(objects(), [original]);
    row(m.id).document_drive_file_id = original;
  });
  await test("hapus file lama gagal -> tetap 200, dicatat [ORPHAN] + masuk antrean pembersihan", async () => {
    const old = row(m.id).document_drive_file_id; fd.state.failRemove = true;
    const r = await call("PUT", MD, { form: one("document", pdf("f"), "f.pdf") });
    fd.state.failRemove = false;
    assert.equal(r.status, 200); assert.notEqual(row(m.id).document_drive_file_id, old);
    assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(old)));
    assert.ok((db.drive_cleanup_queue || []).some((q) => q.file_id === old), "file lama harus ada di antrean");
  });

  // ===================================================================
  console.log("\n6. Lampiran: tambah banyak, ganti, hapus");
  reset(); await startServer();
  const a = await create(); const AA = `${ADMIN}/${a.id}/attachments`;
  let atts;
  await test("upload beberapa lampiran sekaligus (3 PDF) -> 201, id unik, nama asli, URL publik & unduhan", async () => {
    const r = await call("POST", AA, { form: form([["attachments", pdf("1"), "Lampiran 1.pdf"], ["attachments", pdf("2"), "Lampiran 2.pdf"], ["attachments", pdf("3"), "Lampiran 3.pdf"]]) });
    assert.equal(r.status, 201);
    atts = r.json.data.regulation.attachments;
    assert.equal(atts.length, 3); assert.equal(new Set(atts.map((x) => x.id)).size, 3);
    assert.deepEqual(atts.map((x) => x.name), ["Lampiran 1.pdf", "Lampiran 2.pdf", "Lampiran 3.pdf"]);
    for (const x of atts) { assert.match(x.url, /^\/api\/files\//); assert.match(x.downloadUrl, /\?download=1$/); assert.ok(!("path" in x) && !("driveFileId" in x) && !("md5" in x)); }
    assert.equal(objects().length, 3); assert.equal(row(a.id).attachments.length, 3);
    for (const s of row(a.id).attachments) { assert.ok(hasObj(s.driveFileId)); assert.equal(s.path, undefined); }
  });
  await test("menambah lampiran lagi tidak menimpa lampiran lama", async () => {
    const r = await call("POST", AA, { form: one("attachments", pdf("4"), "Lampiran 4.pdf") });
    assert.equal(r.json.data.regulation.attachments.length, 4); assert.equal(objects().length, 4);
    assert.deepEqual(r.json.data.regulation.attachments.slice(0, 3).map((x) => x.id), atts.map((x) => x.id));
  });
  await test("satu file tidak valid di antara beberapa -> semua ditolak, tidak ada file tersimpan", async () => {
    const before = objects().length;
    const r = await call("POST", AA, { form: form([["attachments", pdf("5"), "ok.pdf"], ["attachments", png(), "palsu.pdf"]]) });
    assert.equal(r.status, 400); assert.equal(objects().length, before); assert.equal(row(a.id).attachments.length, 4);
    const r2 = await call("POST", AA, { form: form([["attachments", pdf("5"), "ok.pdf"], ["attachments", png(), "x.png", "image/png"]]) });
    assert.equal(r2.status, 415); assert.equal(objects().length, before);
  });
  await test("upload gagal di tengah -> file yang sudah terunggah dibersihkan, data tidak berubah", async () => {
    const before = objects().length; fd.state.uploads = 0; fd.state.failUploadAfter = 1;
    const r = await call("POST", AA, { form: form([["attachments", pdf("6"), "6.pdf"], ["attachments", pdf("7"), "7.pdf"], ["attachments", pdf("8"), "8.pdf"]]) });
    fd.state.failUploadAfter = null;
    assert.equal(r.status, 502); assert.equal(objects().length, before); assert.equal(row(a.id).attachments.length, 4);
  });
  await test("DB gagal / CAS gagal saat simpan lampiran -> semua file baru dibersihkan", async () => {
    const before = objects().length;
    faults.push({ table: T, op: "update", error: { message: "x", code: "XX000" } });
    assert.equal((await call("POST", AA, { form: form([["attachments", pdf("9"), "9.pdf"], ["attachments", pdf("10"), "10.pdf"]]) })).status, 500);
    assert.equal(objects().length, before);
    hooks.beforeUpdate = () => { row(a.id).title = "diubah pihak lain"; row(a.id).updated_at = "2099-01-01T00:00:00.000Z"; };
    const r = await call("POST", AA, { form: one("attachments", pdf("11"), "11.pdf") });
    assert.equal(r.status, 409); assert.equal(objects().length, before); assert.equal(row(a.id).attachments.length, 4);
  });
  await test("ganti lampiran: id tetap, file baru, file lama dihapus", async () => {
    const target = row(a.id).attachments[1]; const oldPath = target.driveFileId;
    const r = await call("PUT", `${AA}/${target.id}`, { form: one("attachment", pdf("ganti"), "Pengganti.pdf") });
    assert.equal(r.status, 200);
    const now = r.json.data.regulation.attachments;
    assert.equal(now.length, 4); assert.equal(now[1].id, target.id); assert.equal(now[1].name, "Pengganti.pdf");
    assert.ok(!hasObj(oldPath)); assert.ok(hasObj(row(a.id).attachments[1].driveFileId)); assert.equal(objects().length, 4);
  });
  await test("ganti lampiran dengan file tidak valid / id tidak ada / gagal upload -> tidak ada perubahan", async () => {
    const t = row(a.id).attachments[0]; const snapshot = JSON.stringify(row(a.id).attachments);
    assert.equal((await call("PUT", `${AA}/${t.id}`, { form: one("attachment", png(), "x.pdf") })).status, 400);
    assert.equal((await call("PUT", `${AA}/${t.id}`, { form: one("attachment", pdf(), "x.png", "image/png") })).status, 415);
    const nf = await call("PUT", `${AA}/${MISSING}`, { form: one("attachment", pdf("z"), "z.pdf") });
    assert.equal(nf.status, 404); assert.equal(nf.json.code, "ATTACHMENT_NOT_FOUND");
    fd.state.failUpload = true;
    assert.equal((await call("PUT", `${AA}/${t.id}`, { form: one("attachment", pdf("z"), "z.pdf") })).status, 502);
    fd.state.failUpload = false;
    assert.equal(JSON.stringify(row(a.id).attachments), snapshot); assert.equal(objects().length, 4);
    assert.equal((await call("PUT", `${AA}/bukan-uuid`, { form: one("attachment", pdf(), "z.pdf") })).status, 400);
  });
  await test("hapus lampiran: file terhapus dari Storage, lampiran lain utuh; hapus lagi -> 404", async () => {
    const [t, ...rest] = row(a.id).attachments; const p = t.driveFileId;
    const r = await call("DELETE", `${AA}/${t.id}`);
    assert.equal(r.status, 200); assert.equal(r.json.data.regulation.attachments.length, 3);
    assert.ok(!hasObj(p)); assert.equal(objects().length, 3);
    assert.deepEqual(row(a.id).attachments.map((x) => x.id), rest.map((x) => x.id));
    const again = await call("DELETE", `${AA}/${t.id}`); assert.equal(again.status, 404); assert.equal(again.json.code, "ATTACHMENT_NOT_FOUND");
  });
  await test("hapus lampiran: DB gagal -> file tidak dihapus; Storage gagal -> tetap 200 + [ORPHAN]", async () => {
    const t = row(a.id).attachments[0];
    faults.push({ table: T, op: "update", error: { message: "x", code: "XX000" } });
    assert.equal((await call("DELETE", `${AA}/${t.id}`)).status, 500); assert.ok(hasObj(t.driveFileId)); assert.equal(row(a.id).attachments.length, 3);
    fd.state.failRemove = true;
    const r = await call("DELETE", `${AA}/${t.id}`); fd.state.failRemove = false;
    assert.equal(r.status, 200); assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(t.driveFileId)));
  });
  await test("batas jumlah lampiran per peraturan (20) -> 400 ATTACHMENT_LIMIT_REACHED", async () => {
    reset(); await startServer();
    const c = await create(); const url = `${ADMIN}/${c.id}/attachments`;
    for (let i = 0; i < 4; i += 1) assert.equal((await call("POST", url, { form: form(Array.from({ length: 5 }, (_, j) => ["attachments", pdf(`${i}${j}`), `${i}${j}.pdf`])) })).status, 201);
    assert.equal(row(c.id).attachments.length, 20);
    const r = await call("POST", url, { form: one("attachments", pdf("lebih"), "lebih.pdf") });
    assert.equal(r.status, 400); assert.equal(r.json.code, "ATTACHMENT_LIMIT_REACHED"); assert.equal(objects().length, 20);
  });

  // ===================================================================
  console.log("\n7. Hapus peraturan beserta file Storage");
  reset(); await startServer();
  await test("DELETE menghapus baris + dokumen utama + SEMUA lampiran dari Drive", async () => {
    const c = await create(); await withDoc(c.id);
    await call("POST", `${ADMIN}/${c.id}/attachments`, { form: form([["attachments", pdf("1"), "1.pdf"], ["attachments", pdf("2"), "2.pdf"]]) });
    const other = await create({ regulationNumber: "77" }); await withDoc(other.id, "o");
    assert.equal(objects().length, 4);
    const r = await call("DELETE", `${ADMIN}/${c.id}`);
    assert.equal(r.status, 200); assert.equal(r.json.success, true);
    assert.equal(row(c.id), undefined); assert.equal(objects().length, 1);
    assert.equal(fd.live()[0].appProperties.recordId, other.id, "file milik peraturan lain tidak boleh ikut terhapus");
    assert.equal((await call("GET", `${ADMIN}/${c.id}`)).status, 404);
  });
  await test("Drive gagal saat hapus -> data tetap terhapus (200), tiap file dicatat [ORPHAN] dan diantrekan", async () => {
    const c = await create({ regulationNumber: "88" }); await withDoc(c.id);
    await call("POST", `${ADMIN}/${c.id}/attachments`, { form: one("attachments", pdf("1"), "1.pdf") });
    const paths = [row(c.id).document_drive_file_id, row(c.id).attachments[0].driveFileId];
    fd.state.failRemove = true; const r = await call("DELETE", `${ADMIN}/${c.id}`); fd.state.failRemove = false;
    assert.equal(r.status, 200); assert.equal(row(c.id), undefined);
    for (const p of paths) {
      assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(p)), p);
      assert.ok((db.drive_cleanup_queue || []).some((q) => q.file_id === p), `${p} harus masuk antrean`);
    }
  });
  await test("DB gagal saat hapus -> 500 dan file TIDAK dihapus", async () => {
    const c = await create({ regulationNumber: "99" }); await withDoc(c.id, "k");
    const p = row(c.id).document_drive_file_id;
    faults.push({ table: T, op: "delete", error: { message: "x", code: "XX000" } });
    assert.equal((await call("DELETE", `${ADMIN}/${c.id}`)).status, 500);
    assert.ok(hasObj(p)); assert.ok(row(c.id));
  });

  // ===================================================================
  console.log("\n8. Pencarian, filter, dan pagination");
  reset(); await startServer();
  const mk = (num, year, date, title, o = {}) => ({ id: crypto.randomUUID(), regulation_number: num, regulation_year: year, determination_date: date, title,
    document_path: `regulations/x/main/${num}.pdf`, attachments: [], status: "published", published_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...o });
  const seed = {
    R1: mk("1", 2024, "2024-03-01", "Instrumen Akreditasi Program Studi"),
    R2: mk("2", 2024, "2024-06-15", "Sistem Penjaminan Mutu Internal"),
    R3: mk("3", 2023, "2023-12-31", "Akreditasi Perguruan Tinggi"),
    R4: mk("4", 2023, "2023-01-01", "Pedoman 100% Evaluasi_Kinerja"),
    R5: mk("10", 2022, "2022-05-05", "Lembaga Akreditasi Mandiri"),
    R6: mk("5", 2021, null, "Tanpa Tanggal Penetapan"),
    D1: mk("6", 2024, "2024-07-01", "Draft Rahasia Akreditasi", { status: "draft", published_at: null }),
    F1: mk("7", 2024, "2024-08-01", "Terjadwal Masa Depan Akreditasi", { published_at: new Date(Date.now() + 86400000 * 30).toISOString() }),
  };
  db[T] = Object.values(seed);
  const key = (r) => Object.keys(seed).find((k) => seed[k].id === r.id);
  const keys = (r) => r.json.data.items.map(key);
  const PUBLISHED = ["R1", "R2", "R3", "R4", "R5", "R6"];
  const A = async (qs, exp, url = ADMIN, token) => {
    const r = await call("GET", `${url}${q(qs)}`, token === null ? { token: null } : {});
    assert.equal(r.status, 200, `${JSON.stringify(qs)} -> ${r.status} ${r.text.slice(0, 120)}`);
    assert.deepEqual(keys(r).sort(), [...exp].sort(), JSON.stringify(qs)); return r;
  };
  const P = (qs, exp) => A(qs, exp, PUB, null);
  await test("search: judul (sebagian kata, tidak sensitif huruf), nomor, dan tahun", async () => {
    await A({ search: "akreditasi" }, ["R1", "R3", "R5", "D1", "F1"]);
    await A({ search: "PROGRAM studi" }, ["R1"]);
    await A({ search: "mutu" }, ["R2"]);
    await A({ search: "10" }, ["R4", "R5"]);  // nomor "10" dan judul "100%"
    await A({ search: "2023" }, ["R3", "R4"]);  // tahun (angka 4 digit)
    await A({ search: "2021" }, ["R6"]);
    await A({ search: "tidak-ada" }, []);
  });
  await test("search: karakter wildcard/khusus diperlakukan sebagai teks biasa dan tidak menyebabkan 500", async () => {
    await A({ search: "100%" }, ["R4"]);
    await A({ search: "evaluasi" }, ["R4"]);
    for (const s of ["a,status.eq.draft", "x),(status.eq.draft", "\"", "\\", "😀", "%", "_"]) {
      const r = await call("GET", `${PUB}${q({ search: s })}`, { token: null });
      assert.equal(r.status, 200, s); for (const i of r.json.data.items) assert.notEqual(i.title, "Draft Rahasia Akreditasi");
    }
  });
  await test("filter year", async () => {
    await A({ year: "2024" }, ["R1", "R2", "D1", "F1"]); await A({ year: "2023" }, ["R3", "R4"]); await A({ year: "1999" }, []);
  });
  await test("filter regulationNumber (sebagian, tidak sensitif huruf)", async () => {
    await A({ regulationNumber: "1" }, ["R1", "R5"]); await A({ regulationNumber: "10" }, ["R5"]); await A({ regulationNumber: "9" }, []);
  });
  await test("filter dateFrom / dateTo (inklusif); tanggal kosong tidak ikut dan tidak error", async () => {
    await A({ dateFrom: "2024-01-01" }, ["R1", "R2", "D1", "F1"]);
    await A({ dateTo: "2023-12-31" }, ["R3", "R4", "R5"]);
    await A({ dateFrom: "2023-12-31", dateTo: "2023-12-31" }, ["R3"]);
    await A({ dateFrom: "2023-01-01", dateTo: "2023-12-31" }, ["R3", "R4"]);
  });
  await test("semua filter dapat dikombinasikan (AND)", async () => {
    await A({ year: "2024", search: "akreditasi", dateFrom: "2024-01-01", dateTo: "2024-04-01", regulationNumber: "1" }, ["R1"]);
    await A({ year: "2024", search: "mutu" }, ["R2"]);
    await A({ year: "2023", dateFrom: "2023-06-01" }, ["R3"]);
    await A({ year: "2023", search: "akreditasi", regulationNumber: "4" }, []);
    await A({ status: "draft", search: "akreditasi" }, ["D1"]);
    await A({ status: "draft", year: "2023" }, []);
  });
  await test("urutan: tanggal penetapan terbaru dulu, tanggal kosong terakhir", async () => {
    const r = await call("GET", `${ADMIN}${q({ limit: 50 })}`);
    assert.deepEqual(keys(r), ["F1", "D1", "R2", "R1", "R3", "R4", "R5", "R6"]);
  });
  await test("pagination dilakukan database: page, limit, total, totalPages; halaman di luar jangkauan kosong", async () => {
    const p = [];
    for (const page of [1, 2, 3]) p.push(await call("GET", `${PUB}${q({ page, limit: 2 })}`, { token: null }));
    assert.deepEqual(p[0].json.data.pagination, { page: 1, limit: 2, total: 6, totalPages: 3 });
    const ids = p.flatMap((r) => keys(r)); assert.deepEqual(ids, ["R2", "R1", "R3", "R4", "R5", "R6"]);
    const far = await call("GET", `${PUB}${q({ page: 9, limit: 2 })}`, { token: null });
    assert.equal(far.status, 200); assert.deepEqual(far.json.data.items, []); assert.deepEqual(far.json.data.pagination, { page: 9, limit: 2, total: 6, totalPages: 3 });
    const f = await call("GET", `${PUB}${q({ year: "2024", page: 2, limit: 1 })}`, { token: null });
    assert.deepEqual(f.json.data.pagination, { page: 2, limit: 1, total: 2, totalPages: 2 }); assert.deepEqual(keys(f), ["R1"]);
    const none = await call("GET", `${PUB}${q({ search: "zzz" })}`, { token: null });
    assert.deepEqual(none.json.data.pagination, { page: 1, limit: 10, total: 0, totalPages: 0 });
  });
  await test("parameter kosong diabaikan", async () => {
    await A({ search: "", year: "", regulationNumber: "", dateFrom: "", dateTo: "", status: "" }, [...PUBLISHED, "D1", "F1"]);
  });
  await test("parameter tidak valid -> 400 VALIDATION_ERROR (admin & publik)", async () => {
    const bads = [{ year: "abc" }, { year: "24" }, { year: "1899" }, { year: "2101" }, { dateFrom: "2024-02-30" }, { dateTo: "besok" }, { dateFrom: "2024/01/01" },
      { dateFrom: "2024-06-01", dateTo: "2024-05-31" }, { limit: "0" }, { limit: "51" }, { page: "0" }, { page: "x" }, { search: "x".repeat(101) }, { regulationNumber: "x".repeat(101) }];
    for (const b of bads) for (const url of [ADMIN, PUB]) {
      const r = await call("GET", `${url}${q(b)}`, url === PUB ? { token: null } : {});
      assert.equal(r.status, 400, `${url} ${JSON.stringify(b)} -> ${r.status}`); assert.equal(r.json.code, "VALIDATION_ERROR"); assert.ok(r.json.errors.length > 0);
    }
    assert.equal((await call("GET", `${ADMIN}?status=arsip`)).status, 400);
    assert.equal((await call("GET", `${PUB}?year=2024&year=2023`, { token: null })).status, 400);
  });

  // ===================================================================
  console.log("\n9. API publik: hanya published");
  await test("daftar publik hanya published dan sudah waktunya tayang; tanpa token", async () => { await P({}, PUBLISHED); });
  await test("draft & jadwal masa depan tidak muncul lewat filter/pencarian apa pun", async () => {
    await P({ search: "rahasia" }, []); await P({ search: "terjadwal" }, []); await P({ regulationNumber: "6" }, []); await P({ regulationNumber: "7" }, []);
    await P({ year: "2024" }, ["R1", "R2"]); await P({ dateFrom: "2024-07-01" }, []); await P({ search: "akreditasi" }, ["R1", "R3", "R5"]);
    await P({ status: "draft" }, PUBLISHED);   // ?status diabaikan di publik
  });
  await test("detail: published 200, draft 404, jadwal masa depan 404, tidak ada 404, ID salah 400", async () => {
    assert.equal((await call("GET", `${PUB}/${seed.R1.id}`, { token: null })).status, 200);
    assert.equal((await call("GET", `${PUB}/${seed.D1.id}`, { token: null })).status, 404);
    assert.equal((await call("GET", `${PUB}/${seed.F1.id}`, { token: null })).status, 404);
    assert.equal((await call("GET", `${PUB}/${MISSING}`, { token: null })).status, 404);
    assert.equal((await call("GET", `${PUB}/bukan-uuid`, { token: null })).status, 400);
  });
  await test("isi respons publik: nomor, tahun, tanggal, judul, dokumen utama, lampiran + link unduhan; tanpa field internal", async () => {
    seed.R1.attachments = [{ id: crypto.randomUUID(), name: "Lampiran A.pdf", path: "regulations/x/attachments/a.pdf", mimeType: "application/pdf", size: 123, uploadedAt: "2024-01-01T00:00:00.000Z" }];
    const r = await call("GET", `${PUB}/${seed.R1.id}`, { token: null });
    const x = r.json.data.regulation;
    assert.deepEqual([x.regulationNumber, x.regulationYear, x.determinationDate, x.title], ["1", 2024, "2024-03-01", "Instrumen Akreditasi Program Studi"]);
    assert.match(x.document.url, /\/object\/public\/banpt-regulations\/regulations\/x\/main\/1\.pdf$/);
    assert.equal(x.attachments.length, 1); assert.match(x.attachments[0].downloadUrl, /download=Lampiran%20A\.pdf/); assert.equal(x.attachments[0].size, 123);
    for (const k of ["status", "createdAt", "updatedAt", "document_path", "documentPath", "path", "created_by"]) assert.ok(!r.text.includes(`"${k}"`), `bocor: ${k}`);
    assert.ok(r.json.success === true);
    const list = await call("GET", PUB, { token: null });
    assert.ok(!list.text.includes('"status"') && !list.text.includes("Draft Rahasia"));
  });
  await test("filter-options: tahun hanya dari data published (publik) / semua (admin); tidak tertangkap rute /:id", async () => {
    seed.D1.regulation_year = 1999;
    const pub = await call("GET", `${PUB}/filter-options`, { token: null });
    assert.equal(pub.status, 200); assert.deepEqual(pub.json.data.years, [2024, 2023, 2022, 2021]);
    const adm = await call("GET", `${ADMIN}/filter-options`);
    assert.deepEqual(adm.json.data.years, [2024, 2023, 2022, 2021, 1999]);
    seed.D1.regulation_year = 2024;
  });
  await test("publik tidak bisa menulis: POST/PATCH/PUT/DELETE -> 404 dan data tidak berubah", async () => {
    const snap = JSON.stringify(db[T]); const objs = objects().length;
    for (const [mth, u] of [["POST", PUB], ["PATCH", `${PUB}/${seed.R1.id}`], ["PUT", `${PUB}/${seed.R1.id}`], ["DELETE", `${PUB}/${seed.R1.id}`], ["PUT", `${PUB}/${seed.R1.id}/document`], ["POST", `${PUB}/${seed.R1.id}/attachments`]]) {
      const r = await call(mth, u, { token: null, body: { title: "x" } }); assert.equal(r.status, 404, `${mth} ${u}`);
    }
    assert.equal(JSON.stringify(db[T]), snap); assert.equal(objects().length, objs);
  });

  // ===================================================================
  console.log("\n10. Error database");
  await test("DB error -> 500 DATABASE_ERROR dengan pesan generik (admin & publik)", async () => {
    faults.push({ table: T, op: "select", error: { message: "secret relation detail", code: "42P01" } });
    const r = await call("GET", ADMIN); assert.equal(r.status, 500); assert.equal(r.json.code, "DATABASE_ERROR"); assert.ok(!r.text.includes("secret relation detail"));
    faults.push({ table: T, op: "select", error: { message: "x", code: "XX000" } });
    assert.equal((await call("GET", PUB, { token: null })).status, 500);
    faults.push({ table: T, op: "select", error: { message: "x", code: "XX000" } });
    assert.equal((await call("GET", `${PUB}/${MISSING}`, { token: null })).status, 500);
  });
  await test("create/update/delete: DB error -> 500; CHECK/NOT NULL (23514/23502) -> 400", async () => {
    faults.push({ table: T, op: "insert", error: { message: "x", code: "XX000" } });
    assert.equal((await call("POST", ADMIN, { body: valid({ regulationNumber: "500" }) })).status, 500);
    faults.push({ table: T, op: "insert", error: { message: "x", code: "23514" } });
    assert.equal((await call("POST", ADMIN, { body: valid({ regulationNumber: "501" }) })).status, 400);
    faults.push({ table: T, op: "insert", error: { message: "x", code: "23502" } });
    assert.equal((await call("POST", ADMIN, { body: valid({ regulationNumber: "502" }) })).status, 400);
    faults.push({ table: T, op: "update", error: { message: "x", code: "XX000" } });
    assert.equal((await call("PATCH", `${ADMIN}/${seed.R1.id}`, { body: { title: "x" } })).status, 500);
    faults.push({ table: T, op: "delete", error: { message: "x", code: "XX000" } });
    assert.equal((await call("DELETE", `${ADMIN}/${seed.R1.id}`)).status, 500);
  });

  // ===================================================================
  console.log("\n11. Fitur lain tidak terpengaruh");
  await test("route akreditasi & route lama masih terpasang", async () => {
    assert.equal((await call("GET", "/", { token: null })).status, 200);
    for (const u of ["/api/admin/accreditation/institutions", "/api/admin/accreditation/study-programs", "/api/admin/news", "/api/admin/announcements"]) assert.equal((await call("GET", u, { token: null })).status, 401, u);
    assert.equal((await call("GET", "/api/accreditation/study-programs", { token: null })).status, 200);
    assert.equal((await call("GET", "/api/accreditation/institutions", { token: null })).status, 200);
    assert.equal((await call("GET", "/api/news", { token: null })).status, 200);
    assert.equal((await call("GET", "/api/tidak-ada", { token: null })).status, 404);
  });

  console.log(`\n(${requestCount} request HTTP dikirim)`);
  await new Promise((r) => server.close(r));
  console.error = origError;
  console.log(`\nSelesai: ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})();
