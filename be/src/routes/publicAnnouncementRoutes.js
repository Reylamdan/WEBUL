const express = require("express");
const {
  listAnnouncementCategories,
  listPublicAnnouncements,
  getPublicAnnouncement,
} = require("../controllers/publicAnnouncementController");
const validate = require("../middleware/validate");
const withTranslation = require("../middleware/withTranslation");
const {
  announcementSlugParamsSchema,
  publicListAnnouncementsQuerySchema,
} = require("../validators/announcementValidator");

const router = express.Router();

// Endpoint publik terbuka untuk semua pengunjung tanpa login
// "/categories" harus sebelum "/:slug"
router.get("/categories", listAnnouncementCategories);
router.get("/", withTranslation("announcement"), validate(publicListAnnouncementsQuerySchema, "query"), listPublicAnnouncements);
router.get("/:slug", withTranslation("announcement"), validate(announcementSlugParamsSchema, "params"), getPublicAnnouncement);

module.exports = router;
