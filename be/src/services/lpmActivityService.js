const supabase = require("../config/supabase");
const AppError = require("../utils/AppError");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm, escapeLikeTerm } = require("../utils/searchTerm");

const TABLE = "lpm_activities";

const COLUMNS =
  "id, title, description, activity_date, link_url, sort_order, status, created_at, updated_at";

const INPUT_ERROR_CODES = ["23514", "23502", "22P02", "22007", "22008", "22003"];
const RANGE_NOT_SATISFIABLE = "PGRST103";

const notFound = () =>
  new AppError("Kegiatan LPM tidak ditemukan", 404, "LPM_ACTIVITY_NOT_FOUND");

const mapWriteError = (context, error) => {
  if (INPUT_ERROR_CODES.includes(error.code)) {
    return new AppError("Data kegiatan yang dikirim tidak valid", 400, "VALIDATION_ERROR");
  }

  try {
    throwDbError(context, error);
  } catch (appError) {
    return appError;
  }

  return error;
};

const serialize = (row, { admin }) => {
  const item = {
    id: row.id,
    title: row.title,
    description: row.description || "",
    activityDate: row.activity_date,
    linkUrl: row.link_url,
  };

  if (admin) {
    item.sortOrder = row.sort_order;
    item.status = row.status;
    item.createdAt = row.created_at;
    item.updatedAt = row.updated_at;
  }

  return item;
};

// Urutan tampil: sort_order -> tanggal -> dibuat. Tanpa tanggal (null) di akhir grup.
const ORDER = (query) =>
  query
    .order("sort_order", { ascending: true })
    .order("activity_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

// ---------- PUBLIK ----------

// Jumlah kegiatan kecil: kembalikan seluruh yang published tanpa pagination.
const publicList = async () => {
  const { data, error } = await ORDER(
    supabase.from(TABLE).select(COLUMNS).eq("status", "published")
  ).limit(200);

  if (error) throwDbError(`public ${TABLE}: daftar`, error);

  return { items: (data || []).map((row) => serialize(row, { admin: false })) };
};

// ---------- ADMIN ----------

const findRow = async (id, context) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throwDbError(context, error);

  return data;
};

const adminList = async ({ page, limit, search, status }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const build = (q) => {
    let query = q;
    const term = search ? cleanSearchTerm(search) : "";

    if (term) {
      const escaped = escapeLikeTerm(term);
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    if (status) query = query.eq("status", status);

    return query;
  };

  let { data, count, error } = await ORDER(
    build(supabase.from(TABLE).select(COLUMNS, { count: "exact" }))
  ).range(from, to);

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
      title: body.title,
      description: body.description || "",
      activity_date: body.activityDate ?? null,
      link_url: body.linkUrl ?? null,
      sort_order: body.sortOrder ?? 0,
      status: body.status || "published",
    })
    .select(COLUMNS)
    .single();

  if (error) throw mapWriteError(`${TABLE}: buat`, error);

  return serialize(data, { admin: true });
};

const adminUpdate = async (id, body) => {
  const patch = {};

  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.activityDate !== undefined) patch.activity_date = body.activityDate;
  if (body.linkUrl !== undefined) patch.link_url = body.linkUrl;
  if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder;
  if (body.status !== undefined) patch.status = body.status;

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
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select("id");

  if (error) throwDbError(`${TABLE}: hapus`, error);
  if (!data || data.length === 0) throw notFound();
};

module.exports = {
  publicList,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminDelete,
};
