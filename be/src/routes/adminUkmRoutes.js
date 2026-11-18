const express = require("express");
const {
  getSettings,
  updateSettings,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/adminUkmController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  idParamSchema,
  listQuerySchema,
  updateUkmSettingsSchema,
  createUkmItemSchema,
  updateUkmItemSchema,
} = require("../validators/ukmValidator");

const router = express.Router();

router.use(requireAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", validate(updateUkmSettingsSchema), updateSettings);

// Items (UKM / Kegiatan Mahasiswa)
router.get("/items", validate(listQuerySchema, "query"), listItems);
router.get("/items/:id", validate(idParamSchema, "params"), getItem);
router.post("/items", validate(createUkmItemSchema), createItem);
router.patch("/items/:id", validate(idParamSchema, "params"), validate(updateUkmItemSchema), updateItem);
router.delete("/items/:id", validate(idParamSchema, "params"), deleteItem);

module.exports = router;

