const express = require("express");
const handlers = require("../controllers/publicHomepageController");

const router = express.Router();

// Konten beranda (teks, foto, video) yang sudah dipublikasikan.
router.get("/", handlers.get);

module.exports = router;
