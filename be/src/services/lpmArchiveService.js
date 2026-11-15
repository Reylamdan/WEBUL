
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm, escapeLikeTerm } = require("../utils/searchTerm");
const {
  uploadDriveFile,
  removeDriveFilesQuietly,
} = require("../utils/driveStorage");
const { KINDS, buildFileLinks } = require("../utils/fileAccess");

const TABLE = "lpm_archives";

const COLUMNS = [
  "id",
  "title",
  "category",
  "year",
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

const CATEGORIES = [
  "Audit Mutu Internal",
  "RTM & RTL",
  "Laporan Tahunan",
  "Penjaminan Mutu",
  "Dokumen Pendukung",
];

const UNIQUE_VIOLATION = "23505";

const INPUT_ERROR_CODES = [
  "23514",
  "23502",
  "22P02",
  "22007",
  "22008",
  "22003",
];

const RANGE_NOT_SATISFIABLE = "PGRST103";

const PAGE_SIZE = 1000;

// ---------- ERROR ----------

const notFound = () =>
  new AppError(
    "Arsip LPM tidak ditemukan",
    404,
    "LPM_ARCHIVE_NOT_FOUND"
  );

const documentNotFound = () =>
  new AppError(
    "Dokumen arsip tidak ditemukan",
    404,
    "DOCUMENT_NOT_FOUND"
  );

const conflict = () =>
  new AppError(
    "Data berubah, silakan coba lagi",
    409,
    "LPM_ARCHIVE_CONFLICT"
  );

const requireDocumentToPublish = (hasDocument) => {
  if (!hasDocument) {
    throw new AppError(
      "Dokumen wajib diunggah sebelum arsip dipublikasikan",
      400,
      "DOCUMENT_REQUIRED_TO_PUBLISH"
    );
  }
};

const mapWriteError = (context, error) => {
  if (error.code === UNIQUE_VIOLATION) {
    return new AppError(
      "Arsip dengan data yang sama sudah ada",
      409,
      "LPM_ARCHIVE_DUPLICATE"
    );
  }

  if (INPUT_ERROR_CODES.includes(error.code)) {
    return new AppError(
      "Data arsip yang dikirim tidak valid",
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

const hasDocument = (row) =>
  Boolean(row.file_drive_file_id);

const getFileType = (mimeType, fileName) => {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();

  if (
    mime === "application/pdf" ||
    name.endsWith(".pdf")
  ) {
    return "PDF";
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "DOCX";
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    name.endsWith(".xlsx")
  ) {
    return "XLSX";
  }

  return null;
};

const driveLinks = (row, admin) => {
  const links = buildFileLinks(
    {
      kind: KINDS.lpmArchiveDocument,
      recordId: row.id,
    },
    { admin }
  );

  return {
    url: links.url,
    downloadUrl: links.downloadUrl,
    ...(admin
      ? { urlExpiresAt: links.expiresAt }
      : {}),
  };
};

const serialize = (row, { admin }) => {
  const item = {
    id: row.id,
    title: row.title,
    category: row.category,
    year: row.year,
    date: row.date,
    description: row.description || "",
    fileName: row.file_name,
    fileType: getFileType(
      row.file_mime_type,
      row.file_name
    ),
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

const cleanupFiles = async (driveIds, context) => {
  await removeDriveFilesQuietly(
    (driveIds || []).filter(Boolean),
    context
  );
};

// ---------- QUERY ----------

const ORDER = (query) =>
  query
    .order("date", { ascending: false })
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

const applyFilters = (
  query,
  { search, category, year }
) => {
  let q = query;

  const term = search
    ? cleanSearchTerm(search)
    : "";

  if (term) {
    const escaped = escapeLikeTerm(term);

    const parts = [
      `title.ilike.%${escaped}%`,
      `description.ilike.%${escaped}%`,
      `file_name.ilike.%${escaped}%`,
    ];

    if (/^\d{4}$/.test(term)) {
      parts.push(`year.eq.${term}`);
    }

    q = q.or(parts.join(","));
  }

  if (category) {
    q = q.eq("category", category);
  }

  if (year) {
    q = q.eq("year", year);
  }

  return q;
};

const publishedOnly = (query) =>
  query
    .eq("status", "published")
    .lte(
      "published_at",
      new Date().toISOString()
    );

const paginatedList = async ({
  page,
  limit,
  build,
  admin,
  context,
}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let { data, count, error } = await ORDER(
    build(
      supabase
        .from(TABLE)
        .select(COLUMNS, { count: "exact" })
    )
  ).range(from, to);

  if (
    error &&
    error.code === RANGE_NOT_SATISFIABLE
  ) {
    const counted = await build(
      supabase
        .from(TABLE)
        .select("id", {
          count: "exact",
          head: true,
        })
    );

    if (counted.error) {
      throwDbError(
        `${context}: hitung total`,
        counted.error
      );
    }

    data = [];
    count = counted.count ?? 0;
    error = null;
  }

  if (error) {
    throwDbError(`${context}: daftar`, error);
  }

  const total = count ?? 0;

  return {
    items: (data || []).map((row) =>
      serialize(row, { admin })
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const findRow = async (id, context) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwDbError(context, error);
  }

  return data;
};

// ---------- PUBLIK ----------

const publicList = (query) =>
  paginatedList({
    page: query.page,
    limit: query.limit,
    admin: false,
    context: `public ${TABLE}`,
    build: (q) =>
      applyFilters(
        publishedOnly(q),
        query
      ),
  });

const publicGet = async (id) => {
  const { data, error } = await publishedOnly(
    supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
  ).maybeSingle();

  if (error) {
    throwDbError(
      `public ${TABLE}: detail`,
      error
    );
  }

  if (!data) {
    throw notFound();
  }

  return serialize(data, { admin: false });
};

// ---------- ADMIN ----------

const adminList = (query) =>
  paginatedList({
    page: query.page,
    limit: query.limit,
    admin: true,
    context: `${TABLE}: admin`,
    build: (q) => {
      const filtered = query.status
        ? q.eq("status", query.status)
        : q;

      return applyFilters(filtered, query);
    },
  });

const adminGet = async (id) => {
  const row = await findRow(
    id,
    `${TABLE}: detail`
  );

  if (!row) {
    throw notFound();
  }

  return serialize(row, { admin: true });
};

// Membuat arsip baru.
// Arsip baru selalu dibuat sebagai draft karena belum memiliki dokumen.
const adminCreate = async (body) => {
  const status = body.status || "draft";

  if (status === "published") {
    throw new AppError(
      "Unggah dokumen terlebih dahulu sebelum mempublikasikan arsip",
      400,
      "DOCUMENT_REQUIRED_TO_PUBLISH"
    );
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: body.title,
      category: body.category,
      year: body.year,
      date: body.date,
      description: body.description || "",
      file_name: null,
      file_mime_type: null,
      file_size: null,
      file_drive_file_id: null,
      file_md5: null,
      status: "draft",
      published_at: null,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    throw mapWriteError(
      `${TABLE}: buat`,
      error
    );
  }

  return serialize(data, { admin: true });
};

// Memperbarui metadata dan status arsip.
const adminUpdate = async (id, body) => {
  const current = await findRow(
    id,
    `${TABLE}: ambil untuk update`
  );

  if (!current) {
    throw notFound();
  }

  const patch = {};

  if (body.title !== undefined) {
    patch.title = body.title;
  }

  if (body.category !== undefined) {
    patch.category = body.category;
  }

  if (body.year !== undefined) {
    patch.year = body.year;
  }

  if (body.date !== undefined) {
    patch.date = body.date;
  }

  if (body.description !== undefined) {
    patch.description = body.description;
  }

  if (body.status !== undefined) {
    if (body.status === "published") {
      requireDocumentToPublish(
        hasDocument(current)
      );

      if (!current.published_at) {
        patch.published_at =
          new Date().toISOString();
      }
    } else {
      patch.published_at = null;
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

  if (error) {
    throw mapWriteError(
      `${TABLE}: perbarui`,
      error
    );
  }

  if (!data) {
    throw notFound();
  }

  return serialize(data, { admin: true });
};

// Menghapus arsip beserta file Drive terkait.
const adminDelete = async (id) => {
  const current = await findRow(
    id,
    `${TABLE}: ambil untuk hapus`
  );

  if (!current) {
    throw notFound();
  }

  let query = supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  // Pastikan dokumen belum berubah sejak record dibaca.
  query = current.file_drive_file_id
    ? query.eq(
        "file_drive_file_id",
        current.file_drive_file_id
      )
    : query.is(
        "file_drive_file_id",
        null
      );

  const { data, error } = await query
    .select("id");

  if (error) {
    throwDbError(`${TABLE}: hapus`, error);
  }

  if (!data || data.length === 0) {
    const latest = await findRow(
      id,
      `${TABLE}: periksa konflik hapus`
    );

    if (!latest) {
      throw notFound();
    }

    throw conflict();
  }

  await cleanupFiles(
    [current.file_drive_file_id],
    `${TABLE}: hapus arsip`
  );
};

// ---------- UPLOAD DOKUMEN ----------

// Memastikan arsip tersedia sebelum proses upload dimulai.
const loadForUpload = async (id) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwDbError(
      `${TABLE}: ambil untuk dokumen`,
      error
    );
  }

  if (!data) {
    throw notFound();
  }

  return data;
};

// Upload file baru ke Drive, kemudian update database.
// File lama dihapus setelah database berhasil menunjuk file baru.
const adminSetDocument = async (id, processed) => {
  const current = await findRow(
    id,
    `${TABLE}: ambil untuk dokumen`
  );

  if (!current) {
    throw notFound();
  }

  const stored = await uploadDriveFile({
    category: "lpmArchive",
    recordId: id,
    role: "document",
    processed,
  });

  const patch = {
    file_name: processed.displayName,
    file_mime_type: processed.mimeType,
    file_size: stored.size,
    file_drive_file_id: stored.fileId,
    file_md5: stored.md5,
    updated_at: new Date().toISOString(),
  };

  let query = supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id);

  // Compare-and-set untuk mencegah konflik penggantian file.
  query = current.file_drive_file_id
    ? query.eq(
        "file_drive_file_id",
        current.file_drive_file_id
      )
    : query.is(
        "file_drive_file_id",
        null
      );

  const { data, error } = await query
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    await cleanupFiles(
      [stored.fileId],
      `${TABLE}: kompensasi setelah DB gagal`
    );

    throw mapWriteError(
      `${TABLE}: simpan dokumen`,
      error
    );
  }

  if (!data) {
    await cleanupFiles(
      [stored.fileId],
      `${TABLE}: kompensasi karena CAS gagal`
    );

    throw conflict();
  }

  await cleanupFiles(
    [current.file_drive_file_id],
    `${TABLE}: hapus dokumen lama`
  );

  return serialize(data, { admin: true });
};

// ---------- PREVIEW / DOWNLOAD ----------

// published=true:
// Hanya arsip yang sudah published dan waktu terbitnya sudah tiba.
//
// published=false:
// Akses admin melalui token, termasuk arsip draft.
const getDriveFile = async (
  id,
  _attachmentId,
  { published }
) => {
  let query = supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("id", id);

  if (published) {
    query = publishedOnly(query);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throwDbError(
      `${TABLE}: ambil file`,
      error
    );
  }

  if (!data) {
    throw notFound();
  }

  if (!data.file_drive_file_id) {
    throw documentNotFound();
  }

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

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {
    let query = supabase
      .from(TABLE)
      .select("year");

    if (!admin) {
      query = publishedOnly(query);
    }

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (
        error.code === RANGE_NOT_SATISFIABLE
      ) {
        break;
      }

      throwDbError(
        `${TABLE}: opsi filter`,
        error
      );
    }

    for (const row of data || []) {
      if (Number.isInteger(Number(row.year))) {
        years.add(Number(row.year));
      }
    }

    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }

  return {
    categories: CATEGORIES,
    years: [...years].sort((a, b) => b - a),
  };
};

// ---------- EXPORT ----------

module.exports = {
  CATEGORIES,
  publicList,
  publicGet,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminDelete,
  loadForUpload,
  adminSetDocument,
  getDriveFile,
  listFilterOptions,
};
