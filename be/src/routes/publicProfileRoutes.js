const express = require("express");
const { getPublicProfile } = require("../controllers/publicProfileController");

const router = express.Router();

// GET /api/profile
router.get("/", getPublicProfile);

module.exports = router;

