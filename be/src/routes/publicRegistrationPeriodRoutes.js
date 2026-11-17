const express = require("express");
const { getPublicRegistrationPeriod } = require("../controllers/publicRegistrationPeriodController");

const router = express.Router();

router.get("/", getPublicRegistrationPeriod);

module.exports = router;

