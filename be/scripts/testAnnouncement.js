// Pengujian otomatis endpoint Announcement (/api/admin/announcements dan /api/announcements)
// terhadap server yang SEDANG BERJALAN.
//
// Cara pakai (server harus sudah jalan: npm run dev, lalu buka terminal kedua di folder be):
//   node scripts/testAnnouncement.js
//
// Opsional (tanpa prompt):
//   TEST_EMAIL=... TEST_PASSWORD=... API_URL=http://localhost:5000 node scripts/testAnnouncement.js

require("../src/config/env");

const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const PREFIX = "[TES-OTOMATIS-ANNOUNCEMENT]";
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
  const health = await api("GET", "/", { auth: false }).catch(() => null);
  if (!health || health.status !== 200) {
    console.error(`\nServer tidak bisa dihubungi di ${API_URL}. Jalankan dulu: npm run dev`);
    process.exit(1);
  }

  let adminName;
  let adminId;

  if (process.env.TEST_TOKEN) {
    token = process.env.TEST_TOKEN;
    const me = await api("GET", "/api/auth/me", { auth: true });
    if (me.status !== 200 || !me.json || !me.json.data || !me.json.data.admin) {
      console.error(`\nTEST_TOKEN tidak valid atau admin tidak aktif (HTTP ${me.status}).`);
      process.exit(1);
    }
    adminName = me.json.data.admin.name;
    adminId = me.json.data.admin.id;
  } else {
    const email = process.env.TEST_EMAIL || (await ask("Email admin    : ", false));
    const password = process.env.TEST_PASSWORD || (await ask("Password admin : ", true));

    const login = await api("POST", "/api/auth/login", { body: { email, password }, auth: false });
    if (login.status !== 200) {
      console.error(`\nLogin gagal (HTTP ${login.status}): ${login.json && login.json.message}`);
      process.exit(1);
    }
    token = login.json.data.token;
    adminName = login.json.data.admin.name;
    adminId = login.json.data.admin.id;
  }

  console.log(`\nLogin berhasil sebagai ${adminName}. Menjalankan pengujian di ${API_URL} ...`);

  // ---------- 1. keamanan akses admin ----------
  section("1. Semua endpoint admin wajib login");
  const protectedCalls = [
    ["GET", "/api/admin/announcements"],
    ["GET", `/api/admin/announcements/${SAMPLE_ID}`],
    ["POST", "/api/admin/announcements", { title: "Tes", contentHtml: "<p>x</p>" }],
    ["PATCH", `/api/admin/announcements/${SAMPLE_ID}`, { status: "draft" }],
    ["DELETE", `/api/admin/announcements/${SAMPLE_ID}`],
  ];
  for (const [method, path, body] of protectedCalls) {
    const none = await api(method, path, { body, auth: false });
    check(`${method} tanpa token -> 401`, none.status === 401, none.status);
  }
  const fakeToken = await fetch(`${API_URL}/api/admin/announcements`, {
    headers: { Authorization: "Bearer abc.def.ghi" },
  });
  check("token palsu -> 401", fakeToken.status === 401, fakeToken.status);

  // ---------- 2. create ----------
  section("2. Membuat pengumuman (POST Admin)");
  const c1 = await api("POST", "/api/admin/announcements", {
    body: {
      title: `${PREFIX} Jadwal Pengisian KRS 2026/2027`,
      contentHtml:
        '<h1>Penting!</h1><p onclick="alert(1)">Pengisian KRS dimulai Senin depan.</p><script>alert(1)</script><a href="javascript:alert(1)">klik</a><img src="x.png" onerror="alert(1)">',
    },
  });
  const a1 = c1.json && c1.json.data && c1.json.data.announcement;
  if (a1) createdIds.push(a1.id);
  check("status 201", c1.status === 201, c1.json);
  if (a1) {
    check("slug otomatis dari judul", a1.slug === "tes-otomatis-announcement-jadwal-pengisian-krs-2026-2027", a1.slug);
    check("status default draft & publishedAt null", a1.status === "draft" && a1.publishedAt === null, [a1.status, a1.publishedAt]);
    check("author = admin yang login", a1.author && a1.author.id === adminId && a1.author.name === adminName, a1.author);
    check("script dibuang", !/script|alert/i.test(a1.contentHtml), a1.contentHtml);
    check("onclick dibuang", !/onclick/i.test(a1.contentHtml), a1.contentHtml);
    check("javascript: dibuang", !/javascript:/i.test(a1.contentHtml), a1.contentHtml);
    check("<img> dibuang", !/<img/i.test(a1.contentHtml), a1.contentHtml);
    check("h1 diubah jadi h2", /<h2>Penting!<\/h2>/.test(a1.contentHtml), a1.contentHtml);
    check("excerpt otomatis terisi", typeof a1.excerpt === "string" && a1.excerpt.length > 0, a1.excerpt);
    check("tidak ada password/hash di response", !/password_hash|passwordHash/i.test(c1.text), "ditemukan password_hash");
  }

  const c2 = await api("POST", "/api/admin/announcements", {
    body: {
      title: `${PREFIX} Jadwal Pengisian KRS 2026/2027`,
      contentHtml: "<p>Pengumuman kedua dengan judul sama.</p>",
      status: "published",
      excerpt: "Ringkasan buatan admin manual",
    },
  });
  const a2 = c2.json && c2.json.data && c2.json.data.announcement;
  if (a2) createdIds.push(a2.id);
  check("judul sama -> slug unik (-2)", c2.status === 201 && a2 && a2.slug === "tes-otomatis-announcement-jadwal-pengisian-krs-2026-2027-2", a2 && a2.slug);
  check("published: publishedAt terisi", a2 && a2.status === "published" && !!a2.publishedAt, a2 && a2.publishedAt);
  check("excerpt manual dipakai", a2 && a2.excerpt === "Ringkasan buatan admin manual", a2 && a2.excerpt);

  const c3 = await api("POST", "/api/admin/announcements", {
    body: { title: `${PREFIX} Beasiswa & <b>Bantuan</b> UKT`, contentHtml: "<p>Informasi beasiswa.</p>" },
  });
  const a3 = c3.json && c3.json.data && c3.json.data.announcement;
  if (a3) createdIds.push(a3.id);
  check("title teks polos ('Beasiswa & Bantuan UKT', bukan &amp;)", a3 && a3.title === `${PREFIX} Beasiswa & Bantuan UKT`, a3 && a3.title);

  // ---------- 3. validasi ----------
  section("3. Validasi input (harus ditolak 400)");
  const badCreates = [
    ["tanpa title", { contentHtml: "<p>x</p>" }],
    ["title terlalu pendek", { title: "ab", contentHtml: "<p>x</p>" }],
    ["tanpa contentHtml", { title: "Judul Pengumuman Valid" }],
    ["contentHtml hanya script", { title: "Judul Pengumuman Valid", contentHtml: "<script>alert(1)</script>" }],
    ["status tidak dikenal", { title: "Judul Pengumuman Valid", contentHtml: "<p>x</p>", status: "archived" }],
    ["authorId dikirim dari body", { title: "Judul Pengumuman Valid", contentHtml: "<p>x</p>", authorId: adminId }],
    ["publishedAt dikirim dari body", { title: "Judul Pengumuman Valid", contentHtml: "<p>x</p>", publishedAt: "2020-01-01T00:00:00Z" }],
    ["contentHtml > 200.000 karakter", { title: "Judul Pengumuman Valid", contentHtml: "a".repeat(200001) }],
  ];
  for (const [name, body] of badCreates) {
    const r = await api("POST", "/api/admin/announcements", { body });
    check(`${name} -> 400 VALIDATION_ERROR`, r.status === 400 && r.json && r.json.code === "VALIDATION_ERROR", [r.status, r.json && r.json.code]);
    if (r.status === 201 && r.json && r.json.data) createdIds.push(r.json.data.announcement.id);
  }
  const brokenJson = await api("POST", "/api/admin/announcements", { rawBody: "{bukan json" });
  check("JSON rusak -> 400 INVALID_JSON", brokenJson.status === 400 && brokenJson.json && brokenJson.json.code === "INVALID_JSON", [brokenJson.status, brokenJson.json && brokenJson.json.code]);

  // ---------- 4. list admin ----------
  section("4. Daftar pengumuman admin (GET /api/admin/announcements)");
  const l1 = await api("GET", "/api/admin/announcements");
  check("status 200", l1.status === 200, l1.status);
  const d1 = l1.json && l1.json.data;
  check("default page=1, limit=9", d1 && d1.pagination.page === 1 && d1.pagination.limit === 9, d1 && d1.pagination);
  check("maksimal 9 item per halaman", d1 && d1.items.length <= 9, d1 && d1.items.length);
  check("daftar admin tidak memuat contentHtml", d1 && d1.items.every((i) => !("contentHtml" in i)));
  check("tidak ada password/hash di response", !/password_hash|passwordHash/i.test(l1.text));

  const l2 = await api("GET", "/api/admin/announcements?status=published&limit=50");
  check("filter status=published", l2.status === 200 && l2.json.data.items.every((i) => i.status === "published"), l2.status);
  const l3 = await api("GET", "/api/admin/announcements?status=draft&limit=50");
  check("filter status=draft", l3.status === 200 && l3.json.data.items.every((i) => i.status === "draft"), l3.status);

  const s1 = await api("GET", `/api/admin/announcements?search=${encodeURIComponent("TES-OTOMATIS-ANNOUNCEMENT")}&limit=50`);
  const found = s1.json && s1.json.data ? s1.json.data.items.map((i) => i.id) : [];
  check("pencarian judul menemukan pengumuman uji", s1.status === 200 && createdIds.filter((id) => found.includes(id)).length === 3, [s1.status, found.length]);

  const s2 = await api("GET", `/api/admin/announcements?search=${encodeURIComponent("RINGKASAN buatan admin")}`);
  check("pencarian excerpt (case-insensitive)", s2.status === 200 && s2.json.data.items.some((i) => i.id === (a2 && a2.id)), s2.status);

  for (const evil of ["a,id.eq.1", "x),(status.eq.draft", 'a"b', "50%", "a_b", "\\", "*"]) {
    const r = await api("GET", `/api/admin/announcements?search=${encodeURIComponent(evil)}`);
    check(`pencarian karakter khusus ${JSON.stringify(evil)} -> 200`, r.status === 200, [r.status, r.json && r.json.code]);
  }
  const lim = await api("GET", "/api/admin/announcements?limit=51");
  check("limit=51 -> 400 VALIDATION_ERROR", lim.status === 400 && lim.json.code === "VALIDATION_ERROR", [lim.status, lim.json && lim.json.code]);

  const far = await api("GET", "/api/admin/announcements?page=99999");
  check("halaman di luar jangkauan -> 200, items kosong", far.status === 200 && far.json.data.items.length === 0 && far.json.data.pagination.total >= 3, [far.status, far.json && far.json.data && far.json.data.pagination]);

  // ---------- 5. detail admin ----------
  section("5. Detail pengumuman admin (GET /api/admin/announcements/:id)");
  if (a1) {
    const g = await api("GET", `/api/admin/announcements/${a1.id}`);
    check("200 + contentHtml lengkap", g.status === 200 && g.json.data.announcement.id === a1.id && typeof g.json.data.announcement.contentHtml === "string", g.status);
  }
  const g404 = await api("GET", `/api/admin/announcements/${SAMPLE_ID}`);
  check("ID tidak ada -> 404 ANNOUNCEMENT_NOT_FOUND", g404.status === 404 && g404.json.code === "ANNOUNCEMENT_NOT_FOUND", [g404.status, g404.json && g404.json.code]);
  const gBad = await api("GET", "/api/admin/announcements/bukan-uuid");
  check("ID bukan UUID -> 400", gBad.status === 400, gBad.status);

  // ---------- 6. update admin ----------
  section("6. Mengubah pengumuman (PATCH Admin)");
  if (a1 && a2) {
    const p1 = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { title: `${PREFIX} Judul Pengumuman Diubah` } });
    check("ubah judul -> 200", p1.status === 200, p1.json);
    check("slug TIDAK ikut berubah saat judul diedit", p1.json && p1.json.data.announcement.slug === a1.slug, p1.json && p1.json.data.announcement.slug);
    check("excerpt lama dipertahankan", p1.json && p1.json.data.announcement.excerpt === a1.excerpt);
    check("updatedAt diperbarui", p1.json && new Date(p1.json.data.announcement.updatedAt) > new Date(a1.updatedAt), p1.json && p1.json.data.announcement.updatedAt);

    const pub = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { status: "published" } });
    const firstPublished = pub.json && pub.json.data.announcement.publishedAt;
    check("draft -> published: publishedAt terisi", pub.status === 200 && !!firstPublished, pub.json);

    const back = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { status: "draft" } });
    check("published -> draft: publishedAt dipertahankan", back.status === 200 && back.json.data.announcement.publishedAt === firstPublished, back.json && back.json.data.announcement.publishedAt);

    const again = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { status: "published" } });
    check("terbit ulang: publishedAt tetap yang pertama", again.status === 200 && again.json.data.announcement.publishedAt === firstPublished, again.json && again.json.data.announcement.publishedAt);

    const body2 = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { contentHtml: "<p>Konten baru tersanitasi</p><script>x()</script>" } });
    check("ubah konten: disanitasi & excerpt tidak berubah", body2.status === 200 && body2.json.data.announcement.contentHtml === "<p>Konten baru tersanitasi</p>" && body2.json.data.announcement.excerpt === a1.excerpt, body2.json && body2.json.data.announcement.contentHtml);

    const ex = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { excerpt: "" } });
    check("excerpt dikirim kosong -> dibuat ulang dari isi baru", ex.status === 200 && ex.json.data.announcement.excerpt === "Konten baru tersanitasi", ex.json && ex.json.data.announcement.excerpt);

    const sl = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { slug: "Tes-Otomatis-Slug-Pengumuman-Baru" } });
    check("slug eksplisit dipakai (lowercase)", sl.status === 200 && sl.json.data.announcement.slug === "tes-otomatis-slug-pengumuman-baru", sl.json && sl.json.data.announcement.slug);
    const slTaken = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body: { slug: a2.slug } });
    check("slug milik pengumuman lain -> 409 SLUG_TAKEN", slTaken.status === 409 && slTaken.json.code === "SLUG_TAKEN", [slTaken.status, slTaken.json && slTaken.json.code]);

    for (const [name, body] of [
      ["body kosong", {}],
      ["authorId", { authorId: adminId }],
      ["publishedAt", { publishedAt: "2020-01-01T00:00:00Z" }],
      ["contentHtml kosong", { contentHtml: "   " }],
      ["status tidak dikenal", { status: "x" }],
    ]) {
      const r = await api("PATCH", `/api/admin/announcements/${a1.id}`, { body });
      check(`PATCH ${name} -> 400`, r.status === 400, [r.status, r.json && r.json.code]);
    }
  }

  // ---------- 7. endpoint publik ----------
  section("7. Endpoint Publik Pengumuman (/api/announcements)");
  const pubList = await api("GET", "/api/announcements", { auth: false });
  check("GET /api/announcements tanpa auth -> 200", pubList.status === 200, pubList.status);
  const pubData = pubList.json && pubList.json.data;
  check("publik pagination ada", pubData && pubData.pagination && pubData.pagination.page === 1, pubData && pubData.pagination);
  check("publik list tidak memuat contentHtml", pubData && pubData.items.every((i) => !("contentHtml" in i)));

  // Verifikasi hanya pengumuman published yang muncul di publik
  if (a2) {
    check("pengumuman published (a2) muncul di publik", pubData && pubData.items.some((i) => i.id === a2.id), pubData && pubData.items.map((i) => i.id));
  }
  if (a3) {
    // a3 berstatus draft
    check("pengumuman draft (a3) TIDAK muncul di daftar publik", pubData && !pubData.items.some((i) => i.id === a3.id), a3.id);
  }

  // Detail publik via slug
  if (a2) {
    const pubDetail = await api("GET", `/api/announcements/${a2.slug}`, { auth: false });
    check("detail publik via slug (published) -> 200 + contentHtml", pubDetail.status === 200 && pubDetail.json.data.announcement.id === a2.id && typeof pubDetail.json.data.announcement.contentHtml === "string", pubDetail.status);
  }

  if (a3) {
    // a3 draft: publik mencoba akses lewat slug harus 404
    const pubDraft = await api("GET", `/api/announcements/${a3.slug}`, { auth: false });
    check("detail publik pengumuman draft -> 404 ANNOUNCEMENT_NOT_FOUND (tidak bocor)", pubDraft.status === 404 && pubDraft.json.code === "ANNOUNCEMENT_NOT_FOUND", [pubDraft.status, pubDraft.json && pubDraft.json.code]);
  }

  const pub404 = await api("GET", "/api/announcements/slug-yang-sama-sekali-tidak-ada", { auth: false });
  check("slug tidak ada di publik -> 404", pub404.status === 404, pub404.status);

  const pubSearch = await api("GET", `/api/announcements?search=${encodeURIComponent("Ringkasan buatan admin")}`, { auth: false });
  check("pencarian publik berhasil menemukan data published", pubSearch.status === 200 && pubSearch.json.data.items.some((i) => i.id === (a2 && a2.id)), pubSearch.status);

  // ---------- 8. delete admin ----------
  section("8. Menghapus pengumuman (DELETE Admin)");
  const d404 = await api("DELETE", `/api/admin/announcements/${SAMPLE_ID}`);
  check("DELETE ID tidak ada -> 404", d404.status === 404, d404.status);
  const dBad = await api("DELETE", "/api/admin/announcements/bukan-uuid");
  check("DELETE ID bukan UUID -> 400", dBad.status === 400, dBad.status);

  if (a3) {
    const del = await api("DELETE", `/api/admin/announcements/${a3.id}`);
    check("hapus pengumuman uji -> 200", del.status === 200 && del.json.success === true, del.json);
    const gone = await api("GET", `/api/admin/announcements/${a3.id}`);
    check("setelah dihapus, detail admin -> 404", gone.status === 404, gone.status);
    const delAgain = await api("DELETE", `/api/admin/announcements/${a3.id}`);
    check("hapus lagi -> 404", delAgain.status === 404, delAgain.status);
    createdIds.splice(createdIds.indexOf(a3.id), 1);
  }
};

// Membersihkan semua pengumuman uji
const cleanup = async () => {
  let removed = 0;
  for (const id of createdIds) {
    const r = await api("DELETE", `/api/admin/announcements/${id}`).catch(() => null);
    if (r && r.status === 200) removed += 1;
  }
  const left = await api("GET", `/api/admin/announcements?search=${encodeURIComponent("TES-OTOMATIS-ANNOUNCEMENT")}&limit=50`).catch(() => null);
  if (left && left.status === 200) {
    for (const item of left.json.data.items) {
      if (item.title.startsWith(PREFIX)) {
        const r = await api("DELETE", `/api/admin/announcements/${item.id}`).catch(() => null);
        if (r && r.status === 200) removed += 1;
      }
    }
  }
  console.log(`\nPembersihan: ${removed} pengumuman uji dihapus.`);
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
