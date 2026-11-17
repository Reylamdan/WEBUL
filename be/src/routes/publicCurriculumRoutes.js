const express = require("express");
const { getPublicCurriculum } = require("../controllers/publicCurriculumController");

const router = express.Router();

// GET /api/curriculum
router.get("/", getPublicCurriculum);

module.exports = router;

