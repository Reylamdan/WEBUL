const express = require("express");
const handlers = require("../controllers/adminHomepageController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const uploadCoverImage = require("../middleware/uploadCoverImage");
const { coverUploadLimiter } = require("../middleware/rateLimiters");
const {
  idParamsSchema,
  updateContentSchema,
  listPhotosQuerySchema,
  createPhotoSchema,
  updatePhotoSchema,
  listVideosQuerySchema,
  createVideoSchema,
  updateVideoSchema,
} = require("../validators/homepageValidator");

const router = express.Router();

router.use(requireAdmin);

// Teks & tautan section beranda
router.get("/content", handlers.getContent);
router.put("/content", validate(updateContentSchema), handlers.updateContent);
router.delete("/content/:section", handlers.resetSection);

// CRUD foto
router.get("/photos", validate(listPhotosQuerySchema, "query"), handlers.listPhotos);
router.post("/photos", validate(createPhotoSchema), handlers.createPhoto);
router.get("/photos/:id", validate(idParamsSchema, "params"), handlers.getPhoto);
router.patch("/photos/:id", validate(idParamsSchema, "params"), validate(updatePhotoSchema), handlers.updatePhoto);
router.delete("/photos/:id", validate(idParamsSchema, "params"), handlers.deletePhoto);
router.put("/photos/:id/image", validate(idParamsSchema, "params"), coverUploadLimiter, uploadCoverImage, handlers.putPhotoImage);
router.delete("/photos/:id/image", validate(idParamsSchema, "params"), handlers.deletePhotoImage);

// CRUD video (file video: PUT/POST /api/admin/videos/homepage-videos/:id)
router.get("/videos", validate(listVideosQuerySchema, "query"), handlers.listVideos);
router.post("/videos", validate(createVideoSchema), handlers.createVideo);
router.get("/videos/:id", validate(idParamsSchema, "params"), handlers.getVideo);
router.patch("/videos/:id", validate(idParamsSchema, "params"), validate(updateVideoSchema), handlers.updateVideo);
router.delete("/videos/:id", validate(idParamsSchema, "params"), handlers.deleteVideo);

module.exports = router;
