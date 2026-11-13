// Pengujian otomatis endpoint Public News (/api/news, /api/news/latest, /api/news/:slug)
// terhadap server yang SEDANG BERJALAN, ditambah pemeriksaan ringan bahwa endpoint admin tidak berubah.
// Skrip membuat data uji lewat API admin (diberi prefix) dan menghapusnya di akhir.
//
// Cara pakai (server harus sudah jalan: npm run dev, lalu buka terminal kedua di folder be):
//   node scripts/testPublicNews.js
//
// Opsional (tanpa prompt):
//   TEST_EMAIL=... TEST_PASSWORD=... API_URL=http://localhost:5000 node scripts/testPublicNews.js

const sharp = require("sharp");
const env = require("../src/config/env");

const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const PREFIX = "[TES-OTOMATIS-NEWS-PUBLIK]";
const SEARCH_ALL = "TES-OTOMATIS-NEWS-PUBLIK"; // kata kunci yang hanya cocok dengan data uji
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let token = null;
const api = async (method, path, { body, auth = false, headers: extra = {}, form } = {}) => {
  const headers = { ...extra };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: form !== undefined ? form : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* bukan JSON */
  }
  return { status: res.status, json, text, headers: res.headers };
};

// Endpoint publik: TANPA token. Endpoint admin: dengan token.
const pub = (path, options = {}) => api("GET", path, { ...options, auth: false });
const adm = (method, path, body) => api(method, path, { body, auth: true });

const sameKeys = (object, keys) =>
  !!object && JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...keys].sort());

const ITEM_KEYS = ["id", "title", "slug", "excerpt", "coverImageUrl", "publishedAt", "author"];
const DETAIL_KEYS = [...ITEM_KEYS, "contentHtml", "updatedAt"];
const LEAK_PATTERN = /password|passwordHash|"email"|"status"|coverImagePath|cover_image_path|createdAt|"authorId"|author_id|"draft"/i;

const makeCover = () =>
  sharp({ create: { width: 640, height: 360, channels: 3, background: { r: 30, g: 120, b: 190 } } })
    .jpeg({ quality: 90 })
    .toBuffer();

const createdIds = [];

const createNews = async (suffix, extra = {}) => {
  const res = await adm("POST", "/api/admin/news", {
    title: `${PREFIX} ${suffix}`,
    contentHtml: "<p>Isi berita uji publik.</p>",
    ...extra,
  });
  const news = res.json && res.json.data && res.json.data.news;
  if (news) createdIds.push(news.id);
  if (!news) console.log(`      (gagal membuat data uji "${suffix}": HTTP ${res.status} ${res.text.slice(0, 200)})`);
  return news;
};

const run = async () => {
  const health = await api("GET", "/").catch(() => null);
  if (!health || health.status !== 200) {
    console.error(`\nServer tidak bisa dihubungi di ${API_URL}. Jalankan dulu: npm run dev`);
    process.exit(1);
  }

  if (process.env.TEST_TOKEN) {
    token = process.env.TEST_TOKEN;
    const me = await api("GET", "/api/auth/me", { auth: true });
    if (me.status !== 200) {
      console.error(`\nTEST_TOKEN tidak valid atau admin tidak aktif (HTTP ${me.status}).`);
      process.exit(1);
    }
  } else {
    const email = process.env.TEST_EMAIL || (await ask("Email admin    : ", false));
    const password = process.env.TEST_PASSWORD || (await ask("Password admin : ", true));
    const login = await api("POST", "/api/auth/login", { body: { email, password } });
    if (login.status !== 200) {
      console.error(`\nLogin gagal (HTTP ${login.status}): ${login.json && login.json.message}`);
      process.exit(1);
    }
    token = login.json.data.token;
  }

  console.log(`\nLogin admin berhasil (hanya untuk membuat data uji). Menjalankan pengujian di ${API_URL} ...`);

  // ---------- 0. data uji ----------
  section("0. Menyiapkan data uji lewat API admin");
  const draft = await createNews("Draf Rahasia", { status: "draft", contentHtml: "<p>RAHASIA-DRAF-JANGAN-BOCOR</p>" });
  await sleep(25);
  const toggled = await createNews("Sempat Terbit", { status: "published" });
  await sleep(25);
  const withCover = await createNews("Wisuda Periode Oktober 2026", {
    status: "published",
    contentHtml: '<h1>Wisuda</h1><p onclick="alert(1)">Wisuda dilaksanakan Oktober.</p><script>alert(1)</script>',
  });
  await sleep(25);
  const withExcerpt = await createNews("Beasiswa Prestasi", { status: "published", excerpt: "Ringkasan beasiswa unik-xyz" });
  await sleep(25);
  const third = await createNews("Seminar Nasional", { status: "published" });
  await sleep(25);
  const newest = await createNews("Pendaftaran Mahasiswa Baru", { status: "published" });

  if (![draft, toggled, withCover, withExcerpt, third, newest].every(Boolean)) {
    console.error("\nData uji gagal dibuat, pengujian dihentikan.");
    process.exit(1);
  }

  const coverBuffer = await makeCover();
  const form = new FormData();
  form.append("cover", new Blob([coverBuffer], { type: "image/jpeg" }), "cover-uji.jpg");
  const upload = await api("PUT", `/api/admin/news/${withCover.id}/cover`, { auth: true, form });
  check("cover untuk data uji berhasil diunggah", upload.status === 200, [upload.status, upload.json && upload.json.code]);

  // Terbit pertama kali: dicatat untuk dibandingkan setelah unpublish -> publish ulang
  const firstPublic = await pub(`/api/news/${toggled.slug}`);
  const firstPublishedAt = firstPublic.json && firstPublic.json.data && firstPublic.json.data.news.publishedAt;

  // ---------- 1. akses tanpa login ----------
  section("1. Endpoint publik bisa diakses tanpa login");
  for (const path of ["/api/news/latest", "/api/news", `/api/news/${withCover.slug}`]) {
    const res = await pub(path);
    check(`GET ${path.replace(withCover.slug, ":slug")} tanpa token -> 200`, res.status === 200 && res.json && res.json.success === true, res.status);
  }
  const badToken = await api("GET", "/api/news/latest", { headers: { Authorization: "Bearer abc.def.ghi" } });
  check("token palsu pada endpoint publik tidak dipakai/dipermasalahkan -> 200", badToken.status === 200, badToken.status);

  // ---------- 2. berita terbaru ----------
  section("2. GET /api/news/latest (Beranda)");
  const latest = await pub("/api/news/latest");
  const latestItems = (latest.json && latest.json.data && latest.json.data.items) || [];
  check("maksimal 3 item", latestItems.length > 0 && latestItems.length <= 3, latestItems.length);
  check("tidak ada pagination di /latest", latest.json && latest.json.data && latest.json.data.pagination === undefined);
  check(
    "urut dari publikasi terbaru: Pendaftaran, Seminar, Beasiswa",
    JSON.stringify(latestItems.map((i) => i.slug)) === JSON.stringify([newest.slug, third.slug, withExcerpt.slug]),
    latestItems.map((i) => i.slug)
  );
  check(
    "urutan publishedAt menurun",
    latestItems.every((item, index) => index === 0 || latestItems[index - 1].publishedAt >= item.publishedAt)
  );
  check("draf tidak muncul di /latest", !latestItems.some((i) => i.slug === draft.slug) && !latest.text.includes("RAHASIA-DRAF"));
  check("bentuk item: hanya field publik", latestItems.every((i) => sameKeys(i, ITEM_KEYS)), latestItems[0] && Object.keys(latestItems[0]));
  check("author hanya { name }", latestItems.every((i) => i.author && sameKeys(i.author, ["name"])), latestItems[0] && latestItems[0].author);
  check("tidak ada field sensitif/internal di response", !LEAK_PATTERN.test(latest.text), (latest.text.match(LEAK_PATTERN) || [])[0]);
  check("/latest tidak diperlakukan sebagai slug", latest.json && latest.json.data && Array.isArray(latest.json.data.items));

  // ---------- 3. daftar ----------
  section("3. GET /api/news (Berita Terkini): daftar, pagination, pencarian");
  const q = encodeURIComponent(SEARCH_ALL);
  const all = await pub(`/api/news?search=${q}&limit=50`);
  const allData = all.json && all.json.data;
  const allSlugs = ((allData && allData.items) || []).map((i) => i.slug);
  check("hanya berita published yang cocok: total 5 (draf tidak dihitung)", allData && allData.pagination.total === 5, allData && allData.pagination);
  check(
    "draf tidak ada di daftar, berita published ada",
    !allSlugs.includes(draft.slug) &&
      [toggled, withCover, withExcerpt, third, newest].every((n) => allSlugs.includes(n.slug)),
    allSlugs
  );
  check("urutan terbaru dulu", allSlugs[0] === newest.slug && allSlugs[4] === toggled.slug, allSlugs);
  check("daftar tidak memuat contentHtml", ((allData && allData.items) || []).every((i) => i.contentHtml === undefined && sameKeys(i, ITEM_KEYS)));
  check("tidak ada isi draf/field sensitif di response daftar", !all.text.includes("RAHASIA-DRAF") && !LEAK_PATTERN.test(all.text));

  const defaults = await pub("/api/news");
  check("default page=1 limit=9", defaults.json && defaults.json.data.pagination.page === 1 && defaults.json.data.pagination.limit === 9, defaults.json && defaults.json.data.pagination);

  const p1 = await pub(`/api/news?search=${q}&limit=2&page=1`);
  const p2 = await pub(`/api/news?search=${q}&limit=2&page=2`);
  const p3 = await pub(`/api/news?search=${q}&limit=2&page=3`);
  const pg = p1.json && p1.json.data;
  check("pagination: limit=2 -> totalPages 3, total 5", pg && pg.pagination.totalPages === 3 && pg.pagination.total === 5, pg && pg.pagination);
  check(
    "halaman 1/2/3 berisi 2/2/1 item tanpa duplikat",
    p1.json.data.items.length === 2 &&
      p2.json.data.items.length === 2 &&
      p3.json.data.items.length === 1 &&
      new Set([...p1.json.data.items, ...p2.json.data.items, ...p3.json.data.items].map((i) => i.slug)).size === 5
  );
  const far = await pub(`/api/news?search=${q}&limit=2&page=99`);
  check("halaman di luar jangkauan -> 200, items kosong, total tetap 5", far.status === 200 && far.json.data.items.length === 0 && far.json.data.pagination.total === 5, far.json);

  const byTitle = await pub(`/api/news?search=${encodeURIComponent("wisuda periode")}`);
  check("pencarian judul (tidak peka huruf besar/kecil)", byTitle.json && byTitle.json.data.items.some((i) => i.slug === withCover.slug), byTitle.status);
  const byExcerpt = await pub(`/api/news?search=${encodeURIComponent("UNIK-XYZ")}`);
  check("pencarian excerpt", byExcerpt.json && byExcerpt.json.data.items.length === 1 && byExcerpt.json.data.items[0].slug === withExcerpt.slug, byExcerpt.status);
  const byContent = await pub(`/api/news?search=${encodeURIComponent("RAHASIA-DRAF-JANGAN-BOCOR")}`);
  check("pencarian tidak menembus ke isi/draf", byContent.status === 200 && byContent.json.data.items.length === 0 && byContent.json.data.pagination.total === 0, byContent.json);
  const byDraftTitle = await pub(`/api/news?search=${encodeURIComponent("Draf Rahasia")}`);
  check("mencari judul draf -> tidak ditemukan", byDraftTitle.status === 200 && byDraftTitle.json.data.items.length === 0, byDraftTitle.json);
  const noMatch = await pub(`/api/news?search=${encodeURIComponent("zzzz-tidak-ada-xyz")}`);
  check("tidak ada hasil -> 200, items kosong, totalPages 0", noMatch.status === 200 && noMatch.json.data.items.length === 0 && noMatch.json.data.pagination.totalPages === 0, noMatch.json);
  const emptySearch = await pub("/api/news?search=&page=&limit=");
  check("parameter kosong dianggap tidak dikirim -> 200", emptySearch.status === 200, emptySearch.status);

  const statusIgnored = await pub(`/api/news?search=${q}&limit=50&status=draft`);
  check(
    "?status=draft diabaikan: draf tetap tidak muncul",
    statusIgnored.status === 200 &&
      statusIgnored.json.data.pagination.total === 5 &&
      !statusIgnored.json.data.items.some((i) => i.slug === draft.slug),
    statusIgnored.json && statusIgnored.json.data && statusIgnored.json.data.pagination
  );

  const weird = ["%", "_", "*", ",", "(", ")", '"', "\\", "a,b", "x),title.ilike.(%", "status.eq.draft", "';--", "%25", "\\%"];
  const weirdResults = [];
  for (const term of weird) {
    const r = await pub(`/api/news?search=${encodeURIComponent(term)}`);
    weirdResults.push([term, r.status, r.json && r.json.data && r.json.data.items && r.json.data.items.some((i) => i.slug === draft.slug)]);
  }
  check("karakter khusus pada search tidak menyebabkan error 500", weirdResults.every(([, s]) => s === 200), weirdResults.filter(([, s]) => s !== 200));
  check("karakter khusus pada search tidak membocorkan draf", weirdResults.every(([, , leaked]) => !leaked), weirdResults.filter(([, , l]) => l));

  const invalid = [
    ["page=0", "/api/news?page=0"],
    ["page=-1", "/api/news?page=-1"],
    ["page=abc", "/api/news?page=abc"],
    ["page=1.5", "/api/news?page=1.5"],
    ["limit=0", "/api/news?limit=0"],
    ["limit=51", "/api/news?limit=51"],
    ["limit=abc", "/api/news?limit=abc"],
    ["search 101 karakter", `/api/news?search=${"a".repeat(101)}`],
  ];
  for (const [label, path] of invalid) {
    const r = await pub(path);
    check(`${label} -> 400 VALIDATION_ERROR`, r.status === 400 && r.json && r.json.code === "VALIDATION_ERROR", [r.status, r.json && r.json.code]);
  }

  // ---------- 4. detail ----------
  section("4. GET /api/news/:slug (detail)");
  const detail = await pub(`/api/news/${withCover.slug}`);
  const d = detail.json && detail.json.data && detail.json.data.news;
  check("detail berita published -> 200", detail.status === 200 && !!d, detail.status);
  if (d) {
    check("bentuk detail: field publik + contentHtml + updatedAt", sameKeys(d, DETAIL_KEYS), Object.keys(d));
    check("author hanya { name }", d.author && sameKeys(d.author, ["name"]), d.author);
    check("tidak ada field sensitif/internal", !LEAK_PATTERN.test(detail.text), (detail.text.match(LEAK_PATTERN) || [])[0]);
    check("contentHtml sudah bersih (tanpa script/onclick), h1 jadi h2", !/script|onclick|alert/i.test(d.contentHtml) && /<h2>Wisuda<\/h2>/.test(d.contentHtml), d.contentHtml);
    check("publishedAt terisi (ISO)", typeof d.publishedAt === "string" && !Number.isNaN(Date.parse(d.publishedAt)), d.publishedAt);
    check("coverImageUrl berupa URL", typeof d.coverImageUrl === "string" && /^https?:\/\//.test(d.coverImageUrl), d.coverImageUrl);
    if (typeof d.coverImageUrl === "string") {
      const img = await fetch(d.coverImageUrl).catch(() => null);
      check("URL cover bisa dibuka publik dan berupa gambar", !!img && img.status === 200 && /^image\//.test(img.headers.get("content-type") || ""), img && [img.status, img.headers.get("content-type")]);
    }
  }
  const noCover = await pub(`/api/news/${third.slug}`);
  check("berita tanpa cover -> coverImageUrl null", noCover.json && noCover.json.data.news.coverImageUrl === null, noCover.json && noCover.json.data.news.coverImageUrl);

  const draftDetail = await pub(`/api/news/${draft.slug}`);
  const unknownDetail = await pub("/api/news/slug-yang-tidak-pernah-ada-123");
  check("detail draf -> 404 NEWS_NOT_FOUND", draftDetail.status === 404 && draftDetail.json && draftDetail.json.code === "NEWS_NOT_FOUND", [draftDetail.status, draftDetail.json]);
  check("slug tidak ada -> 404 NEWS_NOT_FOUND", unknownDetail.status === 404 && unknownDetail.json && unknownDetail.json.code === "NEWS_NOT_FOUND", unknownDetail.status);
  check(
    "respons draf dan slug tidak ada identik (draf tidak bisa ditebak)",
    draftDetail.json && unknownDetail.json && draftDetail.json.message === unknownDetail.json.message && draftDetail.json.code === unknownDetail.json.code
  );
  check("isi draf tidak muncul di respons 404", !draftDetail.text.includes("RAHASIA-DRAF"));
  const byId = await pub(`/api/news/${withCover.id}`);
  check("detail lewat UUID tidak didukung -> 404", byId.status === 404, byId.status);
  const byAdminId = await pub(`/api/news/${SAMPLE_ID}`);
  check("UUID sembarang -> 404", byAdminId.status === 404, byAdminId.status);
  for (const bad of ["ab!c", "a_b", "-awal", "akhir-", "a--b", "a".repeat(151), "%2e%2e"]) {
    const r = await pub(`/api/news/${bad}`);
    check(`slug tidak valid "${bad.length > 20 ? `${bad.slice(0, 10)}…(${bad.length})` : bad}" -> 400 atau 404, bukan 500`, r.status === 400 || r.status === 404, r.status);
  }

  // ---------- 5. perubahan status ----------
  section("5. Draft <-> published mempengaruhi tampilan publik");
  const unpublish = await adm("PATCH", `/api/admin/news/${toggled.id}`, { status: "draft" });
  check("admin mengembalikan berita ke draft -> 200", unpublish.status === 200, unpublish.status);
  const hiddenDetail = await pub(`/api/news/${toggled.slug}`);
  const hiddenList = await pub(`/api/news?search=${q}&limit=50`);
  check("setelah di-unpublish: detail 404", hiddenDetail.status === 404, hiddenDetail.status);
  check(
    "setelah di-unpublish: hilang dari daftar, total jadi 4",
    hiddenList.json.data.pagination.total === 4 && !hiddenList.json.data.items.some((i) => i.slug === toggled.slug),
    hiddenList.json.data.pagination
  );
  const republish = await adm("PATCH", `/api/admin/news/${toggled.id}`, { status: "published" });
  check("admin menerbitkan lagi -> 200", republish.status === 200, republish.status);
  const backDetail = await pub(`/api/news/${toggled.slug}`);
  check("setelah diterbitkan lagi: detail 200", backDetail.status === 200, backDetail.status);
  check(
    "publishedAt tetap sama seperti terbit pertama",
    backDetail.json && backDetail.json.data.news.publishedAt === firstPublishedAt,
    [firstPublishedAt, backDetail.json && backDetail.json.data.news.publishedAt]
  );

  const newDraftFromPublished = await adm("POST", "/api/admin/news", {
    title: `${PREFIX} Baru Draf`,
    contentHtml: "<p>baru</p>",
  });
  if (newDraftFromPublished.json && newDraftFromPublished.json.data) createdIds.push(newDraftFromPublished.json.data.news.id);
  const latestAgain = await pub("/api/news/latest");
  check("draf baru tidak masuk /latest", !latestAgain.text.includes("baru-draf"), latestAgain.json && latestAgain.json.data.items.map((i) => i.slug));

  // ---------- 6. cover & hapus ----------
  section("6. Cover dan penghapusan berita");
  const removeCover = await adm("DELETE", `/api/admin/news/${withCover.id}/cover`);
  check("admin menghapus cover -> 200", removeCover.status === 200, removeCover.status);
  const afterCover = await pub(`/api/news/${withCover.slug}`);
  check("setelah cover dihapus: coverImageUrl null", afterCover.json && afterCover.json.data.news.coverImageUrl === null, afterCover.json && afterCover.json.data.news.coverImageUrl);
  const del = await adm("DELETE", `/api/admin/news/${newest.id}`);
  check("admin menghapus berita -> 200", del.status === 200, del.status);
  createdIds.splice(createdIds.indexOf(newest.id), 1);
  const goneDetail = await pub(`/api/news/${newest.slug}`);
  const goneLatest = await pub("/api/news/latest");
  check("setelah dihapus: detail 404", goneDetail.status === 404, goneDetail.status);
  check("setelah dihapus: hilang dari /latest dan /latest tetap terisi", !goneLatest.json.data.items.some((i) => i.slug === newest.slug) && goneLatest.json.data.items.length > 0);

  // ---------- 7. publik bersifat baca-saja & routing ----------
  section("7. Endpoint publik hanya baca & tidak mengganggu route lain");
  for (const [method, path] of [
    ["POST", "/api/news"],
    ["PATCH", `/api/news/${third.slug}`],
    ["PUT", `/api/news/${third.slug}`],
    ["DELETE", `/api/news/${third.slug}`],
  ]) {
    const r = await api(method, path, { body: { title: "x" } });
    check(`${method} ${path.replace(third.slug, ":slug")} -> 404 (tidak ada route tulis publik)`, r.status === 404, r.status);
  }
  const stillThere = await pub(`/api/news/${third.slug}`);
  check("berita tetap ada setelah percobaan tulis publik", stillThere.status === 200, stillThere.status);
  const extra = await pub("/api/news/a/b");
  check("path bersarang tidak dikenal -> 404", extra.status === 404, extra.status);
  const announcements = await pub("/api/announcements");
  check("GET /api/announcements publik tetap berfungsi", announcements.status === 200 && announcements.json.success === true, announcements.status);
  const health2 = await pub("/api/health");
  check("GET /api/health tetap berfungsi", health2.status === 200, health2.status);

  // ---------- 8. CORS ----------
  section("8. CORS untuk frontend Next.js");
  const origin = env.frontendOrigins[0];
  const cors = await pub("/api/news/latest", { headers: { Origin: origin } });
  check(`origin frontend (${origin}) diizinkan`, cors.headers.get("access-control-allow-origin") === origin, cors.headers.get("access-control-allow-origin"));
  const corsBad = await pub("/api/news/latest", { headers: { Origin: "https://situs-asing.example" } });
  check("origin lain tidak diberi header CORS", !corsBad.headers.get("access-control-allow-origin"), corsBad.headers.get("access-control-allow-origin"));

  // ---------- 9. admin tidak berubah ----------
  section("9. Regresi ringan endpoint admin (uji lengkap: testNews/testCover/testAnnouncement)");
  for (const [method, path] of [
    ["GET", "/api/admin/news"],
    ["GET", `/api/admin/news/${SAMPLE_ID}`],
    ["POST", "/api/admin/news"],
    ["PATCH", `/api/admin/news/${SAMPLE_ID}`],
    ["DELETE", `/api/admin/news/${SAMPLE_ID}`],
    ["PUT", `/api/admin/news/${SAMPLE_ID}/cover`],
    ["GET", "/api/admin/announcements"],
  ]) {
    const r = await api(method, path, { body: method === "GET" || method === "DELETE" ? undefined : {} });
    check(`${method} ${path.replace(SAMPLE_ID, ":id")} tanpa token -> 401`, r.status === 401, r.status);
  }
  const adminDrafts = await adm("GET", `/api/admin/news?status=draft&search=${q}&limit=50`);
  check(
    "admin tetap bisa melihat draf (draf tidak hilang dari sisi admin)",
    adminDrafts.status === 200 && adminDrafts.json.data.items.some((i) => i.id === draft.id),
    adminDrafts.status
  );
  const adminDetail = await adm("GET", `/api/admin/news/${draft.id}`);
  check("detail admin tetap memuat status, coverImagePath, createdAt", adminDetail.status === 200 && ["status", "coverImagePath", "createdAt", "contentHtml"].every((k) => k in adminDetail.json.data.news), adminDetail.json && Object.keys(adminDetail.json.data.news));
  const me = await adm("GET", "/api/auth/me");
  check("/api/auth/me tetap berfungsi", me.status === 200, me.status);
};

// Membersihkan semua berita uji
const cleanup = async () => {
  let removed = 0;
  for (const id of createdIds) {
    const r = await adm("DELETE", `/api/admin/news/${id}`).catch(() => null);
    if (r && r.status === 200) removed += 1;
  }
  const left = await adm("GET", `/api/admin/news?search=${encodeURIComponent(SEARCH_ALL)}&limit=50`).catch(() => null);
  if (left && left.status === 200) {
    for (const item of left.json.data.items) {
      if (item.title.startsWith(PREFIX)) {
        const r = await adm("DELETE", `/api/admin/news/${item.id}`).catch(() => null);
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
