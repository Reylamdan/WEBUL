const express = require("express");
const validate = require("../middleware/validate");
const { videoParamsSchema } = require("../validators/videoValidator");
const { getPublicVideo } = require("../controllers/publicVideoController");

const router = express.Router();

// Rute publik (tanpa token) untuk mengambil URL pemutaran video dan thumbnail yang berstatus published
router.get("/:module/:recordId", validate(videoParamsSchema, "params"), getPublicVideo);

module.exports = router;

