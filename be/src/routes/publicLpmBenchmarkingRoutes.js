const express = require("express");
const handlers = require("../controllers/publicLpmBenchmarkingController");
const fileController = require("../controllers/fileController");
const validate = require("../middleware/validate");
const { fileStreamLimiter } = require("../middleware/rateLimiters");
const {
  idParamsSchema,
  publicListQuerySchema,
} = require("../validators/lpmBenchmarkingValidator");

const router = express.Router();

router.get("/", validate(publicListQuerySchema, "query"), handlers.list);

// Harus sebelum "/:id".
router.get("/filter-options", handlers.filterOptions);

router.get("/:id", validate(idParamsSchema, "params"), handlers.get);

// Preview / download dokumen benchmarking yang sudah dipublikasikan.
router.get(
  "/:id/document",
  validate(idParamsSchema, "params"),
  fileStreamLimiter,
  fileController.publicLpmBenchmarkingDocument
);

module.exports = router;
