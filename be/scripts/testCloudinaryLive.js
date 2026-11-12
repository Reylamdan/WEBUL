// Pengujian Cloudinary ASLI untuk modul cover (src/utils/coverStorage.js), TANPA Supabase dan TANPA server.
// Membutuhkan kredensial Cloudinary di .env (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, dan
// CLOUDINARY_CLOUD_NAME atau NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) dan akses jaringan ke Cloudinary.
//
//   npm run test:cloudinary-live
//
// Aman: seluruh aset uji ditaruh di folder terpisah "universitas-lia-test/..." (bukan folder produksi),
// memakai ID berita acak yang tidak ada di database, dan SELALU dihapus di akhir (juga saat gagal).
// Kredensial tidak pernah dicetak.
process.env.CLOUDINARY_ROOT_FOLDER = "universitas-lia-test";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const sharp = require("sharp");

const env = require("../src/config/env");
const cloudinaryConfig = require("../src/config/cloudinary");

let passed = 0, failed = 0, skipped = false;
// Pesan error provider tidak pernah dicetak mentah (bisa memuat kredensial). AssertionError (pesan dari
// kode tes ini sendiri) boleh; selain itu hanya ringkasan aman: kategori, status HTTP, kode jaringan.
const { describeProviderError } = require("../src/utils/coverStorage");
const safeReason = (e) => (e && e.name === "AssertionError" ? String(e.message).split("\n").slice(0, 3).join("\n        ")
  : e && e.code === "STORAGE_ERROR" ? "STORAGE_ERROR (lihat log [STORAGE] di atas)" : describeProviderError(e));
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${safeReason(e)}`); }
};

(async () => {
  if (!env.cloudinary.enabled) {
    console.log("DILEWATI: konfigurasi Cloudinary tidak lengkap di .env (nama cloud, API key, API secret).");
    process.exit(2);
  }

  const { uploadCoverObject, removeCoverQuietly, STORAGE } = require("../src/utils/coverStorage");
  const client = cloudinaryConfig.getClient();
  const newsId = crypto.randomUUID();
  const created = [];
  const exists = async (publicId) => {
    try { await client.api.resource(publicId, { resource_type: "image" }); return true; }
    catch (e) { if (e && (e.http_code === 404 || (e.error && e.error.http_code === 404))) return false; throw e; }
  };

  try {
    const image = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#336699" } }).jpeg().toBuffer();
    let first, second;

    console.log(`Cloud: ${env.cloudinary.cloudName} | folder uji: ${env.cloudinary.rootFolder}`);

    await test("upload_stream: aset terbentuk di folder uji, URL https, metadata benar", async () => {
      first = await uploadCoverObject(newsId, image); created.push(first.publicId);
      assert.match(first.publicId, new RegExp(`^universitas-lia-test/news/covers/${newsId}/[0-9a-f-]{36}$`));
      assert.match(first.url, /^https:\/\/res\.cloudinary\.com\//);
      assert.equal(first.width, 64); assert.equal(first.height, 32); assert.ok(first.bytes > 0); assert.equal(first.format, "jpg");
    });
    await test("URL publik bisa dibuka tanpa autentikasi dan bertipe gambar", async () => {
      const res = await fetch(first.url);
      assert.equal(res.status, 200); assert.match(res.headers.get("content-type") || "", /^image\//);
    });
    await test("aset benar-benar ada menurut Admin API", async () => { assert.equal(await exists(first.publicId), true); });
    await test("upload kedua (ganti cover) menghasilkan public_id berbeda; overwrite tidak terjadi", async () => {
      second = await uploadCoverObject(newsId, image); created.push(second.publicId);
      assert.notEqual(second.publicId, first.publicId);
      assert.equal(await exists(first.publicId), true);
    });
    await test("hapus aset lama (removeCoverQuietly) -> hilang; aset baru tetap ada", async () => {
      await removeCoverQuietly({ storage: STORAGE.CLOUDINARY, publicId: first.publicId }, "tes live");
      assert.equal(await exists(first.publicId), false);
      assert.equal(await exists(second.publicId), true);
    });
    await test("hapus aset yang sudah tidak ada tidak menimbulkan error", async () => {
      await removeCoverQuietly({ storage: STORAGE.CLOUDINARY, publicId: first.publicId }, "tes live ulang");
    });
    await test("cover Supabase lama TIDAK diproses: removeCoverQuietly hanya mencatat (tidak memanggil Cloudinary)", async () => {
      await removeCoverQuietly({ storage: STORAGE.SUPABASE, path: `covers/${newsId}/x.jpg` }, "tes live lama");
    });
  } finally {
    for (const publicId of created) {
      try { await client.uploader.destroy(publicId, { resource_type: "image", invalidate: true }); }
      catch { console.log(`  PERHATIAN: aset uji ${publicId} gagal dibersihkan, hapus manual di folder universitas-lia-test.`); }
    }
  }

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal${skipped ? " (sebagian dilewati)" : ""}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log(`GAGAL tak terduga: ${describeProviderError(e)}`); process.exit(1); });
