const AppError = require("../utils/AppError");
const {
  translateFields,
  isConfigured,
  getNotConfiguredMessage,
  providerLabelForModel,
} = require("../services/translationProvider");
const store = require("../services/translationStore");

const notConfigured = () => new AppError(getNotConfiguredMessage(), 503, "TRANSLATION_NOT_CONFIGURED");

// ---------------------------------------------------------------------
// POST /api/admin/translations/preview
// ---------------------------------------------------------------------
// Menghasilkan terjemahan untuk DITINJAU admin. Endpoint ini TIDAK menyimpan apa pun.
// Untuk mode entityType+entityId, respons memuat sourceHash yang harus dikirim kembali saat
// menyetujui (PUT), supaya terjemahan tidak tersimpan untuk isi sumber yang sudah berubah.
const previewTranslation = async (req, res) => {
  // Cek konfigurasi lebih dulu supaya admin tahu penyebabnya sebelum query database.
  if (!isConfigured()) throw notConfigured();

  const { targetLang, entityType, entityId, fields } = req.body;

  let sourceFields = fields;
  let sourceHash = null;
  if (!sourceFields) {
    const source = await store.loadSource(entityType, entityId);
    sourceFields = source.fields;
    sourceHash = source.hash;
  }

  const result = await translateFields(sourceFields, { targetLang });

  const original = {};
  for (const name of Object.keys(result.translation)) original[name] = sourceFields[name].value;

  return res.json({
    success: true,
    message: "Pratinjau terjemahan dibuat. Belum disimpan.",
    data: {
      sourceLang: "id",
      targetLang: result.targetLang,
      model: result.model,
      entity: entityType ? { type: entityType, id: entityId } : null,
      sourceHash,
      original,
      translation: result.translation,
      saved: false,
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/admin/translations/:entityType/:entityId
// ---------------------------------------------------------------------
const listEntityTranslations = async (req, res) => {
  const { entityType, entityId } = req.validated.params;
  const result = await store.listTranslations(entityType, entityId);
  return res.json({ success: true, data: { entity: { type: entityType, id: entityId }, ...result } });
};

// ---------------------------------------------------------------------
// PUT /api/admin/translations/:entityType/:entityId/:lang
// ---------------------------------------------------------------------
// "Setujui & simpan": satu-satunya jalan terjemahan masuk ke database.
const saveEntityTranslation = async (req, res) => {
  const { entityType, entityId, lang } = req.validated.params;
  const { fields, sourceHash, model } = req.body;

  // Hanya field yang berisi yang disimpan (tabel mewajibkan fields tidak kosong; title wajib).
  const clean = { title: fields.title };
  if (fields.excerpt) clean.excerpt = fields.excerpt;
  if (fields.contentHtml) clean.contentHtml = fields.contentHtml;

  const translation = await store.saveTranslation(entityType, entityId, lang, {
    fields: clean,
    expectedHash: sourceHash,
    provider: model ? `${providerLabelForModel(model)}:${model}` : "manual",
  });

  return res.json({
    success: true,
    message: "Terjemahan disetujui dan disimpan",
    data: { translation },
  });
};

// ---------------------------------------------------------------------
// DELETE /api/admin/translations/:entityType/:entityId/:lang
// ---------------------------------------------------------------------
const deleteEntityTranslation = async (req, res) => {
  const { entityType, entityId, lang } = req.validated.params;
  await store.deleteTranslation(entityType, entityId, lang);
  return res.json({ success: true, message: "Terjemahan dihapus" });
};

module.exports = {
  previewTranslation,
  listEntityTranslations,
  saveEntityTranslation,
  deleteEntityTranslation,
};
