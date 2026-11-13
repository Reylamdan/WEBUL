const express = require("express");
const {
  listKnowledge,
  getKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
} = require("../controllers/adminAssistantKnowledgeController");
const requireAdmin = require("../middleware/requireAdmin");
const validate = require("../middleware/validate");
const {
  knowledgeIdParamsSchema,
  listKnowledgeQuerySchema,
  createKnowledgeSchema,
  updateKnowledgeSchema,
} = require("../validators/assistantKnowledgeValidator");

const router = express.Router();

// SEMUA endpoint di router ini khusus admin yang sudah login.
// Dipasang di level router (bukan per route) supaya route baru tidak mungkin terlewat.
router.use(requireAdmin);

router.get("/", validate(listKnowledgeQuerySchema, "query"), listKnowledge);
router.get("/:id", validate(knowledgeIdParamsSchema, "params"), getKnowledge);
router.post("/", validate(createKnowledgeSchema), createKnowledge);
router.patch("/:id", validate(knowledgeIdParamsSchema, "params"), validate(updateKnowledgeSchema), updateKnowledge);
router.delete("/:id", validate(knowledgeIdParamsSchema, "params"), deleteKnowledge);

module.exports = router;
