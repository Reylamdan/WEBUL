const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");

const EVENT_COLUMNS =
  "id, title, description, start_date, end_date, category, status, created_at, updated_at";

// Kategori kecil jumlahnya; satu query cukup untuk memetakan slug -> nama dan memvalidasi input.
const listCategories = async (context) => {
  const { data, error } = await supabase
    .from("academic_calendar_categories")
    .select("slug, name, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });
  if (error) throwDbError(`${context}: ambil kategori`, error);
  return data;
};

const toCategoryMap = (categories) => new Map(categories.map((c) => [c.slug, c]));

const serializeCategory = (row) => ({ slug: row.slug, name: row.name });

// Row database (snake_case) -> response API (camelCase).
// includeStatus=false untuk respons publik (publik hanya melihat published, jadi status tidak perlu).
const serializeEvent = (row, categoryMap, { includeStatus = true } = {}) => {
  const category = categoryMap.get(row.category);
  const event = {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    category: { slug: row.category, name: category ? category.name : row.category },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) event.status = row.status;
  return event;
};

// Kategori pada input harus terdaftar DAN aktif. Pesan menyebut slug yang diterima.
const assertCategoryUsable = (slug, categories) => {
  const found = categories.find((c) => c.slug === slug);
  if (!found || !found.is_active) {
    const allowed = categories.filter((c) => c.is_active).map((c) => c.slug);
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR", [
      { field: "category", message: `Kategori tidak dikenal. Pilihan: ${allowed.join(", ")}` },
    ]);
  }
};

// Untuk filter daftar: kategori harus terdaftar (aktif atau tidak, agar agenda lama tetap bisa difilter).
const assertCategoryKnown = (slug, categories) => {
  if (!categories.some((c) => c.slug === slug)) {
    throw new AppError("Data yang dikirim tidak valid", 400, "VALIDATION_ERROR", [
      { field: "category", message: "Kategori tidak dikenal" },
    ]);
  }
};

// Filter bersama untuk daftar admin & publik. Rentang tanggal memakai irisan:
// agenda tampil jika mulai <= to DAN selesai >= from (agenda multi-hari yang menyentuh rentang ikut tampil).
const applyEventFilters = (query, { category, from, to }) => {
  let filtered = query;
  if (category) filtered = filtered.eq("category", category);
  if (to) filtered = filtered.lte("start_date", to);
  if (from) filtered = filtered.gte("end_date", from);
  return filtered;
};

const eventNotFound = () => new AppError("Agenda tidak ditemukan", 404, "ACADEMIC_EVENT_NOT_FOUND");

module.exports = {
  EVENT_COLUMNS,
  listCategories,
  toCategoryMap,
  serializeCategory,
  serializeEvent,
  assertCategoryUsable,
  assertCategoryKnown,
  applyEventFilters,
  eventNotFound,
};
