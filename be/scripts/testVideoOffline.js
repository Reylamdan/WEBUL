// Pengujian OFFLINE Cloudinary Video Generik (Universitas LIA)
// Supabase dan Cloudinary diganti versi tiruan di memori: tanpa jaringan, tanpa kredensial asli.
// Menjalankan seluruh skenario: upload, validasi magic bytes, batas ukuran, CAS, orphan cleanup queue,
// keamanan kredensial, dan API publik.

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://fake-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.JWT_SECRET = "test-secret-".padEnd(48, "x");
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.DOTENV_CONFIG_PATH = "/tmp/tidak-ada.env";

const FAKE_SECRET = "SECRET-VIDEO-JANGAN-DICATAT-12345";
const FAKE_KEY = "KEY-VIDEO-JANGAN-DICATAT-98765";
const FAKE_BASIC = Buffer.from(`${FAKE_KEY}:${FAKE_SECRET}`).toString("base64");

process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
process.env.CLOUDINARY_API_KEY = FAKE_KEY;
process.env.CLOUDINARY_API_SECRET = FAKE_SECRET;
process.env.CLOUDINARY_ROOT_FOLDER = "universitas-lia";

const assert = require("node:assert/strict");
const path = require("node:path");
const { createFakeSupabase } = require("./lib/fakeSupabase");
const { createFakeCloudinary } = require("./lib/fakeCloudinary");

const sb = createFakeSupabase({
  strictTables: true,
  tables: ["admins", "news", "media_videos", "media_cleanup_queue"],
});
const cl = createFakeCloudinary();
const supabasePath = sb.install();
const cloudinaryPath = cl.install();
const { db, faults, hooks } = sb;

const logs = [];
const allLogs = [];
const origError = console.error;
const origWarn = console.warn;
const capture = (...a) => {
  const line = a
    .map((x) => (typeof x === "string" ? x : require("node:util").inspect(x, { depth: 6 })))
    .join(" ");
  logs.push(line);
  allLogs.push(line);
};
console.error = capture;
console.warn = capture;

const CREDENTIALS = [FAKE_SECRET, FAKE_KEY, FAKE_BASIC, "Authorization"];
const leaked = (text) => CREDENTIALS.filter((c) => String(text).includes(c));

const loadFreshApp = () => {
  for (const key of Object.keys(require.cache)) {
    if (
      key.startsWith(path.join(__dirname, "..", "src")) &&
      key !== supabasePath &&
      key !== cloudinaryPath
    ) {
      delete require.cache[key];
    }
  }
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

let passed = 0,
  failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  OK    ${name}`);
  } catch (e) {
    failed += 1;
    console.log(
      `  GAGAL ${name}\n        ${String(e.message).split("\n").slice(0, 4).join("\n        ")}`
    );
  }
};

(async () => {
  console.log("=== Pengujian Layanan Cloudinary Video Generik (OFFLINE) ===");

  const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  let base;
  let adminToken;
  let server;

  const startServer = async () => {
    if (server) await new Promise((r) => server.close(r));
    server = loadFreshApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}`;
    adminToken = require("../src/utils/token").signAdminToken({ id: ADMIN_ID });
  };

  const call = async (method, url, { body, token = adminToken, form } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) {
      payload = form;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${base}${url}`, { method, headers, body: payload });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { status: res.status, json, text };
  };

  // Helper untuk membuat buffer video simulasi dengan magic bytes yang valid
  const makeMp4 = (extraBytes = 100) => {
    const header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, // box size 32 bytes
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x69, 0x73, 0x6f, 0x6d, // major brand 'isom'
      0x00, 0x00, 0x02, 0x00, // minor version
      0x69, 0x73, 0x6f, 0x6d, // compatible brand 1
      0x6d, 0x70, 0x34, 0x31, // compatible brand 2
    ]);
    return Buffer.concat([header, Buffer.alloc(extraBytes, 0xaa)]);
  };

  const makeWebm = (extraBytes = 100) => {
    const header = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
    return Buffer.concat([header, Buffer.alloc(extraBytes, 0xbb)]);
  };

  const makeMov = (extraBytes = 100) => {
    const header = Buffer.from([
      0x00, 0x00, 0x00, 0x14, // box size 20 bytes
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x71, 0x74, 0x20, 0x20, // 'qt  '
    ]);
    return Buffer.concat([header, Buffer.alloc(extraBytes, 0xcc)]);
  };

  const makeFormData = (bytes, filename, type, field = "video") => {
    const f = new FormData();
    f.append(field, new Blob([bytes], { type }), filename);
    return f;
  };

  const resetState = () => {
    for (const k of Object.keys(db)) delete db[k];
    db.admins = [
      {
        id: ADMIN_ID,
        name: "Admin Video",
        email: "admin@universitaslia.ac.id",
        is_active: true,
        last_login_at: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    db.news = [];
    db.media_videos = [];
    db.media_cleanup_queue = [];
    cl.reset();
    faults.length = 0;
    hooks.beforeUpdate = null;
    logs.length = 0;
  };

  const reset = async () => {
    await startServer();
    resetState();
  };

  const mkNews = async (status = "published", title = "Berita Video Test") => {
    const res = await call("POST", "/api/admin/news", {
      body: { title, contentHtml: "<p>Konten berita untuk uji video.</p>", status },
    });
    return res.json.data.news;
  };

  await startServer();

  // =========================================================================
  console.log("\nA. Validasi Upload Video (Format, Magic Bytes, Ukuran, Hak Akses)");

  await test("upload tanpa token -> 401 UNAUTHORIZED", async () => {
    await reset();
    const n = await mkNews();
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "video.mp4", "video/mp4"),
      token: null,
    });
    assert.equal(r.status, 401);
    assert.equal(r.json.code, "UNAUTHORIZED");
  });

  await test("upload dengan role bukan admin -> 403 FORBIDDEN", async () => {
    await reset();
    const n = await mkNews();
    const jwt = require("jsonwebtoken");
    const nonAdminToken = jwt.sign({ role: "viewer" }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      issuer: "universitas-lia-api",
      subject: ADMIN_ID,
    });
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "video.mp4", "video/mp4"),
      token: nonAdminToken,
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, "FORBIDDEN");
  });

  await test("upload ke modul yang tidak valid / tidak dikenal -> 400 VALIDATION_ERROR", async () => {
    await reset();
    const n = await mkNews();
    const r = await call("POST", `/api/admin/videos/modul-salah!/${n.id}`, {
      form: makeFormData(makeMp4(), "video.mp4", "video/mp4"),
    });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "VALIDATION_ERROR");
  });

  await test("modul tanpa tabel induk (student-activities, campus-profile, academic-info, promotions, documentation) ditolak: upload, ganti, ambil, hapus -> 400; tidak ada aset/baris", async () => {
    await reset();
    const id = "123e4567-e89b-42d3-a456-426614174000";
    for (const m of ["student-activities", "campus-profile", "academic-info", "promotions", "documentation"]) {
      for (const method of ["POST", "PUT"]) {
        const r = await call(method, `/api/admin/videos/${m}/${id}`, {
          form: makeFormData(makeMp4(), "video.mp4", "video/mp4"),
        });
        assert.equal(r.status, 400, `${method} ${m}`);
        assert.equal(r.json.code, "VALIDATION_ERROR");
      }
      assert.equal((await call("GET", `/api/admin/videos/${m}/${id}`)).status, 400);
      assert.equal((await call("DELETE", `/api/admin/videos/${m}/${id}`)).status, 400);
    }
    assert.equal(cl.state.assets.size, 0);
    assert.equal(db.media_videos.length, 0);
  });

  await test("video milik modul tanpa induk TIDAK bisa publik walau barisnya ada di database -> ditolak (400), URL tidak bocor", async () => {
    await reset();
    const id = "123e4567-e89b-42d3-a456-426614174000";
    db.media_videos.push({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", owner_module: "promotions", record_id: id,
      public_id: "universitas-lia/videos/promotions/x/y", secure_url: "https://res.cloudinary.com/x/video/upload/y.mp4",
      thumbnail_url: "https://res.cloudinary.com/x/video/upload/y.jpg", resource_type: "video", format: "mp4",
      bytes: 10, status: "active", created_at: "2026-01-01T00:00:00Z",
    });
    const r = await call("GET", `/api/videos/promotions/${id}`, { token: null });
    assert.equal(r.status, 400);
    assert.ok(!r.text.includes("res.cloudinary.com"));
  });

  await test("upload ke konten yang tidak ada -> 404 RECORD_NOT_FOUND", async () => {
    await reset();
    const missingId = "123e4567-e89b-42d3-a456-426614174000";
    const r = await call("POST", `/api/admin/videos/news/${missingId}`, {
      form: makeFormData(makeMp4(), "video.mp4", "video/mp4"),
    });
    assert.equal(r.status, 404);
    assert.equal(r.json.code, "RECORD_NOT_FOUND");
    assert.equal(cl.state.assets.size, 0);
  });

  await test("format file tidak didukung (.avi, .exe, .pdf, image) -> 415 UNSUPPORTED_FILE_TYPE", async () => {
    await reset();
    const n = await mkNews();
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(Buffer.from("MZ header exe"), "malware.exe", "application/x-msdownload"),
    });
    assert.equal(r.status, 415);
    assert.equal(r.json.code, "UNSUPPORTED_FILE_TYPE");
  });

  await test("magic bytes spoofing (teks berganti nama .mp4) -> 400 INVALID_VIDEO", async () => {
    await reset();
    const n = await mkNews();
    const fakeMp4 = Buffer.from("ini bukan file mp4 melainkan teks biasa!");
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(fakeMp4, "fake.mp4", "video/mp4"),
    });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "INVALID_VIDEO");
    assert.equal(cl.state.assets.size, 0);
  });

  await test("ukuran file melebihi batas 50 MB -> 413 FILE_TOO_LARGE", async () => {
    await reset();
    const n = await mkNews();
    const bigBuffer = Buffer.alloc(51 * 1024 * 1024, 0);
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(bigBuffer, "big.mp4", "video/mp4"),
    });
    assert.equal(r.status, 413);
    assert.equal(r.json.code, "FILE_TOO_LARGE");
    assert.equal(cl.state.assets.size, 0);
  });

  await test("nama field selain 'video' -> 400 VALIDATION_ERROR", async () => {
    await reset();
    const n = await mkNews();
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "video.mp4", "video/mp4", "bukan_video"),
    });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "VALIDATION_ERROR");
  });

  // =========================================================================
  console.log("\nB. Alur Utama Upload, Metadata, dan Transformasi Thumbnail");

  await test("upload MP4 berhasil: tersimpan di Cloudinary & Supabase, thumbnail otomatis terbentuk", async () => {
    await reset();
    const n = await mkNews();
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "sample.mp4", "video/mp4"),
    });
    assert.equal(r.status, 201, r.text);
    assert.equal(r.json.success, true);
    const v = r.json.data.video;
    assert.ok(v.id);
    assert.equal(v.module, "news");
    assert.equal(v.recordId, n.id);
    assert.match(
      v.publicId,
      new RegExp(`^universitas-lia/videos/news/${n.id}/[0-9a-f-]{36}$`)
    );
    assert.match(v.secureUrl, /^https:\/\/res\.cloudinary\.com\/demo-cloud\/video\/upload\//);
    assert.match(
      v.thumbnailUrl,
      /^https:\/\/res\.cloudinary\.com\/demo-cloud\/video\/upload\/so_auto,q_auto,f_jpg\//
    );
    assert.equal(v.format, "mp4");
    assert.equal(v.width, 1920);
    assert.equal(v.height, 1080);
    assert.equal(v.duration, 15.5);
    assert.equal(v.status, "active");

    // Verifikasi bahwa nama file pengguna tidak bocor ke publicId
    assert.ok(!v.publicId.includes("sample"));

    // Verifikasi penyimpanan di tabel media_videos
    assert.equal(db.media_videos.length, 1);
    assert.equal(db.media_videos[0].public_id, v.publicId);
  });

  await test("upload WebM dan MOV berhasil didukung", async () => {
    for (const [fn, name, mime] of [
      [makeWebm, "clip.webm", "video/webm"],
      [makeMov, "clip.mov", "video/quicktime"],
    ]) {
      await reset();
      const n = await mkNews();
      const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
        form: makeFormData(fn(), name, mime),
      });
      assert.equal(r.status, 201, r.text);
      assert.equal(r.json.data.video.status, "active");
    }
  });

  await test("POST ulang saat video sudah ada -> 409 VIDEO_ALREADY_EXISTS (disarankan pakai PUT)", async () => {
    await reset();
    const n = await mkNews();
    await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });

    const second = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v2.mp4", "video/mp4"),
    });
    assert.equal(second.status, 409);
    assert.equal(second.json.code, "VIDEO_ALREADY_EXISTS");
  });

  await test("GET metadata video (admin) -> mengembalikan detail lengkap", async () => {
    await reset();
    const n = await mkNews();
    const post = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "sample.mp4", "video/mp4"),
    });
    const videoId = post.json.data.video.id;

    // GET by module & recordId
    const g1 = await call("GET", `/api/admin/videos/news/${n.id}`);
    assert.equal(g1.status, 200);
    assert.equal(g1.json.data.video.id, videoId);

    // GET by media ID
    const g2 = await call("GET", `/api/admin/videos/id/${videoId}`);
    assert.equal(g2.status, 200);
    assert.equal(g2.json.data.video.id, videoId);
  });

  // =========================================================================
  console.log("\nC. Penggantian Video (PUT) dan Pola CAS");

  await test("PUT mengganti video: aset baru disimpan, aset lama di-destroy di Cloudinary", async () => {
    await reset();
    const n = await mkNews();
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const oldPublicId = v1.json.data.video.publicId;

    const v2 = await call("PUT", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeWebm(), "v2.webm", "video/webm"),
    });
    assert.equal(v2.status, 200, v2.text);
    const newPublicId = v2.json.data.video.publicId;

    assert.notEqual(newPublicId, oldPublicId);
    assert.ok(!cl.state.assets.has(oldPublicId), "aset lama harus terhapus di Cloudinary");
    assert.ok(cl.state.assets.has(newPublicId), "aset baru harus ada di Cloudinary");
    assert.equal(cl.state.destroys.length, 1);
    assert.equal(cl.state.destroys[0].options.resource_type, "video");
  });

  await test("PUT video yang belum ada -> 404 VIDEO_NOT_FOUND", async () => {
    await reset();
    const n = await mkNews();
    const r = await call("PUT", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    assert.equal(r.status, 404);
    assert.equal(r.json.code, "VIDEO_NOT_FOUND");
  });

  await test("PUT bersamaan (CAS gagal) -> 409 VIDEO_CONFLICT; aset baru dibersihkan, video lama utuh", async () => {
    await reset();
    const n = await mkNews();
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const oldPublicId = v1.json.data.video.publicId;

    // Simulasikan request lain mengubah public_id tepat sebelum UPDATE CAS dijalankan.
    hooks.beforeUpdate = () => {
      const row = db.media_videos.find((item) => item.record_id === n.id);
      row.public_id = "universitas-lia/videos/news/pemenang-lain";
    };

    const conflict = await call("PUT", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeWebm(), "v2.webm", "video/webm"),
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.json.code, "VIDEO_CONFLICT");

    // Aset dari request yang kalah sudah dibersihkan; aset lama (milik pemenang) tetap ada.
    assert.equal(cl.state.assets.size, 1);
    assert.ok(cl.state.assets.has(oldPublicId), "aset lama tidak boleh ikut terhapus");
    assert.equal(cl.state.destroys.length, 1);
    assert.match(cl.state.destroys[0].publicId, /^universitas-lia\/videos\/news\//);
    assert.notEqual(cl.state.destroys[0].publicId, oldPublicId);
  });

  // =========================================================================
  console.log("\nD. Penghapusan Video (DELETE) dan Antrean Cleanup");

  await test("DELETE video: baris DB terhapus, aset Cloudinary di-destroy", async () => {
    await reset();
    const n = await mkNews();
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const pid = v1.json.data.video.publicId;

    const del = await call("DELETE", `/api/admin/videos/news/${n.id}`);
    assert.equal(del.status, 200);
    assert.equal(del.json.data.video, null);
    assert.ok(!cl.state.assets.has(pid));

    // Ambil lagi -> null
    const get = await call("GET", `/api/admin/videos/news/${n.id}`);
    assert.equal(get.json.data.video, null);

    // DELETE kedua -> 404
    const delAgain = await call("DELETE", `/api/admin/videos/news/${n.id}`);
    assert.equal(delAgain.status, 404);
  });

  await test("kegagalan destroy Cloudinary: respons tetap 200, dicatat [ORPHAN], dan masuk media_cleanup_queue", async () => {
    await reset();
    const n = await mkNews();
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const pid = v1.json.data.video.publicId;

    // Simulasikan Cloudinary destroy error
    cl.state.failDestroy = true;
    logs.length = 0;

    const del = await call("DELETE", `/api/admin/videos/news/${n.id}`);
    assert.equal(del.status, 200);

    // Log [ORPHAN] harus tercatat
    assert.ok(logs.some((l) => l.includes(`[ORPHAN] cloudinary:${pid}`)));

    // Antrean cleanup harus terisi
    assert.equal(db.media_cleanup_queue.length, 1);
    assert.equal(db.media_cleanup_queue[0].public_id, pid);
    assert.equal(db.media_cleanup_queue[0].resource_type, "video");
  });

  await test("destroy gagal DAN antrean DB gagal -> respons 200, [ORPHAN] mencatat gagal diantrekan (bukan dianggap sukses)", async () => {
    await reset();
    const n = await mkNews();
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const pid = v1.json.data.video.publicId;

    cl.state.failDestroy = true;
    faults.push({ table: "media_cleanup_queue", op: "insert", error: { code: "XX000", message: "antrean mati" } });
    logs.length = 0;

    const del = await call("DELETE", `/api/admin/videos/news/${n.id}`);
    assert.equal(del.status, 200, "kegagalan antrean tidak boleh mengubah respons sukses");
    assert.equal(db.media_cleanup_queue.length, 0, "tidak boleh ada baris antrean palsu");
    assert.ok(logs.some((l) => l.includes(`[ORPHAN] cloudinary:${pid}`)));
    assert.ok(logs.some((l) => l.includes(`cloudinary:${pid}`) && /gagal diantrekan/.test(l)));
  });

  await test("hapus BERITA yang punya video: baris media_videos dan aset Cloudinary ikut dibersihkan", async () => {
    await reset();
    const n = await mkNews();
    const other = await mkNews("published", "Berita Lain");
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const v2 = await call("POST", `/api/admin/videos/news/${other.id}`, {
      form: makeFormData(makeMp4(), "v2.mp4", "video/mp4"),
    });
    const pid = v1.json.data.video.publicId;
    const otherPid = v2.json.data.video.publicId;

    const del = await call("DELETE", `/api/admin/news/${n.id}`);
    assert.equal(del.status, 200);
    assert.ok(!cl.state.assets.has(pid));
    assert.equal(db.media_videos.filter((r) => r.record_id === n.id).length, 0);
    // Video berita lain tidak tersentuh
    assert.ok(cl.state.assets.has(otherPid));
    assert.equal(db.media_videos.filter((r) => r.record_id === other.id).length, 1);
  });

  await test("hapus berita saat destroy video gagal: respons tetap 200, [ORPHAN] dicatat, aset masuk antrean cleanup", async () => {
    await reset();
    const n = await mkNews();
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const pid = v1.json.data.video.publicId;
    cl.state.failDestroy = true;
    logs.length = 0;

    const del = await call("DELETE", `/api/admin/news/${n.id}`);
    assert.equal(del.status, 200);
    assert.ok(logs.some((l) => l.includes(`[ORPHAN] cloudinary:${pid}`)));
    assert.equal(db.media_cleanup_queue.length, 1);
    assert.equal(db.media_cleanup_queue[0].public_id, pid);
  });

  await test("hapus berita tanpa video tetap 200 dan tidak memanggil Cloudinary", async () => {
    await reset();
    const n = await mkNews();
    const before = cl.state.assets.size;
    const del = await call("DELETE", `/api/admin/news/${n.id}`);
    assert.equal(del.status, 200);
    assert.equal(cl.state.assets.size, before);
  });

  // =========================================================================
  console.log("\nE. Kompensasi Rollback & Penanganan Kegagalan");

  await test("DB gagal saat simpan video baru: aset Cloudinary baru langsung dihapus (kompensasi)", async () => {
    await reset();
    const n = await mkNews();
    faults.push({
      table: "media_videos",
      op: "insert",
      error: { code: "XX000", message: "db mati" },
    });

    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    assert.equal(r.status, 500);
    assert.equal(r.json.code, "DATABASE_ERROR");

    // Aset di Cloudinary harus segera dibersihkan
    assert.equal(cl.state.assets.size, 0);
    assert.equal(cl.state.destroys.length, 1);
  });

  await test("DB gagal saat membaca video (GET) -> 500 DATABASE_ERROR (bukan data kosong/404 palsu)", async () => {
    await reset();
    const n = await mkNews();
    faults.push({ table: "media_videos", op: "select", error: { code: "XX000", message: "db mati" } });
    const r = await call("GET", `/api/admin/videos/news/${n.id}`);
    assert.equal(r.status, 500);
    assert.equal(r.json.code, "DATABASE_ERROR");
  });

  await test("DB gagal saat DELETE -> 500 DATABASE_ERROR; aset Cloudinary TIDAK dihapus", async () => {
    await reset();
    const n = await mkNews();
    const v1 = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    const pid = v1.json.data.video.publicId;
    faults.push({ table: "media_videos", op: "delete", error: { code: "XX000", message: "db mati" } });
    const del = await call("DELETE", `/api/admin/videos/news/${n.id}`);
    assert.equal(del.status, 500);
    assert.equal(del.json.code, "DATABASE_ERROR");
    assert.ok(cl.state.assets.has(pid), "aset tidak boleh dihapus bila DB gagal");
    assert.equal(cl.state.destroys.length, 0);
  });

  await test("Cloudinary belum dikonfigurasi -> 503 STORAGE_NOT_CONFIGURED", async () => {
    await reset();
    const n = await mkNews();
    cl.state.configured = false;

    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    assert.equal(r.status, 503);
    assert.equal(r.json.code, "STORAGE_NOT_CONFIGURED");
  });

  const poisoned = (status, extra = {}) =>
    Object.assign(
      new Error(
        `Invalid credentials api_key=${FAKE_KEY} api_secret=${FAKE_SECRET} Authorization: Basic ${FAKE_BASIC}`
      ),
      { http_code: status, request: { headers: { Authorization: `Basic ${FAKE_BASIC}` } }, ...extra }
    );

  await test("upload video gagal (401, pesan memuat secret+key) -> 502 STORAGE_ERROR; DB utuh; TIDAK ada kredensial di log/respons", async () => {
    await reset();
    const n = await mkNews();
    logs.length = 0;
    cl.state.failUpload = poisoned(401);
    const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });
    assert.equal(r.status, 502);
    assert.equal(r.json.code, "STORAGE_ERROR");
    assert.equal(db.media_videos.length, 0);
    const line = logs.find((l) => l.startsWith("[STORAGE]"));
    assert.ok(line, `log [STORAGE] harus ada: ${JSON.stringify(logs)}`);
    assert.match(line, /kategori=auth http=401 kode=-/);
    assert.deepEqual(leaked(r.text), [], "respons");
    assert.deepEqual(leaked(logs.join("\n")), [], "log");
  });

  // =========================================================================
  console.log("\nF. API Publik (GET /api/videos/:module/:recordId)");

  await test("API publik: video berita published dapat diakses tanpa token", async () => {
    await reset();
    const n = await mkNews("published");
    const v = await call("POST", `/api/admin/videos/news/${n.id}`, {
      form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
    });

    const pub = await call("GET", `/api/videos/news/${n.id}`, { token: null });
    assert.equal(pub.status, 200, pub.text);
    const pv = pub.json.data.video;
    assert.equal(pv.recordId, n.id);
    assert.equal(pv.secureUrl, v.json.data.video.secureUrl);
    assert.equal(pv.thumbnailUrl, v.json.data.video.thumbnailUrl);

    // Pastikan tidak membocorkan field internal
    assert.equal(pv.uploadedBy, undefined);
    assert.equal(pv.publicId, undefined);
    assert.equal(pv.status, undefined);
  });

  await test("API publik: konten DRAFT mengembalikan 404 (tidak bocor)", async () => {
    await reset();
    const n = await mkNews("draft");
    // Masukkan video langsung ke DB untuk konten draft
    db.media_videos.push({
      id: "99999999-9999-4999-8999-999999999999",
      owner_module: "news",
      record_id: n.id,
      public_id: "universitas-lia/videos/news/x/draft-vid",
      secure_url: "https://res.cloudinary.com/demo-cloud/video/upload/draft.mp4",
      thumbnail_url: "https://res.cloudinary.com/demo-cloud/video/upload/so_auto/draft.jpg",
      status: "active",
      format: "mp4",
      bytes: 1000,
    });

    const pub = await call("GET", `/api/videos/news/${n.id}`, { token: null });
    assert.equal(pub.status, 404);
  });

  // =========================================================================
  console.log("\nG. Rate Limiting & Keamanan Log");

  await test("rate limiter upload video berlaku: hit ke-16 -> 429 TOO_MANY_VIDEO_UPLOADS", async () => {
    await reset();
    const n = await mkNews();
    let last;
    for (let i = 0; i < 16; i += 1) {
      last = await call("POST", `/api/admin/videos/news/${n.id}`, {
        form: new FormData(), // ditolak di awal namun tetap melewati limiter
      });
    }
    assert.equal(last.status, 429);
    assert.equal(last.json.code, "TOO_MANY_VIDEO_UPLOADS");
  });

  await test("kategori error provider video lain (network, timeout, rate limit, provider 5xx) tercatat aman", async () => {
    const cases = [
      [poisoned(undefined, { code: "ENOTFOUND" }), /kategori=network http=- kode=ENOTFOUND/],
      [poisoned(499, { name: "TimeoutError" }), /kategori=timeout http=499/],
      [poisoned(420), /kategori=rate_limit http=420/],
      [poisoned(503), /kategori=provider http=503/],
    ];
    for (const [err, expected] of cases) {
      await reset();
      const n = await mkNews();
      logs.length = 0;
      cl.state.failUpload = err;
      const r = await call("POST", `/api/admin/videos/news/${n.id}`, {
        form: makeFormData(makeMp4(), "v1.mp4", "video/mp4"),
      });
      assert.equal(r.status, 502);
      const line = logs.find((l) => l.startsWith("[STORAGE]"));
      assert.match(line || "", expected);
      assert.deepEqual(leaked(logs.join("\n") + r.text), []);
    }
  });

  await test("SELURUH log selama pengujian bebas dari API key, API secret, dan token rahasia", () => {
    assert.ok(allLogs.length > 0, "log harus terkumpul");
    const logStr = allLogs.join("\n");
    assert.deepEqual(leaked(logStr), []);
  });

  console.error = origError;
  console.warn = origWarn;
  if (server) await new Promise((r) => server.close(r));

  console.log(`\nHasil Pengujian Video Offline: ${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})();
