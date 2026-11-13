const express = require("express");
const handlers = require("../controllers/publicAccreditationController");
const validate = require("../middleware/validate");
const { fileStreamLimiter } = require("../middleware/rateLimiters");
const { publicStudyProgramDocument } = require("../controllers/fileController");
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
// Preview/download dokumen SK prodi yang disimpan di Google Drive (?download=1 untuk unduh).
// Hanya data published; draft dijawab 404. Drive tidak pernah dibuka ke publik: backend yang mengalirkan file.
router.get(
  "/study-programs/:id/document",
  validate(accreditationIdParamsSchema, "params"),
  fileStreamLimiter,
  publicStudyProgramDocument
);

module.exports = router;
