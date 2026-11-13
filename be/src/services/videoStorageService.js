const crypto = require("crypto");
const supabase = require("../config/supabase");
const cloudinaryConfig = require("../config/cloudinary");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const { describeProviderError } = require("../utils/coverStorage");
const { assertWithinDurationLimit } = require("../utils/videoValidator");

const UPLOAD_TIMEOUT_MS = 120_000;
const DESTROY_TIMEOUT_MS = 60_000;
const MEDIA_TABLE = "media_videos";
const CLEANUP_QUEUE_TABLE = "media_cleanup_queue";

// Membuat public_id Cloudinary yang unik & berstruktur hierarkis
// Format: {rootFolder}/videos/{module}/{recordId}/{uuid}
const buildVideoPublicId = (moduleName, recordId) => {
  const safeModule = String(moduleName || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${cloudinaryConfig.rootFolder}/videos/${safeModule}/${recordId}/${crypto.randomUUID()}`;
};

// Menghasilkan URL thumbnail poster dinamis dari frame video via Cloudinary Transformation
const buildVideoThumbnailUrl = (publicId, options = {}) => {
  const cloud = options.cloudName || cloudinaryConfig.cloudName;
  const startOffset = options.startOffset || "so_auto";
  const format = options.format || "jpg";
  const quality = options.quality || "q_auto";

  let transform = `${startOffset},${quality},f_${format}`;
  if (options.width && options.height) {
    transform += `,c_${options.crop || "fill"},w_${options.width},h_${options.height}`;
  }

  return `https://res.cloudinary.com/${cloud}/video/upload/${transform}/${publicId}.${format}`;
};

const storageError = (context, error) => {
  console.error(`[STORAGE] ${context}: ${describeProviderError(error)}`);
  return new AppError("Terjadi kesalahan pada penyimpanan video", 502, "STORAGE_ERROR");
};

// Mengunggah buffer video ke Cloudinary menggunakan upload_stream
const uploadVideoObject = async (moduleName, recordId, buffer) => {
  if (!cloudinaryConfig.isConfigured()) throw cloudinaryConfig.notConfigured();

  const publicId = buildVideoPublicId(moduleName, recordId);
  let result;

  try {
    const client = cloudinaryConfig.getClient();
    result = await new Promise((resolve, reject) => {
      const stream = client.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "video",
          type: "upload",
          overwrite: false,
          unique_filename: false,
          use_filename: false,
          tags: ["universitas-lia-video", `module-${moduleName}`],
          timeout: UPLOAD_TIMEOUT_MS,
        },
        (error, response) => (error ? reject(error) : resolve(response))
      );
      stream.on("error", reject);
      stream.end(buffer);
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw storageError("video: upload Cloudinary", error);
  }

  if (
    !result ||
    result.public_id !== publicId ||
    typeof result.secure_url !== "string" ||
    !result.secure_url.startsWith("https://")
  ) {
    console.error(`[ORPHAN] cloudinary:${publicId} (video: respons upload tidak valid)`);
    // Usahakan hapus aset yang mungkin terbuat
    await removeVideoQuietly(publicId, "uploadVideoObject: bersihkan aset yang responsnya tidak valid");
    throw storageError("video: respons upload tidak valid", null);
  }

  // Validasi durasi video setelah metadata diperoleh dari Cloudinary
  if (typeof result.duration === "number") {
    try {
      const maxDuration = env.cloudinaryVideo?.maxDurationSeconds;
      assertWithinDurationLimit(result.duration, maxDuration);
    } catch (durationErr) {
      // Hapus video dari Cloudinary karena melanggar batas durasi
      await removeVideoQuietly(publicId, "uploadVideoObject: durasi video melebihi batas");
      throw durationErr;
    }
  }

  const thumbnailUrl = buildVideoThumbnailUrl(result.public_id);

  return {
    publicId: result.public_id,
    url: result.secure_url,
    thumbnailUrl,
    width: Number.isInteger(result.width) ? result.width : null,
    height: Number.isInteger(result.height) ? result.height : null,
    format: typeof result.format === "string" ? result.format : "mp4",
    bytes: Number.isInteger(result.bytes) ? result.bytes : buffer.length,
    duration: typeof result.duration === "number" ? Math.round(result.duration * 100) / 100 : null,
  };
};

// Menghapus video dari Cloudinary via destroy
const removeCloudinaryVideo = async (publicId) => {
  if (!publicId) return;
  const client = cloudinaryConfig.getClient();
  const response = await client.uploader.destroy(publicId, {
    resource_type: "video",
    type: "upload",
    invalidate: true,
    timeout: DESTROY_TIMEOUT_MS,
  });

  const outcome = response && response.result;
  if (outcome !== "ok" && outcome !== "not found") {
    throw new Error("Cloudinary destroy video: hasil tidak dikenali");
  }
};

// Menghapus video tanpa memutus respons ke klien; jika gagal, catat [ORPHAN] & masukkan antrean cleanup
const removeVideoQuietly = async (publicId, context) => {
  if (!publicId) return;

  try {
    await removeCloudinaryVideo(publicId);
  } catch (error) {
    const errorDesc = describeProviderError(error);
    console.error(`[ORPHAN] cloudinary:${publicId} (${context}): ${errorDesc}`);

    // Rekam ke antrean pembersihan asynchronous di database jika tabel tersedia.
    // PENTING: supabase-js TIDAK melempar error; kegagalan hanya muncul di { error }.
    // Jika antrean gagal, jangan anggap berhasil: catat agar bisa direkonsiliasi manual.
    try {
      const { error: queueError } = await supabase.from(CLEANUP_QUEUE_TABLE).insert({
        public_id: publicId,
        resource_type: "video",
        reason: context,
        last_error: errorDesc,
      });
      // 23505 = aset ini sudah ada di antrean (indeks unik public_id): tetap terjamin dibersihkan.
      if (queueError && queueError.code !== "23505") throw queueError;
    } catch (queueError) {
      // Diamkan kegagalan antrean agar tidak menghalangi alur utama, tetapi JANGAN diam:
      // [ORPHAN] + public_id tetap dicatat untuk rekonsiliasi scripts/cleanupMediaOrphans.js.
      console.error(
        `[ORPHAN] cloudinary:${publicId} (${context}): gagal diantrekan (kode: ${
          (queueError && queueError.code) || "-"
        })`
      );
    }
  }
};

const removeNewVideoQuietly = (publicId, context) =>
  removeVideoQuietly(publicId, `kompensasi: ${context}`);

// Dipanggil SETELAH konten induk (berita/pengumuman) berhasil dihapus. record_id di media_videos bersifat
// polimorfik (tanpa foreign key), jadi baris video dan aset Cloudinary-nya tidak ikut terhapus otomatis.
// Fungsi ini TIDAK PERNAH melempar error: respons hapus konten tidak boleh gagal karena video.
// Baris DB dihapus lebih dulu (per id + public_id), baru asetnya; kegagalan destroy -> [ORPHAN] + antrean.
const purgeVideosForRecord = async (moduleName, recordId, context) => {
  try {
    const { data, error } = await supabase
      .from(MEDIA_TABLE)
      .select("id, public_id")
      .eq("owner_module", moduleName)
      .eq("record_id", recordId);
    if (error) throw error;

    for (const row of data || []) {
      const { data: deleted, error: deleteError } = await supabase
        .from(MEDIA_TABLE)
        .delete()
        .eq("id", row.id)
        .eq("public_id", row.public_id)
        .select("id")
        .maybeSingle();
      if (deleteError || !deleted) {
        console.error(`[ORPHAN] cloudinary:${row.public_id} (${context}): baris media_videos tidak terhapus`);
        continue;
      }
      await removeVideoQuietly(row.public_id, context);
    }
  } catch (error) {
    console.error(
      `[ORPHAN] media_videos ${moduleName}/${recordId} (${context}): gagal memproses video konten (kode: ${
        (error && error.code) || "-"
      })`
    );
  }
};

module.exports = {
  purgeVideosForRecord,
  MEDIA_TABLE,
  CLEANUP_QUEUE_TABLE,
  buildVideoPublicId,
  buildVideoThumbnailUrl,
  uploadVideoObject,
  removeCloudinaryVideo,
  removeVideoQuietly,
  removeNewVideoQuietly,
};

