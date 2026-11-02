const AppError = require("./AppError");

// Dipakai saat query Supabase mengembalikan error.
// Detail dicatat di log server, sedangkan klien hanya menerima pesan umum.
const throwDbError = (context, error) => {
  console.error(
    `[DB] ${context}: ${(error && error.message) || error} (kode: ${(error && error.code) || "-"})`
  );
  throw new AppError("Terjadi kesalahan pada database", 500, "DATABASE_ERROR");
};

module.exports = { throwDbError };