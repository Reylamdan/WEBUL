// Pengujian otomatis endpoint /api/admin/news terhadap server yang SEDANG BERJALAN.
//
// Cara pakai (server harus sudah jalan: npm run dev, lalu buka terminal kedua di folder be):
//   node scripts/testNews.js
//
// Skrip meminta email dan password admin (password tersembunyi), lalu login dan menjalankan
// seluruh pengujian. Semua berita uji diberi judul berawalan "[TES-OTOMATIS]" dan SELALU dihapus
// di akhir, bahkan jika ada pengujian yang gagal. Berita asli Anda tidak disentuh.
//
// Opsional (tanpa prompt):  TEST_EMAIL=... TEST_PASSWORD=... API_URL=http://localhost:5000 node scripts/testNews.js

require("../src/config/env"); // hanya untuk membaca PORT dari .env

const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const PREFIX = "[TES-OTOMATIS]";
const SAMPLE_ID = "123e4567-e89b-42d3-a456-426614174000"; // UUID valid yang tidak ada

// ---------- input ----------
const ask = (question, hidden) =>
  new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (c) => (data += c));
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
    if (detail !== undefined) console.log(`      detail: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
};

const section = (title) => console.log(`\n${title}`);

let token = null;
const api = async (method, path, { body, auth = true, rawBody } = {}) => {
  const headers = {};
  if (body !== undefined || rawBody !== undefined) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* bukan JSON */
  }
  return { status: res.status, json, text };
};

const createdIds = [];

const run = async () => {
  // ---------- login ----------
  const email = process.env.TEST_EMAIL || (await ask("Email admin    : ", false));
  const password = process.env.TEST_PASSWORD || (await ask("Password admin : ", true));

  const health = await api("GET", "/", { auth: false }).catch(() => null);
  if (!health || health.status !== 200) {
    console.error(`\nServer tidak bisa dihubungi di ${API_URL}. Jalankan dulu: npm run dev`);
    process.exit(1);
  }

  const login = await api("POST", "/api/auth/login", { body: { email, password }, auth: false });
  if (login.status !== 200) {
    console.error(`\nLogin gagal (HTTP ${login.status}): ${login.json && login.json.message}`);
    process.exit(1);
  }
  token = login.json.data.token;
  const adminName = login.json.data.admin.name;
  const adminId = login.json.data.admin.id;
  console.log(`\nLogin berhasil sebagai ${adminName}. Menjalankan pengujian di ${API_URL} ...`);

  // ---------- 1. keamanan akses ----------
  section("1. Semua endpoint wajib login");
  const protectedCalls = [
    ["GET", "/api/admin/news"],
    ["GET", `/api/admin/news/${SAMPLE_ID}`],
    ["POST", "/api/admin/news", { title: "Tes", contentHtml: "<p>x</p>" }],
    ["PATCH", `/api/admin/news/${SAMPLE_ID}`, { status: "draft" }],
    ["DELETE", `/api/admin/news/${SAMPLE_ID}`],
  ];
  for (const [method, path, body] of protectedCalls) {
    const none = await api(method, path, { body, auth: false });
    check(`${method} tanpa token -> 401`, none.status === 401, none.status);
  }
  const fakeToken = await fetch(`${API_URL}/api/admin/news`, { headers: { Authorization: "Bearer abc.def.ghi" } });
  check("token palsu -> 401", fakeToken.status === 401, fakeToken.status);

  // ---------- 2. create ----------
  section("2. Membuat berita (POST)");
  const c1 = await api("POST", "/api/admin/news", {
    body: {
      title: `${PREFIX} Wisuda Periode Oktober`,
      contentHtml:
        '<h1>Judul Besar</h1><p onclick="alert(1)">Universitas LIA menggelar wisuda.</p><script>alert(1)</script><a href="javascript:alert(1)">klik</a><img src="x.png" onerror="alert(1)">',
    },
  });
  const n1 = c1.json && c1.json.data && c1.json.data.news;
  if (n1) createdIds.push(n1.id);
  check("status 201", c1.status === 201, c1.json);
  if (n1) {
    check("slug otomatis dari judul", n1.slug === "tes-otomatis-wisuda-periode-oktober", n1.slug);
    check("status default draft & publishedAt kosong", n1.status === "draft" && n1.publishedAt === null, [n1.status, n1.publishedAt]);
    check("author = admin yang login", n1.author && n1.author.id === adminId && n1.author.name === adminName, n1.author);
    check("script dibuang", !/script|alert/i.test(n1.contentHtml), n1.contentHtml);
    check("onclick dibuang", !/onclick/i.test(n1.contentHtml), n1.contentHtml);
    check("javascript: dibuang", !/javascript:/i.test(n1.contentHtml), n1.contentHtml);
    check("<img> dibuang", !/<img/i.test(n1.contentHtml), n1.contentHtml);
    check("h1 diubah jadi h2", /<h2>Judul Besar<\/h2>/.test(n1.contentHtml), n1.contentHtml);
    check("excerpt otomatis terisi", typeof n1.excerpt === "string" && n1.excerpt.length > 0, n1.excerpt);
    check("coverImagePath null", n1.coverImagePath === null, n1.coverImagePath);
    check("tidak ada password/hash di response", !/password_hash|passwordHash/i.test(c1.text), "ditemukan password_hash");
  }

  const c2 = await api("POST", "/api/admin/news", {
    body: { title: `${PREFIX} Wisuda Periode Oktober`, contentHtml: "<p>Berita kedua</p>", status: "published", excerpt: "Ringkasan buatan admin" },
  });
  const n2 = c2.json && c2.json.data && c2.json.data.news;
  if (n2) createdIds.push(n2.id);
  check("judul sama -> slug unik (-2)", c2.status === 201 && n2 && n2.slug === "tes-otomatis-wisuda-periode-oktober-2", n2 && n2.slug);
  check("published: publishedAt terisi", n2 && n2.status === "published" && !!n2.publishedAt, n2 && n2.publishedAt);
  check("excerpt manual dipakai", n2 && n2.excerpt === "Ringkasan buatan admin", n2 && n2.excerpt);

  const c3 = await api("POST", "/api/admin/news", {
    body: { title: `${PREFIX} Tom & <b>Jerry</b>`, contentHtml: "<p>Tes teks polos</p>" },
  });
  const n3 = c3.json && c3.json.data && c3.json.data.news;
  if (n3) createdIds.push(n3.id);
  check("title teks polos ('Tom & Jerry', bukan &amp;)", n3 && n3.title === `${PREFIX} Tom & Jerry`, n3 && n3.title);

  // ---------- 3. validasi ----------
  section("3. Validasi input (harus ditolak 400)");
  const badCreates = [
    ["tanpa title", { contentHtml: "<p>x</p>" }],
    ["title terlalu pendek", { title: "ab", contentHtml: "<p>x</p>" }],
    ["tanpa contentHtml (draft pun wajib)", { title: "Judul Tes Validasi" }],
    ["contentHtml hanya script", { title: "Judul Tes Validasi", contentHtml: "<script>alert(1)</script>" }],
    ["status tidak dikenal", { title: "Judul Tes Validasi", contentHtml: "<p>x</p>", status: "archived" }],
    ["authorId dikirim dari body", { title: "Judul Tes Validasi", contentHtml: "<p>x</p>", authorId: adminId }],
    ["publishedAt dikirim dari body", { title: "Judul Tes Validasi", contentHtml: "<p>x</p>", publishedAt: "2020-01-01T00:00:00Z" }],
    ["contentHtml > 200.000 karakter", { title: "Judul Tes Validasi", contentHtml: "a".repeat(200001) }],
  ];
  for (const [name, body] of badCreates) {
    const r = await api("POST", "/api/admin/news", { body });
    check(`${name} -> 400 VALIDATION_ERROR`, r.status === 400 && r.json && r.json.code === "VALIDATION_ERROR", [r.status, r.json && r.json.code]);
    if (r.status === 201 && r.json && r.json.data) createdIds.push(r.json.data.news.id); // jaga-jaga agar tetap dibersihkan
  }
  const brokenJson = await api("POST", "/api/admin/news", { rawBody: "{bukan json" });
  check("JSON rusak -> 400 INVALID_JSON", brokenJson.status === 400 && brokenJson.json && brokenJson.json.code === "INVALID_JSON", [brokenJson.status, brokenJson.json && brokenJson.json.code]);

  // ---------- 4. list ----------
  section("4. Daftar berita (GET)");
  const l1 = await api("GET", "/api/admin/news");
  check("status 200", l1.status === 200, l1.status);
  const d1 = l1.json && l1.json.data;
  check("default page=1, limit=9", d1 && d1.pagination.page === 1 && d1.pagination.limit === 9, d1 && d1.pagination);
  check("maksimal 9 item per halaman", d1 && d1.items.length <= 9, d1 && d1.items.length);
  check("daftar tidak memuat contentHtml", d1 && d1.items.every((i) => !("contentHtml" in i)));
  check("tidak ada password/hash di response", !/password_hash|passwordHash/i.test(l1.text));

  const l2 = await api("GET", "/api/admin/news?status=published&limit=50");
  check("filter status=published", l2.status === 200 && l2.json.data.items.every((i) => i.status === "published"), l2.status);
  const l3 = await api("GET", "/api/admin/news?status=draft&limit=50");
  check("filter status=draft", l3.status === 200 && l3.json.data.items.every((i) => i.status === "draft"), l3.status);

  const s1 = await api("GET", `/api/admin/news?search=${encodeURIComponent("TES-OTOMATIS")}&limit=50`);
  const found = s1.json && s1.json.data ? s1.json.data.items.map((i) => i.id) : [];
  check("pencarian judul menemukan berita uji", s1.status === 200 && createdIds.filter((id) => found.includes(id)).length === 3, [s1.status, found.length]);
  const s2 = await api("GET", `/api/admin/news?search=${encodeURIComponent("ringkasan BUATAN admin")}`);
  check("pencarian excerpt (tidak peka huruf besar/kecil)", s2.status === 200 && s2.json.data.items.some((i) => i.id === (n2 && n2.id)), s2.status);
  for (const evil of ["a,id.eq.1", "x),(status.eq.draft", 'a"b', "50%", "a_b", "\\", "*"]) {
    const r = await api("GET", `/api/admin/news?search=${encodeURIComponent(evil)}`);
    check(`pencarian karakter khusus ${JSON.stringify(evil)} -> 200 (bukan error)`, r.status === 200, [r.status, r.json && r.json.code]);
  }
  const lim = await api("GET", "/api/admin/news?limit=51");
  check("limit=51 -> 400 VALIDATION_ERROR (tidak dipotong)", lim.status === 400 && lim.json.code === "VALIDATION_ERROR", [lim.status, lim.json && lim.json.code]);
  for (const q of ["limit=0", "page=0", "page=abc", "status=archived"]) {
    const r = await api("GET", `/api/admin/news?${q}`);
    check(`?${q} -> 400`, r.status === 400, r.status);
  }
  const far = await api("GET", "/api/admin/news?page=99999");
  check("halaman di luar jangkauan -> 200, items kosong", far.status === 200 && far.json.data.items.length === 0 && far.json.data.pagination.total >= 3, [far.status, far.json && far.json.data && far.json.data.pagination]);

  // ---------- 5. detail ----------
  section("5. Detail berita (GET /:id)");
  if (n1) {
    const g = await api("GET", `/api/admin/news/${n1.id}`);
    check("200 + contentHtml lengkap", g.status === 200 && g.json.data.news.id === n1.id && typeof g.json.data.news.contentHtml === "string", g.status);
  }
  const g404 = await api("GET", `/api/admin/news/${SAMPLE_ID}`);
  check("ID tidak ada -> 404 NEWS_NOT_FOUND", g404.status === 404 && g404.json.code === "NEWS_NOT_FOUND", [g404.status, g404.json && g404.json.code]);
  const gBad = await api("GET", "/api/admin/news/bukan-uuid");
  check("ID bukan UUID -> 400", gBad.status === 400, gBad.status);

  // ---------- 6. update ----------
  section("6. Mengubah berita (PATCH)");
  if (n1 && n2) {
    const p1 = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { title: `${PREFIX} Judul Sudah Diubah` } });
    check("ubah judul -> 200", p1.status === 200, p1.json);
    check("slug TIDAK ikut berubah", p1.json && p1.json.data.news.slug === n1.slug, p1.json && p1.json.data.news.slug);
    check("excerpt lama dipertahankan", p1.json && p1.json.data.news.excerpt === n1.excerpt);
    check("updatedAt diperbarui", p1.json && new Date(p1.json.data.news.updatedAt) > new Date(n1.updatedAt), p1.json && p1.json.data.news.updatedAt);

    const pub = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { status: "published" } });
    const firstPublished = pub.json && pub.json.data.news.publishedAt;
    check("draft -> published: publishedAt terisi", pub.status === 200 && !!firstPublished, pub.json);

    const back = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { status: "draft" } });
    check("published -> draft: publishedAt dipertahankan", back.status === 200 && back.json.data.news.publishedAt === firstPublished, back.json && back.json.data.news.publishedAt);

    const again = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { status: "published" } });
    check("terbit ulang: publishedAt tetap yang pertama", again.status === 200 && again.json.data.news.publishedAt === firstPublished, again.json && again.json.data.news.publishedAt);

    const body2 = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { contentHtml: "<p>Isi baru</p><script>x()</script>" } });
    check("ubah konten: disanitasi & excerpt tidak berubah", body2.status === 200 && body2.json.data.news.contentHtml === "<p>Isi baru</p>" && body2.json.data.news.excerpt === n1.excerpt, body2.json && body2.json.data.news.contentHtml);

    const ex = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { excerpt: "" } });
    check("excerpt dikirim kosong -> dibuat ulang dari isi", ex.status === 200 && ex.json.data.news.excerpt === "Isi baru", ex.json && ex.json.data.news.excerpt);

    const sl = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { slug: "Tes-Otomatis-Slug-Baru" } });
    check("slug eksplisit dipakai (dinormalkan huruf kecil)", sl.status === 200 && sl.json.data.news.slug === "tes-otomatis-slug-baru", sl.json && sl.json.data.news.slug);
    const slTaken = await api("PATCH", `/api/admin/news/${n1.id}`, { body: { slug: n2.slug } });
    check("slug milik berita lain -> 409 SLUG_TAKEN", slTaken.status === 409 && slTaken.json.code === "SLUG_TAKEN", [slTaken.status, slTaken.json && slTaken.json.code]);

    for (const [name, body] of [
      ["body kosong", {}],
      ["authorId", { authorId: adminId }],
      ["publishedAt", { publishedAt: "2020-01-01T00:00:00Z" }],
      ["contentHtml kosong", { contentHtml: "   " }],
      ["status tidak dikenal", { status: "x" }],
    ]) {
      const r = await api("PATCH", `/api/admin/news/${n1.id}`, { body });
      check(`PATCH ${name} -> 400`, r.status === 400, [r.status, r.json && r.json.code]);
    }
    const after = await api("GET", `/api/admin/news/${n1.id}`);
    check("author tetap sama setelah semua PATCH", after.json && after.json.data.news.author && after.json.data.news.author.id === adminId);
  }
  const p404 = await api("PATCH", `/api/admin/news/${SAMPLE_ID}`, { body: { title: "Judul Baru" } });
  check("PATCH ID tidak ada -> 404", p404.status === 404 && p404.json.code === "NEWS_NOT_FOUND", p404.status);

  // ---------- 7. delete ----------
  section("7. Menghapus berita (DELETE)");
  const d404 = await api("DELETE", `/api/admin/news/${SAMPLE_ID}`);
  check("DELETE ID tidak ada -> 404", d404.status === 404, d404.status);
  const dBad = await api("DELETE", "/api/admin/news/bukan-uuid");
  check("DELETE ID bukan UUID -> 400", dBad.status === 400, dBad.status);
  if (n3) {
    const del = await api("DELETE", `/api/admin/news/${n3.id}`);
    check("hapus berita uji -> 200", del.status === 200 && del.json.success === true, del.json);
    const gone = await api("GET", `/api/admin/news/${n3.id}`);
    check("setelah dihapus, detail -> 404", gone.status === 404, gone.status);
    const delAgain = await api("DELETE", `/api/admin/news/${n3.id}`);
    check("hapus lagi -> 404", delAgain.status === 404, delAgain.status);
    createdIds.splice(createdIds.indexOf(n3.id), 1);
  }
};

// Membersihkan semua berita uji, apa pun hasil pengujiannya
const cleanup = async () => {
  let removed = 0;
  for (const id of createdIds) {
    const r = await api("DELETE", `/api/admin/news/${id}`).catch(() => null);
    if (r && r.status === 200) removed += 1;
  }
  // Jaga-jaga: berita berawalan [TES-OTOMATIS] yang tertinggal (misalnya skrip dihentikan di tengah)
  const left = await api("GET", `/api/admin/news?search=${encodeURIComponent("TES-OTOMATIS")}&limit=50`).catch(() => null);
  if (left && left.status === 200) {
    for (const item of left.json.data.items) {
      if (item.title.startsWith(PREFIX)) {
        const r = await api("DELETE", `/api/admin/news/${item.id}`).catch(() => null);
        if (r && r.status === 200) removed += 1;
      }
    }
  }
  console.log(`\nPembersihan: ${removed} berita uji dihapus.`);
};

run()
  .catch((error) => {
    failed += 1;
    failures.push(`Skrip berhenti: ${error.message}`);
    console.error(`\nSkrip berhenti karena error: ${error.message}`);
  })
  .finally(async () => {
    if (token) await cleanup();
    console.log("\n=======================================");
    console.log(`HASIL: ${passed} lulus, ${failed} gagal`);
    if (failed) {
      console.log("Yang gagal:");
      for (const name of failures) console.log(` - ${name}`);
    } else {
      console.log("Semua pengujian lulus.");
    }
    process.exit(failed ? 1 : 0);
  });
