const express = require("express");
const { getPublicResignation } = require("../controllers/publicResignationController");

const router = express.Router();

router.get("/", getPublicResignation);

module.exports = router;

