// Pengujian constraint database + alur dokumen akreditasi INSTITUSI terhadap PostgreSQL SUNGGUHAN.
//
//   node scripts/testAccreditationConstraints.js
//
// Cara kerja:
//   * Membuat cluster PostgreSQL SEMENTARA di folder temp (unix socket, tanpa jaringan), lalu menghapusnya.
//     TIDAK menyentuh database Supabase Anda dan tidak membaca kredensial apa pun.
//   * File migrasi ASLI (migrations/*.sql) dijalankan di cluster itu; constraint ditegakkan oleh PostgreSQL,
//     bukan oleh tiruan di JavaScript.
//   * Kode ASLI accreditationService + fileController dijalankan terhadap tabel PostgreSQL itu
//     (Google Drive diganti penyimpanan di memori).
//
// Skema uji adalah REKONSTRUKSI (lihat scripts/lib/pgtest/schema.js): definisi constraint lama yang persis tidak
// diketahui, sehingga diuji beberapa varian. Hasil di sini TIDAK menggantikan verifikasi di Supabase Anda;
// jalankan query pemeriksaan di migrations/*_precheck.sql sebelum & sesudah migrasi.
//
// Jika PostgreSQL lokal (initdb/pg_ctl/psql) tidak ada, tes DILEWATI dan keluar dengan kode 2 (bukan "lulus").

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { createCluster } = require("./lib/pgtest/pgCluster");
const { OLD_VARIANTS, institutionsTable, studyProgramsTable, cleanupQueueTable } = require("./lib/pgtest/schema");
const { createSupabasePg, lit } = require("./lib/pgtest/supabasePg");
const { createFakeDriveLite } = require("./lib/pgtest/fakeDriveLite");
const doubles = require("./lib/pgtest/moduleDoubles");

const MIGRATION_FILE = fs
  .readdirSync(path.join(__dirname, "..", "migrations"))
  .filter((f) => f.endsWith("_drive_document_constraint.sql"))
  .sort()
  .pop();

// Salinan kerja ini mungkin tidak memuat migrasi akreditasi. Jangan crash: lewati dengan kode 2
// agar jelas bahwa tes ini TIDAK berjalan (bukan lulus).
if (!MIGRATION_FILE) {
  console.log(
    "DILEWATI: file migrasi *_drive_document_constraint.sql tidak ditemukan di folder migrations/. " +
      "Tes constraint akreditasi tidak dijalankan."
  );
  process.exit(2);
}

const MIGRATION_SQL = fs.readFileSync(path.join(__dirname, "..", "migrations", MIGRATION_FILE), "utf8");
const PRECHECK_FILE = MIGRATION_FILE.replace(".sql", "_precheck.sql");
const PRECHECK_SQL = fs.readFileSync(path.join(__dirname, "..", "migrations", PRECHECK_FILE), "utf8");

let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  OK    ${name}`); }
  catch (e) { failed += 1; console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n").slice(0, 4).join("\n        ")}`); }
};

const cluster = createCluster();
if (!cluster) {
  console.log("DILEWATI: PostgreSQL lokal (initdb/pg_ctl/psql) tidak ditemukan. Set TEST_PG_BIN ke folder bin PostgreSQL.");
  process.exit(2);
}

const sc = (e) => (e ? (e.statusCode !== undefined ? e.statusCode : e.status) : undefined); // AppError: statusCode atau status
const T_INST = "accreditation_institutions";
const T_PROG = "accreditation_study_programs";
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MIB10 = 10 * 1024 * 1024;

// ---------- helper SQL ----------
let dbSeq = 0;
const newDb = (variant, opts = {}) => {
  const name = `t${++dbSeq}`;
  cluster.createDb(name);
  const r = cluster.exec(name, institutionsTable(OLD_VARIANTS[variant] || variant, opts) + studyProgramsTable + cleanupQueueTable);
  assert.ok(r.ok, `skema uji gagal: ${r.stderr}`);
  return name;
};
const sql = (db, text) => cluster.exec(db, text);
const scalar = (db, text) => {
  const r = cluster.exec(db, text);
  assert.ok(r.ok, r.stderr);
  return r.out.trim();
};
const applyMigration = (db) => sql(db, MIGRATION_SQL);
const constraintDefs = (db, table = T_INST) =>
  scalar(db, `select string_agg(conname || ' := ' || pg_get_constraintdef(oid), E'\\n' order by conname) from pg_constraint where conrelid='public.${table}'::regclass and contype='c'`);
const tableDigest = (db, table = T_INST) => scalar(db, `select coalesce(md5(string_agg(t::text, '|' order by id)),'-') from public.${table} t`);
const columnList = (db, table) => scalar(db, `select string_agg(column_name||':'||data_type, ',' order by column_name) from information_schema.columns where table_schema='public' and table_name='${table}'`);

let skSeq = 0;
const insertInst = (db, o = {}) => {
  const keys = Object.keys(o);
  const cols = ["sk_number", ...keys].join(", ");
  const vals = [lit(`SK-${++skSeq}`), ...keys.map((k) => lit(o[k]))].join(", ");
  return sql(db, `insert into public.${T_INST} (${cols}) values (${vals})`);
};

const D = { name: "SK.pdf", mime: "application/pdf", size: 1234 };
const meta = { document_name: D.name, document_mime: D.mime, document_size: D.size };
// Matriks aturan BARU: [nama, kolom, diterima?]
const MATRIX = [
  ["tanpa dokumen (semua kolom dokumen NULL)", {}, true],
  ["dokumen LEGACY Supabase (path + name + mime + size)", { document_path: "institutions/x/doc.pdf", ...meta }, true],
  ["dokumen Google Drive (drive id + name + mime + size, path NULL) <- bentuk yang ditulis setDriveDocument()", { document_drive_file_id: "1AbC", ...meta }, true],
  ["dokumen Google Drive + md5", { document_drive_file_id: "1AbC", document_md5: "d41d8cd98f00b204e9800998ecf8427e", ...meta }, true],
  ["dokumen Google Drive PNG 10 MB", { document_drive_file_id: "1AbC", document_name: "s.png", document_mime: "image/png", document_size: MIB10 }, true],
  ["DITOLAK: drive id saja tanpa name/mime/size", { document_drive_file_id: "1AbC" }, false],
  ["DITOLAK: drive id + name saja", { document_drive_file_id: "1AbC", document_name: D.name }, false],
  ["DITOLAK: drive id tanpa size", { document_drive_file_id: "1AbC", document_name: D.name, document_mime: D.mime }, false],
  ["DITOLAK: drive id tanpa mime", { document_drive_file_id: "1AbC", document_name: D.name, document_size: 5 }, false],
  ["DITOLAK: path DAN drive id sekaligus (dua sumber)", { document_path: "p/x.pdf", document_drive_file_id: "1AbC", ...meta }, false],
  ["DITOLAK: metadata tanpa sumber (name/mime/size tanpa path & drive id)", { ...meta }, false],
  ["DITOLAK: md5 saja tanpa dokumen", { document_md5: "abc" }, false],
  ["DITOLAK: md5 pada dokumen legacy (md5 hanya untuk Drive)", { document_path: "p/x.pdf", ...meta, document_md5: "abc" }, false],
  ["DITOLAK: legacy tanpa size", { document_path: "p/x.pdf", document_name: D.name, document_mime: D.mime }, false],
  ["DITOLAK: legacy tanpa name", { document_path: "p/x.pdf", document_mime: D.mime, document_size: 5 }, false],
];

(async () => {
  console.log(`PostgreSQL uji: ${cluster.version} (cluster sementara, tanpa jaringan)\n`);
  const cleanups = [];

  try {
    // ===================================================================
    console.log("1. Bukti masalah: constraint LAMA menolak dokumen Google Drive (3 varian definisi lama)");
    for (const variant of Object.keys(OLD_VARIANTS)) {
      await test(`[${variant}] baris dokumen Drive ditolak 23514 (check_violation) sebelum migrasi; dokumen legacy diterima`, async () => {
        const db = newDb(variant);
        const bad = insertInst(db, { document_drive_file_id: "1AbC", ...meta });
        assert.equal(bad.ok, false, "seharusnya ditolak oleh constraint lama");
        assert.equal(bad.error.code, "23514");
        assert.match(bad.error.message, /acc_inst_document/);
        assert.ok(insertInst(db, { document_path: "p/lama.pdf", ...meta }).ok, "legacy harus diterima");
      });
    }

    // ===================================================================
    console.log("\n2. Migrasi: penerapan, data tidak berubah, legacy tetap valid (3 varian)");
    const migrated = {};
    for (const variant of Object.keys(OLD_VARIANTS)) {
      await test(`[${variant}] migrasi berhasil; SELURUH isi tabel (termasuk updated_at) identik sebelum/sesudah; legacy tetap valid`, async () => {
        const db = newDb(variant);
        assert.ok(insertInst(db, { document_path: "p/lama.pdf", ...meta }).ok);
        assert.ok(insertInst(db, {}).ok);
        const before = tableDigest(db);
        const r = applyMigration(db);
        assert.ok(r.ok, r.stderr);
        assert.match(r.notices, /OK: constraint dokumen akreditasi institusi terpasang/);
        assert.equal(tableDigest(db), before, "data berubah!");
        assert.equal(scalar(db, `select count(*) from public.${T_INST}`), "2");
        // semua constraint tervalidasi terhadap data lama
        assert.equal(scalar(db, `select count(*) from pg_constraint where conrelid='public.${T_INST}'::regclass and contype='c' and not convalidated`), "0");
        migrated[variant] = db;
      });
    }
    await test("tidak ada UPDATE/INSERT/DELETE di file migrasi (hanya DDL + pemeriksaan)", async () => {
      const code = MIGRATION_SQL.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
      for (const kw of [/\binsert\s+into\b/i, /\bupdate\s+public\./i, /\bdelete\s+from\b/i, /\btruncate\b/i, /\bdrop\s+table\b/i, /\bdrop\s+column\b/i]) {
        assert.ok(!kw.test(code), `ditemukan ${kw}`);
      }
      assert.ok(/accreditation_institutions/.test(code) && !/accreditation_study_programs|banpt|regulation/i.test(code), "hanya menyentuh tabel institusi");
    });

    // ===================================================================
    console.log("\n3. Aturan constraint BARU diuji pada PostgreSQL asli (matriks diterima/ditolak)");
    const baseDb = migrated.A_all_or_nothing_on_path;
    for (const [name, cols, ok] of MATRIX) {
      await test(name, async () => {
        const r = insertInst(baseDb, cols);
        if (ok) assert.ok(r.ok, `seharusnya diterima: ${r.stderr}`);
        else {
          assert.equal(r.ok, false, "seharusnya ditolak");
          assert.equal(r.error.code, "23514", r.stderr);
          assert.match(r.error.message, /acc_inst_document|accreditation_institutions_document_one_source/);
        }
      });
    }
    await test("hasil matriks IDENTIK untuk ketiga varian definisi lama (migrasi tidak bergantung definisi lama)", async () => {
      const outcomes = (db) => MATRIX.map(([, cols]) => (insertInst(db, cols).ok ? "ok" : "ditolak")).join(",");
      const expected = MATRIX.map(([, , ok]) => (ok ? "ok" : "ditolak")).join(",");
      for (const variant of Object.keys(migrated)) assert.equal(outcomes(migrated[variant]), expected, variant);
    });
    await test("UPDATE ke bentuk Drive diterima; UPDATE yang merusak aturan ditolak (bukan hanya INSERT)", async () => {
      const db = baseDb;
      const id = scalar(db, `insert into public.${T_INST}(sk_number) values ('UPD-1') returning id`).split("\n")[0];
      assert.ok(sql(db, `update public.${T_INST} set document_drive_file_id='F1', document_name='a.pdf', document_mime='application/pdf', document_size=9, document_md5='m' where id='${id}'`).ok);
      assert.equal(sql(db, `update public.${T_INST} set document_name=null where id='${id}'`).error.code, "23514");
      assert.equal(sql(db, `update public.${T_INST} set document_path='x/y.pdf' where id='${id}'`).error.code, "23514", "dua sumber");
      assert.ok(sql(db, `update public.${T_INST} set document_drive_file_id=null, document_name=null, document_mime=null, document_size=null, document_md5=null where id='${id}'`).ok, "mengosongkan semua kolom dokumen");
    });

    // ===================================================================
    console.log("\n4. Migrasi: idempotent, pembatalan aman, kolom hilang, tabel lain tidak tersentuh");
    await test("dijalankan ulang 3x: sukses, definisi constraint & isi tabel tidak berubah", async () => {
      const db = migrated.B_strict_on_path;
      const defs = constraintDefs(db), digest = tableDigest(db);
      for (let i = 0; i < 3; i++) { const r = applyMigration(db); assert.ok(r.ok, r.stderr); }
      assert.equal(constraintDefs(db), defs); assert.equal(tableDigest(db), digest);
    });
    await test("pra-pemeriksaan: data melanggar aturan baru -> migrasi DIBATALKAN total, pesan memuat id, constraint lama & data utuh", async () => {
      const db = newDb("A_all_or_nothing_on_path");
      assert.ok(insertInst(db, { document_path: "p/a.pdf", document_md5: "md5-tak-sah", ...meta }).ok, "lolos aturan lama");
      const badId = scalar(db, `select id from public.${T_INST} where document_md5='md5-tak-sah'`);
      const defsBefore = constraintDefs(db), digest = tableDigest(db);
      const r = applyMigration(db);
      assert.equal(r.ok, false);
      assert.equal(r.error.code, "23514");
      assert.match(r.error.message, /Migrasi dibatalkan: 1 baris/);
      assert.ok(r.stderr.includes(badId), "pesan harus menyebut id baris bermasalah");
      assert.equal(constraintDefs(db), defsBefore, "constraint lama harus tetap (rollback)");
      assert.equal(tableDigest(db), digest);
    });
    await test("kolom document_drive_file_id/document_md5 belum ada -> ditambahkan; lalu dokumen Drive diterima", async () => {
      const db = newDb(`
        constraint acc_inst_document check (
          (document_path is null and document_name is null and document_mime is null and document_size is null)
          or (document_path is not null and document_name is not null and document_mime is not null and document_size is not null))`, { driveColumns: false });
      assert.ok(!/document_drive_file_id/.test(columnList(db, T_INST)));
      const r = applyMigration(db);
      assert.ok(r.ok, r.stderr);
      assert.match(columnList(db, T_INST), /document_drive_file_id:text/); assert.match(columnList(db, T_INST), /document_md5:text/);
      assert.ok(insertInst(db, { document_drive_file_id: "1AbC", ...meta }).ok);
    });
    await test("tabel program studi (dan skema lain) TIDAK berubah: constraint, kolom, isi", async () => {
      const db = newDb("A_all_or_nothing_on_path");
      assert.ok(sql(db, `insert into public.${T_PROG}(program_name, education_level, sk_number, document_drive_file_id, document_name, document_mime, document_size) values ('TI','S1','P-1','F9','a.pdf','application/pdf',3)`).ok);
      const snap = () => [constraintDefs(db, T_PROG), columnList(db, T_PROG), tableDigest(db, T_PROG), scalar(db, "select count(*) from public.drive_cleanup_queue")].join("\n--\n");
      const before = snap();
      assert.ok(applyMigration(db).ok);
      assert.equal(snap(), before);
    });
    await test("lock_timeout dipasang lokal (tidak menggantung bila tabel sibuk) dan seluruh migrasi satu transaksi (begin/commit)", async () => {
      assert.match(MIGRATION_SQL, /^begin;/m); assert.match(MIGRATION_SQL, /^commit;/m); assert.match(MIGRATION_SQL, /set local lock_timeout/);
    });
    await test("query pemeriksaan read-only dapat dijalankan; baris pelanggar = 0 setelah migrasi", async () => {
      assert.ok(!/\b(insert|update|delete|drop|alter|create|truncate)\b/i.test(PRECHECK_SQL.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n")), "harus hanya SELECT");
      const r = sql(migrated.C_null_equivalence, PRECHECK_SQL);
      assert.ok(r.ok, r.stderr);
      const dbBad = newDb("A_all_or_nothing_on_path");
      insertInst(dbBad, { document_path: "p/a.pdf", document_md5: "x", ...meta });
      const bad = scalar(dbBad, `select count(*) from (${PRECHECK_SQL.trim().split(";").filter((s) => /ada_path/.test(s))[0].replace(/order by id\s*$/i, "")}) q`);
      assert.equal(bad, "1", "query pelanggar harus menemukan baris tak sah pada skema lama");
      const after = scalar(migrated.A_all_or_nothing_on_path, `select count(*) from (${PRECHECK_SQL.trim().split(";").filter((s) => /ada_path/.test(s))[0].replace(/order by id\s*$/i, "")}) q`);
      assert.equal(after, "0");
    });

    // ===================================================================
    // Bagian service/endpoint: kode ASLI terhadap PostgreSQL
    const fd = createFakeDriveLite();
    let cur; // adaptor aktif
    const proxy = { from: (t) => cur.client.from(t), storage: { from: (b) => cur.client.storage.from(b) } };
    const storageRef = { BUCKET: "accreditation-documents" };
    const report = doubles.install({ supabase: proxy, drive: fd.api, storage: storageRef });
    const svc = require(path.join(doubles.SRC, "services/accreditationService"));
    const ctl = require(path.join(doubles.SRC, "controllers/fileController"));
    const { verifyFileToken } = require(path.join(doubles.SRC, "utils/fileAccess"));
    const entity = svc.ENTITIES.institution;
    const prodEntity = svc.ENTITIES.studyProgram;
    const logs = [];
    const origError = console.error;
    console.error = (...a) => logs.push(a.join(" "));
    cleanups.push(() => { console.error = origError; });
    console.log(`\n(modul: ${Object.entries(report).map(([k, v]) => `${k}=${v}`).join(", ")})`);

    const useDb = (db) => { cur = createSupabasePg({ cluster, db }); fd.reset(); logs.length = 0; return cur; };
    const pdf = (extra = "") => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}%%EOF`);
    const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
    const proc = (buffer, displayName = "SK Institusi.pdf", mimeType = "application/pdf") => ({ buffer, mimeType, size: buffer.length, displayName });
    let sk = 0;
    const mk = async (status = "draft") => (await svc.adminCreate(entity, { rank: "Unggul", skNumber: `SVC-${++sk}`, validFrom: "2024-01-01", validUntil: "2029-01-01", status }, ADMIN_ID));
    const rowOf = (id, table = T_INST) => JSON.parse(scalar(cur.dbName, `select row_to_json(t) from public.${table} t where id='${id}'`));
    const setDoc = async (id, processed) => svc.adminSetDocument(entity, await svc.loadForDocument(entity, id), processed);
    const rmDoc = async (id) => svc.adminRemoveDocument(entity, await svc.loadForDocument(entity, id));
    const raw = (text) => { const r = sql(cur.dbName, text); assert.ok(r.ok, r.stderr); };
    const attach = (db) => { const a = useDb(db); a.dbName = db; return a; };

    // ----- 5. service sebelum migrasi (bug nyata) -----
    console.log("\n5. Kode ASLI setDriveDocument() terhadap constraint LAMA: gagal aman (bukti masalah)");
    const preDb = newDb("A_all_or_nothing_on_path");
    attach(preDb);
    await test("upload dokumen baru ke Drive ditolak constraint lama -> 500 DATABASE_ERROR; file Drive baru dibersihkan; baris tidak berubah", async () => {
      const c = await mk();
      const before = JSON.stringify(rowOf(c.id));
      await assert.rejects(setDoc(c.id, proc(pdf("a"))), (e) => sc(e) === 500 && e.code === "DATABASE_ERROR");
      assert.equal(fd.live().length, 0, "file baru tidak boleh tertinggal di Drive");
      assert.equal(JSON.stringify(rowOf(c.id)), before);
      assert.ok(logs.some((l) => /acc_inst_document/.test(l)), "penyebab (acc_inst_document) tercatat di log");
    });

    // ----- 6. setelah migrasi -----
    console.log("\n6. Setelah migrasi: upload, ganti, hapus dokumen institusi (kode asli, constraint asli)");
    assert.ok(applyMigration(preDb).ok);
    attach(preDb);
    let inst;
    await test("upload PDF baru -> tersimpan: path NULL, drive id, name, mime, size, md5 terisi; lolos constraint", async () => {
      inst = await mk();
      const out = await setDoc(inst.id, proc(pdf("a")));
      const r = rowOf(inst.id);
      assert.equal(r.document_path, null);
      assert.match(r.document_drive_file_id, /^drv_/);
      assert.equal(r.document_name, "SK Institusi.pdf"); assert.equal(r.document_mime, "application/pdf");
      assert.equal(r.document_size, pdf("a").length); assert.match(r.document_md5, /^[0-9a-f]{32}$/);
      assert.equal(out.document.mimeType, "application/pdf"); assert.equal(fd.live().length, 1);
      assert.equal(fd.state.calls.find((c) => c.op === "upload").parentId, "folder-akreditasi-institusi");
    });
    await test("respons admin tidak membocorkan drive id / path / md5", async () => {
      const out = await svc.adminGet(entity, inst.id);
      const text = JSON.stringify(out);
      for (const leak of ["drv_", "document_path", "document_md5", "driveFileId", "documentPath"]) assert.ok(!text.includes(leak), leak);
    });
    await test("ganti Drive -> Drive: DB menunjuk file baru; file lama dibuang SETELAH DB beralih; hanya 1 file hidup", async () => {
      const old = rowOf(inst.id).document_drive_file_id;
      await setDoc(inst.id, proc(png(), "scan.png", "image/png"));
      const r = rowOf(inst.id);
      assert.notEqual(r.document_drive_file_id, old); assert.equal(r.document_mime, "image/png");
      assert.ok(fd.state.files.get(old).trashed); assert.equal(fd.live().length, 1); assert.equal(fd.live()[0].id, r.document_drive_file_id);
      const order = fd.state.calls.map((c) => c.op);
      assert.ok(order.lastIndexOf("upload") < order.lastIndexOf("remove"), "unggah baru sebelum hapus lama");
    });
    await test("Drive gagal saat upload -> 502, dokumen lama utuh (DB & Drive)", async () => {
      const before = rowOf(inst.id); fd.state.failUpload = true;
      await assert.rejects(setDoc(inst.id, proc(pdf("z"))), (e) => sc(e) === 502 && e.code === "STORAGE_ERROR");
      fd.state.failUpload = false;
      assert.deepEqual(rowOf(inst.id), before); assert.ok(!fd.state.files.get(before.document_drive_file_id).trashed);
    });
    await test("DB gagal saat simpan -> 500; file baru dibersihkan; file lama TIDAK dihapus; baris utuh", async () => {
      const before = rowOf(inst.id); const live = fd.live().length;
      cur.faults.push({ table: T_INST, op: "update", error: { code: "XX000", message: "boom" } });
      await assert.rejects(setDoc(inst.id, proc(pdf("y"))), (e) => sc(e) === 500);
      assert.deepEqual(rowOf(inst.id), before); assert.equal(fd.live().length, live);
      assert.ok(!fd.state.files.get(before.document_drive_file_id).trashed);
    });
    await test("perubahan bersamaan (CAS gagal) -> 409; file baru dibersihkan; file milik admin lain TIDAK dihapus", async () => {
      const original = rowOf(inst.id).document_drive_file_id;
      const other = await fd.api.uploadFile({ name: "lain.pdf", mimeType: "application/pdf", buffer: pdf("lain"), parentId: "p", appProperties: {} });
      cur.hooks.beforeUpdate = () => raw(`update public.${T_INST} set document_drive_file_id='${other.id}' where id='${inst.id}'`);
      await assert.rejects(setDoc(inst.id, proc(pdf("x"))), (e) => sc(e) === 409 && e.code === "DOCUMENT_CONFLICT");
      assert.equal(rowOf(inst.id).document_drive_file_id, other.id, "metadata terbaru tidak ditimpa");
      assert.ok(!fd.state.files.get(other.id).trashed, "file yang direferensikan admin lain harus hidup");
      assert.ok(!fd.state.files.get(original).trashed, "file lama tidak boleh ikut terhapus");
      assert.equal(fd.live().length, 2, "file baru dari request yang kalah sudah dibersihkan");
      raw(`update public.${T_INST} set document_drive_file_id='${original}' where id='${inst.id}'`);
      await fd.api.removeFile(other.id);
    });
    await test("hapus file lama di Drive gagal -> tetap sukses, DB menunjuk file baru, file lama MASUK ANTREAN drive_cleanup_queue", async () => {
      const old = rowOf(inst.id).document_drive_file_id; fd.state.failRemove = true;
      await setDoc(inst.id, proc(pdf("n2"), "n2.pdf"));
      fd.state.failRemove = false;
      assert.notEqual(rowOf(inst.id).document_drive_file_id, old);
      assert.equal(scalar(cur.dbName, `select count(*) from public.drive_cleanup_queue where file_id='${old}'`), "1");
      assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes(old)));
      raw("delete from public.drive_cleanup_queue"); await fd.api.removeFile(old);
    });
    await test("DELETE dokumen Drive -> SEMUA kolom dokumen (termasuk md5) NULL; lolos constraint; file dibuang; data tetap ada", async () => {
      const id = rowOf(inst.id).document_drive_file_id;
      const out = await rmDoc(inst.id);
      const r = rowOf(inst.id);
      for (const k of ["document_path", "document_drive_file_id", "document_md5", "document_name", "document_mime", "document_size"]) assert.equal(r[k], null, k);
      assert.equal(out.document, null); assert.ok(fd.state.files.get(id).trashed); assert.equal(fd.live().length, 0);
      await assert.rejects(rmDoc(inst.id), (e) => sc(e) === 404 && e.code === "DOCUMENT_NOT_FOUND");
    });
    await test("DB gagal saat hapus dokumen -> 500; file Drive TIDAK dibuang; metadata utuh", async () => {
      await setDoc(inst.id, proc(pdf("k"), "k.pdf"));
      const before = rowOf(inst.id);
      cur.faults.push({ table: T_INST, op: "update", error: { code: "XX000", message: "boom" } });
      await assert.rejects(rmDoc(inst.id), (e) => sc(e) === 500);
      assert.deepEqual(rowOf(inst.id), before); assert.ok(!fd.state.files.get(before.document_drive_file_id).trashed);
    });
    await test("hapus DATA institusi -> file Drive ikut dibuang; DB gagal menghapus -> file TIDAK dibuang", async () => {
      const before = rowOf(inst.id);
      cur.faults.push({ table: T_INST, op: "delete", error: { code: "XX000", message: "boom" } });
      await assert.rejects(svc.adminDelete(entity, inst.id), (e) => sc(e) === 500);
      assert.ok(!fd.state.files.get(before.document_drive_file_id).trashed);
      await svc.adminDelete(entity, inst.id);
      assert.ok(fd.state.files.get(before.document_drive_file_id).trashed);
      assert.equal(scalar(cur.dbName, `select count(*) from public.${T_INST} where id='${inst.id}'`), "0");
    });

    // ----- 7. pemeriksaan berlapis (MIME/ukuran) -----
    console.log("\n7. Validasi MIME PDF/JPEG/PNG & ukuran maks 10 MB dipertahankan (pemeriksaan berlapis sebelum Drive)");
    const v = await mk();
    const noUpload = async (name, processed, status, code) => test(name, async () => {
      const uploads = fd.state.calls.filter((c) => c.op === "upload").length;
      await assert.rejects(setDoc(v.id, processed), (e) => sc(e) === status && e.code === code);
      assert.equal(fd.state.calls.filter((c) => c.op === "upload").length, uploads, "tidak boleh ada unggahan ke Drive");
      assert.equal(rowOf(v.id).document_drive_file_id, null);
    });
    await noUpload("MIME text/html ditolak 415 sebelum upload", proc(Buffer.from("<html>"), "a.html", "text/html"), 415, "UNSUPPORTED_FILE_TYPE");
    await noUpload("MIME Word (.docx) ditolak 415 untuk dokumen institusi", proc(Buffer.from("PK"), "a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), 415, "UNSUPPORTED_FILE_TYPE");
    await noUpload("ukuran 10 MB + 1 byte ditolak 413", proc(Buffer.alloc(MIB10 + 1, 1)), 413, "FILE_TOO_LARGE");
    await noUpload("file kosong ditolak 400", proc(Buffer.alloc(0)), 400, "INVALID_DOCUMENT");
    await test("ukuran tepat 10 MB diterima dan lolos constraint; JPEG & PNG diterima", async () => {
      const big = Buffer.concat([pdf(), Buffer.alloc(MIB10 - pdf().length, 1)]);
      assert.equal(big.length, MIB10);
      await setDoc(v.id, proc(big, "besar.pdf"));
      assert.equal(rowOf(v.id).document_size, MIB10);
      await setDoc(v.id, proc(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]), "f.jpg", "image/jpeg"));
      assert.equal(rowOf(v.id).document_mime, "image/jpeg");
      await setDoc(v.id, proc(png(), "f.png", "image/png"));
      assert.equal(rowOf(v.id).document_mime, "image/png");
      await rmDoc(v.id);
    });

    // ----- 8. legacy -----
    console.log("\n8. Dokumen LEGACY Supabase tetap terbaca & aman");
    const LEG = "institutions/lama/doc.pdf";
    const seedLegacy = (o = {}) => {
      const id = crypto.randomUUID(); const p = o.path || LEG;
      raw(`insert into public.${T_INST}(id, sk_number, status, published_at, document_path, document_name, document_mime, document_size) values ('${id}', 'LEG-${++sk}', 'published', now() - interval '1 day', ${lit(p)}, 'Lama.pdf', 'application/pdf', 11)`);
      cur.storage.objects.add(`accreditation-documents/${p}`);
      return id;
    };
    const legacyId = seedLegacy();
    await test("detail PUBLIK & ADMIN dokumen legacy -> signed URL Supabase, bentuk respons lama (tanpa downloadUrl)", async () => {
      for (const out of [await svc.publicGet(entity, legacyId), await svc.adminGet(entity, legacyId)]) {
        assert.match(out.document.url, /\/object\/sign\/accreditation-documents\/institutions\/lama\/doc\.pdf\?token=/);
        assert.equal(out.document.name, "Lama.pdf"); assert.equal(out.document.size, 11); assert.ok(!("downloadUrl" in out.document));
      }
    });
    await test("route Drive untuk dokumen legacy -> 404 DOCUMENT_NOT_FOUND (akses tetap via signed URL)", async () => {
      await assert.rejects(svc.getDocumentFile(entity, legacyId, { publishedOnly: true }), (e) => sc(e) === 404 && e.code === "DOCUMENT_NOT_FOUND");
    });
    await test("legacy tetap terbaca walau Drive belum dikonfigurasi", async () => {
      fd.state.configured = false;
      const out = await svc.publicGet(entity, legacyId); fd.state.configured = true;
      assert.match(out.document.url, /sign/);
    });
    await test("Drive gagal / DB gagal / CAS gagal saat mengganti legacy -> objek Supabase lama TETAP utuh, baris utuh", async () => {
      const before = rowOf(legacyId);
      fd.state.failUpload = true;
      await assert.rejects(setDoc(legacyId, proc(pdf("g"))), (e) => sc(e) === 502); fd.state.failUpload = false;
      cur.faults.push({ table: T_INST, op: "update", error: { code: "XX000", message: "boom" } });
      await assert.rejects(setDoc(legacyId, proc(pdf("g2"))), (e) => sc(e) === 500);
      cur.hooks.beforeUpdate = () => raw(`update public.${T_INST} set document_path='institutions/lain/x.pdf' where id='${legacyId}'`);
      await assert.rejects(setDoc(legacyId, proc(pdf("g3"))), (e) => sc(e) === 409);
      raw(`update public.${T_INST} set document_path='${LEG}' where id='${legacyId}'`);
      assert.ok(cur.storage.objects.has(`accreditation-documents/${LEG}`));
      assert.equal(fd.live().length, 0, "tidak ada file Drive baru yang tertinggal");
      const after = rowOf(legacyId); delete before.updated_at; delete after.updated_at;
      assert.deepEqual(after, before);
    });
    await test("mengganti legacy -> pindah ke Drive (path NULL, lolos constraint); objek lama Supabase dihapus SETELAH DB beralih", async () => {
      await setDoc(legacyId, proc(pdf("pindah"), "Baru.pdf"));
      const r = rowOf(legacyId);
      assert.equal(r.document_path, null); assert.match(r.document_drive_file_id, /^drv_/);
      assert.ok(!cur.storage.objects.has(`accreditation-documents/${LEG}`)); assert.equal(fd.live().length, 1);
    });
    await test("hapus objek Supabase lama gagal -> tetap sukses; dicatat [ORPHAN] dengan path", async () => {
      const id = seedLegacy({ path: "institutions/lama/doc2.pdf" }); cur.storage.failRemove = true;
      await setDoc(id, proc(pdf("p2"), "p2.pdf")); cur.storage.failRemove = false;
      assert.match(rowOf(id).document_drive_file_id, /^drv_/);
      assert.ok(logs.some((l) => l.includes("[ORPHAN]") && l.includes("institutions/lama/doc2.pdf")));
    });
    await test("DELETE dokumen legacy -> objek dihapus, kolom NULL, lolos constraint; hapus DATA legacy -> objek ikut dihapus", async () => {
      const a = seedLegacy({ path: "institutions/lama/doc3.pdf" });
      await rmDoc(a);
      assert.ok(!cur.storage.objects.has("accreditation-documents/institutions/lama/doc3.pdf")); assert.equal(rowOf(a).document_path, null);
      const b = seedLegacy({ path: "institutions/lama/doc4.pdf" });
      await svc.adminDelete(entity, b);
      assert.ok(!cur.storage.objects.has("accreditation-documents/institutions/lama/doc4.pdf"));
    });
    await test("tidak ada migrasi massal: dokumen legacy lain tidak tersentuh oleh operasi pada baris berbeda", async () => {
      const keep = seedLegacy({ path: "institutions/lama/keep.pdf" }); const keepRow = rowOf(keep);
      const other = await mk(); await setDoc(other.id, proc(pdf("o"), "o.pdf"));
      assert.ok(cur.storage.objects.has("accreditation-documents/institutions/lama/keep.pdf"));
      assert.deepEqual(rowOf(keep), keepRow);
    });

    // ----- 9. cleanup tidak menghapus file yang masih direferensikan -----
    console.log("\n9. Cleanup TIDAK menghapus file Drive yang masih direferensikan database");
    await test("file lama masih dirujuk baris LAIN -> tidak dihapus (dicatat [CLEANUP-SKIP]); baris yang diganti tetap beralih ke file baru", async () => {
      const a = await mk(), b = await mk();
      await setDoc(a.id, proc(pdf("shared"), "shared.pdf"));
      const shared = rowOf(a.id).document_drive_file_id;
      raw(`update public.${T_INST} set document_drive_file_id='${shared}', document_name='shared.pdf', document_mime='application/pdf', document_size=5 where id='${b.id}'`);
      logs.length = 0;
      await setDoc(a.id, proc(pdf("baru"), "baru.pdf"));
      assert.notEqual(rowOf(a.id).document_drive_file_id, shared);
      assert.equal(rowOf(b.id).document_drive_file_id, shared);
      assert.ok(!fd.state.files.get(shared).trashed, "file yang masih dirujuk tidak boleh dihapus");
      assert.ok(logs.some((l) => l.includes("[CLEANUP-SKIP]") && l.includes(shared) && /masih direferensikan/.test(l)));
      assert.equal(scalar(cur.dbName, `select count(*) from public.drive_cleanup_queue where file_id='${shared}'`), "0");
      // setelah rujukan terakhir hilang, penggantian berikutnya boleh membuang file itu
      await setDoc(b.id, proc(pdf("b2"), "b2.pdf"));
      assert.ok(fd.state.files.get(shared).trashed, "tanpa rujukan -> dibuang");
    });
    await test("hapus DATA yang file-nya dirujuk baris lain / tabel program studi -> file tidak dihapus", async () => {
      const a = await mk(); await setDoc(a.id, proc(pdf("ref"), "ref.pdf"));
      const f = rowOf(a.id).document_drive_file_id;
      raw(`insert into public.${T_PROG}(program_name, education_level, sk_number, document_drive_file_id, document_name, document_mime, document_size) values ('TI','S1','REF-${++sk}','${f}','ref.pdf','application/pdf',5)`);
      logs.length = 0;
      await svc.adminDelete(entity, a.id);
      assert.ok(!fd.state.files.get(f).trashed);
      assert.ok(logs.some((l) => l.includes("[CLEANUP-SKIP]") && l.includes(f)));
      raw(`delete from public.${T_PROG}`);
    });
    await test("kompensasi saat DB error tetapi penulisan ternyata SUDAH tersimpan (timeout setelah commit) -> file baru TIDAK dihapus", async () => {
      const a = await mk();
      // simulasi: update benar-benar commit, namun klien menerima error
      const orig = cur.client.from.bind(cur.client);
      let armed = true;
      cur.client.from = (t) => {
        const q = orig(t);
        const origThen = q.then.bind(q);
        q.then = (res, rej) => {
          if (armed && q.op === "update" && t === T_INST && q.payload.document_drive_file_id) {
            armed = false;
            const r = q.run(); // benar-benar commit
            return Promise.resolve({ data: null, error: { code: "08006", message: "connection lost after commit" }, _r: r }).then(res, rej);
          }
          return origThen(res, rej);
        };
        return q;
      };
      await assert.rejects(setDoc(a.id, proc(pdf("ghost"), "ghost.pdf")), (e) => sc(e) === 500);
      cur.client.from = orig;
      const ref = rowOf(a.id).document_drive_file_id;
      assert.match(ref, /^drv_/, "baris menunjuk file baru");
      assert.ok(!fd.state.files.get(ref).trashed, "file yang direferensikan DB tidak boleh dihapus oleh kompensasi");
      assert.ok(logs.some((l) => l.includes("[CLEANUP-SKIP]") && l.includes(ref)));
    });
    await test("rujukan tidak bisa diperiksa (DB error saat verifikasi) -> file lama TIDAK dihapus (aman) dan tercatat; permintaan tetap sukses", async () => {
      const a = await mk(); await setDoc(a.id, proc(pdf("v1"), "v1.pdf"));
      const old = rowOf(a.id).document_drive_file_id;
      // gagalkan hanya pemeriksaan referensi (select pada tabel institusi dengan filter drive id)
      const orig = cur.client.from.bind(cur.client);
      cur.client.from = (t) => {
        const q = orig(t);
        const origRun = q.run.bind(q);
        q.run = () => (q.op === "select" && q.where.some((w) => w.includes("document_drive_file_id")) ? { data: null, error: { code: "XX000", message: "verifikasi gagal" } } : origRun());
        return q;
      };
      logs.length = 0;
      await setDoc(a.id, proc(pdf("v2"), "v2.pdf"));
      cur.client.from = orig;
      assert.notEqual(rowOf(a.id).document_drive_file_id, old);
      assert.ok(!fd.state.files.get(old).trashed, "tanpa kepastian rujukan, file tidak dihapus");
      assert.ok(logs.some((l) => l.includes("[CLEANUP-SKIP]") && l.includes(old) && /tidak dapat dipastikan/.test(l)));
    });
    await test("program studi TIDAK diubah perilakunya: tanpa pemeriksaan referensi tambahan, tanpa validasi MIME baru", async () => {
      assert.equal(prodEntity.safeDriveHandling, undefined);
      const p = await svc.adminCreate(prodEntity, { programName: "TI", educationLevel: "S1", skNumber: `P-${++sk}`, validFrom: "2024-01-01", validUntil: "2029-01-01" }, ADMIN_ID);
      cur.queryLog.length = 0;
      await svc.adminSetDocument(prodEntity, await svc.loadForDocument(prodEntity, p.id), proc(pdf("p1"), "p1.pdf"));
      await svc.adminSetDocument(prodEntity, await svc.loadForDocument(prodEntity, p.id), proc(pdf("p2"), "p2.pdf"));
      const refChecks = cur.queryLog.filter((q) => q.op === "select" && /"document_drive_file_id" = /.test(q.sql));
      assert.equal(refChecks.length, 0, "tidak ada query verifikasi referensi pada jalur program studi");
      assert.equal(fd.live().filter((f) => f.appProperties.category === "accreditationStudyProgram").length, 1);
    });

    // ----- 10. endpoint baca: publik & admin -----
    console.log("\n10. Dokumen Google Drive dapat dibaca lewat endpoint PUBLIK dan ADMIN (controller asli, HTTP sungguhan)");
    const server = http.createServer(async (req, res) => {
      res.status = (n) => { res.statusCode = n; return res; };
      const url = new URL(req.url, "http://x"); req.query = Object.fromEntries(url.searchParams);
      try {
        let m;
        if ((m = /^\/api\/accreditation\/institutions\/([^/]+)\/document$/.exec(url.pathname))) { req.validated = { params: { id: m[1] } }; await ctl.publicInstitutionDocument(req, res); }
        else if ((m = /^\/api\/files\/([^/]+)$/.exec(url.pathname))) { req.params = { token: m[1] }; await ctl.adminFileByToken(req, res); }
        else { res.statusCode = 404; res.end(); }
      } catch (e) {
        if (res.headersSent) { res.destroy(); return; }
        res.statusCode = sc(e) || 500; res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ code: e.code || "ERROR", message: e.message }));
      }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    cleanups.push(() => server.close());
    const base = `http://127.0.0.1:${server.address().port}`;
    const get = async (p, headers) => { const r = await fetch(`${base}${p}`, { headers }); const buf = Buffer.from(await r.arrayBuffer()); let json = null; try { json = JSON.parse(buf.toString()); } catch { /* biner */ } return { status: r.status, buf, headers: r.headers, json }; };

    const pubI = await mk("published"), drI = await mk("draft");
    await setDoc(pubI.id, proc(pdf("publik"), "SK Publik.pdf")); await setDoc(drI.id, proc(pdf("rahasia"), "Rahasia.pdf"));
    await test("detail publik memuat link route backend tetap (tanpa token/kedaluwarsa); tidak ada URL Drive/ID Drive", async () => {
      const out = await svc.publicGet(entity, pubI.id);
      assert.equal(out.document.url, `/api/accreditation/institutions/${pubI.id}/document`);
      assert.equal(out.document.downloadUrl, `${out.document.url}?download=1`); assert.equal(out.document.urlExpiresAt, null);
      const text = JSON.stringify(await svc.publicList(entity, { page: 1, limit: 10 }));
      for (const leak of ["drive.google", "googleapis", "drv_", "document_md5", "document_path"]) assert.ok(!text.includes(leak), leak);
    });
    await test("PUBLIK published: 200, isi byte-identik, inline PDF, nosniff, Content-Length", async () => {
      const r = await get(`/api/accreditation/institutions/${pubI.id}/document`);
      assert.equal(r.status, 200); assert.ok(r.buf.equals(pdf("publik")));
      assert.equal(r.headers.get("content-type"), "application/pdf");
      assert.match(r.headers.get("content-disposition"), /^inline; filename="SK Publik\.pdf"/);
      assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.equal(r.headers.get("content-length"), String(pdf("publik").length));
      assert.match((await get(`/api/accreditation/institutions/${pubI.id}/document?download=1`)).headers.get("content-disposition"), /^attachment;/);
    });
    await test("PUBLIK: Range -> 206; ETag + If-None-Match -> 304", async () => {
      const r = await get(`/api/accreditation/institutions/${pubI.id}/document`, { Range: "bytes=2-6" });
      assert.equal(r.status, 206); assert.ok(r.buf.equals(pdf("publik").subarray(2, 7)));
      const n = await get(`/api/accreditation/institutions/${pubI.id}/document`, { "If-None-Match": r.headers.get("etag") });
      assert.equal(n.status, 304);
    });
    await test("PUBLIK: draft, tidak ada, published_at masa depan -> 404; unpublish -> 404", async () => {
      assert.equal((await get(`/api/accreditation/institutions/${drI.id}/document`)).status, 404);
      assert.equal((await get(`/api/accreditation/institutions/${crypto.randomUUID()}/document`)).status, 404);
      raw(`update public.${T_INST} set published_at = now() + interval '1 day' where id='${pubI.id}'`);
      assert.equal((await get(`/api/accreditation/institutions/${pubI.id}/document`)).status, 404);
      raw(`update public.${T_INST} set published_at = now() - interval '1 second' where id='${pubI.id}'`);
      assert.equal((await get(`/api/accreditation/institutions/${pubI.id}/document`)).status, 200);
    });
    await test("PUBLIK: dokumen legacy lewat route Drive -> 404 DOCUMENT_NOT_FOUND (bukan 500)", async () => {
      const r = await get(`/api/accreditation/institutions/${legacyId}/document`);
      // legacyId sudah dipindah ke Drive pada bagian 8; seed baru untuk kasus legacy murni
      const l = seedLegacy({ path: "institutions/lama/doc9.pdf" });
      const r2 = await get(`/api/accreditation/institutions/${l}/document`);
      assert.equal(r2.status, 404); assert.equal(r2.json.code, "DOCUMENT_NOT_FOUND"); assert.equal(r.status, 200);
    });
    await test("ADMIN: link bertoken untuk DRAFT dibuka tanpa Authorization (200, private/no-store); token merujuk record", async () => {
      const d = (await svc.adminGet(entity, drI.id)).document;
      assert.match(d.url, /^\/api\/files\/[\w-]+\.[\w-]+\.[\w-]+$/); assert.ok(new Date(d.urlExpiresAt) > new Date());
      const payload = verifyFileToken(d.url.replace("/api/files/", ""));
      assert.equal(payload.kind, "institution_document"); assert.equal(payload.recordId, drI.id);
      const r = await get(d.url);
      assert.equal(r.status, 200); assert.ok(r.buf.equals(pdf("rahasia"))); assert.equal(r.headers.get("cache-control"), "private, no-store");
      assert.match((await get(d.downloadUrl)).headers.get("content-disposition"), /^attachment;/);
    });
    await test("ADMIN: token rusak/diubah -> 403; token lama menyajikan file TERBARU setelah diganti dan 404 setelah dihapus", async () => {
      const d1 = (await svc.adminGet(entity, drI.id)).document;
      const tok = d1.url.replace("/api/files/", "");
      assert.equal((await get("/api/files/abc")).status, 403);
      assert.equal((await get(`/api/files/${tok.slice(0, -3)}${tok.endsWith("AAA") ? "BBB" : "AAA"}`)).status, 403);
      await setDoc(drI.id, proc(pdf("revisi"), "Revisi.pdf"));
      const r = await get(d1.url); assert.equal(r.status, 200); assert.ok(r.buf.equals(pdf("revisi")));
      await rmDoc(drI.id);
      assert.equal((await get(d1.url)).status, 404);
    });
    await test("Drive gangguan -> 502 STORAGE_ERROR; file hilang di Drive -> 404 FILE_NOT_FOUND", async () => {
      const id = rowOf(pubI.id).document_drive_file_id;
      const realDl = fd.api.downloadFile;
      fd.api.downloadFile = async () => { const e = new Error("down"); e.status = 500; throw e; };
      const a = await get(`/api/accreditation/institutions/${pubI.id}/document`); fd.api.downloadFile = realDl;
      assert.equal(a.status, 502); assert.equal(a.json.code, "STORAGE_ERROR");
      fd.state.files.get(id).trashed = true;
      const b = await get(`/api/accreditation/institutions/${pubI.id}/document`);
      fd.state.files.get(id).trashed = false;
      assert.equal(b.status, 404); assert.equal(b.json.code, "FILE_NOT_FOUND");
    });
    await test("daftar publik & admin memuat dokumen Drive DAN legacy bersamaan tanpa error", async () => {
      const pub = await svc.publicList(entity, { page: 1, limit: 50 });
      const adm = await svc.adminList(entity, { page: 1, limit: 50 });
      assert.ok(pub.items.some((i) => i.document && /\/document$/.test(i.document.url)), "ada dokumen Drive");
      assert.ok(pub.items.some((i) => i.document && /\/object\/sign\//.test(i.document.url)), "ada dokumen legacy");
      assert.ok(adm.pagination.total >= pub.pagination.total);
    });
  } catch (error) {
    failed += 1;
    console.log(`  GAGAL (kesalahan tak terduga) ${error && error.stack ? error.stack.split("\n").slice(0, 4).join("\n        ") : error}`);
  } finally {
    for (const fn of cleanups) { try { fn(); } catch { /* abaikan */ } }
    cluster.stop();
  }

  console.log(`\nHASIL: ${passed} lulus, ${failed} gagal (total ${passed + failed})`);
  process.exit(failed === 0 ? 0 : 1);
})();
