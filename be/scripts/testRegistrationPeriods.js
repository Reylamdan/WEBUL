// Pengujian OFFLINE fitur Periode Pendaftaran (/api/admin/registration-periods dan /api/registration-periods).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testRegistrationPeriods.js

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
  db.registration_period_settings = [];
  db.registration_waves = [];

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
    if (!isForm && body) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${base}${url}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
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

  console.log("\n--- Uji Publik Periode Pendaftaran ---");
  await test("GET /api/registration-periods berhasil saat DB masih kosong (fallback 3 gelombang)", async () => {
    const r = await call("GET", "/api/registration-periods", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Periode Pendaftaran");
    assert.equal(r.body.data.waves.length, 3);
    assert.equal(r.body.data.waves[0].name, "Gelombang 1");
    assert.equal(r.body.data.waves[0].activities.length, 3);
  });

  console.log("\n--- Uji Autentikasi Admin Periode Pendaftaran ---");
  await test("Endpoint admin menolak tanpa token", async () => {
    const r = await call("GET", "/api/admin/registration-periods/settings", { token: null });
    assert.equal(r.status, 401);
  });

  console.log("\n--- Uji Pengaturan Header & Teks Periode Pendaftaran ---");
  await test("GET /api/admin/registration-periods/settings mengembalikan data pengaturan", async () => {
    const r = await call("GET", "/api/admin/registration-periods/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroEyebrow, "PENERIMAAN MAHASISWA BARU");
  });

  await test("PUT /api/admin/registration-periods/settings memperbarui teks", async () => {
    const r = await call("PUT", "/api/admin/registration-periods/settings", {
      body: {
        heroTitle: "Jadwal & Periode PMB",
        sectionTitle: "Alur Seleksi Masuk",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Jadwal & Periode PMB");
    assert.equal(r.body.data.settings.sectionTitle, "Alur Seleksi Masuk");
  });

  console.log("\n--- Uji CRUD Gelombang Pendaftaran ---");
  let createdWaveId = null;

  await test("POST /api/admin/registration-periods/waves membuat gelombang baru", async () => {
    const r = await call("POST", "/api/admin/registration-periods/waves", {
      body: {
        name: "Jalur Prestasi",
        label: "Bebas tes tertulis",
        activities: [
          { name: "Pendaftaran Berkas", time: "01 Januari – 28 Februari 2027" },
          { name: "Verifikasi Prestasi", time: "05 Maret 2027" },
          { name: "Pengumuman", time: "10 Maret 2027" },
        ],
        sortOrder: 0,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.wave.name, "Jalur Prestasi");
    assert.equal(r.body.data.wave.activities.length, 3);
    createdWaveId = r.body.data.wave.id;
    assert.ok(createdWaveId);
  });

  await test("GET /api/admin/registration-periods/waves mengembalikan daftar", async () => {
    const r = await call("GET", "/api/admin/registration-periods/waves");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 1);
    assert.equal(r.body.data.items[0].name, "Jalur Prestasi");
  });

  await test("PATCH /api/admin/registration-periods/waves/:id mengubah data gelombang", async () => {
    const r = await call("PATCH", `/api/admin/registration-periods/waves/${createdWaveId}`, {
      body: {
        label: "Beasiswa Penuh & Bebas Tes",
        status: "draft",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.wave.label, "Beasiswa Penuh & Bebas Tes");
    assert.equal(r.body.data.wave.status, "draft");
  });

  await test("GET /api/registration-periods publik hanya mengembalikan gelombang published", async () => {
    // Tambahkan 1 gelombang berstatus published
    await call("POST", "/api/admin/registration-periods/waves", {
      body: {
        name: "Gelombang Reguler",
        label: "Jalur Umum",
        activities: [{ name: "Pendaftaran Online", time: "01 Mei – 30 Juni 2027" }],
        sortOrder: 1,
        status: "published",
      },
    });

    const r = await call("GET", "/api/registration-periods", { token: null });
    assert.equal(r.status, 200);
    // Jalur Prestasi (draft) tidak boleh masuk, hanya Gelombang Reguler (published)
    assert.equal(r.body.data.waves.length, 1);
    assert.equal(r.body.data.waves[0].name, "Gelombang Reguler");
  });

  await test("DELETE /api/admin/registration-periods/waves/:id menghapus gelombang", async () => {
    const r = await call("DELETE", `/api/admin/registration-periods/waves/${createdWaveId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
  });

  await test("DELETE gelombang yang sudah dihapus mengembalikan 404", async () => {
    const r = await call("DELETE", `/api/admin/registration-periods/waves/${createdWaveId}`);
    assert.equal(r.status, 404);
  });

  server.close();
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal.\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
