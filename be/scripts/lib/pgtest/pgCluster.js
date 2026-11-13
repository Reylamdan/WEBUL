// Cluster PostgreSQL SEMENTARA untuk pengujian (bukan database Supabase Anda).
//   - Dibuat di folder temp, hanya mendengarkan unix socket (tanpa port TCP), dihapus setelah tes.
//   - Memakai binary PostgreSQL lokal (initdb/pg_ctl/psql). Jika tidak ada -> tes DILEWATI dengan pesan jelas.
//   - Tidak pernah terhubung ke database jarak jauh; tidak membaca DATABASE_URL / SUPABASE_*.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const findBinDir = () => {
  const candidates = [];
  if (process.env.TEST_PG_BIN) candidates.push(process.env.TEST_PG_BIN);
  try {
    for (const v of fs.readdirSync("/usr/lib/postgresql")) candidates.push(`/usr/lib/postgresql/${v}/bin`);
  } catch { /* tidak ada */ }
  candidates.push("/usr/local/pgsql/bin", "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin");
  for (const dir of candidates.sort().reverse()) {
    if (fs.existsSync(path.join(dir, "initdb")) && fs.existsSync(path.join(dir, "pg_ctl")) && fs.existsSync(path.join(dir, "psql"))) return dir;
  }
  return null;
};

const parsePgError = (stderr) => {
  const m = /ERROR:\s+([0-9A-Z]{5}):\s+([^\n]*)/.exec(stderr || "");
  return m ? { code: m[1], message: m[2].trim() } : { code: "XX000", message: String(stderr || "").trim().split("\n")[0] || "error" };
};

const createCluster = () => {
  const bin = findBinDir();
  if (!bin) return null;

  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const runAs = isRoot ? ["runuser", "-u", "postgres", "--"] : [];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lia-pgtest-"));
  const dataDir = path.join(root, "data");
  const sockDir = path.join(root, "sock");
  fs.mkdirSync(sockDir);
  if (isRoot) {
    spawnSync("chown", ["-R", "postgres:postgres", root]);
    fs.chmodSync(root, 0o755);
  }

  const run = (cmd, args, input) => {
    const [exe, ...pre] = [...runAs, cmd];
    return spawnSync(exe, [...pre, ...args], { input, encoding: "utf8", env: { PATH: process.env.PATH, LANG: "C" } });
  };

  const init = run(path.join(bin, "initdb"), ["-D", dataDir, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--no-sync"]);
  if (init.status !== 0) throw new Error(`initdb gagal: ${init.stderr}`);
  const start = run(path.join(bin, "pg_ctl"), [
    "-D", dataDir, "-w", "-t", "60", "-l", path.join(root, "pg.log"),
    "-o", `-c listen_addresses='' -c unix_socket_directories='${sockDir}' -c fsync=off -c synchronous_commit=off -c full_page_writes=off`,
    "start",
  ]);
  if (start.status !== 0) throw new Error(`pg_ctl start gagal: ${start.stderr || start.stdout}`);

  const baseArgs = (db) => ["-X", "-q", "-A", "-t", "-h", sockDir, "-U", "postgres", "-d", db, "-v", "VERBOSITY=verbose", "-v", "ON_ERROR_STOP=1"];
  const psqlBin = path.join(bin, "psql");

  // Jalankan SQL; kembalikan { ok, out, error:{code,message}, notices }
  const exec = (db, sql) => {
    const r = run(psqlBin, [...baseArgs(db), "-f", "-"], sql);
    if (r.status !== 0) return { ok: false, out: r.stdout, error: parsePgError(r.stderr), stderr: r.stderr };
    return { ok: true, out: r.stdout, notices: r.stderr, error: null };
  };

  const createDb = (name) => {
    const r = exec("postgres", `create database "${name}"`);
    if (!r.ok) throw new Error(`create database gagal: ${r.stderr}`);
    return name;
  };

  const stop = () => {
    run(path.join(bin, "pg_ctl"), ["-D", dataDir, "-m", "immediate", "-w", "stop"]);
    fs.rmSync(root, { recursive: true, force: true });
  };

  const version = (run(psqlBin, ["--version"]).stdout || "").trim();
  return { exec, createDb, stop, version, root };
};

module.exports = { createCluster, findBinDir };
