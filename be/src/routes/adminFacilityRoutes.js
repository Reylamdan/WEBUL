const express = require("express");
const {
  getFacilitySettings,
  updateFacilitySettings,
  putHeroImage,
  deleteHeroImage,
  listFacilities,
  getFacility,
  createFacility,
  updateFacility,
  deleteFacility,
  putFacilityImage,
  deleteFacilityImage,
} = require("../controllers/adminFacilityController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const uploadCoverImage = require("../middleware/uploadCoverImage");
const { coverUploadLimiter } = require("../middleware/rateLimiters");
const {
  facilityIdParamsSchema,
  listFacilitiesQuerySchema,
  createFacilitySchema,
  updateFacilitySchema,
  updateFacilitySettingsSchema,
} = require("../validators/facilityValidator");

const router = express.Router();

router.use(requireAdmin);

// Pengaturan header halaman fasilitas
router.get("/settings", getFacilitySettings);
router.put("/settings", validate(updateFacilitySettingsSchema), updateFacilitySettings);
router.put("/settings/hero-image", coverUploadLimiter, uploadCoverImage, putHeroImage);
router.delete("/settings/hero-image", deleteHeroImage);

// CRUD Daftar Fasilitas
router.get("/", validate(listFacilitiesQuerySchema, "query"), listFacilities);
router.get("/:id", validate(facilityIdParamsSchema, "params"), getFacility);
router.post("/", validate(createFacilitySchema), createFacility);
router.patch("/:id", validate(facilityIdParamsSchema, "params"), validate(updateFacilitySchema), updateFacility);
router.delete("/:id", validate(facilityIdParamsSchema, "params"), deleteFacility);

// Upload & Hapus Foto Fasilitas
router.put("/:id/image", validate(facilityIdParamsSchema, "params"), coverUploadLimiter, uploadCoverImage, putFacilityImage);
router.delete("/:id/image", validate(facilityIdParamsSchema, "params"), deleteFacilityImage);

module.exports = router;

