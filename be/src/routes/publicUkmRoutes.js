const express = require("express");
const { getPublicUkm } = require("../controllers/publicUkmController");

const router = express.Router();

router.get("/", getPublicUkm);

module.exports = router;

