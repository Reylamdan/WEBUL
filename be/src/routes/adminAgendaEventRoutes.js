const express = require("express");
const {
  listCategories,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/adminAgendaEventController");
const { loadEventForImage, putImage, deleteImage } = require("../controllers/adminAgendaEventImageController");
const uploadCoverImage = require("../middleware/uploadCoverImage");
const { coverUploadLimiter } = require("../middleware/rateLimiters");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  eventIdParamsSchema,
  listEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
} = require("../validators/agendaEventValidator");

const router = express.Router();

// Semua endpoint admin agenda acara wajib login
router.use(requireAdmin);

// "/categories" harus didaftarkan SEBELUM "/:id".
router.get("/categories", listCategories);
router.get("/", validate(listEventsQuerySchema, "query"), listEvents);
router.get("/:id", validate(eventIdParamsSchema, "params"), getEvent);
router.post("/", validate(createEventSchema), createEvent);
router.patch("/:id", validate(eventIdParamsSchema, "params"), validate(updateEventSchema), updateEvent);
router.delete("/:id", validate(eventIdParamsSchema, "params"), deleteEvent);

// Gambar acara (opsional). Field multipart bernama "cover", sama seperti cover berita.
router.put(
  "/:id/image",
  validate(eventIdParamsSchema, "params"),
  loadEventForImage,
  coverUploadLimiter,
  uploadCoverImage,
  putImage
);
router.delete("/:id/image", validate(eventIdParamsSchema, "params"), loadEventForImage, deleteImage);

module.exports = router;