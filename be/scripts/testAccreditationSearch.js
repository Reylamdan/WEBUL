// Pengujian OFFLINE fitur PENCARIAN Akreditasi Program Studi.
// Supabase diganti versi palsu di memori (tidak ada data asli yang tersentuh). Request dikirim
// lewat HTTP sungguhan ke app Express, jadi validator Zod, controller, dan service ikut teruji.
//
//   node scripts/testAccreditationSearch.js
//
// Tidak dicakup (butuh Supabase asli): perilaku operator PostgREST/Postgres yang sebenarnya.
// Fake di sini meniru semantik LIKE (termasuk escape backslash) dan perbandingan tanggal/NULL.

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";
delete process.env.ACCREDITATION_TIMEZONE;

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");

// ---------- Supabase palsu ----------
const db = {};
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING = "123e4567-e89b-42d3-a456-426614174000";

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
const present = (v) => v !== null && v !== undefined;

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
  constructor(table) { this.table = table; this.op = "select"; this.filters = []; this.orders = []; this.payload = null; this.mode = "many"; this.opts = {}; this.rangeArgs = null; }
  select(cols, opts) { this.opts = opts || {}; return this; }
  insert(p) { this.op = "insert"; this.payload = p; return this; }
  update(p) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  gt(c, v) { this.filters.push((r) => present(r[c]) && r[c] > v); return this; }
  gte(c, v) { this.filters.push((r) => present(r[c]) && r[c] >= v); return this; }
  lt(c, v) { this.filters.push((r) => present(r[c]) && r[c] < v); return this; }
  lte(c, v) { this.filters.push((r) => present(r[c]) && r[c] <= v); return this; }
  ilike(c, pattern) { const re = likeToRegExp(String(pattern)); this.filters.push((r) => present(r[c]) && re.test(String(r[c]))); return this; }
  or(expr) {
    const parts = expr.split(",").map((p) => { const m = /^([a-z_]+)\.ilike\.%(.*)%$/.exec(p); return { col: m[1], term: m[2].toLowerCase() }; });
    this.filters.push((r) => parts.some((p) => String(r[p.col] ?? "").toLowerCase().includes(p.term)));
    return this;
  }
  order(col, o) { this.orders.push({ col, asc: !o || o.ascending !== false }); return this; }
  range(a, b) { this.rangeArgs = [a, b]; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  run() {
    db[this.table] = db[this.table] || [];
    const rows = db[this.table];
    const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
    let result; let count;
    if (this.op === "insert") {
      const now = new Date().toISOString();
      const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...this.payload };
      for (const k of ["decision_date", "valid_from", "valid_until", "document_path", "document_name", "document_mime", "document_size", "faculty", "published_at"]) if (row[k] === undefined) row[k] = null;
      rows.push(row); result = [row];
    } else if (this.op === "update") {
      result = match(); for (const r of result) Object.assign(r, this.payload);
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
    const out = result.map((r) => ({ ...r }));
    if (this.mode === "many") return { data: out, count, error: null };
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return out[0] ? { data: out[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
  }
  then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
}
const fakeStorage = {
  from: (bucket) => ({
    upload: async (p) => ({ data: { path: p }, error: null }),
    remove: async () => ({ data: [], error: null }),
    createSignedUrl: async (p, ttl) => ({ data: { signedUrl: `https://fake-project.supabase.co/storage/v1/object/sign/${bucket}/${p}?token=t&ttl=${ttl}` }, error: null }),
  }),
  listBuckets: async () => ({ data: [], error: null }),
};
const supabasePath = require.resolve(path.join(__dirname, "../src/config/supabase.js"));
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: { from: (t) => new FakeQuery(t), storage: fakeStorage } };

const origError = console.error;
console.error = () => {};

const expiry = require("../src/utils/accreditationExpiry");
const { escapeLikeTerm } = require("../src/utils/searchTerm");

let passed = 0, failed = 0, requestCount = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n")[0]}`); }
};

let base; let adminToken;
const call = async (method, url, { body, token = adminToken } = {}) => {
  requestCount += 1;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(`${base}${url}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* bukan JSON */ }
  return { status: res.status, json, text };
};
const q = (params) => "?" + new URLSearchParams(params).toString();

const ADMIN_PROG = "/api/admin/accreditation/study-programs";
const PUB_PROG = "/api/accreditation/study-programs";
const ADMIN_INST = "/api/admin/accreditation/institutions";
const PUB_INST = "/api/accreditation/institutions";
const T_PROG = "accreditation_study_programs";
const T_INST = "accreditation_institutions";

// ---------- data uji (tanggal kedaluwarsa dihitung relatif terhadap "hari ini" WIB) ----------
const today = expiry.getToday();
const plus = (n) => expiry.addDays(today, n);
const PAST = new Date(Date.now() - 86400000).toISOString();
const FUTURE = new Date(Date.now() + 86400000 * 30).toISOString();

const mk = (key, o) => ({
  id: crypto.randomUUID(), key, faculty: null, issuing_body: "BAN-PT", valid_from: "2020-01-01",
  document_path: null, document_name: null, document_mime: null, document_size: null,
  status: "published", published_at: PAST, created_by: ADMIN_ID, created_at: PAST, updated_at: PAST, ...o,
});
const SEED = () => [
  mk("P1", { program_name: "Teknologi Informasi", education_level: "S1", faculty: "Fakultas Teknologi", rank: "Unggul", sk_number: "123/SK/BAN-PT/2024", decision_date: "2024-05-10", valid_until: plus(200) }),
  mk("P2", { program_name: "Sistem Informasi", education_level: "S1", rank: "Baik Sekali", sk_number: "456/SK/LAM/2023", decision_date: "2023-03-01", valid_until: plus(90) }),
  mk("P3", { program_name: "Manajemen", education_level: "S1", rank: "Baik", sk_number: "789/SK/2022", decision_date: "2022-08-17", valid_until: plus(0) }),
  mk("P4", { program_name: "Akuntansi", education_level: "D3", rank: "B", sk_number: "012/SK/2021", decision_date: "2021-12-31", valid_until: plus(-1) }),
  mk("P5", { program_name: "Magister Manajemen", education_level: "S2", rank: "Unggul", sk_number: "SK-UNKNOWN-1", decision_date: null, valid_until: null }),
  mk("P6", { program_name: "Sastra Inggris", education_level: "S1", rank: "Baik Sekali", sk_number: "SK-6/2025", decision_date: "2025-01-01", valid_until: plus(91) }),
  mk("P7", { program_name: "Hukum", education_level: "S1", rank: "Peringkat Khusus X", sk_number: "SK-7/2020", decision_date: "2020-12-31", valid_until: plus(-400) }),
  mk("P8", { program_name: "Prodi 100% Baru", education_level: "Profesi", rank: "C", sk_number: "SK_8/2025", decision_date: "2025-12-31", valid_until: plus(30) }),
  mk("D1", { program_name: "Draft Prodi Rahasia", education_level: "S1", rank: "Unggul", sk_number: "DRAFT/1", decision_date: "2024-06-01", valid_until: plus(10), status: "draft", published_at: null, document_path: "study-programs/secret/draft.pdf", document_name: "draft.pdf", document_mime: "application/pdf", document_size: 10 }),
  mk("F1", { program_name: "Prodi Terjadwal Masa Depan", education_level: "S1", rank: "Unggul", sk_number: "FUT/1", decision_date: "2024-06-01", valid_until: plus(10), published_at: FUTURE }),
];
let rows;
const reset = () => {
  for (const k of Object.keys(db)) delete db[k];
  db.admins = [{ id: ADMIN_ID, name: "Admin Tes", email: "a@x.id", is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z" }];
  db[T_PROG] = SEED();
  db[T_INST] = [];
  rows = Object.fromEntries(db[T_PROG].map((r) => [r.key, r]));
};
const keysOf = (res) => res.json.data.items.map((i) => Object.keys(rows).find((k) => rows[k].id === i.id)).sort();
const ok = async (url, expected, opts) => {
  const r = await call("GET", url, opts);
  assert.equal(r.status, 200, `${url} -> ${r.status} ${r.text.slice(0, 160)}`);
  assert.deepEqual(keysOf(r), [...expected].sort(), url);
  return r;
};
const bad = async (url, opts) => {
  const r = await call("GET", url, opts);
  assert.equal(r.status, 400, `${url} -> ${r.status}`);
  assert.equal(r.json.code, "VALIDATION_ERROR");
  assert.ok(Array.isArray(r.json.errors) && r.json.errors.length > 0);
  return r;
};

const loadFreshApp = () => {
  for (const key of Object.keys(require.cache)) if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath) delete require.cache[key];
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

(async () => {
  let server;
  const startServer = async () => {
    if (server) await new Promise((r) => server.close(r));
    server = loadFreshApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}`;
    adminToken = require("../src/utils/token").signAdminToken({ id: ADMIN_ID });
  };
  await startServer();
  reset();
  const PUBLISHED = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
  const A = (u, e) => ok(`${ADMIN_PROG}${u}`, e);
  const P = (u, e) => ok(`${PUB_PROG}${u}`, e, { token: null });

  // ===================================================================
  console.log("1. Util status kedaluwarsa (tanggal & zona waktu)");
  const at = (iso) => new Date(iso);
  await test("hari ini mengikuti zona Asia/Jakarta, bukan UTC", () => {
    assert.equal(expiry.getToday(at("2026-11-04T16:59:59Z")), "2026-11-04");
    assert.equal(expiry.getToday(at("2026-11-04T17:00:00Z")), "2026-11-05"); // 00:00 WIB
    assert.equal(expiry.getToday(at("2026-12-31T20:00:00Z")), "2027-01-01"); // pergantian tahun
  });
  await test("batas status: kemarin expired, hari ini expiring, +90 expiring, +91 active, null unknown", () => {
    const now = at("2026-11-04T05:00:00Z"); // 12:00 WIB
    const st = (d) => expiry.computeExpiryStatus(d, now);
    assert.equal(st("2026-11-03"), "expired");
    assert.equal(st("2026-11-04"), "expiring");
    assert.equal(st("2027-02-02"), "expiring"); // hari ini + 90
    assert.equal(st("2027-02-03"), "active");   // hari ini + 91
    assert.equal(st(null), "unknown");
    assert.equal(st(undefined), "unknown");
    assert.equal(st(""), "unknown");
  });
  await test("status berganti tepat tengah malam WIB (valid_until = kemarin WIB -> expired)", () => {
    assert.equal(expiry.computeExpiryStatus("2026-11-04", at("2026-11-04T16:59:59Z")), "expiring");
    assert.equal(expiry.computeExpiryStatus("2026-11-04", at("2026-11-04T17:00:00Z")), "expired");
  });
  await test("sisa hari, termasuk lintas tahun kabisat dan nilai negatif", () => {
    const now = at("2028-02-28T05:00:00Z");
    assert.equal(expiry.computeDaysUntilExpiry("2028-03-01", now), 2); // 29 Feb 2028 ada
    assert.equal(expiry.computeDaysUntilExpiry("2028-02-27", now), -1);
    assert.equal(expiry.computeDaysUntilExpiry(null, now), null);
    assert.equal(expiry.addDays("2026-12-31", 1), "2027-01-01");
  });
  await test("ACCREDITATION_TIMEZONE tidak valid -> kembali ke Asia/Jakarta", () => {
    process.env.ACCREDITATION_TIMEZONE = "Bukan/Zona";
    assert.equal(expiry.getToday(at("2026-11-04T17:00:00Z")), "2026-11-05");
    process.env.ACCREDITATION_TIMEZONE = "UTC";
    assert.equal(expiry.getToday(at("2026-11-04T17:00:00Z")), "2026-11-04");
    delete process.env.ACCREDITATION_TIMEZONE;
  });
  await test("escapeLikeTerm: wildcard %, _, \\ di-escape; * dihapus", () => {
    assert.equal(escapeLikeTerm("a%b_c\\d*e"), "a\\%b\\_c\\\\d e");
    assert.equal(escapeLikeTerm("  ***  "), "");
  });

  // ===================================================================
  console.log("\n2. Filter satu per satu (admin)");
  await test("A. nama program studi: sebagian kata, tidak sensitif huruf besar/kecil", async () => {
    await A(q({ programName: "informasi" }), ["P1", "P2"]);
    await A(q({ programName: "INFORMASI" }), ["P1", "P2"]);
    await A(q({ programName: "gi Inf" }), ["P1"]);
    await A(q({ programName: "manajemen" }), ["P3", "P5"]);
    await A(q({ programName: "tidak-ada-prodi-ini" }), []);
  });
  await test("B. jenjang: cocok persis, tidak sensitif huruf besar/kecil", async () => {
    await A(q({ level: "S1" }), ["P1", "P2", "P3", "P6", "P7", "D1", "F1"]);
    await A(q({ level: "s1" }), ["P1", "P2", "P3", "P6", "P7", "D1", "F1"]);
    await A(q({ level: "D3" }), ["P4"]);
    await A(q({ level: "Profesi" }), ["P8"]);
    await A(q({ level: "S" }), []); // bukan pencarian sebagian
  });
  await test("C. nomor SK: sebagian, tidak sensitif huruf, karakter / . - _ aman", async () => {
    await A(q({ skNumber: "123/SK/BAN-PT/2024" }), ["P1"]);
    await A(q({ skNumber: "ban-pt" }), ["P1"]);
    await A(q({ skNumber: "456" }), ["P2"]);
    await A(q({ skNumber: "SK_8" }), ["P8"]);
    await A(q({ skNumber: "SK/8" }), []);
  });
  await test("D. tahun SK: filter per tahun; tanggal kosong tidak error dan tidak ikut", async () => {
    await A(q({ decisionYear: "2024" }), ["P1", "D1", "F1"]);
    await A(q({ decisionYear: "2023" }), ["P2"]);
    await A(q({ decisionYear: "2021" }), ["P4"]); // 31 Des
    await A(q({ decisionYear: "2025" }), ["P6", "P8"]); // 1 Jan dan 31 Des
    await A(q({ decisionYear: "2019" }), []);
    const all = await call("GET", ADMIN_PROG + q({ limit: 50 }));
    assert.equal(all.status, 200);
    assert.ok(all.json.data.items.some((i) => i.decisionDate === null)); // P5 tetap bisa tampil tanpa filter
  });
  await test("E. peringkat: tidak sensitif huruf, nilai apa pun yang tersimpan didukung", async () => {
    await A(q({ rank: "Unggul" }), ["P1", "P5", "D1", "F1"]);
    await A(q({ rank: "unggul" }), ["P1", "P5", "D1", "F1"]);
    await A(q({ rank: "Baik Sekali" }), ["P2", "P6"]);
    await A(q({ rank: "baik" }), ["P3"]); // persis, bukan "Baik Sekali"
    await A(q({ rank: "B" }), ["P4"]);
    await A(q({ rank: "Peringkat Khusus X" }), ["P7"]);
    await A(q({ rank: "C" }), ["P8"]);
  });
  await test("F. rentang tanggal kedaluwarsa: from, to, keduanya (inklusif); NULL tidak ikut", async () => {
    await A(q({ validUntilFrom: plus(90) }), ["P1", "P2", "P6"]);
    await A(q({ validUntilTo: plus(-1) }), ["P4", "P7"]);
    await A(q({ validUntilFrom: plus(0), validUntilTo: plus(0) }), ["P3"]);
    await A(q({ validUntilFrom: plus(-1), validUntilTo: plus(0) }), ["P3", "P4"]);
    await A(q({ validUntilFrom: plus(-1000), validUntilTo: plus(1000) }), ["P1", "P2", "P3", "P4", "P6", "P7", "P8", "D1", "F1"]);
  });
  await test("G1. status active (valid_until > hari ini + 90)", async () => { await A(q({ expiryStatus: "active" }), ["P1", "P6"]); });
  await test("G2. status expiring (hari ini s/d +90, inklusif)", async () => { await A(q({ expiryStatus: "expiring" }), ["P2", "P3", "P8", "D1", "F1"]); });
  await test("G3. status expired (valid_until < hari ini); yang berakhir hari ini BUKAN expired", async () => {
    const r = await A(q({ expiryStatus: "expired" }), ["P4", "P7"]);
    assert.ok(!keysOf(r).includes("P3"));
  });
  await test("G4. status unknown (valid_until kosong)", async () => { await A(q({ expiryStatus: "unknown" }), ["P5"]); });
  await test("G5. nilai expiryStatus tidak sensitif huruf besar/kecil", async () => { await A(q({ expiryStatus: "EXPIRED" }), ["P4", "P7"]); });
  await test("G6. semua status saling lepas dan jumlahnya sama dengan seluruh data", async () => {
    const seen = new Set();
    for (const s of ["active", "expiring", "expired", "unknown"]) {
      const r = await call("GET", ADMIN_PROG + q({ expiryStatus: s, limit: 50 }));
      for (const i of r.json.data.items) { assert.ok(!seen.has(i.id), "ganda"); seen.add(i.id); assert.equal(i.expiryStatus, s); }
    }
    assert.equal(seen.size, Object.keys(rows).length);
  });
  await test("setiap item membawa expiryStatus & daysUntilExpiry yang konsisten dengan filter", async () => {
    const r = await call("GET", ADMIN_PROG + q({ limit: 50 }));
    const by = Object.fromEntries(r.json.data.items.map((i) => [i.id, i]));
    assert.equal(by[rows.P3.id].expiryStatus, "expiring"); assert.equal(by[rows.P3.id].daysUntilExpiry, 0);
    assert.equal(by[rows.P2.id].daysUntilExpiry, 90);
    assert.equal(by[rows.P4.id].expiryStatus, "expired"); assert.equal(by[rows.P4.id].daysUntilExpiry, -1);
    assert.equal(by[rows.P5.id].expiryStatus, "unknown"); assert.equal(by[rows.P5.id].daysUntilExpiry, null);
  });
  await test("karakter wildcard di input diperlakukan sebagai teks biasa", async () => {
    await A(q({ programName: "100%" }), ["P8"]);
    await A(q({ programName: "%" }), ["P8"]);   // bukan "cocok semua"
    await A(q({ programName: "_" }), []);       // bukan "satu karakter apa saja"
    await A(q({ skNumber: "%" }), []);
    await A(q({ rank: "%" }), []);
    await A(q({ programName: "***" }), Object.keys(rows)); // hanya wildcard -> filter diabaikan
  });
  await test("parameter kosong/spasi diabaikan seperti tidak dikirim", async () => {
    await A(q({ level: "", rank: "  ", programName: "", skNumber: "", decisionYear: "", validUntilFrom: "", validUntilTo: "", expiryStatus: "", search: "" }), Object.keys(rows));
  });

  // ===================================================================
  console.log("\n3. Filter lama tetap berfungsi");
  await test("search (nama, fakultas, nomor SK, peringkat), level, rank, status, pagination", async () => {
    await A(q({ search: "informasi" }), ["P1", "P2"]);
    await A(q({ search: "fakultas teknologi" }), ["P1"]);
    await A(q({ search: "SK/LAM" }), ["P2"]);
    await A(q({ search: "khusus" }), ["P7"]);
    await A(q({ status: "draft" }), ["D1"]);
    await A(q({ status: "published" }), [...PUBLISHED, "F1"]);
    const r = await call("GET", ADMIN_PROG);
    assert.deepEqual(r.json.data.pagination, { page: 1, limit: 10, total: 10, totalPages: 1 });
    assert.equal(r.json.success, true);
  });
  await test("urutan & bentuk item lama tidak berubah (field lama tetap ada)", async () => {
    const r = await call("GET", ADMIN_PROG + q({ limit: 50 }));
    const names = r.json.data.items.map((i) => i.programName);
    assert.deepEqual(names, [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    for (const k of ["id", "programName", "educationLevel", "faculty", "rank", "skNumber", "decisionDate", "validFrom", "validUntil", "issuingBody", "document", "publishedAt", "status", "createdAt", "updatedAt"]) assert.ok(k in r.json.data.items[0], k);
  });

  // ===================================================================
  console.log("\n4. Kombinasi filter & pagination");
  await test("kombinasi beberapa filter (AND)", async () => {
    await A(q({ level: "S1", rank: "Baik Sekali" }), ["P2", "P6"]);
    await A(q({ level: "S1", rank: "Baik Sekali", expiryStatus: "active" }), ["P6"]);
    await A(q({ level: "S1", rank: "Baik Sekali", expiryStatus: "expiring" }), ["P2"]);
    await A(q({ programName: "informasi", decisionYear: "2024" }), ["P1"]);
    await A(q({ programName: "informasi", decisionYear: "2024", skNumber: "ban-pt", rank: "unggul", level: "s1", expiryStatus: "active", validUntilFrom: plus(100), validUntilTo: plus(300), search: "teknologi", status: "published" }), ["P1"]);
    await A(q({ level: "S1", rank: "Unggul", status: "draft" }), ["D1"]);
    await A(q({ expiryStatus: "expired", decisionYear: "2021" }), ["P4"]);
    await A(q({ expiryStatus: "expired", decisionYear: "2024" }), []);
    await A(q({ expiryStatus: "active", validUntilTo: plus(100) }), ["P6"]); // active AND <= +100
    await A(q({ expiryStatus: "unknown", validUntilFrom: plus(-5) }), []); // NULL tak masuk rentang
    await A(q({ search: "manajemen", level: "S2" }), ["P5"]);
  });
  await test("pagination bersama filter: total, totalPages, halaman 2, di luar jangkauan", async () => {
    const p1 = await call("GET", ADMIN_PROG + q({ level: "S1", limit: 3, page: 1 }));
    const p2 = await call("GET", ADMIN_PROG + q({ level: "S1", limit: 3, page: 2 }));
    const p3 = await call("GET", ADMIN_PROG + q({ level: "S1", limit: 3, page: 3 }));
    assert.deepEqual(p1.json.data.pagination, { page: 1, limit: 3, total: 7, totalPages: 3 });
    assert.equal(p1.json.data.items.length, 3); assert.equal(p2.json.data.items.length, 3); assert.equal(p3.json.data.items.length, 1);
    const ids = [...p1.json.data.items, ...p2.json.data.items, ...p3.json.data.items].map((i) => i.id);
    assert.equal(new Set(ids).size, 7, "tanpa duplikat antar halaman");
    for (const i of [...p1.json.data.items, ...p2.json.data.items, ...p3.json.data.items]) assert.equal(i.educationLevel, "S1");
    const far = await call("GET", ADMIN_PROG + q({ level: "S1", limit: 3, page: 9 }));
    assert.equal(far.status, 200); assert.deepEqual(far.json.data.items, []);
    assert.deepEqual(far.json.data.pagination, { page: 9, limit: 3, total: 7, totalPages: 3 });
    const none = await call("GET", ADMIN_PROG + q({ level: "S9", page: 1 }));
    assert.deepEqual(none.json.data.pagination, { page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  // ===================================================================
  console.log("\n5. Validasi query tidak valid (400 VALIDATION_ERROR)");
  await test("tahun SK tidak valid", async () => {
    for (const v of ["abc", "24", "20245", "1899", "2101", "2024.5", "-2024", "2e3"]) await bad(`${ADMIN_PROG}${q({ decisionYear: v })}`);
  });
  await test("status kedaluwarsa tidak dikenal", async () => {
    for (const v of ["foo", "aktif", "expire", "true"]) await bad(`${ADMIN_PROG}${q({ expiryStatus: v })}`);
  });
  await test("tanggal tidak valid pada validUntilFrom / validUntilTo", async () => {
    for (const k of ["validUntilFrom", "validUntilTo"]) {
      for (const v of ["2024-13-01", "2024-02-30", "2023-02-29", "2024/01/01", "01-01-2024", "besok", "2024-1-1", "2024-01-01T00:00:00Z"]) await bad(`${ADMIN_PROG}${q({ [k]: v })}`);
    }
  });
  await test("tanggal kabisat yang valid diterima (29 Feb 2028)", async () => { await A(q({ validUntilFrom: "2028-02-29" }), ["P1", "P2", "P6", "P8", "D1", "F1", "P3"].filter((k) => rows[k].valid_until >= "2028-02-29")); });
  await test("rentang terbalik (akhir < mulai) ditolak; sama persis diterima", async () => {
    const r = await bad(`${ADMIN_PROG}${q({ validUntilFrom: "2026-06-01", validUntilTo: "2026-05-31" })}`);
    assert.ok(r.json.errors.some((d) => d.field === "validUntilTo"));
    await A(q({ validUntilFrom: "2026-06-01", validUntilTo: "2026-06-01" }), []);
  });
  await test("teks terlalu panjang & parameter ganda (array) ditolak", async () => {
    await bad(`${ADMIN_PROG}${q({ programName: "x".repeat(101) })}`);
    await bad(`${ADMIN_PROG}${q({ skNumber: "x".repeat(201) })}`);
    await bad(`${ADMIN_PROG}?level=S1&level=S2`);
    await bad(`${ADMIN_PROG}?expiryStatus=active&expiryStatus=expired`);
    await bad(`${ADMIN_PROG}?decisionYear=2024&decisionYear=2023`);
  });
  await test("validasi lama tetap: limit/page/status tidak valid", async () => {
    await bad(`${ADMIN_PROG}${q({ limit: 0 })}`); await bad(`${ADMIN_PROG}${q({ limit: 51 })}`);
    await bad(`${ADMIN_PROG}${q({ page: 0 })}`); await bad(`${ADMIN_PROG}${q({ status: "arsip" })}`);
  });
  await test("validasi yang sama berlaku di API publik", async () => {
    await bad(`${PUB_PROG}${q({ decisionYear: "abc" })}`, { token: null });
    await bad(`${PUB_PROG}${q({ expiryStatus: "foo" })}`, { token: null });
    await bad(`${PUB_PROG}${q({ validUntilFrom: "2024-02-30" })}`, { token: null });
    await bad(`${PUB_PROG}${q({ validUntilFrom: "2026-06-01", validUntilTo: "2026-01-01" })}`, { token: null });
  });
  await test("input aneh tidak menyebabkan 500 (injeksi filter PostgREST dll.)", async () => {
    for (const v of ["a,status.eq.draft", "x),(status.eq.draft", "\"; drop table", "\\", "%00", "😀", "<script>"]) {
      for (const k of ["programName", "skNumber", "search", "rank", "level"]) {
        const r = await call("GET", `${PUB_PROG}${q({ [k]: v })}`, { token: null });
        assert.ok(r.status === 200 || r.status === 400, `${k}=${v} -> ${r.status}`);
        if (r.status === 200) for (const i of r.json.data.items) assert.notEqual(i.programName, "Draft Prodi Rahasia");
      }
    }
  });

  // ===================================================================
  console.log("\n6. API publik: hanya data published");
  await test("tanpa filter: hanya published dan sudah waktunya tayang", async () => { await P("", PUBLISHED); });
  await test("setiap filter di publik tidak pernah membuka draft / jadwal masa depan", async () => {
    await P(q({ programName: "draft" }), []);
    await P(q({ programName: "terjadwal" }), []);
    await P(q({ skNumber: "DRAFT" }), []);
    await P(q({ skNumber: "FUT" }), []);
    await P(q({ search: "rahasia" }), []);
    await P(q({ level: "S1", rank: "Unggul" }), ["P1"]);          // D1 & F1 juga S1/Unggul tapi tidak tampil
    await P(q({ decisionYear: "2024" }), ["P1"]);                  // D1 & F1 juga 2024
    await P(q({ expiryStatus: "expiring" }), ["P2", "P3", "P8"]);  // D1 & F1 juga expiring
    await P(q({ validUntilFrom: plus(5), validUntilTo: plus(15) }), []);
  });
  await test("?status=draft di publik diabaikan; admin tetap bisa", async () => {
    await P(q({ status: "draft" }), PUBLISHED);
    await P(q({ status: "draft", programName: "Draft" }), []);
    await A(q({ status: "draft", programName: "Draft" }), ["D1"]);
  });
  await test("filter publik lengkap: semua parameter baru bekerja", async () => {
    await P(q({ programName: "informasi", level: "s1", rank: "Baik Sekali", skNumber: "lam", decisionYear: "2023", expiryStatus: "expiring", validUntilFrom: plus(80), validUntilTo: plus(95) }), ["P2"]);
    await P(q({ expiryStatus: "unknown" }), ["P5"]);
    await P(q({ level: "S1", page: 2, limit: 2 }), ["P6", "P2"]); // urut nama: Hukum, Manajemen | Sastra Inggris, Sistem Informasi | Teknologi Informasi
  });
  await test("pagination publik bersama filter menghitung hanya data published", async () => {
    const r = await call("GET", `${PUB_PROG}${q({ level: "S1", limit: 2 })}`, { token: null });
    assert.deepEqual(r.json.data.pagination, { page: 1, limit: 2, total: 5, totalPages: 3 }); // P1,P2,P3,P6,P7
  });
  await test("respons publik tidak membocorkan field/path internal", async () => {
    const r = await call("GET", `${PUB_PROG}${q({ limit: 50 })}`, { token: null });
    for (const k of ["document_path", "documentPath", "created_by", "createdBy", "status", "createdAt", "updatedAt"]) assert.ok(!r.text.includes(`"${k}"`), `bocor: ${k}`);
    assert.ok(!r.text.includes("study-programs/secret"));
    const adminRes = await call("GET", ADMIN_PROG + q({ status: "draft" }));
    for (const k of ["document_path", "documentPath", "created_by", "createdBy"]) assert.ok(!adminRes.text.includes(`"${k}"`), k);
    // Admin boleh menerima signed URL (path hanya tertanam di dalam URL bertoken), tidak pernah sebagai field
    assert.equal(adminRes.json.data.items[0].document.url.includes("token="), true);
  });
  await test("detail publik: draft 404, published 200 dan memuat expiryStatus", async () => {
    assert.equal((await call("GET", `${PUB_PROG}/${rows.D1.id}`, { token: null })).status, 404);
    const r = await call("GET", `${PUB_PROG}/${rows.P2.id}`, { token: null });
    assert.equal(r.status, 200); assert.equal(r.json.data.accreditation.expiryStatus, "expiring");
  });

  // ===================================================================
  console.log("\n7. Hak akses admin");
  await test("filter admin tanpa token / token palsu -> 401 (data draft tidak bocor)", async () => {
    for (const u of [ADMIN_PROG, `${ADMIN_PROG}${q({ status: "draft" })}`, `${ADMIN_PROG}${q({ expiryStatus: "active" })}`, `${ADMIN_PROG}/filter-options`]) {
      const r = await call("GET", u, { token: null });
      assert.equal(r.status, 401, u); assert.ok(!r.text.includes("Draft Prodi"));
    }
    assert.equal((await call("GET", ADMIN_PROG, { token: "abc.def.ghi" })).status, 401);
  });
  await test("admin melihat draft + published dengan filter", async () => {
    await A(q({ expiryStatus: "expiring" }), ["P2", "P3", "P8", "D1", "F1"]);
  });

  // ===================================================================
  console.log("\n8. Endpoint opsi filter (/study-programs/filter-options)");
  await test("publik: nilai dari data published saja, tidak dibatasi daftar tetap", async () => {
    const r = await call("GET", `${PUB_PROG}/filter-options`, { token: null });
    assert.equal(r.status, 200); assert.equal(r.json.success, true);
    const d = r.json.data;
    assert.deepEqual(d.levels, ["D3", "Profesi", "S1", "S2"]);
    assert.ok(d.ranks.includes("Peringkat Khusus X") && d.ranks.includes("B") && d.ranks.includes("C") && d.ranks.includes("Unggul"));
    assert.deepEqual(d.decisionYears, [2025, 2024, 2023, 2022, 2021, 2020]); // null diabaikan
    assert.deepEqual(d.expiryStatuses, ["active", "expiring", "expired", "unknown"]);
  });
  await test("publik: peringkat/jenjang yang hanya ada di draft tidak muncul", async () => {
    rows.D1.rank = "Rahasia Draft"; rows.D1.education_level = "S9"; rows.D1.decision_date = "1999-01-01";
    const r = await call("GET", `${PUB_PROG}/filter-options`, { token: null });
    assert.ok(!r.text.includes("Rahasia Draft") && !r.text.includes("S9") && !r.json.data.decisionYears.includes(1999));
    const a = await call("GET", `${ADMIN_PROG}/filter-options`);
    assert.equal(a.status, 200);
    assert.ok(a.json.data.ranks.includes("Rahasia Draft") && a.json.data.levels.includes("S9") && a.json.data.decisionYears.includes(1999));
    rows.D1.rank = "Unggul"; rows.D1.education_level = "S1"; rows.D1.decision_date = "2024-06-01";
  });
  await test("rute filter-options tidak tertangkap rute /:id (bukan 400 ID tidak valid)", async () => {
    assert.equal((await call("GET", `${PUB_PROG}/filter-options`, { token: null })).status, 200);
    assert.equal((await call("GET", `${PUB_PROG}/${MISSING}`, { token: null })).status, 404);
    assert.equal((await call("GET", `${PUB_PROG}/bukan-uuid`, { token: null })).status, 400);
  });
  await test("tidak ada filter-options untuk institusi (tetap seperti semula)", async () => {
    assert.equal((await call("GET", `${PUB_INST}/filter-options`, { token: null })).status, 400);
  });

  // ===================================================================
  console.log("\n9. Akreditasi institusi: tidak ada regresi");
  let instId;
  const validInst = (o = {}) => ({ rank: "Unggul", skNumber: "SK-I-001", decisionDate: "2024-03-01", validFrom: "2024-03-01", validUntil: "2029-03-01", ...o });
  await test("CRUD institusi tetap berfungsi dan tidak mendapat field baru", async () => {
    const c = await call("POST", ADMIN_INST, { body: validInst({ status: "published" }) });
    assert.equal(c.status, 201); instId = c.json.data.accreditation.id;
    const a = c.json.data.accreditation;
    assert.equal(a.institutionName, "Universitas LIA"); assert.ok(!("expiryStatus" in a) && !("daysUntilExpiry" in a));
    assert.equal((await call("GET", `${ADMIN_INST}/${instId}`)).status, 200);
    const u = await call("PATCH", `${ADMIN_INST}/${instId}`, { body: { rank: "Baik Sekali" } });
    assert.equal(u.status, 200); assert.equal(u.json.data.accreditation.rank, "Baik Sekali");
    assert.equal((await call("GET", PUB_INST, { token: null })).json.data.items.length, 1);
    const d = await call("DELETE", `${ADMIN_INST}/${instId}`);
    assert.equal(d.status, 200);
    assert.equal((await call("GET", `${ADMIN_INST}/${instId}`)).status, 404);
  });
  await test("daftar institusi mengabaikan parameter pencarian prodi & tetap memakai search lama", async () => {
    await call("POST", ADMIN_INST, { body: validInst({ skNumber: "SK-I-002", status: "published" }) });
    await call("POST", ADMIN_INST, { body: validInst({ skNumber: "SK-I-003", rank: "Baik" }) });
    const r = await call("GET", ADMIN_INST + q({ expiryStatus: "expired", decisionYear: "1999", level: "S9" }));
    assert.equal(r.status, 200); assert.equal(r.json.data.items.length, 2);
    assert.equal((await call("GET", ADMIN_INST + q({ search: "I-003" }))).json.data.items.length, 1);
    assert.equal((await call("GET", ADMIN_INST + q({ status: "draft" }))).json.data.items.length, 1);
  });

  console.log(`\n(${requestCount} request HTTP dikirim; batas umum server 300/15 menit)`);
  assert.ok(requestCount < 300, "melewati batas rate limit umum");
  await new Promise((r) => server.close(r));
  console.error = origError;
  console.log(`\nSelesai: ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})();
