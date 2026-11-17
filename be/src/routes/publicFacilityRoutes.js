const express = require("express");
const { getPublicFacilities } = require("../controllers/publicFacilityController");

const router = express.Router();

// GET /api/facilities
router.get("/", getPublicFacilities);

module.exports = router;

