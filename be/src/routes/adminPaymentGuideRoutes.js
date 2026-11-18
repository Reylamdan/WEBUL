const express = require("express");
const {
  getSettings,
  updateSettings,
  listVaSteps,
  getVaStep,
  createVaStep,
  updateVaStep,
  deleteVaStep,
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
} = require("../controllers/adminPaymentGuideController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  idParamSchema,
  listQuerySchema,
  updatePaymentSettingsSchema,
  createVaStepSchema,
  updateVaStepSchema,
  createChannelSchema,
  updateChannelSchema,
} = require("../validators/paymentGuideValidator");

const router = express.Router();

router.use(requireAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", validate(updatePaymentSettingsSchema), updateSettings);

// VA Steps (Panduan SiAkad)
router.get("/va-steps", validate(listQuerySchema, "query"), listVaSteps);
router.get("/va-steps/:id", validate(idParamSchema, "params"), getVaStep);
router.post("/va-steps", validate(createVaStepSchema), createVaStep);
router.patch("/va-steps/:id", validate(idParamSchema, "params"), validate(updateVaStepSchema), updateVaStep);
router.delete("/va-steps/:id", validate(idParamSchema, "params"), deleteVaStep);

// Channels (Kanal Pembayaran)
router.get("/channels", validate(listQuerySchema, "query"), listChannels);
router.get("/channels/:id", validate(idParamSchema, "params"), getChannel);
router.post("/channels", validate(createChannelSchema), createChannel);
router.patch("/channels/:id", validate(idParamSchema, "params"), validate(updateChannelSchema), updateChannel);
router.delete("/channels/:id", validate(idParamSchema, "params"), deleteChannel);

module.exports = router;

