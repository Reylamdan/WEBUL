const express = require("express");
const handlers = require("../controllers/adminLpmActivityController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  idParamsSchema,
  adminListQuerySchema,
  createActivitySchema,
  updateActivitySchema,
} = require("../validators/lpmActivityValidator");

const router = express.Router();

// Semua endpoint khusus admin yang sudah login.
router.use(requireAdmin);

router.get("/", validate(adminListQuerySchema, "query"), handlers.list);
router.get("/:id", validate(idParamsSchema, "params"), handlers.get);
router.post("/", validate(createActivitySchema), handlers.create);
router.patch(
  "/:id",
  validate(idParamsSchema, "params"),
  validate(updateActivitySchema),
  handlers.update
);
router.delete("/:id", validate(idParamsSchema, "params"), handlers.remove);

module.exports = router;
