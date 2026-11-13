// Pengujian OFFLINE infrastruktur pengujian (T1):
//   * fake Supabase: strict table, bentuk hasil { data, error }, single/maybeSingle, or/limit, fault.
//   * fake Cloudinary: skenario kegagalan provider (upload/destroy/respons rusak/konfigurasi).
//   * integrasi videoStorageService: kegagalan antrean DB TIDAK dianggap berhasil.
//
// Tidak ada jaringan, kredensial asli, atau database Supabase. Semua di memori.

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.DOTENV_CONFIG_PATH = "/tmp/tidak-ada.env";
process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
process.env.CLOUDINARY_API_KEY = "KEY-UJI-TIDAK-RAHASIA";
process.env.CLOUDINARY_API_SECRET = "SECRET-UJI-TIDAK-RAHASIA";

const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");

const { createFakeSupabase } = require("./lib/fakeSupabase");
const { createFakeCloudinary } = require("./lib/fakeCloudinary");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  OK    ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  GAGAL ${name}\n        ${String(error.message).split("\n").slice(0, 5).join("\n        ")}`);
  }
};

const uploadVia = (cloud, options, bytes) =>
  new Promise((resolve, reject) => {
    const stream = cloud.getClient().uploader.upload_stream(options, (error, response) =>
      error ? reject(error) : resolve(response)
    );
    const pipe = new PassThrough();
    pipe.on("data", () => {});
    pipe.on("end", () => {});
    stream.on("error", reject);
    stream.end(bytes);
  });

(async () => {
  console.log("=== Pengujian Infrastruktur Tes (OFFLINE) ===");

  // =========================================================================
  console.log("\nA. Fake Supabase: strict table & bentuk hasil");
  const sb = createFakeSupabase({ strictTables: true, tables: ["allowed"] });
  const { db, faults } = sb;

  await test("strictTables: tabel tak terdaftar -> PGRST205 (bukan sukses diam-diam)", async () => {
    const result = await sb.client.from("tidak_terdaftar").select("*");
    assert.equal(result.data, null);
    assert.equal(result.error.code, "PGRST205");
    assert.match(result.error.message, /tidak_terdaftar/);
  });

  await test("strictTables: tabel terdaftar tetap bekerja; defineTable menambah tabel", async () => {
    sb.defineTable("custom_table");
    db.custom_table = [];
    const inserted = await sb.client.from("custom_table").insert({ name: "a" }).select("*").single();
    assert.equal(inserted.error, null);
    assert.equal(inserted.data.name, "a");
  });

  await test("insert/update/delete TANPA .select() -> data null, tetapi perubahan tetap tersimpan", async () => {
    db.allowed = [];
    const inserted = await sb.client.from("allowed").insert({ id: "1", name: "awal", status: "active" });
    assert.equal(inserted.data, null);
    assert.equal(inserted.error, null);
    assert.equal(db.allowed.length, 1, "baris harus tetap tersimpan");

    const updated = await sb.client.from("allowed").update({ name: "baru" }).eq("id", "1");
    assert.equal(updated.data, null);
    assert.equal(db.allowed[0].name, "baru");

    const deleted = await sb.client.from("allowed").delete().eq("id", "1");
    assert.equal(deleted.data, null);
    assert.equal(db.allowed.length, 0);
  });

  await test("fault per tabel/operasi: error dikembalikan, baris TIDAK berubah, fault sekali pakai", async () => {
    db.allowed = [{ id: "1", name: "awal", created_at: "x", updated_at: "x" }];
    faults.push({ table: "allowed", op: "update", error: { code: "XX000", message: "mati" } });
    const failed = await sb.client.from("allowed").update({ name: "hilang" }).eq("id", "1").select("*");
    assert.equal(failed.data, null);
    assert.equal(failed.error.code, "XX000");
    assert.equal(db.allowed[0].name, "awal", "baris tidak boleh berubah saat error");
    const retry = await sb.client.from("allowed").update({ name: "boleh" }).eq("id", "1").select("*");
    assert.equal(retry.error, null);
    assert.equal(db.allowed[0].name, "boleh");
  });

  await test("single/maybeSingle: >1 baris -> PGRST116; 0 baris: single error, maybe null", async () => {
    db.allowed = [
      { id: "1", name: "a" },
      { id: "2", name: "b" },
    ];
    const many = await sb.client.from("allowed").select("*").maybeSingle();
    assert.equal(many.data, null);
    assert.equal(many.error.code, "PGRST116");

    const noneMaybe = await sb.client.from("allowed").select("*").eq("id", "tidak-ada").maybeSingle();
    assert.equal(noneMaybe.data, null);
    assert.equal(noneMaybe.error, null);

    const noneSingle = await sb.client.from("allowed").select("*").eq("id", "tidak-ada").single();
    assert.equal(noneSingle.data, null);
    assert.equal(noneSingle.error.code, "PGRST116");
  });

  await test("or/limit/order meniru PostgREST untuk pola yang dipakai backend", async () => {
    db.allowed = [
      { id: "1", title: "Berita Kampus", excerpt: "a", rank: 2 },
      { id: "2", title: "Pengumuman", excerpt: "Berita penting", rank: 1 },
      { id: "3", title: "Lain", excerpt: "biasa", rank: 3 },
    ];
    const filtered = await sb.client
      .from("allowed")
      .select("*")
      .or("title.ilike.%berita%,excerpt.ilike.%berita%")
      .order("rank", { ascending: true })
      .limit(1);
    assert.equal(filtered.error, null);
    assert.equal(filtered.data.length, 1, "limit harus diterapkan");
    assert.equal(filtered.data[0].id, "2");
  });

  await test("Storage palsu: kegagalan upload/remove/signed URL/listBuckets dapat disimulasikan", async () => {
    sb.legacy.failUpload = { message: "upload mati" };
    assert.equal((await sb.client.storage.from("b").upload("x", Buffer.from("a"))).error.message, "upload mati");
    sb.legacy.failUpload = false;

    sb.legacy.failRemove = { message: "remove mati" };
    assert.equal((await sb.client.storage.from("b").remove(["x"])).error.message, "remove mati");
    sb.legacy.failRemove = false;

    sb.legacy.failSignedUrl = new Error("sign mati");
    assert.equal((await sb.client.storage.from("b").createSignedUrl("x", 60)).error.message, "sign mati");
    sb.legacy.failSignedUrl = false;

    sb.legacy.failListBuckets = { message: "list mati" };
    assert.equal((await sb.client.storage.listBuckets()).error.message, "list mati");
    sb.legacy.failListBuckets = false;
  });

  // =========================================================================
  console.log("\nB. Fake Cloudinary: skenario kegagalan provider");
  const cl = createFakeCloudinary();
  const opts = { public_id: "universitas-lia/videos/news/x/1", resource_type: "video", type: "upload" };

  await test("failUpload sekali pakai: panggilan pertama gagal, aset tidak tersimpan, berikutnya sukses", async () => {
    cl.reset();
    cl.state.failUpload = Object.assign(new Error("provider 500"), { http_code: 500 });
    await assert.rejects(() => uploadVia(cl, opts, Buffer.from("abc")), /provider 500/);
    assert.equal(cl.state.assets.size, 0);

    const ok = await uploadVia(cl, opts, Buffer.from("abc"));
    assert.equal(ok.public_id, opts.public_id);
    assert.equal(cl.state.assets.size, 1);
  });

  await test("badUploadResponse: respons tanpa secure_url (tidak boleh dianggap sukses)", async () => {
    cl.reset();
    cl.state.badUploadResponse = true;
    const response = await uploadVia(cl, opts, Buffer.from("abc"));
    assert.equal(response.secure_url, undefined);
    assert.equal(cl.state.assets.size, 0);
  });

  await test("failDestroy (Error) melempar; destroyResult 'error' mengembalikan hasil tak dikenal", async () => {
    cl.reset();
    cl.state.failDestroy = new Error("destroy mati");
    await assert.rejects(() => cl.getClient().uploader.destroy("x", { resource_type: "video" }), /destroy mati/);

    cl.state.failDestroy = false;
    cl.state.destroyResult = "error";
    const result = await cl.getClient().uploader.destroy("x", { resource_type: "video" });
    assert.equal(result.result, "error");
  });

  await test("configured=false: getClient melempar AppError 503 STORAGE_NOT_CONFIGURED", async () => {
    cl.reset();
    cl.state.configured = false;
    assert.throws(() => cl.getClient(), (error) => error.statusCode === 503 && error.code === "STORAGE_NOT_CONFIGURED");
  });

  // =========================================================================
  console.log("\nC. Integrasi videoStorageService: kegagalan DB tidak dianggap sukses");
  const sb2 = createFakeSupabase({ strictTables: true, tables: ["media_cleanup_queue"] });
  const cl2 = createFakeCloudinary();
  sb2.install();
  cl2.install();
  const service = require("../src/services/videoStorageService");

  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args.join(" "));
  const resetService = () => {
    for (const key of Object.keys(sb2.db)) delete sb2.db[key];
    sb2.db.media_cleanup_queue = [];
    sb2.resetFaults();
    cl2.reset();
    logs.length = 0;
  };

  await test("destroy gagal + antrean sukses: baris antrean tercatat, fungsi tidak melempar", async () => {
    resetService();
    const pid = "universitas-lia/videos/news/x/antre-ok";
    cl2.state.assets.set(pid, 10);
    cl2.state.failDestroy = true;
    await service.removeVideoQuietly(pid, "uji antrean sukses");
    assert.equal(sb2.db.media_cleanup_queue.length, 1);
    assert.equal(sb2.db.media_cleanup_queue[0].public_id, pid);
    assert.ok(logs.some((line) => line.includes(`[ORPHAN] cloudinary:${pid}`)));
  });

  await test("destroy gagal + insert antrean gagal -> TIDAK melempar, tetapi log 'gagal diantrekan' dan antrean kosong", async () => {
    resetService();
    const pid = "universitas-lia/videos/news/x/antre-gagal";
    cl2.state.assets.set(pid, 10);
    cl2.state.failDestroy = true;
    sb2.faults.push({ table: "media_cleanup_queue", op: "insert", error: { code: "XX000", message: "antrean mati" } });
    await service.removeVideoQuietly(pid, "uji antrean gagal");
    assert.equal(sb2.db.media_cleanup_queue.length, 0);
    assert.ok(logs.some((line) => line.includes(`cloudinary:${pid}`) && /gagal diantrekan/.test(line)));
  });

  await test("duplikat antrean (23505) dianggap sudah terjamin, bukan kegagalan baru", async () => {
    resetService();
    const pid = "universitas-lia/videos/news/x/duplikat";
    sb2.db.media_cleanup_queue.push({ id: "q1", public_id: pid, resource_type: "video" });
    cl2.state.failDestroy = true;
    await service.removeVideoQuietly(pid, "uji duplikat");
    assert.equal(sb2.db.media_cleanup_queue.length, 1);
    assert.ok(!logs.some((line) => /gagal diantrekan/.test(line)), "23505 bukan kegagalan");
  });

  await test("removeCloudinaryVideo: hasil destroy tak dikenal -> error (tidak dianggap sukses)", async () => {
    resetService();
    cl2.state.destroyResult = "error";
    await assert.rejects(() => service.removeCloudinaryVideo("x"), /hasil tidak dikenali/);
  });

  console.error = originalError;

  console.log(`\nHasil Pengujian Infrastruktur: ${passed} lulus, ${failed} gagal`);
  process.exit(failed === 0 ? 0 : 1);
})();
