// Pengujian OFFLINE fitur Laporan Tahunan Rektor (/api/admin/rector-reports dan /api/rector-reports).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testRectorReports.js

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
  db.rector_report_settings = [];
  db.rector_reports = [];

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

  console.log("\n=== Pengujian Endpoint Laporan Tahunan Rektor ===\n");

  // 1. Publik: data default saat tabel kosong
  await test("GET /api/rector-reports mengembalikan data publik default", async () => {
    const r = await call("GET", "/api/rector-reports", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.ok(r.body.data.settings);
    assert.equal(r.body.data.settings.heroTitle, "Laporan Tahunan Rektor Universitas LIA");
    assert.ok(Array.isArray(r.body.data.reports));
    assert.equal(r.body.data.reports.length, 2);
    assert.equal(r.body.data.reports[0].year, 2024);
  });

  // 2. Admin: auth check
  await test("GET /api/admin/rector-reports ditolak jika tanpa token", async () => {
    const r = await call("GET", "/api/admin/rector-reports", { token: null });
    assert.equal(r.status, 401);
  });

  // 3. Admin: ambil pengaturan
  await test("GET /api/admin/rector-reports/settings mengembalikan pengaturan", async () => {
    const r = await call("GET", "/api/admin/rector-reports/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Laporan Tahunan Rektor Universitas LIA");
  });

  // 4. Admin: update pengaturan
  await test("PUT /api/admin/rector-reports/settings memperbarui teks hero", async () => {
    const r = await call("PUT", "/api/admin/rector-reports/settings", {
      body: {
        heroTitle: "Laporan Tahunan Rektor Terbaru",
        contactEmail: "rektorat@universitaslia.ac.id",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Laporan Tahunan Rektor Terbaru");
    assert.equal(r.body.data.settings.contactEmail, "rektorat@universitaslia.ac.id");
  });

  // 5. Admin: buat laporan tahunan baru
  let createdId = null;
  await test("POST /api/admin/rector-reports membuat laporan baru", async () => {
    const r = await call("POST", "/api/admin/rector-reports", {
      body: {
        year: 2026,
        title: "Laporan Tahunan Rektor 2026",
        description: "Laporan pertanggungjawaban rektor tahun akademik 2025/2026.",
        coverUrl: "/Laporantahunanrektor2026.jpg",
        sortOrder: 3,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.report.year, 2026);
    assert.equal(r.body.data.report.title, "Laporan Tahunan Rektor 2026");
    createdId = r.body.data.report.id;
    assert.ok(createdId);
  });

  // 6. Admin: ambil detail laporan
  await test("GET /api/admin/rector-reports/:id mengembalikan detail laporan", async () => {
    const r = await call("GET", `/api/admin/rector-reports/${createdId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.report.id, createdId);
    assert.equal(r.body.data.report.year, 2026);
  });

  // 7. Admin: update laporan
  await test("PATCH /api/admin/rector-reports/:id memperbarui data laporan", async () => {
    const r = await call("PATCH", `/api/admin/rector-reports/${createdId}`, {
      body: {
        description: "Deskripsi diperbarui untuk laporan tahunan 2026.",
        status: "draft",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.report.description, "Deskripsi diperbarui untuk laporan tahunan 2026.");
    assert.equal(r.body.data.report.status, "draft");
  });

  // 8. Admin: daftar laporan dengan filter
  await test("GET /api/admin/rector-reports mengambil daftar laporan", async () => {
    const r = await call("GET", "/api/admin/rector-reports?page=1&limit=10");
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.ok(Array.isArray(r.body.data.items));
    assert.ok(r.body.data.items.length >= 1);
  });

  // 9. Admin: hapus laporan
  await test("DELETE /api/admin/rector-reports/:id menghapus laporan", async () => {
    const r = await call("DELETE", `/api/admin/rector-reports/${createdId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
  });

  server.close();
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal.\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
