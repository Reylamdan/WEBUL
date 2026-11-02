const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const adminNewsRoutes = require("./adminNewsRoutes");
const adminAnnouncementRoutes = require("./adminAnnouncementRoutes");
const publicAnnouncementRoutes = require("./publicAnnouncementRoutes");

const router = express.Router();

// Dipasang di app.js dengan prefix /api
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/admin/news", adminNewsRoutes); // dilindungi requireAdmin di dalam router-nya
router.use("/admin/announcements", adminAnnouncementRoutes); // dilindungi requireAdmin di dalam router-nya
router.use("/announcements", publicAnnouncementRoutes); // publik (unauthenticated)

// Route fitur lain (academic calendar, endpoint publik news) akan ditambahkan di fase berikutnya

module.exports = router;