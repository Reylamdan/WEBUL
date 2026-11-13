const express = require("express");
const handlers = require("../controllers/adminAccreditationController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const uploadAccreditationDocument = require("../middleware/uploadAccreditationDocument");
const { documentUploadLimiter } = require("../middleware/rateLimiters");
const {
  accreditationIdParamsSchema,
  listInstitutionsQuerySchema,
  listStudyProgramsQuerySchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  createStudyProgramSchema,
  updateStudyProgramSchema,
} = require("../validators/accreditationValidator");

const router = express.Router();

// SEMUA endpoint di router ini khusus admin yang sudah login.
// Dipasang di level router (bukan per route) supaya route baru tidak mungkin terlewat.
router.use(requireAdmin);

const mountCrud = (basePath, h, schemas) => {
  router.get(basePath, validate(schemas.list, "query"), h.list);
  router.get(`${basePath}/:id`, validate(accreditationIdParamsSchema, "params"), h.get);
  router.post(basePath, validate(schemas.create), h.create);
  router.patch(
    `${basePath}/:id`,
    validate(accreditationIdParamsSchema, "params"),
    validate(schemas.update),
    h.update
  );

  // Urutan PUT: validasi UUID -> pastikan data ada -> rate limiter -> upload/validasi file
  router.put(
    `${basePath}/:id/document`,
    validate(accreditationIdParamsSchema, "params"),
    h.loadRecord,
    documentUploadLimiter,
    uploadAccreditationDocument,
    h.putDocument
  );
  router.delete(
    `${basePath}/:id/document`,
    validate(accreditationIdParamsSchema, "params"),
    h.loadRecord,
    h.deleteDocument
  );

  router.delete(`${basePath}/:id`, validate(accreditationIdParamsSchema, "params"), h.remove);
};

mountCrud("/institutions", handlers.institution, {
  list: listInstitutionsQuerySchema,
  create: createInstitutionSchema,
  update: updateInstitutionSchema,
});
// Harus didaftarkan SEBELUM mountCrud, agar tidak ditangkap oleh "/study-programs/:id"
router.get("/study-programs/filter-options", handlers.studyProgram.filterOptions);
mountCrud("/study-programs", handlers.studyProgram, {
  list: listStudyProgramsQuerySchema,
  create: createStudyProgramSchema,
  update: updateStudyProgramSchema,
});

module.exports = router;
