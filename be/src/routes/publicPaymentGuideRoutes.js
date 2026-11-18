const express = require("express");
const { getPublicPaymentGuide } = require("../controllers/publicPaymentGuideController");

const router = express.Router();

router.get("/", getPublicPaymentGuide);

module.exports = router;

