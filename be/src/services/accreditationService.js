// Logika bersama untuk dua jenis data BAN-PT yang dikelola TERPISAH:
//   - institution   -> tabel accreditation_institutions
//   - studyProgram  -> tabel accreditation_study_programs
// Keduanya punya aturan yang sama (status publikasi, dokumen SK di Storage privat),
// sehingga logikanya ditulis satu kali dan diparameterkan lewat ENTITIES.
const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm, escapeLikeTerm } = require("../utils/searchTerm");
const {
  EXPIRY_STATUSES,
  getExpiryBoundaries,
  computeExpiryStatus,
  computeDaysUntilExpiry,
} = require("../utils/accreditationExpiry");
const {
  buildDocumentPath,
  uploadDocumentObject,
  removeDocumentObjectQuietly,
  createDocumentSignedUrl,
} = require("../utils/documentStorage");
const { DEFAULT_INSTITUTION_NAME, DEFAULT_ISSUER } = require("../validators/accreditationValidator");

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const RANGE_NOT_SATISFIABLE = "PGRST103";

// Kolom dokumen & umum. Path storage (document_path) TIDAK PERNAH dikirim ke klien.
const COMMON_COLUMNS =
  "rank, sk_number, decision_date, valid_from, valid_until, issuing_body, " +
  "document_path, document_name, document_mime, document_size, " +
  "status, published_at, created_at, updated_at";

const ENTITIES = {
  institution: {
    table: "accreditation_institutions",
    folder: "institutions",
    label: "Akreditasi institusi",
    notFoundCode: "ACCREDITATION_INSTITUTION_NOT_FOUND",
    columns: `id, institution_name, ${COMMON_COLUMNS}`,
    searchColumns: ["institution_name", "sk_number", "rank"],
    // camelCase body -> kolom database
    bodyMap: {
      institutionName: "institution_name",
      rank: "rank",
      skNumber: "sk_number",
      decisionDate: "decision_date",
      validFrom: "valid_from",
      validUntil: "valid_until",
      issuingBody: "issuing_body",
    },
    ownFields: (row) => ({ institutionName: row.institution_name }),
    defaults: { institution_name: DEFAULT_INSTITUTION_NAME, issuing_body: DEFAULT_ISSUER },
    order: (q) =>
      q
        .order("valid_until", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
  },
  studyProgram: {
    table: "accreditation_study_programs",
    folder: "study-programs",
    label: "Akreditasi program studi",
    notFoundCode: "ACCREDITATION_STUDY_PROGRAM_NOT_FOUND",
    columns: `id, program_name, education_level, faculty, ${COMMON_COLUMNS}`,
    searchColumns: ["program_name", "faculty", "sk_number", "rank"],
    bodyMap: {
      programName: "program_name",
      educationLevel: "education_level",
      faculty: "faculty",
      rank: "rank",
      skNumber: "sk_number",
      decisionDate: "decision_date",
      validFrom: "valid_from",
      validUntil: "valid_until",
      issuingBody: "issuing_body",
    },
    ownFields: (row) => ({
      programName: row.program_name,
      educationLevel: row.education_level,
      faculty: row.faculty ?? null,
    }),
    // Dihitung dari valid_until saat request (bukan kolom database)
    computedFields: (row) => ({
      expiryStatus: computeExpiryStatus(row.valid_until),
      daysUntilExpiry: computeDaysUntilExpiry(row.valid_until),
    }),
    defaults: { issuing_body: DEFAULT_ISSUER },
    order: (q) =>
      q
        .order("program_name", { ascending: true })
        .order("valid_until", { ascending: false, nullsFirst: false })
        .order("id", { ascending: true }),
  },
};

const notFound = (entity) => new AppError(`${entity.label} tidak ditemukan`, 404, entity.notFoundCode);

// ---------- serialisasi ----------
const serializeDocument = async (row) => {
  if (!row.document_path) return null;
  const signed = await createDocumentSignedUrl(row.document_path);
  return {
    name: row.document_name,
    mimeType: row.document_mime,
    size: row.document_size,
    url: signed ? signed.url : null,
    urlExpiresAt: signed ? signed.expiresAt : null,
  };
};

const serialize = async (entity, row, { admin }) => {
  const item = {
    id: row.id,
    ...entity.ownFields(row),
    rank: row.rank,
    skNumber: row.sk_number,
    decisionDate: row.decision_date,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    issuingBody: row.issuing_body,
    ...(entity.computedFields ? entity.computedFields(row) : {}),
    document: await serializeDocument(row),
    publishedAt: row.published_at,
  };
  if (admin) {
    item.status = row.status;
    item.createdAt = row.created_at;
    item.updatedAt = row.updated_at;
  }
  return item;
};

const serializeMany = (entity, rows, opts) => Promise.all(rows.map((row) => serialize(entity, row, opts)));

// ---------- helper query ----------
const applySearch = (entity, query, rawTerm) => {
  const term = rawTerm ? cleanSearchTerm(rawTerm) : "";
  if (!term) return query;
  return query.or(entity.searchColumns.map((c) => `${c}.ilike.%${term}%`).join(","));
};

const isStudyProgram = (entity) => entity.table === ENTITIES.studyProgram.table;

// Filter tambahan khusus program studi. Semua digabung dengan AND, jadi boleh dipakai bersamaan.
// Data dengan tanggal kosong tidak error: perbandingan SQL terhadap NULL hasilnya "tidak cocok".
const applyStudyProgramFilters = (query, filters, now = new Date()) => {
  const { level, rank, programName, skNumber, decisionYear, validUntilFrom, validUntilTo, expiryStatus } = filters;
  let q = query;

  // Jenjang & peringkat: cocok persis tetapi tidak sensitif huruf besar/kecil
  const levelTerm = level ? escapeLikeTerm(level) : "";
  if (levelTerm) q = q.ilike("education_level", levelTerm);
  const rankTerm = rank ? escapeLikeTerm(rank) : "";
  if (rankTerm) q = q.ilike("rank", rankTerm);

  // Nama program studi & nomor SK: pencarian sebagian kata, tidak sensitif huruf besar/kecil
  const nameTerm = programName ? escapeLikeTerm(programName) : "";
  if (nameTerm) q = q.ilike("program_name", `%${nameTerm}%`);
  const skTerm = skNumber ? escapeLikeTerm(skNumber) : "";
  if (skTerm) q = q.ilike("sk_number", `%${skTerm}%`);

  // Tahun SK: rentang [1 Jan tahun itu, 1 Jan tahun berikutnya)
  if (decisionYear) {
    q = q
      .gte("decision_date", `${decisionYear}-01-01`)
      .lt("decision_date", `${decisionYear + 1}-01-01`);
  }

  // Rentang tanggal kedaluwarsa (inklusif di kedua ujung)
  if (validUntilFrom) q = q.gte("valid_until", validUntilFrom);
  if (validUntilTo) q = q.lte("valid_until", validUntilTo);

  // Status kedaluwarsa: batas sama persis dengan computeExpiryStatus (lihat utils/accreditationExpiry)
  if (expiryStatus) {
    if (!EXPIRY_STATUSES.includes(expiryStatus)) return q;
    const { today, expiringUntil } = getExpiryBoundaries(now);
    if (expiryStatus === "unknown") q = q.is("valid_until", null);
    else if (expiryStatus === "expired") q = q.lt("valid_until", today);
    else if (expiryStatus === "expiring") q = q.gte("valid_until", today).lte("valid_until", expiringUntil);
    else if (expiryStatus === "active") q = q.gt("valid_until", expiringUntil);
  }
  return q;
};

const paginatedList = async (entity, { page, limit, build, admin, context }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let { data, count, error } = await entity.order(
    build(supabase.from(entity.table).select(entity.columns, { count: "exact" }))
  ).range(from, to);

  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await build(
      supabase.from(entity.table).select("id", { count: "exact", head: true })
    );
    if (counted.error) throwDbError(`${context}: hitung total`, counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError(`${context}: daftar`, error);

  const total = count ?? 0;
  return {
    items: await serializeMany(entity, data, { admin }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const mapBody = (entity, body) => {
  const row = {};
  for (const [key, column] of Object.entries(entity.bodyMap)) {
    if (body[key] !== undefined) row[column] = body[key];
  }
  return row;
};

const mapWriteError = (entity, context, error) => {
  if (error.code === UNIQUE_VIOLATION) {
    return new AppError(
      `${entity.label} dengan data yang sama sudah ada`,
      409,
      "ACCREDITATION_DUPLICATE"
    );
  }
  if (error.code === CHECK_VIOLATION) {
    return new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }
  try {
    throwDbError(context, error);
  } catch (appError) {
    return appError;
  }
  return error;
};

// ---------- ADMIN ----------
const adminList = async (entity, query) => {
  const { page, limit, status, search } = query;
  return paginatedList(entity, {
    page,
    limit,
    admin: true,
    context: `${entity.table}: admin`,
    build: (q) => {
      let filtered = q;
      if (status) filtered = filtered.eq("status", status);
      if (isStudyProgram(entity)) filtered = applyStudyProgramFilters(filtered, query);
      return applySearch(entity, filtered, search);
    },
  });
};

const findRow = async (entity, id, context) => {
  const { data, error } = await supabase
    .from(entity.table)
    .select(entity.columns)
    .eq("id", id)
    .maybeSingle();
  if (error) throwDbError(context, error);
  return data;
};

const adminGet = async (entity, id) => {
  const row = await findRow(entity, id, `${entity.table}: detail`);
  if (!row) throw notFound(entity);
  return serialize(entity, row, { admin: true });
};

const adminCreate = async (entity, body, adminId) => {
  const row = { ...entity.defaults, ...mapBody(entity, body) };
  const status = body.status || "draft";
  row.status = status;
  row.published_at = status === "published" ? new Date().toISOString() : null;
  row.created_by = adminId;

  const { data, error } = await supabase.from(entity.table).insert(row).select(entity.columns).single();
  if (error) throw mapWriteError(entity, `${entity.table}: buat`, error);
  return serialize(entity, data, { admin: true });
};

const adminUpdate = async (entity, id, body) => {
  const current = await findRow(entity, id, `${entity.table}: ambil untuk update`);
  if (!current) throw notFound(entity);

  const patch = mapBody(entity, body);

  // Urutan tanggal harus tetap benar setelah digabung dengan data yang sudah ada
  const validFrom = patch.valid_from !== undefined ? patch.valid_from : current.valid_from;
  const validUntil = patch.valid_until !== undefined ? patch.valid_until : current.valid_until;
  if (validFrom && validUntil && validUntil < validFrom) {
    throw new AppError(
      "Data yang dikirim tidak valid",
      400,
      "VALIDATION_ERROR",
      [{ field: "validUntil", message: "Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai berlaku" }]
    );
  }

  if (body.status !== undefined) {
    patch.status = body.status;
    if (body.status === "published" && !current.published_at) {
      patch.published_at = new Date().toISOString();
    }
  }

  if (Object.keys(patch).length === 0) return serialize(entity, current, { admin: true });

  const { data, error } = await supabase
    .from(entity.table)
    .update(patch)
    .eq("id", id)
    .select(entity.columns)
    .maybeSingle();
  if (error) throw mapWriteError(entity, `${entity.table}: perbarui`, error);
  if (!data) throw notFound(entity);
  return serialize(entity, data, { admin: true });
};

// Hapus baris dulu; file dihapus SESUDAH baris berhasil terhapus (best-effort).
// Jika penghapusan file gagal, data tetap terhapus dan file dicatat sebagai [ORPHAN].
const adminDelete = async (entity, id) => {
  const current = await findRow(entity, id, `${entity.table}: ambil untuk hapus`);
  if (!current) throw notFound(entity);

  const { data, error } = await supabase.from(entity.table).delete().eq("id", id).select("id");
  if (error) throwDbError(`${entity.table}: hapus`, error);
  if (!data || data.length === 0) throw notFound(entity);

  await removeDocumentObjectQuietly(current.document_path, `${entity.table}: hapus data`);
};

// Dokumen: simpan file baru -> compare-and-set kolom di database -> hapus file lama.
// File lama baru dihapus setelah database menunjuk ke file baru, jadi tidak ada keadaan
// ketika baris menunjuk ke file yang sudah hilang.
const documentConflict = () =>
  new AppError("Dokumen berubah, silakan coba lagi", 409, "DOCUMENT_CONFLICT");

const casDocumentUpdate = async (entity, id, oldPath, values) => {
  let query = supabase.from(entity.table).update(values).eq("id", id);
  query = oldPath ? query.eq("document_path", oldPath) : query.is("document_path", null);
  return query.select(entity.columns).maybeSingle();
};

const adminSetDocument = async (entity, record, processed) => {
  const oldPath = record.document_path;
  const newPath = buildDocumentPath(entity.folder, record.id, processed.extension);

  await uploadDocumentObject(newPath, processed.buffer, processed.mimeType);

  const { data, error } = await casDocumentUpdate(entity, record.id, oldPath, {
    document_path: newPath,
    document_name: processed.displayName,
    document_mime: processed.mimeType,
    document_size: processed.size,
  });

  if (error) {
    await removeDocumentObjectQuietly(newPath, `${entity.table}: kompensasi setelah DB gagal`);
    throwDbError(`${entity.table}: simpan dokumen`, error);
  }
  if (!data) {
    await removeDocumentObjectQuietly(newPath, `${entity.table}: kompensasi karena CAS gagal`);
    throw documentConflict();
  }

  if (oldPath) await removeDocumentObjectQuietly(oldPath, `${entity.table}: hapus dokumen lama`);
  return serialize(entity, data, { admin: true });
};

const adminRemoveDocument = async (entity, record) => {
  const oldPath = record.document_path;
  if (!oldPath) {
    throw new AppError("Dokumen tidak ditemukan", 404, "DOCUMENT_NOT_FOUND");
  }

  const { data, error } = await casDocumentUpdate(entity, record.id, oldPath, {
    document_path: null,
    document_name: null,
    document_mime: null,
    document_size: null,
  });
  if (error) throwDbError(`${entity.table}: hapus dokumen`, error);
  if (!data) throw documentConflict();

  await removeDocumentObjectQuietly(oldPath, `${entity.table}: hapus file dokumen`);
  return serialize(entity, data, { admin: true });
};

const loadForDocument = async (entity, id) => {
  const { data, error } = await supabase
    .from(entity.table)
    .select("id, document_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throwDbError(`${entity.table}: ambil untuk dokumen`, error);
  if (!data) throw notFound(entity);
  return data;
};

// ---------- PUBLIK: hanya status published ----------
const publicList = async (entity, query) => {
  const { page, limit, search } = query;
  const now = new Date().toISOString();
  return paginatedList(entity, {
    page,
    limit,
    admin: false,
    context: `public ${entity.table}`,
    build: (q) => {
      let filtered = q.eq("status", "published").lte("published_at", now);
      if (isStudyProgram(entity)) filtered = applyStudyProgramFilters(filtered, query);
      return applySearch(entity, filtered, search);
    },
  });
};

const publicGet = async (entity, id) => {
  const { data, error } = await supabase
    .from(entity.table)
    .select(entity.columns)
    .eq("id", id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throwDbError(`public ${entity.table}: detail`, error);
  if (!data) throw notFound(entity);
  return serialize(entity, data, { admin: false });
};

// ---------- OPSI FILTER (untuk dropdown frontend) ----------
// Nilai diambil dari data yang benar-benar tersimpan, jadi tidak dibatasi daftar tetap.
// Publik: hanya dari data published. Admin: semua data.
const OPTION_PAGE_SIZE = 1000;

const listFilterOptions = async (entity, { admin }) => {
  const rows = [];
  for (let from = 0; ; from += OPTION_PAGE_SIZE) {
    let q = supabase.from(entity.table).select("education_level, rank, decision_date");
    if (!admin) q = q.eq("status", "published").lte("published_at", new Date().toISOString());
    const { data, error } = await q
      .order("id", { ascending: true })
      .range(from, from + OPTION_PAGE_SIZE - 1);
    if (error) {
      if (error.code === RANGE_NOT_SATISFIABLE) break;
      throwDbError(`${entity.table}: opsi filter`, error);
    }
    rows.push(...(data || []));
    if (!data || data.length < OPTION_PAGE_SIZE) break;
  }

  const unique = (values) => {
    const seen = new Map();
    for (const raw of values) {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  };
  const years = new Set();
  for (const r of rows) {
    const year = typeof r.decision_date === "string" ? Number(r.decision_date.slice(0, 4)) : NaN;
    if (Number.isInteger(year)) years.add(year);
  }

  return {
    levels: unique(rows.map((r) => r.education_level)),
    ranks: unique(rows.map((r) => r.rank)),
    decisionYears: [...years].sort((a, b) => b - a),
    expiryStatuses: EXPIRY_STATUSES,
  };
};

module.exports = {
  ENTITIES,
  listFilterOptions,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminDelete,
  adminSetDocument,
  adminRemoveDocument,
  loadForDocument,
  publicList,
  publicGet,
};
