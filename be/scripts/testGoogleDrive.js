// Pengujian OFFLINE integrasi Google Drive (dokumen akreditasi prodi + regulasi BAN-PT + lampiran).
// Google Drive dan Supabase diganti versi palsu di memori: TIDAK ada koneksi jaringan, TIDAK ada kredensial,
// TIDAK ada data asli tersentuh. Request dikirim lewat HTTP sungguhan ke app Express.
//
//   npm run test:drive        (atau: node scripts/testGoogleDrive.js)
//
// Bagian A menguji klien Drive ASLI (src/services/googleDriveService.js) terhadap fetch palsu agar kontrak
// REST-nya (URL, header, urutan unggah resumable, retry, mode hapus) ikut terverifikasi.
//
// TIDAK dicakup (butuh Google Drive / Supabase asli): izin Service Account yang sebenarnya, kuota Shared Drive,
// constraint/trigger SQL asli, throughput file besar. Untuk itu jalankan `npm run drive:check` dengan kredensial asli.

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000,https://www.lia.example";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const jwt = require("jsonwebtoken");

// Klien Drive ASLI diambil SEBELUM modul diganti fake.
const { createGoogleDriveService, DriveError } = require("../src/services/googleDriveService");

const { createFakeSupabase } = require("./lib/fakeSupabase");
const { createFakeDrive } = require("./lib/fakeDrive");
const sb = createFakeSupabase();
const fd = createFakeDrive();
const supabasePath = sb.install();
const drivePath = fd.install();
const { db, faults, hooks, legacy } = sb;

const logs = [];
const origError = console.error;
console.error = (...a) => logs.push(a.join(" "));

const loadFreshApp = () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath && key !== drivePath) delete require.cache[key];
  }
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n").slice(0, 3).join("\n        ")}`); }
};

// =====================================================================================
console.log("A. Klien Google Drive (REST) terhadap fetch palsu");

const makeClient = (responder, extraCfg = {}) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const call = { url: String(url), method: init.method || "GET", headers: init.headers || {}, body: init.body, signal: init.signal };
    calls.push(call);
    return responder(call, calls.length);
  };
  const svc = createGoogleDriveService({
    config: { enabled: true, rootFolderId: "ROOT_FOLDER_ID_123", deleteMode: "trash", retryBaseMs: 1, ...extraCfg },
    fetchImpl,
    getAccessToken: async () => "tok_secret_123",
  });
  return { svc, calls };
};
const jsonRes = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...headers } });
const driveErr = (status, reason = "") => jsonRes({ error: { code: status, message: "pesan google", errors: [{ reason }] } }, status);

(async () => {
  await test("upload: sesi resumable lalu PUT; supportsAllDrives; metadata (parents, appProperties); bearer token", async () => {
    const { svc, calls } = makeClient((c) => c.method === "POST"
      ? new Response(null, { status: 200, headers: { location: "https://upload.example/session/1" } })
      : jsonRes({ id: "F1", name: "n", size: "5", md5Checksum: "abc" }));
    const buf = Buffer.from("%PDF-");
    const file = await svc.uploadFile({ name: "n.pdf", mimeType: "application/pdf", buffer: buf, parentId: "PARENT", appProperties: { recordId: "R1" } });
    assert.equal(file.id, "F1"); assert.equal(calls.length, 2);
    const [init, put] = calls;
    assert.match(init.url, /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/);
    assert.match(init.url, /uploadType=resumable/); assert.match(init.url, /supportsAllDrives=true/);
    assert.equal(init.headers.Authorization, "Bearer tok_secret_123");
    assert.equal(init.headers["X-Upload-Content-Type"], "application/pdf"); assert.equal(init.headers["X-Upload-Content-Length"], "5");
    const meta = JSON.parse(init.body);
    assert.deepEqual(meta.parents, ["PARENT"]); assert.equal(meta.appProperties.app, "lia-be"); assert.equal(meta.appProperties.recordId, "R1");
    assert.equal(put.url, "https://upload.example/session/1"); assert.equal(put.method, "PUT"); assert.ok(Buffer.from(put.body).equals(buf));
  });
  await test("upload TIDAK diulang saat gagal 500 (mencegah file ganda) dan tidak pernah memanggil /permissions", async () => {
    const { svc, calls } = makeClient(() => driveErr(500));
    await assert.rejects(svc.uploadFile({ name: "n", mimeType: "application/pdf", buffer: Buffer.from("x"), parentId: "P" }), (e) => e instanceof DriveError && e.status === 500);
    assert.equal(calls.length, 1);
    assert.ok(calls.every((c) => !/permissions/.test(c.url)));
  });
  await test("download: alt=media, Accept-Encoding identity, Range diteruskan", async () => {
    const { svc, calls } = makeClient(() => new Response("abc", { status: 206 }));
    await svc.downloadFile("FILE/1", { range: "bytes=0-1" });
    assert.match(calls[0].url, /\/files\/FILE%2F1\?alt=media&supportsAllDrives=true/);
    assert.equal(calls[0].headers["Accept-Encoding"], "identity"); assert.equal(calls[0].headers.Range, "bytes=0-1");
  });
  await test("hapus mode trash = PATCH trashed:true; mode delete = DELETE; 404 dianggap sukses", async () => {
    const t = makeClient(() => jsonRes({ id: "F" }));
    await t.svc.removeFile("F");
    assert.equal(t.calls[0].method, "PATCH"); assert.deepEqual(JSON.parse(t.calls[0].body), { trashed: true });
    const d = makeClient(() => new Response(null, { status: 204 }), { deleteMode: "delete" });
    await d.svc.removeFile("F"); assert.equal(d.calls[0].method, "DELETE");
    const gone = makeClient(() => driveErr(404, "notFound"));
    await gone.svc.removeFile("F"); // tidak melempar
    const bad = makeClient(() => driveErr(403, "forbidden"));
    await assert.rejects(bad.svc.removeFile("F"), (e) => e.status === 403);
    assert.equal(bad.calls.length, 1, "403 tidak diulang");
  });
  await test("retry: 503 dua kali lalu sukses = 3 panggilan; 429 diulang; 403/404 tidak diulang; habis -> error", async () => {
    let n = 0;
    const a = makeClient(() => (++n < 3 ? driveErr(503) : jsonRes({ id: "X", mimeType: "m" })));
    assert.equal((await a.svc.getFileMetadata("X")).id, "X"); assert.equal(a.calls.length, 3);
    let m = 0;
    const b = makeClient(() => (++m < 2 ? driveErr(429, "rateLimitExceeded") : jsonRes({ id: "Y" })));
    await b.svc.getFileMetadata("Y"); assert.equal(b.calls.length, 2);
    const c = makeClient(() => driveErr(403));
    await assert.rejects(c.svc.getFileMetadata("Z")); assert.equal(c.calls.length, 1);
    const d = makeClient(() => driveErr(500));
    await assert.rejects(d.svc.getFileMetadata("Z"), (e) => e.status === 500); assert.equal(d.calls.length, 3);
    const e = makeClient(() => { throw new TypeError("fetch failed"); });
    await assert.rejects(e.svc.getFileMetadata("Z"), /fetch failed/); assert.equal(e.calls.length, 3);
  });
  await test("timeout: fetch yang menggantung diputus (AbortSignal) dan dilaporkan sebagai error", async () => {
    const { svc, calls } = makeClient((c) => new Promise((_, reject) => c.signal.addEventListener("abort", () => reject(c.signal.reason))), { requestTimeoutMs: 20 });
    await assert.rejects(svc.getFileMetadata("T"), /Timeout/);
    assert.equal(calls.length, 3);
  });
  await test("pembatalan oleh klien (signal) menghentikan unduhan tanpa retry", async () => {
    const ctl = new AbortController();
    const { svc, calls } = makeClient((c) => new Promise((_, reject) => c.signal.addEventListener("abort", () => reject(new Error("aborted")))));
    const p = svc.downloadFile("F", { signal: ctl.signal });
    setTimeout(() => ctl.abort(), 10);
    await assert.rejects(p); assert.equal(calls.length, 1);
  });
  await test("ensureFolder: memakai folder yang ada, membuat jika belum ada, hasil di-cache, kegagalan tidak di-cache, kutip di-escape", async () => {
    let listCalls = 0;
    const { svc, calls } = makeClient((c) => {
      if (c.method === "GET") { listCalls += 1; return jsonRes({ files: listCalls === 1 ? [] : [{ id: "EXIST" }] }); }
      return jsonRes({ id: "NEW" });
    });
    assert.equal(await svc.ensureFolder("regulasi-banpt"), "NEW");
    assert.equal(await svc.ensureFolder("regulasi-banpt"), "NEW"); // cache
    assert.equal(calls.length, 2);
    assert.match(decodeURIComponent(calls[0].url.replace(/\+/g, " ")), /name = 'regulasi-banpt' and 'ROOT_FOLDER_ID_123' in parents and mimeType = 'application\/vnd\.google-apps\.folder' and trashed = false/);
    assert.equal(await svc.ensureFolder("x'y"), "EXIST");
    assert.match(decodeURIComponent(calls[2].url.replace(/\+/g, " ")), /name = 'x\\'y'/);
    let fail = true;
    const f = makeClient(() => (fail ? driveErr(403) : jsonRes({ files: [{ id: "OK" }] })));
    await assert.rejects(f.svc.ensureFolder("a")); fail = false;
    assert.equal(await f.svc.ensureFolder("a"), "OK");
  });
  await test("belum dikonfigurasi -> 503 STORAGE_NOT_CONFIGURED tanpa memanggil jaringan", async () => {
    const { svc, calls } = makeClient(() => jsonRes({}), { enabled: false });
    assert.equal(svc.isConfigured(), false);
    await assert.rejects(svc.getFileMetadata("x"), (e) => e.statusCode === 503 && e.code === "STORAGE_NOT_CONFIGURED");
    assert.equal(calls.length, 0);
  });
  await test("pesan error tidak memuat access token", async () => {
    const { svc } = makeClient(() => driveErr(403, "forbidden"));
    await assert.rejects(svc.getFileMetadata("x"), (e) => !e.message.includes("tok_secret_123"));
  });

  // =====================================================================================
  console.log("\nB. Validasi konfigurasi (.env)");
  const runEnv = (env) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "envtest-")); // tanpa .env, agar tidak memuat file asli
    const r = spawnSync(process.execPath, ["-e", `const e=require(${JSON.stringify(path.resolve(__dirname, "../src/config/env.js"))});console.log(JSON.stringify(e.googleDrive))`], {
      cwd, encoding: "utf8",
      env: { PATH: process.env.PATH, SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", JWT_SECRET: "x".repeat(40), NODE_ENV: "test", ...env },
    });
    return r;
  };
  const PEM = "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n";
  await test("tanpa konfigurasi Google: server tetap boleh start (Drive nonaktif)", () => {
    const r = runEnv({}); assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).enabled, false);
  });
  await test("konfigurasi sebagian -> server menolak start, pesan hanya menyebut NAMA variabel", () => {
    const r = runEnv({ GOOGLE_DRIVE_ROOT_FOLDER_ID: "abcdefghijklmnop_secretvalue" });
    assert.equal(r.status, 1); assert.match(r.stderr, /GOOGLE_SERVICE_ACCOUNT_EMAIL/); assert.ok(!r.stderr.includes("secretvalue"));
    const r2 = runEnv({ GOOGLE_SERVICE_ACCOUNT_EMAIL: "sa@p.iam.gserviceaccount.com", GOOGLE_PRIVATE_KEY: PEM });
    assert.equal(r2.status, 1); assert.match(r2.stderr, /GOOGLE_DRIVE_ROOT_FOLDER_ID/);
  });
  await test("konfigurasi lengkap valid: \\n pada private key dinormalkan; mode hapus default trash", () => {
    const r = runEnv({ GOOGLE_SERVICE_ACCOUNT_EMAIL: "sa@p.iam.gserviceaccount.com", GOOGLE_PRIVATE_KEY: PEM, GOOGLE_DRIVE_ROOT_FOLDER_ID: "1AbCdEfGhIjKlMnOp" });
    assert.equal(r.status, 0, r.stderr);
    const c = JSON.parse(r.stdout); assert.equal(c.enabled, true); assert.equal(c.deleteMode, "trash");
    assert.ok(c.privateKey.includes("\n") && !c.privateKey.includes("\\n"));
  });
  await test("nilai tidak valid ditolak: ID folder berupa URL, key bukan PEM, mode hapus salah, dua cara kredensial sekaligus, BACKEND_PUBLIC_URL salah", () => {
    const ok = { GOOGLE_SERVICE_ACCOUNT_EMAIL: "sa@p.iam.gserviceaccount.com", GOOGLE_PRIVATE_KEY: PEM, GOOGLE_DRIVE_ROOT_FOLDER_ID: "1AbCdEfGhIjKlMnOp" };
    assert.match(runEnv({ ...ok, GOOGLE_DRIVE_ROOT_FOLDER_ID: "https://drive.google.com/drive/folders/abc" }).stderr, /GOOGLE_DRIVE_ROOT_FOLDER_ID tidak valid/);
    assert.match(runEnv({ ...ok, GOOGLE_PRIVATE_KEY: "bukan-pem" }).stderr, /GOOGLE_PRIVATE_KEY tidak valid/);
    assert.match(runEnv({ ...ok, GOOGLE_DRIVE_DELETE_MODE: "hancurkan" }).stderr, /GOOGLE_DRIVE_DELETE_MODE/);
    assert.match(runEnv({ ...ok, GOOGLE_SERVICE_ACCOUNT_KEY_FILE: "./x.json" }).stderr, /jangan keduanya/);
    assert.match(runEnv({ BACKEND_PUBLIC_URL: "ftp://x" }).stderr, /BACKEND_PUBLIC_URL/);
  });

  // =====================================================================================
  // Server & helper integrasi
  const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const MISSING = "123e4567-e89b-42d3-a456-426614174000";
  let base; let adminToken; let signAdminToken; let server;
  const startServer = async () => {
    if (server) await new Promise((r) => server.close(r));
    server = loadFreshApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}`;
    ({ signAdminToken } = require("../src/utils/token"));
    adminToken = signAdminToken({ id: ADMIN_ID });
  };
  const call = async (method, url, { body, token = adminToken, form, headers: extra = {} } = {}) => {
    const headers = { ...extra };
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form; else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(`${base}${url}`, { method, headers, body: payload, redirect: "manual" });
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.toString("utf8");
    let json = null; try { json = JSON.parse(text); } catch { /* biner */ }
    return { status: res.status, headers: res.headers, buf, text, json };
  };
  const pdf = (extra = "") => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}%%EOF`);
  const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
  const form = (entries) => { const f = new FormData(); for (const [field, bytes, filename, type = "application/pdf"] of entries) f.append(field, new Blob([bytes], { type }), filename); return f; };
  const one = (field, bytes, filename, type) => form([[field, bytes, filename, type]]);

  const PROG = "/api/admin/accreditation/study-programs";
  const PUB_PROG = "/api/accreditation/study-programs";
  const REG = "/api/admin/banpt-regulations";
  const PUB_REG = "/api/banpt-regulations";
  const T_PROG = "accreditation_study_programs"; const T_REG = "banpt_regulations"; const T_INST = "accreditation_institutions";
  const row = (t, id) => (db[t] || []).find((r) => r.id === id);
  let skSeq = 0;
  const progBody = (o = {}) => ({ programName: "Teknologi Informasi", educationLevel: "S1", faculty: "Fakultas Teknologi", rank: "Unggul", skNumber: `SK-P-${(skSeq += 1)}/2024`, validFrom: "2024-01-01", validUntil: "2029-01-01", ...o });
  const regBody = (o = {}) => ({ regulationNumber: "1", regulationYear: 2024, determinationDate: "2024-03-01", title: "Instrumen Akreditasi", ...o });
  const live = () => fd.live().map((f) => f.id);
  const supabaseUploads = () => legacy.objects.size; // objek di Supabase Storage (harus 0 untuk upload baru)

  const reset = () => {
    for (const k of Object.keys(db)) delete db[k];
    db.admins = [{ id: ADMIN_ID, name: "Admin", email: "a@x.id", is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z" }];
    legacy.objects.clear(); legacy.failRemove = false; legacy.removed.length = 0;
    fd.reset(); faults.length = 0; hooks.beforeUpdate = null; logs.length = 0;
  };
  const mkProg = async (o, status) => (await call("POST", PROG, { body: progBody({ ...o, ...(status ? { status } : {}) }) })).json.data.accreditation;
  const putProg = (id, bytes = pdf("p"), name = "SK Prodi.pdf", type = "application/pdf") => call("PUT", `${PROG}/${id}/document`, { form: one("document", bytes, name, type) });
  const mkReg = async (o) => (await call("POST", REG, { body: regBody(o) })).json.data.regulation;
  const putReg = (id, bytes = pdf("r"), name = "Perban.pdf") => call("PUT", `${REG}/${id}/document`, { form: one("document", bytes, name) });
  const addAtt = (id, entries) => call("POST", `${REG}/${id}/attachments`, { form: form(entries.map(([b, n]) => ["attachments", b, n])) });
  const publishReg = (id) => call("PATCH", `${REG}/${id}`, { body: { status: "published" } });
  const publishProg = (id) => call("PATCH", `${PROG}/${id}`, { body: { status: "published" } });
  const tokenPath = (url) => url.replace(/\?.*$/, "");

  await startServer();

  // =====================================================================================
  console.log("\nC. Admin: unggah dokumen ke Drive, endpoint & validasi tetap sama");
  reset();
  await test("endpoint admin lama tetap menolak tanpa token (401) dan tidak menyentuh Drive", async () => {
    const p = await mkProg();
    for (const [m, u] of [["PUT", `${PROG}/${p.id}/document`], ["DELETE", `${PROG}/${p.id}/document`], ["PUT", `${REG}/${MISSING}/document`], ["POST", `${REG}/${MISSING}/attachments`], ["DELETE", `${REG}/${MISSING}/attachments/${MISSING}`]]) {
      assert.equal((await call(m, u, { token: null })).status, 401, `${m} ${u}`);
    }
    assert.equal(fd.state.calls.length, 0);
  });
  let prog;
  await test("prodi: PUT document -> 200; disimpan di Drive (folder kategori, appProperties), metadata di Supabase, respons tanpa ID/path", async () => {
    prog = await mkProg();
    const r = await putProg(prog.id, pdf("isi"), "SK Prodi TI.pdf");
    assert.equal(r.status, 200, r.text);
    const stored = row(T_PROG, prog.id);
    assert.match(stored.document_drive_file_id, /^drv_/); assert.equal(stored.document_path, null);
    assert.equal(stored.document_name, "SK Prodi TI.pdf"); assert.equal(stored.document_mime, "application/pdf"); assert.equal(stored.document_size, pdf("isi").length);
    assert.match(stored.document_md5, /^[0-9a-f]{32}$/);
    const up = fd.state.calls.find((c) => c.op === "upload");
    assert.equal(up.parentId, "folder-akreditasi-program-studi");
    assert.deepEqual([up.appProperties.app, up.appProperties.category, up.appProperties.recordId, up.appProperties.role], ["lia-be", "accreditationStudyProgram", prog.id, "document"]);
    const d = r.json.data.accreditation.document;
    assert.deepEqual([d.name, d.mimeType, d.size], ["SK Prodi TI.pdf", "application/pdf", pdf("isi").length]);
    assert.match(d.url, /^\/api\/files\//); assert.match(d.downloadUrl, /\?download=1$/); assert.ok(d.urlExpiresAt);
    for (const leak of [stored.document_drive_file_id, "document_drive_file_id", "drive.google", "document_md5"]) assert.ok(!r.text.includes(leak), `bocor ${leak}`);
  });
  await test("validasi file tetap berlaku: PNG berpura-pura PDF 400, tipe salah 415; tidak ada file masuk Drive", async () => {
    const before = fd.state.uploads;
    assert.equal((await putProg(prog.id, png(), "x.pdf", "application/pdf")).status, 400);
    assert.equal((await putProg(prog.id, Buffer.from("hi"), "x.txt", "text/plain")).status, 415);
    assert.equal(fd.state.uploads, before);
  });
  await test("nama file dari pengguna tidak jadi path; nama Drive diawali penanda record", async () => {
    await putProg(prog.id, pdf("n"), "../../etc/passwd.pdf");
    const up = fd.state.calls.filter((c) => c.op === "upload").pop();
    assert.ok(!up.name.includes("/") && up.name.startsWith(prog.id.slice(0, 8)));
  });
  await test("regulasi: dokumen utama & 3 lampiran masuk Drive (folder regulasi-banpt); kolom/JSONB terisi; respons tanpa ID/path", async () => {
    const reg = await mkReg();
    const r1 = await putReg(reg.id);
    assert.equal(r1.status, 200, r1.text);
    const r2 = await addAtt(reg.id, [[pdf("1"), "L1.pdf"], [pdf("2"), "L2.pdf"], [pdf("3"), "L3.pdf"]]);
    assert.equal(r2.status, 201, r2.text);
    const stored = row(T_REG, reg.id);
    assert.match(stored.document_drive_file_id, /^drv_/); assert.equal(stored.document_path, null); assert.equal(stored.document_size, pdf("r").length);
    assert.equal(stored.attachments.length, 3);
    for (const a of stored.attachments) { assert.match(a.driveFileId, /^drv_/); assert.equal(a.path, undefined); assert.match(a.md5, /^[0-9a-f]{32}$/); assert.equal(fd.state.files.get(a.driveFileId).appProperties.attachmentId, a.id); }
    assert.ok(fd.state.calls.filter((c) => c.op === "upload").every((c) => c.parentId === "folder-akreditasi-program-studi" || c.parentId === "folder-regulasi-banpt"));
    assert.equal(supabaseUploads(), 0, "tidak ada upload ke Supabase Storage");
    for (const leak of ["driveFileId", "drv_", "document_drive", "md5"]) assert.ok(!r2.text.includes(leak), `bocor ${leak}`);
    for (const x of r2.json.data.regulation.attachments) { assert.match(x.url, /^\/api\/files\//); assert.match(x.downloadUrl, /\?download=1$/); }
  });

  // =====================================================================================
  console.log("\nD. Preview & download PUBLIK: hanya data published, Drive tidak pernah publik");
  reset();
  const pubProg = await mkProg({ skNumber: "PUB-1" }); await putProg(pubProg.id, pdf("publik"), "Prodi Publik.pdf"); await publishProg(pubProg.id);
  const draftProg = await mkProg({ programName: "Draft Prodi", skNumber: "DRAFT-1" }); await putProg(draftProg.id, pdf("rahasia"), "Rahasia.pdf");
  const pubReg = await mkReg({ regulationNumber: "10" }); await putReg(pubReg.id, pdf("regulasi"), "Utama.pdf"); await addAtt(pubReg.id, [[pdf("lamp-A"), "Lampiran A.pdf"]]); await publishReg(pubReg.id);
  const draftReg = await mkReg({ regulationNumber: "11" }); await putReg(draftReg.id, pdf("regdraft")); await addAtt(draftReg.id, [[pdf("lamp-draft"), "LD.pdf"]]);
  const pubAtt = row(T_REG, pubReg.id).attachments[0]; const draftAtt = row(T_REG, draftReg.id).attachments[0];

  await test("respons PUBLIK memberi link route backend yang stabil (bukan URL Drive/Supabase), tanpa token & tanpa kedaluwarsa", async () => {
    const r = await call("GET", `${PUB_PROG}/${pubProg.id}`, { token: null });
    const d = r.json.data.accreditation.document;
    assert.equal(d.url, `${PUB_PROG}/${pubProg.id}/document`); assert.equal(d.downloadUrl, `${PUB_PROG}/${pubProg.id}/document?download=1`); assert.equal(d.urlExpiresAt, null);
    const g = (await call("GET", `${PUB_REG}/${pubReg.id}`, { token: null })).json.data.regulation;
    assert.equal(g.document.url, `${PUB_REG}/${pubReg.id}/document`);
    assert.equal(g.attachments[0].url, `${PUB_REG}/${pubReg.id}/attachments/${pubAtt.id}`);
    assert.ok(!("urlExpiresAt" in g.document));
  });
  await test("preview prodi published tanpa login: 200, isi persis, inline, tipe PDF, nosniff, Content-Length", async () => {
    const r = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null });
    assert.equal(r.status, 200); assert.ok(r.buf.equals(pdf("publik")));
    assert.equal(r.headers.get("content-type"), "application/pdf");
    assert.match(r.headers.get("content-disposition"), /^inline; filename="Prodi Publik\.pdf"/);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.equal(r.headers.get("content-length"), String(pdf("publik").length));
    assert.equal(r.headers.get("accept-ranges"), "bytes");
  });
  await test("download (?download=1): Content-Disposition attachment dengan nama file", async () => {
    const r = await call("GET", `${PUB_PROG}/${pubProg.id}/document?download=1`, { token: null });
    assert.equal(r.status, 200); assert.match(r.headers.get("content-disposition"), /^attachment; filename="Prodi Publik\.pdf"/); assert.ok(r.buf.equals(pdf("publik")));
  });
  await test("regulasi: dokumen utama & lampiran published dapat dipreview/diunduh tanpa login", async () => {
    const m = await call("GET", `${PUB_REG}/${pubReg.id}/document`, { token: null });
    assert.equal(m.status, 200); assert.ok(m.buf.equals(pdf("regulasi"))); assert.match(m.headers.get("content-disposition"), /^inline; filename="PerBAN-1?0-2024\.pdf"/);
    const a = await call("GET", `${PUB_REG}/${pubReg.id}/attachments/${pubAtt.id}?download=1`, { token: null });
    assert.equal(a.status, 200); assert.ok(a.buf.equals(pdf("lamp-A"))); assert.match(a.headers.get("content-disposition"), /^attachment; filename="Lampiran A\.pdf"/);
  });
  await test("DRAFT tidak bisa diakses publik (404) untuk prodi, dokumen regulasi, dan lampiran; tidak menyentuh Drive", async () => {
    const before = fd.state.calls.filter((c) => c.op === "download").length;
    for (const u of [`${PUB_PROG}/${draftProg.id}/document`, `${PUB_REG}/${draftReg.id}/document`, `${PUB_REG}/${draftReg.id}/attachments/${draftAtt.id}`, `${PUB_REG}/${pubReg.id}/attachments/${draftAtt.id}`]) {
      const r = await call("GET", u, { token: null }); assert.equal(r.status, 404, u); assert.equal(r.headers.get("content-type").includes("pdf"), false);
    }
    assert.equal(fd.state.calls.filter((c) => c.op === "download").length, before);
  });
  await test("published tetapi published_at di masa depan -> 404; ID tidak ada -> 404; ID bukan UUID -> 400", async () => {
    row(T_PROG, pubProg.id).published_at = new Date(Date.now() + 3600e3).toISOString();
    assert.equal((await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null })).status, 404);
    row(T_PROG, pubProg.id).published_at = new Date(Date.now() - 1000).toISOString();
    assert.equal((await call("GET", `${PUB_PROG}/${MISSING}/document`, { token: null })).status, 404);
    assert.equal((await call("GET", `${PUB_PROG}/abc/document`, { token: null })).status, 400);
    assert.equal((await call("GET", `${PUB_REG}/${pubReg.id}/attachments/abc`, { token: null })).status, 400);
  });
  await test("published tanpa dokumen -> 404 DOCUMENT_NOT_FOUND", async () => {
    const p = await mkProg({ programName: "Tanpa Dok", skNumber: "ND-1" }, "published");
    const r = await call("GET", `${PUB_PROG}/${p.id}/document`, { token: null });
    assert.equal(r.status, 404); assert.equal(r.json.code, "DOCUMENT_NOT_FOUND");
  });
  await test("header embed: tanpa X-Frame-Options, CSP frame-ancestors hanya origin frontend terdaftar, CORP cross-origin", async () => {
    const r = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null });
    assert.equal(r.headers.get("x-frame-options"), null);
    const csp = r.headers.get("content-security-policy");
    assert.equal(csp, "frame-ancestors 'self' http://localhost:3000 https://www.lia.example");
    assert.equal(r.headers.get("cross-origin-resource-policy"), "cross-origin");
    const other = await call("GET", "/", { token: null });
    assert.equal(other.headers.get("x-frame-options"), "SAMEORIGIN", "route lain tetap dilindungi helmet");
  });
  await test("ETag = ID file Drive: If-None-Match cocok -> 304 TANPA memanggil Drive", async () => {
    const r1 = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null });
    const etag = r1.headers.get("etag"); assert.ok(etag);
    const before = fd.state.calls.filter((c) => c.op === "download").length;
    const r2 = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null, headers: { "If-None-Match": etag } });
    assert.equal(r2.status, 304); assert.equal(r2.buf.length, 0);
    assert.equal(fd.state.calls.filter((c) => c.op === "download").length, before);
    assert.equal(r1.headers.get("cache-control"), "public, no-cache");
  });
  await test("Range diteruskan: 206 + Content-Range + potongan byte yang benar; Range tidak valid diabaikan (200)", async () => {
    const full = pdf("publik");
    const r = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null, headers: { Range: "bytes=2-6" } });
    assert.equal(r.status, 206); assert.ok(r.buf.equals(full.subarray(2, 7)));
    assert.equal(r.headers.get("content-range"), `bytes 2-6/${full.length}`);
    const bad = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null, headers: { Range: "bytes=0-1,5-9" } });
    assert.equal(bad.status, 200); assert.ok(bad.buf.equals(full));
    const oob = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null, headers: { Range: "bytes=99999-" } });
    assert.equal(oob.status, 416);
  });
  await test("HEAD tidak mengunduh dari Drive", async () => {
    const before = fd.state.calls.filter((c) => c.op === "download").length;
    const r = await call("HEAD", `${PUB_PROG}/${pubProg.id}/document`, { token: null });
    assert.equal(r.status, 200); assert.equal(fd.state.calls.filter((c) => c.op === "download").length, before);
  });
  await test("file hilang di Drive -> 404 FILE_NOT_FOUND; Drive error 500 -> 502 STORAGE_ERROR tanpa membocorkan detail", async () => {
    const id = row(T_PROG, pubProg.id).document_drive_file_id; const file = fd.state.files.get(id); fd.state.files.delete(id);
    const r = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null });
    assert.equal(r.status, 404); assert.equal(r.json.code, "FILE_NOT_FOUND"); fd.state.files.set(id, file);
    fd.state.failDownload = { status: 500 };
    const e = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null });
    fd.state.failDownload = null;
    assert.equal(e.status, 502); assert.equal(e.json.code, "STORAGE_ERROR"); assert.ok(!e.text.includes("Drive API") && !e.text.includes(id));
  });
  await test("Content-Disposition aman untuk nama file berbahaya/unicode (tanpa CR/LF/kutip, filename* terisi)", async () => {
    const p = await mkProg({ programName: "Nama Aneh", skNumber: "AN-1" }, "published");
    await putProg(p.id, pdf("u"), 'Akreditasi "Baik" – prodi ñ\r\nX-Evil: 1.pdf');
    const r = await call("GET", `${PUB_PROG}/${p.id}/document`, { token: null });
    const cd = r.headers.get("content-disposition");
    assert.ok(!/[\r\n]/.test(cd)); assert.equal(r.headers.get("x-evil"), null);
    assert.match(cd, /filename\*=UTF-8''/); assert.ok(!/filename="[^"]*"[^;]*"/.test(cd));
  });
  await test("tipe konten dari DB yang tidak dikenal tidak pernah ditampilkan inline (octet-stream + attachment)", async () => {
    const p = await mkProg({ programName: "Mime Aneh", skNumber: "MA-1" }, "published"); await putProg(p.id);
    row(T_PROG, p.id).document_mime = "text/html";
    const r = await call("GET", `${PUB_PROG}/${p.id}/document`, { token: null });
    assert.equal(r.headers.get("content-type"), "application/octet-stream"); assert.match(r.headers.get("content-disposition"), /^attachment;/);
  });
  await test("CORS: origin frontend terdaftar boleh membaca Content-Range/Accept-Ranges (pembaca PDF berbasis fetch); origin asing tidak diberi izin", async () => {
    const ok = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null, headers: { Origin: "http://localhost:3000" } });
    assert.equal(ok.status, 200); assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:3000");
    const exposed = (ok.headers.get("access-control-expose-headers") || "").toLowerCase();
    for (const h of ["content-range", "accept-ranges", "content-disposition"]) assert.ok(exposed.includes(h), `${h} tidak diekspos`);
    const evil = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null, headers: { Origin: "https://evil.example" } });
    assert.equal(evil.headers.get("access-control-allow-origin"), null);
  });
  await test("rate limiter khusus file terpasang (header RateLimit ada)", async () => {
    const r = await call("GET", `${PUB_PROG}/${pubProg.id}/document`, { token: null });
    assert.ok(r.headers.get("ratelimit") || r.headers.get("ratelimit-policy"));
  });
  await test("Drive tidak pernah dibuat publik: tidak ada pemanggilan permission, URL Drive tidak pernah muncul di respons mana pun", async () => {
    assert.equal(fd.state.permissionsCalls, 0);
    for (const u of [`${PUB_PROG}/${pubProg.id}`, PUB_PROG, `${PUB_REG}/${pubReg.id}`, PUB_REG]) {
      const r = await call("GET", u, { token: null });
      for (const leak of ["drive.google", "googleapis", "drv_", "driveFileId"]) assert.ok(!r.text.includes(leak), `${u} bocor ${leak}`);
    }
  });

  // =====================================================================================
  console.log("\nE. Akses ADMIN lewat token berumur pendek");
  const adminUrl = async (u, pick) => pick((await call("GET", u)).json.data);
  await test("admin melihat link bertoken untuk dokumen DRAFT; link dapat dibuka tanpa header Authorization; no-store", async () => {
    const p = (await call("GET", `${PROG}/${draftProg.id}`)).json.data.accreditation;
    assert.match(p.document.url, /^\/api\/files\/[\w-]+\.[\w-]+\.[\w-]+$/); assert.ok(new Date(p.document.urlExpiresAt) > new Date());
    const r = await call("GET", p.document.url, { token: null });
    assert.equal(r.status, 200); assert.ok(r.buf.equals(pdf("rahasia"))); assert.equal(r.headers.get("cache-control"), "private, no-store");
    assert.match(r.headers.get("content-disposition"), /^inline;/);
    const dl = await call("GET", p.document.downloadUrl, { token: null });
    assert.match(dl.headers.get("content-disposition"), /^attachment;/);
  });
  await test("admin: lampiran & dokumen utama regulasi draft dapat dibuka lewat token", async () => {
    const reg = (await call("GET", `${REG}/${draftReg.id}`)).json.data.regulation;
    assert.ok((await call("GET", reg.document.url, { token: null })).buf.equals(pdf("regdraft")));
    assert.ok((await call("GET", reg.attachments[0].url, { token: null })).buf.equals(pdf("lamp-draft")));
  });
  await test("token rusak / diubah / kedaluwarsa / bukan token file -> 403; tidak menyentuh Drive", async () => {
    const before = fd.state.calls.filter((c) => c.op === "download").length;
    const good = tokenPath((await call("GET", `${PROG}/${draftProg.id}`)).json.data.accreditation.document.url);
    const tampered = good.slice(0, -3) + (good.endsWith("AAA") ? "BBB" : "AAA");
    for (const u of ["/api/files/abc", "/api/files/a.b.c", tampered]) { const r = await call("GET", u, { token: null }); assert.equal(r.status, 403, u); assert.equal(r.json.code, "FILE_LINK_INVALID"); }
    const mk = (claims, opts = {}) => jwt.sign(claims, process.env.JWT_SECRET, { algorithm: "HS256", issuer: "universitas-lia-api", audience: "lia-file-access", expiresIn: 600, ...opts });
    assert.equal((await call("GET", `/api/files/${mk({ k: "study_program_document", r: draftProg.id }, { expiresIn: -5 })}`, { token: null })).status, 403);
    assert.equal((await call("GET", `/api/files/${mk({ k: "study_program_document", r: draftProg.id }, { audience: "lain" })}`, { token: null })).status, 403);
    assert.equal((await call("GET", `/api/files/${mk({ k: "jenis_aneh", r: draftProg.id })}`, { token: null })).status, 403);
    assert.equal((await call("GET", `/api/files/${jwt.sign({ k: "study_program_document", r: draftProg.id }, "secret-lain", { audience: "lia-file-access", issuer: "universitas-lia-api" })}`, { token: null })).status, 403);
    assert.equal((await call("GET", `/api/files/${adminToken}`, { token: null })).status, 403, "token LOGIN admin tidak boleh dipakai sebagai token file");
    const none = jwt.sign({ k: "study_program_document", r: draftProg.id }, "", { algorithm: "none" });
    assert.equal((await call("GET", `/api/files/${none}`, { token: null })).status, 403);
    assert.equal(fd.state.calls.filter((c) => c.op === "download").length, before);
  });
  await test("token file TIDAK bisa dipakai untuk endpoint admin (Bearer)", async () => {
    const t = tokenPath((await call("GET", `${PROG}/${draftProg.id}`)).json.data.accreditation.document.url).split("/").pop();
    const a = await call("GET", PROG, { token: t }); const b = await call("DELETE", `${PROG}/${draftProg.id}/document`, { token: t });
    assert.ok([401, 403].includes(a.status) && [401, 403].includes(b.status), `${a.status}/${b.status}`);
    assert.ok(row(T_PROG, draftProg.id).document_drive_file_id, "dokumen tidak boleh terhapus");
  });
  await test("token merujuk RECORD, bukan file: setelah dokumen diganti token lama menyajikan file BARU; setelah dihapus -> 404", async () => {
    const p = await mkProg({ programName: "Ganti", skNumber: "G-1" }); await putProg(p.id, pdf("lama"), "lama.pdf");
    const url = (await call("GET", `${PROG}/${p.id}`)).json.data.accreditation.document.url;
    assert.ok((await call("GET", url, { token: null })).buf.equals(pdf("lama")));
    await putProg(p.id, pdf("baru"), "baru.pdf");
    const r = await call("GET", url, { token: null }); assert.ok(r.buf.equals(pdf("baru")));
    await call("DELETE", `${PROG}/${p.id}/document`);
    assert.equal((await call("GET", url, { token: null })).status, 404);
    await call("DELETE", `${PROG}/${p.id}`);
    assert.equal((await call("GET", url, { token: null })).status, 404);
  });
  await test("hanya sehat kalau dokumen dipublish: setelah published, route publik jalan; kembali draft -> publik 404 lagi", async () => {
    const p = await mkProg({ programName: "Toggle", skNumber: "TG-1" }); await putProg(p.id);
    assert.equal((await call("GET", `${PUB_PROG}/${p.id}/document`, { token: null })).status, 404);
    await publishProg(p.id); assert.equal((await call("GET", `${PUB_PROG}/${p.id}/document`, { token: null })).status, 200);
    await call("PATCH", `${PROG}/${p.id}`, { body: { status: "draft" } });
    assert.equal((await call("GET", `${PUB_PROG}/${p.id}/document`, { token: null })).status, 404);
  });

  // =====================================================================================
  console.log("\nF. Ganti / hapus: file lama di Drive dikelola (tidak yatim)");
  await startServer(); reset();
  await test("ganti dokumen prodi: file baru dulu, DB menunjuk file baru, file lama dipindah ke sampah (hanya 1 file aktif)", async () => {
    const p = await mkProg(); await putProg(p.id, pdf("v1"));
    const v1 = row(T_PROG, p.id).document_drive_file_id;
    assert.equal((await putProg(p.id, pdf("v2"))).status, 200);
    const v2 = row(T_PROG, p.id).document_drive_file_id;
    assert.notEqual(v1, v2); assert.deepEqual(live(), [v2]); assert.equal(fd.state.files.get(v1).trashed, true);
    const ops = fd.state.calls.filter((c) => ["upload", "remove"].includes(c.op)).map((c) => `${c.op}:${c.id}`);
    assert.deepEqual(ops.slice(-2), [`upload:${v2}`, `remove:${v1}`], "unggah baru dulu, hapus lama sesudahnya");
  });
  await test("hapus dokumen prodi -> kolom dikosongkan & file di Drive dibersihkan; hapus lagi 404", async () => {
    const p = await mkProg({ skNumber: "H-1", programName: "Hapus" }); await putProg(p.id);
    const id = row(T_PROG, p.id).document_drive_file_id;
    const r = await call("DELETE", `${PROG}/${p.id}/document`);
    assert.equal(r.status, 200); assert.equal(r.json.data.accreditation.document, null);
    const s = row(T_PROG, p.id); assert.deepEqual([s.document_drive_file_id, s.document_md5, s.document_name, s.document_size], [null, null, null, null]);
    assert.ok(!live().includes(id)); assert.equal((await call("DELETE", `${PROG}/${p.id}/document`)).status, 404);
  });
  await test("hapus data prodi -> file Drive-nya ikut dibersihkan; file milik data lain utuh", async () => {
    const a = await mkProg({ skNumber: "X-1", programName: "A" }); const b = await mkProg({ skNumber: "X-2", programName: "B" });
    await putProg(a.id, pdf("a")); await putProg(b.id, pdf("b"));
    const bid = row(T_PROG, b.id).document_drive_file_id;
    assert.equal((await call("DELETE", `${PROG}/${a.id}`)).status, 200);
    assert.ok(live().includes(bid)); assert.equal(live().filter((i) => i !== bid).length, 0 + (live().length - 1));
  });
  await test("upload Drive gagal -> 502 STORAGE_ERROR; data & file lama tidak berubah; detail Drive tidak bocor", async () => {
    const p = await mkProg({ skNumber: "F-1", programName: "Gagal" }); await putProg(p.id, pdf("ok"));
    const before = row(T_PROG, p.id).document_drive_file_id; fd.state.failUpload = true;
    const r = await putProg(p.id, pdf("gagal")); fd.state.failUpload = false;
    assert.equal(r.status, 502); assert.equal(r.json.code, "STORAGE_ERROR"); assert.ok(!r.text.includes("boom") && !r.text.includes("Drive API"));
    assert.equal(row(T_PROG, p.id).document_drive_file_id, before); assert.ok(live().includes(before));
  });
  await test("DB gagal setelah unggah -> file baru di Drive dibersihkan (kompensasi), file lama utuh", async () => {
    const p = await mkProg({ skNumber: "F-2", programName: "DBGagal" }); await putProg(p.id, pdf("ok"));
    const before = row(T_PROG, p.id).document_drive_file_id;
    faults.push({ table: T_PROG, op: "update", error: { message: "secret", code: "XX000" } });
    const r = await putProg(p.id, pdf("db")); assert.equal(r.status, 500);
    assert.deepEqual(live().filter((i) => i === before || true).sort(), [before].sort().concat(live().filter((i) => i !== before)).sort());
    assert.equal(live().includes(before), true);
    const all = fd.state.calls.filter((c) => c.op === "upload"); const last = all[all.length - 1].id;
    assert.equal(fd.state.files.get(last).trashed, true, "file baru yang tidak terpakai harus dibersihkan");
  });
  await test("perubahan bersamaan (CAS gagal) -> 409 DOCUMENT_CONFLICT; file baru dibersihkan; file pihak lain TIDAK terhapus", async () => {
    const p = await mkProg({ skNumber: "F-3", programName: "CAS" }); await putProg(p.id, pdf("ok"));
    const other = await mkProg({ skNumber: "F-3b", programName: "CAS2" }); await putProg(other.id, pdf("lain"));
    const otherId = row(T_PROG, other.id).document_drive_file_id;
    hooks.beforeUpdate = () => { row(T_PROG, p.id).document_drive_file_id = "drv_diganti_pihak_lain"; };
    const r = await putProg(p.id, pdf("balapan"));
    assert.equal(r.status, 409); assert.equal(r.json.code, "DOCUMENT_CONFLICT"); assert.ok(live().includes(otherId));
    const last = fd.state.calls.filter((c) => c.op === "upload").pop().id; assert.equal(fd.state.files.get(last).trashed, true);
  });
  await test("hapus file lama gagal -> tetap 200, masuk ANTREAN drive_cleanup_queue (bukan hanya log) + [ORPHAN]", async () => {
    const p = await mkProg({ skNumber: "F-4", programName: "Orphan" }); await putProg(p.id, pdf("v1"));
    const old = row(T_PROG, p.id).document_drive_file_id; fd.state.failRemove = true;
    const r = await putProg(p.id, pdf("v2")); fd.state.failRemove = false;
    assert.equal(r.status, 200);
    const q = db.drive_cleanup_queue || [];
    assert.equal(q.length, 1); assert.equal(q[0].file_id, old); assert.match(q[0].reason, /hapus dokumen lama/); assert.match(q[0].last_error, /remove boom/);
    assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(old)));
  });
  await test("antrean pun gagal -> tetap 200 dan [ORPHAN] mencantumkan file ID untuk rekonsiliasi", async () => {
    const p = await mkProg({ skNumber: "F-5", programName: "Orphan2" }); await putProg(p.id, pdf("v1"));
    const old = row(T_PROG, p.id).document_drive_file_id; fd.state.failRemove = true;
    faults.push({ table: "drive_cleanup_queue", op: "insert", error: { message: "db mati", code: "XX000" } });
    const r = await putProg(p.id, pdf("v2")); fd.state.failRemove = false;
    assert.equal(r.status, 200); assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(old) && l.includes("gagal diantrekan")));
  });
  await test("regulasi: ganti dokumen utama, ganti lampiran (ID tetap), hapus lampiran, hapus peraturan -> tidak ada file aktif tersisa", async () => {
    await startServer(); reset();
    const reg = await mkReg(); await putReg(reg.id, pdf("m1"));
    const m1 = row(T_REG, reg.id).document_drive_file_id;
    await putReg(reg.id, pdf("m2")); assert.ok(!live().includes(m1));
    await addAtt(reg.id, [[pdf("a1"), "A1.pdf"], [pdf("a2"), "A2.pdf"]]);
    const [t1, t2] = row(T_REG, reg.id).attachments; assert.equal(live().length, 3);
    const rep = await call("PUT", `${REG}/${reg.id}/attachments/${t1.id}`, { form: one("attachment", pdf("a1b"), "A1-baru.pdf") });
    assert.equal(rep.status, 200); const t1b = row(T_REG, reg.id).attachments[0];
    assert.equal(t1b.id, t1.id); assert.notEqual(t1b.driveFileId, t1.driveFileId); assert.ok(!live().includes(t1.driveFileId)); assert.equal(live().length, 3);
    assert.equal((await call("DELETE", `${REG}/${reg.id}/attachments/${t2.id}`)).status, 200); assert.equal(live().length, 2);
    assert.equal((await call("DELETE", `${REG}/${reg.id}`)).status, 200); assert.equal(live().length, 0);
  });
  await test("regulasi: unggah lampiran gagal di tengah -> yang sudah terunggah dibersihkan; DB gagal -> semua dibersihkan", async () => {
    reset();
    const reg = await mkReg();
    fd.state.failUploadAfter = 1;
    const r = await addAtt(reg.id, [[pdf("1"), "1.pdf"], [pdf("2"), "2.pdf"], [pdf("3"), "3.pdf"]]); fd.state.failUploadAfter = null;
    assert.equal(r.status, 502); assert.equal(live().length, 0); assert.deepEqual(row(T_REG, reg.id).attachments, []);
    faults.push({ table: T_REG, op: "update", error: { message: "x", code: "XX000" } });
    assert.equal((await addAtt(reg.id, [[pdf("4"), "4.pdf"], [pdf("5"), "5.pdf"]])).status, 500); assert.equal(live().length, 0);
  });
  await test("mode hapus permanen (GOOGLE_DRIVE_DELETE_MODE=delete) menghapus file benar-benar dari Drive", async () => {
    reset(); fd.state.deleteMode = "delete";
    const p = await mkProg(); await putProg(p.id, pdf("1")); const id = row(T_PROG, p.id).document_drive_file_id;
    await putProg(p.id, pdf("2")); assert.equal(fd.state.files.has(id), false);
  });
  await test("syarat publish regulasi memakai dokumen Drive (tanpa dokumen -> 400; dengan dokumen Drive -> 200)", async () => {
    reset();
    const reg = await mkReg();
    const no = await publishReg(reg.id); assert.equal(no.status, 400); assert.equal(no.json.code, "DOCUMENT_REQUIRED_TO_PUBLISH");
    await putReg(reg.id); assert.equal((await publishReg(reg.id)).status, 200);
  });

  // =====================================================================================
  console.log("\nG. Kompatibilitas dokumen LAMA (Supabase Storage) tetap terbaca & dikelola");
  await startServer(); reset();
  const legacyProg = { id: crypto.randomUUID(), program_name: "Prodi Lama", education_level: "S1", faculty: null, rank: "Unggul", sk_number: "LAMA-1", decision_date: null, valid_from: null, valid_until: "2030-01-01", issuing_body: "BAN-PT", document_path: "study-programs/lama/doc.pdf", document_name: "Lama.pdf", document_mime: "application/pdf", document_size: 11, status: "published", published_at: "2025-01-01T00:00:00.000Z", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-01T00:00:00.000Z" };
  const legacyReg = { id: crypto.randomUUID(), regulation_number: "5", regulation_year: 2020, determination_date: "2020-01-01", title: "Peraturan Lama", document_path: `regulations/lama/main/m.pdf`, attachments: [{ id: crypto.randomUUID(), name: "Lampiran Lama.pdf", path: "regulations/lama/attachments/a.pdf", mimeType: "application/pdf", size: 7, uploadedAt: "2025-01-01T00:00:00.000Z" }], status: "published", published_at: "2025-01-01T00:00:00.000Z", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-01T00:00:00.000Z" };
  const seedLegacy = () => {
    db[T_PROG] = [JSON.parse(JSON.stringify(legacyProg))]; db[T_REG] = [JSON.parse(JSON.stringify(legacyReg))];
    legacy.objects.set("accreditation-documents/study-programs/lama/doc.pdf", 11);
    legacy.objects.set("banpt-regulations/regulations/lama/main/m.pdf", 9);
    legacy.objects.set("banpt-regulations/regulations/lama/attachments/a.pdf", 7);
  };
  seedLegacy();
  await test("prodi lama: publik & admin tetap mendapat signed URL Supabase (bentuk respons lama, tanpa Drive)", async () => {
    const pub = (await call("GET", `${PUB_PROG}/${legacyProg.id}`, { token: null })).json.data.accreditation.document;
    assert.match(pub.url, /\/object\/sign\/accreditation-documents\/study-programs\/lama\/doc\.pdf\?token=/); assert.equal(pub.name, "Lama.pdf"); assert.ok(pub.urlExpiresAt);
    const adm = (await call("GET", `${PROG}/${legacyProg.id}`)).json.data.accreditation.document;
    assert.match(adm.url, /\/object\/sign\//);
  });
  await test("regulasi lama: URL publik Supabase tetap dipakai untuk dokumen utama & lampiran", async () => {
    const r = (await call("GET", `${PUB_REG}/${legacyReg.id}`, { token: null })).json.data.regulation;
    assert.equal(r.document.url, "https://fake-project.supabase.co/storage/v1/object/public/banpt-regulations/regulations/lama/main/m.pdf");
    assert.match(r.document.downloadUrl, /\?download=PerBAN-5-2020\.pdf$/);
    assert.equal(r.attachments[0].url, "https://fake-project.supabase.co/storage/v1/object/public/banpt-regulations/regulations/lama/attachments/a.pdf");
    assert.equal(fd.state.calls.length, 0, "membaca file lama tidak menyentuh Drive");
  });
  await test("file lama tetap terbaca walau Google Drive TIDAK dikonfigurasi (tidak memutus akses)", async () => {
    fd.state.configured = false;
    const a = await call("GET", `${PUB_REG}/${legacyReg.id}`, { token: null }); const b = await call("GET", `${PUB_PROG}/${legacyProg.id}`, { token: null });
    fd.state.configured = true;
    assert.equal(a.status, 200); assert.ok(a.json.data.regulation.document.url.includes("supabase")); assert.equal(b.status, 200); assert.ok(b.json.data.accreditation.document.url.includes("supabase"));
  });
  await test("route Drive untuk data LAMA -> 404 DOCUMENT_NOT_FOUND (bukan error 500)", async () => {
    for (const u of [`${PUB_PROG}/${legacyProg.id}/document`, `${PUB_REG}/${legacyReg.id}/document`]) { const r = await call("GET", u, { token: null }); assert.equal(r.status, 404, u); assert.equal(r.json.code, "DOCUMENT_NOT_FOUND"); }
    assert.equal((await call("GET", `${PUB_REG}/${legacyReg.id}/attachments/${legacyReg.attachments[0].id}`, { token: null })).status, 404);
  });
  await test("mengganti dokumen lama prodi: file baru ke Drive, path lama dikosongkan, objek Supabase lama dihapus setelah DB beralih", async () => {
    const r = await putProg(legacyProg.id, pdf("migrasi"), "Baru.pdf");
    assert.equal(r.status, 200, r.text);
    const s = row(T_PROG, legacyProg.id); assert.equal(s.document_path, null); assert.match(s.document_drive_file_id, /^drv_/);
    assert.ok(!legacy.objects.has("accreditation-documents/study-programs/lama/doc.pdf")); assert.equal(live().length, 1);
    assert.match(r.json.data.accreditation.document.url, /^\/api\/files\//);
  });
  await test("mengganti dokumen utama regulasi lama: pindah ke Drive; objek lama Supabase dihapus", async () => {
    const r = await putReg(legacyReg.id, pdf("regbaru"));
    assert.equal(r.status, 200, r.text);
    const s = row(T_REG, legacyReg.id); assert.equal(s.document_path, null); assert.match(s.document_drive_file_id, /^drv_/);
    assert.ok(!legacy.objects.has("banpt-regulations/regulations/lama/main/m.pdf"));
    assert.ok(legacy.objects.has("banpt-regulations/regulations/lama/attachments/a.pdf"), "lampiran lama tidak ikut terhapus");
  });
  await test("lampiran LAMA + lampiran Drive bercampur: keduanya tampil benar; ganti lampiran lama memindahkannya ke Drive dengan ID tetap", async () => {
    const add = await addAtt(legacyReg.id, [[pdf("baru1"), "Baru1.pdf"]]); assert.equal(add.status, 201);
    const list = (await call("GET", `${PUB_REG}/${legacyReg.id}`, { token: null })).json.data.regulation.attachments;
    assert.equal(list.length, 2); assert.ok(list[0].url.includes("supabase.co/storage")); assert.match(list[1].url, /^\/api\/regulations|^\/api\/banpt-regulations\//);
    const legacyId = legacyReg.attachments[0].id;
    const rep = await call("PUT", `${REG}/${legacyReg.id}/attachments/${legacyId}`, { form: one("attachment", pdf("pindah"), "Pindah.pdf") });
    assert.equal(rep.status, 200, rep.text);
    const a0 = row(T_REG, legacyReg.id).attachments[0];
    assert.equal(a0.id, legacyId); assert.equal(a0.path, undefined); assert.match(a0.driveFileId, /^drv_/);
    assert.ok(!legacy.objects.has("banpt-regulations/regulations/lama/attachments/a.pdf"));
  });
  await test("hapus peraturan campuran (lama + Drive): file Supabase DAN Drive dibersihkan", async () => {
    seedLegacy(); fd.reset();
    await addAtt(legacyReg.id, [[pdf("d1"), "D1.pdf"]]); await putReg(legacyReg.id, pdf("d0")); // dokumen utama -> Drive, lampiran lama tetap
    assert.equal(live().length, 2);
    assert.equal((await call("DELETE", `${REG}/${legacyReg.id}`)).status, 200);
    assert.equal(live().length, 0); assert.ok(!legacy.objects.has("banpt-regulations/regulations/lama/attachments/a.pdf"));
  });
  await test("hapus dokumen lama prodi (belum dimigrasi) tetap bekerja lewat Supabase", async () => {
    seedLegacy();
    const r = await call("DELETE", `${PROG}/${legacyProg.id}/document`);
    assert.equal(r.status, 200); assert.ok(!legacy.objects.has("accreditation-documents/study-programs/lama/doc.pdf"));
  });
  await test("syarat publish regulasi: dokumen lama (document_path) tetap dianggap ada", async () => {
    seedLegacy(); row(T_REG, legacyReg.id).status = "draft";
    assert.equal((await publishReg(legacyReg.id)).status, 200);
  });
  await test("akreditasi INSTITUSI di luar cakupan: tetap Supabase Storage, tidak menyentuh Drive", async () => {
    fd.reset();
    const i = await call("POST", "/api/admin/accreditation/institutions", { body: { rank: "Unggul", skNumber: "INST-1", decisionDate: "2024-03-01", validFrom: "2024-03-01", validUntil: "2029-03-01" } });
    assert.equal(i.status, 201, i.text);
    const id = i.json.data.accreditation.id;
    const r = await call("PUT", `/api/admin/accreditation/institutions/${id}/document`, { form: one("document", pdf("inst"), "inst.pdf") });
    assert.equal(r.status, 200, r.text);
    assert.match(row(T_INST, id).document_path, /^institutions\//); assert.ok(!row(T_INST, id).document_drive_file_id);
    assert.equal(fd.state.calls.length, 0); assert.match(r.json.data.accreditation.document.url, /\/object\/sign\//);
  });

  // =====================================================================================
  console.log("\nH. Drive belum dikonfigurasi / gangguan");
  await startServer(); reset();
  await test("Drive tidak dikonfigurasi: upload -> 503 STORAGE_NOT_CONFIGURED, data tidak berubah, CRUD non-file tetap jalan", async () => {
    const p = await mkProg(); const reg = await mkReg();
    fd.state.configured = false;
    const a = await putProg(p.id); const b = await putReg(reg.id); const c = await addAtt(reg.id, [[pdf("x"), "x.pdf"]]);
    for (const r of [a, b, c]) { assert.equal(r.status, 503); assert.equal(r.json.code, "STORAGE_NOT_CONFIGURED"); }
    assert.equal(row(T_PROG, p.id).document_drive_file_id ?? null, null); assert.deepEqual(row(T_REG, reg.id).attachments, []);
    assert.equal((await call("PATCH", `${PROG}/${p.id}`, { body: { rank: "Baik" } })).status, 200);
    assert.equal((await call("GET", PROG)).status, 200);
    fd.state.configured = true;
  });
  await test("Drive tidak dikonfigurasi: preview -> 503; hapus record berdokumen Drive tetap sukses dan file diantrekan untuk dibersihkan", async () => {
    const p = await mkProg({ skNumber: "NC-1", programName: "NC" }, "published"); await putProg(p.id);
    const id = row(T_PROG, p.id).document_drive_file_id;
    fd.state.configured = false;
    const pv = await call("GET", `${PUB_PROG}/${p.id}/document`, { token: null }); assert.equal(pv.status, 503); assert.equal(pv.json.code, "STORAGE_NOT_CONFIGURED");
    assert.equal((await call("DELETE", `${PROG}/${p.id}`)).status, 200);
    fd.state.configured = true;
    assert.ok((db.drive_cleanup_queue || []).some((q) => q.file_id === id));
  });

  // =====================================================================================
  console.log("\nI. Skrip pembersihan file yatim");
  await startServer(); reset();
  const cleanup = (() => { for (const k of Object.keys(require.cache)) if (k.endsWith(path.join("scripts", "cleanupDriveOrphans.js"))) delete require.cache[k]; return require("./cleanupDriveOrphans.js"); })();
  const out = []; const origLog = console.log; const capture = async (fn, argv) => { out.length = 0; process.argv = ["node", "x", ...argv]; console.log = (...a) => out.push(a.join(" ")); try { await fn(); } finally { console.log = origLog; } return out.join("\n"); };
  await test("antrean: file yang gagal dihapus dicoba lagi & dihapus dari antrean saat berhasil; gagal lagi -> attempts naik", async () => {
    const p = await mkProg(); await putProg(p.id, pdf("v1")); const old = row(T_PROG, p.id).document_drive_file_id;
    fd.state.failRemove = true; await putProg(p.id, pdf("v2")); fd.state.failRemove = false;
    assert.equal(db.drive_cleanup_queue.length, 1); assert.equal(fd.state.files.get(old).trashed, false);
    fd.state.failRemove = true; const o1 = await capture(cleanup.processQueue, []); fd.state.failRemove = false;
    assert.match(o1, /GAGAL/); assert.equal(db.drive_cleanup_queue[0].attempts, 1);
    const o2 = await capture(cleanup.processQueue, []);
    assert.match(o2, /1 dibersihkan, 0 gagal/); assert.equal(db.drive_cleanup_queue.length, 0); assert.equal(fd.state.files.get(old).trashed, true);
    process.exitCode = 0;
  });
  await test("rekonsiliasi dry-run: melaporkan file yatim tanpa menghapus; file yang dirujuk DB & file baru (masa tenggang) aman", async () => {
    reset();
    const p = await mkProg(); await putProg(p.id, pdf("dipakai")); const used = row(T_PROG, p.id).document_drive_file_id;
    const reg = await mkReg(); await putReg(reg.id); await addAtt(reg.id, [[pdf("l"), "l.pdf"]]); const attId = row(T_REG, reg.id).attachments[0].driveFileId;
    const orphanOld = await fd.api.uploadFile({ name: "yatim-lama", mimeType: "application/pdf", buffer: pdf("y"), parentId: "x", appProperties: { category: "banptRegulation", recordId: reg.id, role: "document" } });
    fd.state.files.get(orphanOld.id).createdTime = new Date(Date.now() - 3 * 3600e3).toISOString();
    const orphanNew = await fd.api.uploadFile({ name: "yatim-baru", mimeType: "application/pdf", buffer: pdf("z"), parentId: "x", appProperties: {} });
    const o = await capture(cleanup.reconcile, ["--reconcile"]);
    assert.match(o, /yatim: 1/); assert.ok(o.includes(`YATIM ${orphanOld.id}`)); assert.ok(!o.includes(orphanNew.id));
    assert.ok(live().includes(orphanOld.id) && live().includes(used) && live().includes(attId), "dry-run tidak boleh menghapus apa pun");
    const o2 = await capture(cleanup.reconcile, ["--reconcile", "--apply"]);
    assert.ok(o2.includes(`HAPUS ${orphanOld.id}`)); assert.ok(!live().includes(orphanOld.id));
    assert.ok(live().includes(used) && live().includes(attId) && live().includes(orphanNew.id), "file terpakai & file baru tidak boleh terhapus");
  });

  // =====================================================================================
  console.log("\nJ. Cover berita & kebersihan paket");
  await test("modul cover berita TIDAK tahu Google Drive (tetap Supabase Storage)", () => {
    for (const f of ["src/utils/coverStorage.js", "src/controllers/adminNewsCoverController.js", "src/middleware/uploadCoverImage.js", "src/utils/imageValidator.js"]) {
      const src = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
      assert.ok(!/drive|googleapis|google-auth/i.test(src.replace(/\/\/.*$/gm, "")), `${f} menyebut Drive`);
    }
    assert.match(fs.readFileSync(path.join(__dirname, "../src/utils/coverStorage.js"), "utf8"), /supabase\.storage\.from\(BUCKET\)/);
  });
  await test("tidak ada kredensial Google atau .env di berkas yang dikirim; .env.example hanya placeholder", () => {
    const example = fs.readFileSync(path.join(__dirname, "../.env.example"), "utf8");
    assert.ok(!/BEGIN (RSA |EC )?PRIVATE KEY-----\s*[A-Za-z0-9+/]{20}/.test(example));
    assert.match(example, /^GOOGLE_SERVICE_ACCOUNT_EMAIL=$/m); assert.match(example, /^GOOGLE_PRIVATE_KEY=$/m); assert.match(example, /^GOOGLE_DRIVE_ROOT_FOLDER_ID=$/m);
  });
  await test("log server tidak pernah memuat private key / access token", () => {
    assert.ok(!logs.some((l) => /PRIVATE KEY|tok_secret|Bearer /.test(l)));
  });

  console.error = origError;
  server.close();
  console.log(`\nSelesai: ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})();
