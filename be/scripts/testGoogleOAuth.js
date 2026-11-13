// Pengujian OFFLINE OAuth 2.0 Google Drive (Authorization Code + PKCE, refresh token terenkripsi, reauth,
// connect/disconnect, pergantian akun, validasi redirect, keamanan token, dan siklus upload/preview/download/delete).
//
//   npm run test:oauth        (atau: node scripts/testGoogleOAuth.js)
//
// SEMUA yang diuji di sini memakai MOCK: Google (OAuth + Drive) dan Supabase diganti versi palsu di memori
// (scripts/lib/fakeGoogle.js, scripts/lib/fakeSupabase.js). TIDAK ada koneksi jaringan, TIDAK ada kredensial,
// TIDAK ada data asli. Lulus di sini berarti KODE benar terhadap kontrak yang ditiru; BUKAN bukti bahwa Google
// sungguhan menerima konfigurasi Anda. Untuk itu jalankan uji LIVE: `npm run oauth:check` (setelah menghubungkan akun).
//
// Request HTTP dikirim ke app Express sungguhan (validator, middleware, controller, service ikut teruji);
// klien Google Drive ASLI (src/services/googleDriveService.js) dipakai, bukan fake Drive.

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000,https://www.lia.example";
// Isolasi: dotenv TIDAK menimpa variabel yang sudah ada (walau kosong). Semua variabel Google dikosongkan di sini agar
// isi .env ASLI Anda (jika ada) tidak ikut memengaruhi pengujian; tiap bagian mengisi sendiri yang dibutuhkan.
for (const name of ["GOOGLE_AUTH_MODE", "GOOGLE_DRIVE_ROOT_FOLDER_ID", "GOOGLE_DRIVE_DELETE_MODE", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_SERVICE_ACCOUNT_KEY_FILE", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", "GOOGLE_OAUTH_FRONTEND_REDIRECT", "GOOGLE_OAUTH_STATE_TTL_SECONDS", "BACKEND_PUBLIC_URL"]) process.env[name] = "";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const { createTokenCrypto, parseEncryptionKey, TokenCryptoError } = require("../src/utils/tokenCrypto");
const { validateFrontendRedirect, buildFrontendResultUrl } = require("../src/utils/safeRedirect");
const { createGoogleOAuthStore } = require("../src/services/googleOAuthStore");
const { createGoogleOAuthService, OAuthFlowError } = require("../src/services/googleOAuthService");
const { createGoogleDriveService } = require("../src/services/googleDriveService");
const { createFakeSupabase } = require("./lib/fakeSupabase");
const { createFakeGoogle, FOLDER_MIME } = require("./lib/fakeGoogle");

const ENC_KEY_B64 = crypto.randomBytes(32).toString("base64");
const ENC_KEY = parseEncryptionKey(ENC_KEY_B64);
const OTHER_KEY = crypto.randomBytes(32);
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADMIN2_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ROOT_ID = "ROOT_FOLDER_ID_123";
const REDIRECT_URI = "http://localhost:5000/api/admin/google-drive/callback";

// Semua keluaran konsol selama pengujian ditangkap untuk dipindai kebocoran token (bagian I).
const logs = [];
const origError = console.error; const origWarn = console.warn;
console.error = (...a) => logs.push(a.join(" "));
console.warn = (...a) => logs.push(a.join(" "));
const out = (...a) => process.stdout.write(`${a.join(" ")}\n`);

let passed = 0, failed = 0;
const sections = [];
let currentSection = null;
const section = (title) => { currentSection = { title, passed: 0, failed: 0 }; sections.push(currentSection); out(`\n${title}`); };
const test = async (name, fn) => {
  try { await fn(); passed += 1; currentSection.passed += 1; out(`  OK    ${name}`); }
  catch (e) { failed += 1; currentSection.failed += 1; out(`  GAGAL ${name}\n        ${String(e.stack || e.message).split("\n").slice(0, 4).join("\n        ")}`); }
};

const bytesOf = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v));
const jsonRes = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

// =====================================================================================
// Dunia uji tingkat service: Supabase palsu + Google palsu + jam terkendali.
const makeClock = () => ({ t: Date.parse("2026-11-07T08:00:00Z"), now() { return this.t; } });
const makeWorld = ({ cfg = {}, statusCacheMs = 0, googleOpts } = {}) => {
  const clock = makeClock();
  const sb = createFakeSupabase({ strictTables: true });
  sb.db.admins = [
    { id: ADMIN_ID, name: "Admin", email: "a@x.id", is_active: true },
    { id: ADMIN2_ID, name: "Admin Dua", email: "b@x.id", is_active: true },
  ];
  const google = createFakeGoogle({ redirectUri: REDIRECT_URI, rootFolderId: ROOT_ID, ...googleOpts });
  const crypt = createTokenCrypto(ENC_KEY);
  const store = createGoogleOAuthStore({ supabase: sb.client, crypto: crypt, now: () => clock.now() });
  const flags = { adminActive: true };
  const config = {
    enabled: true, clientId: google.st.clientId, clientSecret: google.st.clientSecret, redirectUri: REDIRECT_URI,
    rootFolderId: ROOT_ID, stateTtlSeconds: 600, ...cfg,
  };
  const svc = createGoogleOAuthService({
    config, store, fetchImpl: google.fetch, isAdminActive: async () => flags.adminActive,
    now: () => clock.now(), sleep: async () => {}, retryBaseMs: 1, statusCacheMs,
  });
  const advance = (ms) => { clock.t += ms; google.st.clockMs += ms; };
  const drive = createGoogleDriveService({
    config: { enabled: true, rootFolderId: ROOT_ID, deleteMode: "trash", retryBaseMs: 1 }, fetchImpl: google.fetch,
    getAccessToken: svc.getAccessToken, getAuthScope: svc.getAuthScope, invalidateAccessToken: svc.invalidateAccessToken,
  });
  svc.onConnectionChange(() => drive.resetFolderCache());
  const row = () => (sb.db.google_oauth_credentials || [])[0];
  const connect = async (email = "tester@gmail.com", { adminId = ADMIN_ID, state } = {}) => {
    const { authUrl } = await svc.startConnect({ adminId });
    const cb = new URL(google.authorize(authUrl, email, state ? { overrideState: state } : {}));
    return svc.handleCallback({ code: cb.searchParams.get("code"), state: cb.searchParams.get("state") });
  };
  const flowCode = async (promise) => { try { await promise; return null; } catch (e) { assert.ok(e instanceof OAuthFlowError, `bukan OAuthFlowError: ${e && e.message}`); return e.code; } };
  const appCode = async (promise) => { try { await promise; return null; } catch (e) { return e.code; } };
  return { clock, sb, google, crypt, store, svc, drive, flags, advance, row, connect, flowCode, appCode, db: sb.db };
};
const pdf = (extra = "") => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}%%EOF`);

(async () => {
  // =====================================================================================
  section("A. Enkripsi token (AES-256-GCM)");
  const crypt = createTokenCrypto(ENC_KEY);
  await test("enkripsi lalu dekripsi mengembalikan teks asli; format v1.iv.tag.data", () => {
    const blob = crypt.encrypt("1//refresh-token-rahasia", "ctx");
    assert.equal(blob.split(".").length, 4); assert.equal(blob.split(".")[0], "v1");
    assert.equal(crypt.decrypt(blob, "ctx"), "1//refresh-token-rahasia");
    assert.ok(!blob.includes("refresh-token-rahasia"));
  });
  await test("IV acak: teks sama menghasilkan ciphertext berbeda setiap kali", () => {
    const set = new Set(Array.from({ length: 50 }, () => crypt.encrypt("sama", "ctx")));
    assert.equal(set.size, 50);
  });
  await test("ciphertext/tag/IV diubah satu byte -> ditolak (integritas GCM)", () => {
    const [v, iv, tag, data] = crypt.encrypt("abcdef", "ctx").split(".");
    const flip = (s) => { const b = Buffer.from(s, "base64url"); b[0] ^= 1; return b.toString("base64url"); };
    for (const parts of [[v, iv, tag, flip(data)], [v, iv, flip(tag), data], [v, flip(iv), tag, data]]) {
      assert.throws(() => crypt.decrypt(parts.join("."), "ctx"), (e) => e instanceof TokenCryptoError && e.code === "DECRYPT_FAILED");
    }
  });
  await test("kunci berbeda atau AAD berbeda -> ditolak; ciphertext tidak bisa ditukar antar konteks", () => {
    const blob = crypt.encrypt("token", "refresh");
    assert.throws(() => createTokenCrypto(OTHER_KEY).decrypt(blob, "refresh"), (e) => e.code === "DECRYPT_FAILED");
    assert.throws(() => crypt.decrypt(blob, "verifier"), (e) => e.code === "DECRYPT_FAILED");
  });
  await test("pesan error generik: tidak memuat plaintext, kunci, maupun ciphertext", () => {
    const blob = crypt.encrypt("PLAINTEXT-RAHASIA", "x");
    try { createTokenCrypto(OTHER_KEY).decrypt(blob, "x"); assert.fail("harus gagal"); } catch (e) {
      assert.ok(![ "PLAINTEXT-RAHASIA", blob, ENC_KEY_B64 ].some((s) => e.message.includes(s)));
    }
  });
  await test("input rusak/format salah -> DECRYPT_FAILED (tidak melempar error aneh)", () => {
    for (const bad of ["", "abc", "v2.a.b.c", "v1.a.b", null, undefined, 123, "v1....", "v1.AAAA.BBBB.CCCC"]) {
      assert.throws(() => crypt.decrypt(bad, "x"), (e) => e instanceof TokenCryptoError && e.code === "DECRYPT_FAILED", String(bad));
    }
  });
  await test("parseEncryptionKey: hex 64, base64 32 byte diterima; panjang salah/kosong/acak ditolak", () => {
    const raw = crypto.randomBytes(32);
    assert.ok(parseEncryptionKey(raw.toString("hex")).equals(raw));
    assert.ok(parseEncryptionKey(raw.toString("base64")).equals(raw));
    assert.ok(parseEncryptionKey(raw.toString("base64url")).equals(raw));
    for (const bad of ["", "pendek", "a".repeat(63), crypto.randomBytes(16).toString("base64"), crypto.randomBytes(48).toString("base64"), "!!!".repeat(20)]) {
      assert.equal(parseEncryptionKey(bad), null, bad);
    }
    assert.throws(() => createTokenCrypto(Buffer.alloc(16)), (e) => e.code === "INVALID_KEY");
  });

  // =====================================================================================
  section("B. Validasi redirect ke frontend (anti open-redirect)");
  const origins = ["http://localhost:3000", "https://www.lia.example"];
  const ok = (u, extra = {}) => validateFrontendRedirect(u, { allowedOrigins: origins, ...extra });
  await test("URL pada origin FRONTEND_URL diterima (dengan path/query)", () => {
    assert.equal(ok("http://localhost:3000/admin/pengaturan/drive").ok, true);
    assert.equal(ok("https://www.lia.example/admin?tab=drive").ok, true);
  });
  await test("origin lain ditolak: domain jahat, subdomain mirip, port beda, skema beda", () => {
    for (const bad of ["https://evil.com/", "http://localhost:3001/", "https://www.lia.example.evil.com/", "https://evil.com/www.lia.example", "http://www.lia.example/", "https://lia.example/", "https://sub.www.lia.example/"]) {
      assert.equal(ok(bad).ok, false, bad);
    }
  });
  await test("trik pembelokan ditolak: userinfo @, backslash, //host, javascript:, data:, tanpa skema, kontrol/newline", () => {
    for (const bad of ["http://localhost:3000@evil.com/", "http://localhost:3000\\@evil.com", "//evil.com", "/relatif", "javascript:alert(1)", "data:text/html,x", "evil.com", "http://localhost:3000/\r\nSet-Cookie: a=b", "http://localhost:3000/\u0000", "https://user:pw@www.lia.example/"]) {
      assert.equal(ok(bad).ok, false, JSON.stringify(bad));
    }
  });
  await test("fragment ditolak; production wajib https; kosong ditolak", () => {
    assert.equal(ok("http://localhost:3000/a#frag").ok, false);
    assert.equal(ok("http://localhost:3000/a", { isProduction: true }).ok, false);
    assert.equal(ok("https://www.lia.example/a", { isProduction: true }).ok, true);
    assert.equal(ok("").ok, false); assert.equal(ok(undefined).ok, false);
  });
  await test("hasil redirect: hanya parameter tetap google_drive & reason (huruf besar/underscore saja)", () => {
    const base = "http://localhost:3000/admin?x=1";
    assert.equal(buildFrontendResultUrl(base, { status: "connected" }), "http://localhost:3000/admin?x=1&google_drive=connected");
    const u = new URL(buildFrontendResultUrl(base, { status: "error", reason: "STATE_INVALID&evil=1<script>" }));
    assert.equal(u.searchParams.get("google_drive"), "error"); assert.equal(u.searchParams.get("reason"), "STATE_INVALID");
    assert.equal(u.searchParams.get("evil"), null); assert.equal(u.origin, "http://localhost:3000");
  });

  // =====================================================================================
  section("C. Konfigurasi .env (mode, validasi, rahasia tidak bocor)");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oauth-env-")); // cwd kosong: .env asli tidak ikut terbaca
  const runEnv = (extra = {}) => {
    const env = { PATH: process.env.PATH, SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", JWT_SECRET: "j".repeat(40), FRONTEND_URL: "http://localhost:3000,https://www.lia.example", ...extra };
    const script = `const e=require(${JSON.stringify(path.join(ROOT, "src/config/env.js"))});console.log(JSON.stringify({mode:e.googleDrive.authMode,enabled:e.googleDrive.enabled,oauth:e.googleOAuth.enabled,fr:e.googleOAuth.frontendRedirect,ttl:e.googleOAuth.stateTtlSeconds,keyLen:e.googleOAuth.encryptionKey&&e.googleOAuth.encryptionKey.length}))`;
    const r = spawnSync(process.execPath, ["-e", script], { env, cwd: tmp, encoding: "utf8" });
    return { code: r.status, out: r.stdout, err: r.stderr, json: r.status === 0 ? JSON.parse(r.stdout) : null };
  };
  const OAUTH = { GOOGLE_DRIVE_ROOT_FOLDER_ID: ROOT_ID, GOOGLE_OAUTH_CLIENT_ID: "client-id-123456.apps.googleusercontent.com", GOOGLE_OAUTH_CLIENT_SECRET: "GOCSPX-super-secret-xyz", GOOGLE_OAUTH_REDIRECT_URI: REDIRECT_URI, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: ENC_KEY_B64 };
  const SA = { GOOGLE_DRIVE_ROOT_FOLDER_ID: ROOT_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@proj.iam.gserviceaccount.com", GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nMIIEabc\\n-----END PRIVATE KEY-----\\n" };
  await test("tanpa konfigurasi Google: server tetap start, mode none", () => {
    const r = runEnv(); assert.equal(r.code, 0, r.err); assert.deepEqual([r.json.mode, r.json.enabled, r.json.oauth], ["none", false, false]);
  });
  await test("konfigurasi Service Account lama (tanpa GOOGLE_AUTH_MODE) tetap valid -> mode service_account", () => {
    const r = runEnv(SA); assert.equal(r.code, 0, r.err); assert.deepEqual([r.json.mode, r.json.enabled, r.json.oauth], ["service_account", true, false]);
  });
  await test("OAuth lengkap (mode otomatis & eksplisit) valid; kunci 32 byte terbaca; TTL default 600", () => {
    for (const extra of [OAUTH, { ...OAUTH, GOOGLE_AUTH_MODE: "oauth" }]) {
      const r = runEnv(extra); assert.equal(r.code, 0, r.err);
      assert.deepEqual([r.json.mode, r.json.enabled, r.json.oauth, r.json.keyLen, r.json.ttl], ["oauth", true, true, 32, 600]);
    }
  });
  await test("kedua jenis kredensial terisi: tanpa GOOGLE_AUTH_MODE ditolak; dengan mode eksplisit keduanya valid (mode lain diabaikan)", () => {
    const both = { ...SA, ...OAUTH };
    const bad = runEnv(both); assert.equal(bad.code, 1); assert.match(bad.err, /GOOGLE_AUTH_MODE/);
    assert.equal(runEnv({ ...both, GOOGLE_AUTH_MODE: "oauth" }).json.mode, "oauth");
    assert.equal(runEnv({ ...both, GOOGLE_AUTH_MODE: "service_account" }).json.mode, "service_account");
  });
  await test("variabel OAuth wajib diisi satu per satu: pesan menyebut NAMA variabel", () => {
    for (const name of ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", "GOOGLE_DRIVE_ROOT_FOLDER_ID"]) {
      const env = { ...OAUTH, GOOGLE_AUTH_MODE: "oauth" }; delete env[name];
      const r = runEnv(env); assert.equal(r.code, 1, name); assert.ok(r.err.includes(name), `${name}: ${r.err}`);
    }
  });
  await test("nilai tidak valid ditolak: GOOGLE_AUTH_MODE, kunci enkripsi, redirect URI (http non-lokal, path salah, query), TTL, folder berupa URL", () => {
    const cases = [
      [{ GOOGLE_AUTH_MODE: "saml" }, /GOOGLE_AUTH_MODE/],
      [{ GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: "terlalu-pendek" }, /GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY/],
      [{ GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: crypto.randomBytes(16).toString("hex") }, /GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY/],
      [{ GOOGLE_OAUTH_REDIRECT_URI: "http://api.lia.example/api/admin/google-drive/callback" }, /GOOGLE_OAUTH_REDIRECT_URI/],
      [{ GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:5000/callback" }, /GOOGLE_OAUTH_REDIRECT_URI/],
      [{ GOOGLE_OAUTH_REDIRECT_URI: `${REDIRECT_URI}?a=1` }, /GOOGLE_OAUTH_REDIRECT_URI/],
      [{ GOOGLE_OAUTH_REDIRECT_URI: "bukan-url" }, /GOOGLE_OAUTH_REDIRECT_URI/],
      [{ GOOGLE_OAUTH_STATE_TTL_SECONDS: "5" }, /GOOGLE_OAUTH_STATE_TTL_SECONDS/],
      [{ GOOGLE_DRIVE_ROOT_FOLDER_ID: "https://drive.google.com/drive/folders/abc" }, /GOOGLE_DRIVE_ROOT_FOLDER_ID/],
    ];
    for (const [extra, re] of cases) { const r = runEnv({ ...OAUTH, ...extra }); assert.equal(r.code, 1, JSON.stringify(extra)); assert.match(r.err, re); }
  });
  await test("GOOGLE_OAUTH_FRONTEND_REDIRECT: origin FRONTEND_URL diterima; domain lain/userinfo/fragment ditolak; production wajib https", () => {
    assert.equal(runEnv({ ...OAUTH, GOOGLE_OAUTH_FRONTEND_REDIRECT: "http://localhost:3000/admin/drive" }).json.fr, "http://localhost:3000/admin/drive");
    for (const bad of ["https://evil.com/x", "http://localhost:3000@evil.com", "http://localhost:3000/a#x"]) {
      const r = runEnv({ ...OAUTH, GOOGLE_OAUTH_FRONTEND_REDIRECT: bad }); assert.equal(r.code, 1, bad); assert.match(r.err, /GOOGLE_OAUTH_FRONTEND_REDIRECT/);
    }
    const prod = runEnv({ ...OAUTH, NODE_ENV: "production", GOOGLE_OAUTH_FRONTEND_REDIRECT: "http://localhost:3000/a", GOOGLE_OAUTH_REDIRECT_URI: "https://api.lia.example/api/admin/google-drive/callback" });
    assert.equal(prod.code, 1);
  });
  await test("pesan error konfigurasi tidak pernah memuat NILAI rahasia (client secret, kunci enkripsi)", () => {
    const r = runEnv({ ...OAUTH, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: "salah-" + ENC_KEY_B64.slice(0, 20), GOOGLE_OAUTH_REDIRECT_URI: "bukan-url" });
    assert.equal(r.code, 1);
    for (const secret of [OAUTH.GOOGLE_OAUTH_CLIENT_SECRET, ENC_KEY_B64.slice(0, 20)]) assert.ok(!r.err.includes(secret) && !r.out.includes(secret));
  });

  // =====================================================================================
  section("D. State & PKCE");
  let w = makeWorld();
  await test("authUrl: endpoint Google, client_id, redirect_uri, scope drive penuh, S256, access_type=offline, prompt consent+select_account", async () => {
    const { authUrl, expiresInSeconds } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const u = new URL(authUrl); const p = u.searchParams;
    assert.equal(`${u.origin}${u.pathname}`, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(p.get("client_id"), w.google.st.clientId); assert.equal(p.get("redirect_uri"), REDIRECT_URI);
    assert.equal(p.get("response_type"), "code"); assert.equal(p.get("scope"), "https://www.googleapis.com/auth/drive");
    assert.equal(p.get("code_challenge_method"), "S256"); assert.equal(p.get("access_type"), "offline");
    assert.equal(p.get("prompt"), "consent select_account"); assert.equal(expiresInSeconds, 600);
    assert.ok(!authUrl.includes(w.google.st.clientSecret), "client secret tidak boleh ada di authUrl");
    assert.equal(p.get("code_verifier"), null);
  });
  await test("state acak 256-bit (43 char base64url), tidak berulang; code_challenge = BASE64URL(SHA256(code_verifier)) (diverifikasi Google palsu)", async () => {
    const states = new Set();
    for (let i = 0; i < 25; i += 1) {
      const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
      const s = new URL(authUrl).searchParams.get("state"); assert.match(s, /^[A-Za-z0-9_-]{43}$/); states.add(s);
    }
    assert.equal(states.size, 25);
    const r = await w.connect(); assert.equal(r.account.email, "tester@gmail.com"); // PKCE cocok -> Google palsu menerima
    assert.match(w.google.st.seenVerifiers.at(-1), /^[A-Za-z0-9_-]{43}$/);
  });
  await test("database hanya menyimpan HASH state dan code_verifier TERENKRIPSI (bukan nilai asli)", async () => {
    w = makeWorld();
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const state = new URL(authUrl).searchParams.get("state");
    const rows = w.db.google_oauth_states; assert.equal(rows.length, 1);
    assert.equal(rows[0].state_hash, crypto.createHash("sha256").update(state).digest("hex"));
    assert.ok(!JSON.stringify(rows).includes(state)); assert.match(rows[0].code_verifier_enc, /^v1\./);
    assert.equal(rows[0].admin_id, ADMIN_ID);
    assert.equal(new Date(rows[0].expires_at).getTime() - w.clock.now(), 600_000);
  });
  await test("state SEKALI PAKAI: callback kedua dengan state & code sama ditolak; state terhapus dari database", async () => {
    w = makeWorld();
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const cb = new URL(w.google.authorize(authUrl, "tester@gmail.com"));
    const args = { code: cb.searchParams.get("code"), state: cb.searchParams.get("state") };
    assert.equal((await w.svc.handleCallback(args)).account.email, "tester@gmail.com");
    assert.equal(w.db.google_oauth_states.length, 0);
    assert.equal(await w.flowCode(w.svc.handleCallback(args)), "STATE_INVALID");
    assert.equal(w.google.st.exchangeCalls, 1, "pemakaian ulang tidak boleh sampai ke Google");
  });
  await test("callback paralel dengan state sama: tepat satu yang berhasil", async () => {
    w = makeWorld();
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const cb = new URL(w.google.authorize(authUrl, "tester@gmail.com"));
    const args = { code: cb.searchParams.get("code"), state: cb.searchParams.get("state") };
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => w.svc.handleCallback(args)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(w.google.st.exchangeCalls, 1);
  });
  await test("state kedaluwarsa (lewat TTL) -> STATE_EXPIRED, tidak ada pertukaran code; tepat di dalam TTL masih valid", async () => {
    w = makeWorld();
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const cb = new URL(w.google.authorize(authUrl, "tester@gmail.com"));
    w.advance(601_000);
    assert.equal(await w.flowCode(w.svc.handleCallback({ code: cb.searchParams.get("code"), state: cb.searchParams.get("state") })), "STATE_EXPIRED");
    assert.equal(w.google.st.exchangeCalls, 0); assert.equal(w.row(), undefined);
    w = makeWorld();
    const again = await w.svc.startConnect({ adminId: ADMIN_ID });
    const cb2 = new URL(w.google.authorize(again.authUrl, "tester@gmail.com")); w.advance(599_000);
    assert.equal((await w.svc.handleCallback({ code: cb2.searchParams.get("code"), state: cb2.searchParams.get("state") })).account.email, "tester@gmail.com");
  });
  await test("state tidak dikenal / bentuk salah / kosong / dipalsukan -> STATE_INVALID tanpa menyentuh Google", async () => {
    w = makeWorld();
    for (const state of [undefined, "", "pendek", "x".repeat(43), "<script>alert(1)</script>".padEnd(43, "a"), `${"a".repeat(42)}%`, "a".repeat(200)]) {
      assert.equal(await w.flowCode(w.svc.handleCallback({ code: "abc", state })), "STATE_INVALID", String(state));
    }
    assert.equal(w.google.st.exchangeCalls, 0);
  });
  await test("code kosong/terlalu panjang -> ditolak; state dibuang (tidak bisa dicoba ulang)", async () => {
    w = makeWorld();
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const state = new URL(authUrl).searchParams.get("state");
    assert.equal(await w.flowCode(w.svc.handleCallback({ code: "", state })), "STATE_INVALID");
    assert.equal(w.db.google_oauth_states.length, 0);
  });
  await test("state diterbitkan untuk admin A: admin yang kemudian dinonaktifkan -> ADMIN_INACTIVE dan tidak ada kredensial tersimpan", async () => {
    w = makeWorld();
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const cb = new URL(w.google.authorize(authUrl, "tester@gmail.com")); w.flags.adminActive = false;
    assert.equal(await w.flowCode(w.svc.handleCallback({ code: cb.searchParams.get("code"), state: cb.searchParams.get("state") })), "ADMIN_INACTIVE");
    assert.equal(w.row(), undefined); assert.equal(w.google.st.exchangeCalls, 0);
  });
  await test("pengguna menolak izin di Google (error=access_denied) -> ACCESS_DENIED, state dibuang, koneksi lama tidak berubah", async () => {
    w = makeWorld(); await w.connect("lama@gmail.com"); const before = w.row().connection_id;
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const state = new URL(authUrl).searchParams.get("state");
    assert.equal(await w.flowCode(w.svc.handleCallback({ error: "access_denied", state })), "ACCESS_DENIED");
    assert.equal(w.db.google_oauth_states.length, 0); assert.equal(w.row().connection_id, before); assert.equal(w.row().status, "connected");
  });
  await test("state kedaluwarsa dibersihkan otomatis saat state baru dibuat (tabel tidak menumpuk)", async () => {
    w = makeWorld();
    for (let i = 0; i < 3; i += 1) await w.svc.startConnect({ adminId: ADMIN_ID });
    w.advance(700_000); await w.svc.startConnect({ adminId: ADMIN_ID });
    assert.equal(w.db.google_oauth_states.length, 1);
  });
  await test("PKCE: code_verifier yang tidak cocok dengan challenge ditolak Google -> CODE_INVALID, tidak ada kredensial tersimpan", async () => {
    w = makeWorld();
    const { authUrl } = await w.svc.startConnect({ adminId: ADMIN_ID });
    const cb = new URL(w.google.authorize(authUrl, "tester@gmail.com"));
    // Penyerang yang tidak punya verifier asli: ganti challenge yang tercatat di Google palsu.
    const code = cb.searchParams.get("code"); w.google.st.codes.get(code).challenge = "tampered-challenge";
    assert.equal(await w.flowCode(w.svc.handleCallback({ code, state: cb.searchParams.get("state") })), "CODE_INVALID");
    assert.equal(w.row(), undefined);
  });

  // =====================================================================================
  section("E. Pertukaran authorization code, penyimpanan & dekripsi token");
  await test("connect sukses: baris kredensial 'connected', akun dari Drive about, scope & folder root tercatat", async () => {
    w = makeWorld(); const r = await w.connect("tester@gmail.com");
    assert.deepEqual(r, { account: { email: "tester@gmail.com", name: "tester" }, accountChanged: false });
    const row = w.row();
    assert.equal(row.status, "connected"); assert.equal(row.account_email, "tester@gmail.com"); assert.equal(row.account_permission_id, "perm-tester@gmail.com");
    assert.equal(row.scope, "https://www.googleapis.com/auth/drive"); assert.equal(row.root_folder_id, ROOT_ID); assert.equal(row.connected_by, ADMIN_ID);
  });
  await test("Google menerima client_id, client_secret, redirect_uri, code, code_verifier pada penukaran code", async () => {
    const call = w.google.st.log.find((l) => l.path === "/token");
    assert.equal(call.form.grant_type, "authorization_code"); assert.equal(call.form.client_id, w.google.st.clientId);
    assert.equal(call.form.client_secret, w.google.st.clientSecret); assert.equal(call.form.redirect_uri, REDIRECT_URI);
    assert.ok(call.form.code && call.form.code_verifier);
  });
  await test("refresh token tersimpan TERENKRIPSI: plaintext tidak ada di baris mana pun; dekripsi dengan kunci benar = token asli", async () => {
    const rt = [...w.google.st.refreshTokens.keys()][0];
    assert.match(w.row().refresh_token_enc, /^v1\./);
    assert.ok(!JSON.stringify(w.db).includes(rt), "refresh token plaintext ada di database");
    assert.equal(w.store.decryptRefreshToken(w.row()), rt);
    assert.throws(() => createTokenCrypto(OTHER_KEY).decrypt(w.row().refresh_token_enc, "google-oauth:refresh-token:primary"), (e) => e.code === "DECRYPT_FAILED");
  });
  await test("ACCESS TOKEN tidak pernah disimpan di database (hanya memori)", async () => {
    const ats = [...w.google.st.accessTokens.keys()]; assert.ok(ats.length >= 1);
    for (const at of ats) assert.ok(!JSON.stringify(w.db).includes(at));
  });
  await test("bentuk publik (toPublic/getStatus) tidak memuat token/ciphertext/secret", async () => {
    const pub = JSON.stringify([await w.store.getPublic(), await w.svc.getStatus()]);
    for (const leak of ["refresh_token", "refreshToken", "v1.", "access", w.google.st.clientSecret, ...w.google.secrets()]) assert.ok(!pub.includes(leak), `bocor: ${leak}`);
    assert.match(pub, /tester@gmail\.com/);
  });
  await test("setelah connect, access token yang ada langsung dipakai (tanpa refresh tambahan)", async () => {
    assert.equal(w.google.st.refreshCalls, 0);
    const at = await w.svc.getAccessToken(); assert.match(at, /^at_/); assert.equal(w.google.st.refreshCalls, 0);
  });
  await test("Google tidak memberi refresh_token -> NO_REFRESH_TOKEN; tidak ada kredensial disimpan", async () => {
    w = makeWorld(); w.google.st.omitRefreshToken = true;
    assert.equal(await w.flowCode(w.connect()), "NO_REFRESH_TOKEN"); assert.equal(w.row(), undefined);
  });
  await test("scope Drive tidak diberikan penuh -> SCOPE_MISSING; tidak ada kredensial disimpan", async () => {
    w = makeWorld(); w.google.st.scopeOverride = "openid email";
    assert.equal(await w.flowCode(w.connect()), "SCOPE_MISSING"); assert.equal(w.row(), undefined);
  });
  await test("client secret salah -> CLIENT_INVALID; Google tidak tersedia (500) -> GOOGLE_UNAVAILABLE; tidak ada kredensial", async () => {
    w = makeWorld({ cfg: { clientSecret: "salah" } });
    assert.equal(await w.flowCode(w.connect()), "CLIENT_INVALID"); assert.equal(w.row(), undefined);
    w = makeWorld(); w.google.st.aboutStatus = 0;
    const orig = w.google.fetch; let n = 0;
    const flaky = createGoogleOAuthService({ config: { enabled: true, clientId: w.google.st.clientId, clientSecret: w.google.st.clientSecret, redirectUri: REDIRECT_URI, rootFolderId: ROOT_ID }, store: w.store, fetchImpl: async (u, i) => (String(u).endsWith("/token") && (n += 1) ? jsonRes({ error: "backend_error" }, 503) : orig(u, i)), isAdminActive: async () => true, sleep: async () => {} });
    const { authUrl } = await flaky.startConnect({ adminId: ADMIN_ID }); const cb = new URL(w.google.authorize(authUrl, "t@gmail.com"));
    assert.equal(await w.flowCode(flaky.handleCallback({ code: cb.searchParams.get("code"), state: cb.searchParams.get("state") })), "GOOGLE_UNAVAILABLE");
    assert.equal(n, 1, "pertukaran code tidak boleh diulang"); assert.equal(w.row(), undefined);
  });
  await test("Drive API ditolak (about 403, mis. API belum aktif) -> DRIVE_ACCESS_DENIED; tidak ada kredensial", async () => {
    w = makeWorld(); w.google.st.aboutStatus = 403;
    assert.equal(await w.flowCode(w.connect()), "DRIVE_ACCESS_DENIED"); assert.equal(w.row(), undefined);
  });
  await test("folder root tidak dapat diakses akun -> ROOT_FOLDER_INACCESSIBLE; root bukan folder -> ROOT_FOLDER_INVALID; root hanya-baca -> ROOT_FOLDER_READONLY", async () => {
    w = makeWorld(); w.google.st.rootAccess.add("orang-lain@gmail.com");
    assert.equal(await w.flowCode(w.connect("tester@gmail.com")), "ROOT_FOLDER_INACCESSIBLE"); assert.equal(w.row(), undefined);
    w = makeWorld(); w.google.st.rootMime = "application/pdf"; assert.equal(await w.flowCode(w.connect()), "ROOT_FOLDER_INVALID");
    w = makeWorld(); w.google.st.rootCanAdd = false; assert.equal(await w.flowCode(w.connect()), "ROOT_FOLDER_READONLY"); assert.equal(w.row(), undefined);
  });
  await test("kegagalan verifikasi TIDAK menghapus kredensial lama (koneksi lama tetap berfungsi)", async () => {
    w = makeWorld(); await w.connect("lama@gmail.com");
    const before = { enc: w.row().refresh_token_enc, id: w.row().connection_id };
    w.google.st.rootAccess.add("lama@gmail.com"); // akun baru tidak punya akses ke folder root
    assert.equal(await w.flowCode(w.connect("baru@gmail.com")), "ROOT_FOLDER_INACCESSIBLE");
    assert.equal(w.row().refresh_token_enc, before.enc); assert.equal(w.row().connection_id, before.id); assert.equal(w.row().account_email, "lama@gmail.com");
    assert.match(await w.svc.getAccessToken(), /^at_/);
  });
  await test("simpan ke database gagal -> INTERNAL, kredensial lama utuh", async () => {
    w = makeWorld(); await w.connect("lama@gmail.com"); const enc = w.row().refresh_token_enc;
    w.sb.faults.push({ table: "google_oauth_credentials", op: "update", error: { code: "XX000", message: "boom" } });
    assert.equal(await w.flowCode(w.connect("baru@gmail.com")), "INTERNAL"); assert.equal(w.row().refresh_token_enc, enc);
  });

  // =====================================================================================
  section("F. Refresh token, invalid_grant, dan status reauth_required");
  await test("access token di-cache di memori: banyak panggilan = 0 refresh; kedaluwarsa (lewat expires_in - 60 dtk) -> 1 refresh", async () => {
    w = makeWorld(); await w.connect();
    const a = await w.svc.getAccessToken(); for (let i = 0; i < 10; i += 1) assert.equal(await w.svc.getAccessToken(), a);
    assert.equal(w.google.st.refreshCalls, 0);
    w.advance(3_500_000); // 3599 dtk - 60 dtk skew = 3539 dtk; 3500 dtk masih valid
    assert.equal(await w.svc.getAccessToken(), a); assert.equal(w.google.st.refreshCalls, 0);
    w.advance(60_000); const b = await w.svc.getAccessToken(); assert.notEqual(b, a); assert.equal(w.google.st.refreshCalls, 1);
    const call = w.google.st.log.filter((l) => l.path === "/token").at(-1);
    assert.equal(call.form.grant_type, "refresh_token"); assert.equal(call.form.client_secret, w.google.st.clientSecret);
  });
  await test("refresh berhasil: last_refresh_at diperbarui, status tetap connected, access token tidak masuk database", async () => {
    const row = w.row(); assert.equal(row.status, "connected"); assert.equal(row.last_error_code, null);
    assert.equal(row.last_refresh_at, new Date(w.clock.now()).toISOString());
    for (const at of w.google.st.accessTokens.keys()) assert.ok(!JSON.stringify(w.db).includes(at));
  });
  await test("5 permintaan paralel saat token kedaluwarsa -> hanya 1 panggilan refresh (single-flight)", async () => {
    w = makeWorld(); await w.connect(); w.advance(3_700_000);
    const tokens = await Promise.all(Array.from({ length: 5 }, () => w.svc.getAccessToken()));
    assert.equal(new Set(tokens).size, 1); assert.equal(w.google.st.refreshCalls, 1);
  });
  await test("Google merotasi refresh token -> token baru disimpan terenkripsi menggantikan yang lama", async () => {
    w = makeWorld(); await w.connect(); w.google.st.rotateRefresh = true; w.advance(3_700_000);
    const oldRt = w.store.decryptRefreshToken(w.row()); await w.svc.getAccessToken();
    const newRt = w.store.decryptRefreshToken(w.row()); assert.notEqual(newRt, oldRt); assert.match(newRt, /^rt_/);
    assert.ok(!JSON.stringify(w.db).includes(newRt));
    w.advance(3_700_000); assert.match(await w.svc.getAccessToken(), /^at_/); // token baru benar-benar bekerja
  });
  await test("gangguan sementara (503, 503, lalu sukses) -> diulang, tidak mengubah status", async () => {
    w = makeWorld(); await w.connect(); w.advance(3_700_000);
    w.google.st.tokenFailures.push({ status: 503 }, { status: 503 });
    assert.match(await w.svc.getAccessToken(), /^at_/); assert.equal(w.google.st.refreshCalls, 3); assert.equal(w.row().status, "connected");
  });
  await test("gangguan jaringan terus-menerus -> 502 GOOGLE_AUTH_UNAVAILABLE setelah 3 percobaan; status TETAP connected (bukan reauth)", async () => {
    w = makeWorld(); await w.connect(); w.advance(3_700_000);
    w.google.st.tokenFailures.push({ network: true }, { network: true }, { network: true });
    const code = await w.appCode(w.svc.getAccessToken()); assert.equal(code, "GOOGLE_AUTH_UNAVAILABLE");
    assert.equal(w.google.st.refreshCalls, 3); assert.equal(w.row().status, "connected"); assert.equal(w.row().last_error_code, "network");
    assert.match(await w.svc.getAccessToken(), /^at_/, "pulih otomatis setelah gangguan berlalu");
    assert.equal(w.row().last_error_code, null);
  });
  await test("invalid_grant (token dicabut) -> status reauth_required; panggilan berikutnya 503 GOOGLE_REAUTH_REQUIRED TANPA menghubungi Google", async () => {
    w = makeWorld(); await w.connect(); w.advance(3_700_000);
    for (const r of w.google.st.refreshTokens.values()) r.revoked = true;
    assert.equal(await w.appCode(w.svc.getAccessToken()), "GOOGLE_REAUTH_REQUIRED");
    assert.equal(w.row().status, "reauth_required"); assert.equal(w.row().last_error_code, "invalid_grant");
    const calls = w.google.st.log.length;
    for (let i = 0; i < 3; i += 1) assert.equal(await w.appCode(w.svc.getAccessToken()), "GOOGLE_REAUTH_REQUIRED");
    assert.equal(w.google.st.log.length, calls, "tidak boleh menghubungi Google lagi");
  });
  await test("simulasi aplikasi 'Testing': refresh token kedaluwarsa ~7 hari -> reauth_required; 6 hari masih aman", async () => {
    w = makeWorld(); w.google.st.refreshTokenLifetimeMs = 7 * 86_400_000; await w.connect();
    w.advance(6 * 86_400_000); assert.match(await w.svc.getAccessToken(), /^at_/);
    w.advance(2 * 86_400_000); assert.equal(await w.appCode(w.svc.getAccessToken()), "GOOGLE_REAUTH_REQUIRED"); assert.equal(w.row().status, "reauth_required");
  });
  await test("status reauth_required: getStatus melaporkan status + kode error; metadata/akun tetap tampil untuk admin", async () => {
    const s = await w.svc.getStatus(); assert.equal(s.connection.status, "reauth_required"); assert.equal(s.connection.lastErrorCode, "invalid_grant");
    assert.equal(s.connection.accountEmail, "tester@gmail.com");
  });
  await test("pulih: hubungkan ulang (akun sama) -> connected lagi, token baru bekerja", async () => {
    w.google.st.refreshTokenLifetimeMs = null;
    const r = await w.connect("tester@gmail.com"); assert.equal(r.accountChanged, false);
    assert.equal(w.row().status, "connected"); assert.equal(w.row().last_error_code, null); assert.match(await w.svc.getAccessToken(), /^at_/);
  });
  await test("invalid_grant dari refresh LAMA tidak menimpa koneksi BARU (compare-and-set connection_id)", async () => {
    w = makeWorld(); await w.connect("a@gmail.com"); w.advance(3_700_000);
    const oldRt = [...w.google.st.refreshTokens.keys()][0];
    // Selama refresh lama berjalan, admin menghubungkan ulang; refresh lama gagal invalid_grant.
    const origFetch = w.google.fetch; let injected = false;
    const svc2 = createGoogleOAuthService({ config: { enabled: true, clientId: w.google.st.clientId, clientSecret: w.google.st.clientSecret, redirectUri: REDIRECT_URI, rootFolderId: ROOT_ID, stateTtlSeconds: 600 }, store: w.store, isAdminActive: async () => true, now: () => w.clock.now(), sleep: async () => {}, statusCacheMs: 0,
      fetchImpl: async (u, i) => {
        if (String(u).endsWith("/token") && String(i.body).includes("grant_type=refresh_token") && !injected) {
          injected = true; await w.connect("a@gmail.com"); // koneksi baru masuk di tengah refresh
          return jsonRes({ error: "invalid_grant" }, 400);
        }
        return origFetch(u, i);
      } });
    const token = await svc2.getAccessToken();
    assert.match(token, /^at_/, "harus memakai koneksi baru, bukan gagal");
    assert.equal(w.row().status, "connected"); assert.notEqual(w.store.decryptRefreshToken(w.row()), oldRt);
  });
  await test("kunci enkripsi diganti (token tak terbaca) -> reauth_required DECRYPT_FAILED, tanpa crash dan tanpa menghubungi Google", async () => {
    w = makeWorld(); await w.connect(); w.advance(3_700_000);
    const wrongStore = createGoogleOAuthStore({ supabase: w.sb.client, crypto: createTokenCrypto(OTHER_KEY), now: () => w.clock.now() });
    const svc2 = createGoogleOAuthService({ config: { enabled: true, clientId: "c", clientSecret: "s", redirectUri: REDIRECT_URI, rootFolderId: ROOT_ID }, store: wrongStore, fetchImpl: w.google.fetch, now: () => w.clock.now(), statusCacheMs: 0 });
    const before = w.google.st.log.length;
    assert.equal(await w.appCode(svc2.getAccessToken()), "GOOGLE_REAUTH_REQUIRED");
    assert.equal(w.row().status, "reauth_required"); assert.equal(w.row().last_error_code, "DECRYPT_FAILED"); assert.equal(w.google.st.log.length, before);
  });
  await test("invalid_client (konfigurasi server salah) -> 503 GOOGLE_OAUTH_CLIENT_INVALID; status TIDAK diubah ke reauth", async () => {
    w = makeWorld(); await w.connect(); w.advance(3_700_000); w.google.st.clientSecret = "diganti-di-google";
    assert.equal(await w.appCode(w.svc.getAccessToken()), "GOOGLE_OAUTH_CLIENT_INVALID"); assert.equal(w.row().status, "connected");
  });
  await test("belum pernah terhubung / terputus -> 503 GOOGLE_DRIVE_NOT_CONNECTED; mode OAuth nonaktif -> STORAGE_NOT_CONFIGURED", async () => {
    w = makeWorld(); assert.equal(await w.appCode(w.svc.getAccessToken()), "GOOGLE_DRIVE_NOT_CONNECTED");
    const off = createGoogleOAuthService({ config: { enabled: false } });
    assert.equal(await w.appCode(off.getAccessToken()), "STORAGE_NOT_CONFIGURED");
    assert.equal(await w.appCode(off.startConnect({ adminId: ADMIN_ID })), "OAUTH_NOT_ENABLED");
    assert.deepEqual(await off.getStatus(), { authMode: "oauth", configured: false, connection: { status: "disconnected" } });
  });
  await test("cache status: dengan statusCacheMs>0 pembacaan database dihemat; perubahan dari proses lain terlihat setelah TTL", async () => {
    w = makeWorld({ statusCacheMs: 15_000 }); await w.connect();
    let reads = 0; const orig = w.store.getRow; w.store.getRow = async () => { reads += 1; return orig(); };
    for (let i = 0; i < 20; i += 1) await w.svc.getAccessToken();
    assert.ok(reads <= 1, `membaca DB ${reads}x`);
    w.row().status = "reauth_required"; // proses lain menandai reauth
    assert.match(await w.svc.getAccessToken(), /^at_/, "masih dalam TTL cache");
    w.advance(16_000); assert.equal(await w.appCode(w.svc.getAccessToken()), "GOOGLE_REAUTH_REQUIRED");
  });

  // =====================================================================================
  section("G. Connect, disconnect, pergantian akun, cache folder, dan Drive dengan token OAuth");
  w = makeWorld(); await w.connect("tester@gmail.com");
  let folderId; let fileId;
  await test("klien Drive ASLI memakai access token OAuth: folder kategori dibuat, unggah resumable, unduh, hapus (trash)", async () => {
    folderId = await w.drive.ensureFolder("akreditasi-program-studi");
    const up = await w.drive.uploadFile({ name: "abc__x.pdf", mimeType: "application/pdf", buffer: pdf("isi"), parentId: folderId, appProperties: { recordId: "R1" } });
    fileId = up.id;
    const got = Buffer.from(await (await w.drive.downloadFile(fileId)).arrayBuffer()); assert.ok(got.equals(pdf("isi")));
    const range = await w.drive.downloadFile(fileId, { range: "bytes=0-3" }); assert.equal(range.status, 206); assert.equal(Buffer.from(await range.arrayBuffer()).toString(), "%PDF");
    const authed = w.google.st.log.filter((l) => l.host !== "oauth2.googleapis.com").map((l) => l.auth);
    assert.ok(authed.length >= 5 && authed.every((a) => /^at_/.test(a)), "semua panggilan Drive memakai access token OAuth");
    assert.equal(w.google.st.files.get(fileId).appProperties.app, "lia-be"); assert.equal(w.google.st.files.get(fileId).owner, "tester@gmail.com");
    assert.ok(w.google.st.log.every((l) => !/permissions/.test(l.path)), "file tidak pernah dibuat publik");
  });
  await test("Drive menjawab 401 (access token dicabut lebih awal) -> refresh otomatis SEKALI lalu operasi berhasil", async () => {
    const before = w.google.st.refreshCalls; w.google.revokeAllAccessTokens();
    const meta = await w.drive.getFileMetadata(fileId); assert.equal(meta.id, fileId); assert.equal(w.google.st.refreshCalls, before + 1);
  });
  await test("unggah juga pulih dari 401 tanpa membuat file ganda", async () => {
    w.google.revokeAllAccessTokens(); const n = w.google.liveFiles().length;
    const up = await w.drive.uploadFile({ name: "kedua.pdf", mimeType: "application/pdf", buffer: pdf("2"), parentId: folderId });
    assert.ok(up.id); assert.equal(w.google.liveFiles().length, n + 1);
  });
  await test("refresh token juga dicabut -> Drive 401 -> refresh invalid_grant -> AppError GOOGLE_REAUTH_REQUIRED (final, tidak diulang berkali-kali)", async () => {
    w.google.revokeAllAccessTokens(); for (const r of w.google.st.refreshTokens.values()) r.revoked = true;
    const before = w.google.st.log.length;
    assert.equal(await w.appCode(w.drive.getFileMetadata(fileId)), "GOOGLE_REAUTH_REQUIRED"); assert.equal(w.row().status, "reauth_required");
    assert.ok(w.google.st.log.length - before <= 3, `terlalu banyak panggilan: ${w.google.st.log.length - before}`);
    assert.equal(await w.appCode(w.drive.ensureFolder("regulasi-banpt")), "GOOGLE_REAUTH_REQUIRED");
  });
  await test("metadata dokumen & file lama TIDAK tersentuh saat status reauth_required", async () => {
    assert.ok(w.google.st.files.has(fileId) && !w.google.st.files.get(fileId).trashed);
  });

  // --- disconnect ---
  w = makeWorld(); await w.connect("tester@gmail.com");
  w.db.banpt_regulations = [{ id: "reg-1", title: "Perban", document_drive_file_id: "drv_keep", attachments: [{ id: "a1", driveFileId: "drv_att" }], status: "published" }];
  w.db.accreditation_study_programs = [{ id: "p-1", document_drive_file_id: "drv_prodi" }, { id: "p-2", document_path: "lama/doc.pdf" }];
  w.db.drive_cleanup_queue = [{ id: "q1", file_id: "drv_antre", attempts: 2 }];
  const metaSnapshot = JSON.stringify([w.db.banpt_regulations, w.db.accreditation_study_programs, w.db.drive_cleanup_queue]);
  folderId = await w.drive.ensureFolder("regulasi-banpt");
  fileId = (await w.drive.uploadFile({ name: "a.pdf", mimeType: "application/pdf", buffer: pdf("a"), parentId: folderId })).id;
  const rtBefore = [...w.google.st.refreshTokens.keys()][0];
  let disc;
  await test("disconnect: token dicabut di Google, kredensial OAuth dihapus (token, akun, scope); akses langsung ditolak", async () => {
    disc = await w.svc.disconnect({ adminId: ADMIN2_ID });
    assert.deepEqual(disc, { alreadyDisconnected: false, revoked: true });
    assert.equal(w.google.st.refreshTokens.get(rtBefore).revoked, true); assert.equal(w.google.st.revokeCalls, 1);
    const r = w.row(); assert.equal(r.status, "disconnected");
    for (const f of ["refresh_token_enc", "account_email", "account_name", "account_permission_id", "scope", "root_folder_id", "connected_by", "connected_at"]) assert.equal(r[f], null, f);
    assert.equal(r.disconnected_by, ADMIN2_ID); assert.ok(r.disconnected_at);
    assert.equal(await w.appCode(w.svc.getAccessToken()), "GOOGLE_DRIVE_NOT_CONNECTED"); assert.equal(await w.appCode(w.drive.getFileMetadata(fileId)), "GOOGLE_DRIVE_NOT_CONNECTED");
    assert.ok(!JSON.stringify(w.db.google_oauth_credentials).includes(rtBefore));
  });
  await test("disconnect TIDAK menghapus metadata dokumen, relasi, antrean cleanup, maupun file di Drive", async () => {
    assert.equal(JSON.stringify([w.db.banpt_regulations, w.db.accreditation_study_programs, w.db.drive_cleanup_queue]), metaSnapshot);
    assert.ok(w.google.st.files.has(fileId) && !w.google.st.files.get(fileId).trashed);
    assert.ok(!w.google.st.log.some((l) => ["DELETE", "PATCH"].includes(l.method)), "tidak ada penghapusan/trash file");
  });
  await test("disconnect dua kali -> alreadyDisconnected, tanpa panggilan ke Google", async () => {
    const calls = w.google.st.revokeCalls; assert.deepEqual(await w.svc.disconnect({ adminId: ADMIN_ID }), { alreadyDisconnected: true, revoked: false });
    assert.equal(w.google.st.revokeCalls, calls);
  });
  await test("pencabutan di Google gagal (jaringan) -> kredensial lokal TETAP dihapus, revoked=false", async () => {
    w = makeWorld(); await w.connect(); w.google.st.revokeFail = { network: true };
    assert.deepEqual(await w.svc.disconnect({ adminId: ADMIN_ID }), { alreadyDisconnected: false, revoked: false });
    assert.equal(w.row().status, "disconnected"); assert.equal(w.row().refresh_token_enc, null);
  });
  await test("disconnect saat reauth_required (token sudah mati di Google) -> sukses, revoked=true (invalid_token dianggap tercabut)", async () => {
    w = makeWorld(); await w.connect(); w.advance(3_700_000); for (const r of w.google.st.refreshTokens.values()) r.revoked = true;
    await w.appCode(w.svc.getAccessToken()); assert.equal(w.row().status, "reauth_required");
    assert.deepEqual(await w.svc.disconnect({ adminId: ADMIN_ID }), { alreadyDisconnected: false, revoked: true }); assert.equal(w.row().status, "disconnected");
  });
  await test("hubungkan lagi setelah disconnect bekerja; admin lain boleh memutus (tidak ada role khusus)", async () => {
    w = makeWorld(); await w.connect("a@gmail.com", { adminId: ADMIN_ID }); await w.svc.disconnect({ adminId: ADMIN2_ID });
    assert.equal((await w.connect("a@gmail.com", { adminId: ADMIN2_ID })).account.email, "a@gmail.com"); assert.equal(w.row().connected_by, ADMIN2_ID);
    assert.match(await w.svc.getAccessToken(), /^at_/);
  });

  // --- cache folder ---
  await test("cache folder: panggilan kedua tidak ke Google; disconnect + connect ulang mereset cache", async () => {
    w = makeWorld(); await w.connect("a@gmail.com");
    const f1 = await w.drive.ensureFolder("regulasi-banpt"); const n = w.google.st.log.length;
    assert.equal(await w.drive.ensureFolder("regulasi-banpt"), f1); assert.equal(w.google.st.log.length, n, "harus dari cache");
    await w.svc.disconnect({ adminId: ADMIN_ID }); await w.connect("a@gmail.com"); const m = w.google.st.log.length;
    assert.equal(await w.drive.ensureFolder("regulasi-banpt"), f1); assert.ok(w.google.st.log.length > m, "cache harus kosong setelah disconnect/connect");
  });

  // --- pergantian akun ---
  w = makeWorld(); await w.connect("gmail.testing@gmail.com");
  const oldFolder = await w.drive.ensureFolder("akreditasi-program-studi");
  const oldFile = (await w.drive.uploadFile({ name: "lama.pdf", mimeType: "application/pdf", buffer: pdf("lama"), parentId: oldFolder })).id;
  w.db.accreditation_study_programs = [{ id: "p-1", document_drive_file_id: oldFile, sk_number: "SK-1" }];
  const oldRt = [...w.google.st.refreshTokens.keys()][0]; let resetCount = 0; w.svc.onConnectionChange(() => { resetCount += 1; });
  const staleDrive = createGoogleDriveService({ config: { enabled: true, rootFolderId: ROOT_ID, retryBaseMs: 1 }, fetchImpl: w.google.fetch, getAccessToken: w.svc.getAccessToken, getAuthScope: w.svc.getAuthScope });
  assert.equal(await staleDrive.ensureFolder("akreditasi-program-studi"), oldFolder); // ter-cache di instance yang TIDAK menerima event
  let sw;
  await test("ganti akun: accountChanged=true, koneksi baru aktif, event perubahan terkirim", async () => {
    sw = await w.connect("kampus@univ.ac.id");
    assert.equal(sw.accountChanged, true); assert.equal(w.row().account_email, "kampus@univ.ac.id"); assert.equal(w.row().status, "connected"); assert.ok(resetCount >= 1);
  });
  await test("setelah ganti akun, cache folder akun lama TIDAK dipakai: folder baru dibuat di akun baru (bahkan tanpa menerima event: kunci cache memuat koneksi)", async () => {
    const newFolder = await w.drive.ensureFolder("akreditasi-program-studi"); assert.notEqual(newFolder, oldFolder);
    assert.equal(w.google.st.files.get(newFolder).owner, "kampus@univ.ac.id");
    assert.equal(await staleDrive.ensureFolder("akreditasi-program-studi"), newFolder);
  });
  await test("ganti akun TIDAK menghapus/memindahkan file lama maupun metadata; file lama tidak terlihat dari akun baru (data uji)", async () => {
    assert.ok(w.google.st.files.has(oldFile) && !w.google.st.files.get(oldFile).trashed); assert.equal(w.db.accreditation_study_programs[0].document_drive_file_id, oldFile);
    await assert.rejects(w.drive.getFileMetadata(oldFile), (e) => e.name === "DriveError" && e.status === 404);
  });
  await test("token akun LAMA dicabut di Google setelah pergantian akun; token akun baru berfungsi", async () => {
    assert.equal(w.google.st.refreshTokens.get(oldRt).revoked, true); assert.match(await w.svc.getAccessToken(), /^at_/);
    assert.notEqual(w.store.decryptRefreshToken(w.row()), oldRt);
  });
  await test("hubungkan ulang akun yang SAMA: accountChanged=false dan token lama tidak dicabut", async () => {
    const rtNow = w.store.decryptRefreshToken(w.row()); const r = await w.connect("kampus@univ.ac.id");
    assert.equal(r.accountChanged, false); assert.equal(w.google.st.refreshTokens.get(rtNow).revoked, false);
  });
  await test("fallback identitas: tanpa permissionId, perbandingan akun memakai email", async () => {
    w = makeWorld(); w.google.addAccount("a@gmail.com", { permissionId: null }); w.google.addAccount("b@gmail.com", { permissionId: null });
    await w.connect("a@gmail.com"); assert.equal((await w.connect("a@gmail.com")).accountChanged, false); assert.equal((await w.connect("b@gmail.com")).accountChanged, true);
  });

  // =====================================================================================
  // Bagian H-I: HTTP sungguhan ke app Express (Supabase palsu + Google palsu; klien Drive ASLI)
  const appGoogle = createFakeGoogle({ redirectUri: REDIRECT_URI, rootFolderId: ROOT_ID });
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => (appGoogle.isGoogleUrl(url) ? appGoogle.fetch(url, init) : realFetch(url, init));

  const sb = createFakeSupabase({ strictTables: true }); const supabasePath = sb.install(); const { db, faults, legacy } = sb;
  const setOAuthEnv = (extra = {}) => {
    Object.assign(process.env, { GOOGLE_AUTH_MODE: "oauth", GOOGLE_DRIVE_ROOT_FOLDER_ID: ROOT_ID, GOOGLE_OAUTH_CLIENT_ID: appGoogle.st.clientId, GOOGLE_OAUTH_CLIENT_SECRET: appGoogle.st.clientSecret, GOOGLE_OAUTH_REDIRECT_URI: REDIRECT_URI, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: ENC_KEY_B64, GOOGLE_OAUTH_FRONTEND_REDIRECT: "" , ...extra });
  };
  const loadFreshApp = () => {
    for (const key of Object.keys(require.cache)) if (key.startsWith(path.join(ROOT, "src")) && key !== supabasePath) delete require.cache[key];
    delete require.cache[require.resolve("../app")];
    return require("../app");
  };
  let base; let server; let adminToken; let admin2Token; let inactiveToken;
  const INACTIVE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const seen = []; // semua respons HTTP (untuk pemindaian kebocoran, bagian J)
  const startServer = async () => {
    if (server) await new Promise((r) => server.close(r));
    server = loadFreshApp().listen(0); await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}`;
    const { signAdminToken } = require("../src/utils/token");
    [adminToken, admin2Token, inactiveToken] = [ADMIN_ID, ADMIN2_ID, INACTIVE_ID].map((id) => signAdminToken({ id }));
  };
  const call = async (method, url, { body, token = adminToken, form, headers: extra = {}, record = true } = {}) => {
    const headers = { ...extra }; if (token) headers.Authorization = `Bearer ${token}`;
    let payload; if (form) payload = form; else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await realFetch(`${base}${url}`, { method, headers, body: payload, redirect: "manual" });
    const buf = Buffer.from(await res.arrayBuffer()); const text = buf.toString("utf8");
    let json = null; try { json = JSON.parse(text); } catch { /* bukan JSON */ }
    if (record) seen.push({ url, text: buf.toString("latin1"), headers: JSON.stringify([...res.headers.entries()]) });
    return { status: res.status, headers: res.headers, buf, text, json };
  };
  const resetDb = () => {
    for (const k of Object.keys(db)) delete db[k];
    db.admins = [
      { id: ADMIN_ID, name: "Admin", email: "a@x.id", is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z" },
      { id: ADMIN2_ID, name: "Admin Dua", email: "b@x.id", is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z" },
      { id: INACTIVE_ID, name: "Nonaktif", email: "c@x.id", is_active: false, last_login_at: null, created_at: "2026-01-01T00:00:00Z" },
    ];
    legacy.objects.clear(); legacy.removed.length = 0; faults.length = 0;
  };
  const GD = "/api/admin/google-drive";
  const callbackFor = (authUrl, email, opts) => { const u = new URL(appGoogle.authorize(authUrl, email, opts)); return `${GD}/callback${u.search}`; };
  const doConnect = async (email = "tester@gmail.com", token = adminToken) => {
    const r = await call("POST", `${GD}/connect`, { token, record: false });
    assert.equal(r.status, 200, r.text);
    return call("GET", callbackFor(r.json.data.authUrl, email), { token: null });
  };
  const defaultService = () => require("../src/services/googleOAuthService").defaultInstance();

  setOAuthEnv(); resetDb(); await startServer();

  section("H. Endpoint OAuth (HTTP): akses admin, connect, callback, status, disconnect");
  await test("semua endpoint admin menolak tanpa token / token rusak / admin nonaktif (401), tanpa menyentuh Google", async () => {
    for (const [m, u] of [["GET", `${GD}/status`], ["POST", `${GD}/connect`], ["POST", `${GD}/disconnect`]]) {
      assert.equal((await call(m, u, { token: null })).status, 401, `${m} ${u} tanpa token`);
      assert.equal((await call(m, u, { token: "bukan.token.valid" })).status, 401, `${m} ${u} token rusak`);
      assert.equal((await call(m, u, { token: inactiveToken })).status, 401, `${m} ${u} admin nonaktif`);
    }
    assert.equal(appGoogle.st.log.length, 0); assert.equal((db.google_oauth_states || []).length, 0);
  });
  await test("status awal: oauth, terkonfigurasi, disconnected; tidak ada field rahasia", async () => {
    const r = await call("GET", `${GD}/status`); assert.equal(r.status, 200);
    assert.deepEqual(r.json.data, { authMode: "oauth", configured: true, connection: { status: "disconnected" } });
  });
  let authUrl;
  await test("POST connect (admin): mengembalikan authUrl Google + expiresInSeconds, no-store; browser-redirect dilakukan frontend", async () => {
    const r = await call("POST", `${GD}/connect`); assert.equal(r.status, 200, r.text);
    authUrl = r.json.data.authUrl; assert.match(authUrl, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/); assert.equal(r.json.data.expiresInSeconds, 600);
    assert.match(r.headers.get("cache-control"), /no-store/); assert.ok(!r.text.includes(appGoogle.st.clientSecret));
    assert.equal(db.google_oauth_states.length, 1); assert.equal(db.google_oauth_states[0].admin_id, ADMIN_ID);
  });
  await test("GET pada /connect & /disconnect (bukan POST) tidak memulai alur (404), sehingga tidak bisa dipicu lewat <img>/link", async () => {
    assert.equal((await call("GET", `${GD}/connect`)).status, 404); assert.equal((await call("GET", `${GD}/disconnect`)).status, 404);
  });
  await test("callback (tanpa Authorization, seperti redirect browser): 200 halaman HTML 'Google Drive berhasil terhubung' + email akun", async () => {
    const r = await call("GET", callbackFor(authUrl, "tester@gmail.com"), { token: null });
    assert.equal(r.status, 200, r.text); assert.match(r.headers.get("content-type"), /text\/html/);
    assert.match(r.text, /Google Drive berhasil terhubung/); assert.match(r.text, /tester@gmail\.com/);
    assert.match(r.headers.get("cache-control"), /no-store/); assert.equal(r.headers.get("referrer-policy"), "no-referrer");
    assert.ok(!r.text.includes("code=") && !/\bat_|\brt_|code_/.test(r.text), "halaman tidak boleh memuat code/token");
  });
  await test("status setelah connect: connected + akun; token/ciphertext/secret tidak ada di respons; refresh token terenkripsi di DB", async () => {
    const r = await call("GET", `${GD}/status`); const c = r.json.data.connection;
    assert.equal(c.status, "connected"); assert.equal(c.accountEmail, "tester@gmail.com"); assert.ok(c.connectedAt);
    assert.ok(!/token|secret|cipher/i.test(JSON.stringify(Object.keys(c))), "nama field memuat kata token");
    assert.match(db.google_oauth_credentials[0].refresh_token_enc, /^v1\./);
  });
  await test("callback diulang dengan URL yang sama -> 400 halaman gagal (state sekali pakai), tanpa stack trace", async () => {
    const r = await call("GET", callbackFor(authUrl, "tester@gmail.com", {}), { token: null }).catch((e) => ({ status: 0, text: String(e) }));
    // authorize() menerbitkan code baru tetapi state lama sudah terpakai
    assert.equal(r.status, 400, r.text); assert.match(r.text, /STATE_INVALID/); assert.ok(!/at Object|node_modules|Error:/.test(r.text));
  });
  await test("callback tanpa parameter / error=access_denied / state palsu -> halaman 400 aman; koneksi tidak berubah", async () => {
    const before = db.google_oauth_credentials[0].connection_id;
    for (const q of ["", "?error=access_denied", "?code=x&state=salah", "?code[]=a&state[]=b", `?error=${encodeURIComponent("<script>alert(1)</script>")}`]) {
      const r = await call("GET", `${GD}/callback${q}`, { token: null }); assert.equal(r.status, 400, q);
      assert.ok(!r.text.includes("<script>alert"), `XSS pada ${q}`); assert.match(r.text, /Google Drive gagal terhubung/);
    }
    assert.equal(db.google_oauth_credentials[0].connection_id, before);
  });
  await test("halaman callback meng-escape HTML: email akun berisi karakter HTML tidak menjadi markup", async () => {
    const evil = `x"><img src=x onerror=alert(1)>@gmail.com`; appGoogle.addAccount(evil, { name: "<b>n</b>", permissionId: "perm-evil" });
    const started = await call("POST", `${GD}/connect`, { record: false }); const r = await call("GET", callbackFor(started.json.data.authUrl, evil), { token: null });
    assert.equal(r.status, 200); assert.ok(!r.text.includes("<img src=x")); assert.match(r.text, /&lt;img src=x onerror=alert\(1\)&gt;/);
    await doConnect("tester@gmail.com");
  });
  await test("endpoint OAuth memakai pembatas laju (header RateLimit) dan route lama tetap hidup (health)", async () => {
    const r = await call("POST", `${GD}/connect`, { record: false }); assert.ok(r.headers.get("ratelimit") || r.headers.get("ratelimit-policy"));
    assert.equal((await call("GET", "/api/health", { token: null, record: false })).status, 200);
  });
  await test("semua admin AKTIF boleh disconnect (admin kedua); respons tanpa token; status kembali disconnected", async () => {
    const r = await call("POST", `${GD}/disconnect`, { token: admin2Token }); assert.equal(r.status, 200, r.text);
    assert.equal(r.json.data.revokedAtGoogle, true); assert.equal((await call("GET", `${GD}/status`)).json.data.connection.status, "disconnected");
    const again = await call("POST", `${GD}/disconnect`); assert.equal(again.status, 200); assert.equal(again.json.data.revokedAtGoogle, false);
  });
  await test("disconnect gagal mencabut di Google -> 200 + catatan cabut manual; kredensial lokal tetap terhapus", async () => {
    await doConnect(); appGoogle.st.revokeFail = { status: 500 };
    const r = await call("POST", `${GD}/disconnect`); assert.equal(r.status, 200); assert.equal(r.json.data.revokedAtGoogle, false); assert.match(r.json.data.note, /myaccount\.google\.com/);
    assert.equal(db.google_oauth_credentials[0].status, "disconnected"); appGoogle.st.revokeFail = null;
  });

  section("H2. Redirect callback ke frontend (anti open-redirect)");
  const FR = "http://localhost:3000/admin/google-drive";
  setOAuthEnv({ GOOGLE_OAUTH_FRONTEND_REDIRECT: FR }); resetDb(); await startServer();
  await test("sukses: 302 ke GOOGLE_OAUTH_FRONTEND_REDIRECT + google_drive=connected (tanpa halaman backend, tanpa token di URL)", async () => {
    const r = await doConnect(); assert.equal(r.status, 302); const loc = new URL(r.headers.get("location"));
    assert.equal(`${loc.origin}${loc.pathname}`, FR); assert.equal(loc.searchParams.get("google_drive"), "connected");
    assert.ok(![...loc.searchParams.keys()].some((k) => !["google_drive", "reason"].includes(k)), "hanya parameter tetap");
    assert.ok(!r.headers.get("location").includes("at_") && !r.headers.get("location").includes("code"));
  });
  await test("gagal: 302 ke frontend dengan google_drive=error&reason=<KODE tertutup>", async () => {
    const r = await call("GET", `${GD}/callback?code=x&state=${"a".repeat(43)}`, { token: null });
    assert.equal(r.status, 302); const loc = new URL(r.headers.get("location")); assert.equal(loc.searchParams.get("google_drive"), "error"); assert.equal(loc.searchParams.get("reason"), "STATE_INVALID");
    const denied = await call("GET", `${GD}/callback?error=access_denied`, { token: null }); assert.equal(new URL(denied.headers.get("location")).searchParams.get("reason"), "ACCESS_DENIED");
  });
  await test("parameter penyerang (redirect, redirect_uri, next, return_to, url, returnUrl) DIABAIKAN: tujuan selalu URL dari .env", async () => {
    const started = await call("POST", `${GD}/connect`, { record: false });
    const cb = callbackFor(started.json.data.authUrl, "tester@gmail.com");
    for (const k of ["redirect", "redirect_uri", "next", "return_to", "url", "returnUrl", "continue", "redirect_url"]) {
      const r = await call("GET", `${cb}&${k}=${encodeURIComponent("https://evil.com/phish")}`, { token: null });
      assert.equal(r.status, 302, k); const loc = r.headers.get("location"); assert.ok(loc.startsWith(FR), `${k} -> ${loc}`); assert.ok(!loc.includes("evil.com"));
    }
    const r2 = await call("GET", `${GD}/callback?code=x&state=${"a".repeat(43)}&redirect=//evil.com`, { token: null, headers: { Referer: "https://evil.com/", Origin: "https://evil.com", Host: "evil.com" } });
    assert.ok(r2.headers.get("location").startsWith(FR));
  });
  await test("endpoint connect tidak menerima URL redirect dari body/query (tidak mengubah authUrl.redirect_uri)", async () => {
    const r = await call("POST", `${GD}/connect?redirect=https://evil.com`, { body: { redirect: "https://evil.com", redirect_uri: "https://evil.com/cb" }, record: false });
    assert.equal(new URL(r.json.data.authUrl).searchParams.get("redirect_uri"), REDIRECT_URI);
  });

  section("H3. Mode Service Account / tanpa OAuth: endpoint OAuth tidak aktif dan tidak merusak apa pun");
  for (const k of Object.keys(process.env)) if (k.startsWith("GOOGLE_OAUTH_")) process.env[k] = "";
  Object.assign(process.env, { GOOGLE_AUTH_MODE: "service_account", GOOGLE_DRIVE_ROOT_FOLDER_ID: ROOT_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@proj.iam.gserviceaccount.com", GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nMIIEabc\\n-----END PRIVATE KEY-----\\n" });
  resetDb(); await startServer();
  await test("status melaporkan service_account; connect/disconnect -> 409 OAUTH_NOT_ENABLED; callback -> 404 halaman (tanpa efek)", async () => {
    const logBase = appGoogle.st.log.length; const s = await call("GET", `${GD}/status`); assert.deepEqual(s.json.data, { authMode: "service_account", configured: true, connection: { status: "service_account" } });
    for (const m of ["connect", "disconnect"]) { const r = await call("POST", `${GD}/${m}`); assert.equal(r.status, 409); assert.equal(r.json.code, "OAUTH_NOT_ENABLED"); }
    assert.equal((await call("GET", `${GD}/callback?code=x&state=${"a".repeat(43)}`, { token: null })).status, 404);
    assert.equal((db.google_oauth_states || []).length, 0); assert.equal(appGoogle.st.log.length, logBase);
  });
  await test("tanpa konfigurasi Google sama sekali: status not_configured, server tetap hidup", async () => {
    for (const k of Object.keys(process.env)) if (k.startsWith("GOOGLE_")) process.env[k] = "";
    await startServer(); const s = await call("GET", `${GD}/status`); assert.deepEqual(s.json.data, { authMode: "none", configured: false, connection: { status: "not_configured" } });
  });

  // =====================================================================================
  section("I. Upload, preview, download, delete lewat OAuth (app Express + klien Drive ASLI + Google palsu)");
  for (const k of Object.keys(process.env)) if (k.startsWith("GOOGLE_")) process.env[k] = "";
  setOAuthEnv(); resetDb(); await startServer();
  const REG = "/api/admin/banpt-regulations"; const PUB_REG = "/api/banpt-regulations";
  const form = (entries) => { const f = new FormData(); for (const [field, bytes, filename] of entries) f.append(field, new Blob([bytes], { type: "application/pdf" }), filename); return f; };
  let regSeq = 0;
  const mkReg = async () => (await call("POST", REG, { body: { regulationNumber: String((regSeq += 1)), regulationYear: 2024, determinationDate: "2024-03-01", title: "Instrumen" } })).json.data.regulation;
  const putReg = (id, bytes = pdf("r"), name = "Perban.pdf") => call("PUT", `${REG}/${id}/document`, { form: form([["document", bytes, name]]) });
  const addAtt = (id, entries) => call("POST", `${REG}/${id}/attachments`, { form: form(entries.map(([b, n]) => ["attachments", b, n])) });
  const dbReg = (id) => db.banpt_regulations.find((r) => r.id === id);
  const parentName = (f) => appGoogle.st.files.get(f.parents[0]).name;
  await doConnect("tester@gmail.com");
  let reg; let putRes;
  await test("upload dokumen utama + lampiran: file masuk folder 'regulasi-banpt' milik akun OAuth, appProperties benar, metadata di Supabase, tidak ada upload ke Supabase Storage", async () => {
    reg = await mkReg(); putRes = await putReg(reg.id, pdf("utama"));
    assert.equal(putRes.status, 200, putRes.text);
    assert.equal((await addAtt(reg.id, [[pdf("l1"), "L1.pdf"], [pdf("l2"), "L2.pdf"]])).status, 201);
    const files = appGoogle.liveFiles(); assert.equal(files.length, 3);
    for (const f of files) { assert.equal(parentName(f), "regulasi-banpt"); assert.equal(f.owner, "tester@gmail.com"); assert.equal(f.appProperties.app, "lia-be"); assert.equal(f.appProperties.recordId, reg.id); }
    assert.ok(files.some((f) => f.id === dbReg(reg.id).document_drive_file_id)); assert.equal(dbReg(reg.id).attachments.length, 2); assert.equal(legacy.objects.size, 0);
    assert.ok(!putRes.text.includes("drv_") && !/\bat_|\brt_/.test(putRes.text));
  });
  await test("semua panggilan Drive memakai access token OAuth; tidak ada panggilan /permissions", async () => {
    const drv = appGoogle.st.log.filter((l) => l.host !== "oauth2.googleapis.com" && l.host !== "upload.fake.google"); assert.ok(drv.length > 5);
    assert.ok(drv.every((l) => /^at_/.test(l.auth))); assert.ok(!appGoogle.st.log.some((l) => /permissions/.test(l.path)));
  });
  await test("preview admin lewat token berumur pendek (tanpa header Authorization): isi sama, inline PDF", async () => {
    const r = await call("GET", putRes.json.data.regulation.document.url, { token: null }); assert.equal(r.status, 200);
    assert.ok(r.buf.equals(pdf("utama"))); assert.match(r.headers.get("content-disposition"), /^inline/); assert.equal(r.headers.get("content-type"), "application/pdf");
  });
  await test("draft tidak bisa dibuka publik (404); setelah published: 200, Range 206, ?download=1 attachment, HEAD tanpa tarik Drive", async () => {
    assert.equal((await call("GET", `${PUB_REG}/${reg.id}/document`, { token: null })).status, 404);
    assert.equal((await call("PATCH", `${REG}/${reg.id}`, { body: { status: "published" } })).status, 200);
    const full = await call("GET", `${PUB_REG}/${reg.id}/document`, { token: null }); assert.equal(full.status, 200); assert.ok(full.buf.equals(pdf("utama")));
    const part = await call("GET", `${PUB_REG}/${reg.id}/document`, { token: null, headers: { Range: "bytes=0-3" } }); assert.equal(part.status, 206); assert.equal(part.text, "%PDF");
    const dl = await call("GET", `${PUB_REG}/${reg.id}/document?download=1`, { token: null }); assert.match(dl.headers.get("content-disposition"), /^attachment/);
    const n = appGoogle.st.log.length; const head = await call("HEAD", `${PUB_REG}/${reg.id}/document`, { token: null }); assert.equal(head.status, 200); assert.equal(appGoogle.st.log.length, n);
  });
  await test("download lampiran publik berhasil", async () => {
    const att = dbReg(reg.id).attachments[0]; const r = await call("GET", `${PUB_REG}/${reg.id}/attachments/${att.id}?download=1`, { token: null });
    assert.equal(r.status, 200); assert.match(r.text, /%PDF/);
  });
  await test("ganti dokumen: file baru dibuat, file lama masuk sampah (urutan unggah -> DB -> hapus lama tetap)", async () => {
    const oldId = dbReg(reg.id).document_drive_file_id; assert.equal((await putReg(reg.id, pdf("v2"))).status, 200);
    assert.notEqual(dbReg(reg.id).document_drive_file_id, oldId); assert.equal(appGoogle.st.files.get(oldId).trashed, true); assert.equal(appGoogle.liveFiles().length, 3);
  });
  await test("hapus lampiran lalu hapus regulasi: semua file di Drive masuk sampah; tidak ada file aktif tersisa", async () => {
    const att = dbReg(reg.id).attachments[0]; assert.equal((await call("DELETE", `${REG}/${reg.id}/attachments/${att.id}`)).status, 200);
    assert.equal(appGoogle.liveFiles().length, 2); assert.equal((await call("DELETE", `${REG}/${reg.id}`)).status, 200); assert.equal(appGoogle.liveFiles().length, 0);
  });
  await test("access token dicabut lebih awal: unggah tetap berhasil (refresh otomatis, tanpa file ganda)", async () => {
    const r2 = await mkReg(); appGoogle.revokeAllAccessTokens(); const before = appGoogle.st.refreshCalls;
    assert.equal((await putReg(r2.id, pdf("pulih"))).status, 200); assert.equal(appGoogle.st.refreshCalls, before + 1); assert.equal(appGoogle.liveFiles().length, 1);
    reg = r2;
  });
  await test("reauth_required: unggah 503 GOOGLE_REAUTH_REQUIRED, data lama utuh, preview 503 tanpa bocor, CRUD non-file tetap jalan", async () => {
    const keep = dbReg(reg.id).document_drive_file_id; await call("PATCH", `${REG}/${reg.id}`, { body: { status: "published" } });
    appGoogle.revokeAllAccessTokens(); for (const r of appGoogle.st.refreshTokens.values()) r.revoked = true;
    const up = await putReg(reg.id, pdf("gagal")); assert.equal(up.status, 503); assert.equal(up.json.code, "GOOGLE_REAUTH_REQUIRED");
    assert.equal(dbReg(reg.id).document_drive_file_id, keep); assert.equal(appGoogle.liveFiles().length, 1);
    const pv = await call("GET", `${PUB_REG}/${reg.id}/document`, { token: null }); assert.equal(pv.status, 503); assert.equal(pv.json.code, "GOOGLE_REAUTH_REQUIRED");
    assert.equal((await call("PATCH", `${REG}/${reg.id}`, { body: { title: "Judul Baru" } })).status, 200);
    const st = (await call("GET", `${GD}/status`)).json.data.connection; assert.equal(st.status, "reauth_required"); assert.equal(st.lastErrorCode, "invalid_grant");
  });
  await test("dokumen LAMA Supabase tetap terbaca saat Drive reauth_required / terputus", async () => {
    const legacyReg = { id: crypto.randomUUID(), regulation_number: "99", regulation_year: 2020, determination_date: "2020-01-01", title: "Lama", document_path: "regulations/lama/main/m.pdf", attachments: [], status: "published", published_at: "2025-01-01T00:00:00.000Z", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-01T00:00:00.000Z" };
    db.banpt_regulations.push(legacyReg);
    let r = await call("GET", `${PUB_REG}/${legacyReg.id}`, { token: null }); assert.equal(r.status, 200); assert.match(r.json.data.regulation.document.url, /fake-project\.supabase\.co\/storage\/v1\/object\/public\/banpt-regulations\//);
    await call("POST", `${GD}/disconnect`);
    r = await call("GET", `${PUB_REG}/${legacyReg.id}`, { token: null }); assert.equal(r.status, 200); assert.match(r.json.data.regulation.document.url, /supabase\.co/);
    db.banpt_regulations.pop();
  });
  await test("terputus: unggah/preview Drive -> 503 GOOGLE_DRIVE_NOT_CONNECTED; hapus record tetap sukses dan file masuk antrean cleanup", async () => {
    assert.equal((await putReg(reg.id)).json.code, "GOOGLE_DRIVE_NOT_CONNECTED");
    assert.equal((await call("GET", `${PUB_REG}/${reg.id}/document`, { token: null })).json.code, "GOOGLE_DRIVE_NOT_CONNECTED");
    const fid = dbReg(reg.id).document_drive_file_id; assert.equal((await call("DELETE", `${REG}/${reg.id}`)).status, 200);
    assert.equal(db.drive_cleanup_queue.length, 1); assert.equal(db.drive_cleanup_queue[0].file_id, fid); assert.equal(appGoogle.st.files.get(fid).trashed, false);
  });
  await test("setelah terhubung lagi, antrean cleanup diproses skrip drive:cleanup dan file dibersihkan", async () => {
    await doConnect("tester@gmail.com");
    const cleanup = require("./cleanupDriveOrphans.js"); const lines = []; const o = console.log; console.log = (...a) => lines.push(a.join(" "));
    try { await cleanup.processQueue(); } finally { console.log = o; }
    assert.match(lines.join("\n"), /1 dibersihkan, 0 gagal/); assert.equal(db.drive_cleanup_queue.length, 0); assert.equal(appGoogle.liveFiles().length, 0);
  });
  await test("ganti akun lewat HTTP: dokumen lama (akun lama) 404 FILE_NOT_FOUND, metadata tidak dihapus, unggah baru masuk akun baru", async () => {
    const r1 = await mkReg(); await putReg(r1.id, pdf("lama")); await call("PATCH", `${REG}/${r1.id}`, { body: { status: "published" } });
    const oldId = dbReg(r1.id).document_drive_file_id;
    const sw = await doConnect("kampus@univ.ac.id"); assert.equal(sw.status, 200); assert.match(sw.text, /Akun berbeda/);
    const pv = await call("GET", `${PUB_REG}/${r1.id}/document`, { token: null }); assert.equal(pv.status, 404);
    assert.equal(dbReg(r1.id).document_drive_file_id, oldId); assert.equal(appGoogle.st.files.get(oldId).trashed, false);
    const r2 = await mkReg(); await putReg(r2.id, pdf("baru")); const f = appGoogle.st.files.get(dbReg(r2.id).document_drive_file_id);
    assert.equal(f.owner, "kampus@univ.ac.id"); assert.notEqual(f.parents[0], appGoogle.st.files.get(oldId).parents[0]);
  });

  // =====================================================================================
  section("J. Keamanan: token/rahasia tidak bocor ke log, respons HTTP, repositori");
  const sensitive = () => [...new Set([appGoogle.st.clientSecret, ENC_KEY_B64, ...appGoogle.secrets(), ...[...appGoogle.st.codes.keys()]])].filter((x) => x && x.length > 8);
  await test("log server tidak memuat access/refresh token, client secret, code, code_verifier, kunci enkripsi", () => {
    const text = logs.join("\n"); const hits = sensitive().filter((s) => text.includes(s));
    assert.deepEqual(hits, []); assert.ok(!/Bearer\s+\S{6,}/.test(text));
  });
  await test("tidak ada respons HTTP (body/header) yang memuat token, client secret, code, code_verifier, ciphertext, kunci", () => {
    assert.ok(seen.length > 40);
    const hits = []; for (const s of sensitive()) for (const r of seen) if (r.text.includes(s) || r.headers.includes(s)) hits.push(`${s.slice(0, 8)}… di ${r.url}`);
    assert.deepEqual(hits, []);
    assert.ok(!seen.some((r) => /v1\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{4,}/.test(r.text)), "ciphertext bocor");
  });
  await test("Google hanya menerima client_secret lewat POST body ke oauth2.googleapis.com (tidak di URL/query)", () => {
    assert.ok(!appGoogle.st.log.some((l) => l.path.includes(appGoogle.st.clientSecret)));
    assert.ok(appGoogle.st.log.filter((l) => l.form && l.form.client_secret).every((l) => l.method === "POST" && l.host === "oauth2.googleapis.com"));
  });
  await test("kode sumber OAuth tidak mencatat token ke log (tidak ada console.* yang menyertakan variabel token/secret)", () => {
    for (const f of ["src/services/googleOAuthService.js", "src/services/googleOAuthStore.js", "src/controllers/googleOAuthController.js", "src/utils/tokenCrypto.js"]) {
      const src = fs.readFileSync(path.join(ROOT, f), "utf8");
      for (const m of src.matchAll(/console\.(?:log|error|warn|info)\(([^;]*)\)/g)) assert.ok(!/(refreshToken|accessToken|access_token|refresh_token|clientSecret|codeVerifier|code_verifier|encryptionKey|\bbody\b)/.test(m[1]), `${f}: ${m[0]}`);
    }
  });
  await test(".env.example memuat variabel OAuth baru dengan nilai KOSONG/placeholder, tanpa rahasia; .env/credential/node_modules tidak ada di folder proyek yang dikemas", () => {
    const ex = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
    for (const v of ["GOOGLE_AUTH_MODE", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", "GOOGLE_OAUTH_FRONTEND_REDIRECT"]) assert.match(ex, new RegExp(`^#? ?${v}=`, "m"), v);
    for (const v of ["GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY", "GOOGLE_OAUTH_CLIENT_ID"]) assert.match(ex, new RegExp(`^${v}=$`, "m"), `${v} harus kosong`);
    assert.ok(!/GOCSPX-|ya29\.|1\/\/0|BEGIN (RSA )?PRIVATE KEY-----\s*[A-Za-z0-9+/]{20}/.test(ex));
  });
  await test("modul cover berita tetap tidak mengenal Drive/OAuth (tetap Supabase Storage)", () => {
    for (const f of ["src/utils/coverStorage.js", "src/controllers/adminNewsCoverController.js", "src/middleware/uploadCoverImage.js"]) assert.ok(!/drive|oauth|googleapis/i.test(fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\/.*$/gm, "")));
  });

  console.error = origError; console.warn = origWarn; globalThis.fetch = realFetch;
  server.close();
  out("\nRingkasan per bagian:");
  for (const s of sections) out(`  ${s.title.split(".")[0]}. ${String(s.passed).padStart(3)} lulus, ${s.failed} gagal  -  ${s.title.replace(/^\w+\.\s*/, "")}`);
  out(`\nSelesai: ${passed} lulus, ${failed} gagal   [OFFLINE / MOCK; tidak ada koneksi ke Google atau Supabase asli]`);
  process.exit(failed ? 1 : 0);
})();
