const express = require("express");
const {
  listYears,
  listResponses,
  createResponse,
  updateResponse,
  deleteResponse,
  importResponses,
  deleteYear,
} = require("../controllers/adminTracerStudyController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  responseIdParamsSchema,
  yearParamsSchema,
  deleteYearQuerySchema,
  listResponsesQuerySchema,
  createResponseSchema,
  updateResponseSchema,
  importResponsesSchema,
} = require("../validators/tracerStudyAdminValidator");

const router = express.Router();

// SEMUA endpoint di router ini khusus admin yang sudah login (dipasang di level router).
router.use(requireAdmin);

router.get("/years", listYears);
router.delete(
  "/years/:year",
  validate(yearParamsSchema, "params"),
  validate(deleteYearQuerySchema, "query"),
  deleteYear
);

router.get("/responses", validate(listResponsesQuerySchema, "query"), listResponses);
router.post("/responses", validate(createResponseSchema), createResponse);
router.patch(
  "/responses/:id",
  validate(responseIdParamsSchema, "params"),
  validate(updateResponseSchema),
  updateResponse
);
router.delete("/responses/:id", validate(responseIdParamsSchema, "params"), deleteResponse);

router.post("/import", validate(importResponsesSchema), importResponses);

module.exports = router;
