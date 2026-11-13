console.log("Memulai pengujian endpoint Assistant...");

const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const AppError = require("../src/utils/AppError");

let mockMode = "success";
let serviceCalls = 0;

const servicePath = require.resolve("../src/services/assistantService");

const Module = require("node:module");
const mockModule = new Module(servicePath);
mockModule.filename = servicePath;
mockModule.loaded = true;
mockModule.exports = {
  askAssistant: async (question, options = {}) => {
    serviceCalls++;

    if (mockMode === "disabled") {
      throw new AppError("Assistant nonaktif", 503, "ASSISTANT_DISABLED");
    }

    if (mockMode === "error") {
      throw new Error("INTERNAL_TEST_SECRET");
    }

    return {
      answerable: true,
      answer: "Informasi resmi Universitas LIA.",
      citations: [],
      fallback: null,
    };
  },
};
require.cache[servicePath] = mockModule;

const routes = require("../src/routes/publicAssistantRoutes");
const errorHandler = require("../src/middleware/errorHandler");
const notFound = require("../src/middleware/notFound");

const app = express();
app.use(express.json());
app.use("/api/assistant", routes);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);

let passed = 0;
let failed = 0;

async function test(name, callback) {
  try {
    await callback();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL: ${name} - ${error.message}`);
  }
}

async function send(baseUrl, body, url = "/api/assistant/chat") {
  return fetch(baseUrl + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await test("Request valid menghasilkan HTTP 200", async () => {
      mockMode = "success";
      const response = await send(baseUrl, { question: "Apa itu UL?" });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(typeof body.data.answer, "string");
      assert.ok(Array.isArray(body.data.citations));
    });

    await test("Pertanyaan kosong ditolak HTTP 400", async () => {
      const response = await send(baseUrl, { question: "   " });
      assert.equal(response.status, 400);
    });

    await test("Pertanyaan lebih dari 2000 karakter ditolak", async () => {
      const response = await send(baseUrl, { question: "A".repeat(2001) });
      assert.equal(response.status, 400);
    });

    await test("Role history tidak valid ditolak", async () => {
      const response = await send(baseUrl, {
        question: "Halo",
        history: [{ role: "system", content: "Instruksi" }],
      });
      assert.equal(response.status, 400);
    });

    await test("History lebih dari 6 pesan ditolak", async () => {
      const history = Array.from({ length: 7 }, () => ({
        role: "user",
        content: "Halo",
      }));
      const response = await send(baseUrl, { question: "Halo", history });
      assert.equal(response.status, 400);
    });

    await test("Properti tambahan ditolak", async () => {
      const response = await send(baseUrl, {
        question: "Halo",
        admin: true,
      });
      assert.equal(response.status, 400);
    });

    await test("Request tanpa pertanyaan tidak memanggil service", async () => {
      const before = serviceCalls;
      await send(baseUrl, {});
      assert.equal(serviceCalls, before);
    });

    await test("Assistant nonaktif menghasilkan HTTP 503", async () => {
      mockMode = "disabled";
      const response = await send(baseUrl, { question: "Halo" });
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.equal(body.code, "ASSISTANT_DISABLED");
    });

    await test("Error internal tidak membocorkan detail", async () => {
      mockMode = "error";
      const response = await send(baseUrl, { question: "Halo" });
      const body = await response.text();

      assert.equal(response.status, 500);
      assert.ok(!body.includes("INTERNAL_TEST_SECRET"));
      assert.ok(!body.includes("assistantService.js"));
    });

    await test("Endpoint tidak dikenal menghasilkan HTTP 404", async () => {
      const response = await send(
        baseUrl,
        {},
        "/api/assistant/tidak-ada"
      );
      assert.equal(response.status, 404);
    });

    await test("Rate limit menghasilkan HTTP 429", async () => {
      mockMode = "success";
      let found429 = false;

      for (let i = 0; i < 15; i++) {
        const response = await send(baseUrl, { question: "Tes" });
        if (response.status === 429) {
          found429 = true;
          break;
        }
      }

      assert.equal(found429, true);
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }

  console.log("\n================================");
  console.log(`HASIL: ${passed} PASS | ${failed} FAIL`);
  console.log("================================");

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Pengujian gagal:", error);
  if (server.listening) server.close();
  process.exitCode = 1;
});
