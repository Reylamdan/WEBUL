const express = require("express");
const handlers = require("../controllers/publicAccreditationController");
const validate = require("../middleware/validate");
const {
  accreditationIdParamsSchema,
  publicListInstitutionsQuerySchema,
  publicListStudyProgramsQuerySchema,
} = require("../validators/accreditationValidator");

const router = express.Router();

// Endpoint publik terbuka untuk semua pengunjung tanpa login. Hanya GET, hanya data published.
router.get("/institutions", validate(publicListInstitutionsQuerySchema, "query"), handlers.institution.list);
router.get("/institutions/:id", validate(accreditationIdParamsSchema, "params"), handlers.institution.get);
// Harus didaftarkan SEBELUM "/study-programs/:id"
router.get("/study-programs/filter-options", handlers.studyProgram.filterOptions);
router.get("/study-programs", validate(publicListStudyProgramsQuerySchema, "query"), handlers.studyProgram.list);
router.get("/study-programs/:id", validate(accreditationIdParamsSchema, "params"), handlers.studyProgram.get);

module.exports = router;
