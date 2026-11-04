const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const adminNewsRoutes = require("./adminNewsRoutes");

const router = express.Router();

// Dipasang di app.js dengan prefix /api
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/admin/news", adminNewsRoutes); // dilindungi requireAdmin di dalam router-nya

// Route fitur lain (academic calendar, endpoint publik news) akan ditambahkan di fase berikutnya

module.exports = router;