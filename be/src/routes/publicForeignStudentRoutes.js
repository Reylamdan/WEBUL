const express = require("express");
const { getPublicForeignStudents } = require("../controllers/publicForeignStudentController");

const router = express.Router();

router.get("/", getPublicForeignStudents);

module.exports = router;

