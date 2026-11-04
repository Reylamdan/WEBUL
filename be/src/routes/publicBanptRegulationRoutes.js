const express = require("express");
const handlers = require("../controllers/publicBanptRegulationController");
const validate = require("../middleware/validate");
const { idParamsSchema, publicListQuerySchema } = require("../validators/banptRegulationValidator");

const router = express.Router();

// Endpoint publik terbuka untuk semua pengunjung tanpa login. Hanya GET, hanya data published.
router.get("/", validate(publicListQuerySchema, "query"), handlers.list);
router.get("/filter-options", handlers.filterOptions); // sebelum "/:id"
router.get("/:id", validate(idParamsSchema, "params"), handlers.get);

module.exports = router;
