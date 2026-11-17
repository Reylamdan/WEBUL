const express = require("express");
const {
  getSettings,
  updateSettings,
  listSteps,
  getStep,
  createStep,
  updateStep,
  deleteStep,
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listFees,
  createFee,
  updateFee,
  deleteFee,
} = require("../controllers/adminRplController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  idParamSchema,
  listQuerySchema,
  updateRplSettingsSchema,
  createStepSchema,
  updateStepSchema,
  createRequirementSchema,
  updateRequirementSchema,
  createScheduleSchema,
  updateScheduleSchema,
  createFeeSchema,
  updateFeeSchema,
} = require("../validators/rplValidator");

const router = express.Router();

router.use(requireAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", validate(updateRplSettingsSchema), updateSettings);

// Steps (Alur Pendaftaran)
router.get("/steps", validate(listQuerySchema, "query"), listSteps);
router.get("/steps/:id", validate(idParamSchema, "params"), getStep);
router.post("/steps", validate(createStepSchema), createStep);
router.patch("/steps/:id", validate(idParamSchema, "params"), validate(updateStepSchema), updateStep);
router.delete("/steps/:id", validate(idParamSchema, "params"), deleteStep);

// Requirements & Documents
router.get("/requirements", validate(listQuerySchema, "query"), listRequirements);
router.get("/requirements/:id", validate(idParamSchema, "params"), getRequirement);
router.post("/requirements", validate(createRequirementSchema), createRequirement);
router.patch("/requirements/:id", validate(idParamSchema, "params"), validate(updateRequirementSchema), updateRequirement);
router.delete("/requirements/:id", validate(idParamSchema, "params"), deleteRequirement);

// Schedules
router.get("/schedules", listSchedules);
router.post("/schedules", validate(createScheduleSchema), createSchedule);
router.patch("/schedules/:id", validate(idParamSchema, "params"), validate(updateScheduleSchema), updateSchedule);
router.delete("/schedules/:id", validate(idParamSchema, "params"), deleteSchedule);

// Fees
router.get("/fees", listFees);
router.post("/fees", validate(createFeeSchema), createFee);
router.patch("/fees/:id", validate(idParamSchema, "params"), validate(updateFeeSchema), updateFee);
router.delete("/fees/:id", validate(idParamSchema, "params"), deleteFee);

module.exports = router;

