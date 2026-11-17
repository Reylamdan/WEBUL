// Pengujian OFFLINE fitur Struktur Organisasi (/api/admin/organization-units dan /api/organization-units).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testOrganizationUnits.js

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
const { db, faults } = sb;

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
  db.admins = [{ id: ADMIN_ID, name: "Admin Uji", email: "admin@example.com", is_active: true, last_login_at: null, created_at: new Date().toISOString() }];
  db.organization_units = [];
  const app = loadFreshApp();
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const TOKEN = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID, expiresIn: "1h" });
  const call = async (method, url, { body, token = TOKEN } = {}) => {
    const headers = {};
    const isForm = body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* bukan JSON */ }
    return { status: res.status, json, text };
  };
  const admin = (m, u, o) => call(m, `/api/admin/organization-units${u}`, o);
  const pub = (m, u, o) => call(m, `/api/organization-units${u}`, { token: null, ...o });
  const png = () => sharp({ create: { width: 60, height: 40, channels: 3, background: "#336699" } }).png().toBuffer();
  const form = async (name = "gambar.png", type = "image/png") => {
    const f = new FormData();
    f.append("cover", new Blob([await png()], { type }), name);
    return f;
  };

  console.log("\n1. Auth & validasi");
  await test("tanpa token -> 401 (semua endpoint admin)", async () => {
    assert.equal((await admin("GET", "", { token: null })).status, 401);
    assert.equal((await admin("POST", "", { token: null, body: {} })).status, 401);
    assert.equal((await admin("PUT", `/${MISSING}/image`, { token: null })).status, 401);
  });
  await test("buat: field wajib, kategori tidak dikenal, field asing -> 400", async () => {
    assert.equal((await admin("POST", "", { body: {} })).status, 400);
    assert.equal((await admin("POST", "", { body: { title: "Rektorat", category: "x" } })).status, 400);
    assert.equal((await admin("POST", "", { body: { title: "Rektorat", category: "unit", imagePath: "x" } })).status, 400);
    assert.equal((await admin("POST", "", { body: { title: "Rektorat", category: "unit", sortOrder: -1 } })).status, 400);
  });

  console.log("\n2. CRUD");
  let unitId, baganId;
  await test("buat: default draft, tanpa gambar (imageUrl null), teks dibersihkan", async () => {
    const r = await admin("POST", "", { body: { title: "  Rektorat <b>Utama</b> ", description: "Baris 1\n<script>x</script>Baris 2", category: "unit", position: "Rektor" } });
    assert.equal(r.status, 201, r.text);
    const u = r.json.data.unit;
    unitId = u.id;
    assert.equal(u.status, "draft");
    assert.equal(u.imageUrl, null);
    assert.equal(u.title, "Rektorat Utama");
    assert.ok(!u.description.includes("<script>"));
    assert.equal(u.category.name, "Unit dan Pimpinan");
    baganId = (await admin("POST", "", { body: { title: "Bagan 2026", category: "bagan", status: "published", sortOrder: 1 } })).json.data.unit.id;
  });
  await test("daftar admin: memuat draft & published, filter kategori/status/search", async () => {
    assert.equal((await admin("GET", "")).json.data.pagination.total, 2);
    assert.equal((await admin("GET", "?category=bagan")).json.data.items.length, 1);
    assert.equal((await admin("GET", "?status=draft")).json.data.items[0].id, unitId);
    assert.equal((await admin("GET", "?search=rektorat")).json.data.items.length, 1);
  });
  await test("detail: ada -> 200, tidak ada -> 404, id rusak -> 400", async () => {
    assert.equal((await admin("GET", `/${unitId}`)).status, 200);
    assert.equal((await admin("GET", `/${MISSING}`)).status, 404);
    assert.equal((await admin("GET", "/abc")).status, 400);
  });
  await test("update parsial; null mengosongkan; tanpa perubahan -> pesan khusus", async () => {
    const r = await admin("PATCH", `/${unitId}`, { body: { position: null, sortOrder: 5, status: "published" } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.data.unit.position, null);
    assert.equal(r.json.data.unit.sortOrder, 5);
    assert.equal((await admin("PATCH", `/${unitId}`, { body: { sortOrder: 5 } })).json.message, "Tidak ada perubahan");
    assert.equal((await admin("PATCH", `/${unitId}`, { body: {} })).status, 400);
    assert.equal((await admin("PATCH", `/${MISSING}`, { body: { title: "Abcd" } })).status, 404);
  });

  console.log("\n3. Gambar (opsional)");
  await test("unggah gambar -> imageUrl terisi; file tersimpan di prefix organization/", async () => {
    const r = await admin("PUT", `/${unitId}/image`, { body: await form() });
    assert.equal(r.status, 200, r.text);
    assert.match(r.json.data.unit.imageUrl, /news-images\/organization\/.+\.png$/);
    assert.equal(sb.legacy.objects.size, 1);
  });
  await test("ganti gambar: file lama dihapus dari storage", async () => {
    const r = await admin("PUT", `/${unitId}/image`, { body: await form() });
    assert.equal(r.status, 200, r.text);
    assert.equal(sb.legacy.objects.size, 1);
    assert.equal(sb.legacy.removed.length, 1);
  });
  await test("format salah / tanpa file / id tidak ada", async () => {
    const bad = new FormData();
    bad.append("cover", new Blob(["x"], { type: "text/plain" }), "a.txt");
    assert.equal((await admin("PUT", `/${unitId}/image`, { body: bad })).status, 415);
    assert.equal((await admin("PUT", `/${MISSING}/image`, { body: await form() })).status, 404);
    assert.equal((await admin("PUT", `/${unitId}/image`, { body: new FormData() })).status, 400);
  });
  await test("hapus gambar: imageUrl null lagi; hapus lagi -> 404", async () => {
    const r = await admin("DELETE", `/${unitId}/image`);
    assert.equal(r.status, 200);
    assert.equal(r.json.data.unit.imageUrl, null);
    assert.equal(sb.legacy.objects.size, 0);
    assert.equal((await admin("DELETE", `/${unitId}/image`)).status, 404);
  });

  console.log("\n4. Publik");
  await test("hanya published, tanpa status/imagePath, urut sortOrder, filter kategori", async () => {
    await admin("PATCH", `/${baganId}`, { body: { status: "draft" } });
    let r = await pub("GET", "");
    assert.equal(r.status, 200);
    assert.equal(r.json.data.items.length, 1);
    assert.equal(r.json.data.items[0].id, unitId);
    assert.equal("status" in r.json.data.items[0], false);
    assert.equal("imagePath" in r.json.data.items[0], false);
    await admin("PATCH", `/${baganId}`, { body: { status: "published", sortOrder: 0 } });
    r = await pub("GET", "");
    assert.deepEqual(r.json.data.items.map((i) => i.id), [baganId, unitId]);
    assert.equal((await pub("GET", "?category=bagan")).json.data.items.length, 1);
    assert.equal((await pub("GET", "?category=zzz")).status, 400);
    assert.equal((await pub("GET", "?status=draft")).json.data.items.length, 2);
  });

  console.log("\n5. Hapus");
  await test("hapus data ikut menghapus file gambar; 200 lalu 404", async () => {
    await admin("PUT", `/${unitId}/image`, { body: await form() });
    assert.equal(sb.legacy.objects.size, 1);
    assert.equal((await admin("DELETE", `/${unitId}`)).status, 200);
    assert.equal(sb.legacy.objects.size, 0);
    assert.equal((await admin("DELETE", `/${unitId}`)).status, 404);
  });

  server.close();
  console.log(`\nTotal: ${passed + failed} pengujian — ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})();
