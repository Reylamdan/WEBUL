const express = require("express");
const handlers = require("../controllers/adminLpmRtmRtlReportController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const { uploadDocument } = require("../middleware/uploadLpmArchive");
const { regulationUploadLimiter } = require("../middleware/rateLimiters");
const {
  idParamsSchema,
  adminListQuerySchema,
  createReportSchema,
  updateReportSchema,
} = require("../validators/lpmRtmRtlReportValidator");

const router = express.Router();

// Semua endpoint khusus admin yang sudah login.
router.use(requireAdmin);

router.get("/", validate(adminListQuerySchema, "query"), handlers.list);
router.get("/:id", validate(idParamsSchema, "params"), handlers.get);
router.post("/", validate(createReportSchema), handlers.create);

router.patch(
  "/:id",
  validate(idParamsSchema, "params"),
  validate(updateReportSchema),
  handlers.update
);

router.delete("/:id", validate(idParamsSchema, "params"), handlers.remove);

// Upload/ganti dokumen ke Google Drive:
// validasi UUID -> pastikan laporan ada -> rate limiter -> multer -> validasi isi dokumen.
router.put(
  "/:id/document",
  validate(idParamsSchema, "params"),
  handlers.loadRecord,
  regulationUploadLimiter,
  uploadDocument,
  handlers.putDocument
);

router.delete(
  "/:id/document",
  validate(idParamsSchema, "params"),
  handlers.removeDocument
);

module.exports = router;
