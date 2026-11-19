const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm, escapeLikeTerm } = require("../utils/searchTerm");
const {
  uploadDriveFile,
  removeDriveFilesQuietly,
} = require("../utils/driveStorage");
const { KINDS, buildFileLinks } = require("../utils/fileAccess");

const TABLE = "lpm_benchmarkings";

const COLUMNS = [
  "id",
  "title",
  "institution",
  "label",
  "date",
  "description",
  "file_name",
  "file_mime_type",
  "file_size",
  "file_drive_file_id",
  "file_md5",
  "status",
  "published_at",
  "created_at",
  "updated_at",
].join(", ");

const UNIQUE_VIOLATION = "23505";
const INPUT_ERROR_CODES = ["23514", "23502", "22P02", "22007", "22008", "22003"];
const RANGE_NOT_SATISFIABLE = "PGRST103";
const PAGE_SIZE = 1000;

// ---------- ERROR ----------

const notFound = () =>
  new AppError("Data benchmarking tidak ditemukan", 404, "LPM_BENCHMARKING_NOT_FOUND");

const documentNotFound = () =>
  new AppError("Dokumen benchmarking tidak ditemukan", 404, "DOCUMENT_NOT_FOUND");

const conflict = () =>
  new AppError("Data berubah, silakan coba lagi", 409, "LPM_BENCHMARKING_CONFLICT");

const requireDocumentToPublish = (has) => {
  if (!has) {
    throw new AppError(
      "Dokumen wajib diunggah sebelum benchmarking dipublikasikan",
      400,
      "DOCUMENT_REQUIRED_TO_PUBLISH"
    );
  }
};

const mapWriteError = (context, error) => {
  if (error.code === UNIQUE_VIOLATION) {
    return new AppError(
      "Data benchmarking yang sama sudah ada",
      409,
      "LPM_BENCHMARKING_DUPLICATE"
    );
  }

  if (INPUT_ERROR_CODES.includes(error.code)) {
    return new AppError(
      "Data benchmarking yang dikirim tidak valid",
      400,
      "VALIDATION_ERROR"
    );
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
    { kind: KINDS.lpmBenchmarkingDocument, recordId: row.id },
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
    title: row.title,
    institution: row.institution || "",
    label: row.label || "",
    date: row.date,
    year: row.date ? Number(String(row.date).slice(0, 4)) : null,
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
    item.publishedAt = row.published_at;
    item.createdAt = row.created_at;
    item.updatedAt = row.updated_at;
  }

  return item;
};

// ---------- CLEANUP GOOGLE DRIVE ----------

const cleanupFiles = (driveIds, context) =>
  removeDriveFilesQuietly((driveIds || []).filter(Boolean), context);

// ---------- QUERY ----------

const ORDER = (query) =>
  query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

const applyFilters = (query, { search, year }) => {
  let q = query;
  const term = search ? cleanSearchTerm(search) : "";

  if (term) {
    const escaped = escapeLikeTerm(term);

    q = q.or(
      [
        `title.ilike.%${escaped}%`,
        `institution.ilike.%${escaped}%`,
        `description.ilike.%${escaped}%`,
        `file_name.ilike.%${escaped}%`,
      ].join(",")
    );
  }

  if (year) {
    q = q.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  }

  return q;
};

const publishedOnly = (query) =>
  query
    .eq("status", "published")
    .lte("published_at", new Date().toISOString());

const paginatedList = async ({ page, limit, build, admin, context }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let { data, count, error } = await ORDER(
    build(supabase.from(TABLE).select(COLUMNS, { count: "exact" }))
  ).range(from, to);

  // Halaman di luar jangkauan: kembalikan list kosong dengan total yang benar.
  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await build(
      supabase.from(TABLE).select("id", { count: "exact", head: true })
    );

    if (counted.error) {
      throwDbError(`${context}: hitung total`, counted.error);
    }

    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) throwDbError(`${context}: daftar`, error);

  const total = count ?? 0;

  return {
    items: (data || []).map((row) => serialize(row, { admin })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const findRow = async (id, context) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError(context, error);

  return data;
};

// ---------- PUBLIK ----------

const publicList = (query) =>
  paginatedList({
    page: query.page,
    limit: query.limit,
    admin: false,
    context: `public ${TABLE}`,
    build: (q) => applyFilters(publishedOnly(q), query),
  });

const publicGet = async (id) => {
  const { data, error } = await publishedOnly(
    supabase.from(TABLE).select(COLUMNS).eq("id", id)
  ).maybeSingle();

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
    build: (q) =>
      applyFilters(query.status ? q.eq("status", query.status) : q, query),
  });

const adminGet = async (id) => {
  const row = await findRow(id, `${TABLE}: detail`);
  if (!row) throw notFound();

  return serialize(row, { admin: true });
};

// Selalu draft: dokumen belum ada saat dibuat.
const adminCreate = async (body) => {
  if (body.status === "published") {
    throw new AppError(
      "Unggah dokumen terlebih dahulu sebelum mempublikasikan benchmarking",
      400,
      "DOCUMENT_REQUIRED_TO_PUBLISH"
    );
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: body.title,
      institution: body.institution || "",
      label: body.label || "",
      date: body.date,
      description: body.description || "",
      status: "draft",
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

  for (const field of ["title", "institution", "label", "date", "description"]) {
    if (body[field] !== undefined) patch[field] = body[field];
  }

  if (body.status !== undefined) {
    if (body.status === "published") {
      requireDocumentToPublish(hasDocument(current));

      if (!current.published_at) {
        patch.published_at = new Date().toISOString();
      }
    } else {
      patch.published_at = null;
    }

    patch.status = body.status;
  }

  patch.updated_at = new Date().toISOString();

  // Compare-and-set pada file: cegah publish jika dokumen dihapus bersamaan.
  let query = supabase.from(TABLE).update(patch).eq("id", id);

  query = current.file_drive_file_id
    ? query.eq("file_drive_file_id", current.file_drive_file_id)
    : query.is("file_drive_file_id", null);

  const { data, error } = await query.select(COLUMNS).maybeSingle();

  if (error) throw mapWriteError(`${TABLE}: perbarui`, error);

  if (!data) {
    if (!(await findRow(id, `${TABLE}: periksa konflik update`))) {
      throw notFound();
    }

    throw conflict();
  }

  return serialize(data, { admin: true });
};

const adminDelete = async (id) => {
  const current = await findRow(id, `${TABLE}: ambil untuk hapus`);
  if (!current) throw notFound();

  let query = supabase.from(TABLE).delete().eq("id", id);

  query = current.file_drive_file_id
    ? query.eq("file_drive_file_id", current.file_drive_file_id)
    : query.is("file_drive_file_id", null);

  const { data, error } = await query.select("id");

  if (error) throwDbError(`${TABLE}: hapus`, error);

  if (!data || data.length === 0) {
    if (!(await findRow(id, `${TABLE}: periksa konflik hapus`))) {
      throw notFound();
    }

    throw conflict();
  }

  await cleanupFiles([current.file_drive_file_id], `${TABLE}: hapus data`);
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
    category: "lpmBenchmarking",
    recordId: id,
    role: "document",
    processed,
  });

  let query = supabase
    .from(TABLE)
    .update({
      file_name: processed.displayName,
      file_mime_type: processed.mimeType,
      file_size: stored.size,
      file_drive_file_id: stored.fileId,
      file_md5: stored.md5,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  query = current.file_drive_file_id
    ? query.eq("file_drive_file_id", current.file_drive_file_id)
    : query.is("file_drive_file_id", null);

  const { data, error } = await query.select(COLUMNS).maybeSingle();

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

// Hapus dokumen saja. Jika sedang published, otomatis kembali ke draft.
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
      status: "draft",
      published_at: null,
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

// published=true : hanya data published dan waktu terbitnya sudah tiba.
// published=false: akses admin via token (termasuk draft).
const getDriveFile = async (id, _attachmentId, { published }) => {
  let query = supabase.from(TABLE).select(COLUMNS).eq("id", id);

  if (published) query = publishedOnly(query);

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

// ---------- OPSI FILTER ----------

const listFilterOptions = async ({ admin }) => {
  const years = new Set();

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(TABLE).select("date");

    if (!admin) query = publishedOnly(query);

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (error.code === RANGE_NOT_SATISFIABLE) break;
      throwDbError(`${TABLE}: opsi filter`, error);
    }

    for (const row of data || []) {
      const year = Number(String(row.date || "").slice(0, 4));
      if (Number.isInteger(year)) years.add(year);
    }

    if (!data || data.length < PAGE_SIZE) break;
  }

  return { years: [...years].sort((a, b) => b - a) };
};

module.exports = {
  publicList,
  publicGet,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminDelete,
  loadForUpload,
  adminSetDocument,
  adminRemoveDocument,
  getDriveFile,
  listFilterOptions,
};
