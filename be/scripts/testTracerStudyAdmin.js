// Pengujian OFFLINE API admin Tracer Study (/api/admin/tracer-study).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testTracerStudyAdmin.js

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";

const assert = require("node:assert/strict");
const path = require("node:path");
const jwt = require("jsonwebtoken");

const { createFakeSupabase } = require("./lib/fakeSupabase");
const sb = createFakeSupabase();
const supabasePath = sb.install();
const { db } = sb;

// Supabase palsu bawaan belum mendukung insert berupa array (bulk). Adaptor ini hanya ada di
// skrip tes ini: insert array dipecah menjadi insert satu per satu, hasilnya dikumpulkan.
const originalFrom = sb.client.from;
sb.client.from = (table) => {
  const query = originalFrom(table);
  const originalInsert = query.insert.bind(query);
  query.insert = (payload) => {
    if (!Array.isArray(payload)) return originalInsert(payload);
    const shim = {
      select() {
        return shim;
      },
      then(resolve, reject) {
        return (async () => {
          const rows = [];
          for (const item of payload) {
            const { data, error } = await originalFrom(table).insert(item).select("*").single();
            if (error) return { data: null, error };
            rows.push(data);
          }
          return { data: rows, error: null };
        })().then(resolve, reject);
      },
    };
    return shim;
  };
  return query;
};

const logs = [];
console.error = (...a) => logs.push(a.join(" "));

const loadFreshApp = () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(path.join(__dirname, "..", "src")) && key !== supabasePath) delete require.cache[key];
  }
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  OK    ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  GAGAL ${name}\n        ${String(e.message).split("\n").slice(0, 4).join("\n        ")}`);
  }
};

(async () => {
  db.admins = [
    {
      id: ADMIN_ID,
      name: "Admin Uji",
      email: "admin@example.com",
      is_active: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    },
  ];
  db.tracer_study_responses = [];

  const app = loadFreshApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const TOKEN = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "universitas-lia-api",
    subject: ADMIN_ID,
    expiresIn: "1h",
  });

  const call = async (method, url, { body, token = TOKEN } = {}) => {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, ok: res.ok, body: json };
  };

  const B = "/api/admin/tracer-study";

  console.log("\n--- Autentikasi ---");
  for (const [method, url] of [
    ["GET", `${B}/years`],
    ["GET", `${B}/responses`],
    ["POST", `${B}/responses`],
    ["PATCH", `${B}/responses/1`],
    ["DELETE", `${B}/responses/1`],
    ["POST", `${B}/import`],
    ["DELETE", `${B}/years/2025?confirm=2025`],
  ]) {
    await test(`${method} ${url} menolak tanpa token`, async () => {
      const r = await call(method, url, { token: null });
      assert.equal(r.status, 401);
    });
  }

  console.log("\n--- Daftar kosong ---");
  await test("GET /years saat tabel kosong", async () => {
    const r = await call("GET", `${B}/years`);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, { years: [], programs: [] });
  });
  await test("GET /responses saat tabel kosong", async () => {
    const r = await call("GET", `${B}/responses`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 0);
    assert.equal(r.body.data.pagination.total, 0);
  });

  console.log("\n--- Tambah satu responden ---");
  let firstId;
  await test("POST /responses menambah data valid (kunci kosong tidak disimpan)", async () => {
    const r = await call("POST", `${B}/responses`, {
      body: { surveyYear: 2025, studyProgram: "  Manajemen  ", f8: 1, f14: 2, f502: 3, f505: 4500000 },
    });
    assert.equal(r.status, 201);
    const item = r.body.data.response;
    assert.equal(item.surveyYear, 2025);
    assert.equal(item.studyProgram, "Manajemen");
    assert.equal(item.f8, 1);
    assert.equal(item.f505, 4500000);
    firstId = item.id;
    assert.deepEqual(db.tracer_study_responses[0].answers, { f8: 1, f14: 2, f502: 3, f505: 4500000 });
  });
  await test("POST /responses dengan jawaban kosong (null) tidak menyimpan kuncinya", async () => {
    const r = await call("POST", `${B}/responses`, {
      body: { surveyYear: 2025, studyProgram: "", f8: 5, f14: null, f502: null, f505: null },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.response.studyProgram, null);
    assert.deepEqual(db.tracer_study_responses[1].answers, { f8: 5 });
  });

  console.log("\n--- Validasi ---");
  const invalid = [
    ["tahun di luar batas", { surveyYear: 1999, f8: 1 }],
    ["tahun bukan angka", { surveyYear: "2025", f8: 1 }],
    ["f8 wajib", { surveyYear: 2025 }],
    ["f8 di luar 1-5", { surveyYear: 2025, f8: 6 }],
    ["f8 pecahan", { surveyYear: 2025, f8: 1.5 }],
    ["f14 di luar 1-5", { surveyYear: 2025, f8: 1, f14: 0 }],
    ["f505 negatif", { surveyYear: 2025, f8: 1, f505: -1 }],
    ["f502 terlalu besar", { surveyYear: 2025, f8: 1, f502: 9999 }],
    ["program terlalu panjang", { surveyYear: 2025, f8: 1, studyProgram: "x".repeat(101) }],
    ["field tidak dikenal (answers)", { surveyYear: 2025, f8: 1, answers: { hack: 1 } }],
    ["field tidak dikenal (id)", { surveyYear: 2025, f8: 1, id: "x" }],
  ];
  for (const [name, body] of invalid) {
    await test(`POST /responses menolak: ${name}`, async () => {
      const r = await call("POST", `${B}/responses`, { body });
      assert.equal(r.status, 400, JSON.stringify(r.body));
      assert.equal(r.body.code, "VALIDATION_ERROR");
    });
  }
  await test("tidak ada baris baru dari permintaan yang ditolak", async () => {
    assert.equal(db.tracer_study_responses.length, 2);
  });

  console.log("\n--- Ubah ---");
  await test("PATCH mengubah f8 dan menjaga kunci lain di answers", async () => {
    db.tracer_study_responses[0].answers.f999 = 7; // kunci lain yang tidak dikenal API
    const r = await call("PATCH", `${B}/responses/${firstId}`, { body: { f8: 3, f505: null } });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.response.f8, 3);
    assert.equal(r.body.data.response.f505, null);
    assert.equal(r.body.data.response.f14, 2);
    assert.equal(db.tracer_study_responses[0].answers.f999, 7);
  });
  await test("PATCH mengubah tahun dan program", async () => {
    const r = await call("PATCH", `${B}/responses/${firstId}`, { body: { surveyYear: 2024, studyProgram: "Akuntansi" } });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.response.surveyYear, 2024);
    assert.equal(r.body.data.response.studyProgram, "Akuntansi");
  });
  await test("PATCH body kosong ditolak", async () => {
    const r = await call("PATCH", `${B}/responses/${firstId}`, { body: {} });
    assert.equal(r.status, 400);
  });
  await test("PATCH f8 null ditolak", async () => {
    const r = await call("PATCH", `${B}/responses/${firstId}`, { body: { f8: null } });
    assert.equal(r.status, 400);
  });
  await test("PATCH ID tidak valid -> 400", async () => {
    const r = await call("PATCH", `${B}/responses/bukan-id`, { body: { f8: 1 } });
    assert.equal(r.status, 400);
  });
  await test("PATCH ID tidak ada -> 404", async () => {
    const r = await call("PATCH", `${B}/responses/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`, { body: { f8: 1 } });
    assert.equal(r.status, 404);
    assert.equal(r.body.code, "RESPONSE_NOT_FOUND");
  });

  console.log("\n--- Daftar & filter ---");
  await test("GET /years menghitung per tahun dan daftar program", async () => {
    const r = await call("GET", `${B}/years`);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.years, [
      { year: 2025, total: 1 },
      { year: 2024, total: 1 },
    ]);
    assert.deepEqual(r.body.data.programs, ["Akuntansi"]);
  });
  await test("GET /responses filter year", async () => {
    const r = await call("GET", `${B}/responses?year=2024`);
    assert.equal(r.body.data.items.length, 1);
    assert.equal(r.body.data.items[0].studyProgram, "Akuntansi");
  });
  await test("GET /responses filter program", async () => {
    const r = await call("GET", `${B}/responses?program=Akuntansi`);
    assert.equal(r.body.data.pagination.total, 1);
  });
  await test("GET /responses halaman di luar jumlah data -> kosong, total benar", async () => {
    const r = await call("GET", `${B}/responses?page=9&limit=1`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 0);
    assert.equal(r.body.data.pagination.total, 2);
  });
  await test("GET /responses limit > 100 ditolak", async () => {
    const r = await call("GET", `${B}/responses?limit=101`);
    assert.equal(r.status, 400);
  });
  await test("respons admin hanya memuat field yang dikenal", async () => {
    const r = await call("GET", `${B}/responses?year=2024`);
    assert.deepEqual(Object.keys(r.body.data.items[0]).sort(), ["f14", "f502", "f505", "f8", "id", "studyProgram", "surveyYear"]);
  });

  console.log("\n--- Import ---");
  const rows = (n) => Array.from({ length: n }, (_, i) => ({ studyProgram: "Manajemen", f8: (i % 5) + 1, f502: i, f505: 1000000 + i }));
  await test("import mode append menambah data", async () => {
    const r = await call("POST", `${B}/import`, { body: { surveyYear: 2025, mode: "append", rows: rows(10) } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.data.inserted, 10);
    assert.equal(r.body.data.removed, 0);
    assert.equal(db.tracer_study_responses.filter((x) => x.survey_year === 2025).length, 11);
  });
  await test("import mode replace mengganti seluruh data tahun itu", async () => {
    const r = await call("POST", `${B}/import`, { body: { surveyYear: 2025, mode: "replace", rows: rows(4) } });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.inserted, 4);
    assert.equal(r.body.data.removed, 11);
    assert.equal(db.tracer_study_responses.filter((x) => x.survey_year === 2025).length, 4);
  });
  await test("import replace tidak menyentuh tahun lain", async () => {
    assert.equal(db.tracer_study_responses.filter((x) => x.survey_year === 2024).length, 1);
  });
  await test("import ditolak: baris tidak valid (tidak ada yang tersimpan)", async () => {
    const before = db.tracer_study_responses.length;
    const bad = rows(3);
    bad[1].f8 = 9;
    const r = await call("POST", `${B}/import`, { body: { surveyYear: 2025, mode: "replace", rows: bad } });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.some((e) => e.field === "rows.1.f8"), JSON.stringify(r.body.errors));
    assert.equal(db.tracer_study_responses.length, before);
  });
  await test("import ditolak: rows kosong, mode salah, > 2000 baris, field asing", async () => {
    for (const body of [
      { surveyYear: 2025, mode: "append", rows: [] },
      { surveyYear: 2025, mode: "tambah", rows: rows(1) },
      { surveyYear: 2025, mode: "append", rows: rows(2001) },
      { surveyYear: 2025, mode: "append", rows: [{ f8: 1, evil: true }] },
    ]) {
      const r = await call("POST", `${B}/import`, { body });
      assert.equal(r.status, 400, JSON.stringify(body).slice(0, 80));
    }
  });
  await test("import gagal di tengah: baris baru dibatalkan, data lama (replace) utuh", async () => {
    const before = db.tracer_study_responses.filter((x) => x.survey_year === 2025).length;
    // Kegagalan database pada insert ke-3 (setiap baris di adaptor tes = satu insert).
    sb.faults.push({ table: "tracer_study_responses", op: "insert", error: { code: "XX000", message: "boom" } });
    const r = await call("POST", `${B}/import`, { body: { surveyYear: 2025, mode: "replace", rows: rows(3) } });
    assert.equal(r.status, 500);
    assert.equal(r.body.code, "DATABASE_ERROR");
    assert.equal(db.tracer_study_responses.filter((x) => x.survey_year === 2025).length, before);
  });

  console.log("\n--- Hapus ---");
  await test("DELETE /responses/:id menghapus satu baris", async () => {
    const r = await call("DELETE", `${B}/responses/${firstId}`);
    assert.equal(r.status, 200);
    assert.equal(db.tracer_study_responses.some((x) => x.id === firstId), false);
  });
  await test("DELETE /responses/:id yang sudah terhapus -> 404", async () => {
    const r = await call("DELETE", `${B}/responses/${firstId}`);
    assert.equal(r.status, 404);
  });
  await test("DELETE /years/:year tanpa confirm ditolak", async () => {
    const r = await call("DELETE", `${B}/years/2025`);
    assert.equal(r.status, 400);
  });
  await test("DELETE /years/:year dengan confirm salah ditolak, data utuh", async () => {
    const before = db.tracer_study_responses.length;
    const r = await call("DELETE", `${B}/years/2025?confirm=2024`);
    assert.equal(r.status, 400);
    assert.equal(r.body.code, "CONFIRMATION_MISMATCH");
    assert.equal(db.tracer_study_responses.length, before);
  });
  await test("DELETE /years/:year dengan confirm benar menghapus satu tahun saja", async () => {
    const r = await call("DELETE", `${B}/years/2025?confirm=2025`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.removed, 4);
    assert.equal(db.tracer_study_responses.filter((x) => x.survey_year === 2025).length, 0);
  });
  await test("DELETE /years/:year tahun tanpa data -> 404", async () => {
    const r = await call("DELETE", `${B}/years/2031?confirm=2031`);
    assert.equal(r.status, 404);
    assert.equal(r.body.code, "YEAR_NOT_FOUND");
  });

  console.log("\n--- Endpoint publik tidak terpengaruh ---");
  await test("GET /api/tracer-study/summary tetap berjalan tanpa login", async () => {
    const r = await call("GET", "/api/tracer-study/summary", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
  });

  server.close();
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal.\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
