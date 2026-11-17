const AppError = require("../utils/AppError");
const { ORGANIZATION_CATEGORY_MAP } = require("../utils/organizationCategories");
const { getCoverPublicUrl } = require("../utils/coverStorage");

const TABLE = "organization_units";

const UNIT_COLUMNS =
  "id, title, position, description, category, sort_order, status, image_path, created_at, updated_at";

// Row database (snake_case) -> response API (camelCase). includeStatus=false untuk respons publik.
const serializeUnit = (row, { includeStatus = true } = {}) => {
  const category = ORGANIZATION_CATEGORY_MAP.get(row.category);
  const unit = {
    id: row.id,
    title: row.title,
    position: row.position ?? null,
    description: row.description ?? null,
    category: { slug: row.category, name: category ? category.name : row.category },
    sortOrder: row.sort_order,
    // Opsional: null bila tidak ada gambar.
    imageUrl: getCoverPublicUrl(row.image_path),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeStatus) unit.status = row.status;
  return unit;
};

const unitNotFound = () => new AppError("Data struktur organisasi tidak ditemukan", 404, "ORGANIZATION_UNIT_NOT_FOUND");

module.exports = { TABLE, UNIT_COLUMNS, serializeUnit, unitNotFound };
