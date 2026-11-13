const env = require("./env");
const AppError = require("../utils/AppError");

// Klien Cloudinary dibuat sekali (lazy) dari konfigurasi env. apiSecret hanya dipakai di backend
// dan tidak pernah dicatat ke log maupun dikirim ke frontend.
let client = null;

const isConfigured = () => env.cloudinary.enabled;

const notConfigured = () =>
  new AppError("Penyimpanan media belum dikonfigurasi", 503, "STORAGE_NOT_CONFIGURED");

const getClient = () => {
  if (!isConfigured()) throw notConfigured();
  if (!client) {
    const { v2 } = require("cloudinary");
    v2.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    client = v2;
  }
  return client;
};

module.exports = {
  isConfigured,
  notConfigured,
  getClient,
  cloudName: env.cloudinary.cloudName,
  rootFolder: env.cloudinary.rootFolder,
};
