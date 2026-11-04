const express = require("express");
const handlers = require("../controllers/adminBanptRegulationController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  uploadMainDocument,
  uploadAttachments,
  uploadSingleAttachment,
} = require("../middleware/uploadRegulationFiles");
const { regulationUploadLimiter } = require("../middleware/rateLimiters");
const {
  idParamsSchema,
  attachmentParamsSchema,
  adminListQuerySchema,
  createRegulationSchema,
  updateRegulationSchema,
} = require("../validators/banptRegulationValidator");

const router = express.Router();

// SEMUA endpoint di router ini khusus admin yang sudah login (dipasang di level router).
router.use(requireAdmin);

router.get("/", validate(adminListQuerySchema, "query"), handlers.list);
router.get("/filter-options", handlers.filterOptions); // sebelum "/:id"
router.get("/:id", validate(idParamsSchema, "params"), handlers.get);
router.post("/", validate(createRegulationSchema), handlers.create);
router.patch("/:id", validate(idParamsSchema, "params"), validate(updateRegulationSchema), handlers.update);
router.delete("/:id", validate(idParamsSchema, "params"), handlers.remove);

// Urutan upload: validasi UUID -> pastikan data ada -> rate limiter -> multer -> validasi isi PDF
router.put(
  "/:id/document",
  validate(idParamsSchema, "params"),
  handlers.loadRecord,
  regulationUploadLimiter,
  uploadMainDocument,
  handlers.putDocument
);
router.post(
  "/:id/attachments",
  validate(idParamsSchema, "params"),
  handlers.loadRecord,
  regulationUploadLimiter,
  uploadAttachments,
  handlers.addAttachments
);
router.put(
  "/:id/attachments/:attachmentId",
  validate(attachmentParamsSchema, "params"),
  handlers.loadRecord,
  regulationUploadLimiter,
  uploadSingleAttachment,
  handlers.replaceAttachment
);
router.delete("/:id/attachments/:attachmentId", validate(attachmentParamsSchema, "params"), handlers.removeAttachment);

module.exports = router;
