
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const { chatWithAssistant } = require("../controllers/publicAssistantController");
const validate = require("../middleware/validate");
const { chatAssistantSchema } = require("../validators/assistantValidator");

const router = express.Router();

// Pembatas khusus AI Assistant
const assistantChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan ke AI Assistant. Silakan coba lagi dalam 15 menit.",
    code: "ASSISTANT_RATE_LIMIT",
  },
});

router.post(
  "/chat",
  assistantChatLimiter,
  validate(chatAssistantSchema, "body"),
  chatWithAssistant
);

module.exports = router;
