const express = require("express");
const {
  getSettings,
  updateSettings,
  listWaves,
  getWave,
  createWave,
  updateWave,
  deleteWave,
} = require("../controllers/adminRegistrationPeriodController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  waveIdParamsSchema,
  listWavesQuerySchema,
  createWaveSchema,
  updateWaveSchema,
  updateRegistrationPeriodSettingsSchema,
} = require("../validators/registrationPeriodValidator");

const router = express.Router();

router.use(requireAdmin);

// Pengaturan teks header & tahapan
router.get("/settings", getSettings);
router.put("/settings", validate(updateRegistrationPeriodSettingsSchema), updateSettings);

// CRUD Gelombang Pendaftaran
router.get("/waves", validate(listWavesQuerySchema, "query"), listWaves);
router.get("/waves/:id", validate(waveIdParamsSchema, "params"), getWave);
router.post("/waves", validate(createWaveSchema), createWave);
router.patch("/waves/:id", validate(waveIdParamsSchema, "params"), validate(updateWaveSchema), updateWave);
router.delete("/waves/:id", validate(waveIdParamsSchema, "params"), deleteWave);

module.exports = router;

