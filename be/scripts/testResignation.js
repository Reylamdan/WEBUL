// Pengujian OFFLINE fitur Pengunduran Diri (/api/admin/resignation dan /api/resignation).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testResignation.js

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
  db.resignation_settings = [];
  db.resignation_terms = [];

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

  console.log("\n--- Uji Publik Pengunduran Diri ---");
  await test("GET /api/resignation berhasil saat DB kosong (fallback 3 syarat & ketentuan)", async () => {
    const r = await call("GET", "/api/resignation", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Pengunduran Diri");
    assert.equal(r.body.data.terms.length, 3);
    assert.equal(r.body.data.terms[0].refundPercentage, 80);
  });

  console.log("\n--- Uji Autentikasi Admin Pengunduran Diri ---");
  await test("Endpoint admin menolak tanpa token", async () => {
    const r = await call("GET", "/api/admin/resignation/settings", { token: null });
    assert.equal(r.status, 401);
  });

  console.log("\n--- Uji Pengaturan Pengunduran Diri ---");
  await test("GET /api/admin/resignation/settings mengembalikan data pengaturan", async () => {
    const r = await call("GET", "/api/admin/resignation/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroEyebrow, "INFORMASI PENTING");
  });

  await test("PUT /api/admin/resignation/settings memperbarui judul & teks", async () => {
    const r = await call("PUT", "/api/admin/resignation/settings", {
      body: {
        heroTitle: "Ketentuan Pengunduran Diri Mahasiswa",
        sectionTitle: "Tata Cara & Pengembalian Dana (Refund)",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Ketentuan Pengunduran Diri Mahasiswa");
    assert.equal(r.body.data.settings.sectionTitle, "Tata Cara & Pengembalian Dana (Refund)");
  });

  console.log("\n--- Uji CRUD Syarat & Ketentuan (Terms) ---");
  let termId = null;
  await test("POST /api/admin/resignation/terms membuat butir ketentuan baru", async () => {
    const r = await call("POST", "/api/admin/resignation/terms", {
      body: {
        title: "Pindah Domisili Luar Negeri",
        description: "Mahasiswa yang pindah domisili ke luar negeri wajib melampirkan visa dan tiket penerbangan.",
        refundPercentage: 50,
        sortOrder: 4,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.term.title, "Pindah Domisili Luar Negeri");
    assert.equal(r.body.data.term.refundPercentage, 50);
    termId = r.body.data.term.id;
  });

  await test("GET & PATCH /api/admin/resignation/terms/:id", async () => {
    const r = await call("PATCH", `/api/admin/resignation/terms/${termId}`, {
      body: {
        refundPercentage: 60,
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.term.refundPercentage, 60);
  });

  await test("DELETE /api/admin/resignation/terms/:id", async () => {
    const r = await call("DELETE", `/api/admin/resignation/terms/${termId}`);
    assert.equal(r.status, 200);
  });

  server.close();

  console.log(`\nHasil pengujian Pengunduran Diri: ${passed} lulus, ${failed} gagal.`);
  if (failed > 0) {
    if (logs.length > 0) console.log("Logs:", logs.slice(0, 10).join("\n"));
    process.exit(1);
  }
})();

