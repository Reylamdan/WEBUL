// Google Drive palsu di memori (kontrak sama dengan src/services/googleDriveService yang dipakai driveStorage
// & fileController). Tidak ada jaringan/kredensial. Dipakai HANYA oleh tes constraint.
const crypto = require("node:crypto");

class DriveError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const createFakeDriveLite = () => {
  const state = { files: new Map(), folders: new Map(), calls: [], failUpload: false, failRemove: false, configured: true, seq: 0 };
  const live = () => [...state.files.values()].filter((f) => !f.trashed);

  const api = {
    isConfigured: () => state.configured,
    notConfigured: () => {
      const AppError = require("../../../src/utils/AppError");
      return new AppError("Penyimpanan dokumen belum dikonfigurasi", 503, "STORAGE_NOT_CONFIGURED");
    },
    ensureFolder: async (name) => {
      if (!state.folders.has(name)) state.folders.set(name, `folder-${name}`);
      return state.folders.get(name);
    },
    uploadFile: async ({ name, mimeType, buffer, parentId, appProperties }) => {
      state.calls.push({ op: "upload", name, mimeType, parentId, appProperties, bytes: buffer.length });
      if (state.failUpload) throw new DriveError("upload boom", 500);
      const id = `drv_${String(++state.seq).padStart(4, "0")}_${crypto.randomBytes(4).toString("hex")}`;
      const md5Checksum = crypto.createHash("md5").update(buffer).digest("hex");
      state.files.set(id, { id, name, mimeType, buffer: Buffer.from(buffer), parentId, appProperties, trashed: false });
      return { id, md5Checksum, size: String(buffer.length) };
    },
    removeFile: async (id) => {
      state.calls.push({ op: "remove", id });
      if (state.failRemove) throw new DriveError("remove boom", 500);
      const f = state.files.get(id);
      if (f) f.trashed = true;
    },
    downloadFile: async (id, { range } = {}) => {
      state.calls.push({ op: "download", id, range });
      const f = state.files.get(id);
      if (!f || f.trashed) throw new DriveError("not found", 404);
      const buf = f.buffer;
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = m[1] === "" ? Math.max(0, buf.length - Number(m[2])) : Number(m[1]);
        const end = m[1] !== "" && m[2] !== "" ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
        if (start >= buf.length) throw new DriveError("range", 416);
        const part = buf.subarray(start, end + 1);
        return new Response(part, { status: 206, headers: { "content-length": String(part.length), "content-range": `bytes ${start}-${end}/${buf.length}` } });
      }
      return new Response(buf, { status: 200, headers: { "content-length": String(buf.length) } });
    },
  };
  return { api, state, live, reset: () => { state.files.clear(); state.folders.clear(); state.calls.length = 0; state.failUpload = state.failRemove = false; state.configured = true; } };
};

module.exports = { createFakeDriveLite, DriveError };
