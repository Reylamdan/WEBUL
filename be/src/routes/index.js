const express = require("express");
const healthRoutes = require("./healthRoutes");

const router = express.Router();

// Dipasang di app.js dengan prefix /api
router.use("/health", healthRoutes);

// Route fitur (auth, news, academic calendar) akan ditambahkan di fase berikutnya

module.exports = router;