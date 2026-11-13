// Pengujian OFFLINE untuk migrasi provider terjemahan Gemini -> Groq.
//
//   node scripts/testTranslationGroq.js
//
// Cara kerja (tanpa internet, tanpa kuota, tanpa Supabase asli, tanpa memakai API key asli):
//   - Variabel env dipaksa ke nilai uji SEBELUM modul apa pun dimuat, jadi isi .env tidak dipakai.
//   - Groq asli diganti server HTTP tiruan di 127.0.0.1 (lewat GROQ_BASE_URL). SDK groq-sdk yang
//     SUNGGUHAN tetap dipakai, jadi header, body request, dan kelas error SDK ikut teruji.
//   - Supabase diganti database palsu di memori (meniru struktur tabel hasil pemeriksaan).
//
// Yang TIDAK dicakup (butuh akses sungguhan): panggilan ke api.groq.com asli (ketersediaan model,
// kualitas terjemahan, batas kuota riil) dan constraint/trigger database Supabase asli.

// ---------- Paksa env uji (dotenv tidak menimpa variabel yang sudah ada) ----------
const TEST_KEY = "gsk_TESTKEYNOTREAL1234567890abcdef";
const BASE_ENV = {
  NODE_ENV: "test",
  FRONTEND_URL: "http://localhost:3000",
  SUPABASE_URL: "https://example.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-not-real",
  JWT_SECRET: "t".repeat(48),
  TRANSLATION_PROVIDER: "groq",
  GROQ_API_KEY: TEST_KEY,
  GROQ_MODEL: "openai/gpt-oss-120b",
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
};
Object.assign(process.env, BASE_ENV);

const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");

// ---------- Harness ----------
// console dialihkan ke penampung supaya log aplikasi tidak memenuhi layar, dan supaya bisa
// diperiksa di akhir: API key TIDAK BOLEH muncul di log mana pun.
const allLogs = [];
const realConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error };
const collect = (...args) => allLogs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
const say = (text) => process.stdout.write(`${text}\n`);
const muteLogs = () => {
  console.info = collect;
  console.warn = collect;
  console.error = collect;
  console.log = collect;
};
const unmuteLogs = () => Object.assign(console, realConsole);
// Menjalankan fn sambil menangkap log miliknya sendiri.
const withLogs = async (fn) => {
  const start = allLogs.length;
  const result = await fn();
  return { result, logs: allLogs.slice(start) };
};

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    say(`  OK    ${name}`);
  } catch (error) {
    failed += 1;
    say(`  GAGAL ${name}\n        ${String(error.message).split("\n")[0]}`);
  }
};

const rejectsWith = async (promise, status, code) => {
  try {
    await promise;
  } catch (error) {
    assert.equal(error.statusCode, status, `status ${error.statusCode} != ${status} (${error.code})`);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail("seharusnya melempar error");
};

// ---------- Server Groq tiruan ----------
const mock = { requests: [], reply: null };
const sendJson = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};
const completion = (content, overrides = {}) => ({
  id: "chatcmpl-test",
  object: "chat.completion",
  created: 1,
  model: "openai/gpt-oss-120b",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: typeof content === "string" ? content : JSON.stringify(content) },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 },
  ...overrides,
});
// Menerjemahkan "palsu" yang menjaga tag, href, dan nama resmi: teks polos diberi awalan "EN: ";
// pada HTML, kata berhuruf pertama tiap node teks diberi awalan "EN-" (spasi di tepi node tetap terjaga).
const fakeTranslate = (kind, value) =>
  kind === "html"
    ? value.replace(/>([^<]+)</g, (m, text) => `>${text.replace(/[A-Za-z]\S*/, (word) => `EN-${word}`)}<`)
    : `EN: ${value}`;
const fieldsFromRequest = (json) => {
  const user = json.messages.find((m) => m.role === "user").content;
  return JSON.parse(user.slice(user.indexOf("{")));
};
const echoTranslator = (req, res, json) => {
  const out = {};
  for (const [name, { kind, value }] of Object.entries(fieldsFromRequest(json))) out[name] = fakeTranslate(kind, value);
  sendJson(res, 200, completion(out));
};
const startMock = () =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          /* bukan JSON */
        }
        mock.requests.push({ method: req.method, url: req.url, headers: req.headers, body: json });
        mock.reply(req, res, json);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
const resetMock = (reply = echoTranslator) => {
  mock.requests.length = 0;
  mock.reply = reply;
};

// ---------- Klien palsu (suntikan langsung, untuk pengujian unit service) ----------
const fakeClient = (impl) => {
  const calls = [];
  return {
    calls,
    chat: {
      completions: {
        create: async (args) => {
          calls.push(args);
          return impl(args);
        },
      },
    },
  };
};
const fakeSleep = () => {
  const delays = [];
  return { delays, sleep: async (ms) => void delays.push(ms) };
};

// ---------- Supabase palsu di memori ----------
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NEWS_ID = "11111111-1111-4111-8111-111111111111";
const db = { admins: [], news: [], announcements: [], content_translations: [] };

class FakeQuery {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.filters = [];
    this.payload = null;
    this.opts = null;
    this.mode = "many";
  }
  select() { return this; }
  eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
  in(col, arr) { this.filters.push((r) => arr.includes(r[col])); return this; }
  lte(col, val) { this.filters.push((r) => r[col] <= val); return this; }
  order() { return this; }
  limit() { return this; }
  range() { return this; }
  upsert(row, opts) { this.op = "upsert"; this.payload = row; this.opts = opts; return this; }
  delete() { this.op = "delete"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  run() {
    const rows = db[this.table];
    const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
    let result;
    if (this.op === "upsert") {
      const keys = this.opts.onConflict.split(",");
      const existing = rows.find((r) => keys.every((k) => r[k] === this.payload[k]));
      const now = new Date().toISOString();
      if (existing) Object.assign(existing, this.payload, { updated_at: now });
      else rows.push({ id: `tr-${rows.length + 1}`, created_at: now, updated_at: now, ...this.payload });
      result = [rows.find((r) => keys.every((k) => r[k] === this.payload[k]))];
    } else if (this.op === "delete") {
      result = match();
      db[this.table] = rows.filter((r) => !result.includes(r));
    } else {
      result = match();
    }
    if (this.mode === "many") return { data: result, count: result.length, error: null };
    if (this.mode === "maybe") return { data: result[0] ?? null, error: null };
    return result[0] ? { data: result[0], error: null } : { data: null, error: { message: "no rows" } };
  }
  then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }
}
const fakeSupabase = { from: (table) => new FakeQuery(table) };

const resetDb = () => {
  db.admins = [{ id: ADMIN_ID, name: "Admin Uji", email: "admin@example.invalid", is_active: true }];
  db.news = [
    {
      id: NEWS_ID,
      title: "Wisuda 2026 Universitas LIA",
      slug: "wisuda-2026",
      excerpt: "Ringkasan wisuda STIA LIA",
      content_html:
        '<p>Selamat kepada para wisudawan <a href="https://lia.example/info?a=1&b=2">Universitas LIA</a>.</p><ul><li>Edlink aktif</li></ul>',
      status: "published",
      published_at: "2026-01-01T00:00:00.000Z",
      cover_image_path: null,
      updated_at: "2026-01-02T00:00:00.000Z",
      author: { name: "Admin Uji" },
    },
  ];
  db.announcements = [];
  db.content_translations = [];
};

// ---------- Utilitas HTTP ----------
let appBase = "";
const request = async (method, url, { token, body } = {}) => {
  const res = await fetch(`${appBase}${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
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

// ---------- Proses anak (env berbeda per skenario) ----------
const runChild = (code, env = {}) =>
  spawnSync(process.execPath, ["-e", code], {
    cwd: ROOT,
    env: { ...process.env, ...BASE_ENV, ...env },
    encoding: "utf8",
    timeout: 30000,
  });

(async () => {
  muteLogs();

  // ===================================================================
  // Setup: server Groq tiruan + modul aplikasi
  // ===================================================================
  const mockServer = await startMock();
  process.env.GROQ_BASE_URL = `http://127.0.0.1:${mockServer.address().port}`;

  const supabasePath = require.resolve("../src/config/supabase.js");
  require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase };

  const Groq = require("groq-sdk");
  const jwt = require("jsonwebtoken");
  const env = require("../src/config/env");
  const { translateFields, isConfigured, SYSTEM_INSTRUCTION } = require("../src/services/groqTranslator");
  const provider = require("../src/services/translationProvider");
  const { signAdminToken } = require("../src/utils/token");
  const { saveTranslationSchema } = require("../src/validators/translationValidator");

  const sdkError = (status, message) => Groq.APIError.generate(status, { error: { message } }, message, new Headers());

  const ONE_FIELD = { title: { kind: "text", value: "Halo" } };
  const OK_CONTENT = JSON.stringify({ title: "Hi" });
  const okResponse = () => completion(OK_CONTENT);

  say("Konfigurasi");
  await test("env terbaca: provider groq, key & model terisi, isConfigured true", () => {
    assert.equal(env.translationProvider, "groq");
    assert.equal(env.groqModel, "openai/gpt-oss-120b");
    assert.equal(isConfigured(), true);
    assert.equal(provider.isConfigured(), true);
  });

  // ===================================================================
  // 1-3. Terjemahan berhasil, banyak field, HTML
  // ===================================================================
  say("1. Groq berhasil menerjemahkan teks");
  await test("teks diterjemahkan; hasil mengikuti model dari env", async () => {
    const client = fakeClient(() => completion({ title: "Graduation 2026" }));
    const out = await translateFields({ title: { kind: "text", value: "Wisuda 2026" } }, { client });
    assert.deepEqual(out, { targetLang: "en", model: "openai/gpt-oss-120b", translation: { title: "Graduation 2026" } });
  });

  await test("bentuk request: 1 panggilan, model env, json_schema strict, reasoning rendah, system prompt", async () => {
    const client = fakeClient(() => okResponse());
    await translateFields(
      { title: { kind: "text", value: "Halo" }, excerpt: { kind: "text", value: "   " } },
      { client }
    );
    assert.equal(client.calls.length, 1);
    const call = client.calls[0];
    assert.equal(call.model, "openai/gpt-oss-120b");
    assert.equal(call.response_format.type, "json_schema");
    assert.equal(call.response_format.json_schema.strict, true);
    assert.deepEqual(call.response_format.json_schema.schema.required, ["title"]);
    assert.equal(call.response_format.json_schema.schema.additionalProperties, false);
    assert.equal(call.reasoning_effort, "low");
    assert.equal(call.include_reasoning, false);
    assert.equal(call.messages[0].role, "system");
    assert.equal(call.messages[0].content, SYSTEM_INSTRUCTION);
    assert.ok(call.messages[1].content.includes("Halo"));
    assert.ok(!call.messages[1].content.includes("excerpt")); // field kosong tidak dikirim
  });

  await test("system prompt memuat semua nama resmi yang tidak boleh diterjemahkan", () => {
    for (const term of ["Universitas LIA", "STIA LIA", "SIAKAD UL", "Edlink", "LPPM", "LPM", "UKM", "PMB"]) {
      assert.ok(SYSTEM_INSTRUCTION.includes(term), `prompt tidak memuat ${term}`);
    }
    assert.ok(/untrusted DATA/.test(SYSTEM_INSTRUCTION));
  });

  await test("SDK asli -> server tiruan: path, header Authorization, body, dan hasil benar", async () => {
    resetMock();
    const out = await translateFields({ title: { kind: "text", value: "Wisuda 2026" } });
    assert.equal(out.translation.title, "EN: Wisuda 2026");
    assert.equal(mock.requests.length, 1);
    const req = mock.requests[0];
    assert.equal(req.method, "POST");
    assert.ok(req.url.endsWith("/chat/completions"), req.url);
    assert.equal(req.headers.authorization, `Bearer ${TEST_KEY}`);
    assert.equal(req.body.model, "openai/gpt-oss-120b");
    assert.equal(req.body.response_format.json_schema.strict, true);
  });

  say("2. Beberapa field sekaligus");
  await test("title + excerpt + contentHtml = satu panggilan API, semua field kembali", async () => {
    resetMock();
    const out = await translateFields({
      title: { kind: "text", value: "Wisuda Universitas LIA" },
      excerpt: { kind: "text", value: "Ringkasan acara" },
      contentHtml: { kind: "html", value: "<p>Acara <strong>wisuda</strong> dimulai.</p>" },
    });
    assert.equal(mock.requests.length, 1);
    assert.deepEqual(Object.keys(out.translation).sort(), ["contentHtml", "excerpt", "title"]);
    assert.equal(out.translation.title, "EN: Wisuda Universitas LIA");
    assert.deepEqual(mock.requests[0].body.response_format.json_schema.schema.required, ["title", "excerpt", "contentHtml"]);
  });

  say("3. HTML tetap mempertahankan struktur");
  const SRC_HTML =
    '<h2>Judul</h2><p>Kunjungi <a href="https://lia.example/a?x=1&y=2">situs Universitas LIA</a> sekarang.</p>' +
    "<ul><li>Satu</li><li>Dua</li></ul><blockquote>Kutipan</blockquote>";
  await test("tag, nesting, dan href sama persis dengan sumber", async () => {
    const out = await translateFields(
      { contentHtml: { kind: "html", value: SRC_HTML } },
      { client: fakeClient(() => completion({ contentHtml: fakeTranslate("html", SRC_HTML) })) }
    );
    const html = out.translation.contentHtml;
    assert.ok(html.includes('<a href="https://lia.example/a?x=1&amp;y=2" rel="noopener noreferrer">'));
    assert.deepEqual(html.match(/<\/?[a-z0-9]+/g), SRC_HTML_TAGS());
    assert.ok(html.includes("Universitas LIA"));
  });
  function SRC_HTML_TAGS() {
    return ["<h2", "</h2", "<p", "<a", "</a", "</p", "<ul", "<li", "</li", "<li", "</li", "</ul", "<blockquote", "</blockquote"];
  }

  await test("keluaran disanitasi: script, onclick, javascript: dibuang; teks polos tanpa tag", async () => {
    const client = fakeClient(() =>
      completion({
        title: "<b>Graduation</b> 2026",
        contentHtml: '<p onclick="x()">Hello <script>alert(1)</script><a href="javascript:alert(1)">bad</a></p>',
      })
    );
    const out = await translateFields(
      { title: { kind: "text", value: "Wisuda 2026" }, contentHtml: { kind: "html", value: '<p>Halo <a href="/x">bad</a></p>' } },
      { client }
    ).catch((e) => e);
    // href sumber (/x) hilang pada keluaran (javascript: dibuang) -> ditolak oleh pemeriksa struktur
    assert.equal(out.code, "TRANSLATION_STRUCTURE_MISMATCH");

    const safe = await translateFields(
      { title: { kind: "text", value: "Wisuda 2026" }, contentHtml: { kind: "html", value: "<p>Halo <b>x</b></p>" } },
      {
        client: fakeClient(() =>
          completion({
            title: "<b>Graduation</b> 2026",
            contentHtml: '<p onclick="x()">Hello <script>alert(1)</script><b>x</b></p>',
          })
        ),
      }
    );
    assert.equal(safe.translation.title, "Graduation 2026");
    assert.ok(!/script|onclick|javascript:/.test(safe.translation.contentHtml));
  });

  await test("href berubah / link hilang / tag tambahan / nesting berubah -> ditolak", async () => {
    const source = { contentHtml: { kind: "html", value: '<p>Lihat <a href="https://lia.example/a">tautan</a></p>' } };
    const bad = [
      '<p>See <a href="https://evil.example/a">link</a></p>', // href diganti
      "<p>See link</p>", // link hilang
      '<p>See <a href="https://lia.example/a">link</a></p><p>extra</p>', // paragraf tambahan
      '<p>See</p><a href="https://lia.example/a">link</a>', // nesting berubah
    ];
    for (const html of bad) {
      await rejectsWith(
        translateFields(source, { client: fakeClient(() => completion({ contentHtml: html })) }),
        502,
        "TRANSLATION_STRUCTURE_MISMATCH"
      );
    }
  });

  await test("<br> tambahan/hilang tidak dianggap perubahan struktur", async () => {
    const out = await translateFields(
      { contentHtml: { kind: "html", value: "<p>Baris satu<br>baris dua</p>" } },
      { client: fakeClient(() => completion({ contentHtml: "<p>Line one line two</p>" })) }
    );
    assert.equal(out.translation.contentHtml, "<p>Line one line two</p>");
  });

  await test("nama resmi tetap: berubah (mis. 'LIA University') ditolak, dipertahankan diterima", async () => {
    const source = { title: { kind: "text", value: "Wisuda Universitas LIA dan STIA LIA via Edlink" } };
    await rejectsWith(
      translateFields(source, { client: fakeClient(() => completion({ title: "Graduation of LIA University and STIA LIA via Edlink" })) }),
      502,
      "TRANSLATION_PROTECTED_TERM_CHANGED"
    );
    await rejectsWith(
      translateFields({ title: { kind: "text", value: "Info PMB dan UKM" } }, {
        client: fakeClient(() => completion({ title: "Info on new student admission and student activity units" })),
      }),
      502,
      "TRANSLATION_PROTECTED_TERM_CHANGED"
    );
    const ok = await translateFields(source, {
      client: fakeClient(() => completion({ title: "Graduation of Universitas LIA and STIA LIA via Edlink" })),
    });
    assert.equal(ok.translation.title, "Graduation of Universitas LIA and STIA LIA via Edlink");
  });

  await test("nama resmi di HTML antar-blok (<li>Edlink</li><li>PMB</li>) tetap diperiksa dengan benar", async () => {
    const source = { contentHtml: { kind: "html", value: "<ul><li>Edlink</li><li>PMB</li></ul>" } };
    await rejectsWith(
      translateFields(source, { client: fakeClient(() => completion({ contentHtml: "<ul><li>Edlink</li><li>Admissions</li></ul>" })) }),
      502,
      "TRANSLATION_PROTECTED_TERM_CHANGED"
    );
    const ok = await translateFields(source, {
      client: fakeClient(() => completion({ contentHtml: "<ul><li>Edlink</li><li>PMB</li></ul>" })),
    });
    assert.equal(ok.translation.contentHtml, "<ul><li>Edlink</li><li>PMB</li></ul>");
  });

  // ===================================================================
  // 4. Keluaran kosong / tidak valid
  // ===================================================================
  say("4. Keluaran kosong atau tidak valid ditolak");
  const badOutputs = [
    ["bukan JSON", () => completion("bukan json")],
    ["JSON array", () => completion("[]")],
    ["konten null", () => ({ ...okResponse(), choices: [{ index: 0, message: { role: "assistant", content: null }, finish_reason: "stop" }] })],
    ["choices kosong", () => ({ ...okResponse(), choices: [] })],
    ["respons kosong", () => ({})],
    ["field kosong", () => completion({ title: "   " })],
    ["field hilang", () => completion({})],
    ["field bukan string", () => completion({ title: 123 })],
    ["kosong setelah sanitasi", () => completion({ title: "<script>alert(1)</script>" })],
  ];
  for (const [label, build] of badOutputs) {
    await test(`${label} -> 502 TRANSLATION_BAD_RESPONSE`, async () => {
      await rejectsWith(translateFields(ONE_FIELD, { client: fakeClient(build) }), 502, "TRANSLATION_BAD_RESPONSE");
    });
  }
  await test("HTML tanpa teks (<p></p>) -> ditolak", async () => {
    await rejectsWith(
      translateFields({ contentHtml: { kind: "html", value: "<p>Halo</p>" } }, { client: fakeClient(() => completion({ contentHtml: "<p></p>" })) }),
      502,
      "TRANSLATION_BAD_RESPONSE"
    );
  });
  await test("field kedua hilang pada respons -> 502", async () => {
    await rejectsWith(
      translateFields(
        { title: { kind: "text", value: "Halo" }, excerpt: { kind: "text", value: "Ringkas" } },
        { client: fakeClient(() => completion({ title: "Hi" })) }
      ),
      502,
      "TRANSLATION_BAD_RESPONSE"
    );
  });
  await test("hasil terpotong (finish_reason=length) -> 422 TRANSLATION_TOO_LONG", async () => {
    const client = fakeClient(() => completion({ title: "Hi" }, { choices: [{ index: 0, message: { role: "assistant", content: '{"title":"H' }, finish_reason: "length" }] }));
    await rejectsWith(translateFields(ONE_FIELD, { client }), 422, "TRANSLATION_TOO_LONG");
  });
  await test("JSON dalam code fence (```json) tetap terbaca", async () => {
    const out = await translateFields(ONE_FIELD, { client: fakeClient(() => completion('```json\n{"title":"Hi"}\n```')) });
    assert.equal(out.translation.title, "Hi");
  });
  await test("semua field kosong -> 400 dan Groq tidak dipanggil", async () => {
    const client = fakeClient(() => okResponse());
    await rejectsWith(translateFields({ title: { kind: "text", value: "" } }, { client }), 400, "NOTHING_TO_TRANSLATE");
    assert.equal(client.calls.length, 0);
  });
  await test("bahasa tujuan tidak didukung -> 400, kind field tidak valid -> error programer", async () => {
    await rejectsWith(translateFields(ONE_FIELD, { targetLang: "fr", client: fakeClient(() => ({})) }), 400, "UNSUPPORTED_LANGUAGE");
    await assert.rejects(translateFields({ x: { kind: "markdown", value: "a" } }, { client: fakeClient(() => ({})) }), /kind field/);
  });

  // ===================================================================
  // 5-7. Error provider
  // ===================================================================
  say("5. API key tidak valid");
  await test("401 dari SDK asli -> 502 REJECTED, 1 panggilan, key tidak bocor di pesan maupun log", async () => {
    resetMock((req, res) => sendJson(res, 401, { error: { message: `Invalid API Key ${TEST_KEY}`, type: "invalid_request_error", code: "invalid_api_key" } }));
    const { result: error, logs } = await withLogs(() => rejectsWith(translateFields(ONE_FIELD, { sleep: fakeSleep().sleep }), 502, "TRANSLATION_PROVIDER_REJECTED"));
    assert.equal(mock.requests.length, 1);
    assert.ok(!error.message.includes(TEST_KEY) && !error.message.includes("gsk_"));
    assert.ok(error.message.includes("GROQ_API_KEY"));
    assert.ok(!logs.join("\n").includes(TEST_KEY), "key muncul di log");
    assert.ok(logs.join("\n").includes("[REDACTED]"));
  });
  for (const status of [400, 403, 404, 422]) {
    await test(`${status} (key/model ditolak) -> 502 REJECTED tanpa retry`, async () => {
      const client = fakeClient(() => {
        throw sdkError(status, `model_not_found ${TEST_KEY}`);
      });
      const { delays, sleep } = fakeSleep();
      const error = await rejectsWith(translateFields(ONE_FIELD, { client, sleep }), 502, "TRANSLATION_PROVIDER_REJECTED");
      assert.equal(client.calls.length, 1);
      assert.deepEqual(delays, []);
      assert.ok(!error.message.includes(TEST_KEY));
    });
  }
  await test("error mentah yang pesannya memuat key persis -> log disamarkan", async () => {
    const client = fakeClient(() => {
      throw new Error(`boom ${TEST_KEY} dan gsk_ANOTHERKEYVALUE12345678`);
    });
    const { logs } = await withLogs(() => rejectsWith(translateFields(ONE_FIELD, { client }), 502, "TRANSLATION_PROVIDER_ERROR"));
    const joined = logs.join("\n");
    assert.ok(!joined.includes(TEST_KEY) && !joined.includes("ANOTHERKEYVALUE"));
  });

  say("6. Rate limit / kuota habis");
  await test("429 dari SDK asli -> 429 QUOTA, tepat 1 request (tanpa retry SDK/fallback)", async () => {
    resetMock((req, res) => sendJson(res, 429, { error: { message: "Rate limit reached", type: "tokens", code: "rate_limit_exceeded" } }, { "retry-after": "1" }));
    const { delays, sleep } = fakeSleep();
    const error = await rejectsWith(translateFields(ONE_FIELD, { sleep }), 429, "TRANSLATION_QUOTA_EXCEEDED");
    assert.equal(mock.requests.length, 1);
    assert.deepEqual(delays, []);
    assert.ok(/tidak ada model berbayar/i.test(error.message));
  });
  await test("413 (permintaan melebihi batas token) -> 413 TOO_LARGE, tanpa retry", async () => {
    const client = fakeClient(() => {
      throw sdkError(413, "Request too large");
    });
    await rejectsWith(translateFields(ONE_FIELD, { client }), 413, "TRANSLATION_TOO_LARGE");
    assert.equal(client.calls.length, 1);
  });

  say("7. Provider timeout atau unavailable");
  await test("503 sekali lalu sukses -> 2 panggilan, jeda 1 detik", async () => {
    let n = 0;
    const client = fakeClient(() => {
      if (n++ < 1) throw sdkError(503, "Service Unavailable");
      return okResponse();
    });
    const { delays, sleep } = fakeSleep();
    const out = await translateFields(ONE_FIELD, { client, sleep });
    assert.equal(out.translation.title, "Hi");
    assert.equal(client.calls.length, 2);
    assert.deepEqual(delays, [1000]);
  });
  await test("503 dua kali lalu sukses -> 3 panggilan, jeda 1 lalu 2 detik, request identik", async () => {
    let n = 0;
    const client = fakeClient(() => {
      if (n++ < 2) throw sdkError(503, "Service Unavailable");
      return okResponse();
    });
    const { delays, sleep } = fakeSleep();
    await translateFields(ONE_FIELD, { client, sleep });
    assert.equal(client.calls.length, 3);
    assert.deepEqual(delays, [1000, 2000]);
    assert.deepEqual(client.calls[1], client.calls[0]); // tanpa pergantian model
    assert.deepEqual(client.calls[2], client.calls[0]);
  });
  await test("503 terus-menerus dari SDK asli -> tepat 3 request, lalu 502 BUSY tanpa detail internal", async () => {
    resetMock((req, res) => sendJson(res, 503, { error: { message: `overloaded ${TEST_KEY}`, type: "internal_server_error" } }));
    const { delays, sleep } = fakeSleep();
    const error = await rejectsWith(translateFields(ONE_FIELD, { sleep }), 502, "TRANSLATION_PROVIDER_BUSY");
    assert.equal(mock.requests.length, 3);
    assert.deepEqual(delays, [1000, 2000]);
    assert.ok(!error.message.includes("overloaded") && !error.message.includes(TEST_KEY));
  });
  await test("timeout (APIConnectionTimeoutError) -> 502 TIMEOUT, tanpa retry", async () => {
    const client = fakeClient(() => {
      throw new Groq.APIConnectionTimeoutError();
    });
    const { delays, sleep } = fakeSleep();
    await rejectsWith(translateFields(ONE_FIELD, { client, sleep }), 502, "TRANSLATION_PROVIDER_TIMEOUT");
    assert.equal(client.calls.length, 1);
    assert.deepEqual(delays, []);
  });
  await test("504 gateway timeout -> 502 TIMEOUT, tanpa retry", async () => {
    const client = fakeClient(() => {
      throw sdkError(504, "Gateway Timeout");
    });
    await rejectsWith(translateFields(ONE_FIELD, { client }), 502, "TRANSLATION_PROVIDER_TIMEOUT");
    assert.equal(client.calls.length, 1);
  });
  await test("timeout SDK asli (klien 150 ms vs server yang menggantung) -> 502 TIMEOUT, tanpa retry", async () => {
    resetMock(() => {}); // server menerima request tetapi tidak pernah menjawab
    const client = new Groq({ apiKey: TEST_KEY, baseURL: process.env.GROQ_BASE_URL, timeout: 150, maxRetries: 0 });
    const { delays, sleep } = fakeSleep();
    await rejectsWith(translateFields(ONE_FIELD, { client, sleep }), 502, "TRANSLATION_PROVIDER_TIMEOUT");
    assert.equal(mock.requests.length, 1);
    assert.deepEqual(delays, []);
  });
  await test("koneksi diputus server (SDK asli) -> 502 PROVIDER_ERROR, 1 request, tanpa retry", async () => {
    resetMock((req, res) => req.socket.destroy());
    const error = await rejectsWith(translateFields(ONE_FIELD, { sleep: fakeSleep().sleep }), 502, "TRANSLATION_PROVIDER_ERROR");
    assert.equal(mock.requests.length, 1);
    assert.equal(error.message, "Layanan terjemahan sedang tidak tersedia");
  });
  await test("500 -> 502 PROVIDER_ERROR, tidak di-retry", async () => {
    const client = fakeClient(() => {
      throw sdkError(500, "internal");
    });
    await rejectsWith(translateFields(ONE_FIELD, { client }), 502, "TRANSLATION_PROVIDER_ERROR");
    assert.equal(client.calls.length, 1);
  });
  await test("jeda bawaan (tanpa sleep suntikan) benar-benar menunggu ~1 detik", async () => {
    let n = 0;
    const client = fakeClient(() => {
      if (n++ < 1) throw sdkError(503, "Service Unavailable");
      return okResponse();
    });
    const started = Date.now();
    await translateFields(ONE_FIELD, { client });
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 900 && elapsed < 2500, `jeda ${elapsed} ms di luar perkiraan`);
  });

  // ===================================================================
  // Validator & fasad provider
  // ===================================================================
  say("Validator & fasad provider");
  const HASH = "a".repeat(64);
  await test("save menerima model Groq (ber-slash) dan model Gemini lama; menolak model aneh", () => {
    const base = { fields: { title: "Graduation" }, sourceHash: HASH };
    assert.ok(saveTranslationSchema.safeParse({ ...base, model: "openai/gpt-oss-120b" }).success);
    assert.ok(saveTranslationSchema.safeParse({ ...base, model: "gemini-3.6-flash" }).success);
    assert.ok(saveTranslationSchema.safeParse(base).success); // tanpa model = manual
    for (const model of ["x y", "../etc/passwd", "a".repeat(65), "model;drop", "/openai"]) {
      assert.ok(!saveTranslationSchema.safeParse({ ...base, model }).success, model);
    }
  });
  await test("label provider: gemini-* -> gemini, lainnya -> provider aktif (groq)", () => {
    assert.equal(provider.providerLabelForModel("gemini-3.6-flash"), "gemini");
    assert.equal(provider.providerLabelForModel("openai/gpt-oss-120b"), "groq");
  });

  say("Konfigurasi lewat proses terpisah");
  await test("GROQ_MODEL berformat salah membuat server menolak start (tanpa membocorkan key)", () => {
    const r = runChild('require("./src/config/env")', { GROQ_MODEL: "model bad!" });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("GROQ_MODEL"));
    assert.ok(!r.stderr.includes(TEST_KEY));
  });
  await test("TRANSLATION_PROVIDER tidak dikenal membuat server menolak start", () => {
    const r = runChild('require("./src/config/env")', { TRANSLATION_PROVIDER: "openai" });
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("TRANSLATION_PROVIDER"));
  });
  await test("GROQ_MODEL kosong -> 503 NOT_CONFIGURED, dan TIDAK pindah otomatis ke Gemini walau Gemini terisi", () => {
    const r = runChild(
      `const p = require("./src/services/translationProvider");
       console.log(p.isConfigured(), p.getNotConfiguredMessage());
       p.translateFields({ title: { kind: "text", value: "Halo" } }).catch((e) => console.log(e.statusCode, e.code));`,
      { GROQ_MODEL: "", GEMINI_API_KEY: "gemini-test-key", GEMINI_MODEL: "gemini-test-flash" }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes("false Layanan terjemahan belum dikonfigurasi (GROQ_API_KEY dan GROQ_MODEL)."));
    assert.ok(r.stdout.includes("503 TRANSLATION_NOT_CONFIGURED"));
  });
  await test("rollback eksplisit: TRANSLATION_PROVIDER=gemini memakai konfigurasi & layanan Gemini lama", () => {
    const r = runChild(
      `const p = require("./src/services/translationProvider");
       console.log(p.isConfigured(), p.getNotConfiguredMessage());`,
      { TRANSLATION_PROVIDER: "gemini", GEMINI_API_KEY: "gemini-test-key", GEMINI_MODEL: "gemini-test-flash" }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.startsWith("true "));
    assert.ok(r.stdout.includes("GEMINI_API_KEY dan GEMINI_MODEL"));
  });
  await test("model non-gpt-oss: schema best-effort (strict=false), tanpa parameter reasoning", () => {
    const r = runChild(
      `const { translateFields } = require("./src/services/groqTranslator");
       const client = { chat: { completions: { create: async (a) => { console.log(JSON.stringify({
         model: a.model, strict: a.response_format.json_schema.strict,
         hasReasoning: "reasoning_effort" in a || "include_reasoning" in a }));
         return { choices: [{ message: { content: '{"title":"Hi"}' }, finish_reason: "stop" }] }; } } } };
       translateFields({ title: { kind: "text", value: "Halo" } }, { client });`,
      { GROQ_MODEL: "qwen/qwen3.8-27b" }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout.trim().split("\n")[0]), { model: "qwen/qwen3.8-27b", strict: false, hasReasoning: false });
  });

  // ===================================================================
  // Error handler produksi
  // ===================================================================
  say("Error handler");
  await test("production: tidak ada stack trace / detail internal ke klien; AppError tetap tampil aman", () => {
    const r = runChild(
      `const handler = require("./src/middleware/errorHandler");
       const AppError = require("./src/utils/AppError");
       const run = (err) => { let out; const res = { headersSent: false, status(c) { out = { status: c }; return this; }, json(b) { out.body = b; } };
         console.error = () => {}; handler(err, { method: "POST", originalUrl: "/x" }, res, () => {}); return out; };
       const leaked = new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2 gsk_SECRETKEYVALUE12345");
       console.log(JSON.stringify({ internal: run(leaked), safe: run(new AppError("Pesan aman", 502, "KODE_AMAN")) }));`,
      { NODE_ENV: "production" }
    );
    assert.equal(r.status, 0, r.stderr);
    const { internal, safe } = JSON.parse(r.stdout.trim());
    assert.equal(internal.status, 500);
    assert.deepEqual(internal.body, { success: false, message: "Terjadi kesalahan pada server", code: "INTERNAL_ERROR" });
    assert.ok(!r.stdout.includes("ECONNREFUSED") && !r.stdout.includes("hunter2") && !r.stdout.includes("stack"));
    assert.deepEqual(safe, { status: 502, body: { success: false, message: "Pesan aman", code: "KODE_AMAN" } });
  });

  // ===================================================================
  // HTTP end-to-end: admin, approval, pengunjung
  // ===================================================================
  say("HTTP: autentikasi admin & akses pengunjung");
  const app = require("../app");
  const appServer = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  appBase = `http://127.0.0.1:${appServer.address().port}`;

  const adminToken = signAdminToken({ id: ADMIN_ID });
  const claims = { algorithm: "HS256", issuer: "universitas-lia-api", subject: ADMIN_ID, expiresIn: "1h" };
  const nonAdminToken = jwt.sign({ role: "user" }, env.jwtSecret, claims);
  const forgedToken = jwt.sign({ role: "admin" }, "secret-lain-yang-salah-0123456789abcdef", claims);

  const ENDPOINTS = [
    ["POST", "/api/admin/translations/preview", { entityType: "news", entityId: NEWS_ID }],
    ["GET", `/api/admin/translations/news/${NEWS_ID}`, undefined],
    ["PUT", `/api/admin/translations/news/${NEWS_ID}/en`, { fields: { title: "Graduation" }, sourceHash: HASH }],
    ["DELETE", `/api/admin/translations/news/${NEWS_ID}/en`, undefined],
  ];

  await test("10. pengunjung tanpa token -> 401 di SEMUA endpoint admin; Groq tidak dipanggil", async () => {
    resetDb();
    resetMock();
    for (const [method, url, body] of ENDPOINTS) {
      const r = await request(method, url, { body });
      assert.equal(r.status, 401, `${method} ${url}`);
      assert.equal(r.json.success, false);
    }
    assert.equal(mock.requests.length, 0);
  });
  await test("10. token palsu/tanda tangan salah -> 401; token non-admin -> 403; tidak ada panggilan Groq", async () => {
    resetMock();
    for (const [method, url, body] of ENDPOINTS) {
      assert.equal((await request(method, url, { token: "abc.def.ghi", body })).status, 401);
      assert.equal((await request(method, url, { token: forgedToken, body })).status, 401);
      assert.equal((await request(method, url, { token: nonAdminToken, body })).status, 403);
    }
    assert.equal(mock.requests.length, 0);
  });
  await test("10. admin non-aktif / tidak ada di database -> 401", async () => {
    resetMock();
    db.admins[0].is_active = false;
    assert.equal((await request("POST", ENDPOINTS[0][1], { token: adminToken, body: ENDPOINTS[0][2] })).status, 401);
    db.admins = [];
    assert.equal((await request("POST", ENDPOINTS[0][1], { token: adminToken, body: ENDPOINTS[0][2] })).status, 401);
    assert.equal(mock.requests.length, 0);
    resetDb();
  });

  say("HTTP: alur admin (preview -> approval -> simpan)");
  let preview;
  await test("8. admin preview (entityType+entityId) berhasil, TIDAK menyimpan apa pun", async () => {
    resetDb();
    resetMock();
    const r = await request("POST", "/api/admin/translations/preview", { token: adminToken, body: { entityType: "news", entityId: NEWS_ID } });
    assert.equal(r.status, 200, r.text);
    preview = r.json.data;
    assert.equal(r.json.success, true);
    assert.equal(preview.saved, false);
    assert.equal(preview.model, "openai/gpt-oss-120b");
    assert.equal(preview.targetLang, "en");
    assert.match(preview.sourceHash, /^[0-9a-f]{64}$/);
    assert.equal(preview.original.title, "Wisuda 2026 Universitas LIA");
    assert.equal(preview.translation.title, "EN: Wisuda 2026 Universitas LIA");
    assert.ok(preview.translation.contentHtml.includes('href="https://lia.example/info?a=1&amp;b=2"'));
    assert.equal(mock.requests.length, 1); // satu panggilan untuk tiga field
    assert.equal(db.content_translations.length, 0);
    assert.ok(!r.text.includes(TEST_KEY) && !r.text.includes("gsk_"));
  });
  await test("8. admin preview mode fields (teks bebas) berhasil", async () => {
    resetMock();
    const r = await request("POST", "/api/admin/translations/preview", {
      token: adminToken,
      body: { fields: { judul: { kind: "text", value: "Selamat datang di UKM" } } },
    });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.data.entity, null);
    assert.equal(r.json.data.translation.judul, "EN: Selamat datang di UKM");
    assert.equal(mock.requests.length, 1);
  });
  await test("9. approval: PUT menyimpan ke content_translations (provider groq:<model>, sudah disanitasi)", async () => {
    resetMock();
    const r = await request("PUT", `/api/admin/translations/news/${NEWS_ID}/en`, {
      token: adminToken,
      body: { fields: preview.translation, sourceHash: preview.sourceHash, model: preview.model },
    });
    assert.equal(r.status, 200, r.text);
    assert.equal(db.content_translations.length, 1);
    const row = db.content_translations[0];
    assert.equal(row.entity_type, "news");
    assert.equal(row.entity_id, NEWS_ID);
    assert.equal(row.lang, "en");
    assert.equal(row.provider, "groq:openai/gpt-oss-120b");
    assert.equal(row.source_hash, preview.sourceHash);
    assert.equal(row.fields.title, "EN: Wisuda 2026 Universitas LIA");
    assert.equal(mock.requests.length, 0); // menyimpan tidak memanggil AI
  });
  await test("9. approval ditolak: hash usang -> 409 (tidak menimpa), model aneh -> 400", async () => {
    const stale = await request("PUT", `/api/admin/translations/news/${NEWS_ID}/en`, {
      token: adminToken,
      body: { fields: { title: "Lain" }, sourceHash: "0".repeat(64), model: "openai/gpt-oss-120b" },
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.json.code, "SOURCE_CHANGED");
    const badModel = await request("PUT", `/api/admin/translations/news/${NEWS_ID}/en`, {
      token: adminToken,
      body: { fields: { title: "Lain" }, sourceHash: preview.sourceHash, model: "x y" },
    });
    assert.equal(badModel.status, 400);
    assert.equal(db.content_translations[0].fields.title, "EN: Wisuda 2026 Universitas LIA");
  });
  await test("9. admin dapat melihat daftar terjemahan tersimpan (stale=false)", async () => {
    const r = await request("GET", `/api/admin/translations/news/${NEWS_ID}`, { token: adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.items[0].lang, "en");
    assert.equal(r.json.data.items[0].stale, false);
    assert.equal(r.json.data.items[0].provider, "groq:openai/gpt-oss-120b");
  });

  say("HTTP: pengunjung memakai terjemahan tersimpan");
  await test("11. pengunjung GET /api/news/:slug?lang=en -> terjemahan tersimpan, TANPA memanggil Groq", async () => {
    resetMock();
    const r = await request("GET", "/api/news/wisuda-2026?lang=en");
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.data.lang, "en");
    assert.equal(r.json.data.news.title, "EN: Wisuda 2026 Universitas LIA");
    assert.equal(r.json.data.news.translated, true);
    assert.ok(r.json.data.news.contentHtml.startsWith("<p>EN-Selamat"));
    assert.equal(mock.requests.length, 0);
  });
  await test("11. daftar publik ?lang=en juga memakai terjemahan; tanpa ?lang tetap Indonesia", async () => {
    resetMock();
    const en = await request("GET", "/api/news?lang=en");
    assert.equal(en.status, 200, en.text);
    assert.equal(en.json.data.items[0].title, "EN: Wisuda 2026 Universitas LIA");
    const id = await request("GET", "/api/news/wisuda-2026");
    assert.equal(id.json.data.news.title, "Wisuda 2026 Universitas LIA");
    assert.equal("translated" in id.json.data.news, false);
    assert.equal(mock.requests.length, 0);
  });
  await test("11. sumber berubah (terjemahan usang) -> pengunjung otomatis mendapat versi Indonesia", async () => {
    db.news[0].title = "Wisuda 2026 Universitas LIA (revisi)";
    const r = await request("GET", "/api/news/wisuda-2026?lang=en");
    assert.equal(r.json.data.news.title, "Wisuda 2026 Universitas LIA (revisi)");
    assert.equal(r.json.data.news.translated, false);
    db.news[0].title = "Wisuda 2026 Universitas LIA";
  });
  await test("11. pengunjung tidak bisa memicu terjemahan lewat endpoint publik (parameter lang tidak memanggil AI)", async () => {
    resetMock();
    for (const url of ["/api/news?lang=en", "/api/news/latest?lang=en", "/api/news/wisuda-2026?lang=en"]) {
      assert.equal((await request("GET", url)).status, 200, url);
    }
    assert.equal(mock.requests.length, 0);
  });

  say("HTTP: kegagalan provider dilaporkan dengan aman");
  await test("Groq 429 saat preview -> HTTP 429 jelas, tanpa stack/key, tidak ada data tersimpan", async () => {
    const before = db.content_translations.length;
    resetMock((req, res) => sendJson(res, 429, { error: { message: `quota ${TEST_KEY}` } }));
    const r = await request("POST", "/api/admin/translations/preview", { token: adminToken, body: { entityType: "news", entityId: NEWS_ID } });
    assert.equal(r.status, 429);
    assert.equal(r.json.code, "TRANSLATION_QUOTA_EXCEEDED");
    assert.ok(!("stack" in r.json));
    assert.ok(!r.text.includes(TEST_KEY) && !r.text.includes("quota gsk"));
    assert.equal(db.content_translations.length, before);
  });
  await test("Groq mengembalikan sampah saat preview -> HTTP 502 TRANSLATION_BAD_RESPONSE", async () => {
    resetMock((req, res) => sendJson(res, 200, completion("bukan json sama sekali")));
    const r = await request("POST", "/api/admin/translations/preview", { token: adminToken, body: { entityType: "news", entityId: NEWS_ID } });
    assert.equal(r.status, 502);
    assert.equal(r.json.code, "TRANSLATION_BAD_RESPONSE");
    assert.ok(!r.text.includes("bukan json"));
  });

  // ===================================================================
  // Pemeriksaan akhir
  // ===================================================================
  say("Pemeriksaan akhir");
  await test("API key tidak muncul di log mana pun selama seluruh pengujian", () => {
    const joined = allLogs.join("\n");
    assert.ok(!joined.includes(TEST_KEY), "API key lengkap muncul di log");
    assert.ok(!/gsk_[A-Za-z0-9_-]{8,}/.test(joined.replace(/\[REDACTED\]/g, "")), "pola gsk_ muncul di log");
  });

  appServer.close();
  mockServer.close();
  unmuteLogs();
  say(`\nSelesai: ${passed} lulus, ${failed} gagal`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  unmuteLogs();
  console.error("Pengujian berhenti karena error tak terduga:", error);
  process.exit(1);
});
