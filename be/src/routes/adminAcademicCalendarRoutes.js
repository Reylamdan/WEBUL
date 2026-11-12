const express = require("express");
const {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/adminAcademicCalendarController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  eventIdParamsSchema,
  listEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
} = require("../validators/academicCalendarValidator");

const router = express.Router();

// Semua endpoint admin kalender akademik wajib login
router.use(requireAdmin);

router.get("/", validate(listEventsQuerySchema, "query"), listEvents);
router.get("/:id", validate(eventIdParamsSchema, "params"), getEvent);
router.post("/", validate(createEventSchema), createEvent);
router.patch("/:id", validate(eventIdParamsSchema, "params"), validate(updateEventSchema), updateEvent);
router.delete("/:id", validate(eventIdParamsSchema, "params"), deleteEvent);

module.exports = router;
