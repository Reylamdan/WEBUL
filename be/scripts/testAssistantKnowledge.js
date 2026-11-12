
// Pengujian integrasi /api/admin/assistant-knowledge terhadap server yang SEDANG BERJALAN
// dan Supabase LIVE (tabel assistant_knowledge yang sebenarnya).
//
// Cara pakai:
//   Server harus sudah berjalan (npm run dev).
//   Buka terminal kedua di folder backend, lalu:
//   node scripts/testAssistantKnowledge.js
//
// Skrip meminta email dan password admin (password tersembunyi).
// Data uji berjudul berawalan "[TES-OTOMATIS-AK]".
// Pembersihan hanya menghapus ID yang dibuat oleh skrip ini sendiri.
//
// Opsional:
// TEST_EMAIL=... TEST_PASSWORD=... API_URL=http://localhost:5000 node scripts/testAssistantKnowledge.js

require("../src/config/env");

const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const BASE = "/api/admin/assistant-knowledge";
const PREFIX = "[TES-OTOMATIS-AK]";
const SAMPLE_ID = "123e4567-e89b-42d3-a456-426614174000";

// ---------- input ----------
const ask = (question, hidden) =>
  new Promise((resolve, reject) => {
    const { stdin, stdout } = process;

    if (!stdin.isTTY) {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (data += chunk));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] || ""));
      return;
    }

    let input = "";

    const finish = (fn, value) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      fn(value);
    };

    const onData = (chunk) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\r" || char === "\n") return finish(resolve, input);
        if (char === "\u0003") return finish(reject, new Error("Dibatalkan."));

        if (char === "\u007f" || char === "\b") {
          if (input.length) {
            input = input.slice(0, -1);
            if (!hidden) stdout.write("\b \b");
          }
          continue;
        }

        if (char < " ") continue;

        input += char;
        if (!hidden) stdout.write(char);
      }
    };

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });

// ---------- helper ----------
let passed = 0;
let failed = 0;
const failures = [];

const check = (name, ok, detail) => {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  ✗ GAGAL: ${name}`);

    if (detail !== undefined) {
      console.log(
        `      detail: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`
      );
    }
  }
};

const section = (title) => console.log(`\n${title}`);

let token = null;

const api = async (method, path, { body, auth = true, rawBody } = {}) => {
  const headers = {};

  if (body !== undefined || rawBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body:
      rawBody !== undefined
        ? rawBody
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  });

  const text = await res.text();

  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    // Respons bukan JSON.
  }

  return { status: res.status, json, text };
};

// Hanya ID hasil POST berhasil yang boleh dibersihkan.
const createdIds = [];

const create = async (body) => {
  const r = await api("POST", BASE, { body });
  const k = r.json?.data?.knowledge;

  if (r.status === 201 && k?.id) {
    createdIds.push(k.id);
  }

  return { r, k };
};

// ---------- pengujian ----------
const run = async () => {
  const email =
    process.env.TEST_EMAIL || (await ask("Email admin    : ", false));

  const password =
    process.env.TEST_PASSWORD || (await ask("Password admin : ", true));

  // Pastikan server hidup.
  const health = await api("GET", "/api/health", {
    auth: false,
  }).catch(() => null);

  if (!health || health.status !== 200) {
    throw new Error(`Server tidak bisa dihubungi di ${API_URL}. Jalankan npm run dev.`);
  }

  // Login admin.
  const login = await api("POST", "/api/auth/login", {
    body: { email, password },
    auth: false,
  });

  if (login.status !== 200 || !login.json?.data?.token) {
    throw new Error(
      `Login gagal (HTTP ${login.status}): ${login.json?.message || "Respons login tidak valid"}`
    );
  }

  token = login.json.data.token;

  const adminId = login.json.data.admin.id;
  const adminName = login.json.data.admin.name;

  console.log(
    `\nLogin berhasil sebagai ${adminName}. Menjalankan pengujian di ${API_URL} ...`
  );

  // ---------- 1. akses ----------
  section("1. Semua endpoint wajib login");

  for (const [method, path, body] of [
    ["GET", BASE],
    ["GET", `${BASE}/${SAMPLE_ID}`],
    ["POST", BASE, { title: "Tes", category: "Tes", content: "x" }],
    ["PATCH", `${BASE}/${SAMPLE_ID}`, { status: "draft" }],
    ["DELETE", `${BASE}/${SAMPLE_ID}`],
  ]) {
    const none = await api(method, path, { body, auth: false });

    check(`${method} tanpa token -> 401`, none.status === 401, none.status);
  }

  const fake = await fetch(`${API_URL}${BASE}`, {
    headers: { Authorization: "Bearer abc.def.ghi" },
  });

  check("token palsu -> 401", fake.status === 401, fake.status);

  // ---------- 2. create ----------
  section("2. Membuat knowledge (POST)");

  const specialKeywords = [
    "UKT",
    " ukt ",
    "uang  semester",
    "a,b",
    '"kutip"',
    "{kurung}",
    "(x)",
    "c++",
    "S1/S2",
    "100%",
    "back\\slash",
    "tanya: biaya?",
  ];

  const { r: c1, k: k1 } = await create({
    title: `${PREFIX}   Biaya   Kuliah `,
    category: "  Biaya   Kuliah ",
    content: "Biaya kuliah terdiri dari UKT dan uang semester.\nBaris kedua.",
    keywords: specialKeywords,
    sourceLabel: "Halaman Biaya",
    sourcePath: "/biaya-kuliah",
    status: "published",
    validUntil: "2020-01-01",
  });

  check("status 201", c1.status === 201, c1.json);

  if (k1) {
    check(
      "title dirapikan",
      k1.title === `${PREFIX} Biaya Kuliah`,
      k1.title
    );

    check(
      "category dirapikan, kapitalisasi tetap",
      k1.category === "Biaya Kuliah",
      k1.category
    );

    check(
      "content utuh (newline terjaga)",
      k1.content === "Biaya kuliah terdiri dari UKT dan uang semester.\nBaris kedua.",
      k1.content
    );

    const expected = [
      "ukt",
      "uang semester",
      "a,b",
      '"kutip"',
      "{kurung}",
      "(x)",
      "c++",
      "s1/s2",
      "100%",
      "back\\slash",
      "tanya: biaya?",
    ];

    check(
      "keywords dinormalisasi + dedup, karakter khusus utuh",
      JSON.stringify(k1.keywords) === JSON.stringify(expected),
      k1.keywords
    );

    check(
      "createdBy = admin login",
      k1.createdBy?.id === adminId && k1.createdBy?.name === adminName,
      k1.createdBy
    );

    check("updatedBy null saat create", k1.updatedBy === null, k1.updatedBy);
    check("validUntil lampau diterima", k1.validUntil === "2020-01-01", k1.validUntil);

    check(
      "sourceLabel/sourcePath tersimpan",
      k1.sourceLabel === "Halaman Biaya" && k1.sourcePath === "/biaya-kuliah",
      [k1.sourceLabel, k1.sourcePath]
    );

    check(
      "tanpa email/password_hash di response",
      !/password_hash|passwordHash|"email"/i.test(c1.text),
      "Ditemukan field sensitif"
    );

    check(
      "createdBy hanya id + name",
      Object.keys(k1.createdBy || {}).sort().join() === "id,name",
      Object.keys(k1.createdBy || {})
    );
  }

  const { r: c2, k: k2 } = await create({
    title: `${PREFIX} Minimal`,
    category: "Umum",
    content: "Isi minimal",
  });

  check(
    "create minimal -> 201, default draft, keywords []",
    c2.status === 201 &&
      k2?.status === "draft" &&
      Array.isArray(k2.keywords) &&
      k2.keywords.length === 0,
    c2.json
  );

  check(
    "field opsional null",
    k2?.sourceLabel === null &&
      k2?.sourcePath === null &&
      k2?.validUntil === null,
    k2
  );

  const { r: c3, k: k3 } = await create({
    title: `${PREFIX} Mendatang`,
    category: "Umum",
    content: "x",
    validUntil: "2099-12-31",
    sourcePath: "https://universitaslia.ac.id/info",
  });

  check(
    "validUntil mendatang + sourcePath https diterima",
    c3.status === 201 && k3?.validUntil === "2099-12-31",
    c3.json
  );

  // ---------- 3. validasi ----------
  section("3. Validasi input (harus ditolak 400)");

  const ok = {
    title: `${PREFIX} Validasi`,
    category: "Uji",
    content: "isi",
  };

  const bad = [
    ["tanpa title", { category: "Uji", content: "x" }],
    ["title kosong/spasi", { ...ok, title: "   " }],
    ["title 201 karakter", { ...ok, title: "a".repeat(201) }],
    ["tanpa category", { title: ok.title, content: "x" }],
    ["category 61 karakter", { ...ok, category: "a".repeat(61) }],
    ["tanpa content", { title: ok.title, category: "Uji" }],
    ["content 10001 karakter", { ...ok, content: "a".repeat(10001) }],
    ["keywords 21 item", { ...ok, keywords: Array.from({ length: 21 }, (_, i) => `k${i}`) }],
    ["keyword 51 karakter", { ...ok, keywords: ["a".repeat(51)] }],
    ["keywords bukan array", { ...ok, keywords: "ukt" }],
    ["sourceLabel 201 karakter", { ...ok, sourceLabel: "a".repeat(201) }],
    ["sourcePath 501 karakter", { ...ok, sourcePath: `https://a.id/${"a".repeat(500)}` }],
    ["sourcePath javascript:", { ...ok, sourcePath: "javascript:alert(1)" }],
    ["sourcePath JavaScript:", { ...ok, sourcePath: "JaVaScRiPt:alert(1)" }],
    ["sourcePath data:", { ...ok, sourcePath: "data:text/html,<script>alert(1)</script>" }],
    ["sourcePath protocol-relative //", { ...ok, sourcePath: "//evil.example.com" }],
    ["sourcePath /\\host", { ...ok, sourcePath: "/\\evil.example.com" }],
    ["sourcePath tanpa skema/slash", { ...ok, sourcePath: "biaya-kuliah" }],
    ["status tidak dikenal", { ...ok, status: "archived" }],
    ["validUntil bukan tanggal", { ...ok, validUntil: "besok" }],
    ["validUntil 2026-02-31", { ...ok, validUntil: "2026-02-31" }],
    ["validUntil ISO datetime", { ...ok, validUntil: "2099-12-31T10:00:00Z" }],
    ["validUntil string kosong", { ...ok, validUntil: "" }],
    ["createdBy dari body", { ...ok, createdBy: adminId }],
    ["updatedBy dari body", { ...ok, updatedBy: adminId }],
    ["id dari body", { ...ok, id: SAMPLE_ID }],
  ];

  for (const [name, body] of bad) {
    const { r } = await create(body);

    check(
      `${name} -> 400 VALIDATION_ERROR`,
      r.status === 400 && r.json?.code === "VALIDATION_ERROR",
      [r.status, r.json?.code]
    );
  }

  const broken = await api("POST", BASE, {
    rawBody: "{bukan json",
  });

  check(
    "JSON rusak -> 400 INVALID_JSON",
    broken.status === 400 && broken.json?.code === "INVALID_JSON",
    [broken.status, broken.json?.code]
  );

  // Batas maksimum yang masih valid.
  const { r: b1, k: bk1 } = await create({
    title: `${PREFIX} ${"a".repeat(200 - PREFIX.length - 1)}`,
    category: "a".repeat(60),
    content: "a".repeat(10000),
    sourceLabel: "a".repeat(200),
    keywords: Array.from({ length: 20 }, (_, i) =>
      i === 0 ? "a".repeat(50) : `kata${i}`
    ),
  });

  check(
    "batas maksimum diterima",
    b1.status === 201 && Boolean(bk1),
    b1.json
  );

  // ---------- 4. detail ----------
  section("4. Detail (GET /:id)");

  if (k1) {
    const d = await api("GET", `${BASE}/${k1.id}`);
    const dk = d.json?.data?.knowledge;

    check(
      "detail 200 + content lengkap",
      d.status === 200 && dk?.content === k1.content,
      d.status
    );

    check(
      "keywords terbaca sama persis dari database",
      dk && JSON.stringify(dk.keywords) === JSON.stringify(k1.keywords),
      dk?.keywords
    );
  }

  const nf = await api("GET", `${BASE}/${SAMPLE_ID}`);

  check(
    "id tidak ada -> 404 KNOWLEDGE_NOT_FOUND",
    nf.status === 404 && nf.json?.code === "KNOWLEDGE_NOT_FOUND",
    [nf.status, nf.json?.code]
  );

  const badId = await api("GET", `${BASE}/bukan-uuid`);
  check("id bukan UUID -> 400", badId.status === 400, badId.status);

  // ---------- 5. list ----------
  section("5. Daftar (GET)");

  const l1 = await api(
    "GET",
    `${BASE}?search=${encodeURIComponent("TES-OTOMATIS-AK")}`
  );

  const items = l1.json?.data?.items || [];
  const pagination = l1.json?.data?.pagination;

  check(
    "list 200, default limit 20",
    l1.status === 200 &&
      pagination?.limit === 20 &&
      pagination?.page === 1,
    pagination
  );

  check(
    "list TIDAK menyertakan content",
    items.length > 0 && items.every((item) => item.content === undefined),
    items[0]
  );

  check(
    "list memuat data uji",
    Boolean(k1) && items.some((item) => item.id === k1.id),
    items.length
  );

  const stamps = items.map((item) => Date.parse(item.updatedAt));

  check(
    "urutan updated_at terbaru dulu",
    stamps.every((stamp, i) => i === 0 || stamps[i - 1] >= stamp),
    items.map((item) => item.updatedAt)
  );

  const lim = await api("GET", `${BASE}?limit=100`);

  check(
    "limit=100 diterima",
    lim.status === 200 && lim.json?.data?.pagination?.limit === 100,
    lim.status
  );

  check(
    "limit=101 ditolak",
    (await api("GET", `${BASE}?limit=101`)).status === 400
  );

  const invalidLimit = await api("GET", `${BASE}?limit=0`);
  const invalidPage = await api("GET", `${BASE}?page=0`);

  check(
    "limit=0 / page=0 ditolak",
    invalidLimit.status === 400 && invalidPage.status === 400,
    [invalidLimit.status, invalidPage.status]
  );

  // Perbaikan: total dibandingkan dengan jumlah minimum hasil yang diharapkan,
  // bukan jumlah seluruh ID yang dibuat oleh skrip.
  const p1 = await api(
    "GET",
    `${BASE}?search=${encodeURIComponent("TES-OTOMATIS-AK")}&limit=1&page=2`
  );

  check(
    "pagination limit=1 page=2 -> 1 item, total konsisten",
    p1.status === 200 &&
      p1.json?.data?.items?.length === 1 &&
      p1.json?.data?.pagination?.total >= 2,
    p1.json?.data?.pagination
  );

  const far = await api("GET", `${BASE}?page=99999`);

  check(
    "page di luar jangkauan -> 200 list kosong",
    far.status === 200 && far.json?.data?.items?.length === 0,
    far.status
  );

  const s1 = await api(
    "GET",
    `${BASE}?search=${encodeURIComponent("biaya kuliah")}`
  );

  check(
    "search judul case-insensitive",
    s1.status === 200 &&
      Boolean(k1) &&
      s1.json?.data?.items?.some((item) => item.id === k1.id),
    s1.status
  );

  const s2 = await api(
    "GET",
    `${BASE}?search=${encodeURIComponent("TES-OTOMATIS-AK")}&status=draft`
  );

  check(
    "filter status=draft",
    s2.status === 200 &&
      s2.json?.data?.items?.length > 0 &&
      s2.json.data.items.every((item) => item.status === "draft"),
    s2.status
  );

  const s3 = await api(
    "GET",
    `${BASE}?search=${encodeURIComponent("TES-OTOMATIS-AK")}&category=${encodeURIComponent("biaya kuliah")}`
  );

  check(
    "filter kategori case-insensitive",
    s3.status === 200 &&
      Boolean(k1) &&
      s3.json?.data?.items?.length >= 1 &&
      s3.json.data.items.every(
        (item) => item.category.toLowerCase() === "biaya kuliah"
      ),
    s3.json?.data?.items?.length
  );

  for (const [label, term] of [
    ["%", "%"],
    ["_", "_"],
    ["backslash", "\\"],
    ["koma/kurung/kutip", 'a,b)("'],
  ]) {
    const w = await api(
      "GET",
      `${BASE}?search=${encodeURIComponent(term)}`
    );

    check(
      `search karakter khusus "${label}" tidak error 500`,
      w.status === 200,
      w.status
    );
  }

  const wild = await api(
    "GET",
    `${BASE}?search=${encodeURIComponent("TES-OTOMATIS-AK%Biaya")}`
  );

  check(
    "% dalam search diperlakukan literal",
    wild.status === 200 && wild.json?.data?.items?.length === 0,
    wild.json?.data?.items?.length
  );

  const invalidStatus = await api("GET", `${BASE}?status=archived`);

  check(
    "status tidak valid di query -> 400",
    invalidStatus.status === 400,
    invalidStatus.status
  );

  // ---------- 6. update ----------
  section("6. Memperbarui (PATCH)");

  if (k2) {
    const noop = await api("PATCH", `${BASE}/${k2.id}`, {
      body: {
        title: `  ${PREFIX}   Minimal `,
        keywords: [],
        status: "draft",
      },
    });

    const nk = noop.json?.data?.knowledge;

    check(
      "PATCH tanpa perubahan nyata -> 200 Tidak ada perubahan",
      noop.status === 200 && noop.json?.message === "Tidak ada perubahan",
      noop.json
    );

    check(
      "tanpa perubahan: updatedBy tetap null & updatedAt tidak berubah",
      nk?.updatedBy === null && nk?.updatedAt === k2.updatedAt,
      [nk?.updatedBy, nk?.updatedAt, k2.updatedAt]
    );

    const up = await api("PATCH", `${BASE}/${k2.id}`, {
      body: {
        title: `${PREFIX} Minimal Diubah`,
        keywords: ["Baru", "BARU", "x,y"],
        sourceLabel: "Label",
        status: "published",
      },
    });

    const uk = up.json?.data?.knowledge;

    check("PATCH nyata -> 200", up.status === 200 && Boolean(uk), up.json);

    if (uk) {
      check(
        "field berubah",
        uk.title === `${PREFIX} Minimal Diubah` &&
          uk.status === "published" &&
          uk.sourceLabel === "Label",
        uk
      );

      check(
        "keywords diperbarui + dinormalisasi",
        JSON.stringify(uk.keywords) === JSON.stringify(["baru", "x,y"]),
        uk.keywords
      );

      check(
        "updatedBy = admin login",
        uk.updatedBy?.id === adminId && uk.updatedBy?.name === adminName,
        uk.updatedBy
      );

      check(
        "createdBy tidak berubah",
        uk.createdBy?.id === adminId,
        uk.createdBy
      );

      check(
        "updatedAt maju",
        Date.parse(uk.updatedAt) > Date.parse(k2.updatedAt),
        [k2.updatedAt, uk.updatedAt]
      );

      check(
        "content tidak berubah",
        uk.content === "Isi minimal",
        uk.content
      );
    }

    const clr = await api("PATCH", `${BASE}/${k2.id}`, {
      body: {
        sourceLabel: null,
        sourcePath: null,
        validUntil: null,
        keywords: null,
      },
    });

    const ck = clr.json?.data?.knowledge;

    check(
      "null mengosongkan field opsional",
      clr.status === 200 &&
        ck?.sourceLabel === null &&
        ck?.sourcePath === null &&
        ck?.validUntil === null &&
        ck?.keywords?.length === 0,
      clr.json
    );

    const badp = await api("PATCH", `${BASE}/${k2.id}`, {
      body: { sourcePath: "javascript:alert(1)" },
    });

    check("PATCH sourcePath javascript: -> 400", badp.status === 400, badp.status);

    const emptyBody = await api("PATCH", `${BASE}/${k2.id}`, {
      body: {},
    });

    check("PATCH body kosong -> 400", emptyBody.status === 400, emptyBody.status);

    const forbid = await api("PATCH", `${BASE}/${k2.id}`, {
      body: { createdBy: adminId },
    });

    check("PATCH createdBy dari body -> 400", forbid.status === 400, forbid.status);

    const after = await api("GET", `${BASE}/${k2.id}`);

    check(
      "data tetap utuh setelah PATCH ditolak",
      after.json?.data?.knowledge?.title === `${PREFIX} Minimal Diubah`,
      after.json
    );
  }

  const nfp = await api("PATCH", `${BASE}/${SAMPLE_ID}`, {
    body: { status: "draft" },
  });

  check("PATCH id tidak ada -> 404", nfp.status === 404, nfp.status);

  // ---------- 7. delete ----------
  section("7. Menghapus (DELETE)");

  if (k3) {
    const del = await api("DELETE", `${BASE}/${k3.id}`);

    check(
      "DELETE -> 200",
      del.status === 200 && del.json?.success === true,
      del.json
    );

    check(
      "setelah dihapus GET -> 404",
      (await api("GET", `${BASE}/${k3.id}`)).status === 404
    );

    check(
      "DELETE kedua -> 404",
      (await api("DELETE", `${BASE}/${k3.id}`)).status === 404
    );
  }

  check(
    "DELETE id tidak ada -> 404",
    (await api("DELETE", `${BASE}/${SAMPLE_ID}`)).status === 404
  );
};

// ---------- cleanup ----------
const cleanup = async () => {
  let removed = 0;
  const leftovers = [];

  for (const id of createdIds) {
    const r = await api("DELETE", `${BASE}/${id}`).catch(() => null);

    if (r && (r.status === 200 || r.status === 404)) {
      if (r.status === 200) removed += 1;
    } else {
      leftovers.push(id);
    }
  }

  console.log(
    `\nPembersihan: ${removed} data uji dihapus dari ${createdIds.length} yang dibuat skrip ini.`
  );

  if (leftovers.length) {
    console.log(
      `PERHATIAN: gagal menghapus ID berikut, hapus manual: ${leftovers.join(", ")}`
    );
  }
};

// ---------- eksekusi ----------
run()
  .catch((error) => {
    failed += 1;
    failures.push(`Skrip berhenti: ${error.message}`);
    console.error(`\nSkrip berhenti karena error: ${error.message}`);
  })
  .finally(async () => {
    if (token) {
      await cleanup();
    }

    console.log("\n=======================================");
    console.log(`HASIL: ${passed} lulus, ${failed} gagal`);

    if (failed) {
      console.log("Yang gagal:");

      for (const name of failures) {
        console.log(` - ${name}`);
      }
    } else {
      console.log("Semua pengujian lulus.");
    }

    process.exit(failed ? 1 : 0);
  });
