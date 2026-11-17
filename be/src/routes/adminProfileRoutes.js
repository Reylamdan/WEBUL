const express = require("express");
const {
  getProfileContent,
  updateProfileContent,
  putHeroImage,
  deleteHeroImage,
  putAboutImage,
  deleteAboutImage,
  listCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
} = require("../controllers/adminProfileController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const uploadCoverImage = require("../middleware/uploadCoverImage");
const { coverUploadLimiter } = require("../middleware/rateLimiters");
const {
  cardIdParamsSchema,
  listCardsQuerySchema,
  createCardSchema,
  updateCardSchema,
  updateProfileContentSchema,
} = require("../validators/profileValidator");

const router = express.Router();

// Semua rute admin profil wajib login admin
router.use(requireAdmin);

// Konten halaman profil
router.get("/content", getProfileContent);
router.put("/content", validate(updateProfileContentSchema), updateProfileContent);

// Gambar Hero
router.put("/content/hero-image", coverUploadLimiter, uploadCoverImage, putHeroImage);
router.delete("/content/hero-image", deleteHeroImage);

// Gambar Tentang Kami / Mengenal
router.put("/content/about-image", coverUploadLimiter, uploadCoverImage, putAboutImage);
router.delete("/content/about-image", deleteAboutImage);

// Kartu Jelajahi Profil (CRUD)
router.get("/cards", validate(listCardsQuerySchema, "query"), listCards);
router.get("/cards/:id", validate(cardIdParamsSchema, "params"), getCard);
router.post("/cards", validate(createCardSchema), createCard);
router.patch("/cards/:id", validate(cardIdParamsSchema, "params"), validate(updateCardSchema), updateCard);
router.delete("/cards/:id", validate(cardIdParamsSchema, "params"), deleteCard);

module.exports = router;

