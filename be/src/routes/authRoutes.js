const express = require("express");
const { login, me } = require("../controllers/authController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const { loginLimiter } = require("../middleware/rateLimiters");
const { loginSchema } = require("../validators/authValidator");

const router = express.Router();

// Sengaja TIDAK ada endpoint registrasi. Admin dibuat lewat script: npm run seed:admin
router.post("/login", loginLimiter, validate(loginSchema), login);
router.get("/me", requireAdmin, me);

module.exports = router;