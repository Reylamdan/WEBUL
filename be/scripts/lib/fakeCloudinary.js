// Cloudinary palsu di memori untuk pengujian OFFLINE (tanpa jaringan, tanpa kredensial).
// Menggantikan src/config/cloudinary.js di require.cache; antarmukanya sama dengan modul asli
// (isConfigured, notConfigured, getClient().uploader.upload_stream/destroy, rootFolder, cloudName).
const path = require("node:path");
const { PassThrough } = require("node:stream");
const AppError = require("../../src/utils/AppError");

const createFakeCloudinary = ({ cloudName = "demo-cloud", rootFolder = "universitas-lia" } = {}) => {
  const state = {
    configured: true,
    assets: new Map(),        // public_id -> ukuran byte
    uploads: [],              // opsi yang dipakai setiap upload
    destroys: [],             // { publicId, options }
    failUpload: null,         // objek error sekali pakai
    failDestroy: false,
    destroyResult: null,      // mis. "not found" / "error" (menggantikan hasil normal, sekali pakai)
    badUploadResponse: false, // respons upload tanpa secure_url
  };

  const client = {
    uploader: {
      upload_stream(options, callback) {
        const chunks = [];
        const stream = new PassThrough();
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", () => {
          state.uploads.push({ ...options });
          if (state.failUpload) {
            const error = state.failUpload;
            state.failUpload = null;
            return callback(error);
          }
          const bytes = Buffer.concat(chunks).length;
          if (state.badUploadResponse) return callback(null, { public_id: options.public_id });
          state.assets.set(options.public_id, bytes);
          const isVideo = options.resource_type === "video";
          return callback(null, {
            public_id: options.public_id,
            resource_type: isVideo ? "video" : "image",
            secure_url: isVideo
              ? `https://res.cloudinary.com/${cloudName}/video/upload/v1700000000/${options.public_id}.mp4`
              : `https://res.cloudinary.com/${cloudName}/image/upload/v1700000000/${options.public_id}.jpg`,
            width: isVideo ? 1920 : 20,
            height: isVideo ? 1080 : 10,
            format: isVideo ? "mp4" : "jpg",
            bytes,
            duration: isVideo ? (state.customDuration !== undefined ? state.customDuration : 15.5) : undefined,
          });
        });
        return stream;
      },
      async destroy(publicId, options) {
        state.destroys.push({ publicId, options });
        if (state.failDestroy) {
          // failDestroy dapat berupa Error kustom (mis. pesan yang memuat kredensial) atau true.
          throw state.failDestroy instanceof Error ? state.failDestroy : Object.assign(new Error("destroy gagal"), { http_code: 500 });
        }
        if (state.destroyResult) {
          const result = state.destroyResult;
          state.destroyResult = null;
          return { result };
        }
        const existed = state.assets.delete(publicId);
        return { result: existed ? "ok" : "not found" };
      },
    },
  };

  const module_ = {
    isConfigured: () => state.configured,
    notConfigured: () => new AppError("Penyimpanan media belum dikonfigurasi", 503, "STORAGE_NOT_CONFIGURED"),
    getClient: () => {
      if (!state.configured) throw module_.notConfigured();
      return client;
    },
    cloudName,
    rootFolder,
  };

  const install = () => {
    const modulePath = require.resolve(path.join(__dirname, "../../src/config/cloudinary.js"));
    require.cache[modulePath] = { id: modulePath, filename: modulePath, loaded: true, exports: module_ };
    return modulePath;
  };

  const reset = () => {
    state.configured = true;
    state.assets.clear();
    state.uploads.length = 0;
    state.destroys.length = 0;
    state.failUpload = null;
    state.failDestroy = false;
    state.destroyResult = null;
    state.badUploadResponse = false;
  };

  // getClient diekspos agar tes dapat memakai fake tanpa memasangnya ke require.cache.
  return { state, install, reset, getClient: module_.getClient, isConfigured: module_.isConfigured };
};

module.exports = { createFakeCloudinary };
