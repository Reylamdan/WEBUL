// Adaptor mini bergaya supabase-js yang mengeksekusi SQL SUNGGUHAN ke PostgreSQL uji.
// Hanya mendukung bagian API yang dipakai accreditationService/driveStorage:
//   from(t).select(cols, {count, head}) / insert / update / delete + eq/is/lte/gte/lt/gt/ilike/in/order/range
//   + maybeSingle()/single(). Constraint, unique index, dan tipe data dijalankan oleh PostgreSQL, bukan ditiru.
// `faults` (kegagalan sekali pakai) dan `hooks.beforeUpdate` disediakan untuk skenario gangguan/balapan.
const lit = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
};
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`identifier tidak valid: ${name}`);
  return `"${name}"`;
};
const cols = (c) => {
  if (!c || c === "*") return "*";
  if (!/^[\w\s,*]+$/.test(c)) throw new Error(`daftar kolom tidak valid: ${c}`);
  return c.split(",").map((x) => x.trim()).filter(Boolean).map((x) => (x === "*" ? "*" : ident(x))).join(", ");
};

const createSupabasePg = ({ cluster, db }) => {
  const faults = [];
  const hooks = { beforeUpdate: null };
  const queryLog = []; // { table, op, sql }
  const storage = { objects: new Set(), failRemove: false };

  const runJson = (sql) => {
    const r = cluster.exec(db, `select coalesce(json_agg(t), '[]'::json) from (${sql}) t;`);
    if (!r.ok) return { rows: null, error: r.error };
    return { rows: JSON.parse(r.out.trim() || "[]"), error: null };
  };
  const runDmlJson = (sql) => {
    const r = cluster.exec(db, `with r as (${sql}) select coalesce(json_agg(r), '[]'::json) from r;`);
    if (!r.ok) return { rows: null, error: r.error };
    return { rows: JSON.parse(r.out.trim() || "[]"), error: null };
  };

  class Query {
    constructor(table) {
      this.table = table; this.op = "select"; this.where = []; this.orders = []; this.payload = null;
      this.columns = "*"; this.opts = {}; this.mode = "many"; this.rangeArgs = null; this.returning = false;
    }
    select(c, opts) { this.columns = c; this.opts = opts || {}; if (this.op !== "select") this.returning = true; return this; }
    insert(p) { this.op = "insert"; this.payload = p; return this; }
    update(p) { this.op = "update"; this.payload = p; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.where.push(`${ident(c)} = ${lit(v)}`); return this; }
    is(c, v) { this.where.push(`${ident(c)} is ${v === null ? "null" : lit(v)}`); return this; }
    lte(c, v) { this.where.push(`${ident(c)} <= ${lit(v)}`); return this; }
    gte(c, v) { this.where.push(`${ident(c)} >= ${lit(v)}`); return this; }
    lt(c, v) { this.where.push(`${ident(c)} < ${lit(v)}`); return this; }
    gt(c, v) { this.where.push(`${ident(c)} > ${lit(v)}`); return this; }
    in(c, a) { this.where.push(`${ident(c)} in (${a.map(lit).join(",")})`); return this; }
    ilike(c, p) { this.where.push(`${ident(c)} ilike ${lit(p)}`); return this; }
    order(c, o) { this.orders.push(`${ident(c)} ${!o || o.ascending !== false ? "asc" : "desc"}`); return this; }
    range(a, b) { this.rangeArgs = [a, b]; return this; }
    maybeSingle() { this.mode = "maybe"; return this; }
    single() { this.mode = "single"; return this; }

    sql() {
      const w = this.where.length ? ` where ${this.where.join(" and ")}` : "";
      const t = `public.${ident(this.table)}`;
      if (this.op === "insert") {
        const keys = Object.keys(this.payload);
        return `insert into ${t} (${keys.map(ident).join(", ")}) values (${keys.map((k) => lit(this.payload[k])).join(", ")}) returning ${cols(this.columns)}`;
      }
      if (this.op === "update") {
        const sets = Object.entries(this.payload).map(([k, v]) => `${ident(k)} = ${lit(v)}`).join(", ");
        return `update ${t} set ${sets}, updated_at = now()${w} returning ${cols(this.columns)}`;
      }
      if (this.op === "delete") return `delete from ${t}${w} returning ${cols(this.columns)}`;
      const ord = this.orders.length ? ` order by ${this.orders.join(", ")}` : "";
      const lim = this.rangeArgs ? ` limit ${this.rangeArgs[1] - this.rangeArgs[0] + 1} offset ${this.rangeArgs[0]}` : "";
      return `select ${cols(this.columns)} from ${t}${w}${ord}${lim}`;
    }

    run() {
      const fi = faults.findIndex((f) => f.table === this.table && f.op === this.op);
      if (fi >= 0) { const [f] = faults.splice(fi, 1); return { data: null, error: f.error }; }
      if (this.op === "update" && hooks.beforeUpdate) { const h = hooks.beforeUpdate; hooks.beforeUpdate = null; h(this.table); }

      if (this.op === "select" && this.opts.head) {
        const w = this.where.length ? ` where ${this.where.join(" and ")}` : "";
        const r = runJson(`select count(*)::int as n from public.${ident(this.table)}${w}`);
        queryLog.push({ table: this.table, op: "select", sql: "count" });
        return r.error ? { data: null, count: null, error: r.error } : { data: null, count: r.rows[0].n, error: null };
      }
      const sql = this.sql();
      queryLog.push({ table: this.table, op: this.op, sql });
      const r = this.op === "select" ? runJson(sql) : runDmlJson(sql);
      if (r.error) return { data: null, error: r.error };
      const rows = r.rows;
      // supabase-js: tanpa .select() setelah insert/update/delete tidak ada data dikembalikan
      if (this.op !== "select" && !this.returning) return { data: null, error: null };
      if (this.mode === "many") return { data: rows, count: rows.length, error: null };
      if (this.mode === "maybe") return { data: rows[0] ?? null, error: null };
      return rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
    }
    then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
  }

  // Storage palsu untuk dokumen LEGACY (bukan bagian dari yang diuji; hanya perlu ada)
  const BUCKET = "accreditation-documents";
  const fakeStorage = {
    from: (bucket) => ({
      remove: async (paths) => {
        if (storage.failRemove) return { data: null, error: { message: "remove boom" } };
        for (const p of paths) storage.objects.delete(`${bucket}/${p}`);
        return { data: [], error: null };
      },
      createSignedUrl: async (p, ttl) => ({
        data: { signedUrl: `https://fake-project.supabase.co/storage/v1/object/sign/${bucket}/${p}?token=t&ttl=${ttl}` },
        error: null,
      }),
      upload: async (p) => { storage.objects.add(`${bucket}/${p}`); return { data: { path: p }, error: null }; },
    }),
  };

  return { client: { from: (t) => new Query(t), storage: fakeStorage }, faults, hooks, queryLog, storage, BUCKET };
};

module.exports = { createSupabasePg, lit };
