// Pengujian OFFLINE fitur Kalender Akademik (/api/admin/academic-calendar dan /api/academic-calendar).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
// Request dikirim lewat HTTP sungguhan ke app Express (validator, middleware, controller ikut teruji).
//
//   npm run test:academic-calendar        (atau: node scripts/testAcademicCalendar.js)
//
// Tidak dicakup (butuh Supabase asli): constraint/trigger/RLS SQL yang sebenarnya dan perilaku operator
// PostgREST. Fake meniru semantik eq/lte/gte/ilike/order/range/count yang dipakai modul ini.

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";

const assert = require("node:assert/strict");
const path = require("node:path");
const jwt = require("jsonwebtoken");

const { createFakeSupabase } = require("./lib/fakeSupabase");
const sb = createFakeSupabase();
const supabasePath = sb.install();
const { db, faults } = sb;

const logs = [];
console.error = (...a) => logs.push(a.join(" "));

const loadFreshApp = () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath) delete require.cache[key];
  }
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INACTIVE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING = "123e4567-e89b-42d3-a456-426614174000";

const CATEGORIES = [
  ["perkuliahan", "Perkuliahan", 10],
  ["uts", "Ujian Tengah Semester (UTS)", 20],
  ["uas", "Ujian Akhir Semester (UAS)", 30],
  ["registrasi", "Registrasi", 40],
  ["wisuda", "Wisuda", 50],
  ["libur-akademik", "Libur Akademik", 60],
  ["kegiatan-universitas", "Kegiatan Universitas", 70],
  ["lainnya", "Lainnya", 999],
];

const seedBase = () => {
  db.admins = [
    { id: ADMIN_ID, name: "Admin Uji", email: "admin@example.com", is_active: true, last_login_at: null, created_at: new Date().toISOString() },
    { id: INACTIVE_ID, name: "Admin Nonaktif", email: "off@example.com", is_active: false, last_login_at: null, created_at: new Date().toISOString() },
  ];
  db.academic_calendar_categories = CATEGORIES.map(([slug, name, sort_order]) => ({ slug, name, sort_order, is_active: true }));
  db.academic_calendar_events = [];
};

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  OK    ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n").slice(0, 4).join("\n        ")}`);
  }
};

(async () => {
  seedBase();
  const app = loadFreshApp();
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const signToken = (id, opts = {}) => jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "universitas-lia-api", subject: id, expiresIn: "1h", ...opts });
  const TOKEN = signToken(ADMIN_ID);

  const call = async (method, url, { body, token = TOKEN, raw } = {}) => {
    const headers = {};
    if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* bukan JSON */ }
    return { status: res.status, json, text };
  };
  const admin = (m, u, o) => call(m, `/api/admin/academic-calendar${u}`, o);
  const pub = (m, u, o) => call(m, `/api/academic-calendar${u}`, { token: null, ...o });
  const q = (params) => "?" + new URLSearchParams(params).toString();

  const valid = (over = {}) => ({
    title: "Ujian Tengah Semester Ganjil",
    description: "UTS semester ganjil 2026/2027",
    startDate: "2026-10-05",
    endDate: "2026-10-12",
    category: "uts",
    ...over,
  });
  const create = async (over) => {
    const r = await admin("POST", "", { body: valid(over) });
    assert.equal(r.status, 201, r.text);
    return r.json.data.event;
  };
  const reset = () => { db.academic_calendar_events = []; db.academic_calendar_categories = CATEGORIES.map(([slug, name, sort_order]) => ({ slug, name, sort_order, is_active: true })); };

  // =================================================================
  console.log("1. Admin: membuat agenda");
  await test("membuat agenda multi-hari -> 201, default draft, bentuk respons benar", async () => {
    reset();
    const r = await admin("POST", "", { body: valid() });
    assert.equal(r.status, 201);
    assert.equal(r.json.success, true);
    const e = r.json.data.event;
    assert.match(e.id, /^[0-9a-f-]{36}$/);
    assert.equal(e.title, "Ujian Tengah Semester Ganjil");
    assert.equal(e.startDate, "2026-10-05");
    assert.equal(e.endDate, "2026-10-12");
    assert.deepEqual(e.category, { slug: "uts", name: "Ujian Tengah Semester (UTS)" });
    assert.equal(e.status, "draft");
    assert.ok(e.createdAt && e.updatedAt);
    assert.equal(db.academic_calendar_events.length, 1);
  });
  await test("agenda satu hari (mulai = selesai) diterima; status published bisa langsung diset", async () => {
    reset();
    const e = await create({ startDate: "2026-08-17", endDate: "2026-08-17", status: "published", category: "libur-akademik", title: "Hari Kemerdekaan" });
    assert.equal(e.status, "published");
    assert.equal(e.startDate, e.endDate);
  });
  await test("deskripsi opsional (null); HTML pada judul/deskripsi dibersihkan; baris baru deskripsi dipertahankan", async () => {
    reset();
    const a = await create({ description: undefined });
    assert.equal(a.description, null);
    const b = await create({ title: "<b>Registrasi</b> <script>alert(1)</script>Ulang", description: "Baris 1\n<img src=x onerror=alert(1)>Baris 2" });
    assert.equal(b.title, "Registrasi Ulang");
    assert.equal(b.description, "Baris 1\nBaris 2");
  });

  // =================================================================
  console.log("\n2. Validasi input");
  const bad = async (name, body, field) => test(name, async () => {
    reset();
    const r = await admin("POST", "", { body });
    assert.equal(r.status, 400, r.text);
    assert.equal(r.json.code, "VALIDATION_ERROR");
    if (field) assert.ok(r.json.errors.some((x) => x.field === field), `field ${field} tidak ada di ${JSON.stringify(r.json.errors)}`);
    assert.equal(db.academic_calendar_events.length, 0);
  });
  await bad("judul wajib", { ...valid(), title: undefined }, "title");
  await bad("judul hanya spasi/HTML ditolak", valid({ title: "   <b></b>  " }), "title");
  await bad("judul > 200 karakter ditolak", valid({ title: "x".repeat(201) }), "title");
  await bad("tanggal mulai wajib", { ...valid(), startDate: undefined }, "startDate");
  await bad("tanggal selesai wajib", { ...valid(), endDate: undefined }, "endDate");
  await bad("format tanggal salah (DD-MM-YYYY)", valid({ startDate: "05-10-2026" }), "startDate");
  await bad("tanggal tidak nyata (30 Februari)", valid({ startDate: "2026-02-30", endDate: "2026-03-01" }), "startDate");
  await bad("bulan 13 ditolak", valid({ endDate: "2026-13-01" }), "endDate");
  await bad("tanggal berformat datetime ditolak", valid({ startDate: "2026-10-05T00:00:00Z" }), "startDate");
  await bad("tahun di luar rentang ditolak", valid({ startDate: "1850-01-01", endDate: "1850-01-02" }), "startDate");
  await bad("tanggal selesai lebih awal dari mulai ditolak", valid({ startDate: "2026-10-12", endDate: "2026-10-05" }), "endDate");
  await bad("status tidak diizinkan", valid({ status: "archived" }), "status");
  await bad("kategori wajib", { ...valid(), category: undefined }, "category");
  await bad("kategori tidak terdaftar", valid({ category: "tidak-ada" }), "category");
  await bad("kategori berformat berbahaya", valid({ category: "uts'; drop table x;--" }), "category");
  await bad("field tak dikenal (id, createdAt) ditolak", valid({ id: MISSING, createdAt: "2020-01-01" }));
  await bad("deskripsi > 2000 karakter ditolak", valid({ description: "d".repeat(2001) }), "description");
  await bad("tipe data salah (angka sebagai judul)", valid({ title: 123 }), "title");
  await test("kategori nonaktif ditolak untuk agenda baru", async () => {
    reset();
    db.academic_calendar_categories.find((c) => c.slug === "wisuda").is_active = false;
    const r = await admin("POST", "", { body: valid({ category: "wisuda" }) });
    assert.equal(r.status, 400);
    assert.ok(r.json.errors.some((x) => x.field === "category"));
  });
  await test("kategori baru yang ditambahkan di database langsung bisa dipakai (tanpa ubah kode)", async () => {
    reset();
    db.academic_calendar_categories.push({ slug: "seminar", name: "Seminar", sort_order: 90, is_active: true });
    const e = await create({ category: "seminar", title: "Seminar Nasional" });
    assert.deepEqual(e.category, { slug: "seminar", name: "Seminar" });
  });
  await test("kategori huruf besar dinormalkan (UTS -> uts)", async () => {
    reset();
    const e = await create({ category: " UTS " });
    assert.equal(e.category.slug, "uts");
  });
  await test("JSON rusak -> 400 INVALID_JSON", async () => {
    const r = await admin("POST", "", { raw: "{rusak" });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "INVALID_JSON");
  });

  // =================================================================
  console.log("\n3. Admin: daftar & detail");
  await test("daftar admin memuat draft DAN published beserta pagination", async () => {
    reset();
    await create({ title: "Draft A", status: "draft" });
    await create({ title: "Pub B", status: "published", startDate: "2026-11-01", endDate: "2026-11-02" });
    const r = await admin("GET", "");
    assert.equal(r.status, 200);
    assert.equal(r.json.data.items.length, 2);
    assert.deepEqual(r.json.data.items.map((i) => i.status).sort(), ["draft", "published"]);
    assert.deepEqual(r.json.data.pagination, { page: 1, limit: 20, total: 2, totalPages: 1 });
    assert.equal(r.json.data.items[0].title, "Pub B", "urut start_date menurun");
  });
  await test("daftar admin: filter status, kategori, pencarian judul, dan pagination", async () => {
    reset();
    for (let i = 1; i <= 5; i += 1) await create({ title: `Agenda ${i}`, startDate: `2026-09-0${i}`, endDate: `2026-09-0${i}`, category: i % 2 ? "uts" : "uas", status: i <= 2 ? "published" : "draft" });
    assert.equal((await admin("GET", q({ status: "published" }))).json.data.pagination.total, 2);
    assert.equal((await admin("GET", q({ status: "draft" }))).json.data.pagination.total, 3);
    assert.equal((await admin("GET", q({ category: "uas" }))).json.data.pagination.total, 2);
    assert.equal((await admin("GET", q({ search: "agenda 3" }))).json.data.items.length, 1);
    assert.equal((await admin("GET", q({ search: "100%" }))).json.data.items.length, 0, "wildcard % tidak boleh cocok semua");
    const p2 = await admin("GET", q({ page: 2, limit: 2 }));
    assert.equal(p2.json.data.items.length, 2);
    assert.equal(p2.json.data.pagination.totalPages, 3);
    const beyond = await admin("GET", q({ page: 50, limit: 2 }));
    assert.equal(beyond.status, 200);
    assert.deepEqual(beyond.json.data.items, []);
    assert.equal(beyond.json.data.pagination.total, 5);
  });
  await test("daftar admin: query tidak valid -> 400 (status, limit, tanggal, kategori tak dikenal)", async () => {
    for (const params of [{ status: "x" }, { limit: 1000 }, { page: 0 }, { from: "bukan-tanggal" }, { category: "tidak-ada" }, { from: "2026-12-01", to: "2026-01-01" }]) {
      const r = await admin("GET", q(params));
      assert.equal(r.status, 400, JSON.stringify(params));
      assert.equal(r.json.code, "VALIDATION_ERROR");
    }
  });
  await test("detail admin: draft dapat dibaca; id tak ada -> 404; id bukan UUID -> 400", async () => {
    reset();
    const e = await create({ status: "draft" });
    const ok = await admin("GET", `/${e.id}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.json.data.event.id, e.id);
    assert.equal(ok.json.data.event.status, "draft");
    const nf = await admin("GET", `/${MISSING}`);
    assert.equal(nf.status, 404);
    assert.equal(nf.json.code, "ACADEMIC_EVENT_NOT_FOUND");
    assert.equal((await admin("GET", "/abc")).status, 400);
  });

  // =================================================================
  console.log("\n4. Admin: mengubah agenda");
  await test("PATCH mengubah judul, deskripsi, tanggal, kategori, status; updatedAt berubah", async () => {
    reset();
    const e = await create();
    const r = await admin("PATCH", `/${e.id}`, { body: { title: "UTS Baru", description: "Deskripsi baru", startDate: "2026-10-06", endDate: "2026-10-13", category: "uas", status: "published" } });
    assert.equal(r.status, 200, r.text);
    const u = r.json.data.event;
    assert.equal(u.title, "UTS Baru");
    assert.equal(u.description, "Deskripsi baru");
    assert.equal(u.startDate, "2026-10-06");
    assert.equal(u.endDate, "2026-10-13");
    assert.equal(u.category.slug, "uas");
    assert.equal(u.status, "published");
    assert.notEqual(u.updatedAt, e.updatedAt);
    assert.equal(u.createdAt, e.createdAt);
  });
  await test("PATCH parsial: field lain tetap; deskripsi bisa dikosongkan dengan null", async () => {
    reset();
    const e = await create();
    const r = await admin("PATCH", `/${e.id}`, { body: { description: null } });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.event.description, null);
    assert.equal(r.json.data.event.title, e.title);
    assert.equal(r.json.data.event.startDate, e.startDate);
  });
  await test("PATCH hanya tanggal selesai yang lebih awal dari mulai LAMA -> 400 (dicek terhadap data tersimpan)", async () => {
    reset();
    const e = await create({ startDate: "2026-10-05", endDate: "2026-10-12" });
    const r = await admin("PATCH", `/${e.id}`, { body: { endDate: "2026-10-01" } });
    assert.equal(r.status, 400);
    assert.ok(r.json.errors.some((x) => x.field === "endDate"));
    assert.equal(db.academic_calendar_events[0].end_date, "2026-10-12", "data tidak berubah");
  });
  await test("PATCH hanya tanggal mulai yang lebih akhir dari selesai LAMA -> 400", async () => {
    reset();
    const e = await create({ startDate: "2026-10-05", endDate: "2026-10-12" });
    assert.equal((await admin("PATCH", `/${e.id}`, { body: { startDate: "2026-10-20" } })).status, 400);
  });
  await test("PATCH kedua tanggal terbalik di body -> 400", async () => {
    reset();
    const e = await create();
    assert.equal((await admin("PATCH", `/${e.id}`, { body: { startDate: "2026-12-10", endDate: "2026-12-01" } })).status, 400);
  });
  await test("PATCH validasi: status/kategori salah, body kosong, field tak dikenal, id tak ada, id bukan UUID", async () => {
    reset();
    const e = await create();
    assert.equal((await admin("PATCH", `/${e.id}`, { body: { status: "archived" } })).status, 400);
    assert.equal((await admin("PATCH", `/${e.id}`, { body: { category: "xyz" } })).status, 400);
    assert.equal((await admin("PATCH", `/${e.id}`, { body: {} })).status, 400);
    assert.equal((await admin("PATCH", `/${e.id}`, { body: { id: MISSING } })).status, 400);
    assert.equal((await admin("PATCH", `/${MISSING}`, { body: { title: "Judul Baru" } })).status, 404);
    assert.equal((await admin("PATCH", "/abc", { body: { title: "Judul Baru" } })).status, 400);
  });
  await test("PATCH tanpa perubahan nyata -> 200 'Tidak ada perubahan'", async () => {
    reset();
    const e = await create();
    const r = await admin("PATCH", `/${e.id}`, { body: { title: e.title, category: "uts" } });
    assert.equal(r.status, 200);
    assert.equal(r.json.message, "Tidak ada perubahan");
  });
  await test("agenda berkategori yang kemudian dinonaktifkan tetap bisa diedit tanpa mengganti kategori", async () => {
    reset();
    const e = await create({ category: "wisuda", title: "Wisuda Periode I" });
    db.academic_calendar_categories.find((c) => c.slug === "wisuda").is_active = false;
    const r = await admin("PATCH", `/${e.id}`, { body: { title: "Wisuda Periode I (revisi)" } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.data.event.category.slug, "wisuda");
  });

  // =================================================================
  console.log("\n5. Admin: menghapus agenda");
  await test("DELETE berhasil lalu detail -> 404; hapus ulang -> 404; id bukan UUID -> 400", async () => {
    reset();
    const e = await create();
    const r = await admin("DELETE", `/${e.id}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.success, true);
    assert.equal(db.academic_calendar_events.length, 0);
    assert.equal((await admin("GET", `/${e.id}`)).status, 404);
    assert.equal((await admin("DELETE", `/${e.id}`)).status, 404);
    assert.equal((await admin("DELETE", "/abc")).status, 400);
  });
  await test("DELETE hanya menghapus agenda yang dituju", async () => {
    reset();
    const a = await create({ title: "Agenda A" });
    await create({ title: "Agenda B" });
    await admin("DELETE", `/${a.id}`);
    assert.deepEqual(db.academic_calendar_events.map((x) => x.title), ["Agenda B"]);
  });

  // =================================================================
  console.log("\n6. Keamanan: endpoint admin wajib autentikasi admin");
  const adminCalls = [
    ["GET", ""], ["GET", `/${MISSING}`], ["POST", "", valid()], ["PATCH", `/${MISSING}`, { title: "Judul Baru" }], ["DELETE", `/${MISSING}`],
  ];
  await test("tanpa token -> 401 UNAUTHORIZED di seluruh 5 endpoint admin, dan data tidak berubah", async () => {
    reset();
    const e = await create();
    for (const [m, u, body] of adminCalls) {
      const r = await admin(m, u, { body, token: null });
      assert.equal(r.status, 401, `${m} ${u}`);
      assert.equal(r.json.code, "UNAUTHORIZED");
    }
    assert.equal((await admin("DELETE", `/${e.id}`, { token: null })).status, 401);
    assert.equal(db.academic_calendar_events.length, 1);
  });
  await test("token palsu / tanda tangan salah / kedaluwarsa / alg=none -> 401", async () => {
    const forged = jwt.sign({ role: "admin" }, "secret-lain".padEnd(48, "y"), { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID });
    const expired = signToken(ADMIN_ID, { expiresIn: -10 });
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ role: "admin", sub: ADMIN_ID, iss: "universitas-lia-api" })).toString("base64url")}.`;
    for (const t of ["abc", forged, expired, none]) {
      const r = await admin("GET", "", { token: t });
      assert.equal(r.status, 401);
    }
    assert.equal((await admin("GET", "", { token: expired })).json.code, "TOKEN_EXPIRED");
  });
  await test("token dengan role bukan admin -> 403; admin nonaktif atau tidak ada -> 401", async () => {
    const notAdmin = jwt.sign({ role: "user" }, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID });
    assert.equal((await admin("GET", "", { token: notAdmin })).status, 403);
    assert.equal((await admin("GET", "", { token: signToken(INACTIVE_ID) })).status, 401);
    assert.equal((await admin("GET", "", { token: signToken(MISSING) })).status, 401);
  });
  await test("endpoint publik tidak menerima method tulis (POST/PUT/PATCH/DELETE -> 404, data utuh)", async () => {
    reset();
    const e = await create({ status: "published" });
    for (const [m, u] of [["POST", ""], ["PUT", `/${e.id}`], ["PATCH", `/${e.id}`], ["DELETE", `/${e.id}`], ["POST", "/categories"]]) {
      const r = await pub(m, u, { body: valid({ title: "Disusupi" }) });
      assert.equal(r.status, 404, `${m} ${u}`);
    }
    assert.equal(db.academic_calendar_events.length, 1);
    assert.equal(db.academic_calendar_events[0].title, valid().title);
  });

  // =================================================================
  console.log("\n7. Publik: hanya published");
  await test("daftar publik tanpa login hanya berisi published; draft tidak muncul; tanpa field status/internal", async () => {
    reset();
    await create({ title: "Draft Rahasia", status: "draft" });
    await create({ title: "Agenda Terbuka", status: "published" });
    const r = await pub("GET", "");
    assert.equal(r.status, 200);
    assert.equal(r.json.data.items.length, 1);
    const item = r.json.data.items[0];
    assert.equal(item.title, "Agenda Terbuka");
    assert.equal(r.json.data.pagination.total, 1);
    assert.deepEqual(Object.keys(item).sort(), ["category", "createdAt", "description", "endDate", "id", "startDate", "title", "updatedAt"]);
    assert.ok(!r.text.includes("Draft Rahasia"));
  });
  await test("?status=draft di endpoint publik DIABAIKAN: draft tetap tidak terbaca", async () => {
    reset();
    await create({ title: "Draft Rahasia", status: "draft" });
    for (const params of [{ status: "draft" }, { status: "all" }, { status: "" }]) {
      const r = await pub("GET", q(params));
      assert.equal(r.status, 200);
      assert.equal(r.json.data.items.length, 0, JSON.stringify(params));
    }
  });
  await test("detail publik: published -> 200; draft -> 404 (identik dengan id tak ada); id bukan UUID -> 400", async () => {
    reset();
    const pubEv = await create({ status: "published" });
    const draft = await create({ title: "Draft Rahasia", status: "draft" });
    const ok = await pub("GET", `/${pubEv.id}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.json.data.event.id, pubEv.id);
    assert.equal(ok.json.data.event.status, undefined);
    const d = await pub("GET", `/${draft.id}`);
    const m = await pub("GET", `/${MISSING}`);
    assert.equal(d.status, 404);
    assert.equal(d.json.code, "ACADEMIC_EVENT_NOT_FOUND");
    assert.deepEqual(d.json, m.json, "respons draft tidak boleh dibedakan dari id yang tidak ada");
    assert.equal((await pub("GET", "/abc")).status, 400);
  });
  await test("agenda yang dikembalikan ke draft hilang dari publik; dipublikasikan -> muncul", async () => {
    reset();
    const e = await create({ status: "published" });
    assert.equal((await pub("GET", `/${e.id}`)).status, 200);
    await admin("PATCH", `/${e.id}`, { body: { status: "draft" } });
    assert.equal((await pub("GET", `/${e.id}`)).status, 404);
    assert.equal((await pub("GET", "")).json.data.items.length, 0);
    await admin("PATCH", `/${e.id}`, { body: { status: "published" } });
    assert.equal((await pub("GET", "")).json.data.items.length, 1);
  });
  await test("daftar publik terurut tanggal mulai menaik", async () => {
    reset();
    await create({ title: "Agenda C", startDate: "2026-12-01", endDate: "2026-12-01", status: "published" });
    await create({ title: "Agenda A", startDate: "2026-09-01", endDate: "2026-09-01", status: "published" });
    await create({ title: "Agenda B", startDate: "2026-10-01", endDate: "2026-10-01", status: "published" });
    assert.deepEqual((await pub("GET", "")).json.data.items.map((i) => i.title), ["Agenda A", "Agenda B", "Agenda C"]);
  });
  await test("kategori publik: daftar kategori aktif (kategori nonaktif tidak ditampilkan)", async () => {
    reset();
    db.academic_calendar_categories.find((c) => c.slug === "lainnya").is_active = false;
    const r = await pub("GET", "/categories");
    assert.equal(r.status, 200);
    const slugs = r.json.data.categories.map((c) => c.slug);
    assert.deepEqual(slugs, ["perkuliahan", "uts", "uas", "registrasi", "wisuda", "libur-akademik", "kegiatan-universitas"]);
    assert.deepEqual(r.json.data.categories[1], { slug: "uts", name: "Ujian Tengah Semester (UTS)" });
  });

  // =================================================================
  console.log("\n8. Publik: filter kategori, rentang tanggal, pagination");
  const seedFilter = async () => {
    reset();
    await create({ title: "Kuliah Ganjil", category: "perkuliahan", startDate: "2026-09-01", endDate: "2026-12-18", status: "published" });
    await create({ title: "UTS", category: "uts", startDate: "2026-10-05", endDate: "2026-10-12", status: "published" });
    await create({ title: "UAS", category: "uas", startDate: "2026-12-14", endDate: "2026-12-23", status: "published" });
    await create({ title: "Wisuda", category: "wisuda", startDate: "2027-03-20", endDate: "2027-03-20", status: "published" });
    await create({ title: "UTS Draft", category: "uts", startDate: "2026-10-06", endDate: "2026-10-07", status: "draft" });
  };
  const titles = (r) => r.json.data.items.map((i) => i.title);
  await test("filter kategori: uts -> hanya UTS published (draft tidak ikut)", async () => {
    await seedFilter();
    assert.deepEqual(titles(await pub("GET", q({ category: "uts" }))), ["UTS"]);
    assert.deepEqual(titles(await pub("GET", q({ category: "wisuda" }))), ["Wisuda"]);
    assert.deepEqual(titles(await pub("GET", q({ category: "lainnya" }))), []);
  });
  await test("filter kategori tidak dikenal / berformat berbahaya -> 400", async () => {
    await seedFilter();
    assert.equal((await pub("GET", q({ category: "tidak-ada" }))).status, 400);
    assert.equal((await pub("GET", q({ category: "uts' or 1=1--" }))).status, 400);
  });
  await test("filter tanggal: irisan rentang — agenda multi-hari yang MENYENTUH rentang ikut tampil", async () => {
    await seedFilter();
    // 8-9 Okt hanya beririsan dengan "Kuliah Ganjil" (1 Sep–18 Des) dan "UTS" (5–12 Okt)
    assert.deepEqual(titles(await pub("GET", q({ from: "2026-10-08", to: "2026-10-09" }))), ["Kuliah Ganjil", "UTS"]);
    // rentang yang hanya menyentuh hari terakhir UTS
    assert.deepEqual(titles(await pub("GET", q({ from: "2026-10-12", to: "2026-10-12" }))), ["Kuliah Ganjil", "UTS"]);
    // sehari setelah UTS selesai
    assert.deepEqual(titles(await pub("GET", q({ from: "2026-10-13", to: "2026-10-13" }))), ["Kuliah Ganjil"]);
    // sehari sebelum UTS mulai
    assert.deepEqual(titles(await pub("GET", q({ from: "2026-10-04", to: "2026-10-04" }))), ["Kuliah Ganjil"]);
    // rentang di luar semua agenda
    assert.deepEqual(titles(await pub("GET", q({ from: "2028-01-01", to: "2028-01-31" }))), []);
  });
  await test("filter tanggal: hanya from, hanya to, dan kombinasi dengan kategori", async () => {
    await seedFilter();
    assert.deepEqual(titles(await pub("GET", q({ from: "2027-01-01" }))), ["Wisuda"]);
    assert.deepEqual(titles(await pub("GET", q({ to: "2026-09-30" }))), ["Kuliah Ganjil"]);
    assert.deepEqual(titles(await pub("GET", q({ category: "uas", from: "2026-12-01", to: "2026-12-31" }))), ["UAS"]);
    assert.deepEqual(titles(await pub("GET", q({ category: "uts", from: "2027-01-01" }))), []);
  });
  await test("filter tanggal tidak valid -> 400 (format, tanggal tak nyata, from > to)", async () => {
    await seedFilter();
    for (const params of [{ from: "2026/10/01" }, { to: "2026-02-30" }, { from: "2026-12-31", to: "2026-01-01" }, { from: "x" }]) {
      const r = await pub("GET", q(params));
      assert.equal(r.status, 400, JSON.stringify(params));
      assert.equal(r.json.code, "VALIDATION_ERROR");
    }
  });
  await test("pagination publik: limit, page, totalPages, di luar jangkauan -> items kosong; limit > 100 -> 400", async () => {
    reset();
    for (let i = 1; i <= 7; i += 1) await create({ title: `Agenda ${i}`, startDate: `2026-09-0${i}`, endDate: `2026-09-0${i}`, status: "published" });
    const p1 = await pub("GET", q({ limit: 3 }));
    assert.deepEqual(titles(p1), ["Agenda 1", "Agenda 2", "Agenda 3"]);
    assert.deepEqual(p1.json.data.pagination, { page: 1, limit: 3, total: 7, totalPages: 3 });
    assert.deepEqual(titles(await pub("GET", q({ limit: 3, page: 3 }))), ["Agenda 7"]);
    const beyond = await pub("GET", q({ limit: 3, page: 99 }));
    assert.equal(beyond.status, 200);
    assert.deepEqual(beyond.json.data.items, []);
    assert.equal(beyond.json.data.pagination.total, 7);
    assert.equal((await pub("GET", q({ limit: 101 }))).status, 400);
    assert.equal((await pub("GET", q({ page: 0 }))).status, 400);
    assert.equal((await pub("GET", q({ page: "abc" }))).status, 400);
  });

  // =================================================================
  console.log("\n9. Penanganan error & kebocoran informasi");
  await test("kegagalan database -> 500 DATABASE_ERROR tanpa membocorkan detail internal", async () => {
    reset();
    faults.push({ table: "academic_calendar_events", op: "insert", error: { code: "XX000", message: "rahasia: relation \"academic_calendar_events\" host=db.internal" } });
    const r = await admin("POST", "", { body: valid() });
    assert.equal(r.status, 500);
    assert.equal(r.json.code, "DATABASE_ERROR");
    assert.ok(!r.text.includes("rahasia") && !r.text.includes("db.internal") && !r.text.includes("relation"), "detail DB bocor ke klien");
    faults.push({ table: "academic_calendar_events", op: "select", error: { code: "XX000", message: "rahasia select" } });
    const p = await pub("GET", "");
    assert.equal(p.status, 500);
    assert.ok(!p.text.includes("rahasia"));
  });
  await test("pelanggaran FK/CHECK dari database dipetakan ke 400 umum (bukan 500)", async () => {
    reset();
    faults.push({ table: "academic_calendar_events", op: "insert", error: { code: "23503", message: "fk detail internal" } });
    const r = await admin("POST", "", { body: valid() });
    assert.equal(r.status, 400);
    assert.ok(!r.text.includes("internal"));
  });
  await test("respons admin tidak memuat field database mentah (snake_case)", async () => {
    reset();
    const e = await admin("POST", "", { body: valid() });
    assert.ok(!/start_date|end_date|created_at|updated_at/.test(e.text));
  });

  // =================================================================
  console.log("\n10. Kompatibilitas dengan modul lain");
  await test("route lama tetap terpasang & dilindungi (announcements/news/accreditation admin -> 401 tanpa token)", async () => {
    for (const p of ["/api/admin/announcements", "/api/admin/news", "/api/admin/accreditation/study-programs", "/api/admin/banpt-regulations"]) {
      const r = await call("GET", p, { token: null });
      assert.equal(r.status, 401, p);
    }
    assert.equal((await call("GET", "/api/health", { token: null })).status, 200);
  });

  server.close();
  console.log(`\nTotal: ${passed + failed} pengujian — ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("Test crash:", e); process.exit(1); });
