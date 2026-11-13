// Endpoint OAuth Google Drive.
//
//   GET  /api/admin/google-drive/status      (admin)  status koneksi; tidak pernah memuat token
//   POST /api/admin/google-drive/connect     (admin)  mengembalikan authUrl Google (frontend mengarahkan browser ke sana)
//   GET  /api/admin/google-drive/callback    (publik; dipanggil Google lewat browser; keamanan = state sekali pakai)
//   POST /api/admin/google-drive/disconnect  (admin)  mencabut token + menghapus kredensial OAuth
//
// Semua admin AKTIF boleh connect/disconnect (tidak ada role baru). Controller ini tidak pernah menerima URL
// redirect dari request: tujuan redirect hanya GOOGLE_OAUTH_FRONTEND_REDIRECT dari .env (sudah divalidasi).
const env = require("../config/env");
const AppError = require("../utils/AppError");
const oauth = require("../services/googleOAuthService");
const { buildFrontendResultUrl } = require("../utils/safeRedirect");

const FAILURE_STATUS = Object.freeze({
  ACCESS_DENIED: 400,
  STATE_INVALID: 400,
  STATE_EXPIRED: 400,
  ADMIN_INACTIVE: 403,
  CODE_INVALID: 400,
  CLIENT_INVALID: 502,
  NO_REFRESH_TOKEN: 400,
  SCOPE_MISSING: 400,
  DRIVE_ACCESS_DENIED: 400,
  ROOT_FOLDER_INACCESSIBLE: 400,
  ROOT_FOLDER_INVALID: 400,
  ROOT_FOLDER_READONLY: 400,
  GOOGLE_UNAVAILABLE: 502,
  INTERNAL: 500,
});

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

const resultPage = ({ ok, title, message, detail }) => `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:12vh auto;padding:0 1.25rem;color:#1f2937}
h1{font-size:1.25rem;color:${ok ? "#166534" : "#991b1b"}}p{line-height:1.55}small{color:#6b7280}</style></head>
<body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${detail ? `<p><small>${escapeHtml(detail)}</small></p>` : ""}
<p><small>Anda dapat menutup halaman ini dan kembali ke panel admin.</small></p></body></html>`;

const sendPage = (res, status, page) => {
  res.status(status);
  res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Type": "text/html; charset=utf-8" });
  return res.send(page);
};

// GET /api/admin/google-drive/status
const getStatus = async (req, res) => {
  const mode = env.googleDrive.authMode;
  if (mode === "oauth") {
    const status = await oauth.getStatus();
    return res.json({ success: true, data: status });
  }
  return res.json({
    success: true,
    data: {
      authMode: mode,
      configured: env.googleDrive.enabled,
      connection: { status: mode === "service_account" && env.googleDrive.enabled ? "service_account" : "not_configured" },
    },
  });
};

// POST /api/admin/google-drive/connect
const connect = async (req, res) => {
  if (!oauth.isEnabled()) {
    throw new AppError("Mode OAuth Google Drive tidak aktif pada konfigurasi server", 409, "OAUTH_NOT_ENABLED");
  }
  const { authUrl, expiresInSeconds } = await oauth.startConnect({ adminId: req.admin.id });
  // Browser tidak bisa mengirim header Authorization pada navigasi, jadi frontend memanggil endpoint ini
  // (dengan token admin) lalu mengarahkan window.location ke authUrl.
  res.set("Cache-Control", "no-store");
  return res.json({ success: true, data: { authUrl, expiresInSeconds } });
};

// GET /api/admin/google-drive/callback  (tujuan redirect Google)
const callback = async (req, res) => {
  if (!oauth.isEnabled()) {
    return sendPage(res, 404, resultPage({ ok: false, title: "Tidak tersedia", message: "Mode OAuth Google Drive tidak aktif." }));
  }
  const { code, state, error } = req.query;
  const asString = (value) => (typeof value === "string" ? value : undefined); // tolak array/objek dari query

  let outcome;
  try {
    const result = await oauth.handleCallback({ code: asString(code), state: asString(state), error: asString(error) });
    outcome = { ok: true, result };
  } catch (err) {
    if (err instanceof oauth.OAuthFlowError) {
      outcome = { ok: false, code: err.code, message: err.message };
    } else {
      console.error("[OAUTH] callback: kesalahan tak terduga", err && err.name);
      outcome = { ok: false, code: "INTERNAL", message: oauth.FLOW_MESSAGES.INTERNAL };
    }
  }

  // Redirect ke frontend hanya jika GOOGLE_OAUTH_FRONTEND_REDIRECT diisi (tervalidasi saat start).
  if (env.googleOAuth.frontendRedirect) {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    return res.redirect(
      302,
      buildFrontendResultUrl(env.googleOAuth.frontendRedirect, { status: outcome.ok ? "connected" : "error", reason: outcome.code })
    );
  }

  if (outcome.ok) {
    const { account, accountChanged } = outcome.result;
    return sendPage(
      res,
      200,
      resultPage({
        ok: true,
        title: "Google Drive berhasil terhubung",
        message: account.email ? `Akun yang terhubung: ${account.email}.` : "Akun Google berhasil terhubung.",
        detail: accountChanged
          ? "Akun berbeda dari sebelumnya. File yang dibuat dengan akun lama tidak dipindahkan dan tidak dihapus."
          : undefined,
      })
    );
  }
  return sendPage(
    res,
    FAILURE_STATUS[outcome.code] || 400,
    resultPage({ ok: false, title: "Google Drive gagal terhubung", message: outcome.message, detail: `Kode: ${outcome.code}` })
  );
};

// POST /api/admin/google-drive/disconnect
const disconnect = async (req, res) => {
  if (!oauth.isEnabled()) {
    throw new AppError("Mode OAuth Google Drive tidak aktif pada konfigurasi server", 409, "OAUTH_NOT_ENABLED");
  }
  const result = await oauth.disconnect({ adminId: req.admin.id });
  return res.json({
    success: true,
    message: result.alreadyDisconnected ? "Google Drive sudah terputus" : "Google Drive diputus",
    data: {
      revokedAtGoogle: result.revoked,
      // Jika pencabutan di Google gagal, kredensial lokal TETAP dihapus; akses bisa dicabut manual di akun Google.
      note: result.alreadyDisconnected || result.revoked ? undefined : "Token belum bisa dicabut di Google. Cabut manual di myaccount.google.com/permissions.",
    },
  });
};

module.exports = { getStatus, connect, callback, disconnect, escapeHtml };
