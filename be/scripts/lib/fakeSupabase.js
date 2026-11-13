// Supabase palsu di memori (database + Storage lama) untuk pengujian OFFLINE.
// Meniru semantik yang dipakai backend: eq/is/gte/lte/ilike/or/in, order, range, count, CAS lewat update+filter.
const path = require("node:path");
const crypto = require("node:crypto");

const present = (v) => v !== null && v !== undefined;
const likeToRegExp = (pattern) => {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "\\" && i + 1 < pattern.length) { out += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); i += 1; }
    else if (ch === "%") out += ".*";
    else if (ch === "_") out += ".";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "is");
};

const UNIQUE = {
  banpt_regulations: (r) => `${r.regulation_number}|${r.regulation_year}`,
  accreditation_study_programs: (r) => [r.program_name, r.education_level, r.sk_number].map((v) => String(v).trim().toLowerCase()).join("|"),
  accreditation_institutions: (r) => String(r.sk_number).trim().toLowerCase(),
  drive_cleanup_queue: (r) => r.file_id,
};

const createFakeSupabase = () => {
  const db = {};
  const faults = [];                                   // { table, op, error } sekali pakai
  const hooks = { beforeUpdate: null };
  const legacy = { objects: new Map(), failRemove: false, removed: [] };   // Supabase Storage (file LAMA)
  let tick = 0;
  const uniqueNow = () => new Date(Date.now() + (tick += 1)).toISOString();

  class FakeQuery {
    constructor(table) { this.table = table; this.op = "select"; this.filters = []; this.orders = []; this.payload = null; this.mode = "many"; this.opts = {}; this.rangeArgs = null; }
    select(cols, opts) { this.opts = opts || {}; return this; }
    insert(p) { this.op = "insert"; this.payload = p; return this; }
    update(p) { this.op = "update"; this.payload = p; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
    is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
    gte(c, v) { this.filters.push((r) => present(r[c]) && r[c] >= v); return this; }
    lte(c, v) { this.filters.push((r) => present(r[c]) && r[c] <= v); return this; }
    ilike(c, pattern) { const re = likeToRegExp(String(pattern)); this.filters.push((r) => present(r[c]) && re.test(String(r[c]))); return this; }
    in(c, a) { this.filters.push((r) => a.includes(r[c])); return this; }
    or() { return this; }
    order(col, o) { this.orders.push({ col, asc: !o || o.ascending !== false }); return this; }
    range(a, b) { this.rangeArgs = [a, b]; return this; }
    limit() { return this; }
    maybeSingle() { this.mode = "maybe"; return this; }
    single() { this.mode = "single"; return this; }
    run() {
      const fi = faults.findIndex((f) => f.table === this.table && f.op === this.op);
      if (fi >= 0) { const [f] = faults.splice(fi, 1); return { data: null, error: f.error }; }
      if (this.op === "update" && hooks.beforeUpdate) { const h = hooks.beforeUpdate; hooks.beforeUpdate = null; h(this.table); }
      db[this.table] = db[this.table] || [];
      const rows = db[this.table];
      const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
      let result; let count;
      if (this.op === "insert") {
        const now = uniqueNow();
        const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...this.payload };
        const key = UNIQUE[this.table];
        if (key && rows.some((r) => key(r) === key(row))) return { data: null, error: { code: "23505", message: "dup" } };
        rows.push(row); result = [row];
      } else if (this.op === "update") {
        result = match(); for (const r of result) Object.assign(r, this.payload, { updated_at: uniqueNow() });
      } else if (this.op === "delete") {
        result = match(); db[this.table] = rows.filter((r) => !result.includes(r));
      } else {
        result = [...match()]; count = result.length;
        for (const { col, asc } of [...this.orders].reverse()) {
          result.sort((a, b) => { const x = a[col], y = b[col]; if (x === y) return 0; if (!present(x)) return 1; if (!present(y)) return -1; return (x < y ? -1 : 1) * (asc ? 1 : -1); });
        }
        if (this.rangeArgs) {
          const [a, b] = this.rangeArgs;
          if (a > 0 && a >= count) return { data: null, error: { code: "PGRST103", message: "range" } };
          result = result.slice(a, b + 1);
        }
        if (this.opts.head) return { data: null, count, error: null };
      }
      const out = result.map((r) => JSON.parse(JSON.stringify(r)));
      if (this.mode === "many") return { data: out, count, error: null };
      if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
      return out[0] ? { data: out[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
    }
    then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
  }

  const storage = {
    from: (bucket) => ({
      remove: async (paths) => {
        if (legacy.failRemove) return { data: null, error: { message: "remove boom" } };
        for (const p of paths) { legacy.objects.delete(`${bucket}/${p}`); legacy.removed.push(`${bucket}/${p}`); }
        return { data: [], error: null };
      },
      upload: async (p, buf) => { legacy.objects.set(`${bucket}/${p}`, buf.length); return { data: { path: p }, error: null }; },
      createSignedUrl: async (p, ttl) => ({ data: { signedUrl: `https://fake-project.supabase.co/storage/v1/object/sign/${bucket}/${p}?token=t&ttl=${ttl}` }, error: null }),
      getPublicUrl: (p, options) => ({ data: { publicUrl: `https://fake-project.supabase.co/storage/v1/object/public/${bucket}/${p}${options && options.download ? `?download=${encodeURIComponent(options.download)}` : ""}` } }),
    }),
    listBuckets: async () => ({ data: [], error: null }),
  };

  const client = { from: (t) => new FakeQuery(t), storage };
  const install = () => {
    const modulePath = require.resolve(path.join(__dirname, "../../src/config/supabase.js"));
    require.cache[modulePath] = { id: modulePath, filename: modulePath, loaded: true, exports: client };
    return modulePath;
  };
  return { db, faults, hooks, legacy, client, install };
};

module.exports = { createFakeSupabase };
