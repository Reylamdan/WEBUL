// Google Drive palsu di memori untuk pengujian OFFLINE. Menggantikan modul
// src/services/googleDriveService.js lewat require.cache (nama fungsi sama dengan modul asli).
// Tidak ada koneksi jaringan, tidak ada kredensial.
const path = require("node:path");
const crypto = require("node:crypto");

const FOLDER_MIME = "application/vnd.google-apps.folder";

class DriveError extends Error {
  constructor(message, { status = 0, reason = "" } = {}) {
    super(message); this.name = "DriveError"; this.status = status; this.reason = reason;
  }
}

const createFakeDrive = () => {
  const state = {
    configured: true,
    files: new Map(),          // id -> { id, name, mimeType, buffer, parents, appProperties, trashed, createdTime }
    folders: new Map(),        // nama -> id
    calls: [],                 // log operasi: { op, ... }
    failUpload: false,
    failUploadAfter: null,     // gagal setelah N upload berhasil
    uploads: 0,
    failRemove: false,
    failDownload: null,        // null | { status }
    downloadHook: null,
    deleteMode: "trash",
    permissionsCalls: 0,       // harus selalu 0: file tidak boleh dibuat publik
  };
  const live = () => [...state.files.values()].filter((f) => !f.trashed);

  const api = {
    isConfigured: () => state.configured,
    notConfigured: () => {
      const AppError = require("../../src/utils/AppError");
      return new AppError("Penyimpanan dokumen belum dikonfigurasi", 503, "STORAGE_NOT_CONFIGURED");
    },
    ensureFolder: async (name) => {
      if (!state.configured) throw api.notConfigured();
      if (!state.folders.has(name)) state.folders.set(name, `folder-${name}`);
      return state.folders.get(name);
    },
    uploadFile: async ({ name, mimeType, buffer, parentId, appProperties }) => {
      if (!state.configured) throw api.notConfigured();
      state.uploads += 1;
      if (state.failUpload || (state.failUploadAfter !== null && state.uploads > state.failUploadAfter)) {
        throw new DriveError("Drive API 500: upload boom", { status: 500 });
      }
      const id = `drv_${crypto.randomBytes(8).toString("hex")}`;
      const file = { id, name, mimeType, buffer: Buffer.from(buffer), parents: [parentId], appProperties: { app: "lia-be", ...appProperties }, trashed: false, createdTime: new Date().toISOString() };
      state.files.set(id, file);
      state.calls.push({ op: "upload", id, name, mimeType, parentId, appProperties: file.appProperties });
      return { id, name, mimeType, size: String(buffer.length), md5Checksum: crypto.createHash("md5").update(buffer).digest("hex") };
    },
    downloadFile: async (fileId, { range, signal } = {}) => {
      if (!state.configured) throw api.notConfigured();
      state.calls.push({ op: "download", id: fileId, range });
      if (state.downloadHook) await state.downloadHook(fileId);
      if (state.failDownload) throw new DriveError(`Drive API ${state.failDownload.status}`, { status: state.failDownload.status });
      const f = state.files.get(fileId);
      if (!f || f.trashed) throw new DriveError("Drive API 404 (notFound)", { status: 404, reason: "notFound" });
      let body = f.buffer; let status = 200; const headers = new Map();
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = m[1] === "" ? Math.max(0, f.buffer.length - Number(m[2])) : Number(m[1]);
        const end = m[1] !== "" && m[2] !== "" ? Math.min(Number(m[2]), f.buffer.length - 1) : f.buffer.length - 1;
        if (start >= f.buffer.length) throw new DriveError("Drive API 416", { status: 416 });
        body = f.buffer.subarray(start, end + 1); status = 206;
        headers.set("content-range", `bytes ${start}-${end}/${f.buffer.length}`);
      }
      headers.set("content-length", String(body.length));
      return { status, headers: { get: (n) => headers.get(n.toLowerCase()) ?? null }, body: new Response(body).body, signal };
    },
    removeFile: async (fileId, mode = state.deleteMode) => {
      if (!state.configured) throw api.notConfigured();
      state.calls.push({ op: "remove", id: fileId, mode });
      if (state.failRemove) throw new DriveError("Drive API 500: remove boom", { status: 500 });
      const f = state.files.get(fileId);
      if (!f) return;
      if (mode === "delete") state.files.delete(fileId); else f.trashed = true;
    },
    getFileMetadata: async (fileId) => {
      const f = state.files.get(fileId);
      if (!f) throw new DriveError("Drive API 404", { status: 404 });
      return { id: f.id, name: f.name, mimeType: f.mimeType, capabilities: { canAddChildren: true } };
    },
    listAppFiles: async () => ({ files: live().map((f) => ({ id: f.id, name: f.name, createdTime: f.createdTime, appProperties: f.appProperties })) }),
    listFiles: async () => ({ files: [] }),
  };

  const reset = () => {
    state.configured = true; state.files.clear(); state.calls.length = 0; state.failUpload = false; state.failUploadAfter = null;
    state.uploads = 0; state.failRemove = false; state.failDownload = null; state.downloadHook = null; state.deleteMode = "trash";
  };

  // Pasang sebagai pengganti modul asli. Dipanggil sebelum app dimuat.
  const install = () => {
    const modulePath = require.resolve(path.join(__dirname, "../../src/services/googleDriveService.js"));
    require.cache[modulePath] = {
      id: modulePath, filename: modulePath, loaded: true,
      exports: { ...api, DriveError, FOLDER_MIME, APP_MARKER: { key: "app", value: "lia-be" }, createGoogleDriveService: () => api },
    };
    return modulePath;
  };

  return { api, state, live, reset, install, DriveError };
};

module.exports = { createFakeDrive };
