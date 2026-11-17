const express = require("express");
const { listPublicUnits } = require("../controllers/publicOrganizationUnitController");
const validate = require("../middleware/validate");
const { publicListUnitsQuerySchema } = require("../validators/organizationUnitValidator");

const router = express.Router();

router.get("/", validate(publicListUnitsQuerySchema, "query"), listPublicUnits);

module.exports = router;
