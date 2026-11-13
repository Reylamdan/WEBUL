const express = require("express");
const { getStatus, connect, callback, disconnect } = require("../controllers/googleOAuthController");
const requireAdmin = require("../middleware/requireAdmin");
const { googleOAuthLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Callback dipanggil browser setelah Google mengarahkan kembali: tidak membawa header Authorization, jadi
// TIDAK memakai requireAdmin. Keamanannya = state acak sekali pakai yang terikat ke admin pembuatnya.
router.get("/callback", googleOAuthLimiter, callback);

// Semua endpoint lain: hanya admin aktif.
router.get("/status", requireAdmin, getStatus);
router.post("/connect", requireAdmin, googleOAuthLimiter, connect);
router.post("/disconnect", requireAdmin, googleOAuthLimiter, disconnect);

module.exports = router;
