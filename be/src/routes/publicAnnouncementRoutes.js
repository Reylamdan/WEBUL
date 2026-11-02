const express = require("express");
const {
  listPublicAnnouncements,
  getPublicAnnouncement,
} = require("../controllers/publicAnnouncementController");
const validate = require("../middleware/validate");
const {
  announcementSlugParamsSchema,
  publicListAnnouncementsQuerySchema,
} = require("../validators/announcementValidator");

const router = express.Router();

// Endpoint publik terbuka untuk semua pengunjung tanpa login
router.get("/", validate(publicListAnnouncementsQuerySchema, "query"), listPublicAnnouncements);
router.get("/:slug", validate(announcementSlugParamsSchema, "params"), getPublicAnnouncement);

module.exports = router;
