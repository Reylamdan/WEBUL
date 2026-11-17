// Pengujian OFFLINE fitur Kurikulum (/api/admin/curriculum dan /api/curriculum).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testCurriculum.js

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
  db.curriculum_settings = [];
  db.curriculum_programs = [];

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

  console.log("\n--- Uji Publik Kurikulum ---");

  await test("GET /api/curriculum berhasil saat DB masih kosong (fallback 7 program)", async () => {
    const { status, json } = await call("GET", "/api/curriculum", { token: null });
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.settings.heroTitle, "Kurikulum");
    assert.equal(json.data.programs.length, 7);
    assert.equal(json.data.programs[0].name, "D3 Bahasa Inggris");
  });

  console.log("\n--- Uji Autentikasi Admin Kurikulum ---");

  await test("Endpoint admin kurikulum menolak tanpa token", async () => {
    const { status } = await call("GET", "/api/admin/curriculum/settings", { token: null });
    assert.equal(status, 401);
  });

  console.log("\n--- Uji Pengaturan Teks Kurikulum & OBE ---");

  await test("GET /api/admin/curriculum/settings mengembalikan data pengaturan", async () => {
    const { status, json } = await call("GET", "/api/admin/curriculum/settings");
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.settings.heroTitle, "Kurikulum");
    assert.equal(json.data.settings.obeTitle, "Outcome-Based Education (OBE)");
  });

  await test("PUT /api/admin/curriculum/settings memperbarui teks", async () => {
    const { status, json } = await call("PUT", "/api/admin/curriculum/settings", {
      body: {
        heroTitle: "Kurikulum Berbasis OBE Universitas LIA",
        obeLead: "Capaian pembelajaran lulusan berdaya saing global.",
      },
    });
    assert.equal(status, 200);
    assert.equal(json.data.settings.heroTitle, "Kurikulum Berbasis OBE Universitas LIA");
    assert.equal(json.data.settings.obeLead, "Capaian pembelajaran lulusan berdaya saing global.");
  });

  console.log("\n--- Uji CRUD Program Studi Kurikulum ---");

  let programId = null;

  await test("POST /api/admin/curriculum/programs membuat program studi baru", async () => {
    const { status, json } = await call("POST", "/api/admin/curriculum/programs", {
      body: {
        name: "S1 Sains Data",
        href: "/akademik/programstudi/sainsdanbisnis/s1-sains-data",
        focus: "Statistika terapan, machine learning, dan big data",
        components: "Mata kuliah dasar, keahlian data, dan tugas akhir",
        sortOrder: 8,
        status: "published",
      },
    });
    assert.equal(status, 201);
    assert.equal(json.success, true);
    assert.equal(json.data.program.name, "S1 Sains Data");
    assert.equal(json.data.program.status, "published");
    programId = json.data.program.id;
  });

  await test("GET /api/admin/curriculum/programs mengembalikan daftar", async () => {
    const { status, json } = await call("GET", "/api/admin/curriculum/programs");
    assert.equal(status, 200);
    assert.equal(json.data.items.length, 1);
    assert.equal(json.data.items[0].id, programId);
  });

  await test("PATCH /api/admin/curriculum/programs/:id mengubah data program", async () => {
    const { status, json } = await call("PATCH", `/api/admin/curriculum/programs/${programId}`, {
      body: {
        name: "S1 Sains Data & AI",
        status: "draft",
      },
    });
    assert.equal(status, 200);
    assert.equal(json.data.program.name, "S1 Sains Data & AI");
    assert.equal(json.data.program.status, "draft");
  });

  await test("GET /api/curriculum publik hanya mengembalikan program published", async () => {
    const { status, json } = await call("GET", "/api/curriculum", { token: null });
    assert.equal(status, 200);
    assert.equal(json.data.programs.length, 0); // karena diubah jadi draft
    assert.equal(json.data.settings.heroTitle, "Kurikulum Berbasis OBE Universitas LIA");
  });

  await test("DELETE /api/admin/curriculum/programs/:id menghapus program", async () => {
    const { status, json } = await call("DELETE", `/api/admin/curriculum/programs/${programId}`);
    assert.equal(status, 200);
    assert.equal(json.success, true);
  });

  await test("DELETE program yang sudah dihapus mengembalikan 404", async () => {
    const { status } = await call("DELETE", `/api/admin/curriculum/programs/${programId}`);
    assert.equal(status, 404);
  });

  server.close();
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal.\n`);
  process.exit(failed > 0 ? 1 : 0);
})();

