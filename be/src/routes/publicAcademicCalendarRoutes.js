const express = require("express");
const {
  listPublicCategories,
  listPublicEvents,
  getPublicEvent,
} = require("../controllers/publicAcademicCalendarController");
const validate = require("../middleware/validate");
const { eventIdParamsSchema, publicListEventsQuerySchema } = require("../validators/academicCalendarValidator");

const router = express.Router();

// Endpoint publik: hanya GET, tanpa login, hanya agenda published.
// "/categories" harus didaftarkan SEBELUM "/:id".
router.get("/categories", listPublicCategories);
router.get("/", validate(publicListEventsQuerySchema, "query"), listPublicEvents);
router.get("/:id", validate(eventIdParamsSchema, "params"), getPublicEvent);

module.exports = router;
