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
const adminLpmArchiveRoutes = require("./adminLpmArchiveRoutes");
const publicLpmArchiveRoutes = require("./publicLpmArchiveRoutes");
const fileRoutes = require("./fileRoutes");
const adminAcademicCalendarRoutes = require("./adminAcademicCalendarRoutes");
const publicAcademicCalendarRoutes = require("./publicAcademicCalendarRoutes");
const adminAssistantKnowledgeRoutes = require("./adminAssistantKnowledgeRoutes");
const publicAssistantRoutes = require("./publicAssistantRoutes");
const publicSearchRoutes = require("./publicSearchRoutes");
const publicTracerStudyRoutes = require("./publicTracerStudyRoutes");
const googleOAuthRoutes = require("./googleOAuthRoutes");

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

// LPM - Manajemen Arsip
router.use("/admin/lpm-archives", adminLpmArchiveRoutes);
router.use("/lpm-archives", publicLpmArchiveRoutes);

router.use("/files", fileRoutes);

router.use("/admin/academic-calendar", adminAcademicCalendarRoutes);
router.use("/academic-calendar", publicAcademicCalendarRoutes);

// Google Drive OAuth 2.0
router.use("/admin/google-drive", googleOAuthRoutes);

// Assistant Knowledge khusus admin
router.use("/admin/assistant-knowledge", adminAssistantKnowledgeRoutes);

// Public AI Assistant
router.use("/assistant", publicAssistantRoutes);

// Global Search publik
router.use("/search", publicSearchRoutes);

// Tracer Study publik
router.use("/tracer-study", publicTracerStudyRoutes);

module.exports = router;