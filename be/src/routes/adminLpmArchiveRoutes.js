
const express = require("express");
const handlers = require("../controllers/adminLpmArchiveController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const { uploadDocument } = require("../middleware/uploadLpmArchive");
const { regulationUploadLimiter } = require("../middleware/rateLimiters");

const {
  idParamsSchema,
  adminListQuerySchema,
  createArchiveSchema,
  updateArchiveSchema,
} = require("../validators/lpmArchiveValidator");

const router = express.Router();

// Semua endpoint khusus admin yang sudah login.
router.use(requireAdmin);

router.get(
  "/",
  validate(adminListQuerySchema, "query"),
  handlers.list
);

// Harus sebelum route "/:id".
router.get(
  "/filter-options",
  handlers.filterOptions
);

router.get(
  "/:id",
  validate(idParamsSchema, "params"),
  handlers.get
);

router.post(
  "/",
  validate(createArchiveSchema),
  handlers.create
);

router.patch(
  "/:id",
  validate(idParamsSchema, "params"),
  validate(updateArchiveSchema),
  handlers.update
);

router.delete(
  "/:id",
  validate(idParamsSchema, "params"),
  handlers.remove
);

// Urutan upload:
// validasi UUID -> pastikan arsip ada -> rate limiter -> multer -> validasi isi dokumen.
router.put(
  "/:id/document",
  validate(idParamsSchema, "params"),
  handlers.loadRecord,
  regulationUploadLimiter,
  uploadDocument,
  handlers.putDocument
);

module.exports = router;
