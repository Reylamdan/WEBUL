// Validasi URL redirect OAuth ke frontend. Fungsi murni (tanpa env) agar mudah diuji.
//
// Aturan anti open-redirect:
//   - Tujuan redirect TIDAK PERNAH berasal dari request (query/body/header). Satu-satunya sumber adalah
//     GOOGLE_OAUTH_FRONTEND_REDIRECT di .env, divalidasi saat server start dengan fungsi ini.
//   - Harus URL absolut http(s), tanpa userinfo (user:pass@) dan tanpa fragment.
//   - Origin-nya harus SAMA PERSIS dengan salah satu origin di FRONTEND_URL (frontend yang dipercaya).
//   - Di production wajib https.
//   - Parameter hasil (status/alasan) ditambahkan oleh server dengan nama tetap dan nilai dari daftar tertutup.
const validateFrontendRedirect = (raw, { allowedOrigins = [], isProduction = false } = {}) => {
  const value = String(raw || "").trim();
  if (!value) return { ok: false, reason: "kosong" };
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return { ok: false, reason: "mengandung karakter terlarang" };

  let url;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "bukan URL absolut yang valid" };
  }
  if (!["http:", "https:"].includes(url.protocol)) return { ok: false, reason: "protokol harus http atau https" };
  if (isProduction && url.protocol !== "https:") return { ok: false, reason: "wajib https di production" };
  if (url.username || url.password) return { ok: false, reason: "tidak boleh memuat user:password" };
  if (url.hash) return { ok: false, reason: "tidak boleh memuat fragment (#)" };
  if (!allowedOrigins.includes(url.origin)) return { ok: false, reason: "origin tidak ada di FRONTEND_URL" };

  return { ok: true, url: url.toString() };
};

// Menambahkan hasil OAuth ke URL frontend yang SUDAH tervalidasi. Hanya dua nama parameter tetap.
const buildFrontendResultUrl = (validatedUrl, { status, reason } = {}) => {
  const url = new URL(validatedUrl);
  url.searchParams.set("google_drive", status === "connected" ? "connected" : "error");
  if (status !== "connected" && reason) url.searchParams.set("reason", String(reason).replace(/[^A-Z_]/g, "").slice(0, 40));
  return url.toString();
};

module.exports = { validateFrontendRedirect, buildFrontendResultUrl };
