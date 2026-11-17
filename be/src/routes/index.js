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
const adminAgendaEventRoutes = require("./adminAgendaEventRoutes");
const publicAgendaEventRoutes = require("./publicAgendaEventRoutes");
const adminOrganizationUnitRoutes = require("./adminOrganizationUnitRoutes");
const publicOrganizationUnitRoutes = require("./publicOrganizationUnitRoutes");
const adminProfileRoutes = require("./adminProfileRoutes");
const publicProfileRoutes = require("./publicProfileRoutes");
const adminFacilityRoutes = require("./adminFacilityRoutes");
const publicFacilityRoutes = require("./publicFacilityRoutes");
const adminAssistantKnowledgeRoutes = require("./adminAssistantKnowledgeRoutes");
const publicAssistantRoutes = require("./publicAssistantRoutes");
const publicSearchRoutes = require("./publicSearchRoutes");
const publicTracerStudyRoutes = require("./publicTracerStudyRoutes");
const googleOAuthRoutes = require("./googleOAuthRoutes");
const adminVideoRoutes = require("./adminVideoRoutes");
const publicVideoRoutes = require("./publicVideoRoutes");

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

// Video (Cloudinary)
router.use("/admin/videos", adminVideoRoutes);
router.use("/videos", publicVideoRoutes);

router.use("/files", fileRoutes);

router.use("/admin/academic-calendar", adminAcademicCalendarRoutes);
router.use("/academic-calendar", publicAcademicCalendarRoutes);

// Agenda Acara (kehidupan kampus) — terpisah dari Kalender Akademik
router.use("/admin/agenda-events", adminAgendaEventRoutes);
router.use("/agenda-events", publicAgendaEventRoutes);

// Struktur Organisasi (profil)
router.use("/admin/organization-units", adminOrganizationUnitRoutes);
router.use("/organization-units", publicOrganizationUnitRoutes);

// Halaman Profil (FE /profil)
router.use("/admin/profile", adminProfileRoutes);
router.use("/profile", publicProfileRoutes);

// Fasilitas Kampus (FE /profil/fasilitas-kampus)
router.use("/admin/facilities", adminFacilityRoutes);
router.use("/facilities", publicFacilityRoutes);

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