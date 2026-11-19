const express = require("express");
const handlers = require("../controllers/publicLpmActivityController");
const validate = require("../middleware/validate");
const { publicListQuerySchema } = require("../validators/lpmActivityValidator");

const router = express.Router();

router.get("/", validate(publicListQuerySchema, "query"), handlers.list);

module.exports = router;
