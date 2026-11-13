const service = require("../services/accreditationService");

// Handler publik: hanya data berstatus published yang pernah bisa dikembalikan.
const createPublicHandlers = (entityKey) => {
  const entity = service.ENTITIES[entityKey];

  const list = async (req, res) =>
    res.json({ success: true, data: await service.publicList(entity, req.validated.query) });

  const get = async (req, res) =>
    res.json({
      success: true,
      data: { accreditation: await service.publicGet(entity, req.validated.params.id) },
    });

  const filterOptions = async (req, res) =>
    res.json({ success: true, data: await service.listFilterOptions(entity, { admin: false }) });

  return { list, get, filterOptions };
};

module.exports = {
  institution: createPublicHandlers("institution"),
  studyProgram: createPublicHandlers("studyProgram"),
};
