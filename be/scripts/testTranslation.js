// Pengujian OFFLINE untuk fitur terjemahan (tidak butuh Supabase, login admin, maupun internet).
// Klien Gemini diganti klien palsu, jadi tidak ada kuota yang terpakai.
//
//   node scripts/testTranslation.js
//
// Yang TIDAK dicakup di sini (butuh Supabase + Gemini asli): preview terhadap berita nyata dan
// panggilan ke Gemini sungguhan. Uji manual ada di README-BE-PEMASANGAN.md.

process.env.GEMINI_API_KEY = "test-key-not-real";
process.env.GEMINI_MODEL = "gemini-test-flash";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { translateFields, SYSTEM_INSTRUCTION } = require("../src/services/geminiTranslator");
const { previewSchema } = require("../src/validators/translationValidator");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  OK    ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  GAGAL ${name}\n        ${error.message}`);
  }
};

const fakeClient = (impl) => {
  const calls = [];
  return {
    calls,
    models: {
      generateContent: async (args) => {
        calls.push(args);
        return impl(args);
      },
    },
  };
};

const rejectsWith = async (promise, status, code) => {
  try {
    await promise;
  } catch (error) {
    assert.equal(error.statusCode, status, `status ${error.statusCode} != ${status}`);
    assert.equal(error.code, code);
    return;
  }
  assert.fail("seharusnya melempar error");
};

(async () => {
  console.log("Service translateFields");

  await test("hasil disanitasi (script dibuang, tag di teks polos dibuang)", async () => {
    const client = fakeClient(() => ({
      text: JSON.stringify({
        title: "<b>Graduation</b> 2026",
        contentHtml: '<p onclick="x()">Hello <script>alert(1)</script><a href="javascript:alert(1)">bad</a></p>',
      }),
    }));
    const out = await translateFields(
      { title: { kind: "text", value: "Wisuda 2026" }, contentHtml: { kind: "html", value: "<p>Halo</p>" } },
      { client }
    );
    assert.equal(out.translation.title, "Graduation 2026");
    assert.ok(!out.translation.contentHtml.includes("script"));
    assert.ok(!out.translation.contentHtml.includes("onclick"));
    assert.ok(!out.translation.contentHtml.includes("javascript:"));
    assert.equal(out.model, "gemini-test-flash");
  });

  await test("satu panggilan API, model dari env, JSON schema, field kosong tidak dikirim", async () => {
    const client = fakeClient(() => ({ text: JSON.stringify({ title: "Hi" }) }));
    await translateFields(
      { title: { kind: "text", value: "Halo" }, excerpt: { kind: "text", value: "   " } },
      { client }
    );
    assert.equal(client.calls.length, 1);
    const call = client.calls[0];
    assert.equal(call.model, "gemini-test-flash");
    assert.equal(call.config.responseMimeType, "application/json");
    assert.deepEqual(call.config.responseSchema.required, ["title"]);
    assert.equal(call.config.systemInstruction, SYSTEM_INSTRUCTION);
    assert.ok(call.contents.includes("Halo"));
    assert.ok(!call.contents.includes("excerpt"));
  });

  await test("kuota habis (429) -> error 429 jelas dan TIDAK ada panggilan kedua/fallback", async () => {
    const client = fakeClient(() => {
      const err = new Error("RESOURCE_EXHAUSTED");
      err.status = 429;
      throw err;
    });
    await rejectsWith(
      translateFields({ title: { kind: "text", value: "Halo" } }, { client }),
      429,
      "TRANSLATION_QUOTA_EXCEEDED"
    );
    assert.equal(client.calls.length, 1);
  });

  // ---- Retry untuk error sementara 503/UNAVAILABLE ----
  const providerError = (status, message) => {
    const err = new Error(message || "provider error");
    err.status = status;
    return err;
  };
  const OK_RESPONSE = { text: JSON.stringify({ title: "Hi" }) };
  const ONE_FIELD = { title: { kind: "text", value: "Halo" } };
  // Jeda palsu: mencatat durasi tanpa menunggu sungguhan.
  const fakeSleep = () => {
    const delays = [];
    const sleep = async (ms) => {
      delays.push(ms);
    };
    return { delays, sleep };
  };
  // Klien yang gagal sesuai urutan "failures", lalu sukses.
  const flakyClient = (failures) => {
    let n = 0;
    return fakeClient(() => {
      if (n < failures.length) throw failures[n++];
      return OK_RESPONSE;
    });
  };

  await test("503 sekali lalu sukses -> 2 panggilan, jeda 1 detik, hasil normal", async () => {
    const client = flakyClient([providerError(503, "high demand")]);
    const { delays, sleep } = fakeSleep();
    const out = await translateFields(ONE_FIELD, { client, sleep });
    assert.equal(out.translation.title, "Hi");
    assert.equal(client.calls.length, 2);
    assert.deepEqual(delays, [1000]);
  });

  await test("503 dua kali lalu sukses -> 3 panggilan, jeda 1 detik lalu 2 detik", async () => {
    const client = flakyClient([providerError(503), providerError(503)]);
    const { delays, sleep } = fakeSleep();
    const out = await translateFields(ONE_FIELD, { client, sleep });
    assert.equal(out.translation.title, "Hi");
    assert.equal(client.calls.length, 3);
    assert.deepEqual(delays, [1000, 2000]);
  });

  await test("503 terus-menerus -> tepat 3 percobaan, lalu pesan 'Gemini sibuk' (502, tanpa detail internal)", async () => {
    const client = fakeClient(() => {
      throw providerError(503, "The model is overloaded. UNAVAILABLE test-key-not-real");
    });
    const { delays, sleep } = fakeSleep();
    try {
      await translateFields(ONE_FIELD, { client, sleep });
      assert.fail("harus error");
    } catch (error) {
      assert.equal(error.statusCode, 502);
      assert.equal(error.code, "TRANSLATION_PROVIDER_BUSY");
      assert.equal(
        error.message,
        "Gemini sedang sibuk karena permintaan tinggi. Silakan coba lagi beberapa saat lagi."
      );
      assert.ok(!error.message.includes("test-key-not-real"));
      assert.ok(!error.message.includes("overloaded"));
    }
    assert.equal(client.calls.length, 3);
    assert.deepEqual(delays, [1000, 2000]);
  });

  await test("status teks UNAVAILABLE terus-menerus -> pesan 'Gemini sibuk' juga", async () => {
    const client = fakeClient(() => {
      throw providerError("UNAVAILABLE");
    });
    await rejectsWith(
      translateFields(ONE_FIELD, { client, sleep: fakeSleep().sleep }),
      502,
      "TRANSLATION_PROVIDER_BUSY"
    );
    assert.equal(client.calls.length, 3);
  });

  await test("504 -> pesan timeout yang berbeda, TIDAK di-retry, tanpa membocorkan key/detail", async () => {
    const client = fakeClient(() => {
      throw providerError(504, "DEADLINE_EXCEEDED test-key-not-real");
    });
    const { delays, sleep } = fakeSleep();
    try {
      await translateFields(ONE_FIELD, { client, sleep });
      assert.fail("harus error");
    } catch (error) {
      assert.equal(error.statusCode, 502);
      assert.equal(error.code, "TRANSLATION_PROVIDER_TIMEOUT");
      assert.equal(
        error.message,
        "Gemini terlalu lama merespons (batas waktu terlampaui). Silakan coba lagi beberapa saat lagi."
      );
      assert.ok(!error.message.includes("test-key-not-real"));
      assert.ok(!error.message.includes("DEADLINE"));
    }
    assert.equal(client.calls.length, 1);
    assert.deepEqual(delays, []);
  });

  await test("status teks UNAVAILABLE (tanpa kode numerik) juga di-retry", async () => {
    const client = flakyClient([providerError("UNAVAILABLE")]);
    const { delays, sleep } = fakeSleep();
    await translateFields(ONE_FIELD, { client, sleep });
    assert.equal(client.calls.length, 2);
    assert.deepEqual(delays, [1000]);
  });

  for (const [status, expectedStatus, expectedCode] of [
    [400, 502, "TRANSLATION_PROVIDER_REJECTED"],
    [401, 502, "TRANSLATION_PROVIDER_REJECTED"],
    [403, 502, "TRANSLATION_PROVIDER_REJECTED"],
    [404, 502, "TRANSLATION_PROVIDER_REJECTED"],
    [429, 429, "TRANSLATION_QUOTA_EXCEEDED"],
    [500, 502, "TRANSLATION_PROVIDER_ERROR"],
  ]) {
    await test(`error ${status} TIDAK di-retry (1 panggilan, tanpa jeda)`, async () => {
      const client = fakeClient(() => {
        throw providerError(status, "UNAVAILABLE bukan alasan retry untuk status ini");
      });
      const { delays, sleep } = fakeSleep();
      await rejectsWith(translateFields(ONE_FIELD, { client, sleep }), expectedStatus, expectedCode);
      assert.equal(client.calls.length, 1);
      assert.deepEqual(delays, []);
    });
  }

  await test("error jaringan tanpa status TIDAK di-retry", async () => {
    const client = fakeClient(() => {
      throw new Error("fetch failed");
    });
    const { delays, sleep } = fakeSleep();
    await rejectsWith(
      translateFields(ONE_FIELD, { client, sleep }),
      502,
      "TRANSLATION_PROVIDER_ERROR"
    );
    assert.equal(client.calls.length, 1);
    assert.deepEqual(delays, []);
  });

  await test("retry memakai model & konfigurasi yang sama pada setiap percobaan (tanpa fallback model)", async () => {
    const client = flakyClient([providerError(503), providerError(503)]);
    await translateFields(ONE_FIELD, { client, sleep: fakeSleep().sleep });
    assert.equal(client.calls.length, 3);
    for (const call of client.calls) {
      assert.equal(call.model, "gemini-test-flash");
      assert.deepEqual(call, client.calls[0]);
    }
  });

  await test("jeda bawaan (tanpa sleep suntikan) benar-benar menunggu sekitar 1 detik", async () => {
    const client = flakyClient([providerError(503)]);
    const started = Date.now();
    await translateFields(ONE_FIELD, { client });
    const elapsed = Date.now() - started;
    assert.equal(client.calls.length, 2);
    assert.ok(elapsed >= 900 && elapsed < 2500, `jeda ${elapsed} ms di luar perkiraan`);
  });

  await test("key/model ditolak (403) -> 502 tanpa membocorkan detail", async () => {
    const client = fakeClient(() => {
      const err = new Error("API key not valid: test-key-not-real");
      err.status = 403;
      throw err;
    });
    try {
      await translateFields({ title: { kind: "text", value: "Halo" } }, { client });
      assert.fail("harus error");
    } catch (error) {
      assert.equal(error.statusCode, 502);
      assert.equal(error.code, "TRANSLATION_PROVIDER_REJECTED");
      assert.ok(!error.message.includes("test-key-not-real"));
    }
  });

  await test("respons bukan JSON -> 502", async () => {
    const client = fakeClient(() => ({ text: "bukan json" }));
    await rejectsWith(
      translateFields({ title: { kind: "text", value: "Halo" } }, { client }),
      502,
      "TRANSLATION_BAD_RESPONSE"
    );
  });

  await test("field hilang pada respons -> 502", async () => {
    const client = fakeClient(() => ({ text: JSON.stringify({ title: "Hi" }) }));
    await rejectsWith(
      translateFields(
        { title: { kind: "text", value: "Halo" }, excerpt: { kind: "text", value: "Ringkas" } },
        { client }
      ),
      502,
      "TRANSLATION_BAD_RESPONSE"
    );
  });

  await test("semua field kosong -> 400 dan Gemini tidak dipanggil", async () => {
    const client = fakeClient(() => ({ text: "{}" }));
    await rejectsWith(
      translateFields({ title: { kind: "text", value: "" } }, { client }),
      400,
      "NOTHING_TO_TRANSLATE"
    );
    assert.equal(client.calls.length, 0);
  });

  await test("bahasa tujuan tidak didukung -> 400", async () => {
    await rejectsWith(
      translateFields({ title: { kind: "text", value: "Halo" } }, { targetLang: "fr", client: fakeClient(() => ({})) }),
      400,
      "UNSUPPORTED_LANGUAGE"
    );
  });

  console.log("Validator previewSchema");
  const UUID = "123e4567-e89b-42d3-a456-426614174000";

  await test("mode entity valid", () => {
    assert.ok(previewSchema.safeParse({ entityType: "news", entityId: UUID }).success);
  });
  await test("mode fields valid, targetLang default en", () => {
    const r = previewSchema.safeParse({ fields: { judul: { kind: "text", value: "Halo" } } });
    assert.ok(r.success);
    assert.equal(r.data.targetLang, "en");
  });
  await test("tanpa mode / dua mode sekaligus ditolak", () => {
    assert.ok(!previewSchema.safeParse({}).success);
    assert.ok(
      !previewSchema.safeParse({ entityType: "news", entityId: UUID, fields: { a: { kind: "text", value: "x" } } }).success
    );
  });
  await test("entityId bukan UUID / entityType asing / field asing ditolak", () => {
    assert.ok(!previewSchema.safeParse({ entityType: "news", entityId: "1" }).success);
    assert.ok(!previewSchema.safeParse({ entityType: "user", entityId: UUID }).success);
    assert.ok(!previewSchema.safeParse({ entityType: "news", entityId: UUID, hack: 1 }).success);
    assert.ok(!previewSchema.safeParse({ entityType: "news" }).success);
  });

  console.log("Konfigurasi env");
  await test("GEMINI_MODEL non-Flash (mis. pro) membuat server menolak start", () => {
    const result = spawnSync(process.execPath, ["-e", 'require("./src/config/env")'], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, GEMINI_MODEL: "gemini-3.1-pro" },
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("GEMINI_MODEL"));
    assert.ok(!result.stderr.includes("test-key-not-real"));
  });

  console.log("HTTP /api/admin/translations (tanpa Supabase)");
  const app = require("../app");
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/admin/translations/preview`;

  await test("tanpa token -> 401", async () => {
    const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(res.status, 401);
  });
  await test("token palsu -> 401", async () => {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer abc.def.ghi" },
      body: "{}",
    });
    assert.equal(res.status, 401);
  });
  await test("GET pada endpoint preview -> 404 (hanya POST)", async () => {
    const res = await fetch(base);
    assert.ok([401, 404].includes(res.status));
  });
  server.close();

  console.log(`\nSelesai: ${passed} lulus, ${failed} gagal`);
  process.exit(failed === 0 ? 0 : 1);
})();