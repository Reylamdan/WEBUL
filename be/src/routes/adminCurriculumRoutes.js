const express = require("express");
const {
  getSettings,
  updateSettings,
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("../controllers/adminCurriculumController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  programIdParamsSchema,
  listProgramsQuerySchema,
  createProgramSchema,
  updateProgramSchema,
  updateCurriculumSettingsSchema,
} = require("../validators/curriculumValidator");

const router = express.Router();

router.use(requireAdmin);

// Pengaturan teks kurikulum & OBE
router.get("/settings", getSettings);
router.put("/settings", validate(updateCurriculumSettingsSchema), updateSettings);

// CRUD Komponen Kurikulum Program Studi
router.get("/programs", validate(listProgramsQuerySchema, "query"), listPrograms);
router.get("/programs/:id", validate(programIdParamsSchema, "params"), getProgram);
router.post("/programs", validate(createProgramSchema), createProgram);
router.patch("/programs/:id", validate(programIdParamsSchema, "params"), validate(updateProgramSchema), updateProgram);
router.delete("/programs/:id", validate(programIdParamsSchema, "params"), deleteProgram);

module.exports = router;

