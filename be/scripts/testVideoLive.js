// Pengujian Cloudinary ASLI untuk modul video generik (src/services/videoStorageService.js),
// TANPA Supabase dan TANPA server Express.
// Membutuhkan kredensial Cloudinary di .env (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, dan
// CLOUDINARY_CLOUD_NAME atau NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) serta akses internet.
//
//   npm run test:video-live
//
// Aman: seluruh aset uji ditempatkan di folder terpisah "universitas-lia-test/videos/..."
// dan SELALU dibersihkan di akhir (termasuk bila terjadi kegagalan).

process.env.CLOUDINARY_ROOT_FOLDER = "universitas-lia-test";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const env = require("../src/config/env");
const cloudinaryConfig = require("../src/config/cloudinary");
const { describeProviderError } = require("../src/utils/coverStorage");

let passed = 0,
  failed = 0;

const safeReason = (e) =>
  e && e.name === "AssertionError"
    ? String(e.message).split("\n").slice(0, 3).join("\n        ")
    : e && e.code === "STORAGE_ERROR"
    ? "STORAGE_ERROR (lihat log [STORAGE] di atas)"
    : describeProviderError(e);

const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  OK    ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  GAGAL ${name}\n        ${safeReason(e)}`);
  }
};

(async () => {
  if (!env.cloudinary.enabled) {
    console.log(
      "DILEWATI: konfigurasi Cloudinary tidak lengkap di .env (nama cloud, API key, API secret)."
    );
    process.exit(2);
  }

  const {
    uploadVideoObject,
    removeVideoQuietly,
  } = require("../src/services/videoStorageService");

  const client = cloudinaryConfig.getClient();
  const testRecordId = crypto.randomUUID();
  const created = [];

  const exists = async (publicId) => {
    try {
      await client.api.resource(publicId, { resource_type: "video" });
      return true;
    } catch (e) {
      if (e && (e.http_code === 404 || (e.error && e.error.http_code === 404))) return false;
      throw e;
    }
  };

  try {
    // Memuat video MP4 sampel berukuran kecil (13 KB)
    const samplePath = path.join(__dirname, "lib", "sample_video.mp4");
    let videoBuffer;
    if (fs.existsSync(samplePath)) {
      videoBuffer = fs.readFileSync(samplePath);
    } else {
      const resp = await fetch(
        "https://raw.githubusercontent.com/web-platform-tests/wpt/master/media/white.mp4"
      );
      videoBuffer = Buffer.from(await resp.arrayBuffer());
    }

    let first, second;

    console.log(
      `Cloud: ${env.cloudinary.cloudName} | folder uji: ${env.cloudinary.rootFolder}/videos`
    );

    await test("upload_stream video: aset terbentuk di folder uji, URL https, metadata & poster terbentuk", async () => {
      first = await uploadVideoObject("news", testRecordId, videoBuffer);
      created.push(first.publicId);

      assert.match(
        first.publicId,
        new RegExp(`^universitas-lia-test/videos/news/${testRecordId}/[0-9a-f-]{36}$`)
      );
      assert.match(first.url, /^https:\/\/res\.cloudinary\.com\//);
      assert.match(
        first.thumbnailUrl,
        /^https:\/\/res\.cloudinary\.com\/.*\/video\/upload\/so_auto,q_auto,f_jpg\//
      );
      assert.equal(first.format, "mp4");
      assert.ok(first.bytes > 0);
      assert.ok(typeof first.duration === "number" && first.duration > 0);
      assert.ok(first.width > 0 && first.height > 0);
    });

    await test("URL pemutaran video publik dapat diakses tanpa autentikasi (HTTP 200)", async () => {
      const res = await fetch(first.url);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") || "", /^video\//);
    });

    await test("URL poster thumbnail dinamis dapat dibuka sebagai gambar (HTTP 200)", async () => {
      const res = await fetch(first.thumbnailUrl);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") || "", /^image\//);
    });

    await test("aset video benar-benar tercatat menurut Admin API Cloudinary", async () => {
      assert.equal(await exists(first.publicId), true);
    });

    await test("upload kedua (ganti video) menghasilkan public_id berbeda tanpa overwrite", async () => {
      second = await uploadVideoObject("news", testRecordId, videoBuffer);
      created.push(second.publicId);

      assert.notEqual(second.publicId, first.publicId);
      assert.equal(await exists(first.publicId), true);
      assert.equal(await exists(second.publicId), true);
    });

    await test("penghapusan aset (removeVideoQuietly) berhasil: aset terhapus, aset baru tetap ada", async () => {
      await removeVideoQuietly(first.publicId, "tes live video");
      assert.equal(await exists(first.publicId), false);
      assert.equal(await exists(second.publicId), true);
    });

    await test("penghapusan aset yang sudah tidak ada tidak menimbulkan error", async () => {
      await removeVideoQuietly(first.publicId, "tes live ulang");
    });
  } finally {
    for (const pid of created) {
      try {
        await client.uploader.destroy(pid, { resource_type: "video", invalidate: true });
      } catch {
        console.log(`  PERHATIAN: aset uji ${pid} gagal dibersihkan, hapus manual.`);
      }
    }
  }

  console.log(`\nHasil Pengujian Live Video: ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.log(`GAGAL tak terduga: ${describeProviderError(e)}`);
  process.exit(1);
});

