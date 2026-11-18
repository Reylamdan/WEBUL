const express = require("express");
const {
  getSettings,
  updateSettings,
  listTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
} = require("../controllers/adminResignationController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  idParamSchema,
  listQuerySchema,
  updateResignationSettingsSchema,
  createTermSchema,
  updateTermSchema,
} = require("../validators/resignationValidator");

const router = express.Router();

router.use(requireAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", validate(updateResignationSettingsSchema), updateSettings);

// Terms (Syarat & Ketentuan)
router.get("/terms", validate(listQuerySchema, "query"), listTerms);
router.get("/terms/:id", validate(idParamSchema, "params"), getTerm);
router.post("/terms", validate(createTermSchema), createTerm);
router.patch("/terms/:id", validate(idParamSchema, "params"), validate(updateTermSchema), updateTerm);
router.delete("/terms/:id", validate(idParamSchema, "params"), deleteTerm);

module.exports = router;

