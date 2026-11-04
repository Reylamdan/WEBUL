const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { verifyAdminToken } = require("../utils/token");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Autentikasi + otorisasi admin:
// 1. Token Bearer harus ada, valid, dan belum kedaluwarsa.
// 2. Role di token harus "admin".
// 3. Admin harus MASIH ADA dan AKTIF di database (bukan hanya percaya isi token).
// Jika lolos, data admin tersedia di req.admin.
const requireAdmin = async (req, res, next) => {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "");
  if (!match) {
    throw new AppError("Token autentikasi tidak ditemukan", 401, "UNAUTHORIZED");
  }

  let payload;
  try {
    payload = verifyAdminToken(match[1]);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Sesi telah berakhir, silakan login kembali", 401, "TOKEN_EXPIRED");
    }
    throw new AppError("Token tidak valid", 401, "INVALID_TOKEN");
  }

  if (payload.role !== "admin") {
    throw new AppError("Akses ditolak", 403, "FORBIDDEN");
  }

  if (typeof payload.sub !== "string" || !UUID_PATTERN.test(payload.sub)) {
    throw new AppError("Token tidak valid", 401, "INVALID_TOKEN");
  }

  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, name, email, is_active, last_login_at, created_at")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error) throwDbError("requireAdmin: ambil admin", error);

  if (!admin || !admin.is_active) {
    throw new AppError("Akun tidak ditemukan atau tidak aktif", 401, "UNAUTHORIZED");
  }

  // Hanya field yang aman. password_hash tidak pernah diambil di sini.
  req.admin = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    lastLoginAt: admin.last_login_at,
    createdAt: admin.created_at,
  };

  return next();
};

module.exports = requireAdmin;