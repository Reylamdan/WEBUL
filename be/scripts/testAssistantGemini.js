
const assert = require("node:assert/strict");

const {
  generateAssistantAnswer,
} = require("../src/services/assistantGeminiService");

let passed = 0;
let failed = 0;

const test = async (name, callback) => {
  try {
    await callback();
    passed++;
    console.log(`PASS - ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL - ${name}`);
    console.error(error.message);
  }
};

const createMockClient = (handler) => ({
  models: {
    generateContent: handler,
  },
});

const sources = [
  {
    type: "news",
    title: "Pengumuman Uji Coba Translation",
    content: "Universitas LIA sedang menguji sistem penerjemahan website.",
  },
];

const createResponse = (data) => ({
  text: JSON.stringify(data),
});

const successResponse = createResponse({
  answerable: true,
  answer: "Universitas LIA sedang menguji sistem penerjemahan website.",
  usedSourceIndexes: [0],
});

const main = async () => {
  console.log("\n=== GEMINI ASSISTANT SERVICE TEST ===\n");

  await test("Respons Gemini berhasil dengan indeks sumber", async () => {
    const client = createMockClient(async () => successResponse);

    const result = await generateAssistantAnswer({
      question: "Apa informasi terbaru?",
      sources,
      client,
    });

    assert.equal(result.answerable, true);
    assert.match(result.answer, /Universitas LIA/);
    assert.deepEqual(result.usedSourceIndexes, [0]);
    assert.ok(result.model);
  });

  await test("Prompt berisi pertanyaan dan indeks sumber", async () => {
    let capturedRequest;

    const client = createMockClient(async (request) => {
      capturedRequest = request;
      return successResponse;
    });

    await generateAssistantAnswer({
      question: "Apa informasi terbaru?",
      sources,
      client,
    });

    assert.match(capturedRequest.contents, /Apa informasi terbaru/);
    assert.match(capturedRequest.contents, /Pengumuman Uji Coba Translation/);
    assert.match(capturedRequest.contents, /source_index/);
    assert.equal(
      capturedRequest.config.responseMimeType,
      "application/json"
    );
    assert.ok(
      capturedRequest.config.responseSchema.properties.usedSourceIndexes
    );
  });

  await test("Riwayat percakapan diteruskan", async () => {
    let capturedRequest;

    const client = createMockClient(async (request) => {
      capturedRequest = request;
      return successResponse;
    });

    await generateAssistantAnswer({
      question: "Kapan kegiatan itu?",
      history: [
        { role: "user", content: "Ada informasi kegiatan?" },
        { role: "assistant", content: "Ada informasi kegiatan." },
      ],
      sources,
      client,
    });

    assert.match(capturedRequest.contents, /Kapan kegiatan itu/);
    assert.match(capturedRequest.contents, /Ada informasi kegiatan/);
  });

  await test("Pertanyaan kosong ditolak", async () => {
    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "   ",
          sources,
          client: createMockClient(async () => successResponse),
        }),
      (error) => error.code === "EMPTY_ASSISTANT_QUESTION"
    );
  });

  await test("Sumber kosong ditolak", async () => {
    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi Universitas LIA?",
          sources: [],
          client: createMockClient(async () => successResponse),
        }),
      (error) => error.code === "ASSISTANT_NO_SOURCES"
    );
  });

  await test("Respons Gemini tidak valid ditolak", async () => {
    const client = createMockClient(async () => ({
      text: "ini bukan JSON",
    }));

    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi terbaru?",
          sources,
          client,
        }),
      (error) => error.code === "ASSISTANT_BAD_RESPONSE"
    );
  });

  await test("Format JSON tidak lengkap ditolak", async () => {
    const client = createMockClient(async () => ({
      text: JSON.stringify({
        answerable: true,
        answer: "Informasi tersedia.",
      }),
    }));

    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi terbaru?",
          sources,
          client,
        }),
      (error) => error.code === "ASSISTANT_BAD_RESPONSE"
    );
  });

  await test("Indeks sumber di luar daftar ditolak", async () => {
    const client = createMockClient(async () =>
      createResponse({
        answerable: true,
        answer: "Informasi tersedia.",
        usedSourceIndexes: [5],
      })
    );

    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi terbaru?",
          sources,
          client,
        }),
      (error) => error.code === "ASSISTANT_INVALID_SOURCE_INDEX"
    );
  });

  await test("Indeks sumber duplikat ditolak", async () => {
    const client = createMockClient(async () =>
      createResponse({
        answerable: true,
        answer: "Informasi tersedia.",
        usedSourceIndexes: [0, 0],
      })
    );

    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi terbaru?",
          sources,
          client,
        }),
      (error) => error.code === "ASSISTANT_INVALID_SOURCE_INDEX"
    );
  });

  await test("Jawaban tanpa sumber pendukung ditolak", async () => {
    const client = createMockClient(async () =>
      createResponse({
        answerable: true,
        answer: "Informasi tersedia.",
        usedSourceIndexes: [],
      })
    );

    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi terbaru?",
          sources,
          client,
        }),
      (error) => error.code === "ASSISTANT_BAD_RESPONSE"
    );
  });

  await test("Tidak answerable dengan indeks sumber ditolak", async () => {
    const client = createMockClient(async () =>
      createResponse({
        answerable: false,
        answer: "Informasi belum tersedia.",
        usedSourceIndexes: [0],
      })
    );

    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi terbaru?",
          sources,
          client,
        }),
      (error) => error.code === "ASSISTANT_BAD_RESPONSE"
    );
  });

  await test("Tidak answerable dengan indeks kosong diterima", async () => {
    const client = createMockClient(async () =>
      createResponse({
        answerable: false,
        answer: "Informasi belum tersedia.",
        usedSourceIndexes: [],
      })
    );

    const result = await generateAssistantAnswer({
      question: "Apa informasi terbaru?",
      sources,
      client,
    });

    assert.equal(result.answerable, false);
    assert.deepEqual(result.usedSourceIndexes, []);
  });

  await test("Error 429 tidak di-retry", async () => {
    let calls = 0;

    const client = createMockClient(async () => {
      calls++;
      const error = new Error("Quota exceeded");
      error.status = 429;
      throw error;
    });

    await assert.rejects(
      () =>
        generateAssistantAnswer({
          question: "Apa informasi terbaru?",
          sources,
          client,
        }),
      (error) => error.code === "ASSISTANT_QUOTA_EXCEEDED"
    );

    assert.equal(calls, 1);
  });

  await test("Error 503 dicoba ulang dan berhasil", async () => {
    let calls = 0;
    const delays = [];

    const client = createMockClient(async () => {
      calls++;

      if (calls === 1) {
        const error = new Error("Unavailable");
        error.status = 503;
        throw error;
      }

      return successResponse;
    });

    const result = await generateAssistantAnswer({
      question: "Apa informasi terbaru?",
      sources,
      client,
      sleep: async (ms) => delays.push(ms),
    });

    assert.equal(result.answerable, true);
    assert.deepEqual(result.usedSourceIndexes, [0]);
    assert.equal(calls, 2);
    assert.deepEqual(delays, [1000]);
  });

  console.log("\n==================================");
  console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
  console.log("==================================\n");

  if (failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
