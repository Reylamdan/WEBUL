const express = require("express");
const handlers = require("../controllers/publicBanptRegulationController");
const validate = require("../middleware/validate");
const { fileStreamLimiter } = require("../middleware/rateLimiters");
const { publicRegulationDocument, publicRegulationAttachment } = require("../controllers/fileController");
const {
  idParamsSchema,
  attachmentParamsSchema,
  publicListQuerySchema,
} = require("../validators/banptRegulationValidator");

const router = express.Router();

// Endpoint publik terbuka untuk semua pengunjung tanpa login. Hanya GET, hanya data published.
router.get("/", validate(publicListQuerySchema, "query"), handlers.list);
router.get("/filter-options", handlers.filterOptions); // sebelum "/:id"
router.get("/:id", validate(idParamsSchema, "params"), handlers.get);
// Preview/download file di Google Drive (?download=1 untuk unduh). Hanya data published; draft dijawab 404.
router.get("/:id/document", validate(idParamsSchema, "params"), fileStreamLimiter, publicRegulationDocument);
router.get(
  "/:id/attachments/:attachmentId",
  validate(attachmentParamsSchema, "params"),
  fileStreamLimiter,
  publicRegulationAttachment
);

module.exports = router;
