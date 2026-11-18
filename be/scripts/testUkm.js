// Pengujian OFFLINE fitur Kegiatan Mahasiswa / UKM (/api/admin/ukm dan /api/ukm).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testUkm.js

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
const { db } = sb;

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
  db.admins = [
    {
      id: ADMIN_ID,
      name: "Admin Uji",
      email: "admin@example.com",
      is_active: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    },
  ];
  db.ukm_settings = [];
  db.ukm_items = [];

  const app = loadFreshApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const TOKEN = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID, expiresIn: "1h" }
  );

  const call = async (method, url, { body, token = TOKEN } = {}) => {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${base}${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, ok: res.ok, body: json };
  };

  console.log("=== Pengujian Endpoint Kegiatan Mahasiswa (UKM) ===");

  // 1. Publik fallback default saat tabel masih kosong
  await test("GET /api/ukm -> fallback default saat database kosong", async () => {
    const r = await call("GET", "/api/ukm", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Kegiatan Mahasiswa (UKM)");
    assert.equal(Array.isArray(r.body.data.items), true);
    assert.equal(r.body.data.items.length, 5);
    assert.equal(r.body.data.items[0].title, "Seni dan kreativitas");
    assert.equal(Array.isArray(r.body.data.categories), true);
    assert.equal(r.body.data.categories.length, 5);
  });

  // 2. Admin settings: GET
  await test("GET /api/admin/ukm/settings -> baca pengaturan default", async () => {
    const r = await call("GET", "/api/admin/ukm/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Kegiatan Mahasiswa (UKM)");
    assert.equal(r.body.data.settings.ctaButtonLabel, "Informasi Pendaftaran");
  });

  // 3. Admin settings: PUT
  await test("PUT /api/admin/ukm/settings -> perbarui pengaturan", async () => {
    const r = await call("PUT", "/api/admin/ukm/settings", {
      body: {
        heroTitle: "Unit Kegiatan Mahasiswa & Komunitas",
        ctaTitle: "Ingin Mengembangkan Potensimu?",
        modalContactEmail: "kemahasiswaan@universitaslia.ac.id",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Unit Kegiatan Mahasiswa & Komunitas");
    assert.equal(r.body.data.settings.ctaTitle, "Ingin Mengembangkan Potensimu?");
  });

  // 4. Admin items: POST create
  let createdId = null;
  await test("POST /api/admin/ukm/items -> buat data UKM baru", async () => {
    const r = await call("POST", "/api/admin/ukm/items", {
      body: {
        title: "Klub Robotika & AI",
        category: "teknologi",
        description: "Wadah riset dan kompetisi robotika, otomasi, dan kecerdasan buatan mahasiswa.",
        meta: "Latihan rutin tiap Sabtu",
        sortOrder: 10,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.item.title, "Klub Robotika & AI");
    assert.equal(r.body.data.item.category, "teknologi");
    assert.equal(r.body.data.item.categoryLabel, "Teknologi");
    createdId = r.body.data.item.id;
    assert.ok(createdId);
  });

  // 5. Admin items: GET list
  await test("GET /api/admin/ukm/items -> daftar item UKM", async () => {
    const r = await call("GET", "/api/admin/ukm/items");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length >= 1, true);
    assert.equal(r.body.data.pagination.total >= 1, true);
  });

  // 6. Admin items: PATCH update
  await test("PATCH /api/admin/ukm/items/:id -> perbarui item UKM", async () => {
    const r = await call("PATCH", `/api/admin/ukm/items/${createdId}`, {
      body: {
        title: "Klub Robotika & IoT",
        status: "draft",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.item.title, "Klub Robotika & IoT");
    assert.equal(r.body.data.item.status, "draft");
  });

  // 7. Admin items: DELETE
  await test("DELETE /api/admin/ukm/items/:id -> hapus item UKM", async () => {
    const r = await call("DELETE", `/api/admin/ukm/items/${createdId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.id, createdId);

    const check = await call("GET", `/api/admin/ukm/items/${createdId}`);
    assert.equal(check.status, 404);
  });

  // 8. Auth guard check
  await test("GET /api/admin/ukm/settings -> ditolak tanpa token", async () => {
    const r = await call("GET", "/api/admin/ukm/settings", { token: null });
    assert.equal(r.status, 401);
  });

  await new Promise((resolve) => server.close(resolve));

  console.log(`\nSelesai: ${passed} lolos, ${failed} gagal.`);
  process.exit(failed > 0 ? 1 : 0);
})();

