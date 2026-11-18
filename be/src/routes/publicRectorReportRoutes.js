const express = require("express");
const { getPublicData } = require("../controllers/publicRectorReportController");

const router = express.Router();

router.get("/", getPublicData);

module.exports = router;

