// Pengujian OFFLINE fitur Fasilitas Kampus (/api/admin/facilities dan /api/facilities).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testFacilities.js

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
  db.campus_facility_settings = [];
  db.campus_facilities = [];

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
    const isForm = body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${base}${url}`, {
      method,
      headers: isForm ? (token ? { Authorization: `Bearer ${token}` } : {}) : headers,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  };

  console.log("\n--- Uji Publik Fasilitas Kampus ---");

  await test("GET /api/facilities berhasil saat DB masih kosong (fallback 6 default)", async () => {
    const { status, json } = await call("GET", "/api/facilities", { token: null });
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.settings.heroTitle, "Fasilitas Kampus");
    assert.equal(json.data.items.length, 6);
    assert.equal(json.data.items[0].title, "Perpustakaan");
  });

  console.log("\n--- Uji Autentikasi Admin Fasilitas ---");

  await test("Endpoint admin fasilitas menolak tanpa token", async () => {
    const { status } = await call("GET", "/api/admin/facilities", { token: null });
    assert.equal(status, 401);
  });

  console.log("\n--- Uji Pengaturan Header Fasilitas ---");

  await test("GET /api/admin/facilities/settings mengembalikan data pengaturan", async () => {
    const { status, json } = await call("GET", "/api/admin/facilities/settings");
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.settings.heroTitle, "Fasilitas Kampus");
  });

  await test("PUT /api/admin/facilities/settings memperbarui pengaturan", async () => {
    const { status, json } = await call("PUT", "/api/admin/facilities/settings", {
      body: {
        heroTitle: "Fasilitas Kampus Terpadu LIA",
        galleryTitle: "Sarana Pembelajaran Modern",
      },
    });
    assert.equal(status, 200);
    assert.equal(json.data.settings.heroTitle, "Fasilitas Kampus Terpadu LIA");
    assert.equal(json.data.settings.galleryTitle, "Sarana Pembelajaran Modern");
  });

  console.log("\n--- Uji CRUD Fasilitas Kampus ---");

  let facilityId = null;

  await test("POST /api/admin/facilities membuat fasilitas baru", async () => {
    const { status, json } = await call("POST", "/api/admin/facilities", {
      body: {
        title: "Laboratorium Multimedia & Bahasa",
        description: "Dilengkapi 40 komputer modern dan headset peredam bising.",
        sortOrder: 1,
        status: "published",
      },
    });
    assert.equal(status, 201);
    assert.equal(json.success, true);
    assert.equal(json.data.facility.title, "Laboratorium Multimedia & Bahasa");
    assert.equal(json.data.facility.status, "published");
    facilityId = json.data.facility.id;
  });

  await test("GET /api/admin/facilities mengembalikan daftar", async () => {
    const { status, json } = await call("GET", "/api/admin/facilities");
    assert.equal(status, 200);
    assert.equal(json.data.items.length, 1);
    assert.equal(json.data.items[0].id, facilityId);
  });

  await test("PATCH /api/admin/facilities/:id mengubah data fasilitas", async () => {
    const { status, json } = await call("PATCH", `/api/admin/facilities/${facilityId}`, {
      body: {
        title: "Laboratorium Multimedia Canggih",
        status: "draft",
      },
    });
    assert.equal(status, 200);
    assert.equal(json.data.facility.title, "Laboratorium Multimedia Canggih");
    assert.equal(json.data.facility.status, "draft");
  });

  await test("GET /api/facilities di publik hanya mengembalikan fasilitas published", async () => {
    const { status, json } = await call("GET", "/api/facilities", { token: null });
    assert.equal(status, 200);
    assert.equal(json.data.items.length, 0); // karena satu-satunya fasilitas di DB diubah jadi draft
    assert.equal(json.data.settings.heroTitle, "Fasilitas Kampus Terpadu LIA");
  });

  await test("DELETE /api/admin/facilities/:id menghapus fasilitas", async () => {
    const { status, json } = await call("DELETE", `/api/admin/facilities/${facilityId}`);
    assert.equal(status, 200);
    assert.equal(json.success, true);
  });

  await test("DELETE fasilitas yang sudah dihapus mengembalikan 404", async () => {
    const { status } = await call("DELETE", `/api/admin/facilities/${facilityId}`);
    assert.equal(status, 404);
  });

  server.close();
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal.\n`);
  process.exit(failed > 0 ? 1 : 0);
})();

