const supabase = require("../config/supabase");
const { throwDbError } = require("../utils/dbError");
const { buildTracerStudySummary } = require("../utils/tracerStudyAggregator");

const TABLE = "tracer_study_responses";
const PAGE_SIZE = 1000; // batas default PostgREST per request
const MAX_PAGES = 50; // pengaman: maksimal 50.000 baris per perhitungan
const RANGE_NOT_SATISFIABLE = "PGRST103";

// Mengambil semua baris yang cocok secara bertahap (PostgREST membatasi 1000 baris per request).
const fetchResponses = async (columns, { year, program } = {}, context) => {
  const rows = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;

    let query = supabase.from(TABLE).select(columns);
    if (year !== undefined) query = query.eq("survey_year", year);
    if (program !== undefined) query = query.eq("study_program", program);

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    // Total baris tepat kelipatan 1000: halaman berikutnya kosong dan dijawab PGRST103.
    if (error && error.code === RANGE_NOT_SATISFIABLE) break;
    if (error) throwDbError(context, error);

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
};

// Ringkasan statistik untuk semua metrik, hasil hitung dari data mentah anonim.
const getTracerStudySummary = async ({ year, program } = {}) => {
  const rows = await fetchResponses("answers", { year, program }, "tracer study: ringkasan");
  const summary = buildTracerStudySummary(rows);

  return {
    filters: { year: year ?? null, program: program ?? null },
    totalRespondents: summary.totalRespondents,
    metrics: summary.metrics,
  };
};

// Pilihan filter untuk dropdown di frontend.
const getTracerStudyFilters = async () => {
  const rows = await fetchResponses("survey_year, study_program", {}, "tracer study: filter");

  const years = [...new Set(rows.map((row) => row.survey_year))].sort((a, b) => b - a);
  const programs = [...new Set(rows.map((row) => row.study_program).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "id")
  );

  return { years, programs };
};

module.exports = { getTracerStudySummary, getTracerStudyFilters };