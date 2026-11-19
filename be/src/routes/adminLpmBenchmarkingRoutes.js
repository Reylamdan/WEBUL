const express = require("express");
const handlers = require("../controllers/adminLpmBenchmarkingController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const { uploadDocument } = require("../middleware/uploadLpmArchive");
const { regulationUploadLimiter } = require("../middleware/rateLimiters");
const {
  idParamsSchema,
  adminListQuerySchema,
  createBenchmarkingSchema,
  updateBenchmarkingSchema,
} = require("../validators/lpmBenchmarkingValidator");

const router = express.Router();

// Semua endpoint khusus admin yang sudah login.
router.use(requireAdmin);

router.get("/", validate(adminListQuerySchema, "query"), handlers.list);

// Harus sebelum "/:id".
router.get("/filter-options", handlers.filterOptions);

router.get("/:id", validate(idParamsSchema, "params"), handlers.get);

router.post("/", validate(createBenchmarkingSchema), handlers.create);

router.patch(
  "/:id",
  validate(idParamsSchema, "params"),
  validate(updateBenchmarkingSchema),
  handlers.update
);

router.delete("/:id", validate(idParamsSchema, "params"), handlers.remove);

// Upload/ganti dokumen ke Google Drive:
// validasi UUID -> pastikan data ada -> rate limiter -> multer -> validasi isi dokumen.
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
