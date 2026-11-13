// Pengujian OFFLINE aturan pemaketan (T0).
// Tidak menyentuh file proyek asli: semua sampel dibuat di folder temp.
//
//   node scripts/testPackaging.js

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { classifyPath, isExcluded } = require("./lib/packageRules");
const { createPackage, listZipEntries } = require("./packageReview");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  OK    ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  GAGAL ${name}\n        ${String(error.message).split("\n").slice(0, 5).join("\n        ")}`);
  }
};

const write = (root, relative, content = "") => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

(async () => {
  console.log("=== Pengujian Pemaketan Aman (OFFLINE) ===");

  console.log("\nA. Aturan path");
  await test(".env dan turunannya dikecualikan, .env.example diizinkan", () => {
    for (const name of [".env", ".env.local", ".env.production", "config/.env.test", "nested/.env"]) {
      assert.equal(isExcluded(name), true, name);
    }
    assert.equal(isExcluded(".env.example"), false);
    assert.equal(isExcluded("config/.env.example"), false);
  });

  await test("kunci privat, kredensial, arsip, dan folder dependensi dikecualikan", () => {
    for (const name of [
      "certs/server.pem",
      "private.key",
      "keystore.p12",
      "credentials.json",
      "service-account.json",
      "google-credentials.json",
      ".npmrc",
      "id_rsa",
      "node_modules/pkg/index.js",
      ".git/config",
      "dist/lama.zip",
      "hasil.zip",
      ".DS_Store",
      "npm-debug.log",
    ]) {
      assert.equal(isExcluded(name), true, name);
    }
  });

  await test("file proyek normal tetap disertakan", () => {
    for (const name of ["app.js", "src/config/env.js", "scripts/lib/fakeSupabase.js", "README-PEMASANGAN.md", ".gitignore"]) {
      assert.equal(isExcluded(name), false, name);
      assert.equal(classifyPath(name).excluded, false, name);
    }
  });

  console.log("\nB. Paket nyata (folder temp)");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lia-package-test-"));
  const output = path.join(root, "dist", "hasil-uji.zip");
  const SECRET_VALUE = "NILAI-RAHASIA-TIDAK-BOLEH-MASUK-ZIP-12345";
  try {
    write(root, ".env", `SUPABASE_SERVICE_ROLE_KEY=${SECRET_VALUE}\n`);
    write(root, ".env.local", `CLOUDINARY_API_SECRET=${SECRET_VALUE}\n`);
    write(root, ".env.production", `JWT_SECRET=${SECRET_VALUE}\n`);
    write(root, ".env.example", "SUPABASE_URL=\nCLOUDINARY_API_SECRET=\n");
    write(root, "src/app.js", "console.log('ok');\n");
    write(root, "src/config/env.js", "module.exports = {};\n");
    write(root, "scripts/secret-helper.js", "// aman\n");
    write(root, "credentials.json", JSON.stringify({ key: SECRET_VALUE }));
    write(root, "service-account.json", JSON.stringify({ key: SECRET_VALUE }));
    write(root, "certs/server.pem", SECRET_VALUE);
    write(root, "node_modules/pkg/index.js", SECRET_VALUE);
    write(root, ".git/config", SECRET_VALUE);
    write(root, "README-PEMASANGAN.md", "# Panduan\n");
    write(root, ".gitignore", ".env\n");

    const dryRun = createPackage({ root, output, dryRun: true });
    await test("dry-run melaporkan file rahasia yang dikecualikan tanpa membuat ZIP", () => {
      assert.equal(fs.existsSync(output), false);
      for (const name of [".env", ".env.local", "credentials.json", "certs/server.pem", "node_modules/pkg/index.js"]) {
        assert.equal(dryRun.names.includes(name), false, name);
      }
      assert.ok(dryRun.names.includes(".env.example"));
      assert.ok(!dryRun.names.some((name) => name.startsWith("dist/")));
    });

    const result = createPackage({ root, output });
    const names = listZipEntries(fs.readFileSync(output));
    const raw = fs.readFileSync(output);

    await test("ZIP dibuat dan hanya berisi file yang diizinkan", () => {
      assert.equal(fs.existsSync(output), true);
      assert.deepEqual([...names].sort(), [...result.names].sort());
      for (const name of [".env", ".env.local", ".env.production", "credentials.json", "service-account.json", "certs/server.pem", "node_modules/pkg/index.js", ".git/config"]) {
        assert.equal(names.includes(name), false, name);
      }
      assert.ok(names.includes(".env.example"), "contoh env harus disertakan");
      assert.ok(names.includes("src/app.js"));
      assert.ok(names.includes("README-PEMASANGAN.md"));
    });

    await test("isi nilai rahasia tidak muncul di byte ZIP", () => {
      assert.equal(raw.includes(Buffer.from(SECRET_VALUE)), false, "nilai rahasia bocor ke ZIP");
    });

    await test("verifikasi ulang menolak ZIP yang disisipi .env", () => {
      const { verifyEntries } = require("./packageReview");
      const problems = verifyEntries([".env", ".env.example", "app.js"], { output });
      assert.ok(problems.some((problem) => problem.includes(".env")));
    });

    await test("file .env tidak pernah tercetak oleh ringkasan (hanya nama, bukan nilai)", () => {
      assert.ok(!JSON.stringify(result).includes(SECRET_VALUE));
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log(`\nHasil Pengujian Packaging: ${passed} lulus, ${failed} gagal`);
  process.exit(failed === 0 ? 0 : 1);
})();
