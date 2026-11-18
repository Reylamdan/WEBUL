// Pengujian OFFLINE fitur Cara Pembayaran (/api/admin/payment-guide dan /api/payment-guide).
// Supabase diganti versi palsu di memori: TIDAK ada jaringan, kredensial, atau data asli tersentuh.
//
//   node scripts/testPaymentGuide.js

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
  db.payment_guide_settings = [];
  db.payment_va_steps = [];
  db.payment_channels = [];

  const app = loadFreshApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const TOKEN = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID, expiresIn: "1h" }
  );

  const call = async (method, url, { body, token = TOKEN } = {}) => {
    const headers = {};
    const isForm = body instanceof FormData;
    if (!isForm && body) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${base}${url}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, ok: res.ok, body: json };
  };

  console.log("\n--- Uji Publik Cara Pembayaran ---");
  await test("GET /api/payment-guide berhasil saat DB kosong (fallback 5 langkah SiAkad & 5 kanal)", async () => {
    const r = await call("GET", "/api/payment-guide", { token: null });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.settings.heroTitle, "Cara Pembayaran");
    assert.equal(r.body.data.vaSteps.length, 5);
    assert.equal(r.body.data.channels.length, 5);
    assert.equal(r.body.data.channels[0].channelId, "atm-mandiri");
  });

  console.log("\n--- Uji Autentikasi Admin Cara Pembayaran ---");
  await test("Endpoint admin menolak tanpa token", async () => {
    const r = await call("GET", "/api/admin/payment-guide/settings", { token: null });
    assert.equal(r.status, 401);
  });

  console.log("\n--- Uji Pengaturan Cara Pembayaran ---");
  await test("GET /api/admin/payment-guide/settings mengembalikan data pengaturan", async () => {
    const r = await call("GET", "/api/admin/payment-guide/settings");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroEyebrow, "INFORMASI PEMBAYARAN");
  });

  await test("PUT /api/admin/payment-guide/settings memperbarui teks & keterangan", async () => {
    const r = await call("PUT", "/api/admin/payment-guide/settings", {
      body: {
        heroTitle: "Panduan Lengkap Pembayaran Mahasiswa",
        methodsSectionTitle: "Pilihan Kanal Pembayaran Resmi",
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.settings.heroTitle, "Panduan Lengkap Pembayaran Mahasiswa");
    assert.equal(r.body.data.settings.methodsSectionTitle, "Pilihan Kanal Pembayaran Resmi");
  });

  console.log("\n--- Uji CRUD Langkah SiAkad (VA Steps) ---");
  let stepId = null;
  await test("POST /api/admin/payment-guide/va-steps menambah langkah baru", async () => {
    const r = await call("POST", "/api/admin/payment-guide/va-steps", {
      body: {
        title: "Periksa Notifikasi Email",
        description: "Salinan invoice dan nomor Virtual Account juga dikirimkan ke email terdaftar.",
        sortOrder: 6,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.step.title, "Periksa Notifikasi Email");
    stepId = r.body.data.step.id;
  });

  await test("GET & PATCH /api/admin/payment-guide/va-steps/:id", async () => {
    const r = await call("PATCH", `/api/admin/payment-guide/va-steps/${stepId}`, {
      body: { title: "Cek Notifikasi Email & SMS" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.step.title, "Cek Notifikasi Email & SMS");
  });

  await test("DELETE /api/admin/payment-guide/va-steps/:id", async () => {
    const r = await call("DELETE", `/api/admin/payment-guide/va-steps/${stepId}`);
    assert.equal(r.status, 200);
  });

  console.log("\n--- Uji CRUD Kanal Pembayaran (Channels) ---");
  let channelId = null;
  await test("POST /api/admin/payment-guide/channels menambah kanal baru", async () => {
    const r = await call("POST", "/api/admin/payment-guide/channels", {
      body: {
        channelId: "qris-edufin",
        name: "Pembayaran melalui QRIS EduFin",
        steps: [
          "Buka aplikasi mobile banking atau e-wallet (GoPay, OVO, Dana, ShopeePay).",
          "Pindai kode QRIS pada invoice SiAkad.",
          "Periksa nama penerima dan nominal tagihan.",
          "Konfirmasi pembayaran dengan PIN Anda.",
        ],
        note: "Transaksi QRIS diproses secara seketika (real-time).",
        sortOrder: 6,
        status: "published",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.channel.channelId, "qris-edufin");
    assert.equal(r.body.data.channel.steps.length, 4);
    channelId = r.body.data.channel.id;
  });

  await test("GET & PATCH /api/admin/payment-guide/channels/:id", async () => {
    const r = await call("PATCH", `/api/admin/payment-guide/channels/${channelId}`, {
      body: { name: "Pembayaran melalui QRIS Nasional (Semua Bank & E-Wallet)" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.channel.name, "Pembayaran melalui QRIS Nasional (Semua Bank & E-Wallet)");
  });

  await test("DELETE /api/admin/payment-guide/channels/:id", async () => {
    const r = await call("DELETE", `/api/admin/payment-guide/channels/${channelId}`);
    assert.equal(r.status, 200);
  });

  server.close();

  console.log(`\nHasil pengujian Cara Pembayaran: ${passed} lulus, ${failed} gagal.`);
  if (failed > 0) {
    if (logs.length > 0) console.log("Logs:", logs.slice(0, 10).join("\n"));
    process.exit(1);
  }
})();

