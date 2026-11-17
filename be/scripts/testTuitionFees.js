// Pengujian OFFLINE fitur Biaya Kuliah (/api/admin/tuition-fees dan /api/tuition-fees).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testTuitionFees.js

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
  db.tuition_settings = [];
  db.tuition_waves = [];

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

  console.log("\n--- Uji Publik Biaya Kuliah ---");
  await test("GET /api/tuition-fees berhasil saat DB masih kosong (fallback 3 gelombang & prodi)", async () => {
    const r = await call("GET", "/api/tuition-fees", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Biaya Kuliah");
    assert.equal(r.body.data.studyPrograms.length, 7);
    assert.equal(r.body.data.waves.length, 3);
    assert.equal(r.body.data.waves[0].name, "Gelombang 1");
    assert.equal(r.body.data.waves[0].fees.length, 7);
    assert.equal(r.body.data.waves[0].tuition.length, 7);
  });

  console.log("\n--- Uji Autentikasi Admin Biaya Kuliah ---");
  await test("Endpoint admin menolak tanpa token", async () => {
    const r = await call("GET", "/api/admin/tuition-fees/settings", { token: null });
    assert.equal(r.status, 401);
  });

  console.log("\n--- Uji Pengaturan Header & Prodi Biaya Kuliah ---");
  await test("GET /api/admin/tuition-fees/settings mengembalikan data pengaturan", async () => {
    const r = await call("GET", "/api/admin/tuition-fees/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroEyebrow, "PENERIMAAN MAHASISWA BARU");
    assert.equal(r.body.data.settings.studyPrograms.length, 7);
  });

  await test("PUT /api/admin/tuition-fees/settings memperbarui teks & daftar prodi", async () => {
    const r = await call("PUT", "/api/admin/tuition-fees/settings", {
      body: {
        heroTitle: "Rincian Biaya Kuliah Universitas LIA",
        sectionTitle: "UKT Berdasarkan Gelombang Pendaftaran",
        studyPrograms: ["Informatika", "Sistem Informasi", "Bisnis Digital"],
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Rincian Biaya Kuliah Universitas LIA");
    assert.equal(r.body.data.settings.sectionTitle, "UKT Berdasarkan Gelombang Pendaftaran");
    assert.equal(r.body.data.settings.studyPrograms.length, 3);
  });

  console.log("\n--- Uji CRUD Gelombang Biaya Kuliah ---");
  let createdWaveId = null;

  await test("POST /api/admin/tuition-fees/waves membuat gelombang baru", async () => {
    const r = await call("POST", "/api/admin/tuition-fees/waves", {
      body: {
        name: "Gelombang Reguler Khusus",
        period: "01 Oktober – 31 Desember 2026",
        fees: [
          { program: "Informatika", amount: 5500000 },
          { program: "Sistem Informasi", amount: 5200000 },
        ],
        sortOrder: 10,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.wave.name, "Gelombang Reguler Khusus");
    assert.equal(r.body.data.wave.fees.length, 2);
    assert.equal(r.body.data.wave.tuition.length, 2);
    assert.equal(r.body.data.wave.status, "published");
    createdWaveId = r.body.data.wave.id;
  });

  await test("POST menolak nama kosong atau nominal negatif", async () => {
    const r1 = await call("POST", "/api/admin/tuition-fees/waves", {
      body: { name: "", period: "01 Jan 2026", fees: [] },
    });
    assert.equal(r1.status, 400);

    const r2 = await call("POST", "/api/admin/tuition-fees/waves", {
      body: {
        name: "Gelombang Test",
        period: "01 Jan 2026",
        fees: [{ program: "Informatika", amount: -100 }],
      },
    });
    assert.equal(r2.status, 400);
  });

  await test("GET /api/admin/tuition-fees/waves/:id membaca detail", async () => {
    const r = await call("GET", `/api/admin/tuition-fees/waves/${createdWaveId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.wave.name, "Gelombang Reguler Khusus");
  });

  await test("PATCH /api/admin/tuition-fees/waves/:id memperbarui gelombang", async () => {
    const r = await call("PATCH", `/api/admin/tuition-fees/waves/${createdWaveId}`, {
      body: {
        name: "Gelombang Reguler Khusus Diperbarui",
        period: "01 Oktober – 15 Desember 2026",
        fees: [
          { program: "Informatika", amount: 5700000 },
          { program: "Sistem Informasi", amount: 5300000 },
        ],
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.wave.name, "Gelombang Reguler Khusus Diperbarui");
    assert.equal(r.body.data.wave.fees[0].amount, 5700000);
  });

  await test("GET /api/admin/tuition-fees/waves mendukung pencarian & pagination", async () => {
    const r = await call("GET", "/api/admin/tuition-fees/waves?search=Diperbarui");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 1);
  });

  await test("DELETE /api/admin/tuition-fees/waves/:id menghapus gelombang", async () => {
    const r = await call("DELETE", `/api/admin/tuition-fees/waves/${createdWaveId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);

    const rGet = await call("GET", `/api/admin/tuition-fees/waves/${createdWaveId}`);
    assert.equal(rGet.status, 404);
  });

  server.close();

  console.log(`\nHasil pengujian: ${passed} lulus, ${failed} gagal.`);
  if (failed > 0) {
    if (logs.length > 0) console.log("Logs:", logs.slice(0, 10).join("\n"));
    process.exit(1);
  }
})();

