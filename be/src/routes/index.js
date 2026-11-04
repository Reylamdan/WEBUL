const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const adminNewsRoutes = require("./adminNewsRoutes");
const adminAnnouncementRoutes = require("./adminAnnouncementRoutes");
const publicAnnouncementRoutes = require("./publicAnnouncementRoutes");
const publicNewsRoutes = require("./publicNewsRoutes");
const adminTranslationRoutes = require("./adminTranslationRoutes");
const adminAccreditationRoutes = require("./adminAccreditationRoutes");
const publicAccreditationRoutes = require("./publicAccreditationRoutes");
const adminBanptRegulationRoutes = require("./adminBanptRegulationRoutes");
const publicBanptRegulationRoutes = require("./publicBanptRegulationRoutes");

const router = express.Router();

// Dipasang di app.js dengan prefix /api
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/admin/news", adminNewsRoutes); // dilindungi requireAdmin di dalam router-nya
router.use("/admin/announcements", adminAnnouncementRoutes); // dilindungi requireAdmin di dalam router-nya
router.use("/announcements", publicAnnouncementRoutes); // publik (unauthenticated)
router.use("/news", publicNewsRoutes); // publik (unauthenticated), hanya berita published
router.use("/admin/translations", adminTranslationRoutes); // dilindungi requireAdmin di dalam router-nya

router.use("/admin/accreditation", adminAccreditationRoutes); // dilindungi requireAdmin di dalam router-nya
router.use("/accreditation", publicAccreditationRoutes); // publik (unauthenticated), hanya data published

router.use("/admin/banpt-regulations", adminBanptRegulationRoutes); // dilindungi requireAdmin di dalam router-nya
router.use("/banpt-regulations", publicBanptRegulationRoutes); // publik (unauthenticated), hanya data published

// Route fitur lain (academic calendar) akan ditambahkan di fase berikutnya

module.exports = router;