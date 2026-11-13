const { searchPublicContent } = require("../services/searchService");

// ---------------------------------------------------------------------
// GET /api/search?q=kata_kunci&limit=10
// Publik, tanpa login. Hanya mengembalikan konten yang sudah dipublikasikan.
// ---------------------------------------------------------------------
const searchAll = async (req, res) => {
  const { q, limit } = req.validated.query;
  const data = await searchPublicContent(q, { limit });
  return res.json({ success: true, data });
};

module.exports = { searchAll };
