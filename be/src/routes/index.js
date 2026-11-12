
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
const fileRoutes = require("./fileRoutes");
const adminAcademicCalendarRoutes = require("./adminAcademicCalendarRoutes");
const publicAcademicCalendarRoutes = require("./publicAcademicCalendarRoutes");
const adminAssistantKnowledgeRoutes = require("./adminAssistantKnowledgeRoutes");
const publicAssistantRoutes = require("./publicAssistantRoutes");


const router = express.Router();

// Dipasang di app.js dengan prefix /api
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/admin/news", adminNewsRoutes);
router.use("/admin/announcements", adminAnnouncementRoutes);
router.use("/announcements", publicAnnouncementRoutes);
router.use("/news", publicNewsRoutes);
router.use("/admin/translations", adminTranslationRoutes);

router.use("/admin/accreditation", adminAccreditationRoutes);
router.use("/accreditation", publicAccreditationRoutes);

router.use("/admin/banpt-regulations", adminBanptRegulationRoutes);
router.use("/banpt-regulations", publicBanptRegulationRoutes);

router.use("/files", fileRoutes);

router.use("/admin/academic-calendar", adminAcademicCalendarRoutes);
router.use("/academic-calendar", publicAcademicCalendarRoutes);

// Assistant Knowledge khusus admin
router.use("/admin/assistant-knowledge", adminAssistantKnowledgeRoutes);

// Public AI Assistant
router.use("/assistant", publicAssistantRoutes);

module.exports = router;
