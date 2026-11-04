// Membersihkan kata kunci pencarian sebelum dimasukkan ke filter .or() PostgREST.
// Karakter yang berarti khusus di sana (koma, kurung, kutip, backslash) dan karakter
// wildcard (% _ *) diganti spasi supaya input pengguna tidak bisa menyisipkan filter lain
// atau memaksa pola LIKE yang berat.
const cleanSearchTerm = (term) =>
  String(term ?? "")
    .replace(/[,()"\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Untuk filter kolom tunggal lewat .ilike(kolom, pola) (BUKAN .or()). Nilai dikirim sebagai
// satu parameter, jadi koma/kurung aman; yang perlu dijaga hanya wildcard LIKE:
//   - % dan _ dan \ di-escape dengan backslash (diperlakukan sebagai karakter biasa)
//   - * diganti spasi karena PostgREST mengubah * menjadi % pada pola like/ilike
const escapeLikeTerm = (term) =>
  String(term ?? "")
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\\%_]/g, (ch) => `\\${ch}`);

module.exports = { cleanSearchTerm, escapeLikeTerm };
