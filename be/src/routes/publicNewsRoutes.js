const express = require("express");
const {
  listLatestNews,
  listPublicNews,
  getPublicNews,
} = require("../controllers/publicNewsController");
const validate = require("../middleware/validate");
const withTranslation = require("../middleware/withTranslation");
const { publicListNewsQuerySchema, newsSlugParamsSchema } = require("../validators/newsValidator");

const router = express.Router();

// Endpoint publik terbuka untuk semua pengunjung tanpa login. Hanya GET, dan hanya berita published.
// URUTAN PENTING: "/latest" harus didaftarkan sebelum "/:slug", kalau tidak "latest" dianggap slug.
router.get("/latest", withTranslation("news"), listLatestNews);
router.get("/", withTranslation("news"), validate(publicListNewsQuerySchema, "query"), listPublicNews);
router.get("/:slug", withTranslation("news"), validate(newsSlugParamsSchema, "params"), getPublicNews);

module.exports = router;
