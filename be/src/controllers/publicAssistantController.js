
const { askAssistant } = require("../services/assistantService");

// POST /api/assistant/chat
const chatWithAssistant = async (req, res) => {
  const { question, history } = req.body;

  const result = await askAssistant(question, { history });

  return res.json({
    success: true,
    data: {
      answerable: result.answerable,
      answer: result.answer,
      citations: result.citations,
      fallback: result.fallback,
    },
  });
};

module.exports = { chatWithAssistant };
