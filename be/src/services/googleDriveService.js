// Klien Google Drive API v3 (REST) untuk backend.
// Autentikasi menggunakan Google OAuth 2.0 akun Google pribadi.
//
// Access token dikelola oleh googleOAuthService:
// - Refresh token disimpan terenkripsi di Supabase.
// - Access token diperbarui otomatis ketika diperlukan.
// - Jika Drive menjawab 401 (token dicabut lebih awal), token dibuang dan operasi diulang SEKALI
//   dengan token baru.
// - File tetap private dan hanya dapat dibaca melalui backend.

const AppError = require("../utils/AppError");

const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const FILE_FIELDS = "id,name,mimeType,size,md5Checksum,createdTime,appProperties,parents";

const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 250;

const APP_MARKER = { key: "app", value: "lia-be" };

const notConfigured = () =>
  new AppError("Penyimpanan dokumen belum dikonfigurasi", 503, "STORAGE_NOT_CONFIGURED");

class DriveError extends Error {
  constructor(message, { status = 0, reason = "" } = {}) {
    super(message);
    this.name = "DriveError";
    this.status = status;
    this.reason = reason;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeQuery = (value) =>
  String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const readError = async (response) => {
  let reason = "";
  let message = "";

  try {
    const body = await response.json();
    reason =
      (body.error && body.error.errors && body.error.errors[0] &&
        body.error.errors[0].reason) || "";
    message = (body.error && body.error.message) || "";
  } catch {
    // Respons bukan JSON.
  }

  return new DriveError(
    `Drive API ${response.status}${reason ? ` (${reason})` : ""}: ${message}`.trim(),
    { status: response.status, reason }
  );
};

// Factory agar fetch dan penyedia token dapat diganti saat pengujian.
//   getAccessToken        : () => Promise<string>   token OAuth yang masih berlaku
//   invalidateAccessToken : () => Promise<void>     membuang token di memori (dipanggil saat Drive menjawab 401)
//   getAuthScope          : () => Promise<string>   identitas koneksi aktif; dipakai sebagai bagian kunci cache folder
const createGoogleDriveService = ({
  config,
  fetchImpl,
  getAccessToken,
  getAuthScope,
  invalidateAccessToken,
} = {}) => {
  const cfg = config || {};

  const doFetch = (...args) =>
    (fetchImpl || globalThis.fetch)(...args);

  const isConfigured = () =>
    Boolean(cfg.enabled && cfg.rootFolderId && typeof getAccessToken === "function");

  const tokenProvider = getAccessToken;

  // Request dengan timeout dan retry untuk operasi yang aman diulang.
  const send = async (
    url,
    init = {},
    {
      retryable = false,
      timeoutMs = cfg.requestTimeoutMs || REQUEST_TIMEOUT_MS,
    } = {}
  ) => {
    if (!isConfigured()) throw notConfigured();

    const maxAttempts = retryable ? MAX_ATTEMPTS : 1;
    const callerSignal = init.signal;
    let attempt = 0;
    let authRecovered = false;
    let lastError;

    while (attempt < maxAttempts) {
      attempt += 1;

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(new Error("Timeout menghubungi Google Drive")),
        timeoutMs
      );

      const onCallerAbort = () => controller.abort(callerSignal.reason);

      if (callerSignal) {
        if (callerSignal.aborted) onCallerAbort();
        else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }

      try {
        const token = await tokenProvider();

        if (typeof token !== "string" || !token.trim()) {
          throw new DriveError("Access token Google tidak valid");
        }

        const response = await doFetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            ...(init.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });

        clearTimeout(timer);

        if (response.ok) return response;

        const error = await readError(response);

        // 401: token dicabut/kedaluwarsa lebih awal. Request ditolak sebelum diproses, jadi aman diulang
        // SEKALI dengan token baru (tidak memakai jatah retry dan tidak menimbulkan efek ganda).
        if (
          response.status === 401 &&
          !authRecovered &&
          typeof invalidateAccessToken === "function"
        ) {
          authRecovered = true;
          attempt -= 1;
          lastError = error;
          await invalidateAccessToken();
          continue;
        }

        if (response.status === 429 || response.status >= 500) {
          lastError = error;
        } else {
          throw error;
        }
      } catch (error) {
        clearTimeout(timer);

        // Error aplikasi dari penyedia token (reauth, belum terhubung, konfigurasi salah, dsb.)
        // bersifat final dan sudah melalui retry di sisinya: jangan diulang.
        if (error instanceof AppError) throw error;

        const permanent =
          error instanceof DriveError &&
          error.status > 0 &&
          error.status < 500 &&
          error.status !== 429;

        if (permanent || (callerSignal && callerSignal.aborted)) {
          throw error;
        }

        lastError = error;
      } finally {
        if (callerSignal) {
          callerSignal.removeEventListener("abort", onCallerAbort);
        }
      }

      if (attempt < maxAttempts) {
        await sleep((cfg.retryBaseMs ?? RETRY_BASE_MS) * 2 ** (attempt - 1));
      }
    }

    throw lastError;
  };

  const json = async (url, init, opts) =>
    (await send(url, init, opts)).json();

  // ---------- Metadata ----------

  const getFileMetadata = (fileId) =>
    json(
      `${API_BASE}/files/${encodeURIComponent(fileId)}?fields=${FILE_FIELDS},trashed,capabilities`,
      {},
      { retryable: true }
    );

  // ---------- Upload ----------

  const uploadFile = async ({
    name,
    mimeType,
    buffer,
    parentId,
    appProperties = {},
  }) => {
    const metadata = {
      name,
      mimeType,
      parents: [parentId],
      appProperties: {
        [APP_MARKER.key]: APP_MARKER.value,
        ...appProperties,
      },
    };

    const init = await send(
      `${UPLOAD_BASE}/files?uploadType=resumable&fields=${FILE_FIELDS}`,
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

    if (!sessionUrl) {
      throw new DriveError("Drive tidak mengembalikan URL sesi unggah");
    }

    const response = await send(
      sessionUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(buffer.length),
        },
        body: buffer,
      },
      { timeoutMs: UPLOAD_TIMEOUT_MS }
    );

    return response.json();
  };

  // ---------- Download ----------

  const downloadFile = (fileId, { range, signal } = {}) =>
    send(
      `${API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
      {
        headers: {
          "Accept-Encoding": "identity",
          ...(range ? { Range: range } : {}),
        },
        signal,
      },
      {
        retryable: true,
        timeoutMs: UPLOAD_TIMEOUT_MS,
      }
    );

  // ---------- Delete / Trash ----------

  const removeFile = async (fileId, mode = cfg.deleteMode || "trash") => {
    try {
      if (mode === "delete") {
        await send(
          `${API_BASE}/files/${encodeURIComponent(fileId)}`,
          { method: "DELETE" },
          { retryable: true }
        );
      } else {
        await send(
          `${API_BASE}/files/${encodeURIComponent(fileId)}?fields=id`,
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

  // ---------- List Files (My Drive) ----------

  const listFiles = async ({
    q,
    pageToken,
    pageSize = 100,
    fields = FILE_FIELDS,
  }) => {
    const params = new URLSearchParams({
      q,
      pageSize: String(pageSize),
      fields: `nextPageToken,files(${fields})`,
      corpora: "user",
      orderBy: "createdTime",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    return json(`${API_BASE}/files?${params}`, {}, { retryable: true });
  };

  // ---------- Ensure Folder ----------
  // Kunci cache memuat identitas koneksi aktif sehingga folder milik akun lama tidak pernah
  // dipakai setelah akun berganti, bahkan oleh instance yang tidak menerima event perubahan koneksi.

  const folderCache = new Map();

  const resetFolderCache = () => folderCache.clear();

  const currentScope = async () => {
    if (typeof getAuthScope !== "function") return "default";

    try {
      return String(await getAuthScope());
    } catch {
      return "unknown";
    }
  };

  const ensureFolder = async (name, parentId = cfg.rootFolderId) => {
    const key = `${await currentScope()}|${parentId}/${name}`;

    if (!folderCache.has(key)) {
      const promise = (async () => {
        const found = await listFiles({
          q:
            `name = '${escapeQuery(name)}' and '${escapeQuery(parentId)}' in parents ` +
            `and mimeType = '${FOLDER_MIME}' and trashed = false`,
          pageSize: 1,
          fields: "id,name",
        });

        if (found.files && found.files[0]) {
          return found.files[0].id;
        }

        const created = await json(
          `${API_BASE}/files?fields=id`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              mimeType: FOLDER_MIME,
              parents: [parentId],
            }),
          }
        );

        return created.id;
      })().catch((error) => {
        folderCache.delete(key);
        throw error;
      });

      folderCache.set(key, promise);
    }

    return folderCache.get(key);
  };

  // ---------- Rekonsiliasi File Aplikasi ----------

  const listAppFiles = (pageToken) =>
    listFiles({
      q:
        `appProperties has { key='${APP_MARKER.key}' and value='${APP_MARKER.value}' } ` +
        `and trashed = false and mimeType != '${FOLDER_MIME}'`,
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
    resetFolderCache,
    APP_MARKER,
  };
};

// ---------- Singleton OAuth ----------

let instance = null;

const defaultInstance = () => {
  if (!instance) {
    const env = require("../config/env");
    const googleOAuthService = require("./googleOAuthService");

    instance = createGoogleDriveService({
      config: env.googleDrive,
      getAccessToken: googleOAuthService.getAccessToken,
      getAuthScope: googleOAuthService.getAuthScope,
      invalidateAccessToken: googleOAuthService.invalidateAccessToken,
    });

    // Akun berganti / koneksi diputus / koneksi baru: cache folder direset.
    googleOAuthService.onConnectionChange(() => instance.resetFolderCache());
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
  resetFolderCache: lazy("resetFolderCache"),
};