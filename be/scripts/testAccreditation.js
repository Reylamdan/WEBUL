// Pengujian OFFLINE fitur BAN-PT (akreditasi institusi & program studi).
// Supabase (database + Storage) diganti versi palsu di memori, jadi TIDAK ada data asli yang
// tersentuh dan tidak butuh server/login. Request dikirim lewat HTTP sungguhan ke app Express.
//
//   node scripts/testAccreditation.js
//
// Yang TIDAK dicakup (butuh Supabase asli): constraint/trigger/RLS di migration SQL, signed URL
// asli, dan bucket privat. Lihat panduan uji manual (Postman/PowerShell).

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
const storage = { objects: new Set(), failUpload: false, failRemove: false, failSign: false };
const faults = []; // { table, op, error } sekali pakai
const hooks = { beforeUpdate: null };

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INACTIVE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const UNIQUE_RULES = {
  accreditation_institutions: (r) => String(r.sk_number).trim().toLowerCase(),
  accreditation_study_programs: (r) =>
    [r.program_name, r.education_level, r.sk_number].map((v) => String(v).trim().toLowerCase()).join("|"),
};

const sortRows = (rows, orders) =>
  [...rows].sort((a, b) => {
    for (const { col, asc } of orders) {
      const x = a[col], y = b[col];
      if (x === y) continue;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : 1) * (asc ? 1 : -1);
    }
    return 0;
  });

class FakeQuery {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.filters = [];
    this.orders = [];
    this.payload = null;
    this.returning = true;
    this.mode = "many";
    this.opts = {};
    this.rangeArgs = null;
  }
  select(cols, opts) {
    this.opts = opts || {};
    this.returning = true;
    return this;
  }
  insert(p) { this.op = "insert"; this.payload = p; this.returning = false; return this; }
  update(p) { this.op = "update"; this.payload = p; this.returning = false; return this; }
  delete() { this.op = "delete"; this.returning = false; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] !== null && r[c] !== undefined && r[c] <= v); return this; }
  // Ditambahkan agar fake mengenali filter case-insensitive (level/rank); assertion tes tidak berubah
  ilike(c, pattern) {
    const re = new RegExp("^" + String(pattern).replace(/\\(.)|([.*+?^${}()|[\]\\])|%|_/g, (m, esc, special) =>
      esc ? esc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : special ? "\\" + special : m === "%" ? ".*" : ".") + "$", "i");
    this.filters.push((r) => re.test(String(r[c] ?? "")));
    return this;
  }
  in(c, a) { this.filters.push((r) => a.includes(r[c])); return this; }
  or(expr) {
    const parts = expr.split(",").map((p) => {
      const m = /^([a-z_]+)\.ilike\.%(.*)%$/.exec(p);
      return { col: m[1], term: m[2].toLowerCase() };
    });
    this.filters.push((r) => parts.some((p) => String(r[p.col] ?? "").toLowerCase().includes(p.term)));
    return this;
  }
  order(col, o) { this.orders.push({ col, asc: !o || o.ascending !== false }); return this; }
  range(a, b) { this.rangeArgs = [a, b]; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }

  run() {
    const faultIndex = faults.findIndex((f) => f.table === this.table && f.op === this.op);
    if (faultIndex >= 0) {
      const [f] = faults.splice(faultIndex, 1);
      return { data: null, error: f.error };
    }
    if (this.op === "update" && hooks.beforeUpdate) {
      const h = hooks.beforeUpdate;
      hooks.beforeUpdate = null;
      h(this.table);
    }
    db[this.table] = db[this.table] || [];
    const rows = db[this.table];
    const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
    let result;
    let count;

    if (this.op === "insert") {
      const now = new Date().toISOString();
      const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...this.payload };
      for (const k of ["decision_date", "valid_from", "valid_until", "document_path", "document_name", "document_mime", "document_size", "faculty", "published_at"]) {
        if (row[k] === undefined) row[k] = null;
      }
      const keyFn = UNIQUE_RULES[this.table];
      if (keyFn && rows.some((r) => keyFn(r) === keyFn(row))) {
        return { data: null, error: { code: "23505", message: "duplicate key" } };
      }
      if (row.valid_from && row.valid_until && row.valid_until < row.valid_from) {
        return { data: null, error: { code: "23514", message: "check dates" } };
      }
      rows.push(row);
      result = [row];
    } else if (this.op === "update") {
      result = match();
      for (const r of result) {
        const next = { ...r, ...this.payload };
        if (next.valid_from && next.valid_until && next.valid_until < next.valid_from) {
          return { data: null, error: { code: "23514", message: "check dates" } };
        }
        const keyFn = UNIQUE_RULES[this.table];
        if (keyFn && rows.some((o) => o !== r && keyFn(o) === keyFn(next))) {
          return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
      }
      for (const r of result) Object.assign(r, this.payload, { updated_at: new Date().toISOString() });
    } else if (this.op === "delete") {
      result = match();
      db[this.table] = rows.filter((r) => !result.includes(r));
    } else {
      result = sortRows(match(), this.orders);
      count = result.length;
      if (this.rangeArgs) {
        const [a, b] = this.rangeArgs;
        if (a > 0 && a >= count) return { data: null, error: { code: "PGRST103", message: "range" } };
        result = result.slice(a, b + 1);
      }
      if (this.opts.head) return { data: null, count, error: null };
    }

    const out = result.map((r) => ({ ...r }));
    if (!this.returning && this.op !== "select") return { data: null, error: null };
    if (this.mode === "many") return { data: out, count, error: null };
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return out[0] ? { data: out[0], error: null } : { data: null, error: { message: "no rows", code: "PGRST116" } };
  }
  then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
}

const fakeStorage = {
  from: (bucket) => ({
    upload: async (p) => {
      if (storage.failUpload) return { data: null, error: { message: "upload boom" } };
      storage.objects.add(`${bucket}/${p}`);
      return { data: { path: p }, error: null };
    },
    remove: async (paths) => {
      if (storage.failRemove) return { data: null, error: { message: "remove boom" } };
      for (const p of paths) storage.objects.delete(`${bucket}/${p}`);
      return { data: [], error: null };
    },
    createSignedUrl: async (p, ttl) => {
      if (storage.failSign) return { data: null, error: { message: "sign boom" } };
      return { data: { signedUrl: `https://fake-project.supabase.co/storage/v1/object/sign/${bucket}/${p}?token=t&ttl=${ttl}` }, error: null };
    },
    getPublicUrl: (p) => ({ data: { publicUrl: `https://fake/${bucket}/${p}` } }),
  }),
  listBuckets: async () => ({ data: [], error: null }),
};

const fakeSupabase = { from: (t) => new FakeQuery(t), storage: fakeStorage };
const supabasePath = require.resolve(path.join(__dirname, "../src/config/supabase.js"));
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase };

// Google Drive palsu: dokumen program studi sekarang disimpan di Drive (institusi tetap Supabase Storage).
const { createFakeDrive } = require("./lib/fakeDrive");
const fd = createFakeDrive();
const drivePath = fd.install();

// Senyapkan log error yang SENGAJA dipicu, tapi simpan untuk diperiksa
const logs = [];
const origError = console.error;
console.error = (...a) => logs.push(a.join(" "));

const loadFreshApp = () => {
  // Muat ulang app (dan pembatas rate limit yang tersimpan di memori) tanpa mengganti Supabase palsu
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath && key !== drivePath) delete require.cache[key];
  }
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

// ---------- harness ----------
let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n")[0]}`); }
};

let base;
let adminToken;
let requestCount = 0;
const call = async (method, url, { body, token = adminToken, form } = {}) => {
  requestCount += 1;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = typeof body === "string" ? body : JSON.stringify(body); }
  const res = await fetch(`${base}${url}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* bukan JSON */ }
  return { status: res.status, json, text };
};

const pdfBytes = (extra = "") => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}%%EOF`);
const pngBytes = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const jpgBytes = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);
const makeForm = (bytes, filename, type, field = "document") => {
  const f = new FormData();
  f.append(field, new Blob([bytes], { type }), filename);
  return f;
};
const BUCKET = "accreditation-documents";
const hasObject = (p) => storage.objects.has(`${BUCKET}/${p}`);
const objectCount = () => storage.objects.size;
const row = (table, id) => (db[table] || []).find((r) => r.id === id);

const INST = "/api/admin/accreditation/institutions";
const PROG = "/api/admin/accreditation/study-programs";
const PUB_INST = "/api/accreditation/institutions";
const PUB_PROG = "/api/accreditation/study-programs";
const T_INST = "accreditation_institutions";
const T_PROG = "accreditation_study_programs";
const MISSING = "123e4567-e89b-42d3-a456-426614174000";

const validInst = (o = {}) => ({ rank: "Unggul", skNumber: "SK-001/BAN-PT/2024", decisionDate: "2024-03-01", validFrom: "2024-03-01", validUntil: "2029-03-01", ...o });
const validProg = (o = {}) => ({ programName: "Teknologi Informasi", educationLevel: "S1", faculty: "Fakultas Teknologi", rank: "Baik Sekali", skNumber: "SK-P-001/2024", validFrom: "2024-01-01", validUntil: "2029-01-01", ...o });

const reset = () => {
  for (const k of Object.keys(db)) delete db[k];
  db.admins = [
    { id: ADMIN_ID, name: "Admin Tes", email: "a@x.id", is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z" },
    { id: INACTIVE_ID, name: "Nonaktif", email: "n@x.id", is_active: false, last_login_at: null, created_at: "2026-01-01T00:00:00Z" },
  ];
  storage.objects.clear();
  fd.reset();
  storage.failUpload = storage.failRemove = storage.failSign = false;
  faults.length = 0;
  hooks.beforeUpdate = null;
  logs.length = 0;
};

(async () => {
  let server;
  let signAdminToken;
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
  const adminCalls = [];
  for (const base of [INST, PROG]) {
    adminCalls.push(["GET", base], ["GET", `${base}/${MISSING}`], ["POST", base, validInst()],
      ["PATCH", `${base}/${MISSING}`, { rank: "A" }], ["DELETE", `${base}/${MISSING}`],
      ["PUT", `${base}/${MISSING}/document`], ["DELETE", `${base}/${MISSING}/document`]);
  }
  await test(`${adminCalls.length} endpoint admin tanpa token -> 401`, async () => {
    for (const [m, u, b] of adminCalls) {
      const r = await call(m, u, { body: b, token: null });
      assert.equal(r.status, 401, `${m} ${u} -> ${r.status}`);
    }
  });
  await test("token palsu -> 401", async () => {
    assert.equal((await call("GET", INST, { token: "abc.def.ghi" })).status, 401);
  });
  await test("token kedaluwarsa -> 401 TOKEN_EXPIRED", async () => {
    const expired = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID, expiresIn: -10 });
    const r = await call("GET", INST, { token: expired });
    assert.equal(r.status, 401); assert.equal(r.json.code, "TOKEN_EXPIRED");
  });
  await test("token dengan role bukan admin -> 403", async () => {
    const t = jwt.sign({ role: "user" }, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID, expiresIn: "1h" });
    assert.equal((await call("GET", INST, { token: t })).status, 403);
  });
  await test("admin nonaktif / tidak ada di DB -> 401", async () => {
    assert.equal((await call("GET", INST, { token: signAdminToken({ id: INACTIVE_ID }) })).status, 401);
    assert.equal((await call("GET", INST, { token: signAdminToken({ id: MISSING }) })).status, 401);
  });
  await test("tidak ada data yang berubah akibat request tanpa autentikasi", async () => {
    assert.equal((db[T_INST] || []).length + (db[T_PROG] || []).length, 0);
    assert.equal(objectCount(), 0);
  });

  // ===================================================================
  console.log("\n2. CRUD akreditasi institusi");
  reset();
  let instId;
  await test("POST membuat data (201), default draft, nama & lembaga default", async () => {
    const r = await call("POST", INST, { body: validInst() });
    assert.equal(r.status, 201);
    const a = r.json.data.accreditation;
    instId = a.id;
    assert.equal(a.status, "draft");
    assert.equal(a.publishedAt, null);
    assert.equal(a.institutionName, "Universitas LIA");
    assert.equal(a.issuingBody, "BAN-PT");
    assert.equal(a.document, null);
    assert.equal(row(T_INST, a.id).created_by, ADMIN_ID);
    assert.equal(r.json.success, true);
  });
  await test("respons tidak membocorkan path storage / kolom internal", async () => {
    const r = await call("GET", `${INST}/${instId}`);
    for (const k of ["document_path", "documentPath", "created_by", "createdBy"]) assert.ok(!(k in r.json.data.accreditation), k);
  });
  await test("GET daftar: pagination & isi", async () => {
    const r = await call("GET", INST);
    assert.equal(r.status, 200);
    assert.equal(r.json.data.items.length, 1);
    assert.deepEqual(r.json.data.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });
  });
  await test("GET detail", async () => {
    const r = await call("GET", `${INST}/${instId}`);
    assert.equal(r.json.data.accreditation.skNumber, "SK-001/BAN-PT/2024");
  });
  await test("PATCH memperbarui sebagian, publish mengisi publishedAt", async () => {
    const r = await call("PATCH", `${INST}/${instId}`, { body: { rank: "Terakreditasi Unggul", status: "published" } });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.accreditation.rank, "Terakreditasi Unggul");
    assert.ok(r.json.data.accreditation.publishedAt);
  });
  await test("PATCH mengosongkan tanggal dengan null", async () => {
    const r = await call("PATCH", `${INST}/${instId}`, { body: { decisionDate: null } });
    assert.equal(r.json.data.accreditation.decisionDate, null);
  });
  await test("peringkat tidak dibatasi satu format (A, Unggul, Baik Sekali, Unggul (A))", async () => {
    for (const [i, rank] of ["A", "Baik Sekali", "Unggul (A)", "Terakreditasi"].entries()) {
      const r = await call("POST", INST, { body: validInst({ rank, skNumber: `SK-R-${i}` }) });
      assert.equal(r.status, 201, rank);
      assert.equal(r.json.data.accreditation.rank, rank);
    }
  });
  await test("HTML pada teks dibersihkan", async () => {
    const r = await call("POST", INST, { body: validInst({ rank: "<b>Unggul</b><script>alert(1)</script>", skNumber: "SK-XSS" }) });
    assert.equal(r.status, 201);
    assert.ok(!/[<>]/.test(r.json.data.accreditation.rank));
  });
  await test("nomor SK duplikat -> 409 ACCREDITATION_DUPLICATE", async () => {
    const r = await call("POST", INST, { body: validInst({ skNumber: " sk-001/ban-pt/2024 " }) });
    assert.equal(r.status, 409); assert.equal(r.json.code, "ACCREDITATION_DUPLICATE");
  });
  await test("PATCH ke nomor SK yang sudah ada -> 409", async () => {
    const r = await call("PATCH", `${INST}/${instId}`, { body: { skNumber: "SK-R-0" } });
    assert.equal(r.status, 409);
  });
  await test("filter status & pencarian pada daftar admin", async () => {
    const pub = await call("GET", `${INST}?status=published`);
    assert.equal(pub.json.data.pagination.total, 1);
    const s = await call("GET", `${INST}?search=SK-R-2`);
    assert.equal(s.json.data.pagination.total, 1);
  });
  await test("halaman di luar jangkauan -> items kosong, total tetap benar", async () => {
    const r = await call("GET", `${INST}?page=99`);
    assert.equal(r.status, 200); assert.deepEqual(r.json.data.items, []); assert.equal(r.json.data.pagination.total, 6);
  });
  await test("DELETE menghapus data; setelahnya 404", async () => {
    const r = await call("DELETE", `${INST}/${instId}`);
    assert.equal(r.status, 200); assert.equal(r.json.success, true);
    assert.equal((await call("GET", `${INST}/${instId}`)).status, 404);
    assert.equal((await call("DELETE", `${INST}/${instId}`)).status, 404);
  });

  // ===================================================================
  console.log("\n3. CRUD akreditasi program studi");
  reset();
  let progId;
  await test("POST membuat prodi (201), faculty opsional", async () => {
    const r = await call("POST", PROG, { body: validProg() });
    assert.equal(r.status, 201);
    const a = r.json.data.accreditation;
    progId = a.id;
    assert.equal(a.programName, "Teknologi Informasi");
    assert.equal(a.educationLevel, "S1");
    assert.equal(a.faculty, "Fakultas Teknologi");
    assert.equal(a.status, "draft");
    const r2 = await call("POST", PROG, { body: validProg({ programName: "Manajemen", faculty: undefined, skNumber: "SK-P-002" }) });
    assert.equal(r2.status, 201); assert.equal(r2.json.data.accreditation.faculty, null);
  });
  await test("SK yang sama boleh dipakai prodi berbeda; prodi+jenjang+SK sama ditolak", async () => {
    const ok = await call("POST", PROG, { body: validProg({ programName: "Sistem Informasi" }) });
    assert.equal(ok.status, 201);
    const dup = await call("POST", PROG, { body: validProg() });
    assert.equal(dup.status, 409);
  });
  await test("GET daftar, filter level, pencarian", async () => {
    await call("POST", PROG, { body: validProg({ programName: "Magister Manajemen", educationLevel: "S2", skNumber: "SK-P-9" }) });
    const all = await call("GET", PROG);
    assert.equal(all.json.data.pagination.total, 4);
    const s2 = await call("GET", `${PROG}?level=S2`);
    assert.equal(s2.json.data.pagination.total, 1);
    const q = await call("GET", `${PROG}?search=manajemen`);
    assert.equal(q.json.data.pagination.total, 2);
  });
  await test("PATCH & GET detail", async () => {
    const r = await call("PATCH", `${PROG}/${progId}`, { body: { rank: "Unggul", faculty: null } });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.accreditation.rank, "Unggul");
    assert.equal(r.json.data.accreditation.faculty, null);
    assert.equal((await call("GET", `${PROG}/${progId}`)).status, 200);
  });
  await test("institusi & prodi tersimpan di tabel terpisah (tidak tercampur)", async () => {
    await call("POST", INST, { body: validInst() });
    assert.equal(db[T_INST].length, 1);
    assert.equal(db[T_PROG].length, 4);
    assert.equal((await call("GET", `${INST}/${progId}`)).status, 404);
    assert.equal((await call("GET", `${PROG}/${db[T_INST][0].id}`)).status, 404);
  });
  await test("DELETE prodi", async () => {
    assert.equal((await call("DELETE", `${PROG}/${progId}`)).status, 200);
    assert.equal((await call("GET", `${PROG}/${progId}`)).status, 404);
  });

  // ===================================================================
  console.log("\n4. Validasi data");
  reset();
  const expect400 = async (name, method, url, body, field) => test(name, async () => {
    const r = await call(method, url, { body });
    assert.equal(r.status, 400, JSON.stringify(r.json));
    assert.equal(r.json.code, "VALIDATION_ERROR");
    if (field) assert.ok(r.json.errors.some((e) => e.field === field), JSON.stringify(r.json.errors));
  });
  await expect400("nomor SK kosong ditolak", "POST", INST, validInst({ skNumber: "   " }), "skNumber");
  await expect400("nomor SK tidak dikirim ditolak", "POST", INST, { rank: "A" }, "skNumber");
  await expect400("peringkat kosong ditolak", "POST", INST, validInst({ rank: "" }), "rank");
  await expect400("peringkat tidak dikirim ditolak", "POST", INST, { skNumber: "X" }, "rank");
  await expect400("tanggal format salah ditolak", "POST", INST, validInst({ validFrom: "01-03-2024" }), "validFrom");
  await expect400("tanggal tidak ada di kalender (2026-02-30) ditolak", "POST", INST, validInst({ decisionDate: "2026-02-30" }), "decisionDate");
  await expect400("tanggal bukan string ditolak", "POST", INST, validInst({ validUntil: 20290101 }), "validUntil");
  await expect400("tanggal akhir < tanggal mulai ditolak", "POST", INST, validInst({ validFrom: "2024-05-01", validUntil: "2024-04-30" }), "validUntil");
  await test("tanggal akhir = tanggal mulai diterima", async () => {
    assert.equal((await call("POST", INST, { body: validInst({ skNumber: "EQ", validFrom: "2024-05-01", validUntil: "2024-05-01" }) })).status, 201);
  });
  await expect400("status selain draft/published ditolak", "POST", INST, validInst({ status: "archived" }), "status");
  await expect400("field internal (documentPath/createdBy/publishedAt/id) ditolak", "POST", INST, validInst({ documentPath: "x/y.pdf", createdBy: MISSING, publishedAt: "2020-01-01", id: MISSING }));
  await expect400("peringkat terlalu panjang ditolak", "POST", INST, validInst({ rank: "A".repeat(101) }), "rank");
  await expect400("prodi: nama program studi wajib", "POST", PROG, validProg({ programName: "" }), "programName");
  await expect400("prodi: nama program studi tidak dikirim", "POST", PROG, { educationLevel: "S1", rank: "A", skNumber: "1" }, "programName");
  await expect400("prodi: jenjang wajib", "POST", PROG, validProg({ educationLevel: " " }), "educationLevel");
  await expect400("prodi: nomor SK wajib", "POST", PROG, validProg({ skNumber: "" }), "skNumber");
  await expect400("prodi: peringkat wajib", "POST", PROG, validProg({ rank: "" }), "rank");
  await expect400("prodi: tanggal akhir < mulai", "POST", PROG, validProg({ validFrom: "2025-01-02", validUntil: "2025-01-01" }), "validUntil");
  await test("JSON rusak -> 400 INVALID_JSON", async () => {
    const r = await call("POST", INST, { body: "{bad json" });
    assert.equal(r.status, 400); assert.equal(r.json.code, "INVALID_JSON");
  });
  await test("PATCH body kosong -> 400", async () => {
    const c = await call("POST", INST, { body: validInst({ skNumber: "P1" }) });
    assert.equal((await call("PATCH", `${INST}/${c.json.data.accreditation.id}`, { body: {} })).status, 400);
  });
  await test("PATCH yang membuat urutan tanggal salah terhadap data tersimpan -> 400", async () => {
    const c = await call("POST", INST, { body: validInst({ skNumber: "P2", validFrom: "2024-01-01", validUntil: "2025-01-01" }) });
    const id = c.json.data.accreditation.id;
    const r = await call("PATCH", `${INST}/${id}`, { body: { validUntil: "2023-12-31" } });
    assert.equal(r.status, 400);
    const r2 = await call("PATCH", `${INST}/${id}`, { body: { validFrom: "2026-01-01" } });
    assert.equal(r2.status, 400);
    assert.equal(row(T_INST, id).valid_until, "2025-01-01");
  });
  await test("ID bukan UUID -> 400; query tidak valid -> 400", async () => {
    assert.equal((await call("GET", `${INST}/abc`)).status, 400);
    assert.equal((await call("GET", `${INST}?limit=1000`)).status, 400);
    assert.equal((await call("GET", `${INST}?status=zzz`)).status, 400);
    assert.equal((await call("GET", `${PUB_INST}/abc`, { token: null })).status, 400);
  });
  await test("data tidak ditemukan -> 404 dengan kode spesifik", async () => {
    const r = await call("GET", `${INST}/${MISSING}`);
    assert.equal(r.status, 404); assert.equal(r.json.code, "ACCREDITATION_INSTITUTION_NOT_FOUND");
    const p = await call("PATCH", `${PROG}/${MISSING}`, { body: { rank: "A" } });
    assert.equal(p.status, 404); assert.equal(p.json.code, "ACCREDITATION_STUDY_PROGRAM_NOT_FOUND");
  });

  // ===================================================================
  console.log("\n5. Upload, penggantian, dan penghapusan dokumen");
  await startServer(); // pembatas upload (20/15 menit) dimulai dari nol
  reset();
  const inst = (await call("POST", INST, { body: validInst() })).json.data.accreditation;
  const dPath = () => row(T_INST, inst.id).document_path;
  let firstPath;
  await test("upload PDF -> 200, metadata tersimpan, file ada di bucket privat, URL signed", async () => {
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pdfBytes(), "SK Institusi.pdf", "application/pdf") });
    assert.equal(r.status, 200, r.text);
    const d = r.json.data.accreditation.document;
    assert.equal(d.mimeType, "application/pdf");
    assert.equal(d.name, "SK Institusi.pdf");
    assert.ok(d.size > 0);
    assert.match(d.url, /\/object\/sign\/accreditation-documents\/institutions\//);
    assert.ok(d.urlExpiresAt);
    firstPath = dPath();
    assert.match(firstPath, new RegExp(`^institutions/${inst.id}/[0-9a-f-]{36}\\.pdf$`));
    assert.ok(hasObject(firstPath));
    assert.ok(!r.text.includes(firstPath) || r.text.includes("sign/")); // path mentah tidak ada sebagai field
    assert.ok(!("document_path" in r.json.data.accreditation));
  });
  await test("nama file pengguna tidak dipakai sebagai path (path traversal)", async () => {
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pdfBytes("a"), "../../etc/passwd.pdf", "application/pdf") });
    assert.equal(r.status, 200);
    assert.ok(!dPath().includes("passwd") && !dPath().includes(".."));
    assert.equal(r.json.data.accreditation.document.name, "passwd.pdf");
    firstPath = dPath();
  });
  await test("ganti dokumen: file baru dipakai, file lama dihapus dari bucket", async () => {
    const old = dPath();
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pngBytes(), "scan.png", "image/png") });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.accreditation.document.mimeType, "image/png");
    assert.notEqual(dPath(), old);
    assert.ok(hasObject(dPath()));
    assert.ok(!hasObject(old));
    assert.equal(objectCount(), 1);
  });
  await test("JPEG diterima", async () => {
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(jpgBytes(), "foto.jpeg", "image/jpeg") });
    assert.equal(r.status, 200); assert.match(dPath(), /\.jpg$/);
    assert.equal(objectCount(), 1);
  });
  const before = () => ({ p: dPath(), n: objectCount() });
  const rejects = async (name, form, status, code) => test(name, async () => {
    const b = before();
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form });
    assert.equal(r.status, status, r.text);
    if (code) assert.equal(r.json.code, code);
    assert.deepEqual(before(), b, "dokumen/DB tidak boleh berubah");
  });
  await rejects("ekstensi .exe ditolak (415)", makeForm(pdfBytes(), "virus.exe", "application/pdf"), 415, "UNSUPPORTED_FILE_TYPE");
  await rejects("MIME text/html ditolak (415)", makeForm(Buffer.from("<html>"), "a.pdf", "text/html"), 415);
  await rejects("MIME dan ekstensi tidak cocok ditolak (415)", makeForm(pdfBytes(), "a.png", "application/pdf"), 415);
  await rejects("isi bukan PDF walau bernama .pdf ditolak (400)", makeForm(Buffer.from("ini hanya teks biasa"), "palsu.pdf", "application/pdf"), 400, "INVALID_DOCUMENT");
  await rejects("PNG disamarkan sebagai PDF ditolak (400)", makeForm(pngBytes(), "x.pdf", "application/pdf"), 400, "INVALID_DOCUMENT");
  await rejects("file kosong ditolak (400)", makeForm(Buffer.alloc(0), "kosong.pdf", "application/pdf"), 400);
  await rejects("ukuran > 10 MB ditolak (413)", makeForm(Buffer.concat([pdfBytes(), Buffer.alloc(10 * 1024 * 1024)]), "besar.pdf", "application/pdf"), 413, "FILE_TOO_LARGE");
  await rejects("nama field bukan 'document' ditolak (400)", makeForm(pdfBytes(), "a.pdf", "application/pdf", "file"), 400);
  await test("tanpa file -> 400 FILE_REQUIRED", async () => {
    const r = await call("PUT", `${INST}/${inst.id}/document`, { body: {} });
    assert.equal(r.status, 400); assert.equal(r.json.code, "FILE_REQUIRED");
  });
  await test("upload ke data yang tidak ada -> 404 (file tidak diproses)", async () => {
    const n = objectCount();
    const r = await call("PUT", `${INST}/${MISSING}/document`, { form: makeForm(pdfBytes(), "a.pdf", "application/pdf") });
    assert.equal(r.status, 404); assert.equal(objectCount(), n);
  });
  await test("Storage gagal saat upload -> 502, dokumen lama tetap utuh", async () => {
    const b = before(); storage.failUpload = true;
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pdfBytes("z"), "baru.pdf", "application/pdf") });
    storage.failUpload = false;
    assert.equal(r.status, 502); assert.equal(r.json.code, "STORAGE_ERROR");
    assert.deepEqual(before(), b); assert.ok(hasObject(dPath()));
  });
  await test("DB gagal saat simpan dokumen -> 500, file baru dibersihkan, lama tetap utuh", async () => {
    const b = before();
    faults.push({ table: T_INST, op: "update", error: { message: "boom", code: "XX000" } });
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pdfBytes("y"), "baru.pdf", "application/pdf") });
    assert.equal(r.status, 500); assert.equal(r.json.code, "DATABASE_ERROR");
    assert.deepEqual(before(), b); assert.ok(hasObject(dPath()));
  });
  await test("perubahan bersamaan (CAS gagal) -> 409, file baru dibersihkan, tidak ada kehilangan referensi", async () => {
    const original = dPath();
    const countBefore = objectCount();
    hooks.beforeUpdate = () => { row(T_INST, inst.id).document_path = "institutions/other/changed.pdf"; };
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pdfBytes("x"), "baru.pdf", "application/pdf") });
    assert.equal(r.status, 409); assert.equal(r.json.code, "DOCUMENT_CONFLICT");
    assert.equal(objectCount(), countBefore, "file baru harus dibersihkan");
    assert.ok(hasObject(original), "file milik pihak lain/lama tidak boleh ikut terhapus");
    row(T_INST, inst.id).document_path = original; // pulihkan simulasi
  });
  await test("hapus file lama gagal -> tetap 200, dicatat [ORPHAN], DB menunjuk file baru", async () => {
    const old = dPath(); storage.failRemove = true;
    const r = await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pdfBytes("n2"), "n2.pdf", "application/pdf") });
    storage.failRemove = false;
    assert.equal(r.status, 200);
    assert.notEqual(dPath(), old); assert.ok(hasObject(dPath()));
    assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(old)));
  });
  await test("signed URL gagal dibuat -> data tetap tampil, document.url = null", async () => {
    storage.failSign = true;
    const r = await call("GET", `${INST}/${inst.id}`);
    storage.failSign = false;
    assert.equal(r.status, 200); assert.equal(r.json.data.accreditation.document.url, null);
  });
  await test("DELETE dokumen -> file terhapus, kolom dikosongkan, data tetap ada", async () => {
    const p = dPath();
    const r = await call("DELETE", `${INST}/${inst.id}/document`);
    assert.equal(r.status, 200); assert.equal(r.json.data.accreditation.document, null);
    assert.equal(dPath(), null); assert.ok(!hasObject(p));
    assert.ok(row(T_INST, inst.id));
  });
  await test("DELETE dokumen saat tidak ada dokumen -> 404 DOCUMENT_NOT_FOUND", async () => {
    const r = await call("DELETE", `${INST}/${inst.id}/document`);
    assert.equal(r.status, 404); assert.equal(r.json.code, "DOCUMENT_NOT_FOUND");
  });
  await startServer(); // pembatas upload dimulai dari nol lagi
  await test("DB gagal saat hapus dokumen -> 500, file tidak dihapus", async () => {
    await call("PUT", `${INST}/${inst.id}/document`, { form: makeForm(pdfBytes("k"), "k.pdf", "application/pdf") });
    const p = dPath();
    faults.push({ table: T_INST, op: "update", error: { message: "boom", code: "XX000" } });
    const r = await call("DELETE", `${INST}/${inst.id}/document`);
    assert.equal(r.status, 500); assert.ok(hasObject(p)); assert.equal(dPath(), p);
  });
  await test("hapus data -> file dokumennya ikut dihapus dari bucket", async () => {
    const p = dPath();
    const r = await call("DELETE", `${INST}/${inst.id}`);
    assert.equal(r.status, 200); assert.ok(!hasObject(p));
  });
  await test("hapus data, Storage gagal -> data tetap terhapus (200), file dicatat [ORPHAN]", async () => {
    const c = (await call("POST", INST, { body: validInst({ skNumber: "ORPH" }) })).json.data.accreditation;
    await call("PUT", `${INST}/${c.id}/document`, { form: makeForm(pdfBytes("o"), "o.pdf", "application/pdf") });
    const p = row(T_INST, c.id).document_path;
    storage.failRemove = true;
    const r = await call("DELETE", `${INST}/${c.id}`);
    storage.failRemove = false;
    assert.equal(r.status, 200); assert.equal(row(T_INST, c.id), undefined);
    assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(p)));
  });
  await test("hapus data, DB gagal -> 500, file TIDAK dihapus", async () => {
    storage.objects.clear();
    const c = (await call("POST", INST, { body: validInst({ skNumber: "KEEP" }) })).json.data.accreditation;
    await call("PUT", `${INST}/${c.id}/document`, { form: makeForm(pdfBytes("kp"), "kp.pdf", "application/pdf") });
    const p = row(T_INST, c.id).document_path;
    faults.push({ table: T_INST, op: "delete", error: { message: "boom", code: "XX000" } });
    const r = await call("DELETE", `${INST}/${c.id}`);
    assert.equal(r.status, 500); assert.ok(hasObject(p)); assert.ok(row(T_INST, c.id));
  });
  await test("dokumen program studi disimpan di Google Drive (bukan Supabase Storage); institusi tetap Supabase", async () => {
    const supabaseBefore = storage.objects.size;
    const p = (await call("POST", PROG, { body: validProg() })).json.data.accreditation;
    const r = await call("PUT", `${PROG}/${p.id}/document`, { form: makeForm(pdfBytes("pp"), "prodi.pdf", "application/pdf") });
    assert.equal(r.status, 200);
    const stored = row(T_PROG, p.id);
    assert.match(stored.document_drive_file_id, /^drv_/);
    assert.equal(stored.document_path, null);
    assert.equal(storage.objects.size, supabaseBefore, "tidak ada objek baru di Supabase Storage");
    assert.equal(fd.live().length, 1);
    assert.match(r.json.data.accreditation.document.url, /^\/api\/files\//);
    assert.equal((await call("DELETE", `${PROG}/${p.id}/document`)).status, 200);
    assert.equal(fd.live().length, 0, "file Drive dibersihkan saat dokumen dihapus");
  });

  // ===================================================================
  console.log("\n6. Public API: hanya data published");
  await startServer();
  reset();
  const pubI = (await call("POST", INST, { body: validInst({ skNumber: "PUB-1", status: "published" }) })).json.data.accreditation;
  const draftI = (await call("POST", INST, { body: validInst({ skNumber: "DRAFT-1" }) })).json.data.accreditation;
  const pubP = (await call("POST", PROG, { body: validProg({ skNumber: "PUB-P1", status: "published" }) })).json.data.accreditation;
  const draftP = (await call("POST", PROG, { body: validProg({ programName: "Draft Prodi", skNumber: "DRAFT-P1" }) })).json.data.accreditation;
  await call("PUT", `${INST}/${pubI.id}/document`, { form: makeForm(pdfBytes("a"), "pub.pdf", "application/pdf") });
  await call("PUT", `${INST}/${draftI.id}/document`, { form: makeForm(pdfBytes("b"), "draft.pdf", "application/pdf") });
  await call("PUT", `${PROG}/${draftP.id}/document`, { form: makeForm(pdfBytes("c"), "draftp.pdf", "application/pdf") });

  await test("publik bisa diakses tanpa token; daftar institusi hanya published", async () => {
    const r = await call("GET", PUB_INST, { token: null });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.data.items.map((i) => i.id), [pubI.id]);
    assert.equal(r.json.data.pagination.total, 1);
  });
  await test("daftar prodi publik hanya published", async () => {
    const r = await call("GET", PUB_PROG, { token: null });
    assert.deepEqual(r.json.data.items.map((i) => i.id), [pubP.id]);
  });
  await test("detail published OK; detail draft -> 404 (institusi & prodi)", async () => {
    assert.equal((await call("GET", `${PUB_INST}/${pubI.id}`, { token: null })).status, 200);
    assert.equal((await call("GET", `${PUB_INST}/${draftI.id}`, { token: null })).status, 404);
    assert.equal((await call("GET", `${PUB_PROG}/${pubP.id}`, { token: null })).status, 200);
    assert.equal((await call("GET", `${PUB_PROG}/${draftP.id}`, { token: null })).status, 404);
  });
  await test("dokumen published punya signed URL; dokumen draft tidak pernah muncul di publik", async () => {
    const d = await call("GET", `${PUB_INST}/${pubI.id}`, { token: null });
    assert.match(d.json.data.accreditation.document.url, /sign/);
    const all = await call("GET", PUB_INST, { token: null });
    assert.ok(!all.text.includes("draft.pdf") && !all.text.includes(row(T_INST, draftI.id).document_path));
    const allP = await call("GET", PUB_PROG, { token: null });
    assert.ok(!allP.text.includes("draftp.pdf"));
  });
  await test("respons publik tidak memuat status/createdAt/updatedAt/path internal", async () => {
    const r = await call("GET", `${PUB_INST}/${pubI.id}`, { token: null });
    const a = r.json.data.accreditation;
    for (const k of ["status", "createdAt", "updatedAt", "document_path", "documentPath", "created_by"]) assert.ok(!(k in a), k);
    // Path storage hanya boleh muncul di dalam signed URL (tepat satu kali), bukan sebagai field sendiri
    const rawPath = row(T_INST, pubI.id).document_path;
    assert.equal(r.text.split(rawPath).length - 1, 1);
    assert.ok(a.document.url.includes(rawPath) && a.document.url.includes("token="));
  });
  await test("filter status/draft lewat query publik diabaikan (tidak bisa membuka draft)", async () => {
    const r = await call("GET", `${PUB_INST}?status=draft`, { token: null });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.data.items.map((i) => i.id), [pubI.id]);
  });
  await test("unpublish (draft) -> hilang dari publik; publish lagi -> muncul", async () => {
    await call("PATCH", `${INST}/${pubI.id}`, { body: { status: "draft" } });
    assert.equal((await call("GET", `${PUB_INST}/${pubI.id}`, { token: null })).status, 404);
    assert.equal((await call("GET", PUB_INST, { token: null })).json.data.items.length, 0);
    await call("PATCH", `${INST}/${pubI.id}`, { body: { status: "published" } });
    assert.equal((await call("GET", `${PUB_INST}/${pubI.id}`, { token: null })).status, 200);
  });
  await test("published_at di masa depan tidak tampil di publik", async () => {
    row(T_INST, pubI.id).published_at = new Date(Date.now() + 86400000).toISOString();
    assert.equal((await call("GET", `${PUB_INST}/${pubI.id}`, { token: null })).status, 404);
    row(T_INST, pubI.id).published_at = new Date(Date.now() - 1000).toISOString();
  });
  await test("filter level & pencarian publik prodi", async () => {
    const lv = await call("GET", `${PUB_PROG}?level=S1`, { token: null });
    assert.equal(lv.json.data.items.length, 1);
    assert.equal((await call("GET", `${PUB_PROG}?level=S3`, { token: null })).json.data.items.length, 0);
    assert.equal((await call("GET", `${PUB_PROG}?search=informasi`, { token: null })).json.data.items.length, 1);
  });
  await test("publik tidak bisa menulis: POST/PATCH/PUT/DELETE -> 404 dan data tidak berubah", async () => {
    const snapshot = JSON.stringify(db[T_INST]);
    for (const [m, u] of [["POST", PUB_INST], ["PATCH", `${PUB_INST}/${pubI.id}`], ["PUT", `${PUB_INST}/${pubI.id}`], ["DELETE", `${PUB_INST}/${pubI.id}`], ["POST", PUB_PROG], ["DELETE", `${PUB_PROG}/${pubP.id}`]]) {
      const r = await call(m, u, { token: null, body: { rank: "A" } });
      assert.equal(r.status, 404, `${m} ${u}`);
    }
    assert.equal(JSON.stringify(db[T_INST]), snapshot);
  });
  await test("data publik tidak ditemukan -> 404", async () => {
    const r = await call("GET", `${PUB_INST}/${MISSING}`, { token: null });
    assert.equal(r.status, 404); assert.equal(r.json.code, "ACCREDITATION_INSTITUTION_NOT_FOUND");
  });

  console.log("\n6b. Pembatas upload dokumen");
  await startServer();
  reset();
  await test("upload ke-21 dalam 15 menit -> 429 TOO_MANY_DOCUMENT_UPLOADS", async () => {
    const c = (await call("POST", INST, { body: validInst() })).json.data.accreditation;
    let last;
    for (let i = 0; i < 21; i += 1) last = await call("PUT", `${INST}/${c.id}/document`, { form: makeForm(pdfBytes(String(i)), "a.pdf", "application/pdf") });
    assert.equal(last.status, 429); assert.equal(last.json.code, "TOO_MANY_DOCUMENT_UPLOADS");
  });

  // ===================================================================
  console.log("\n7. Error database");
  await startServer();
  reset();
  await test("admin list: DB error -> 500 DATABASE_ERROR, pesan generik (tanpa detail internal)", async () => {
    faults.push({ table: T_INST, op: "select", error: { message: "secret relation detail", code: "42P01" } });
    const r = await call("GET", INST);
    assert.equal(r.status, 500); assert.equal(r.json.code, "DATABASE_ERROR");
    assert.ok(!r.text.includes("secret relation detail"));
  });
  await test("admin create / update / delete: DB error -> 500", async () => {
    faults.push({ table: T_PROG, op: "insert", error: { message: "x", code: "XX000" } });
    assert.equal((await call("POST", PROG, { body: validProg() })).status, 500);
    const c = (await call("POST", PROG, { body: validProg() })).json.data.accreditation;
    faults.push({ table: T_PROG, op: "update", error: { message: "x", code: "XX000" } });
    assert.equal((await call("PATCH", `${PROG}/${c.id}`, { body: { rank: "A" } })).status, 500);
    faults.push({ table: T_PROG, op: "delete", error: { message: "x", code: "XX000" } });
    assert.equal((await call("DELETE", `${PROG}/${c.id}`)).status, 500);
  });
  await test("publik: DB error -> 500 DATABASE_ERROR (daftar & detail)", async () => {
    faults.push({ table: T_PROG, op: "select", error: { message: "x", code: "XX000" } });
    assert.equal((await call("GET", PUB_PROG, { token: null })).status, 500);
    faults.push({ table: T_INST, op: "select", error: { message: "x", code: "XX000" } });
    assert.equal((await call("GET", `${PUB_INST}/${MISSING}`, { token: null })).status, 500);
  });
  await test("database CHECK constraint (23514) dipetakan ke 400, bukan 500", async () => {
    faults.push({ table: T_INST, op: "insert", error: { message: "check", code: "23514" } });
    assert.equal((await call("POST", INST, { body: validInst() })).status, 400);
  });

  // ===================================================================
  console.log("\n8. Endpoint lama tetap terpasang");
  reset();
  await test("GET / dan route lama masih merespons seperti sebelumnya", async () => {
    assert.equal((await call("GET", "/", { token: null })).status, 200);
    assert.equal((await call("GET", "/api/admin/news", { token: null })).status, 401);
    assert.equal((await call("GET", "/api/admin/announcements", { token: null })).status, 401);
    assert.equal((await call("GET", "/api/admin/translations/news/" + MISSING, { token: null })).status, 401);
    assert.equal((await call("PUT", `/api/admin/news/${MISSING}/cover`, { token: null })).status, 401);
    assert.equal((await call("GET", "/api/announcements", { token: null })).status, 200);
    assert.equal((await call("GET", "/api/news", { token: null })).status, 200);
    assert.equal((await call("GET", "/api/tidak-ada", { token: null })).status, 404);
  });

  console.log(`\n(${requestCount} request HTTP dikirim; batas umum server 300/15 menit)`);
  await new Promise((r) => server.close(r));
  console.error = origError;
  console.log(`\nSelesai: ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})();
