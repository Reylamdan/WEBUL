const express = require("express");
const {
  previewTranslation,
  listEntityTranslations,
  saveEntityTranslation,
  deleteEntityTranslation,
} = require("../controllers/adminTranslationController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const { translationLimiter } = require("../middleware/translationLimiter");
const {
  previewSchema,
  entityParamsSchema,
  entityLangParamsSchema,
  saveTranslationSchema,
} = require("../validators/translationValidator");

const router = express.Router();

// SEMUA endpoint di router ini khusus admin yang sudah login (dipasang di level router).
router.use(requireAdmin);

// Alur admin: preview (Gemini, dibatasi kuota) -> tinjau/sunting -> PUT (setujui & simpan).
// Urutan preview: auth -> pembatas (melindungi kuota) -> validasi -> controller
router.post("/preview", translationLimiter, validate(previewSchema), previewTranslation);

router.get("/:entityType/:entityId", validate(entityParamsSchema, "params"), listEntityTranslations);
router.put(
  "/:entityType/:entityId/:lang",
  validate(entityLangParamsSchema, "params"),
  validate(saveTranslationSchema),
  saveEntityTranslation
);
router.delete(
  "/:entityType/:entityId/:lang",
  validate(entityLangParamsSchema, "params"),
  deleteEntityTranslation
);

module.exports = router;
