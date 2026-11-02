const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");

const router = express.Router();

// Dipasang di app.js dengan prefix /api
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

// Route fitur lain (news, academic calendar) akan ditambahkan di fase berikutnya

module.exports = router;