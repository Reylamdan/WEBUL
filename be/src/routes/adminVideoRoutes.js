const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const uploadVideoFile = require("../middleware/uploadVideoFile");
const { videoUploadLimiter } = require("../middleware/rateLimiters");
const {
  videoParamsSchema,
  videoIdParamSchema,
} = require("../validators/videoValidator");
const {
  getVideo,
  getVideoById,
  uploadVideo,
  replaceVideo,
  deleteVideo,
} = require("../controllers/adminVideoController");

const router = express.Router();

// Semua rute admin video dilindungi autentikasi admin
router.use(requireAdmin);

// Ambil metadata video berdasarkan ID unik media_videos
router.get("/id/:id", validate(videoIdParamSchema, "params"), getVideoById);

// Ambil video aktif untuk modul dan record tertentu
router.get("/:module/:recordId", validate(videoParamsSchema, "params"), getVideo);

// Upload video baru untuk modul dan record tertentu
router.post(
  "/:module/:recordId",
  validate(videoParamsSchema, "params"),
  videoUploadLimiter,
  uploadVideoFile,
  uploadVideo
);

// Ganti video untuk modul dan record tertentu (CAS)
router.put(
  "/:module/:recordId",
  validate(videoParamsSchema, "params"),
  videoUploadLimiter,
  uploadVideoFile,
  replaceVideo
);

// Hapus video untuk modul dan record tertentu
router.delete("/:module/:recordId", validate(videoParamsSchema, "params"), deleteVideo);

module.exports = router;

