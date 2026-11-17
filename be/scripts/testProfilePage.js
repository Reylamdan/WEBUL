// Pengujian OFFLINE fitur Halaman Profil (/api/admin/profile dan /api/profile).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testProfilePage.js

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";

const assert = require("node:assert/strict");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");

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
  db.profile_page_settings = [];
  db.profile_cards = [];

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

  const makePng = async (w = 100, h = 100) =>
    sharp({ create: { width: w, height: h, channels: 3, background: { r: 10, g: 100, b: 200 } } })
      .png()
      .toBuffer();

  console.log("\n--- Uji Publik Halaman Profil ---");

  await test("GET /api/profile berhasil saat DB masih kosong (fallback default)", async () => {
    const { status, json } = await call("GET", "/api/profile", { token: null });
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.content.heroTitle, "Profil Universitas LIA");
    assert.equal(json.data.cards.length, 6);
    assert.equal(json.data.cards[0].title, "Sejarah");
  });

  console.log("\n--- Uji Autentikasi Admin ---");

  await test("Endpoint admin menolak tanpa token", async () => {
    const { status } = await call("GET", "/api/admin/profile/content", { token: null });
    assert.equal(status, 401);
  });

  console.log("\n--- Uji Kelola Konten Halaman Profil ---");

  await test("GET /api/admin/profile/content mengembalikan konten", async () => {
    const { status, json } = await call("GET", "/api/admin/profile/content");
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.content.heroTitle, "Profil Universitas LIA");
  });

  await test("PUT /api/admin/profile/content memperbarui data konten", async () => {
    const { status, json } = await call("PUT", "/api/admin/profile/content", {
      body: {
        heroTitle: "Profil Kampus Kebangsaan LIA",
        heroSubtitle: "Subjudul baru profil kampus tercinta.",
      },
    });
    assert.equal(status, 200);
    assert.equal(json.data.content.heroTitle, "Profil Kampus Kebangsaan LIA");
    assert.equal(json.data.content.heroSubtitle, "Subjudul baru profil kampus tercinta.");
  });

  console.log("\n--- Uji CRUD Kartu Jelajahi Profil ---");

  let cardId = null;

  await test("POST /api/admin/profile/cards membuat kartu baru", async () => {
    const { status, json } = await call("POST", "/api/admin/profile/cards", {
      body: {
        title: "Testimoni Alumni",
        description: "Cerita sukses dan kiprah alumni LIA di dunia industri.",
        href: "/alumni/testimoni",
        sortOrder: 10,
        status: "published",
      },
    });
    assert.equal(status, 201);
    assert.equal(json.success, true);
    assert.equal(json.data.card.title, "Testimoni Alumni");
    assert.equal(json.data.card.status, "published");
    cardId = json.data.card.id;
  });

  await test("GET /api/admin/profile/cards mengembalikan daftar kartu", async () => {
    const { status, json } = await call("GET", "/api/admin/profile/cards");
    assert.equal(status, 200);
    assert.equal(json.data.items.length, 1);
    assert.equal(json.data.items[0].id, cardId);
  });

  await test("PATCH /api/admin/profile/cards/:id memperbarui kartu", async () => {
    const { status, json } = await call("PATCH", `/api/admin/profile/cards/${cardId}`, {
      body: {
        title: "Kisah Sukses Alumni",
        status: "draft",
      },
    });
    assert.equal(status, 200);
    assert.equal(json.data.card.title, "Kisah Sukses Alumni");
    assert.equal(json.data.card.status, "draft");
  });

  await test("GET /api/profile sekarang hanya mengembalikan kartu published", async () => {
    const { status, json } = await call("GET", "/api/profile", { token: null });
    assert.equal(status, 200);
    // Kartu berstatus draft tidak boleh tampil di publik
    assert.equal(json.data.cards.length, 0);
    // Tapi hero title baru dari update sebelumnya tampil
    assert.equal(json.data.content.heroTitle, "Profil Kampus Kebangsaan LIA");
  });

  await test("DELETE /api/admin/profile/cards/:id menghapus kartu", async () => {
    const { status, json } = await call("DELETE", `/api/admin/profile/cards/${cardId}`);
    assert.equal(status, 200);
    assert.equal(json.success, true);
  });

  await test("DELETE kartu yang sudah dihapus mengembalikan 404", async () => {
    const { status } = await call("DELETE", `/api/admin/profile/cards/${cardId}`);
    assert.equal(status, 404);
  });

  server.close();
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal.\n`);
  process.exit(failed > 0 ? 1 : 0);
})();

