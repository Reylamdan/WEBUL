const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { escapeLikeTerm } = require("../utils/searchTerm");
const {
  TABLE,
  LIST_COLUMNS,
  DETAIL_COLUMNS,
  knowledgeNotFound,
  loadAdminNames,
  serializeKnowledge,
  findKnowledgeById,
  buildPatch,
} = require("../services/assistantKnowledgeService");

// Halaman diminta melewati jumlah data yang ada
const RANGE_NOT_SATISFIABLE = "PGRST103";
const FOREIGN_KEY_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";
const NOT_NULL_VIOLATION = "23502";

// Pelanggaran constraint yang lolos dari validasi aplikasi dikembalikan sebagai 400 umum,
// bukan 500 dengan detail database. Detailnya tetap dicatat di log server.
const throwWriteError = (context, error) => {
  if (
    error &&
    (error.code === CHECK_VIOLATION || error.code === NOT_NULL_VIOLATION || error.code === FOREIGN_KEY_VIOLATION)
  ) {
    console.error(`[DB] ${context}: ${error.message} (kode: ${error.code})`);
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  return throwDbError(context, error);
};

const respondWithKnowledge = async (res, row, context, { status = 200, message } = {}) => {
  const admins = await loadAdminNames([row], context);
  const body = { success: true, data: { knowledge: serializeKnowledge(row, admins) } };
  if (message) body.message = message;
  return res.status(status).json(body);
};

// ---------------------------------------------------------------------
// GET /api/admin/assistant-knowledge
// ---------------------------------------------------------------------
const listKnowledge = async (req, res) => {
  const { page, limit, status, category, search } = req.validated.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Filter kolom tunggal lewat .ilike(kolom, pola), bukan .or(), jadi koma/kurung pada input aman.
  // Hanya wildcard LIKE yang perlu dijaga (escapeLikeTerm).
  const searchTerm = search ? escapeLikeTerm(search) : "";
  const categoryTerm = category ? escapeLikeTerm(category) : "";

  const applyFilters = (query) => {
    let filtered = query;
    if (status) filtered = filtered.eq("status", status);
    if (categoryTerm) filtered = filtered.ilike("category", categoryTerm); // sama persis, tanpa membedakan huruf besar/kecil
    if (searchTerm) filtered = filtered.ilike("title", `%${searchTerm}%`);
    return filtered;
  };

  let { data, count, error } = await applyFilters(
    supabase.from(TABLE).select(LIST_COLUMNS, { count: "exact" })
  )
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  // Halaman di luar jumlah data bukan kesalahan: kembalikan daftar kosong dan hitung total terpisah.
  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("assistant_knowledge: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError("assistant_knowledge: daftar", error);

  const admins = await loadAdminNames(data, "assistant_knowledge: daftar");
  const total = count ?? 0;

  return res.json({
    success: true,
    data: {
      items: data.map((row) => serializeKnowledge(row, admins, { includeContent: false })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
};

// ---------------------------------------------------------------------
// GET /api/admin/assistant-knowledge/:id
// ---------------------------------------------------------------------
const getKnowledge = async (req, res) => {
  const row = await findKnowledgeById(req.validated.params.id, "assistant_knowledge: detail");
  if (!row) throw knowledgeNotFound();

  return respondWithKnowledge(res, row, "assistant_knowledge: detail");
};

// ---------------------------------------------------------------------
// POST /api/admin/assistant-knowledge
// ---------------------------------------------------------------------
const createKnowledge = async (req, res) => {
  const body = req.body;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: body.title,
      category: body.category,
      content: body.content,
      keywords: body.keywords ?? [],
      source_label: body.sourceLabel ?? null,
      source_path: body.sourcePath ?? null,
      status: body.status ?? "draft",
      valid_until: body.validUntil ?? null,
      created_by: req.admin.id, // dari token yang sudah diverifikasi, BUKAN dari body
      updated_by: null, // baru terisi saat ada pembaruan nyata
    })
    .select(DETAIL_COLUMNS)
    .single();

  if (error) throwWriteError("assistant_knowledge: buat", error);

  return respondWithKnowledge(res, data, "assistant_knowledge: buat", {
    status: 201,
    message: "Knowledge berhasil dibuat",
  });
};

// ---------------------------------------------------------------------
// PATCH /api/admin/assistant-knowledge/:id
// ---------------------------------------------------------------------
const updateKnowledge = async (req, res) => {
  const { id } = req.validated.params;

  const current = await findKnowledgeById(id, "assistant_knowledge: ambil untuk update");
  if (!current) throw knowledgeNotFound();

  const patch = buildPatch(req.body, current);

  // Tidak ada yang benar-benar berubah: tidak menulis ke database, updated_by/updated_at tetap.
  if (Object.keys(patch).length === 0) {
    return respondWithKnowledge(res, current, "assistant_knowledge: tanpa perubahan", {
      message: "Tidak ada perubahan",
    });
  }

  // updated_at diisi oleh trigger database; aplikasi hanya mengisi updated_by.
  patch.updated_by = req.admin.id;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  if (error) throwWriteError("assistant_knowledge: perbarui", error);

  // Dihapus oleh request lain di antara pembacaan dan pembaruan
  if (!data) throw knowledgeNotFound();

  return respondWithKnowledge(res, data, "assistant_knowledge: perbarui", {
    message: "Knowledge berhasil diperbarui",
  });
};

// ---------------------------------------------------------------------
// DELETE /api/admin/assistant-knowledge/:id
// ---------------------------------------------------------------------
// Hanya menghapus SATU baris di assistant_knowledge.
const deleteKnowledge = async (req, res) => {
  const { id } = req.validated.params;

  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id");

  if (error && error.code === FOREIGN_KEY_VIOLATION) {
    console.error(`[DB] assistant_knowledge: hapus: ${error.message} (kode: ${error.code})`);
    throw new AppError("Knowledge masih dipakai data lain sehingga tidak bisa dihapus", 409, "KNOWLEDGE_IN_USE");
  }
  if (error) throwDbError("assistant_knowledge: hapus", error);

  if (!data || data.length === 0) throw knowledgeNotFound();

  return res.json({ success: true, message: "Knowledge berhasil dihapus" });
};

module.exports = {
  listKnowledge,
  getKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
};
