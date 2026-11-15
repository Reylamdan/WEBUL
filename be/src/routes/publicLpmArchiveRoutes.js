
const express = require("express");
const handlers = require("../controllers/publicLpmArchiveController");
const fileController = require("../controllers/fileController");
const validate = require("../middleware/validate");
const { fileStreamLimiter } = require("../middleware/rateLimiters");
const { idParamsSchema, publicListQuerySchema } = require("../validators/lpmArchiveValidator");

const router = express.Router();

router.get(
  "/",
  validate(publicListQuerySchema, "query"),
  handlers.list
);

// Harus sebelum "/:id".
router.get(
  "/filter-options",
  handlers.filterOptions
);

router.get(
  "/:id",
  validate(idParamsSchema, "params"),
  handlers.get
);

// Preview / download dokumen arsip yang sudah dipublikasikan.
router.get(
  "/:id/document",
  validate(idParamsSchema, "params"),
  fileStreamLimiter,
  fileController.publicLpmArchiveDocument
);

module.exports = router;
