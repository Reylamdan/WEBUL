// Pengujian otomatis endpoint cover /api/admin/news/:id/cover terhadap server yang SEDANG BERJALAN.
//
// Cara pakai (server harus sudah jalan: npm run dev, lalu buka terminal kedua di folder be):
//   node scripts/testCover.js
//
// Opsional tanpa prompt:
//   TEST_EMAIL=... TEST_PASSWORD=... API_URL=http://localhost:5000 node scripts/testCover.js
//
// Skrip membuat berita uji berawalan "[TES-OTOMATIS-COVER]", menguji upload/validasi/ganti/hapus
// cover, lalu SELALU membersihkan berita uji. Berita asli tidak disentuh.
//
// Catatan: rate limit PUT cover adalah 20 request / 15 menit dan disimpan di memori server.
// Jika skrip dijalankan ulang pada server yang sama dalam 15 menit, restart server terlebih dahulu.

require("../src/config/env"); // hanya untuk membaca PORT; isi .env tidak ditampilkan

const sharp = require("sharp");
const supabase = require("../src/config/supabase");
const { MAX_FILE_SIZE, assertWithinLimits } = require("../src/utils/imageValidator");

const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const PREFIX = "[TES-OTOMATIS-COVER]";
const SAMPLE_ID = "123e4567-e89b-42d3-a456-426614174000"; // UUID valid yang tidak ada
const BUCKET = "news-images";
// Opsional untuk otomasi: token admin yang sudah ada. Jika kosong, skrip meminta login.
const PRESET_TOKEN = process.env.TEST_TOKEN || "";

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

const readResponse = async (res) => {
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* bukan JSON */
  }
  return { status: res.status, json, text };
};

const api = async (method, path, { body, auth = true } = {}) => {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return readResponse(res);
};

const imageFile = (buffer, filename, type, field = "cover") => ({ buffer, filename, type, field });

const uploadCover = async (path, { files = [], fields = {}, auth = true } = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  for (const file of files) {
    form.append(file.field || "cover", new Blob([file.buffer], { type: file.type }), file.filename);
  }

  const headers = {};
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers, body: form });
  return readResponse(res);
};

const makeImage = async (format, width = 640, height = 480) => {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 120, b: 190 },
    },
  });

  if (format === "jpeg") return image.jpeg({ quality: 90 }).toBuffer();
  if (format === "png") return image.png().toBuffer();
  return image.webp({ quality: 90 }).toBuffer();
};

const makeOrientedJpeg = async () => {
  const image = sharp({
    create: {
      width: 400,
      height: 200,
      channels: 3,
      background: { r: 200, g: 80, b: 40 },
    },
  });

  return image.jpeg({ quality: 90 }).withMetadata({ orientation: 6 }).toBuffer();
};

const makeAnimatedWebp = async () => {
  const frames = [];
  for (const color of [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 },
  ]) {
    frames.push(
      await sharp({ create: { width: 20, height: 20, channels: 3, background: color } })
        .png()
        .toBuffer()
    );
  }
  return sharp(frames, { join: { animated: true } }).webp().toBuffer();
};

// Verifikasi Storage memakai service role secara READ-ONLY (hanya list).
const listCoverFiles = async (newsId) => {
  const { data, error } = await supabase.storage.from(BUCKET).list(`covers/${newsId}`, { limit: 100 });
  if (error) throw new Error(`Gagal membaca Storage: ${error.message}`);
  return (data || []).map((item) => item.name).filter(Boolean);
};

const fetchPublicImage = async (url) => {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    cacheControl: res.headers.get("cache-control"),
    buffer,
  };
};

const createdIds = [];

const createTestNews = async (label) => {
  const response = await api("POST", "/api/admin/news", {
    body: {
      title: `${PREFIX} ${label} ${Date.now()}`,
      contentHtml: "<p>Berita uji otomatis untuk cover image.</p>",
    },
  });

  if (response.status !== 201 || !response.json?.data?.news) {
    throw new Error(`Gagal membuat berita uji (HTTP ${response.status}): ${response.text}`);
  }

  const news = response.json.data.news;
  createdIds.push(news.id);
  return news;
};

const removeCreatedId = (id) => {
  const index = createdIds.indexOf(id);
  if (index !== -1) createdIds.splice(index, 1);
};

const run = async () => {
  let email = null;
  let password = null;

  if (!PRESET_TOKEN) {
    email = process.env.TEST_EMAIL || (await ask("Email admin    : ", false));
    password = process.env.TEST_PASSWORD || (await ask("Password admin : ", true));
  }

  const health = await api("GET", "/", { auth: false }).catch(() => null);
  if (!health || health.status !== 200) {
    console.error(`\nServer tidak bisa dihubungi di ${API_URL}. Jalankan dulu: npm run dev`);
    process.exit(1);
  }

  if (PRESET_TOKEN) {
    token = PRESET_TOKEN;
    const me = await api("GET", "/api/auth/me");
    if (me.status !== 200 || !me.json || !me.json.data || !me.json.data.admin) {
      console.error(`\nToken uji tidak valid (HTTP ${me.status}): ${me.json && me.json.message}`);
      process.exit(1);
    }
    console.log(`\nMenggunakan token admin ${me.json.data.admin.name}. Menjalankan pengujian cover di ${API_URL} ...`);
  } else {
    const login = await api("POST", "/api/auth/login", { body: { email, password }, auth: false });
    if (login.status !== 200) {
      console.error(`\nLogin gagal (HTTP ${login.status}): ${login.json && login.json.message}`);
      process.exit(1);
    }
    token = login.json.data.token;
    console.log(`\nLogin berhasil sebagai ${login.json.data.admin.name}. Menjalankan pengujian cover di ${API_URL} ...`);
  }

  const news = await createTestNews("Utama");
  const base = `/api/admin/news/${news.id}/cover`;

  const initialDetail = await api("GET", `/api/admin/news/${news.id}`);
  check(
    "berita tanpa cover: coverImagePath & coverImageUrl null",
    initialDetail.status === 200 &&
      initialDetail.json.data.news.coverImagePath === null &&
      initialDetail.json.data.news.coverImageUrl === null,
    initialDetail.json && initialDetail.json.data && initialDetail.json.data.news
  );

  const jpeg = imageFile(await makeImage("jpeg"), "foto-asli-saya.jpg", "image/jpeg");
  const png = imageFile(await makeImage("png"), "gambar-baru.png", "image/png");

  // ---------- 1. keamanan ----------
  section("1. Keamanan dan parameter");
  const noAuth = await uploadCover(base, { files: [jpeg], auth: false });
  check("PUT tanpa token -> 401", noAuth.status === 401, [noAuth.status, noAuth.json && noAuth.json.code]);

  const noAuthDelete = await api("DELETE", base, { auth: false });
  check("DELETE tanpa token -> 401", noAuthDelete.status === 401, [noAuthDelete.status, noAuthDelete.json && noAuthDelete.json.code]);

  const badUuid = await uploadCover("/api/admin/news/bukan-uuid/cover");
  check("UUID tidak valid -> 400", badUuid.status === 400, [badUuid.status, badUuid.json && badUuid.json.code]);

  const missingNews = await uploadCover(`/api/admin/news/${SAMPLE_ID}/cover`);
  check(
    "berita tidak ada -> 404 NEWS_NOT_FOUND",
    missingNews.status === 404 && missingNews.json && missingNews.json.code === "NEWS_NOT_FOUND",
    [missingNews.status, missingNews.json && missingNews.json.code]
  );

  // ---------- 2. bentuk request ----------
  section("2. Bentuk request multipart");
  const noFile = await uploadCover(base);
  check(
    "tanpa file -> 400 FILE_REQUIRED",
    noFile.status === 400 && noFile.json && noFile.json.code === "FILE_REQUIRED",
    [noFile.status, noFile.json && noFile.json.code]
  );

  const textField = await uploadCover(base, { fields: { caption: "teks tidak boleh" } });
  check(
    "text field -> 400 VALIDATION_ERROR",
    textField.status === 400 && textField.json && textField.json.code === "VALIDATION_ERROR",
    [textField.status, textField.json && textField.json.code]
  );

  const twoFiles = await uploadCover(base, { files: [jpeg, png] });
  check(
    "dua file -> 400 VALIDATION_ERROR",
    twoFiles.status === 400 && twoFiles.json && twoFiles.json.code === "VALIDATION_ERROR",
    [twoFiles.status, twoFiles.json && twoFiles.json.code]
  );

  const wrongField = await uploadCover(base, {
    files: [imageFile(await makeImage("jpeg"), "x.jpg", "image/jpeg", "image")],
  });
  check(
    "field selain cover -> 400 VALIDATION_ERROR",
    wrongField.status === 400 && wrongField.json && wrongField.json.code === "VALIDATION_ERROR",
    [wrongField.status, wrongField.json && wrongField.json.code]
  );

  // ---------- 3. validasi gambar ----------
  section("3. Validasi tipe dan isi gambar");
  const svg = await uploadCover(base, {
    files: [imageFile(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), "gambar.svg", "image/svg+xml")],
  });
  check(
    "SVG -> 415 UNSUPPORTED_FILE_TYPE",
    svg.status === 415 && svg.json && svg.json.code === "UNSUPPORTED_FILE_TYPE",
    [svg.status, svg.json && svg.json.code]
  );

  const gif = await uploadCover(base, {
    files: [imageFile(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), "gambar.gif", "image/gif")],
  });
  check(
    "GIF -> 415 UNSUPPORTED_FILE_TYPE",
    gif.status === 415 && gif.json && gif.json.code === "UNSUPPORTED_FILE_TYPE",
    [gif.status, gif.json && gif.json.code]
  );

  const mismatch = await uploadCover(base, {
    files: [imageFile(await makeImage("png"), "menyamar.jpg", "image/jpeg")],
  });
  check(
    "PNG menyamar sebagai JPEG -> 400 INVALID_IMAGE",
    mismatch.status === 400 && mismatch.json && mismatch.json.code === "INVALID_IMAGE",
    [mismatch.status, mismatch.json && mismatch.json.code]
  );

  const fake = await uploadCover(base, {
    files: [imageFile(Buffer.from("MZ\x90\x00bukan gambar"), "program.jpg", "image/jpeg")],
  });
  check(
    "file executable menyamar sebagai gambar -> 400 INVALID_IMAGE",
    fake.status === 400 && fake.json && fake.json.code === "INVALID_IMAGE",
    [fake.status, fake.json && fake.json.code]
  );

  const tooLarge = await uploadCover(base, {
    files: [imageFile(Buffer.alloc(MAX_FILE_SIZE + 1, 0x41), "besar.jpg", "image/jpeg")],
  });
  check(
    "file > 5 MB -> 413 FILE_TOO_LARGE",
    tooLarge.status === 413 && tooLarge.json && tooLarge.json.code === "FILE_TOO_LARGE",
    [tooLarge.status, tooLarge.json && tooLarge.json.code]
  );

  const tooWide = await uploadCover(base, {
    files: [imageFile(await makeImage("png", 8001, 1), "lebar.png", "image/png")],
  });
  check(
    "sisi > 8000 px -> 400 INVALID_IMAGE",
    tooWide.status === 400 && tooWide.json && tooWide.json.code === "INVALID_IMAGE",
    [tooWide.status, tooWide.json && tooWide.json.code]
  );

  const animated = await uploadCover(base, {
    files: [imageFile(await makeAnimatedWebp(), "animasi.webp", "image/webp")],
  });
  check(
    "WebP animasi -> 400 INVALID_IMAGE",
    animated.status === 400 && animated.json && animated.json.code === "INVALID_IMAGE",
    [animated.status, animated.json && animated.json.code]
  );

  let overPixelError = null;
  try {
    assertWithinLimits({ format: "jpeg", width: 8000, height: 5001, pages: 1 });
  } catch (error) {
    overPixelError = error;
  }
  check(
    "> 40 megapixel ditolak validator",
    overPixelError && overPixelError.code === "INVALID_IMAGE",
    overPixelError && overPixelError.code
  );

  // ---------- 4. upload valid ----------
  section("4. Upload gambar valid");
  const putJpeg = await uploadCover(base, { files: [jpeg] });
  const cover1 = putJpeg.json && putJpeg.json.data && putJpeg.json.data.news;
  check("JPEG valid -> 200", putJpeg.status === 200, [putJpeg.status, putJpeg.json && putJpeg.json.code]);
  if (cover1) {
    check("coverImagePath berformat covers/<id>/<uuid>.jpg", new RegExp(`^covers/${news.id}/[0-9a-f-]{36}\\.jpg$`).test(cover1.coverImagePath), cover1.coverImagePath);
    check("nama file asli tidak dipakai", !String(cover1.coverImagePath).includes("foto-asli-saya"), cover1.coverImagePath);
    check("coverImageUrl terisi", typeof cover1.coverImageUrl === "string" && cover1.coverImageUrl.startsWith("http"), cover1.coverImageUrl);
  }

  const detail1 = await api("GET", `/api/admin/news/${news.id}`);
  check(
    "GET detail memuat coverImageUrl yang sama",
    detail1.status === 200 && cover1 && detail1.json.data.news.coverImagePath === cover1.coverImagePath && detail1.json.data.news.coverImageUrl === cover1.coverImageUrl,
    detail1.json && detail1.json.data && detail1.json.data.news
  );

  const list1 = await api("GET", `/api/admin/news?search=${encodeURIComponent(PREFIX)}&limit=50`);
  const listItem = list1.json && list1.json.data ? list1.json.data.items.find((item) => item.id === news.id) : null;
  check(
    "GET list memuat coverImageUrl",
    list1.status === 200 && listItem && listItem.coverImageUrl === (cover1 && cover1.coverImageUrl),
    listItem
  );

  if (cover1) {
    const public1 = await fetchPublicImage(cover1.coverImageUrl);
    check("public URL dapat diakses", public1.status === 200, public1.status);
    check("public URL mengembalikan gambar", String(public1.contentType || "").startsWith("image/"), public1.contentType);
    check(
      "Cache-Control satu tahun",
      String(public1.cacheControl || "").includes("max-age=31536000"),
      public1.cacheControl
    );
  }

  // ---------- 5. ganti cover ----------
  section("5. Mengganti cover");
  const oldPath = cover1 && cover1.coverImagePath;
  const putPng = await uploadCover(base, { files: [png] });
  const cover2 = putPng.json && putPng.json.data && putPng.json.data.news;
  check("PNG valid -> 200", putPng.status === 200, [putPng.status, putPng.json && putPng.json.code]);
  if (cover2) {
    check("path berubah", cover2.coverImagePath !== oldPath, [oldPath, cover2.coverImagePath]);
    check("ekstensi mengikuti format asli (.png)", new RegExp(`\\.png$`).test(cover2.coverImagePath), cover2.coverImagePath);
  }

  const filesAfterReplace = await listCoverFiles(news.id);
  check("hanya satu file tersisa setelah ganti", filesAfterReplace.length === 1, filesAfterReplace);
  if (oldPath && cover2) {
    check("file lama sudah dihapus", !filesAfterReplace.includes(oldPath.split("/").pop()), filesAfterReplace);
    check("file baru ada di Storage", filesAfterReplace.includes(cover2.coverImagePath.split("/").pop()), filesAfterReplace);
  }

  // ---------- 6. orientasi dan metadata ----------
  section("6. Orientasi dan metadata EXIF");
  const oriented = await uploadCover(base, {
    files: [imageFile(await makeOrientedJpeg(), "orientasi.jpg", "image/jpeg")],
  });
  const cover3 = oriented.json && oriented.json.data && oriented.json.data.news;
  check("JPEG berorientasi -> 200", oriented.status === 200, [oriented.status, oriented.json && oriented.json.code]);
  if (cover3) {
    const public3 = await fetchPublicImage(cover3.coverImageUrl);
    let metadata = null;
    try {
      metadata = await sharp(public3.buffer).metadata();
    } catch {
      /* biarkan null */
    }
    check("orientasi diterapkan (400x200 -> 200x400)", metadata && metadata.width === 200 && metadata.height === 400, metadata && [metadata.width, metadata.height]);
    check("EXIF dan orientation hilang", metadata && metadata.exif === undefined && metadata.orientation === undefined, metadata && { exif: metadata.exif, orientation: metadata.orientation });
  }

  // ---------- 7. hapus cover ----------
  section("7. Menghapus cover");
  const delCover = await api("DELETE", base);
  const deletedNews = delCover.json && delCover.json.data && delCover.json.data.news;
  check("DELETE cover -> 200", delCover.status === 200, [delCover.status, delCover.json && delCover.json.code]);
  check("coverImagePath menjadi null", deletedNews && deletedNews.coverImagePath === null, deletedNews && deletedNews.coverImagePath);
  check("coverImageUrl menjadi null", deletedNews && deletedNews.coverImageUrl === null, deletedNews && deletedNews.coverImageUrl);

  const filesAfterDelete = await listCoverFiles(news.id);
  check("file cover terhapus dari Storage", filesAfterDelete.length === 0, filesAfterDelete);

  const detailAfterDelete = await api("GET", `/api/admin/news/${news.id}`);
  check(
    "GET detail setelah hapus cover bernilai null",
    detailAfterDelete.status === 200 && detailAfterDelete.json.data.news.coverImagePath === null && detailAfterDelete.json.data.news.coverImageUrl === null,
    detailAfterDelete.json && detailAfterDelete.json.data && detailAfterDelete.json.data.news
  );

  const delAgain = await api("DELETE", base);
  check(
    "DELETE cover lagi -> 404 COVER_NOT_FOUND",
    delAgain.status === 404 && delAgain.json && delAgain.json.code === "COVER_NOT_FOUND",
    [delAgain.status, delAgain.json && delAgain.json.code]
  );

  // ---------- 8. hapus berita dengan cover ----------
  section("8. Menghapus berita yang memiliki cover");
  const newsWithCover = await createTestNews("Akan Dihapus");
  const baseWithCover = `/api/admin/news/${newsWithCover.id}/cover`;
  const putWebp = await uploadCover(baseWithCover, {
    files: [imageFile(await makeImage("webp"), "cover.webp", "image/webp")],
  });
  check("upload WebP valid -> 200", putWebp.status === 200, [putWebp.status, putWebp.json && putWebp.json.code]);

  const filesBeforeNewsDelete = await listCoverFiles(newsWithCover.id);
  check("file cover ada sebelum berita dihapus", filesBeforeNewsDelete.length === 1, filesBeforeNewsDelete);

  const delNews = await api("DELETE", `/api/admin/news/${newsWithCover.id}`);
  check("DELETE berita -> 200", delNews.status === 200 && delNews.json && delNews.json.success === true, delNews.json);
  if (delNews.status === 200) removeCreatedId(newsWithCover.id);

  const filesAfterNewsDelete = await listCoverFiles(newsWithCover.id);
  check("file cover terhapus setelah berita dihapus", filesAfterNewsDelete.length === 0, filesAfterNewsDelete);

  const gone = await api("GET", `/api/admin/news/${newsWithCover.id}`);
  check("detail berita setelah dihapus -> 404", gone.status === 404, gone.status);
};

// Membersihkan semua berita uji, apa pun hasil pengujiannya.
const cleanup = async () => {
  let removed = 0;
  for (const id of createdIds) {
    const r = await api("DELETE", `/api/admin/news/${id}`).catch(() => null);
    if (r && r.status === 200) removed += 1;
  }

  const left = await api("GET", `/api/admin/news?search=${encodeURIComponent("TES-OTOMATIS-COVER")}&limit=50`).catch(() => null);
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
