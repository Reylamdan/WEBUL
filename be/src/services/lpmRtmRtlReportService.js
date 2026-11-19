const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm, escapeLikeTerm } = require("../utils/searchTerm");
const {
  uploadDriveFile,
  removeDriveFilesQuietly,
} = require("../utils/driveStorage");
const { KINDS, buildFileLinks } = require("../utils/fileAccess");

const TABLE = "lpm_rtm_rtl_reports";

const COLUMNS = [
  "id",
  "year",
  "title",
  "description",
  "file_name",
  "file_mime_type",
  "file_size",
  "file_drive_file_id",
  "file_md5",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const UNIQUE_VIOLATION = "23505";
const INPUT_ERROR_CODES = ["23514", "23502", "22P02", "22007", "22008", "22003"];
const RANGE_NOT_SATISFIABLE = "PGRST103";

// ---------- ERROR ----------

const notFound = () =>
  new AppError("Laporan RTM & RTL tidak ditemukan", 404, "LPM_RTM_RTL_REPORT_NOT_FOUND");

const documentNotFound = () =>
  new AppError("Dokumen laporan tidak ditemukan", 404, "DOCUMENT_NOT_FOUND");

const conflict = () =>
  new AppError("Data berubah, silakan coba lagi", 409, "LPM_RTM_RTL_REPORT_CONFLICT");

const mapWriteError = (context, error) => {
  if (error.code === UNIQUE_VIOLATION) {
    return new AppError(
      "Laporan untuk tahun tersebut sudah ada",
      409,
      "LPM_RTM_RTL_REPORT_DUPLICATE_YEAR"
    );
  }

  if (INPUT_ERROR_CODES.includes(error.code)) {
    return new AppError("Data laporan yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }

  try {
    throwDbError(context, error);
  } catch (appError) {
    return appError;
  }

  return error;
};

// ---------- SERIALISASI ----------

const hasDocument = (row) => Boolean(row.file_drive_file_id);

const getFileType = (mimeType, fileName) => {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();

  if (mime === "application/pdf" || name.endsWith(".pdf")) return "PDF";

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "DOCX";
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    name.endsWith(".xlsx")
  ) {
    return "XLSX";
  }

  return null;
};

const driveLinks = (row, admin) => {
  const links = buildFileLinks(
    { kind: KINDS.lpmRtmRtlReportDocument, recordId: row.id },
    { admin }
  );

  return {
    url: links.url,
    downloadUrl: links.downloadUrl,
    ...(admin ? { urlExpiresAt: links.expiresAt } : {}),
  };
};

const serialize = (row, { admin }) => {
  const item = {
    id: row.id,
    year: row.year,
    title: row.title,
    description: row.description || "",
    fileName: row.file_name,
    fileType: getFileType(row.file_mime_type, row.file_name),
    fileSize: row.file_size ?? null,
    file: hasDocument(row)
      ? {
          mimeType: row.file_mime_type,
          size: row.file_size ?? null,
          ...driveLinks(row, admin),
        }
      : null,
  };

  if (admin) {
    item.status = row.status;
    item.createdAt = row.created_at;
    item.updatedAt = row.updated_at;
  }

  return item;
};

const cleanupFiles = (driveIds, context) =>
  removeDriveFilesQuietly((driveIds || []).filter(Boolean), context);

const findRow = async (id, context) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError(context, error);

  return data;
};

// Compare-and-set pada file Drive agar tidak menimpa perubahan dokumen yang berjalan bersamaan.
const casOnFile = (query, current) =>
  current.file_drive_file_id
    ? query.eq("file_drive_file_id", current.file_drive_file_id)
    : query.is("file_drive_file_id", null);

// ---------- PUBLIK ----------

// Jumlah laporan kecil (satu per tahun): semua yang published, tanpa pagination.
const publicList = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("status", "published")
    .order("year", { ascending: false })
    .limit(200);

  if (error) throwDbError(`public ${TABLE}: daftar`, error);

  return { items: (data || []).map((row) => serialize(row, { admin: false })) };
};

const publicGetBy = async (column, value) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("status", "published")
    .eq(column, value)
    .maybeSingle();

  if (error) throwDbError(`public ${TABLE}: detail`, error);
  if (!data) throw notFound();

  return serialize(data, { admin: false });
};

const publicGet = (id) => publicGetBy("id", id);
const publicGetByYear = (year) => publicGetBy("year", year);

// ---------- ADMIN ----------

const adminList = async ({ page, limit, search, status }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const build = (q) => {
    let query = q;
    const term = search ? cleanSearchTerm(search) : "";

    if (term) {
      const escaped = escapeLikeTerm(term);
      const parts = [
        `title.ilike.%${escaped}%`,
        `description.ilike.%${escaped}%`,
        `file_name.ilike.%${escaped}%`,
      ];

      if (/^\d{4}$/.test(term)) parts.push(`year.eq.${term}`);

      query = query.or(parts.join(","));
    }

    if (status) query = query.eq("status", status);

    return query;
  };

  let { data, count, error } = await build(
    supabase.from(TABLE).select(COLUMNS, { count: "exact" })
  )
    .order("year", { ascending: false })
    .range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await build(
      supabase.from(TABLE).select("id", { count: "exact", head: true })
    );

    if (counted.error) throwDbError(`${TABLE}: hitung total`, counted.error);

    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError(`${TABLE}: admin daftar`, error);

  const total = count ?? 0;

  return {
    items: (data || []).map((row) => serialize(row, { admin: true })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const adminGet = async (id) => {
  const row = await findRow(id, `${TABLE}: detail`);
  if (!row) throw notFound();

  return serialize(row, { admin: true });
};

const adminCreate = async (body) => {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      year: body.year,
      title: body.title,
      description: body.description || "",
      status: body.status || "draft",
    })
    .select(COLUMNS)
    .single();

  if (error) throw mapWriteError(`${TABLE}: buat`, error);

  return serialize(data, { admin: true });
};

const adminUpdate = async (id, body) => {
  const patch = {};

  for (const field of ["year", "title", "description", "status"]) {
    if (body[field] !== undefined) patch[field] = body[field];
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

const adminDelete = async (id) => {
  const current = await findRow(id, `${TABLE}: ambil untuk hapus`);
  if (!current) throw notFound();

  const { data, error } = await casOnFile(
    supabase.from(TABLE).delete().eq("id", id),
    current
  ).select("id");

  if (error) throwDbError(`${TABLE}: hapus`, error);

  if (!data || data.length === 0) {
    if (!(await findRow(id, `${TABLE}: periksa konflik hapus`))) throw notFound();
    throw conflict();
  }

  await cleanupFiles([current.file_drive_file_id], `${TABLE}: hapus laporan`);
};

// ---------- DOKUMEN (GOOGLE DRIVE) ----------

const loadForUpload = async (id) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError(`${TABLE}: ambil untuk dokumen`, error);
  if (!data) throw notFound();

  return data;
};

// Unggah ke Drive -> compare-and-set di DB -> hapus file lama.
const adminSetDocument = async (id, processed) => {
  const current = await findRow(id, `${TABLE}: ambil untuk dokumen`);
  if (!current) throw notFound();

  const stored = await uploadDriveFile({
    category: "lpmRtmRtlReport",
    recordId: id,
    role: "document",
    processed,
  });

  const { data, error } = await casOnFile(
    supabase
      .from(TABLE)
      .update({
        file_name: processed.displayName,
        file_mime_type: processed.mimeType,
        file_size: stored.size,
        file_drive_file_id: stored.fileId,
        file_md5: stored.md5,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
    current
  )
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    await cleanupFiles([stored.fileId], `${TABLE}: kompensasi setelah DB gagal`);
    throw mapWriteError(`${TABLE}: simpan dokumen`, error);
  }

  if (!data) {
    await cleanupFiles([stored.fileId], `${TABLE}: kompensasi karena CAS gagal`);
    throw conflict();
  }

  await cleanupFiles([current.file_drive_file_id], `${TABLE}: hapus dokumen lama`);

  return serialize(data, { admin: true });
};

// Hapus dokumen saja. Status tidak berubah: FE menampilkan "arsip belum tersedia".
const adminRemoveDocument = async (id) => {
  const current = await findRow(id, `${TABLE}: ambil untuk hapus dokumen`);
  if (!current) throw notFound();
  if (!hasDocument(current)) throw documentNotFound();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      file_name: null,
      file_mime_type: null,
      file_size: null,
      file_drive_file_id: null,
      file_md5: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("file_drive_file_id", current.file_drive_file_id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw mapWriteError(`${TABLE}: hapus dokumen`, error);
  if (!data) throw conflict();

  await cleanupFiles([current.file_drive_file_id], `${TABLE}: hapus dokumen`);

  return serialize(data, { admin: true });
};

// published=true : hanya laporan published. published=false: akses admin via token (termasuk draf).
const getDriveFile = async (id, _attachmentId, { published }) => {
  let query = supabase.from(TABLE).select(COLUMNS).eq("id", id);

  if (published) query = query.eq("status", "published");

  const { data, error } = await query.maybeSingle();

  if (error) throwDbError(`${TABLE}: ambil file`, error);
  if (!data) throw notFound();
  if (!data.file_drive_file_id) throw documentNotFound();

  return {
    driveFileId: data.file_drive_file_id,
    mimeType: data.file_mime_type,
    fileName: data.file_name || "dokumen",
    size: data.file_size ?? null,
  };
};

module.exports = {
  publicList,
  publicGet,
  publicGetByYear,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminDelete,
  loadForUpload,
  adminSetDocument,
  adminRemoveDocument,
  getDriveFile,
};
