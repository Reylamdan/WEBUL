const supabase = require("../config/supabase");
const { throwDbError } = require("../utils/dbError");
const { TABLE, UNIT_COLUMNS, serializeUnit } = require("../services/organizationUnitService");

// GET /api/organization-units?category=bagan|unit
// Hanya status "published", urut berdasarkan sort_order lalu tanggal dibuat.
const listPublicUnits = async (req, res) => {
  const { limit, category } = req.validated.query;

  let query = supabase.from(TABLE).select(UNIT_COLUMNS).eq("status", "published");
  if (category) query = query.eq("category", category);

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throwDbError("public organisasi: daftar", error);

  return res.json({
    success: true,
    data: { items: data.map((row) => serializeUnit(row, { includeStatus: false })) },
  });
};

module.exports = { listPublicUnits };
