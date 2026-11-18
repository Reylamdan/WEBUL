const express = require("express");
const {
  getSettings,
  updateSettings,
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
} = require("../controllers/adminForeignStudentController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  idParamSchema,
  listQuerySchema,
  updateForeignStudentSettingsSchema,
  createRequirementSchema,
  updateRequirementSchema,
} = require("../validators/foreignStudentValidator");

const router = express.Router();

router.use(requireAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", validate(updateForeignStudentSettingsSchema), updateSettings);

// Requirements (Dokumen Persyaratan)
router.get("/requirements", validate(listQuerySchema, "query"), listRequirements);
router.get("/requirements/:id", validate(idParamSchema, "params"), getRequirement);
router.post("/requirements", validate(createRequirementSchema), createRequirement);
router.patch(
  "/requirements/:id",
  validate(idParamSchema, "params"),
  validate(updateRequirementSchema),
  updateRequirement
);
router.delete("/requirements/:id", validate(idParamSchema, "params"), deleteRequirement);

module.exports = router;

