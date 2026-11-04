// Manajemen Peraturan BAN-PT (tabel banpt_regulations, bucket publik banpt-regulations).
//   - dokumen utama : kolom document_path (satu PDF)
//   - lampiran      : kolom attachments (JSONB, array)
//       [{ id, name, path, mimeType, size, uploadedAt }]
// Path storage disimpan di database dan TIDAK PERNAH dikirim sebagai field; klien menerima URL
// publik yang dibentuk dari helper Supabase.
const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm, escapeLikeTerm } = require("../utils/searchTerm");
const storage = require("../utils/regulationStorage");

const TABLE = "banpt_regulations";
const COLUMNS =
  "id, regulation_number, regulation_year, determination_date, title, document_path, attachments, status, published_at, created_at, updated_at";
const MAX_ATTACHMENTS = 20;

const UNIQUE_VIOLATION = "23505";
// check, not-null, tipe data/tanggal/angka tidak valid -> kesalahan input, bukan kesalahan server
const INPUT_ERROR_CODES = ["23514", "23502", "22P02", "22007", "22008", "22003"];
const RANGE_NOT_SATISFIABLE = "PGRST103";

const notFound = () =>
  new AppError("Peraturan BAN-PT tidak ditemukan", 404, "BANPT_REGULATION_NOT_FOUND");
const attachmentNotFound = () =>
  new AppError("Lampiran tidak ditemukan", 404, "ATTACHMENT_NOT_FOUND");
const conflict = () => new AppError("Data berubah, silakan coba lagi", 409, "REGULATION_CONFLICT");

const mapWriteError = (context, error) => {
  if (error.code === UNIQUE_VIOLATION) {
    return new AppError("Peraturan dengan data yang sama sudah ada", 409, "BANPT_REGULATION_DUPLICATE");
  }
  if (INPUT_ERROR_CODES.includes(error.code)) {
    return new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  try {
    throwDbError(context, error);
  } catch (appError) {
    return appError;
  }
  return error;
};

// ---------- serialisasi ----------
const readAttachments = (row) =>
  (Array.isArray(row.attachments) ? row.attachments : []).filter(
    (a) => a && typeof a.id === "string" && typeof a.path === "string"
  );

const safeFileName = (value) =>
  String(value || "dokumen")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) || "dokumen";

const serialize = (row, { admin }) => {
  const mainName = `PerBAN-${safeFileName(row.regulation_number)}-${row.regulation_year}.pdf`;
  const item = {
    id: row.id,
    regulationNumber: row.regulation_number,
    regulationYear: row.regulation_year,
    determinationDate: row.determination_date,
    title: row.title,
    document: row.document_path
      ? {
          mimeType: "application/pdf",
          url: storage.getPublicUrl(row.document_path),
          downloadUrl: storage.getPublicUrl(row.document_path, mainName),
        }
      : null,
    attachments: readAttachments(row).map((a) => ({
      id: a.id,
      name: a.name,
      mimeType: a.mimeType || "application/pdf",
      size: a.size ?? null,
      uploadedAt: a.uploadedAt ?? null,
      url: storage.getPublicUrl(a.path),
      downloadUrl: storage.getPublicUrl(a.path, a.name || "lampiran.pdf"),
    })),
    publishedAt: row.published_at,
  };
  if (admin) {
    item.status = row.status;
    item.createdAt = row.created_at;
    item.updatedAt = row.updated_at;
  }
  return item;
};

// ---------- query ----------
const ORDER = (q) =>
  q
    .order("determination_date", { ascending: false, nullsFirst: false })
    .order("regulation_year", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

// Semua filter digabung dengan AND. Pagination dan filter dikerjakan database.
const applyFilters = (query, { search, year, regulationNumber, dateFrom, dateTo }) => {
  let q = query;
  const term = search ? cleanSearchTerm(search) : "";
  if (term) {
    const parts = [`regulation_number.ilike.%${term}%`, `title.ilike.%${term}%`];
    // Kolom tahun bertipe angka: dicocokkan persis jika kata kunci berupa angka 4 digit
    if (/^\d{4}$/.test(term)) parts.push(`regulation_year.eq.${term}`);
    q = q.or(parts.join(","));
  }
  if (year) q = q.eq("regulation_year", year);
  const numberTerm = regulationNumber ? escapeLikeTerm(regulationNumber) : "";
  if (numberTerm) q = q.ilike("regulation_number", `%${numberTerm}%`);
  if (dateFrom) q = q.gte("determination_date", dateFrom);
  if (dateTo) q = q.lte("determination_date", dateTo);
  return q;
};

const paginatedList = async ({ page, limit, build, admin, context }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let { data, count, error } = await ORDER(
    build(supabase.from(TABLE).select(COLUMNS, { count: "exact" }))
  ).range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await build(supabase.from(TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError(`${context}: hitung total`, counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError(`${context}: daftar`, error);

  const total = count ?? 0;
  return {
    items: data.map((row) => serialize(row, { admin })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const findRow = async (id, context) => {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

const publishedOnly = (q) => q.eq("status", "published").lte("published_at", new Date().toISOString());

// ---------- PUBLIK: hanya published ----------
const publicList = (query) =>
  paginatedList({
    page: query.page,
    limit: query.limit,
    admin: false,
    context: `public ${TABLE}`,
    build: (q) => applyFilters(publishedOnly(q), query),
  });

const publicGet = async (id) => {
  const { data, error } = await publishedOnly(supabase.from(TABLE).select(COLUMNS).eq("id", id)).maybeSingle();
  if (error) throwDbError(`public ${TABLE}: detail`, error);
  if (!data) throw notFound();
  return serialize(data, { admin: false });
};

// ---------- ADMIN ----------
const adminList = (query) =>
  paginatedList({
    page: query.page,
    limit: query.limit,
    admin: true,
    context: `${TABLE}: admin`,
    build: (q) => applyFilters(query.status ? q.eq("status", query.status) : q, query),
  });

const adminGet = async (id) => {
  const row = await findRow(id, `${TABLE}: detail`);
  if (!row) throw notFound();
  return serialize(row, { admin: true });
};

const requireDocumentToPublish = (hasDocument) => {
  if (!hasDocument) {
    throw new AppError(
      "Dokumen utama wajib diunggah sebelum peraturan dipublikasikan",
      400,
      "DOCUMENT_REQUIRED_TO_PUBLISH"
    );
  }
};

const adminCreate = async (body) => {
  const status = body.status || "draft";
  requireDocumentToPublish(status !== "published"); // peraturan baru belum punya dokumen
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      regulation_number: body.regulationNumber,
      regulation_year: body.regulationYear,
      determination_date: body.determinationDate,
      title: body.title,
      document_path: null,
      attachments: [],
      status,
      published_at: null,
    })
    .select(COLUMNS)
    .single();
  if (error) throw mapWriteError(`${TABLE}: buat`, error);
  return serialize(data, { admin: true });
};

const adminUpdate = async (id, body) => {
  const current = await findRow(id, `${TABLE}: ambil untuk update`);
  if (!current) throw notFound();

  const patch = {};
  if (body.regulationNumber !== undefined) patch.regulation_number = body.regulationNumber;
  if (body.regulationYear !== undefined) patch.regulation_year = body.regulationYear;
  if (body.determinationDate !== undefined) patch.determination_date = body.determinationDate;
  if (body.title !== undefined) patch.title = body.title;
  if (body.status !== undefined) {
    if (body.status === "published") {
      requireDocumentToPublish(Boolean(current.document_path));
      if (!current.published_at) patch.published_at = new Date().toISOString();
    }
    patch.status = body.status;
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw mapWriteError(`${TABLE}: perbarui`, error);
  if (!data) throw notFound();
  return serialize(data, { admin: true });
};

// Hapus baris dulu; semua file (utama + lampiran) dihapus SESUDAH baris berhasil terhapus.
// Jika penghapusan file gagal, data tetap terhapus dan file dicatat [ORPHAN].
const adminDelete = async (id) => {
  const current = await findRow(id, `${TABLE}: ambil untuk hapus`);
  if (!current) throw notFound();

  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id");
  if (error) throwDbError(`${TABLE}: hapus`, error);
  if (!data || data.length === 0) throw notFound();

  await storage.removeFilesQuietly(
    [current.document_path, ...readAttachments(current).map((a) => a.path)],
    `${TABLE}: hapus data`
  );
};

// Dipakai middleware: pastikan data ada sebelum file diproses
const loadForUpload = async (id) => {
  const { data, error } = await supabase.from(TABLE).select("id").eq("id", id).maybeSingle();
  if (error) throwDbError(`${TABLE}: ambil untuk dokumen`, error);
  if (!data) throw notFound();
  return data;
};

// ---------- DOKUMEN UTAMA ----------
// Unggah file baru -> compare-and-set kolom di database -> hapus file lama.
// Baris tidak pernah menunjuk ke file yang belum ada atau sudah hilang.
const adminSetDocument = async (id, processed) => {
  const current = await findRow(id, `${TABLE}: ambil untuk dokumen`);
  if (!current) throw notFound();
  const oldPath = current.document_path;
  const newPath = storage.buildMainPath(id);

  await storage.uploadPdf(newPath, processed.buffer);

  let query = supabase
    .from(TABLE)
    .update({ document_path: newPath, updated_at: new Date().toISOString() })
    .eq("id", id);
  query = oldPath ? query.eq("document_path", oldPath) : query.is("document_path", null);
  const { data, error } = await query.select(COLUMNS).maybeSingle();

  if (error) {
    await storage.removeFilesQuietly([newPath], `${TABLE}: kompensasi setelah DB gagal`);
    throw mapWriteError(`${TABLE}: simpan dokumen`, error);
  }
  if (!data) {
    await storage.removeFilesQuietly([newPath], `${TABLE}: kompensasi karena CAS gagal`);
    throw conflict();
  }
  await storage.removeFilesQuietly([oldPath], `${TABLE}: hapus dokumen lama`);
  return serialize(data, { admin: true });
};

// ---------- LAMPIRAN ----------
// Perubahan array lampiran memakai compare-and-set pada updated_at (dibaca lalu dibandingkan),
// sehingga dua request bersamaan tidak saling menimpa.
const casAttachments = async (current, nextAttachments) =>
  supabase
    .from(TABLE)
    .update({ attachments: nextAttachments, updated_at: new Date().toISOString() })
    .eq("id", current.id)
    .eq("updated_at", current.updated_at)
    .select(COLUMNS)
    .maybeSingle();

const uploadMany = async (id, processedList) => {
  const uploaded = [];
  try {
    for (const processed of processedList) {
      const filePath = storage.buildAttachmentPath(id);
      await storage.uploadPdf(filePath, processed.buffer);
      uploaded.push({ processed, path: filePath });
    }
  } catch (error) {
    await storage.removeFilesQuietly(uploaded.map((u) => u.path), `${TABLE}: kompensasi upload lampiran`);
    throw error;
  }
  return uploaded;
};

const adminAddAttachments = async (id, processedList) => {
  const current = await findRow(id, `${TABLE}: ambil untuk lampiran`);
  if (!current) throw notFound();
  const existing = readAttachments(current);
  if (existing.length + processedList.length > MAX_ATTACHMENTS) {
    throw new AppError(
      `Jumlah lampiran maksimal ${MAX_ATTACHMENTS} per peraturan (saat ini ${existing.length})`,
      400,
      "ATTACHMENT_LIMIT_REACHED"
    );
  }

  const uploaded = await uploadMany(id, processedList);
  const now = new Date().toISOString();
  const added = uploaded.map(({ processed, path }) => ({
    id: crypto.randomUUID(),
    name: processed.displayName,
    path,
    mimeType: processed.mimeType,
    size: processed.size,
    uploadedAt: now,
  }));

  const { data, error } = await casAttachments(current, [...existing, ...added]);
  if (error) {
    await storage.removeFilesQuietly(added.map((a) => a.path), `${TABLE}: kompensasi setelah DB gagal`);
    throw mapWriteError(`${TABLE}: simpan lampiran`, error);
  }
  if (!data) {
    await storage.removeFilesQuietly(added.map((a) => a.path), `${TABLE}: kompensasi karena CAS gagal`);
    throw conflict();
  }
  return serialize(data, { admin: true });
};

const adminReplaceAttachment = async (id, attachmentId, processed) => {
  const current = await findRow(id, `${TABLE}: ambil untuk lampiran`);
  if (!current) throw notFound();
  const existing = readAttachments(current);
  const index = existing.findIndex((a) => a.id === attachmentId);
  if (index < 0) throw attachmentNotFound();

  const oldPath = existing[index].path;
  const [{ path: newPath }] = await uploadMany(id, [processed]);
  const next = [...existing];
  next[index] = {
    ...existing[index],
    name: processed.displayName,
    path: newPath,
    mimeType: processed.mimeType,
    size: processed.size,
    uploadedAt: new Date().toISOString(),
  };

  const { data, error } = await casAttachments(current, next);
  if (error) {
    await storage.removeFilesQuietly([newPath], `${TABLE}: kompensasi setelah DB gagal`);
    throw mapWriteError(`${TABLE}: ganti lampiran`, error);
  }
  if (!data) {
    await storage.removeFilesQuietly([newPath], `${TABLE}: kompensasi karena CAS gagal`);
    throw conflict();
  }
  await storage.removeFilesQuietly([oldPath], `${TABLE}: hapus lampiran lama`);
  return serialize(data, { admin: true });
};

const adminRemoveAttachment = async (id, attachmentId) => {
  const current = await findRow(id, `${TABLE}: ambil untuk lampiran`);
  if (!current) throw notFound();
  const existing = readAttachments(current);
  const target = existing.find((a) => a.id === attachmentId);
  if (!target) throw attachmentNotFound();

  const { data, error } = await casAttachments(current, existing.filter((a) => a.id !== attachmentId));
  if (error) throw mapWriteError(`${TABLE}: hapus lampiran`, error);
  if (!data) throw conflict();

  await storage.removeFilesQuietly([target.path], `${TABLE}: hapus file lampiran`);
  return serialize(data, { admin: true });
};

// ---------- OPSI FILTER (tahun untuk dropdown) ----------
const PAGE_SIZE = 1000;
const listFilterOptions = async ({ admin }) => {
  const years = new Set();
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from(TABLE).select("regulation_year");
    if (!admin) q = publishedOnly(q);
    const { data, error } = await q.order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (error.code === RANGE_NOT_SATISFIABLE) break;
      throwDbError(`${TABLE}: opsi filter`, error);
    }
    for (const r of data || []) if (Number.isInteger(Number(r.regulation_year))) years.add(Number(r.regulation_year));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { years: [...years].sort((a, b) => b - a) };
};

module.exports = {
  MAX_ATTACHMENTS,
  publicList,
  publicGet,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminDelete,
  loadForUpload,
  adminSetDocument,
  adminAddAttachments,
  adminReplaceAttachment,
  adminRemoveAttachment,
  listFilterOptions,
};
