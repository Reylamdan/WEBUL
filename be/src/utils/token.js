const jwt = require("jsonwebtoken");
const env = require("../config/env");

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = "universitas-lia-api";

// Token hanya berisi ID admin (sub) dan role. Tidak ada email atau data pribadi lain.
const signAdminToken = (admin) =>
  jwt.sign({ role: "admin" }, env.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.jwtExpiresIn,
    issuer: JWT_ISSUER,
    subject: admin.id,
  });

// Algoritma dikunci ke HS256 supaya token berjenis lain (misalnya "none") ditolak.
const verifyAdminToken = (token) =>
  jwt.verify(token, env.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
  });

module.exports = { signAdminToken, verifyAdminToken };