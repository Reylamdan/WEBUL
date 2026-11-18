// Pengujian OFFLINE fitur Mahasiswa Asing (/api/admin/foreign-students dan /api/foreign-students).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testForeignStudents.js

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
  db.foreign_student_settings = [];
  db.foreign_student_requirements = [];

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

  console.log("=== Pengujian Endpoint Mahasiswa Asing ===");

  // 1. Publik fallback default saat tabel masih kosong
  await test("GET /api/foreign-students -> fallback default saat database kosong", async () => {
    const r = await call("GET", "/api/foreign-students", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Mahasiswa Asing");
    assert.equal(r.body.data.settings.introEyebrow, "PENERIMAAN MAHASISWA");
    assert.equal(Array.isArray(r.body.data.requirements), true);
    assert.equal(r.body.data.requirements.length, 9);
    assert.equal(r.body.data.requirements[0].description, "Paspor");
  });

  // 2. Admin settings: GET
  await test("GET /api/admin/foreign-students/settings -> baca pengaturan default", async () => {
    const r = await call("GET", "/api/admin/foreign-students/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Mahasiswa Asing");
    assert.equal(r.body.data.settings.referenceUrl, "https://izinbelajar.kemdiktisaintek.go.id");
  });

  // 3. Admin settings: PUT
  await test("PUT /api/admin/foreign-students/settings -> perbarui pengaturan", async () => {
    const r = await call("PUT", "/api/admin/foreign-students/settings", {
      body: {
        heroTitle: "Penerimaan Mahasiswa Asing",
        introTitle: "Selamat Datang Mahasiswa Internasional",
        referenceLabel: "izinbelajar.kemdiktisaintek.go.id",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Penerimaan Mahasiswa Asing");
    assert.equal(r.body.data.settings.introTitle, "Selamat Datang Mahasiswa Internasional");
  });

  // 4. Admin requirements: POST create
  let createdId = null;
  await test("POST /api/admin/foreign-students/requirements -> buat butir persyaratan baru", async () => {
    const r = await call("POST", "/api/admin/foreign-students/requirements", {
      body: {
        title: "Asuransi Kesehatan",
        description: "Bukti kepemilikan asuransi kesehatan yang berlaku internasional atau di Indonesia",
        sortOrder: 10,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.requirement.title, "Asuransi Kesehatan");
    assert.equal(r.body.data.requirement.sortOrder, 10);
    assert.equal(r.body.data.requirement.status, "published");
    createdId = r.body.data.requirement.id;
    assert.ok(createdId);
  });

  // 5. Admin requirements: GET list
  await test("GET /api/admin/foreign-students/requirements -> daftar butir persyaratan admin", async () => {
    const r = await call("GET", "/api/admin/foreign-students/requirements");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length >= 1, true);
    assert.equal(r.body.data.pagination.total >= 1, true);
  });

  // 6. Admin requirements: PATCH update
  await test("PATCH /api/admin/foreign-students/requirements/:id -> perbarui butir persyaratan", async () => {
    const r = await call("PATCH", `/api/admin/foreign-students/requirements/${createdId}`, {
      body: {
        title: "Asuransi Kesehatan Internasional",
        status: "draft",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.requirement.title, "Asuransi Kesehatan Internasional");
    assert.equal(r.body.data.requirement.status, "draft");
  });

  // 7. Admin requirements: DELETE
  await test("DELETE /api/admin/foreign-students/requirements/:id -> hapus butir persyaratan", async () => {
    const r = await call("DELETE", `/api/admin/foreign-students/requirements/${createdId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.id, createdId);

    const check = await call("GET", `/api/admin/foreign-students/requirements/${createdId}`);
    assert.equal(check.status, 404);
  });

  // 8. Auth guard check
  await test("GET /api/admin/foreign-students/settings -> ditolak tanpa token", async () => {
    const r = await call("GET", "/api/admin/foreign-students/settings", { token: null });
    assert.equal(r.status, 401);
  });

  await new Promise((resolve) => server.close(resolve));

  console.log(`\nSelesai: ${passed} lolos, ${failed} gagal.`);
  process.exit(failed > 0 ? 1 : 0);
})();

