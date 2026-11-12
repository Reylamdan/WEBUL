// Pembuat ZIP review yang aman (tanpa dependensi eksternal).
//
//   node scripts/packageReview.js
//   node scripts/packageReview.js --output dist/nama.zip
//   node scripts/packageReview.js --dry-run --list
//
// Aturan utama:
//   * .env, .env.* (kecuali .env.example), kunci privat, file kredensial, arsip lain,
//     node_modules, .git, dan output dist TIDAK ikut.
//   * Isi file tidak pernah dicetak. Hanya nama file dan ringkasan yang ditampilkan.
//   * Setelah ZIP dibuat, isinya diverifikasi ulang; bila ada file terlarang, ZIP dihapus
//     dan proses gagal (exit code 1).

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { classifyPath, toPosix, SAFE_ENV_EXAMPLE } = require("./lib/packageRules");

const ROOT = path.resolve(__dirname, "..");
const PROJECT_SLUG = "be-review";

// ---------- CRC32 (diperlukan format ZIP) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (date = new Date()) => {
  const year = Math.max(1980, date.getFullYear());
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const day = (((year - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { time, day };
};

const writeUInt32 = (value) => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value >>> 0, 0);
  return buf;
};
const writeUInt16 = (value) => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value & 0xffff, 0);
  return buf;
};

// Membuat buffer ZIP dari daftar { name, data } (name memakai pemisah "/").
const createZipBuffer = (entries) => {
  const { time, day } = dosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(toPosix(entry.name), "utf8");
    const uncompressed = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const compressed = zlib.deflateRawSync(uncompressed, { level: 9 });
    const crc = crc32(uncompressed);
    const useDeflate = compressed.length < uncompressed.length;
    const payload = useDeflate ? compressed : uncompressed;
    const method = useDeflate ? 8 : 0;
    const flags = 0x0800; // nama file UTF-8

    const local = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(flags),
      writeUInt16(method),
      writeUInt16(time),
      writeUInt16(day),
      writeUInt32(crc),
      writeUInt32(payload.length),
      writeUInt32(uncompressed.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name,
      payload,
    ]);
    localParts.push(local);

    const central = Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(flags),
      writeUInt16(method),
      writeUInt16(time),
      writeUInt16(day),
      writeUInt32(crc),
      writeUInt32(payload.length),
      writeUInt32(uncompressed.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      name,
    ]);
    centralParts.push(central);
    offset += local.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const centralOffset = offset;
  const eocd = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.length),
    writeUInt16(entries.length),
    writeUInt32(centralSize),
    writeUInt32(centralOffset),
    writeUInt16(0),
  ]);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
};

// Membaca nama entri dari buffer ZIP (untuk verifikasi; tidak mengekstrak isi).
const listZipEntries = (buffer) => {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  const start = Math.max(0, buffer.length - 0xffff - 22);
  for (let i = buffer.length - 22; i >= start; i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP tidak valid: EOCD tidak ditemukan");
  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const names = [];
  let pointer = centralOffset;
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) throw new Error("ZIP tidak valid: central directory rusak");
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    names.push(buffer.subarray(pointer + 46, pointer + 46 + nameLength).toString("utf8"));
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return names;
};

// Berjalan rekursif tanpa mengikuti symlink (mencegah file di luar proyek ikut terpaket).
const collectFiles = (root) => {
  const included = [];
  const excluded = [];
  const walk = (dir, relativeDir = "") => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const decision = classifyPath(relative);
      if (decision.excluded) {
        // Folder yang dikecualikan cukup dicatat sekali, tidak ditelusuri.
        excluded.push({ name: relative, reason: decision.reason, directory: entry.isDirectory() });
        continue;
      }
      if (entry.isSymbolicLink()) {
        excluded.push({ name: relative, reason: "symlink tidak diikuti", directory: false });
        continue;
      }
      if (entry.isDirectory()) walk(absolute, relative);
      else if (entry.isFile()) included.push({ name: relative, absolute });
    }
  };
  walk(root);
  included.sort((a, b) => a.name.localeCompare(b.name));
  return { included, excluded };
};

const parseArgs = (argv) => {
  const options = {
    root: ROOT,
    output: null,
    dryRun: false,
    list: false,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output" || arg === "-o") options.output = argv[++i];
    else if (arg === "--root") options.root = path.resolve(argv[++i]);
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--list") options.list = true;
    else if (arg === "--quiet") options.quiet = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("Penggunaan: node scripts/packageReview.js [--output <file.zip>] [--root <folder>] [--dry-run] [--list] [--quiet]");
      process.exit(0);
    } else {
      throw new Error(`Argumen tidak dikenal: ${arg}`);
    }
  }
  if (options.output) options.output = path.resolve(options.output);
  return options;
};

const defaultOutput = (root = ROOT) => {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
  return path.join(root, "dist", `${PROJECT_SLUG}-${stamp}.zip`);
};

const verifyEntries = (names, { output }) => {
  const problems = [];
  for (const name of names) {
    const decision = classifyPath(name);
    if (decision.excluded) problems.push(`${name} (${decision.reason})`);
  }
  if (!names.includes(SAFE_ENV_EXAMPLE)) problems.push(`${SAFE_ENV_EXAMPLE} tidak ditemukan`);
  if (names.some((name) => name !== SAFE_ENV_EXAMPLE && (name === ".env" || /(^|\/)\.env(\.|$)/.test(name)))) {
    problems.push("ada file .env selain .env.example");
  }
  if (names.some((name) => name === toPosix(path.basename(output)))) {
    problems.push("ZIP keluaran ikut terpaket");
  }
  return problems;
};

/**
 * Membuat paket. Mengembalikan { output, included, excluded, names, dryRun }.
 * Bila verifikasi gagal, file ZIP dihapus dan error dilempar.
 */
const createPackage = ({ root = ROOT, output = null, dryRun = false } = {}) => {
  const resolvedRoot = path.resolve(root);
  const resolvedOutput = path.resolve(output || defaultOutput(resolvedRoot));
  if (!fs.existsSync(resolvedRoot)) throw new Error(`Folder proyek tidak ditemukan: ${resolvedRoot}`);

  const { included, excluded } = collectFiles(resolvedRoot);
  const names = included.map((entry) => entry.name);

  if (dryRun) {
    return { output: resolvedOutput, included, excluded, names, dryRun: true };
  }

  const entries = included.map((entry) => ({ name: entry.name, data: fs.readFileSync(entry.absolute) }));
  const buffer = createZipBuffer(entries);

  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, buffer);

  const problems = verifyEntries(listZipEntries(buffer), { output: resolvedOutput });
  if (problems.length > 0) {
    try { fs.unlinkSync(resolvedOutput); } catch { /* abaikan */ }
    throw new Error(`Verifikasi paket gagal:\n- ${problems.join("\n- ")}`);
  }

  return { output: resolvedOutput, included, excluded, names, dryRun: false, bytes: buffer.length };
};

const main = () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = createPackage(options);
    if (options.list) {
      for (const name of result.names) console.log(`  ${name}`);
    }
    if (!options.quiet) {
      console.log(`${result.dryRun ? "RENCANA PAKET" : "PAKET DIBUAT"}: ${result.output}`);
      console.log(`  file disertakan : ${result.included.length}`);
      console.log(`  file dikecualikan: ${result.excluded.length} (rahasia/node_modules/.git/arsip/OS)`);
      console.log(`  .env.example    : ${result.names.includes(SAFE_ENV_EXAMPLE) ? "disertakan" : "TIDAK DITEMUKAN"}`);
      if (result.excluded.length > 0) {
        const categories = new Map();
        for (const item of result.excluded) {
          const key = item.reason || "lain";
          categories.set(key, (categories.get(key) || 0) + 1);
        }
        for (const [reason, count] of categories) console.log(`    - ${reason}: ${count}`);
      }
      if (!result.dryRun) console.log(`  ukuran          : ${result.bytes} byte`);
    }
  } catch (error) {
    console.error(`[PACKAGING] GAGAL: ${error.message}`);
    process.exitCode = 1;
  }
};

if (require.main === module) main();

module.exports = {
  ROOT,
  SAFE_ENV_EXAMPLE,
  classifyPath,
  collectFiles,
  createZipBuffer,
  listZipEntries,
  verifyEntries,
  createPackage,
  defaultOutput,
};
