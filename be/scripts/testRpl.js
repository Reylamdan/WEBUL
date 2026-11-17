// Pengujian OFFLINE fitur Jalur RPL (/api/admin/rpl dan /api/rpl).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testRpl.js

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
  db.rpl_settings = [];
  db.rpl_steps = [];
  db.rpl_requirements = [];
  db.rpl_schedules = [];
  db.rpl_fees = [];

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

  console.log("\n--- Uji Publik Jalur RPL ---");
  await test("GET /api/rpl berhasil saat DB kosong (fallback 6 alur, syarat, dokumen, jadwal, biaya)", async () => {
    const r = await call("GET", "/api/rpl", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Raih Sarjana dengan Pengalaman Kerja");
    assert.equal(r.body.data.steps.length, 6);
    assert.equal(r.body.data.requirements.length, 4);
    assert.equal(r.body.data.documents.length, 18);
    assert.equal(r.body.data.schedules.length, 3);
    assert.equal(r.body.data.fees.length, 3);
  });

  console.log("\n--- Uji Autentikasi Admin Jalur RPL ---");
  await test("Endpoint admin menolak tanpa token", async () => {
    const r = await call("GET", "/api/admin/rpl/settings", { token: null });
    assert.equal(r.status, 401);
  });

  console.log("\n--- Uji Pengaturan Jalur RPL ---");
  await test("GET /api/admin/rpl/settings mengembalikan data pengaturan", async () => {
    const r = await call("GET", "/api/admin/rpl/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroEyebrow, "JALUR PENERIMAAN MAHASISWA BARU");
  });

  await test("PUT /api/admin/rpl/settings memperbarui teks & batas pendaftaran", async () => {
    const r = await call("PUT", "/api/admin/rpl/settings", {
      body: {
        heroTitle: "Jalur Rekognisi Pembelajaran Lampau (RPL) 2026/2027",
        registrationDeadline: "31 Agustus 2026",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Jalur Rekognisi Pembelajaran Lampau (RPL) 2026/2027");
    assert.equal(r.body.data.settings.registrationDeadline, "31 Agustus 2026");
  });

  console.log("\n--- Uji CRUD Alur Pendaftaran (Steps) ---");
  let stepId = null;
  await test("POST /api/admin/rpl/steps menambah tahapan alur", async () => {
    const r = await call("POST", "/api/admin/rpl/steps", {
      body: {
        title: "Konsultasi Pra-Asesmen",
        description: "Konsultasikan portofolio kerja Anda dengan konselor PMB.",
        sortOrder: 1,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.step.title, "Konsultasi Pra-Asesmen");
    stepId = r.body.data.step.id;
  });

  await test("GET & PATCH /api/admin/rpl/steps/:id", async () => {
    const r = await call("PATCH", `/api/admin/rpl/steps/${stepId}`, {
      body: { title: "Konsultasi Portofolio Pra-Asesmen" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.step.title, "Konsultasi Portofolio Pra-Asesmen");
  });

  await test("DELETE /api/admin/rpl/steps/:id", async () => {
    const r = await call("DELETE", `/api/admin/rpl/steps/${stepId}`);
    assert.equal(r.status, 200);
  });

  console.log("\n--- Uji CRUD Syarat & Dokumen ---");
  let reqId = null;
  await test("POST /api/admin/rpl/requirements menambah syarat", async () => {
    const r = await call("POST", "/api/admin/rpl/requirements", {
      body: {
        type: "syarat",
        title: "Memiliki pengalaman kerja minimal 2 tahun",
        sortOrder: 1,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.item.type, "syarat");
    reqId = r.body.data.item.id;
  });

  await test("DELETE /api/admin/rpl/requirements/:id", async () => {
    const r = await call("DELETE", `/api/admin/rpl/requirements/${reqId}`);
    assert.equal(r.status, 200);
  });

  console.log("\n--- Uji CRUD Jadwal Kuliah & Biaya ---");
  let schedId = null;
  await test("POST & DELETE /api/admin/rpl/schedules", async () => {
    const r1 = await call("POST", "/api/admin/rpl/schedules", {
      body: { day: "Minggu", hours: "09:00 - 17:00 WIB", sortOrder: 4, status: "published" },
    });
    assert.equal(r1.status, 201);
    schedId = r1.body.data.item.id;

    const r2 = await call("DELETE", `/api/admin/rpl/schedules/${schedId}`);
    assert.equal(r2.status, 200);
  });

  let feeId = null;
  await test("POST & DELETE /api/admin/rpl/fees", async () => {
    const r1 = await call("POST", "/api/admin/rpl/fees", {
      body: { type: "Jas Almamater", amount: "Rp350.000", sortOrder: 4, status: "published" },
    });
    assert.equal(r1.status, 201);
    feeId = r1.body.data.item.id;

    const r2 = await call("DELETE", `/api/admin/rpl/fees/${feeId}`);
    assert.equal(r2.status, 200);
  });

  server.close();

  console.log(`\nHasil pengujian RPL: ${passed} lulus, ${failed} gagal.`);
  if (failed > 0) {
    if (logs.length > 0) console.log("Logs:", logs.slice(0, 10).join("\n"));
    process.exit(1);
  }
})();

