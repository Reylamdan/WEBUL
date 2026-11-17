const express = require("express");
const {
  listCategories,
  listUnits,
  getUnit,
  createUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/adminOrganizationUnitController");
const { loadUnitForImage, putImage, deleteImage } = require("../controllers/adminOrganizationUnitImageController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const uploadCoverImage = require("../middleware/uploadCoverImage");
const { coverUploadLimiter } = require("../middleware/rateLimiters");
const {
  unitIdParamsSchema,
  listUnitsQuerySchema,
  createUnitSchema,
  updateUnitSchema,
} = require("../validators/organizationUnitValidator");

const router = express.Router();

// Semua endpoint admin struktur organisasi wajib login
router.use(requireAdmin);

// "/categories" harus didaftarkan SEBELUM "/:id".
router.get("/categories", listCategories);
router.get("/", validate(listUnitsQuerySchema, "query"), listUnits);
router.get("/:id", validate(unitIdParamsSchema, "params"), getUnit);
router.post("/", validate(createUnitSchema), createUnit);
router.patch("/:id", validate(unitIdParamsSchema, "params"), validate(updateUnitSchema), updateUnit);
router.delete("/:id", validate(unitIdParamsSchema, "params"), deleteUnit);

// Gambar (opsional). Field multipart bernama "cover", sama seperti cover berita.
router.put(
  "/:id/image",
  validate(unitIdParamsSchema, "params"),
  loadUnitForImage,
  coverUploadLimiter,
  uploadCoverImage,
  putImage
);
router.delete("/:id/image", validate(unitIdParamsSchema, "params"), loadUnitForImage, deleteImage);

module.exports = router;
