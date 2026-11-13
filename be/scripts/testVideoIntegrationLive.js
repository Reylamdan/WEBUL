
/**
 * Tes integrasi LIVE video:
 * Express API + Supabase + Cloudinary.
 *
 * Jalankan server di terminal pertama:
 *   npm run dev
 *
 * Terminal kedua:
 *   node scripts/testVideoIntegrationLive.js
 *
 * Opsional:
 *   TEST_EMAIL=... TEST_PASSWORD=... API_URL=http://localhost:5000 node scripts/testVideoIntegrationLive.js
 *
 * Semua konten dan aset dibuat khusus untuk tes dan dibersihkan di akhir.
 */

process.env.CLOUDINARY_ROOT_FOLDER = "universitas-lia-test";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

require("../src/config/env");

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const supabase = require("../src/config/supabase");
const cloudinaryConfig = require("../src/config/cloudinary");

const API_URL = (
  process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`
).replace(/\/$/, "");

const PREFIX = "[TES-VIDEO-INTEGRATION]";
const SAMPLE_PATH = path.join(__dirname, "lib", "sample_video.mp4");

let passed = 0;
let failed = 0;
let token = null;
let recordId = null;
let firstPublicId = null;
let secondPublicId = null;
let testAdminName = null;

const testPublicIds = new Set();

const ask = (question, hidden = false) =>
  new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    let input = "";

    if (!stdin.isTTY) {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (data += chunk));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] || ""));
      return;
    }

    const finish = (fn, value) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      fn(value);
    };

    const onData = (chunk) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\r" || char === "\n") {
          return finish(resolve, input);
        }

        if (char === "\u0003") {
          return finish(reject, new Error("Tes dibatalkan."));
        }

        if (char === "\u007f" || char === "\b") {
          if (input.length) {
            input = input.slice(0, -1);
            if (!hidden) stdout.write("\b \b");
          }
          continue;
        }

        if (char < " ") continue;

        input += char;
        if (!hidden) stdout.write(char);
      }
    };

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });

const check = (name, condition, detail) => {
  if (!condition) {
    failed += 1;
    console.log(`  GAGAL ${name}`);
    if (detail !== undefined) {
      console.log(
        `        ${typeof detail === "string" ? detail : JSON.stringify(detail)}`
      );
    }
    return false;
  }

  passed += 1;
  console.log(`  OK    ${name}`);
  return true;
};

const section = (name) => console.log(`\n=== ${name} ===`);

const api = async (
  method,
  endpoint,
  { body, auth = true, formData } = {}
) => {
  const headers = {};

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body:
      formData !== undefined
        ? formData
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  });

  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    // Respons bukan JSON.
  }

  return {
    status: response.status,
    json,
    text,
  };
};

const videoFrom = (response) => response?.json?.data?.video ?? null;

const cloudinaryExists = async (publicId) => {
  try {
    await cloudinaryConfig
      .getClient()
      .api.resource(publicId, { resource_type: "video" });

    return true;
  } catch (error) {
    const status = error?.http_code || error?.error?.http_code;
    if (status === 404) return false;
    throw error;
  }
};

const destroyCloudinaryAsset = async (publicId) => {
  if (!publicId) return true;

  try {
    const result = await cloudinaryConfig
      .getClient()
      .uploader.destroy(publicId, {
        resource_type: "video",
        invalidate: true,
      });

    return result?.result === "ok" || result?.result === "not found";
  } catch (error) {
    console.log(
      `  PERHATIAN: gagal membersihkan aset ${publicId}: ${error.message}`
    );
    return false;
  }
};

const cleanup = async () => {
  console.log("\n=== CLEANUP DATA PENGUJIAN ===");

  // 1. Hapus berita melalui API agar mekanisme purge video ikut diuji.
  if (recordId && token) {
    const response = await api("DELETE", `/api/admin/news/${recordId}`).catch(
      () => null
    );

    if (response?.status === 200 || response?.status === 404) {
      console.log("  OK    Cleanup berita melalui API");
    } else {
      console.log("  PERHATIAN: cleanup berita melalui API belum berhasil");
    }
  }

  // 2. Cari metadata yang mungkin masih tertinggal.
  if (recordId) {
    const { data, error } = await supabase
      .from("media_videos")
      .select("id, public_id")
      .eq("owner_module", "news")
      .eq("record_id", recordId);

    if (error) {
      console.log("  PERHATIAN: gagal memeriksa metadata sisa:", error.message);
    } else {
      for (const row of data || []) {
        testPublicIds.add(row.public_id);

        const deleted = await destroyCloudinaryAsset(row.public_id);

        if (deleted) {
          await supabase
            .from("media_videos")
            .delete()
            .eq("id", row.id);
        }
      }
    }
  }

  // 3. Bersihkan semua aset Cloudinary yang dibuat oleh tes ini.
  for (const publicId of testPublicIds) {
    const deleted = await destroyCloudinaryAsset(publicId);

    if (deleted) {
      // Hanya menghapus antrean milik aset pengujian ini.
      await supabase
        .from("media_cleanup_queue")
        .delete()
        .eq("public_id", publicId);
    } else {
      console.log(
        `  PERHATIAN: aset ${publicId} dipertahankan dalam antrean jika sudah tercatat`
      );
    }
  }

  // 4. Fallback: hapus berita uji langsung jika API gagal.
  if (recordId) {
    const { data: remaining } = await supabase
      .from("news")
      .select("id")
      .eq("id", recordId)
      .maybeSingle();

    if (remaining) {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", recordId);

      if (error) {
        console.log("  PERHATIAN: berita uji belum terhapus:", error.message);
      } else {
        console.log("  OK    Fallback cleanup berita uji");
      }
    }
  }
};

const run = async () => {
  if (!fs.existsSync(SAMPLE_PATH)) {
    throw new Error(`File sampel tidak ditemukan: ${SAMPLE_PATH}`);
  }

  if (!cloudinaryConfig.isConfigured()) {
    throw new Error("Konfigurasi Cloudinary belum lengkap.");
  }

  const videoBuffer = fs.readFileSync(SAMPLE_PATH);

  if (!videoBuffer.length) {
    throw new Error("File sampel MP4 kosong.");
  }

  const email =
    process.env.TEST_EMAIL || (await ask("Email admin    : "));
  const password =
    process.env.TEST_PASSWORD || (await ask("Password admin : ", true));

  section("1. KONEKSI SERVER");

  const health = await api("GET", "/", { auth: false });

  if (!check("Server Express dapat dihubungi", health.status === 200, health.status)) {
    throw new Error("Server tidak aktif. Jalankan npm run dev.");
  }

  section("2. LOGIN ADMIN");

  const login = await api("POST", "/api/auth/login", {
    auth: false,
    body: { email, password },
  });

  if (!check("Login admin berhasil", login.status === 200 && !!login.json?.data?.token, login.json)) {
    throw new Error("Login admin gagal.");
  }

  token = login.json.data.token;
  testAdminName = login.json.data.admin.name;

  console.log(`  Admin: ${testAdminName}`);

  section("3. MEMBUAT BERITA UJI");

  const unique = crypto.randomUUID();
  const title = `${PREFIX} ${unique}`;

  const created = await api("POST", "/api/admin/news", {
    body: {
      title,
      contentHtml: "<p>Konten khusus pengujian integrasi video.</p>",
      excerpt: "Berita sementara untuk tes integrasi video.",
      status: "published",
    },
  });

  const news = created.json?.data?.news;

  if (!check("Berita uji berhasil dibuat", created.status === 201 && !!news?.id, created.json)) {
    throw new Error("Gagal membuat berita uji.");
  }

  recordId = news.id;

  check(
    "Berita uji berstatus published",
    news.status === "published" && !!news.publishedAt,
    [news.status, news.publishedAt]
  );

  section("4. UPLOAD VIDEO MELALUI API");

  const uploadForm = new FormData();
  uploadForm.append(
    "video",
    new Blob([videoBuffer], { type: "video/mp4" }),
    "sample_video.mp4"
  );

  const uploaded = await api(
    "POST",
    `/api/admin/videos/news/${recordId}`,
    { formData: uploadForm }
  );

  const first = videoFrom(uploaded);

  if (first?.publicId) {
    firstPublicId = first.publicId;
    testPublicIds.add(first.publicId);
  }

  if (!check("POST upload video -> HTTP 201", uploaded.status === 201 && !!first?.id, uploaded.json)) {
    throw new Error("Upload video pertama gagal.");
  }

  check("URL video menggunakan HTTPS", /^https:\/\/res\.cloudinary\.com\//.test(first.secureUrl));
  check("Thumbnail tersedia", /^https:\/\/res\.cloudinary\.com\//.test(first.thumbnailUrl));
  check("Format video MP4", first.format === "mp4", first.format);
  check("Metadata durasi dan ukuran tersedia", first.duration > 0 && first.bytes > 0);

  section("5. VERIFIKASI SUPABASE DAN CLOUDINARY");

  const { data: firstRow, error: firstDbError } = await supabase
    .from("media_videos")
    .select("*")
    .eq("id", first.id)
    .maybeSingle();

  check(
    "Metadata video tersimpan di Supabase",
    !firstDbError && !!firstRow && firstRow.public_id === first.publicId,
    firstDbError?.message
  );

  check(
    "Aset pertama tercatat di Cloudinary Admin API",
    await cloudinaryExists(first.publicId)
  );

  const videoResponse = await fetch(first.secureUrl);
  check(
    "URL pemutaran video dapat diakses (HTTP 200)",
    videoResponse.status === 200 &&
      (videoResponse.headers.get("content-type") || "").startsWith("video/"),
    videoResponse.status
  );

  const posterResponse = await fetch(first.thumbnailUrl);
  check(
    "URL poster dapat diakses (HTTP 200)",
    posterResponse.status === 200 &&
      (posterResponse.headers.get("content-type") || "").startsWith("image/"),
    posterResponse.status
  );

  section("6. AKSES VIDEO PUBLIK TANPA TOKEN");

  const publicResponse = await api(
    "GET",
    `/api/videos/news/${recordId}`,
    { auth: false }
  );

  const publicVideo = videoFrom(publicResponse);

  check(
    "Endpoint publik mengembalikan HTTP 200",
    publicResponse.status === 200 && !!publicVideo,
    publicResponse.json
  );

  check(
    "URL publik sesuai dengan video aktif",
    publicVideo?.secureUrl === first.secureUrl
  );

  check(
    "Respons publik tidak membocorkan publicId, uploadedBy, status",
    publicVideo &&
      !("publicId" in publicVideo) &&
      !("uploadedBy" in publicVideo) &&
      !("status" in publicVideo)
  );

  section("7. PERLINDUNGAN DUPLIKASI UPLOAD");

  const duplicateForm = new FormData();
  duplicateForm.append(
    "video",
    new Blob([videoBuffer], { type: "video/mp4" }),
    "sample_video.mp4"
  );

  const duplicate = await api(
    "POST",
    `/api/admin/videos/news/${recordId}`,
    { formData: duplicateForm }
  );

  check(
    "Upload kedua tanpa PUT ditolak HTTP 409",
    duplicate.status === 409 &&
      duplicate.json?.code === "VIDEO_ALREADY_EXISTS",
    [duplicate.status, duplicate.json?.code]
  );

  section("8. MENGGANTI VIDEO (PUT / CAS)");

  const replaceForm = new FormData();
  replaceForm.append(
    "video",
    new Blob([videoBuffer], { type: "video/mp4" }),
    "sample_video.mp4"
  );

  const replaced = await api(
    "PUT",
    `/api/admin/videos/news/${recordId}`,
    { formData: replaceForm }
  );

  const second = videoFrom(replaced);

  if (second?.publicId) {
    secondPublicId = second.publicId;
    testPublicIds.add(second.publicId);
  }

  if (!check("PUT replace video berhasil", replaced.status === 200 && !!second?.id, replaced.json)) {
    throw new Error("Penggantian video gagal.");
  }

  check(
    "public_id video baru berbeda",
    second.publicId !== first.publicId,
    [first.publicId, second.publicId]
  );

  const { data: updatedRow, error: updatedError } = await supabase
    .from("media_videos")
    .select("*")
    .eq("id", second.id)
    .maybeSingle();

  check(
    "Metadata Supabase sudah menunjuk video baru",
    !updatedError &&
      !!updatedRow &&
      updatedRow.public_id === second.publicId
  );

  check(
    "Aset Cloudinary lama sudah terhapus",
    !(await cloudinaryExists(first.publicId))
  );

  check(
    "Aset Cloudinary baru masih tersedia",
    await cloudinaryExists(second.publicId)
  );

  section("9. MENGHAPUS VIDEO");

  const deleted = await api(
    "DELETE",
    `/api/admin/videos/news/${recordId}`
  );

  check(
    "DELETE video berhasil",
    deleted.status === 200 && deleted.json?.success === true,
    deleted.json
  );

  const { data: deletedRow, error: deletedDbError } = await supabase
    .from("media_videos")
    .select("id")
    .eq("id", second.id)
    .maybeSingle();

  check(
    "Metadata video sudah tidak ada di Supabase",
    !deletedDbError && !deletedRow,
    deletedDbError?.message
  );

  check(
    "Aset Cloudinary video baru sudah terhapus",
    !(await cloudinaryExists(second.publicId))
  );

  const afterDelete = await api(
    "GET",
    `/api/videos/news/${recordId}`,
    { auth: false }
  );

  check(
    "Video yang sudah dihapus tidak dapat diakses publik (404)",
    afterDelete.status === 404
  );
};

(async () => {
  console.log("========================================");
  console.log(" TES LIVE INTEGRASI VIDEO");
  console.log(" Express + Supabase + Cloudinary");
  console.log("========================================");
  console.log(`API: ${API_URL}`);
  console.log(`Sampel: ${SAMPLE_PATH}`);

  try {
    await run();
  } catch (error) {
    failed += 1;
    console.log(`\nGAGAL: ${error.message}`);
  } finally {
    if (token || recordId || testPublicIds.size) {
      await cleanup();
    }

    console.log("\n========================================");
    console.log(`HASIL: ${passed} lulus, ${failed} gagal`);
    console.log("========================================");

    process.exitCode = failed > 0 ? 1 : 0;
  }
})();
