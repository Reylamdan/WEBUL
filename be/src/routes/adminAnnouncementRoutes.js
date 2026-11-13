const express = require("express");
const {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/adminAnnouncementController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  announcementIdParamsSchema,
  listAnnouncementsQuerySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} = require("../validators/announcementValidator");

const router = express.Router();

// Semua endpoint admin announcements wajib login
router.use(requireAdmin);

router.get("/", validate(listAnnouncementsQuerySchema, "query"), listAnnouncements);
router.get("/:id", validate(announcementIdParamsSchema, "params"), getAnnouncement);
router.post("/", validate(createAnnouncementSchema), createAnnouncement);
router.patch(
  "/:id",
  validate(announcementIdParamsSchema, "params"),
  validate(updateAnnouncementSchema),
  updateAnnouncement
);
router.delete("/:id", validate(announcementIdParamsSchema, "params"), deleteAnnouncement);

module.exports = router;
