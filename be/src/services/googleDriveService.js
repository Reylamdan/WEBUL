// Klien Google Drive API v3 (REST) untuk backend, memakai Google Service Account.
//
// Mengapa REST + google-auth-library, bukan paket "googleapis": paket itu sangat besar dan
// kita hanya butuh 6 operasi (upload, unduh, hapus, cari/buat folder, daftar, metadata).
// google-auth-library menangani JWT service account + cache/refresh access token.
//
// Semua panggilan memakai supportsAllDrives=true karena Service Account TIDAK punya kuota
// penyimpanan sendiri: file harus berada di Shared Drive (lihat docs/GOOGLE_DRIVE_SETUP.md).
//
// File TIDAK PERNAH diberi permission publik. Satu-satunya jalur baca adalah backend ini.
const fs = require("fs");
const { GoogleAuth } = require("google-auth-library");
const AppError = require("../utils/AppError");

const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const FILE_FIELDS = "id,name,mimeType,size,md5Checksum,createdTime,appProperties,parents";

const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 250; // dapat dipercepat lewat config.retryBaseMs (untuk pengujian)

// Nilai appProperties yang menandai file milik aplikasi ini (dipakai rekonsiliasi file yatim).
const APP_MARKER = { key: "app", value: "lia-be" };

const notConfigured = () =>
  new AppError("Penyimpanan dokumen belum dikonfigurasi", 503, "STORAGE_NOT_CONFIGURED");

// Error Drive yang SUDAH dikenali. Pesan klien umum; detail hanya di log server.
class DriveError extends Error {
  constructor(message, { status = 0, reason = "" } = {}) {
    super(message);
    this.name = "DriveError";
    this.status = status;
    this.reason = reason;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeQuery = (value) => String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const readError = async (response) => {
  let reason = "";
  let message = "";
  try {
    const body = await response.json();
    reason = (body.error && body.error.errors && body.error.errors[0] && body.error.errors[0].reason) || "";
    message = (body.error && body.error.message) || "";
  } catch {
    /* bukan JSON */
  }
  return new DriveError(`Drive API ${response.status}${reason ? ` (${reason})` : ""}: ${message}`.trim(), {
    status: response.status,
    reason,
  });
};

// Factory supaya mudah diuji: fetch dan penyedia token bisa diganti.
const createGoogleDriveService = ({ config, fetchImpl, getAccessToken } = {}) => {
  const cfg = config || {};
  const doFetch = (...args) => (fetchImpl || globalThis.fetch)(...args);

  const isConfigured = () => Boolean(cfg.enabled && cfg.rootFolderId);

  let authClient = null;
  const defaultGetAccessToken = async () => {
    if (!authClient) {
      const credentials = cfg.keyFile
        ? JSON.parse(fs.readFileSync(cfg.keyFile, "utf8"))
        : { client_email: cfg.clientEmail, private_key: cfg.privateKey };
      authClient = new GoogleAuth({ credentials, scopes: [SCOPE] });
    }
    const token = await authClient.getAccessToken();
    if (!token) throw new DriveError("Gagal mendapatkan access token Google");
    return token;
  };
  const tokenProvider = getAccessToken || defaultGetAccessToken;

  // Satu request dengan timeout (hanya sampai header diterima, sehingga unduhan besar yang
  // lambat tidak terpotong). retryable=true untuk operasi idempoten (GET, trash, delete).
  const send = async (url, init = {}, { retryable = false, timeoutMs = cfg.requestTimeoutMs || REQUEST_TIMEOUT_MS } = {}) => {
    if (!isConfigured()) throw notConfigured();
    const attempts = retryable ? MAX_ATTEMPTS : 1;
    const callerSignal = init.signal;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error("Timeout menghubungi Google Drive")), timeoutMs);
      const onCallerAbort = () => controller.abort(callerSignal.reason);
      if (callerSignal) {
        if (callerSignal.aborted) onCallerAbort();
        else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }
      try {
        const token = await tokenProvider();
        const response = await doFetch(url, {
          ...init,
          signal: controller.signal,
          headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
        });
        clearTimeout(timer);
        if (response.ok) return response;
        const error = await readError(response);
        const transient = response.status === 429 || response.status >= 500;
        if (!transient) throw error;
        lastError = error;
      } catch (error) {
        clearTimeout(timer);
        // Kesalahan permanen (4xx) atau pembatalan oleh pemanggil tidak diulang
        const permanent = error instanceof DriveError && error.status > 0 && error.status < 500 && error.status !== 429;
        if (permanent || (callerSignal && callerSignal.aborted)) throw error;
        lastError = error;
      } finally {
        if (callerSignal) callerSignal.removeEventListener("abort", onCallerAbort);
      }
      if (attempt < attempts) await sleep((cfg.retryBaseMs ?? RETRY_BASE_MS) * 2 ** (attempt - 1));
    }
    throw lastError;
  };

  const json = async (url, init, opts) => (await send(url, init, opts)).json();

  // ---------- operasi ----------
  const getFileMetadata = (fileId) =>
    json(
      `${API_BASE}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=${FILE_FIELDS},trashed,capabilities`,
      {},
      { retryable: true }
    );

  // Unggah resumable satu potong: (1) buka sesi dengan metadata, (2) kirim seluruh isi.
  // TIDAK diulang otomatis: mengulang bisa membuat file ganda. Jika hasilnya ambigu, file
  // yang terlanjur dibuat ditangkap oleh rekonsiliasi (appProperties).
  const uploadFile = async ({ name, mimeType, buffer, parentId, appProperties = {} }) => {
    const metadata = {
      name,
      mimeType,
      parents: [parentId],
      appProperties: { [APP_MARKER.key]: APP_MARKER.value, ...appProperties },
    };
    const init = await send(
      `${UPLOAD_BASE}/files?uploadType=resumable&supportsAllDrives=true&fields=${FILE_FIELDS}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(buffer.length),
        },
        body: JSON.stringify(metadata),
      }
    );
    const sessionUrl = init.headers.get("location");
    if (!sessionUrl) throw new DriveError("Drive tidak mengembalikan URL sesi unggah");

    const response = await send(
      sessionUrl,
      {
        method: "PUT",
        headers: { "Content-Type": mimeType, "Content-Length": String(buffer.length) },
        body: buffer,
      },
      { timeoutMs: UPLOAD_TIMEOUT_MS }
    );
    return response.json();
  };

  // Mengembalikan Response mentah (body = stream). Range diteruskan ke Drive.
  const downloadFile = (fileId, { range, signal } = {}) =>
    send(
      `${API_BASE}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      {
        // identity: isi file diteruskan apa adanya, sehingga Content-Length/Range tetap akurat
        headers: { "Accept-Encoding": "identity", ...(range ? { Range: range } : {}) },
        signal,
      },
      { retryable: true, timeoutMs: UPLOAD_TIMEOUT_MS }
    );

  // mode "trash": dipindah ke tempat sampah Shared Drive (bisa dipulihkan ~30 hari).
  // mode "delete": hapus permanen. File yang sudah tidak ada (404) dianggap sukses.
  const removeFile = async (fileId, mode = cfg.deleteMode || "trash") => {
    try {
      if (mode === "delete") {
        await send(
          `${API_BASE}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
          { method: "DELETE" },
          { retryable: true }
        );
      } else {
        await send(
          `${API_BASE}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trashed: true }),
          },
          { retryable: true }
        );
      }
    } catch (error) {
      if (error instanceof DriveError && error.status === 404) return;
      throw error;
    }
  };

  const listFiles = async ({ q, pageToken, pageSize = 100, fields = FILE_FIELDS }) => {
    const params = new URLSearchParams({
      q,
      pageSize: String(pageSize),
      fields: `nextPageToken,files(${fields})`,
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      corpora: "allDrives",
      orderBy: "createdTime",
    });
    if (pageToken) params.set("pageToken", pageToken);
    return json(`${API_BASE}/files?${params}`, {}, { retryable: true });
  };

  // Cari folder anak dengan nama tertentu; buat jika belum ada. Hasil di-cache per proses.
  const folderCache = new Map();
  const ensureFolder = (name, parentId = cfg.rootFolderId) => {
    const key = `${parentId}/${name}`;
    if (!folderCache.has(key)) {
      const promise = (async () => {
        const found = await listFiles({
          q:
            `name = '${escapeQuery(name)}' and '${escapeQuery(parentId)}' in parents ` +
            `and mimeType = '${FOLDER_MIME}' and trashed = false`,
          pageSize: 1,
          fields: "id,name",
        });
        if (found.files && found.files[0]) return found.files[0].id;
        const created = await json(`${API_BASE}/files?supportsAllDrives=true&fields=id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
        });
        return created.id;
      })().catch((error) => {
        folderCache.delete(key); // jangan menyimpan kegagalan
        throw error;
      });
      folderCache.set(key, promise);
    }
    return folderCache.get(key);
  };

  // File milik aplikasi (bertanda appProperties), untuk rekonsiliasi.
  const listAppFiles = (pageToken) =>
    listFiles({
      q: `appProperties has { key='${APP_MARKER.key}' and value='${APP_MARKER.value}' } and trashed = false and mimeType != '${FOLDER_MIME}'`,
      pageToken,
    });

  return {
    isConfigured,
    getFileMetadata,
    uploadFile,
    downloadFile,
    removeFile,
    listFiles,
    listAppFiles,
    ensureFolder,
    APP_MARKER,
  };
};

// Singleton bawaan, dibuat malas agar env.js tidak dimuat hanya karena modul ini di-require.
let instance = null;
const defaultInstance = () => {
  if (!instance) {
    const env = require("../config/env");
    instance = createGoogleDriveService({ config: env.googleDrive });
  }
  return instance;
};
const lazy = (name) => (...args) => defaultInstance()[name](...args);

module.exports = {
  createGoogleDriveService,
  DriveError,
  FOLDER_MIME,
  APP_MARKER,
  notConfigured,
  isConfigured: lazy("isConfigured"),
  getFileMetadata: lazy("getFileMetadata"),
  uploadFile: lazy("uploadFile"),
  downloadFile: lazy("downloadFile"),
  removeFile: lazy("removeFile"),
  listFiles: lazy("listFiles"),
  listAppFiles: lazy("listAppFiles"),
  ensureFolder: lazy("ensureFolder"),
};
