const express = require("express");
const {
  listNews,
  getNews,
  createNews,
  updateNews,
  deleteNews,
} = require("../controllers/adminNewsController");
const {
  loadNewsForCover,
  putCover,
  deleteCover,
} = require("../controllers/adminNewsCoverController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const uploadCoverImage = require("../middleware/uploadCoverImage");
const { coverUploadLimiter } = require("../middleware/rateLimiters");
const {
  newsIdParamsSchema,
  listNewsQuerySchema,
  createNewsSchema,
  updateNewsSchema,
} = require("../validators/newsValidator");

const router = express.Router();

// SEMUA endpoint di router ini khusus admin yang sudah login.
// Dipasang di level router (bukan per route) supaya route baru tidak mungkin terlewat.
router.use(requireAdmin);

router.get("/", validate(listNewsQuerySchema, "query"), listNews);
router.get("/:id", validate(newsIdParamsSchema, "params"), getNews);
router.post("/", validate(createNewsSchema), createNews);
router.patch("/:id", validate(newsIdParamsSchema, "params"), validate(updateNewsSchema), updateNews);

// Cover: autentikasi sudah berjalan di router.use(requireAdmin) di atas.
// Urutan PUT: validasi UUID -> pastikan berita -> rate limiter -> upload/validasi gambar.
router.put(
  "/:id/cover",
  validate(newsIdParamsSchema, "params"),
  loadNewsForCover,
  coverUploadLimiter,
  uploadCoverImage,
  putCover
);
router.delete(
  "/:id/cover",
  validate(newsIdParamsSchema, "params"),
  loadNewsForCover,
  deleteCover
);

router.delete("/:id", validate(newsIdParamsSchema, "params"), deleteNews);

module.exports = router;
