
const assert = require("node:assert/strict");

const {
  askAssistant,
  buildFallback,
} = require("../src/services/assistantService");

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
    console.error(`  ${error.message}`);
  }
};

const enabledSettings = {
  is_enabled: true,
  whatsapp_number: "0812345678910",
  whatsapp_message:
    "Informasi belum tersedia. Hubungi Customer Service Universitas LIA.",
};

const sampleSources = [
  {
    type: "news",
    id: "news-1",
    title: "Berita Universitas LIA",
    content: "Informasi resmi Universitas LIA.",
    slug: "berita-universitas-lia",
    publishedAt: "2026-11-11",
  },
  {
    type: "announcement",
    id: "announcement-1",
    title: "Pengumuman Universitas LIA",
    content: "Informasi pengumuman resmi.",
    slug: "pengumuman-universitas-lia",
    publishedAt: "2026-11-11",
  },
  {
    type: "academic_calendar",
    id: "calendar-1",
    title: "Kalender Akademik",
    content: "Informasi kalender akademik.",
  },
];

const mockBuildCitations = (sources) =>
  sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: `https://example.com/${source.id}`,
  }));

const run = async () => {
  console.log("\n=== ASSISTANT ORCHESTRATION TEST ===\n");

  await test("Chatbot nonaktif ditolak", async () => {
    await assert.rejects(
      () =>
        askAssistant("Apa itu Universitas LIA?", {
          dependencies: {
            getSettings: async () => ({
              ...enabledSettings,
              is_enabled: false,
            }),
          },
        }),
      (error) => error.statusCode === 503
    );
  });

  await test("Pertanyaan kosong ditolak", async () => {
    await assert.rejects(
      () =>
        askAssistant(" ", {
          dependencies: {
            getSettings: async () => enabledSettings,
          },
        })
    );
  });

  await test("Pertanyaan lebih dari 2000 karakter ditolak", async () => {
    await assert.rejects(
      () =>
        askAssistant("a".repeat(2001), {
          dependencies: {
            getSettings: async () => enabledSettings,
          },
        })
    );
  });

  await test("Tidak ada sumber menghasilkan fallback WhatsApp", async () => {
    let geminiCalled = false;

    const result = await askAssistant(
      "Apa informasi pendaftaran?",
      {
        dependencies: {
          getSettings: async () => enabledSettings,
          retrieveSources: async () => [],
          generateAnswer: async () => {
            geminiCalled = true;
          },
        },
      }
    );

    assert.equal(result.answerable, false);
    assert.equal(result.answer, null);
    assert.equal(result.citations.length, 0);
    assert.equal(result.fallback.type, "whatsapp");
    assert.ok(result.fallback.url.includes("wa.me/62812345678910"));
    assert.equal(geminiCalled, false);
  });

  await test("Jawaban Gemini berhasil disertai sitasi", async () => {
    let receivedSources = null;

    const result = await askAssistant(
      "Apa itu Universitas LIA?",
      {
        dependencies: {
          getSettings: async () => enabledSettings,
          retrieveSources: async () => sampleSources,
          generateAnswer: async ({ question, sources }) => {
            assert.equal(question, "Apa itu Universitas LIA?");
            receivedSources = sources;

            return {
              answerable: true,
              answer: "Universitas LIA adalah perguruan tinggi.",
              usedSourceIndexes: [0],
            };
          },
          buildCitations: mockBuildCitations,
        },
      }
    );

    assert.equal(receivedSources, sampleSources);
    assert.equal(result.answerable, true);
    assert.equal(
      result.answer,
      "Universitas LIA adalah perguruan tinggi."
    );
    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].id, "news-1");
    assert.equal(result.fallback, null);
  });

  await test("Hanya sumber pilihan Gemini menjadi sitasi", async () => {
    let citationSources = null;

    const result = await askAssistant(
      "Apa informasi resmi yang tersedia?",
      {
        dependencies: {
          getSettings: async () => enabledSettings,
          retrieveSources: async () => sampleSources,
          generateAnswer: async () => ({
            answerable: true,
            answer: "Informasi didukung dua sumber.",
            usedSourceIndexes: [0, 2],
          }),
          buildCitations: (sources) => {
            citationSources = sources;
            return mockBuildCitations(sources);
          },
        },
      }
    );

    assert.deepEqual(
      citationSources.map((source) => source.id),
      ["news-1", "calendar-1"]
    );

    assert.deepEqual(
      result.citations.map((citation) => citation.id),
      ["news-1", "calendar-1"]
    );

    assert.equal(result.citations.length, 2);
  });

  await test("Gemini tidak yakin menghasilkan fallback", async () => {
    const result = await askAssistant(
      "Pertanyaan yang belum cukup didukung sumber",
      {
        dependencies: {
          getSettings: async () => enabledSettings,
          retrieveSources: async () => sampleSources,
          generateAnswer: async () => ({
            answerable: false,
            answer: "",
            usedSourceIndexes: [],
          }),
        },
      }
    );

    assert.equal(result.answerable, false);
    assert.equal(result.answer, null);
    assert.equal(result.citations.length, 0);
    assert.ok(result.fallback.url);
  });

  await test("Fallback tetap tersedia tanpa nomor WhatsApp", async () => {
    const fallback = buildFallback(
      {
        whatsapp_number: null,
        whatsapp_message: "Silakan hubungi Customer Service.",
      },
      "Bagaimana cara mendaftar?"
    );

    assert.equal(fallback.type, "whatsapp");
    assert.equal(fallback.message, "Silakan hubungi Customer Service.");
    assert.equal(fallback.url, null);
  });

  await test("Riwayat percakapan diteruskan ke Gemini", async () => {
    const history = [
      { role: "user", content: "Halo" },
      { role: "assistant", content: "Halo, ada yang bisa dibantu?" },
    ];

    let receivedHistory = null;

    await askAssistant("Apa itu LIA?", {
      history,
      dependencies: {
        getSettings: async () => enabledSettings,
        retrieveSources: async () => sampleSources,
        generateAnswer: async ({ history: received }) => {
          receivedHistory = received;

          return {
            answerable: true,
            answer: "Informasi resmi.",
            usedSourceIndexes: [0],
          };
        },
      },
    });

    assert.equal(receivedHistory, history);
  });

  await test("Gangguan retrieval diteruskan sebagai error teknis", async () => {
    await assert.rejects(
      () =>
        askAssistant("Apa itu LIA?", {
          dependencies: {
            getSettings: async () => enabledSettings,
            retrieveSources: async () => {
              throw new Error("Database unavailable");
            },
          },
        }),
      /Database unavailable/
    );
  });

  console.log("\n==================================");
  console.log(`HASIL: ${passed} PASS, ${failed} FAIL`);
  console.log("==================================\n");

  if (failed > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("\nTEST SCRIPT ERROR:", error);
  process.exitCode = 1;
});
