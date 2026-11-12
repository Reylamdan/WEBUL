// Menyediakan modul yang dibutuhkan service/controller dokumen akreditasi.
//   * Modul NYATA di repo Anda dipakai apa adanya bila ada (AppError, dbError, searchTerm, env, dst.).
//   * Modul yang TIDAK ada (karena ZIP kerja ini hanya berisi sebagian backend) diganti penyederhanaan minimal
//     yang hanya meniru antarmuka yang dipanggil. Ini bukan kode produksi.
//   * config/supabase dan services/googleDriveService SELALU diganti (adaptor PostgreSQL uji & Drive palsu).
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "..", "..", "src");
const virtual = new Map(); // path absolut tanpa ekstensi (atau nama modul) -> nama file virtual

const origResolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, parent, ...rest) {
  try {
    return origResolve.call(this, request, parent, ...rest);
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    const key = request.startsWith(".") && parent && parent.filename ? path.resolve(path.dirname(parent.filename), request) : request;
    const hit = virtual.get(key.replace(/\.js$/, ""));
    if (hit) return hit;
    throw error;
  }
};

const provide = (rel, exports, { force = false } = {}) => {
  const abs = path.join(SRC, `${rel}.js`);
  const exists = fs.existsSync(abs);
  if (exists && !force) return "nyata";
  virtual.set(path.join(SRC, rel), abs);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports, children: [], paths: [] };
  return exists ? "diganti" : "double";
};

// jsonwebtoken minimal (HS256) bila paket npm tidak terpasang
const base64url = (b) => Buffer.from(b).toString("base64url");
const jwtDouble = {
  sign(payload, secret, opts = {}) {
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, iss: opts.issuer, aud: opts.audience };
    if (typeof opts.expiresIn === "number") body.exp = now + opts.expiresIn;
    const head = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const data = `${head}.${base64url(JSON.stringify(body))}`;
    return `${data}.${crypto.createHmac("sha256", secret).update(data).digest("base64url")}`;
  },
  verify(token, secret, opts = {}) {
    const parts = String(token).split(".");
    if (parts.length !== 3) throw new Error("jwt malformed");
    const sig = crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest("base64url");
    if (sig.length !== parts[2].length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(parts[2]))) throw new Error("invalid signature");
    const body = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) throw new Error("jwt expired");
    if (opts.issuer && body.iss !== opts.issuer) throw new Error("jwt issuer invalid");
    if (opts.audience && body.aud !== opts.audience) throw new Error("jwt audience invalid");
    return body;
  },
};

const install = ({ supabase, drive, storage }) => {
  const report = {};
  try { require.resolve("jsonwebtoken"); report.jsonwebtoken = "nyata"; }
  catch { virtual.set("jsonwebtoken", "virtual:jsonwebtoken"); require.cache["virtual:jsonwebtoken"] = { id: "virtual:jsonwebtoken", filename: "virtual:jsonwebtoken", loaded: true, exports: jwtDouble, children: [], paths: [] }; report.jsonwebtoken = "double"; }

  class AppErrorDouble extends Error {
    constructor(message, statusCode = 500, code = "ERROR", details) {
      super(message); this.statusCode = statusCode; this.status = statusCode; this.code = code; this.details = details;
    }
  }
  report["utils/AppError"] = provide("utils/AppError", AppErrorDouble);
  const AppError = require(path.join(SRC, "utils/AppError"));

  report["utils/dbError"] = provide("utils/dbError", {
    throwDbError(context, error) {
      console.error(`[DB] ${context}: ${(error && error.message) || error}`);
      throw new AppError("Terjadi kesalahan pada database", 500, "DATABASE_ERROR");
    },
  });
  report["utils/searchTerm"] = provide("utils/searchTerm", {
    cleanSearchTerm: (s) => String(s).replace(/[%,()]/g, " ").trim(),
    escapeLikeTerm: (s) => String(s).replace(/[\\%_]/g, "\\$&"),
  });
  report["utils/accreditationExpiry"] = provide("utils/accreditationExpiry", {
    EXPIRY_STATUSES: ["unknown", "expired", "expiring", "active"],
    getExpiryBoundaries: () => ({ today: "1970-01-01", expiringUntil: "1970-01-01" }),
    computeExpiryStatus: () => "unknown",
    computeDaysUntilExpiry: () => null,
  });
  report["validators/accreditationValidator"] = provide("validators/accreditationValidator", {
    DEFAULT_INSTITUTION_NAME: "Universitas LIA",
    DEFAULT_ISSUER: "BAN-PT",
  });
  report["utils/documentStorage"] = provide("utils/documentStorage", {
    removeDocumentObjectQuietly: async (p, context) => {
      if (!p) return;
      const { error } = await supabase.storage.from(storage.BUCKET).remove([p]);
      if (error) console.error(`[ORPHAN] storage:${p} (${context}) gagal dihapus: ${error.message}`);
    },
    createDocumentSignedUrl: async (p) => {
      const { data, error } = await supabase.storage.from(storage.BUCKET).createSignedUrl(p, 600);
      return error ? null : { url: data.signedUrl, expiresAt: new Date(Date.now() + 600000).toISOString() };
    },
  });
  report["services/banptRegulationService"] = provide("services/banptRegulationService", {
    getDriveFile: async () => { throw new AppError("Regulasi tidak ditemukan", 404, "NOT_FOUND"); },
  });
  report["config/env"] = provide("config/env", {
    backendPublicUrl: "",
    jwtSecret: process.env.JWT_SECRET,
    frontendOrigins: ["http://localhost:3000"],
  });
  report["config/supabase"] = provide("config/supabase", supabase, { force: true });
  report["services/googleDriveService"] = provide("services/googleDriveService", drive, { force: true });
  return report;
};

module.exports = { install, SRC };
