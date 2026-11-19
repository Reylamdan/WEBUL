const express = require("express");
const handlers = require("../controllers/publicLpmRtmRtlReportController");
const fileController = require("../controllers/fileController");
const validate = require("../middleware/validate");
const { fileStreamLimiter } = require("../middleware/rateLimiters");
const {
  idParamsSchema,
  yearParamsSchema,
  publicListQuerySchema,
} = require("../validators/lpmRtmRtlReportValidator");

const router = express.Router();

router.get("/", validate(publicListQuerySchema, "query"), handlers.list);

// Harus sebelum "/:id". Dipakai halaman detail FE (slug berisi tahun).
router.get("/by-year/:year", validate(yearParamsSchema, "params"), handlers.getByYear);

router.get("/:id", validate(idParamsSchema, "params"), handlers.get);

// Preview / download dokumen laporan yang sudah dipublikasikan.
router.get(
  "/:id/document",
  validate(idParamsSchema, "params"),
  fileStreamLimiter,
  fileController.publicLpmRtmRtlReportDocument
);

module.exports = router;
