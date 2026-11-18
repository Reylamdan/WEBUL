const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { toNumber } = require("../utils/tracerStudyAggregator");

const TABLE = "tracer_study_responses";
const COLUMNS = "id, survey_year, study_program, answers";
const ANSWER_FIELDS = ["f8", "f14", "f502", "f505"];

const PAGE_SIZE = 1000; // batas default PostgREST per request
const MAX_PAGES = 50; // pengaman: maksimal 50.000 baris per pembacaan
const INSERT_CHUNK = 500;
const DELETE_CHUNK = 100; // id masuk ke URL (filter in), jadi dibatasi
const RANGE_NOT_SATISFIABLE = "PGRST103";

const responseNotFound = () => new AppError("Data responden tidak ditemukan", 404, "RESPONSE_NOT_FOUND");

// Row database -> response API. Hanya field jawaban yang dikenal yang dikirim ke klien.
const serializeResponse = (row) => {
  const answers = row.answers && typeof row.answers === "object" ? row.answers : {};
  return {
    id: row.id,
    surveyYear: row.survey_year,
    studyProgram: row.study_program ?? null,
    f8: toNumber(answers.f8),
    f14: toNumber(answers.f14),
    f502: toNumber(answers.f502),
    f505: toNumber(answers.f505),
  };
};

// Hanya field yang dikirim (bukan undefined) yang dimasukkan ke answers.
const pickAnswers = (body) => {
  const answers = {};
  for (const field of ANSWER_FIELDS) {
    if (body[field] !== undefined) answers[field] = body[field];
  }
  return answers;
};

const withoutNulls = (answers) => Object.fromEntries(Object.entries(answers).filter(([, value]) => value !== null));

// Membaca semua baris yang cocok secara bertahap (PostgREST membatasi 1000 baris per request).
const fetchAll = async (columns, { year } = {}, context) => {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    let query = supabase.from(TABLE).select(columns);
    if (year !== undefined) query = query.eq("survey_year", year);

    const { data, error } = await query.order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error && error.code === RANGE_NOT_SATISFIABLE) break;
    if (error) throwDbError(context, error);

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const deleteByIds = async (ids, context) => {
  for (const part of chunk(ids, DELETE_CHUNK)) {
    const { error } = await supabase.from(TABLE).delete().in("id", part);
    if (error) throwDbError(context, error);
  }
};

// Pembersihan kompensasi: kegagalan hanya dicatat dan tidak menutupi error utama.
const deleteByIdsQuietly = async (ids, context) => {
  if (ids.length === 0) return;
  try {
    await deleteByIds(ids, context);
  } catch (error) {
    console.error(`[ORPHAN] ${context}: ${ids.length} baris mungkin tertinggal (${error.message})`);
  }
};

// ---------------------------------------------------------------------
// Ringkasan data tersimpan: jumlah responden per tahun survei + daftar program studi.
// ---------------------------------------------------------------------
const listYears = async () => {
  const rows = await fetchAll("survey_year, study_program", {}, "tracer study admin: daftar tahun");

  const totals = new Map();
  const programs = new Set();
  for (const row of rows) {
    totals.set(row.survey_year, (totals.get(row.survey_year) ?? 0) + 1);
    if (row.study_program) programs.add(row.study_program);
  }

  return {
    years: [...totals.entries()].map(([year, total]) => ({ year, total })).sort((a, b) => b.year - a.year),
    programs: [...programs].sort((a, b) => a.localeCompare(b, "id")),
  };
};

// ---------------------------------------------------------------------
// Daftar responden (data mentah anonim, hanya untuk admin)
// ---------------------------------------------------------------------
const listResponses = async ({ page, limit, year, program }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const applyFilters = (query) => {
    let filtered = query;
    if (year !== undefined) filtered = filtered.eq("survey_year", year);
    if (program !== undefined) filtered = filtered.eq("study_program", program);
    return filtered;
  };

  let { data, count, error } = await applyFilters(supabase.from(TABLE).select(COLUMNS, { count: "exact" }))
    .order("survey_year", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  // Halaman di luar jumlah data bukan kesalahan: kembalikan daftar kosong dengan total yang benar.
  if (error && error.code === RANGE_NOT_SATISFIABLE) {
    const counted = await applyFilters(supabase.from(TABLE).select("id", { count: "exact", head: true }));
    if (counted.error) throwDbError("tracer study admin: hitung total", counted.error);
    data = [];
    count = counted.count ?? 0;
    error = null;
  }
  if (error) throwDbError("tracer study admin: daftar", error);

  const total = count ?? 0;
  return {
    items: data.map(serializeResponse),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ---------------------------------------------------------------------
// Tambah / ubah / hapus satu responden
// ---------------------------------------------------------------------
const createResponse = async (body) => {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      survey_year: body.surveyYear,
      study_program: body.studyProgram ?? null,
      answers: withoutNulls(pickAnswers(body)), // data baru tidak perlu menyimpan kunci kosong
    })
    .select(COLUMNS)
    .single();
  if (error) throwDbError("tracer study admin: tambah", error);

  return serializeResponse(data);
};

const updateResponse = async (id, body) => {
  const { data: current, error: readError } = await supabase.from(TABLE).select(COLUMNS).eq("id", id).maybeSingle();
  if (readError) throwDbError("tracer study admin: ambil untuk ubah", readError);
  if (!current) throw responseNotFound();

  const patch = {};
  if (body.surveyYear !== undefined) patch.survey_year = body.surveyYear;
  if (body.studyProgram !== undefined) patch.study_program = body.studyProgram;

  // Jawaban digabung dengan yang sudah tersimpan supaya kunci lain di answers tidak hilang.
  const changedAnswers = pickAnswers(body);
  if (Object.keys(changedAnswers).length > 0) {
    const existing = current.answers && typeof current.answers === "object" ? current.answers : {};
    patch.answers = { ...existing, ...changedAnswers };
  }

  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select(COLUMNS).maybeSingle();
  if (error) throwDbError("tracer study admin: ubah", error);
  if (!data) throw responseNotFound(); // dihapus request lain di antara baca dan ubah

  return serializeResponse(data);
};

const deleteResponse = async (id) => {
  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id");
  if (error) throwDbError("tracer study admin: hapus", error);
  if (!data || data.length === 0) throw responseNotFound();
};

// ---------------------------------------------------------------------
// Import massal
// ---------------------------------------------------------------------
// replace: data baru dimasukkan DULU, baru data lama tahun itu dihapus. Jika memasukkan data baru
// gagal, baris baru yang sudah masuk dibatalkan sehingga data lama tidak berubah.
// PostgREST tidak menyediakan transaksi, jadi kegagalan di tengah penghapusan data lama (sangat
// jarang) bisa meninggalkan sebagian data lama; kasus itu dicatat di log server.
const importResponses = async ({ surveyYear, mode, rows }) => {
  const oldIds =
    mode === "replace"
      ? (await fetchAll("id", { year: surveyYear }, "tracer study admin: ambil data lama")).map((row) => row.id)
      : [];

  const payload = rows.map((row) => ({
    survey_year: surveyYear,
    study_program: row.studyProgram ?? null,
    answers: withoutNulls(pickAnswers(row)),
  }));

  const insertedIds = [];
  try {
    for (const part of chunk(payload, INSERT_CHUNK)) {
      const { data, error } = await supabase.from(TABLE).insert(part).select("id");
      if (error) throwDbError("tracer study admin: import", error);
      insertedIds.push(...data.map((row) => row.id));
    }
  } catch (error) {
    await deleteByIdsQuietly(insertedIds, "import: batalkan baris baru");
    throw error;
  }

  if (oldIds.length > 0) {
    try {
      await deleteByIds(oldIds, "tracer study admin: hapus data lama");
    } catch (error) {
      await deleteByIdsQuietly(insertedIds, "import: batalkan baris baru setelah hapus lama gagal");
      throw error;
    }
  }

  return { surveyYear, mode, inserted: payload.length, removed: oldIds.length };
};

// ---------------------------------------------------------------------
// Hapus seluruh data satu tahun survei
// ---------------------------------------------------------------------
const deleteYear = async (year) => {
  const counted = await supabase.from(TABLE).select("id", { count: "exact", head: true }).eq("survey_year", year);
  if (counted.error) throwDbError("tracer study admin: hitung data tahun", counted.error);

  const total = counted.count ?? 0;
  if (total === 0) throw new AppError("Tidak ada data untuk tahun survei tersebut", 404, "YEAR_NOT_FOUND");

  const { error } = await supabase.from(TABLE).delete().eq("survey_year", year);
  if (error) throwDbError("tracer study admin: hapus tahun", error);

  return { surveyYear: year, removed: total };
};

module.exports = {
  listYears,
  listResponses,
  createResponse,
  updateResponse,
  deleteResponse,
  importResponses,
  deleteYear,
};
