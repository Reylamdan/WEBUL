const express = require("express");
const { getPublicTuitionFees } = require("../controllers/publicTuitionFeeController");

const router = express.Router();

router.get("/", getPublicTuitionFees);

module.exports = router;

