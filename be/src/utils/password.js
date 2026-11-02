const bcrypt = require("bcrypt");

// Semakin besar semakin lambat (dan semakin sulit ditebak). 12 adalah angka umum yang seimbang.
const BCRYPT_ROUNDS = 12;

// bcrypt hanya memproses 72 byte pertama password, jadi batasnya kita tegakkan sendiri.
const MAX_PASSWORD_BYTES = 72;

const isWithinBcryptLimit = (plain) =>
  Buffer.byteLength(plain, "utf8") <= MAX_PASSWORD_BYTES;

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = {
  BCRYPT_ROUNDS,
  MAX_PASSWORD_BYTES,
  isWithinBcryptLimit,
  hashPassword,
  comparePassword,
};