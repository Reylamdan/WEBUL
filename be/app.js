// env.js harus dimuat paling awal: memuat .env dan memvalidasi variabel wajib
const env = require("./src/config/env");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const routes = require("./src/routes");
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
app.use(helmet());

app.use(
  cors({
    // Request tanpa header Origin (curl, Postman, server-ke-server) tetap diizinkan.
    // Request dari browser hanya diizinkan dari origin yang terdaftar di FRONTEND_URL.
    origin: (origin, callback) => {
      if (!origin || env.frontendOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Pembatas umum untuk seluruh /api (pembatas khusus login ditambahkan di Fase 1)
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Terlalu banyak request, coba lagi beberapa saat lagi",
      code: "TOO_MANY_REQUESTS",
    },
  })
);

// Cek apakah server berjalan
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Universitas LIA berjalan",
  });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

// Server hanya dijalankan jika file ini dieksekusi langsung (node app.js),
// sehingga app bisa di-require untuk pengujian tanpa membuka port.
if (require.main === module) {
  const server = app.listen(env.port, () => {
    console.log(`Server berjalan di http://localhost:${env.port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${env.port} sudah dipakai. Ubah PORT di .env atau hentikan proses lain.`);
    } else {
      console.error("Server gagal dijalankan:", error.message);
    }
    process.exit(1);
  });
}

module.exports = app;