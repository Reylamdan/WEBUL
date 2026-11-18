const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  idParamSchema,
  listQuerySchema,
  updateRectorReportSettingsSchema,
  createRectorReportSchema,
  updateRectorReportSchema,
} = require("../validators/rectorReportValidator");
const {
  getSettings,
  updateSettings,
  listReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
} = require("../controllers/adminRectorReportController");

const router = express.Router();

router.use(requireAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", validate(updateRectorReportSettingsSchema), updateSettings);

// Reports CRUD
router.get("/", validate(listQuerySchema, "query"), listReports);
router.get("/:id", validate(idParamSchema, "params"), getReport);
router.post("/", validate(createRectorReportSchema), createReport);
router.patch("/:id", validate(idParamSchema, "params"), validate(updateRectorReportSchema), updateReport);
router.delete("/:id", validate(idParamSchema, "params"), deleteReport);

module.exports = router;

