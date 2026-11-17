const express = require("express");
const { getPublicRpl } = require("../controllers/publicRplController");

const router = express.Router();

router.get("/", getPublicRpl);

module.exports = router;

