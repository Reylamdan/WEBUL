const service = require("../services/homepageService");

// GET /api/homepage
const get = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.publicGet() });
  } catch (error) {
    next(error);
  }
};

module.exports = { get };
