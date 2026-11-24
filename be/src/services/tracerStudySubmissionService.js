const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");

const RESPONSES = "tracer_study_responses";
const ALUMNI = "tracer_study_alumni";
const UNIQUE_VIOLATION = "23505";

// Pengiriman form publik: jawaban masuk ke tabel responden (anonim, dipakai statistik),
// data diri masuk ke tabel terpisah. Tahun survei ditentukan server, bukan klien.
const createSubmission = async ({ alumni, tracer, channel }) => {
  const surveyYear = new Date().getFullYear();

  // Cek duplikat dulu supaya alumni mendapat pesan jelas sebelum ada data yang ditulis.
  const { data: existing, error: dupError } = await supabase
    .from(ALUMNI)
    .select("id")
    .eq("survey_year", surveyYear)
    .ilike("nim", alumni.nim.replace(/[%_\\]/g, "\\$&"))
    .limit(1);
  if (dupError) throwDbError("tracer study submit: cek duplikat", dupError);
  if (existing && existing.length > 0) {
    throw new AppError(`NIM ${alumni.nim} sudah mengisi tracer study tahun ${surveyYear}`, 409, "TRACER_ALREADY_SUBMITTED");
  }

  // F14 hanya relevan untuk alumni yang bekerja (F8 = 1).
  const answers = { f8: tracer.f8 };
  if (tracer.f8 === 1 && tracer.f14 != null) answers.f14 = tracer.f14;
  if (tracer.f502 != null) answers.f502 = tracer.f502;
  if (tracer.f505 != null) answers.f505 = tracer.f505;

  const { data: response, error: responseError } = await supabase
    .from(RESPONSES)
    .insert({ survey_year: surveyYear, study_program: alumni.studyProgram, answers })
    .select("id")
    .single();
  if (responseError) throwDbError("tracer study submit: simpan jawaban", responseError);

  const { error: alumniError } = await supabase.from(ALUMNI).insert({
    survey_year: surveyYear,
    full_name: alumni.fullName,
    nim: alumni.nim,
    study_program: alumni.studyProgram,
    graduation_year: alumni.graduationYear,
    email: alumni.email,
    phone: alumni.phone ?? null,
    response_id: String(response.id),
    submission_channel: channel,
  });

  if (alumniError) {
    // Batalkan jawaban yang sudah masuk supaya tidak ada responden tanpa pemilik.
    const { error: rollbackError } = await supabase.from(RESPONSES).delete().eq("id", response.id);
    if (rollbackError) console.error(`[ORPHAN] tracer study submit: response ${response.id} tertinggal (${rollbackError.message})`);

    if (alumniError.code === UNIQUE_VIOLATION) {
      throw new AppError(`NIM ${alumni.nim} sudah mengisi tracer study tahun ${surveyYear}`, 409, "TRACER_ALREADY_SUBMITTED");
    }
    throwDbError("tracer study submit: simpan data diri", alumniError);
  }

  return { surveyYear };
};

module.exports = { createSubmission };
