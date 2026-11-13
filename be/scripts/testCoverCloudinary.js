// Pengujian OFFLINE cover berita -> Cloudinary (cover lama Supabase tetap terbaca).
// Supabase dan Cloudinary diganti versi palsu di memori: TIDAK ada jaringan, TIDAK ada kredensial,
// TIDAK ada data asli tersentuh. Request dikirim lewat HTTP sungguhan ke app Express.
//
//   npm run test:cover-cloudinary      (atau: node scripts/testCoverCloudinary.js)
//
// TIDAK dicakup (butuh Cloudinary/Supabase asli): constraint SQL asli, perilaku CDN, kuota.
// Untuk Cloudinary asli: node scripts/testCloudinaryLive.js

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";
// Jangan pernah membaca .env asli saat tes; semua kredensial di bawah ini palsu.
process.env.DOTENV_CONFIG_PATH = "/tmp/tidak-ada.env";
const FAKE_SECRET = "SECRET-JANGAN-DICATAT-12345";
const FAKE_KEY = "KEY-JANGAN-DICATAT-98765";
const FAKE_BASIC = Buffer.from(`${FAKE_KEY}:${FAKE_SECRET}`).toString("base64");
process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
process.env.CLOUDINARY_API_KEY = FAKE_KEY;
process.env.CLOUDINARY_API_SECRET = FAKE_SECRET;

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const sharp = require("sharp");

const { createFakeSupabase } = require("./lib/fakeSupabase");
const { createFakeCloudinary } = require("./lib/fakeCloudinary");
// strictTables: nama tabel salah/baru tidak boleh diam-diam "sukses".
const sb = createFakeSupabase({ strictTables: true });
const cl = createFakeCloudinary();
const supabasePath = sb.install();
const cloudinaryPath = cl.install();
const { db, faults, hooks, legacy } = sb;

const logs = [];       // di-reset per tes
const allLogs = [];    // seluruh log selama pengujian, TIDAK pernah di-reset
const origError = console.error;
const origWarn = console.warn;
const capture = (...a) => { const line = a.map((x) => (typeof x === "string" ? x : require("node:util").inspect(x, { depth: 6 }))).join(" "); logs.push(line); allLogs.push(line); };
console.error = capture;
console.warn = capture;
// Nilai yang tidak boleh muncul di log maupun respons mana pun.
const CREDENTIALS = [FAKE_SECRET, FAKE_KEY, FAKE_BASIC, "Authorization"];
const leaked = (text) => CREDENTIALS.filter((c) => String(text).includes(c));

const loadFreshApp = () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath && key !== cloudinaryPath) delete require.cache[key];
  }
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n").slice(0, 4).join("\n        ")}`); }
};

const ROOT = path.join(__dirname, "..");

(async () => {
  // =====================================================================================
  console.log("A. Konfigurasi env (proses terpisah)");
  const runEnv = (vars) => {
    const env = { PATH: process.env.PATH, DOTENV_CONFIG_PATH: "/tmp/tidak-ada.env", NODE_ENV: "test", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", JWT_SECRET: "x".repeat(48), FRONTEND_URL: "http://localhost:3000", ...vars };
    const code = 'const e=require("./src/config/env");process.stdout.write(JSON.stringify({enabled:e.cloudinary.enabled,cloud:e.cloudinary.cloudName,root:e.cloudinary.rootFolder}))';
    return spawnSync(process.execPath, ["-e", code], { cwd: ROOT, env, encoding: "utf8" });
  };
  await test("tanpa variabel Cloudinary: server tetap menyala, Cloudinary nonaktif, tanpa peringatan", () => {
    const r = runEnv({});
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).enabled, false);
    assert.doesNotMatch(r.stderr, /Cloudinary/);
  });
  await test("konfigurasi sebagian: tidak crash, nonaktif, peringatan hanya menyebut NAMA variabel", () => {
    const r = runEnv({ CLOUDINARY_API_KEY: "kunci-123", CLOUDINARY_API_SECRET: FAKE_SECRET });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).enabled, false);
    assert.match(r.stderr, /CLOUDINARY_API_KEY/);
    assert.ok(!r.stderr.includes(FAKE_SECRET) && !r.stderr.includes("kunci-123") && !r.stdout.includes(FAKE_SECRET));
  });
  await test("konfigurasi lengkap aktif; NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dipakai sebagai nama cloud", () => {
    const r = runEnv({ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "demo-cloud", CLOUDINARY_API_KEY: "k1", CLOUDINARY_API_SECRET: FAKE_SECRET });
    const out = JSON.parse(r.stdout);
    assert.equal(out.enabled, true); assert.equal(out.cloud, "demo-cloud"); assert.equal(out.root, "universitas-lia");
    assert.ok(!r.stderr.includes(FAKE_SECRET));
    const named = JSON.parse(runEnv({ CLOUDINARY_CLOUD_NAME: "utama", NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "lain", CLOUDINARY_API_KEY: "k1", CLOUDINARY_API_SECRET: "s" }).stdout);
    assert.equal(named.cloud, "utama");
  });
  await test("nama cloud / folder tidak valid: nonaktif dengan peringatan (tidak crash, nilai tidak dicetak)", () => {
    const bad = runEnv({ CLOUDINARY_CLOUD_NAME: "nama salah!", CLOUDINARY_API_KEY: "k1", CLOUDINARY_API_SECRET: FAKE_SECRET });
    assert.equal(bad.status, 0); assert.equal(JSON.parse(bad.stdout).enabled, false);
    assert.match(bad.stderr, /CLOUDINARY_CLOUD_NAME/); assert.ok(!bad.stderr.includes("nama salah"));
    const folder = runEnv({ CLOUDINARY_CLOUD_NAME: "ok", CLOUDINARY_API_KEY: "k1", CLOUDINARY_API_SECRET: "s", CLOUDINARY_ROOT_FOLDER: "../x" });
    assert.equal(JSON.parse(folder.stdout).enabled, false); assert.match(folder.stderr, /CLOUDINARY_ROOT_FOLDER/);
  });

  // =====================================================================================
  console.log("\nB. Endpoint cover (Supabase + Cloudinary palsu)");
  const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const MISSING = "123e4567-e89b-42d3-a456-426614174000";
  let base; let adminToken; let server;
  const startServer = async () => {
    if (server) await new Promise((r) => server.close(r));
    server = loadFreshApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}`;
    adminToken = require("../src/utils/token").signAdminToken({ id: ADMIN_ID });
  };
  const call = async (method, url, { body, token = adminToken, form } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form; else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(`${base}${url}`, { method, headers, body: payload });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* bukan JSON */ }
    return { status: res.status, json, text };
  };
  const mk = (kind) => sharp({ create: { width: 20, height: 10, channels: 3, background: "#cc3300" } })[kind]().toBuffer();
  const file = (bytes, filename, type, field = "cover") => { const f = new FormData(); f.append(field, new Blob([bytes], { type }), filename); return f; };
  const resetState = () => {
    for (const k of Object.keys(db)) delete db[k];
    db.admins = [{ id: ADMIN_ID, name: "Admin", email: "a@x.id", is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z" }];
    legacy.objects.clear(); legacy.failRemove = false; legacy.removed.length = 0;
    cl.reset(); faults.length = 0; hooks.beforeUpdate = null; logs.length = 0;
  };
  // Server dimuat ulang tiap tes: pembatas upload (20/15 menit, di memori) ikut ter-reset.
  const reset = async () => { await startServer(); resetState(); };
  const mkNews = async (status = "published", title = "Berita Uji Cover") =>
    (await call("POST", "/api/admin/news", { body: { title, contentHtml: "<p>Isi berita uji untuk cover.</p>", status } })).json.data.news;
  const row = (id) => db.news.find((r) => r.id === id);
  const putCover = (id, bytes, name = "foto-asli-saya.jpg", type = "image/jpeg") => call("PUT", `/api/admin/news/${id}/cover`, { form: file(bytes, name, type) });
  const LEGACY_PATH = (id) => `covers/${id}/11111111-1111-4111-8111-111111111111.jpg`;
  const seedLegacy = (id) => { row(id).cover_image_path = LEGACY_PATH(id); legacy.objects.set(`news-images/${LEGACY_PATH(id)}`, 10); };
  const PID_RE = (id) => new RegExp(`^universitas-lia/news/covers/${id}/[0-9a-f-]{36}$`);

  await startServer();
  let jpeg, png, webp;
  jpeg = await mk("jpeg"); png = await mk("png"); webp = await mk("webp");

  await test("berita tanpa cover: coverImagePath dan coverImageUrl null (admin dan publik)", async () => {
    await reset(); const n = await mkNews();
    assert.equal(n.coverImagePath, null); assert.equal(n.coverImageUrl, null);
    const pub = await call("GET", `/api/news/${n.slug}`, { token: null });
    assert.equal(pub.json.data.news.coverImageUrl, null);
  });

  await test("PUT cover JPEG/PNG/WebP -> Cloudinary: bentuk respons sama, kolom cover_* terisi, cover_image_path TIDAK diisi public_id", async () => {
    for (const [bytes, name, type, ext] of [[jpeg, "a.jpg", "image/jpeg", "jpg"], [png, "b.png", "image/png", "png"], [webp, "c.webp", "image/webp", "webp"]]) {
      await reset(); const n = await mkNews();
      const r = await putCover(n.id, bytes, name, type);
      assert.equal(r.status, 200, r.text);
      const news = r.json.data.news;
      assert.equal(r.json.success, true); assert.equal(r.json.message, "Cover berita berhasil diperbarui");
      assert.deepEqual(Object.keys(news).sort(), Object.keys(n).sort(), "kunci respons sama dengan sebelumnya");
      assert.match(news.coverImagePath, PID_RE(n.id));
      assert.match(news.coverImageUrl, /^https:\/\/res\.cloudinary\.com\/demo-cloud\/image\/upload\//);
      const r0 = row(n.id);
      assert.equal(r0.cover_storage, "cloudinary"); assert.equal(r0.cover_public_id, news.coverImagePath);
      assert.equal(r0.cover_url, news.coverImageUrl); assert.equal(r0.cover_image_path, null);
      assert.equal(r0.cover_width, 20); assert.equal(r0.cover_height, 10); assert.equal(r0.cover_format, "jpg"); assert.ok(r0.cover_bytes > 0);
      assert.ok(!news.coverImagePath.includes("foto-asli"), `ekstensi ${ext}: nama file asli tidak dipakai`);
      assert.ok(cl.state.assets.has(r0.cover_public_id));
      assert.equal(legacy.objects.size, 0, "tidak ada upload ke Supabase Storage");
    }
  });

  await test("opsi upload: upload_stream dengan public_id server, overwrite=false, tanpa nama file pengguna", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg, "rahasia-nama.jpg");
    const o = cl.state.uploads[0];
    assert.match(o.public_id, PID_RE(n.id)); assert.equal(o.overwrite, false); assert.equal(o.resource_type, "image");
    assert.equal(o.use_filename, false); assert.ok(o.timeout > 0);
  });

  await test("respons publik (detail, daftar, terbaru) memuat coverImageUrl dan TIDAK membocorkan public_id/cover_storage/path", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg);
    for (const url of [`/api/news/${n.slug}`, "/api/news", "/api/news/latest"]) {
      const r = await call("GET", url, { token: null });
      assert.equal(r.status, 200);
      const item = r.json.data.news || r.json.data.items[0];
      assert.match(item.coverImageUrl, /^https:\/\/res\.cloudinary\.com\//);
      assert.doesNotMatch(r.text, /cover_storage|cover_public_id|coverImagePath|cover_image_path/);
    }
  });

  await test("admin detail dan daftar konsisten (coverImageUrl sama)", async () => {
    await reset(); const n = await mkNews(); const put = await putCover(n.id, jpeg);
    const d = await call("GET", `/api/admin/news/${n.id}`);
    const l = await call("GET", "/api/admin/news");
    assert.equal(d.json.data.news.coverImageUrl, put.json.data.news.coverImageUrl);
    assert.equal(l.json.data.items[0].coverImagePath, put.json.data.news.coverImagePath);
  });

  await test("cover LAMA Supabase tetap tampil (admin dan publik) tanpa kolom cover_storage", async () => {
    await reset(); const n = await mkNews(); seedLegacy(n.id);
    const d = await call("GET", `/api/admin/news/${n.id}`);
    assert.equal(d.json.data.news.coverImagePath, LEGACY_PATH(n.id));
    assert.equal(d.json.data.news.coverImageUrl, `https://fake-project.supabase.co/storage/v1/object/public/news-images/${LEGACY_PATH(n.id)}`);
    const p = await call("GET", `/api/news/${n.slug}`, { token: null });
    assert.equal(p.json.data.news.coverImageUrl, d.json.data.news.coverImageUrl);
    const explicit = row(n.id); explicit.cover_storage = "supabase";
    assert.match((await call("GET", `/api/news/${n.slug}`, { token: null })).json.data.news.coverImageUrl, /supabase\.co/);
  });

  await test("ganti cover LAMA -> Cloudinary: cover_image_path dikosongkan, file Supabase TIDAK dihapus, dicatat [LEGACY-KEEP]", async () => {
    await reset(); const n = await mkNews(); seedLegacy(n.id); logs.length = 0;
    const r = await putCover(n.id, png, "x.png", "image/png");
    assert.equal(r.status, 200, r.text);
    const r0 = row(n.id);
    assert.equal(r0.cover_storage, "cloudinary"); assert.equal(r0.cover_image_path, null);
    assert.deepEqual(legacy.removed, [], "tidak ada penghapusan di Supabase");
    assert.ok(legacy.objects.has(`news-images/${LEGACY_PATH(n.id)}`), "file lama masih ada");
    assert.ok(logs.some((l) => l.includes("[LEGACY-KEEP]") && l.includes(LEGACY_PATH(n.id))));
    assert.equal(cl.state.destroys.length, 0);
  });

  await test("ganti cover Cloudinary -> Cloudinary: aset lama dihapus (invalidate), aset baru ada", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg); const oldId = row(n.id).cover_public_id;
    const r = await putCover(n.id, png, "y.png", "image/png"); assert.equal(r.status, 200);
    const newId = row(n.id).cover_public_id;
    assert.notEqual(oldId, newId); assert.ok(!cl.state.assets.has(oldId)); assert.ok(cl.state.assets.has(newId));
    assert.equal(cl.state.destroys[0].publicId, oldId); assert.equal(cl.state.destroys[0].options.invalidate, true);
  });

  await test("DELETE cover Cloudinary: kolom cover_* kosong, aset dihapus; DELETE lagi -> 404 COVER_NOT_FOUND", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg); const id = row(n.id).cover_public_id;
    const r = await call("DELETE", `/api/admin/news/${n.id}/cover`);
    assert.equal(r.status, 200); assert.equal(r.json.data.news.coverImagePath, null); assert.equal(r.json.data.news.coverImageUrl, null);
    const r0 = row(n.id);
    for (const c of ["cover_storage", "cover_public_id", "cover_url", "cover_image_path", "cover_width", "cover_bytes"]) assert.equal(r0[c], null, c);
    assert.ok(!cl.state.assets.has(id));
    const again = await call("DELETE", `/api/admin/news/${n.id}/cover`);
    assert.equal(again.status, 404); assert.equal(again.json.code, "COVER_NOT_FOUND");
  });

  await test("DELETE cover LAMA: kolom dikosongkan, file Supabase TIDAK dihapus", async () => {
    await reset(); const n = await mkNews(); seedLegacy(n.id);
    const r = await call("DELETE", `/api/admin/news/${n.id}/cover`);
    assert.equal(r.status, 200); assert.equal(row(n.id).cover_image_path, null);
    assert.deepEqual(legacy.removed, []); assert.ok(legacy.objects.has(`news-images/${LEGACY_PATH(n.id)}`));
  });

  await test("hapus BERITA: aset Cloudinary dihapus; file Supabase lama tidak dihapus", async () => {
    await reset(); const a = await mkNews("published", "Berita A"); const b = await mkNews("published", "Berita B");
    await putCover(a.id, jpeg); const id = row(a.id).cover_public_id; seedLegacy(b.id);
    assert.equal((await call("DELETE", `/api/admin/news/${a.id}`)).status, 200);
    assert.ok(!cl.state.assets.has(id));
    assert.equal((await call("DELETE", `/api/admin/news/${b.id}`)).status, 200);
    assert.deepEqual(legacy.removed, []);
  });

  // Pesan error provider yang SENGAJA memuat kredensial (secret, key, header Authorization, Basic base64).
  const poisoned = (status, extra = {}) => Object.assign(
    new Error(`Invalid credentials api_key=${FAKE_KEY} api_secret=${FAKE_SECRET} Authorization: Basic ${FAKE_BASIC}`),
    { http_code: status, request: { headers: { Authorization: `Basic ${FAKE_BASIC}` } }, ...extra }
  );

  await test("upload gagal (401, pesan memuat secret+key+Authorization) -> 502 STORAGE_ERROR; DB utuh; TIDAK ada kredensial di respons/log", async () => {
    await reset(); const n = await mkNews(); seedLegacy(n.id); logs.length = 0;
    cl.state.failUpload = poisoned(401);
    const r = await putCover(n.id, jpeg);
    assert.equal(r.status, 502); assert.equal(r.json.code, "STORAGE_ERROR");
    assert.equal(row(n.id).cover_image_path, LEGACY_PATH(n.id)); assert.equal(row(n.id).cover_storage ?? null, null);
    assert.equal(cl.state.assets.size, 0);
    // Pastikan ada log yang benar-benar ditulis (tes tidak boleh lulus karena log kosong) dan isinya terstruktur.
    const line = logs.find((l) => l.startsWith("[STORAGE]"));
    assert.ok(line, `log [STORAGE] harus ada: ${JSON.stringify(logs)}`);
    assert.match(line, /kategori=auth http=401 kode=-/);
    assert.deepEqual(leaked(r.text), [], "respons");
    assert.deepEqual(leaked(logs.join("\n")), [], "log");
  });

  await test("kategori kegagalan upload lain (jaringan, timeout, rate limit, 5xx, error bersarang) tercatat aman tanpa pesan provider", async () => {
    const cases = [
      [poisoned(undefined, { code: "ENOTFOUND" }), /kategori=network http=- kode=ENOTFOUND/],
      [Object.assign(poisoned(undefined), { message: `getaddrinfo ECONNRESET api.cloudinary.com ${FAKE_SECRET}` }), /kategori=network http=- kode=ECONNRESET/],
      [poisoned(499, { name: "TimeoutError" }), /kategori=timeout http=499/],
      [poisoned(420), /kategori=rate_limit http=420/],
      [poisoned(503), /kategori=provider http=503/],
      [{ error: poisoned(403) }, /kategori=auth http=403/],
      [poisoned(400, { code: `${FAKE_SECRET}` }), /kategori=request http=400 kode=-/],
    ];
    for (const [error, expected] of cases) {
      await reset(); const n = await mkNews(); logs.length = 0;
      cl.state.failUpload = error;
      const r = await putCover(n.id, jpeg);
      assert.equal(r.status, 502);
      const line = logs.find((l) => l.startsWith("[STORAGE]"));
      assert.match(line || "", expected);
      assert.deepEqual(leaked(logs.join("\n") + r.text), [], String(expected));
    }
  });

  await test("penghapusan gagal (pesan memuat kredensial): [ORPHAN] memuat public_id + ringkasan aman, TANPA kredensial; respons tetap 200", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg); const oldId = row(n.id).cover_public_id;
    cl.state.failDestroy = poisoned(500); logs.length = 0;
    const r = await putCover(n.id, png, "q.png", "image/png");
    assert.equal(r.status, 200, r.text);
    const line = logs.find((l) => l.startsWith(`[ORPHAN] cloudinary:${oldId}`));
    assert.ok(line, `log [ORPHAN] harus ada: ${JSON.stringify(logs)}`);
    assert.match(line, /kategori=provider http=500 kode=-/);
    assert.deepEqual(leaked(logs.join("\n") + r.text), [], "log/respons");
    cl.state.failDestroy = poisoned(401); logs.length = 0;
    assert.equal((await call("DELETE", `/api/admin/news/${n.id}/cover`)).status, 200);
    assert.ok(logs.some((l) => l.startsWith("[ORPHAN] cloudinary:") && /kategori=auth http=401/.test(l)));
    assert.deepEqual(leaked(logs.join("\n")), [], "log DELETE");
  });

  await test("hasil destroy tak terduga yang memuat kredensial tidak dicatat mentah", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg); logs.length = 0;
    cl.state.destroyResult = `error ${FAKE_SECRET} ${FAKE_KEY}`;
    assert.equal((await call("DELETE", `/api/admin/news/${n.id}/cover`)).status, 200);
    assert.ok(logs.some((l) => l.startsWith("[ORPHAN] cloudinary:")));
    assert.deepEqual(leaked(logs.join("\n")), []);
  });

  await test("describeProviderError: tidak pernah mengembalikan pesan; nilai kredensial yang lolos ke kode tetap di-[REDACTED]", async () => {
    const { describeProviderError } = require("../src/utils/coverStorage");
    const out = describeProviderError(poisoned(401));
    assert.equal(out, "kategori=auth http=401 kode=-");
    assert.equal(describeProviderError(null), "kategori=unknown http=- kode=-");
    assert.equal(describeProviderError("string error " + FAKE_SECRET), "kategori=unknown http=- kode=-");
    for (const bad of [poisoned(401), { http_code: 401, code: FAKE_KEY }, `x ${FAKE_BASIC}`]) assert.deepEqual(leaked(describeProviderError(bad)), []);
  });

  await test("respons upload tidak dikenali -> 502 dan dicatat [ORPHAN]; DB tidak berubah", async () => {
    await reset(); const n = await mkNews(); cl.state.badUploadResponse = true;
    const r = await putCover(n.id, jpeg);
    assert.equal(r.status, 502); assert.equal(row(n.id).cover_storage ?? null, null);
    assert.ok(logs.some((l) => l.includes("[ORPHAN] cloudinary:")));
  });

  await test("DB gagal setelah upload: aset baru dihapus (kompensasi), cover lama utuh", async () => {
    await reset(); const n = await mkNews(); seedLegacy(n.id);
    faults.push({ table: "news", op: "update", error: { code: "XX000", message: "db mati" } });
    const r = await putCover(n.id, jpeg);
    assert.equal(r.status, 500); assert.equal(r.json.code, "DATABASE_ERROR");
    assert.equal(cl.state.assets.size, 0, "aset baru dibersihkan");
    assert.equal(cl.state.destroys.length, 1);
    assert.equal(row(n.id).cover_image_path, LEGACY_PATH(n.id)); assert.deepEqual(legacy.removed, []);
  });

  await test("perubahan bersamaan (CAS gagal): 409 COVER_CONFLICT, aset baru dihapus, cover pemenang utuh", async () => {
    await reset(); const n = await mkNews();
    hooks.beforeUpdate = () => { Object.assign(row(n.id), { cover_storage: "cloudinary", cover_public_id: "universitas-lia/news/covers/x/pemenang", cover_url: "https://res.cloudinary.com/demo-cloud/image/upload/pemenang.jpg" }); };
    const r = await putCover(n.id, jpeg);
    assert.equal(r.status, 409); assert.equal(r.json.code, "COVER_CONFLICT");
    assert.equal(row(n.id).cover_public_id, "universitas-lia/news/covers/x/pemenang");
    assert.equal(cl.state.assets.size, 0);
  });

  await test("penghapusan cover lama gagal: respons tetap sukses, data baru utuh, dicatat [ORPHAN]", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg); const oldId = row(n.id).cover_public_id;
    cl.state.failDestroy = true; logs.length = 0;
    const r = await putCover(n.id, png, "z.png", "image/png");
    assert.equal(r.status, 200, r.text);
    const newId = row(n.id).cover_public_id;
    assert.notEqual(newId, oldId); assert.equal(r.json.data.news.coverImagePath, newId); assert.ok(cl.state.assets.has(newId));
    assert.ok(logs.some((l) => l.includes(`[ORPHAN] cloudinary:${oldId}`)));
    cl.state.failDestroy = false; cl.state.destroyResult = "not found";
    assert.equal((await call("DELETE", `/api/admin/news/${n.id}/cover`)).status, 200, '"not found" dianggap sudah terhapus');
  });

  await test("hasil destroy tak terduga dicatat [ORPHAN], tidak menggagalkan DELETE cover", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg); const id = row(n.id).cover_public_id;
    cl.state.destroyResult = "error"; logs.length = 0;
    const r = await call("DELETE", `/api/admin/news/${n.id}/cover`);
    assert.equal(r.status, 200); assert.ok(logs.some((l) => l.includes(`[ORPHAN] cloudinary:${id}`)));
  });

  await test("Cloudinary belum dikonfigurasi: upload 503 STORAGE_NOT_CONFIGURED, data tidak berubah; cover lama tetap tampil", async () => {
    await reset(); const n = await mkNews(); seedLegacy(n.id); cl.state.configured = false;
    const r = await putCover(n.id, jpeg);
    assert.equal(r.status, 503); assert.equal(r.json.code, "STORAGE_NOT_CONFIGURED");
    assert.equal(row(n.id).cover_image_path, LEGACY_PATH(n.id));
    assert.match((await call("GET", `/api/news/${n.slug}`, { token: null })).json.data.news.coverImageUrl, /supabase\.co/);
    assert.equal((await call("GET", "/api/news", { token: null })).status, 200);
    const del = await call("DELETE", `/api/admin/news/${n.id}/cover`);
    assert.equal(del.status, 200, "menghapus cover lama tidak butuh Cloudinary");
  });

  await test("hapus cover Cloudinary saat Cloudinary tidak terkonfigurasi: DB tetap bersih, aset dicatat [ORPHAN], respons 200", async () => {
    await reset(); const n = await mkNews(); await putCover(n.id, jpeg); const id = row(n.id).cover_public_id;
    cl.state.configured = false; logs.length = 0;
    const r = await call("DELETE", `/api/admin/news/${n.id}/cover`);
    assert.equal(r.status, 200); assert.equal(row(n.id).cover_public_id, null);
    assert.ok(logs.some((l) => l.includes(`[ORPHAN] cloudinary:${id}`)));
  });

  await test("validasi tetap berlaku: GIF/SVG 415, tipe tidak cocok 400, >5 MB 413, tanpa file 400, tanpa token 401, UUID salah 400, berita tak ada 404", async () => {
    await reset(); const n = await mkNews();
    assert.equal((await putCover(n.id, Buffer.from("GIF89a"), "a.gif", "image/gif")).status, 415);
    assert.equal((await putCover(n.id, Buffer.from("<svg/>"), "a.svg", "image/svg+xml")).status, 415);
    assert.equal((await putCover(n.id, Buffer.from("bukan gambar"), "a.jpg", "image/jpeg")).status, 400);
    assert.equal((await putCover(n.id, png, "a.jpg", "image/jpeg")).status, 400, "isi PNG berekstensi jpg");
    assert.equal((await putCover(n.id, Buffer.alloc(6 * 1024 * 1024, 1), "besar.jpg", "image/jpeg")).status, 413);
    const noFile = await call("PUT", `/api/admin/news/${n.id}/cover`, { form: new FormData() });
    assert.equal(noFile.status, 400, `tanpa file: ${noFile.text}`);
    assert.equal((await call("PUT", `/api/admin/news/${n.id}/cover`, { form: file(jpeg, "a.jpg", "image/jpeg"), token: null })).status, 401);
    assert.equal((await call("PUT", "/api/admin/news/bukan-uuid/cover", { form: file(jpeg, "a.jpg", "image/jpeg") })).status, 400);
    assert.equal((await putCover(MISSING, jpeg)).status, 404);
    assert.equal((await call("PUT", `/api/admin/news/${n.id}/cover`, { form: file(jpeg, "a.jpg", "image/jpeg", "lain") })).status, 400, "field selain cover");
    assert.equal(cl.state.assets.size, 0, "tidak ada yang terunggah dari permintaan yang ditolak");
  });

  await test("pembatas upload cover (20 per 15 menit) tetap berlaku: permintaan ke-21 -> 429 TOO_MANY_COVER_UPLOADS", async () => {
    await reset(); const n = await mkNews(); let last;
    for (let i = 0; i < 21; i += 1) last = await call("PUT", `/api/admin/news/${n.id}/cover`, { form: new FormData() });
    assert.equal(last.status, 429); assert.equal(last.json.code, "TOO_MANY_COVER_UPLOADS");
  });

  await test("EXIF/GPS dibuang sebelum upload (pipeline Sharp dipertahankan)", async () => {
    await reset(); const n = await mkNews();
    const withExif = await sharp({ create: { width: 30, height: 30, channels: 3, background: "#0a0" } }).withExif({ IFD0: { Copyright: "RAHASIA-EXIF" } }).jpeg().toBuffer();
    assert.ok(withExif.includes(Buffer.from("RAHASIA-EXIF")));
    const sent = []; const orig = cl.state.uploads;
    const clientMod = require("../src/config/cloudinary").getClient();
    const realUpload = clientMod.uploader.upload_stream;
    clientMod.uploader.upload_stream = (o, cb) => { const s = realUpload(o, cb); s.on("data", (c) => sent.push(c)); return s; };
    try { assert.equal((await putCover(n.id, withExif)).status, 200); } finally { clientMod.uploader.upload_stream = realUpload; }
    assert.ok(!Buffer.concat(sent).includes(Buffer.from("RAHASIA-EXIF")));
    void orig;
  });

  // =====================================================================================
  console.log("\nC. Isolasi: Google Drive dan dokumen tidak tersentuh");
  const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
  await test("modul Drive/dokumen/akreditasi/regulasi/file TIDAK menyebut Cloudinary", () => {
    for (const p of ["src/services/googleDriveService.js", "src/services/googleOAuthService.js", "src/services/googleOAuthStore.js", "src/utils/driveStorage.js",
      "src/utils/documentStorage.js", "src/utils/regulationStorage.js", "src/utils/fileAccess.js", "src/controllers/fileController.js", "src/controllers/googleOAuthController.js",
      "src/services/accreditationService.js", "src/services/banptRegulationService.js", "src/middleware/uploadAccreditationDocument.js", "src/middleware/uploadRegulationFiles.js",
      "src/utils/documentValidator.js", "src/utils/pdfValidator.js", "src/routes/fileRoutes.js"]) {
      assert.doesNotMatch(read(p).replace(/\/\/.*$/gm, ""), /cloudinary/i, p);
    }
  });
  await test("Cloudinary hanya dipakai modul cover: tidak ada Drive di coverStorage; tidak ada cloudinary di route non-berita", () => {
    assert.doesNotMatch(read("src/utils/coverStorage.js").replace(/\/\/.*$/gm, ""), /googleDrive|driveStorage|googleapis/i);
    const users = fs.readdirSync(path.join(ROOT, "src"), { recursive: true }).filter((f) => f.endsWith(".js"))
      .filter((f) => /cloudinary/i.test(read(path.join("src", f)).replace(/\/\/.*$/gm, ""))).map((f) => f.replace(/\\/g, "/")).sort();
    // Modul yang diizinkan menggunakan Cloudinary: modul cover berita dan modul video generik
    const allowed = [
      "config/cloudinary.js",
      "config/env.js",
      "controllers/adminNewsCoverController.js",
      "controllers/adminVideoController.js",
      "middleware/uploadVideoFile.js",
      "services/videoStorageService.js",
      "utils/coverStorage.js",
    ];
    for (const u of users) {
      assert.ok(allowed.includes(u), `File tidak diharapkan menggunakan Cloudinary: ${u}`);
    }
  });

  await test("SELURUH log selama pengujian (semua tes) bebas dari secret, API key, Authorization, dan Basic base64", () => {
    assert.ok(allLogs.length > 20, `log harus terkumpul (bukan kosong): ${allLogs.length}`);
    assert.deepEqual(leaked(allLogs.join("\n")), []);
  });

  console.error = origError; console.warn = origWarn;
  if (server) await new Promise((r) => server.close(r));
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})();
