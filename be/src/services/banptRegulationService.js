// Manajemen Peraturan BAN-PT (tabel banpt_regulations). File disimpan di Google Drive.
//   - dokumen utama : kolom document_drive_file_id (+ document_size, document_md5)
//   - lampiran      : kolom attachments (JSONB, array)
//       Drive : [{ id, name, driveFileId, md5, mimeType, size, uploadedAt }]
//       Lama  : [{ id, name, path, mimeType, size, uploadedAt }]   (Supabase Storage, sebelum perpindahan)
//
// Kompatibilitas: data lama (document_path / attachments[].path di bucket publik Supabase) tetap terbaca
// dan tetap dihapus dengan benar. File lama berpindah ke Drive hanya saat diganti oleh admin. Unggahan
// BARU selalu ke Drive. ID Drive, path storage, dan checksum TIDAK PERNAH dikirim ke klien; klien menerima
// link route backend (/api/banpt-regulations/... untuk publik, /api/files/<token> untuk admin).
const crypto = require("crypto");
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm, escapeLikeTerm } = require("../utils/searchTerm");
const storage = require("../utils/regulationStorage");
const { uploadDriveFile, removeDriveFilesQuietly } = require("../utils/driveStorage");
const { KINDS, buildFileLinks } = require("../utils/fileAccess");

const TABLE = "banpt_regulations";
const COLUMNS =
  "id, regulation_number, regulation_year, determination_date, title, document_path, " +
  "document_drive_file_id, document_size, document_md5, attachments, status, published_at, created_at, updated_at";
const MAX_ATTACHMENTS = 20;

const UNIQUE_VIOLATION = "23505";
// check, not-null, tipe data/tanggal/angka tidak valid -> kesalahan input, bukan kesalahan server
const INPUT_ERROR_CODES = ["23514", "23502", "22P02", "22007", "22008", "22003"];
const RANGE_NOT_SATISFIABLE = "PGRST103";

const notFound = () =>
  new AppError("Peraturan BAN-PT tidak ditemukan", 404, "BANPT_REGULATION_NOT_FOUND");
const attachmentNotFound = () =>
  new AppError("Lampiran tidak ditemukan", 404, "ATTACHMENT_NOT_FOUND");
const documentNotFound = () => new AppError("Dokumen tidak ditemukan", 404, "DOCUMENT_NOT_FOUND");
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
// Lampiran valid = punya id dan salah satu sumber: file Drive (baru) atau path Supabase (lama).
const readAttachments = (row) =>
  (Array.isArray(row.attachments) ? row.attachments : []).filter(
    (a) => a && typeof a.id === "string" && (typeof a.driveFileId === "string" || typeof a.path === "string")
  );

const hasDocument = (row) => Boolean(row.document_drive_file_id || row.document_path);

const safeFileName = (value) =>
  String(value || "dokumen")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) || "dokumen";

const mainFileName = (row) => `PerBAN-${safeFileName(row.regulation_number)}-${row.regulation_year}.pdf`;

// Link file Drive. urlExpiresAt hanya ada untuk admin (link bertoken berumur 10 menit);
// link publik bersifat tetap sehingga tidak punya masa berlaku.
const driveLinks = (kind, ids, admin) => {
  const links = buildFileLinks({ kind, ...ids }, { admin });
  return {
    url: links.url,
    downloadUrl: links.downloadUrl,
    ...(admin ? { urlExpiresAt: links.expiresAt } : {}),
  };
};

const serializeMainDocument = (row, admin) => {
  if (row.document_drive_file_id) {
    return {
      mimeType: "application/pdf",
      size: row.document_size ?? null,
      ...driveLinks(KINDS.regulationDocument, { recordId: row.id }, admin),
    };
  }
  if (row.document_path) {
    return {
      mimeType: "application/pdf",
      url: storage.getPublicUrl(row.document_path),
      downloadUrl: storage.getPublicUrl(row.document_path, mainFileName(row)),
    };
  }
  return null;
};

const serializeAttachment = (row, a, admin) => {
  const base = {
    id: a.id,
    name: a.name,
    mimeType: a.mimeType || "application/pdf",
    size: a.size ?? null,
    uploadedAt: a.uploadedAt ?? null,
  };
  if (a.driveFileId) {
    return { ...base, ...driveLinks(KINDS.regulationAttachment, { recordId: row.id, attachmentId: a.id }, admin) };
  }
  return {
    ...base,
    url: storage.getPublicUrl(a.path),
    downloadUrl: storage.getPublicUrl(a.path, a.name || "lampiran.pdf"),
  };
};

const serialize = (row, { admin }) => {
  const item = {
    id: row.id,
    regulationNumber: row.regulation_number,
    regulationYear: row.regulation_year,
    determinationDate: row.determination_date,
    title: row.title,
    document: serializeMainDocument(row, admin),
    attachments: readAttachments(row).map((a) => serializeAttachment(row, a, admin)),
    publishedAt: row.published_at,
  };
  if (admin) {
    item.status = row.status;
    item.createdAt = row.created_at;
    item.updatedAt = row.updated_at;
  }
  return item;
};

// Semua file yang dimiliki satu baris, dipisah per tempat penyimpanan (untuk pembersihan).
const filesOf = (row) => {
  const attachments = readAttachments(row);
  return {
    driveIds: [row.document_drive_file_id, ...attachments.map((a) => a.driveFileId)].filter(Boolean),
    legacyPaths: [row.document_path, ...attachments.map((a) => a.path)].filter(Boolean),
  };
};

// Pembersihan best-effort (tidak pernah melempar). Drive yang gagal masuk antrean drive_cleanup_queue.
const cleanupFiles = async ({ driveIds = [], legacyPaths = [] }, context) => {
  await removeDriveFilesQuietly(driveIds, context);
  await storage.removeFilesQuietly(legacyPaths, context);
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
      requireDocumentToPublish(hasDocument(current));
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

  await cleanupFiles(filesOf(current), `${TABLE}: hapus data`);
};

// Dipakai middleware: pastikan data ada sebelum file diproses
const loadForUpload = async (id) => {
  const { data, error } = await supabase.from(TABLE).select("id").eq("id", id).maybeSingle();
  if (error) throwDbError(`${TABLE}: ambil untuk dokumen`, error);
  if (!data) throw notFound();
  return data;
};

// ---------- DOKUMEN UTAMA ----------
// Unggah file baru ke Drive -> compare-and-set kolom di database -> hapus file lama (Drive atau Supabase).
// Baris tidak pernah menunjuk ke file yang belum ada atau sudah hilang.
const adminSetDocument = async (id, processed) => {
  const current = await findRow(id, `${TABLE}: ambil untuk dokumen`);
  if (!current) throw notFound();

  const stored = await uploadDriveFile({ category: "banptRegulation", recordId: id, role: "document", processed });

  let query = supabase
    .from(TABLE)
    .update({
      document_drive_file_id: stored.fileId,
      document_path: null,
      document_size: stored.size,
      document_md5: stored.md5,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  query = current.document_path ? query.eq("document_path", current.document_path) : query.is("document_path", null);
  query = current.document_drive_file_id
    ? query.eq("document_drive_file_id", current.document_drive_file_id)
    : query.is("document_drive_file_id", null);
  const { data, error } = await query.select(COLUMNS).maybeSingle();

  if (error) {
    await cleanupFiles({ driveIds: [stored.fileId] }, `${TABLE}: kompensasi setelah DB gagal`);
    throw mapWriteError(`${TABLE}: simpan dokumen`, error);
  }
  if (!data) {
    await cleanupFiles({ driveIds: [stored.fileId] }, `${TABLE}: kompensasi karena CAS gagal`);
    throw conflict();
  }
  await cleanupFiles(
    { driveIds: [current.document_drive_file_id].filter(Boolean), legacyPaths: [current.document_path].filter(Boolean) },
    `${TABLE}: hapus dokumen lama`
  );
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

// items: [{ attachmentId, processed }]. Jika satu unggahan gagal, yang sudah terunggah dibersihkan.
// ID lampiran dibuat di muka agar ikut tersimpan di appProperties file Drive (membantu rekonsiliasi).
const uploadMany = async (id, items) => {
  const uploaded = [];
  try {
    for (const { attachmentId, processed } of items) {
      const stored = await uploadDriveFile({
        category: "banptRegulation",
        recordId: id,
        role: "attachment",
        attachmentId,
        processed,
      });
      uploaded.push({ attachmentId, processed, stored });
    }
  } catch (error) {
    await cleanupFiles({ driveIds: uploaded.map((u) => u.stored.fileId) }, `${TABLE}: kompensasi upload lampiran`);
    throw error;
  }
  return uploaded;
};

// Entri JSONB lampiran baru (sumber Drive). Sengaja dibangun dari nol, tanpa menyalin "path" lama.
const attachmentEntry = ({ attachmentId, processed, stored }, uploadedAt) => ({
  id: attachmentId,
  name: processed.displayName,
  driveFileId: stored.fileId,
  md5: stored.md5,
  mimeType: processed.mimeType,
  size: stored.size,
  uploadedAt,
});

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

  const uploaded = await uploadMany(
    id,
    processedList.map((processed) => ({ attachmentId: crypto.randomUUID(), processed }))
  );
  const now = new Date().toISOString();
  const added = uploaded.map((u) => attachmentEntry(u, now));
  const addedIds = added.map((a) => a.driveFileId);

  const { data, error } = await casAttachments(current, [...existing, ...added]);
  if (error) {
    await cleanupFiles({ driveIds: addedIds }, `${TABLE}: kompensasi setelah DB gagal`);
    throw mapWriteError(`${TABLE}: simpan lampiran`, error);
  }
  if (!data) {
    await cleanupFiles({ driveIds: addedIds }, `${TABLE}: kompensasi karena CAS gagal`);
    throw conflict();
  }
  return serialize(data, { admin: true });
};

// ID lampiran dipertahankan; lampiran lama (Supabase) yang diganti otomatis berpindah ke Drive.
const adminReplaceAttachment = async (id, attachmentId, processed) => {
  const current = await findRow(id, `${TABLE}: ambil untuk lampiran`);
  if (!current) throw notFound();
  const existing = readAttachments(current);
  const index = existing.findIndex((a) => a.id === attachmentId);
  if (index < 0) throw attachmentNotFound();

  const old = existing[index];
  const [uploaded] = await uploadMany(id, [{ attachmentId, processed }]);
  const next = [...existing];
  next[index] = attachmentEntry(uploaded, new Date().toISOString());

  const { data, error } = await casAttachments(current, next);
  if (error) {
    await cleanupFiles({ driveIds: [uploaded.stored.fileId] }, `${TABLE}: kompensasi setelah DB gagal`);
    throw mapWriteError(`${TABLE}: ganti lampiran`, error);
  }
  if (!data) {
    await cleanupFiles({ driveIds: [uploaded.stored.fileId] }, `${TABLE}: kompensasi karena CAS gagal`);
    throw conflict();
  }
  await cleanupFiles(
    { driveIds: [old.driveFileId].filter(Boolean), legacyPaths: [old.path].filter(Boolean) },
    `${TABLE}: hapus lampiran lama`
  );
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

  await cleanupFiles(
    { driveIds: [target.driveFileId].filter(Boolean), legacyPaths: [target.path].filter(Boolean) },
    `${TABLE}: hapus file lampiran`
  );
  return serialize(data, { admin: true });
};

// ---------- PREVIEW / DOWNLOAD (dipakai fileController) ----------
// attachmentId = null -> dokumen utama.
//   published=true  -> jalur publik: draft / belum waktunya terbit dijawab 404 seperti data tidak ada
//   published=false -> jalur admin (token berumur pendek): boleh data draft
// File lama (Supabase) tidak lewat sini (masih memakai URL publik Supabase) -> 404 DOCUMENT_NOT_FOUND.
const getDriveFile = async (id, attachmentId, { published }) => {
  let query = supabase.from(TABLE).select(COLUMNS).eq("id", id);
  if (published) query = publishedOnly(query);
  const { data, error } = await query.maybeSingle();
  if (error) throwDbError(`${TABLE}: ambil file`, error);
  if (!data) throw notFound();

  if (!attachmentId) {
    if (!data.document_drive_file_id) throw documentNotFound();
    return {
      driveFileId: data.document_drive_file_id,
      mimeType: "application/pdf",
      fileName: mainFileName(data),
      size: data.document_size ?? null,
    };
  }

  const attachment = readAttachments(data).find((a) => a.id === attachmentId);
  if (!attachment) throw attachmentNotFound();
  if (!attachment.driveFileId) throw documentNotFound();
  return {
    driveFileId: attachment.driveFileId,
    mimeType: attachment.mimeType || "application/pdf",
    fileName: attachment.name || "lampiran.pdf",
    size: attachment.size ?? null,
  };
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
  getDriveFile,
  listFilterOptions,
};
