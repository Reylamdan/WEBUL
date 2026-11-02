const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { hashPassword, comparePassword } = require("../utils/password");
const { signAdminToken } = require("../utils/token");

// Hash palsu untuk menyamakan waktu respons ketika email tidak terdaftar,
// supaya penyerang tidak bisa menebak email mana yang valid dari kecepatan respons.
const dummyHashPromise = hashPassword(crypto.randomBytes(16).toString("hex"));

// POST /api/auth/login  (body sudah divalidasi dan dinormalisasi oleh middleware validate)
const login = async (req, res) => {
  const { email, password } = req.body;

  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, name, email, password_hash, is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) throwDbError("login: ambil admin", error);

  // Selalu jalankan perbandingan bcrypt, bahkan jika email tidak ditemukan
  const hashToCompare = admin ? admin.password_hash : await dummyHashPromise;
  const passwordMatches = await comparePassword(password, hashToCompare);

  // Pesan sengaja sama untuk email salah, password salah, dan akun nonaktif
  if (!admin || !passwordMatches || !admin.is_active) {
    throw new AppError("Email atau password salah", 401, "INVALID_CREDENTIALS");
  }

  // Mencatat waktu login terakhir. Jika gagal, login tetap berhasil.
  const { error: updateError } = await supabase
    .from("admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  if (updateError) {
    console.error(`[DB] login: gagal memperbarui last_login_at: ${updateError.message}`);
  }

  const token = signAdminToken(admin);
  const { exp } = jwt.decode(token);

  return res.json({
    success: true,
    message: "Login berhasil",
    data: {
      token,
      tokenType: "Bearer",
      expiresAt: new Date(exp * 1000).toISOString(),
      admin: { id: admin.id, name: admin.name, email: admin.email },
    },
  });
};

// GET /api/auth/me  (req.admin diisi oleh middleware requireAdmin)
const me = async (req, res) => {
  return res.json({
    success: true,
    data: { admin: req.admin },
  });
};

module.exports = { login, me };