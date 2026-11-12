const express = require("express");
const { adminFileByToken } = require("../controllers/fileController");
const { fileStreamLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Akses file untuk admin lewat token berumur pendek (dibuat di respons API admin).
// Otorisasi ada di token itu sendiri; tanpa token yang sah -> 403.
router.get("/:token", fileStreamLimiter, adminFileByToken);

module.exports = router;
