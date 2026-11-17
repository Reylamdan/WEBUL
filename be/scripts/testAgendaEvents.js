// Pengujian OFFLINE fitur Agenda Acara (/api/admin/agenda-events dan /api/agenda-events).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   npm run test:agenda-events        (atau: node scripts/testAgendaEvents.js)

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
const MISSING = "123e4567-e89b-42d3-a456-426614174000";

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
  db.admins = [{ id: ADMIN_ID, name: "Admin Uji", email: "admin@example.com", is_active: true, last_login_at: null, created_at: new Date().toISOString() }];
  db.agenda_events = [];
  const app = loadFreshApp();
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const TOKEN = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID, expiresIn: "1h" });
  const call = async (method, url, { body, token = TOKEN } = {}) => {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* bukan JSON */ }
    return { status: res.status, json, text };
  };
  const admin = (m, u, o) => call(m, `/api/admin/agenda-events${u}`, o);
  const pub = (m, u, o) => call(m, `/api/agenda-events${u}`, { token: null, ...o });
  const q = (params) => "?" + new URLSearchParams(params).toString();
  const valid = (over = {}) => ({
    title: "Kuliah Tamu Kecerdasan Buatan",
    description: "Pembicara dari industri",
    startDate: "2026-12-01",
    endDate: "2026-12-01",
    startTime: "09:00",
    endTime: "11:30",
    location: "Aula Utama",
    organizer: "Prodi Informatika",
    registrationUrl: "https://example.com/daftar",
    category: "seminar-webinar",
    ...over,
  });
  const create = async (over) => {
    const r = await admin("POST", "", { body: valid(over) });
    assert.equal(r.status, 201, r.text);
    return r.json.data.event;
  };
  const reset = () => { db.agenda_events = []; };

  console.log("1. Kategori");
  await test("publik: 7 kategori sesuai daftar (tanpa 'Semua Acara')", async () => {
    const r = await pub("GET", "/categories");
    assert.equal(r.status, 200);
    const cats = r.json.data.categories;
    assert.deepEqual(cats.map((c) => c.name), [
      "Seminar & Webinar", "Workshop & Pelatihan", "Kemahasiswaan & UKM", "Lomba & Kompetisi",
      "Pengabdian Masyarakat", "Seremonial & Umum", "Lainnya",
    ]);
  });
  await test("admin: kategori butuh login", async () => {
    assert.equal((await admin("GET", "/categories", { token: null })).status, 401);
    assert.equal((await admin("GET", "/categories")).status, 200);
  });

  console.log("\n2. Admin: create");
  await test("membuat acara -> 201, default draft, bentuk respons benar", async () => {
    reset();
    const e = await create();
    assert.match(e.id, /^[0-9a-f-]{36}$/);
    assert.equal(e.status, "draft");
    assert.equal(e.startTime, "09:00");
    assert.equal(e.location, "Aula Utama");
    assert.deepEqual(e.category, { slug: "seminar-webinar", name: "Seminar & Webinar" });
    assert.ok(!/start_date|registration_url/.test(JSON.stringify(e)));
  });
  await test("field opsional boleh kosong; HTML dibersihkan", async () => {
    reset();
    const e = await create({ startTime: undefined, endTime: undefined, location: undefined, organizer: undefined, registrationUrl: undefined, description: undefined, title: "<b>Pentas</b> <script>x</script>Seni" });
    assert.equal(e.title, "Pentas Seni");
    assert.equal(e.startTime, null);
    assert.equal(e.registrationUrl, null);
  });
  await test("validasi: kategori tak dikenal, tanggal terbalik, jam terbalik, URL berbahaya, field asing -> 400", async () => {
    reset();
    for (const over of [
      { category: "tidak-ada" },
      { startDate: "2026-12-05", endDate: "2026-12-01" },
      { startTime: "12:00", endTime: "10:00" },
      { startTime: "25:00" },
      { registrationUrl: "javascript:alert(1)" },
      { registrationUrl: "bukan url" },
      { startDate: "2026-02-30", endDate: "2026-02-30" },
      { title: "ab" },
      { status: "archived" },
      { id: MISSING },
    ]) {
      const r = await admin("POST", "", { body: valid(over) });
      assert.equal(r.status, 400, JSON.stringify(over) + " -> " + r.status);
    }
    assert.equal(db.agenda_events.length, 0);
  });
  await test("acara multi-hari: jam selesai boleh lebih awal dari jam mulai", async () => {
    reset();
    const e = await create({ startDate: "2026-12-01", endDate: "2026-12-03", startTime: "18:00", endTime: "09:00" });
    assert.equal(e.endDate, "2026-12-03");
  });
  await test("tanpa token -> 401", async () => {
    assert.equal((await admin("POST", "", { body: valid(), token: null })).status, 401);
  });

  console.log("\n3. Admin: read/update/delete");
  await test("list admin memuat draft + published, filter status/kategori/search", async () => {
    reset();
    await create({ title: "Seminar AI" });
    await create({ title: "Lomba Desain", category: "lomba-kompetisi", status: "published" });
    assert.equal((await admin("GET", "")).json.data.items.length, 2);
    assert.equal((await admin("GET", q({ status: "published" }))).json.data.items.length, 1);
    assert.equal((await admin("GET", q({ category: "lomba-kompetisi" }))).json.data.items[0].title, "Lomba Desain");
    assert.equal((await admin("GET", q({ search: "seminar" }))).json.data.items.length, 1);
    assert.equal((await admin("GET", q({ category: "xx" }))).status, 400);
  });
  await test("detail: ada -> 200, tidak ada -> 404, id rusak -> 400", async () => {
    reset();
    const e = await create();
    assert.equal((await admin("GET", `/${e.id}`)).status, 200);
    assert.equal((await admin("GET", `/${MISSING}`)).status, 404);
    assert.equal((await admin("GET", "/abc")).status, 400);
  });
  await test("update parsial; mengosongkan field dengan null; tanpa perubahan -> 'Tidak ada perubahan'", async () => {
    reset();
    const e = await create();
    const a = await admin("PATCH", `/${e.id}`, { body: { title: "Judul Baru", location: null, status: "published" } });
    assert.equal(a.status, 200);
    assert.equal(a.json.data.event.title, "Judul Baru");
    assert.equal(a.json.data.event.location, null);
    assert.equal(a.json.data.event.status, "published");
    const same = await admin("PATCH", `/${e.id}`, { body: { title: "Judul Baru" } });
    assert.equal(same.json.message, "Tidak ada perubahan");
    assert.equal((await admin("PATCH", `/${e.id}`, { body: {} })).status, 400);
    assert.equal((await admin("PATCH", `/${MISSING}`, { body: { title: "Halo dunia" } })).status, 404);
  });
  await test("update: urutan tanggal/jam diperiksa terhadap data lama", async () => {
    reset();
    const e = await create({ startDate: "2026-12-10", endDate: "2026-12-12" });
    assert.equal((await admin("PATCH", `/${e.id}`, { body: { endDate: "2026-12-01" } })).status, 400);
    const one = await create({ startTime: "09:00", endTime: "11:00" });
    assert.equal((await admin("PATCH", `/${one.id}`, { body: { endTime: "08:00" } })).status, 400);
    assert.equal((await admin("PATCH", `/${one.id}`, { body: { endTime: "12:00" } })).status, 200);
  });
  await test("hapus: 200 lalu 404; hilang dari daftar", async () => {
    reset();
    const e = await create();
    assert.equal((await admin("DELETE", `/${e.id}`)).status, 200);
    assert.equal((await admin("DELETE", `/${e.id}`)).status, 404);
    assert.equal(db.agenda_events.length, 0);
  });

  console.log("\n4. Publik");
  await test("hanya published; draft tidak tampil di daftar maupun detail (404)", async () => {
    reset();
    const draft = await create({ title: "Rahasia Draft" });
    const live = await create({ title: "Acara Terbuka", status: "published" });
    const r = await pub("GET", "");
    assert.equal(r.json.data.items.length, 1);
    assert.equal(r.json.data.items[0].id, live.id);
    assert.ok(!("status" in r.json.data.items[0]));
    assert.equal((await pub("GET", `/${draft.id}`)).status, 404);
    assert.equal((await pub("GET", `/${live.id}`)).status, 200);
    assert.equal((await pub("GET", q({ status: "draft" }))).json.data.items.length, 1);
  });
  await test("filter kategori, rentang tanggal (irisan), search; urut tanggal naik", async () => {
    reset();
    await create({ title: "Lomba B", startDate: "2026-12-20", endDate: "2026-12-20", status: "published", category: "lomba-kompetisi" });
    await create({ title: "A Seminar", startDate: "2026-12-05", endDate: "2026-12-07", status: "published" });
    await create({ title: "Acara Lama", startDate: "2026-01-05", endDate: "2026-01-05", status: "published" });
    const all = await pub("GET", "");
    assert.deepEqual(all.json.data.items.map((i) => i.title), ["Acara Lama", "A Seminar", "Lomba B"]);
    assert.deepEqual((await pub("GET", q({ from: "2026-12-06" }))).json.data.items.map((i) => i.title), ["A Seminar", "Lomba B"]);
    assert.deepEqual((await pub("GET", q({ category: "lomba-kompetisi" }))).json.data.items.map((i) => i.title), ["Lomba B"]);
    assert.deepEqual((await pub("GET", q({ search: "seminar" }))).json.data.items.map((i) => i.title), ["A Seminar"]);
    assert.equal((await pub("GET", q({ category: "nope" }))).status, 400);
  });
  await test("paginasi melewati halaman terakhir -> daftar kosong, total benar", async () => {
    reset();
    await create({ status: "published" });
    const r = await pub("GET", q({ page: 5, limit: 10 }));
    assert.equal(r.status, 200);
    assert.equal(r.json.data.items.length, 0);
    assert.equal(r.json.data.pagination.total, 1);
  });
  await test("error database -> 500 umum tanpa detail; CHECK violation -> 400", async () => {
    reset();
    faults.push({ table: "agenda_events", op: "select", error: { code: "XX", message: "rahasia internal" } });
    const p = await pub("GET", "");
    assert.equal(p.status, 500);
    assert.ok(!p.text.includes("rahasia"));
    faults.push({ table: "agenda_events", op: "insert", error: { code: "23514", message: "check detail" } });
    assert.equal((await admin("POST", "", { body: valid() })).status, 400);
  });

  console.log("\n5. Kompatibilitas");
  await test("kalender akademik & route lain tidak terganggu", async () => {
    assert.equal((await call("GET", "/api/admin/academic-calendar", { token: null })).status, 401);
    assert.equal((await call("GET", "/api/health", { token: null })).status, 200);
  });

  server.close();
  console.log(`\nTotal: ${passed + failed} pengujian — ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("Test crash:", e); process.exit(1); });