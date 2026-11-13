const supabase = require("../config/supabase");
const { throwDbError } = require("../utils/dbError");
const { cleanSearchTerm } = require("../utils/searchTerm");
const { getToday, computeExpiryStatus } = require("../utils/accreditationExpiry");

// Batas kandidat per query. Hasil akhir tetap dipotong ke MAX_FINAL_RESULTS setelah diranking.
const MAX_RESULTS_PER_SOURCE = 30;
// Knowledge dikurasi admin dan jumlahnya kecil, jadi indeks ringannya (tanpa content) dibaca
// sekaligus lalu dicocokkan di aplikasi. Jika tabel melebihi batas ini, ada peringatan di log.
const KNOWLEDGE_INDEX_LIMIT = 500;
const MAX_KEYWORDS = 8;
const MAX_CONTENT_LENGTH = 5000;
// Teks yang dipakai untuk menghitung relevansi (sebelum dipotong), supaya kata kunci di bagian
// akhir dokumen panjang tetap dihitung walau isi yang dikirim ke Gemini dipotong.
const SCORE_TEXT_LIMIT = 50_000;
// Batas masukan mentah sebelum dibersihkan (melindungi dari HTML raksasa/patologis); kelebihannya
// dianggap terpotong dan diberi penanda.
const RAW_INPUT_LIMIT = 300_000;
const MIN_RELEVANCE_SCORE = 3;
const MAX_FINAL_RESULTS = 12;

// Pertanyaan umum akreditasi tanpa nama spesifik hanya mengambil sedikit data terbaru.
const GENERIC_INSTITUTION_LIMIT = 5;
const GENERIC_PROGRAM_LIMIT = MAX_FINAL_RESULTS;
// Data akreditasi resmi diprioritaskan di atas berita/pengumuman saat pertanyaannya soal akreditasi.
const ACCREDITATION_INTENT_BOOST = 10;

// Harus sama persis dengan penanda di assistantGeminiService (dijaga oleh pengujian).
const TRUNCATION_MARKER =
  "[KONTEN DIPOTONG: bagian akhir sumber ini tidak disertakan, sehingga informasinya mungkin tidak lengkap.]";

const STOP_WORDS = new Set([
  "apa", "siapa", "kapan", "dimana", "bagaimana",
  "mengapa", "apakah", "yang", "dan", "atau",
  "di", "ke", "dari", "untuk", "dengan", "pada",
  "ini", "itu", "saya", "kami", "anda", "tolong",
  "informasi", "tentang", "mengenai", "jelaskan",
  "universitas", "lia", "universitaslia",
  "ada", "bisa", "cara", "mohon", "ya",
  "berapa", "adalah", "akan", "sudah", "belum", "dapat",
  "harus", "sebagai", "dalam", "kepada", "oleh", "saat",
  "jika", "kalau", "karena", "agar", "juga", "mana",
  "lagi", "masih", "hanya", "sangat", "dong", "sih", "nih",
]);

// Istilah akademik dua karakter yang bermakna (S1, S2, S3, D3, D4) tidak boleh terbuang.
const SHORT_ACADEMIC_TERM = /^\p{L}\d$/u;

// Akhiran -nya dan -kah dilepas ("wisudanya" -> "wisuda"). Akhiran lain (-lah, -pun, -an) sengaja
// tidak diproses karena terlalu sering merusak kata dasar ("sekolah", "kampun").
const stripParticleSuffix = (word) => {
  for (const suffix of ["nya", "kah"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
};

const trimHyphens = (word) => word.replace(/^-+|-+$/g, "");

// Hasil hanya berisi huruf, angka, dan tanda hubung, sehingga aman dimasukkan ke filter .or() PostgREST.
const extractKeywords = (question) => {
  const cleaned = cleanSearchTerm(question)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ");

  return [
    ...new Set(
      cleaned
        .split(/\s+/)
        .map(trimHyphens)
        .filter((word) => word && !STOP_WORDS.has(word))
        .map((word) => trimHyphens(stripParticleSuffix(word)))
        .filter(
          (word) =>
            /[\p{L}\p{N}]/u.test(word) &&
            (word.length >= 3 || SHORT_ACADEMIC_TERM.test(word)) &&
            !STOP_WORDS.has(word)
        )
    ),
  ].slice(0, MAX_KEYWORDS);
};

const buildSearchFilter = (columns, keywords) => {
  const filters = [];

  for (const keyword of keywords) {
    for (const column of columns) {
      filters.push(`${column}.ilike.%${keyword}%`);
    }
  }

  return filters.join(",");
};

// ---------------------------------------------------------------------
// Pembersihan teks sumber -> teks polos aman untuk prompt.
// Urutan: (1) buang karakter tersembunyi, (2) buang komentar/CDATA, (3) buang elemen yang isinya tidak
// tampil (script, style, iframe, ... termasuk yang TIDAK ditutup), (4) buang tag (atribut ber-">"
// ditangani), (5) dekode entitas SATU kali, (6) buang karakter tersembunyi hasil dekode.
// Salinan perilaku stripHiddenChars yang identik ada di assistantGeminiService (diuji).
// ---------------------------------------------------------------------
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const HIDDEN_FORMAT_CHARS =
  /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ￹-￻\u{E0000}-\u{E0FFF}]/gu;

const stripHiddenChars = (value) =>
  String(value ?? "")
    .replace(HIDDEN_FORMAT_CHARS, "")
    .replace(CONTROL_CHARS, " ");

const TAG_BODY = `(?:"[^"]*"|'[^']*'|[^'"<>])*`;
const RAW_TEXT_ELEMENTS = "script|style|iframe|noscript|template|noembed|noframes|xmp";
const RAW_TEXT_BLOCK = new RegExp(
  `<(${RAW_TEXT_ELEMENTS})\\b${TAG_BODY}>[\\s\\S]*?(?:<\\/\\1\\s*>|$)`,
  "gi"
);
const RAW_TEXT_OPEN_AT_END = new RegExp(`<(?:${RAW_TEXT_ELEMENTS})\\b[^>]*$`, "gi");
const ANY_TAG = new RegExp(`<\\/?([a-z][a-z0-9:-]*)${TAG_BODY}>`, "gi");
// Tag inline dibuang tanpa spasi agar "<strong>Rp</strong>5.000" tidak menjadi "Rp 5.000".
const INLINE_TAGS = new Set([
  "a", "b", "i", "u", "em", "strong", "span", "small", "mark", "font", "sub", "sup", "abbr", "cite", "code",
]);

const NAMED_ENTITIES = {
  nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", amp: "&",
  ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", middot: "·", bull: "•",
  copy: "©", reg: "®", trade: "™", times: "×",
  deg: "°", plusmn: "±", frac12: "½",
};

// Satu kali jalan: "&amp;lt;" menjadi "&lt;" (teks biasa), bukan "<".
const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,9});/gi, (match, body) => {
    if (body[0] === "#") {
      const code =
        body[1].toLowerCase() === "x"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);

      if (!Number.isInteger(code) || code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
        return " ";
      }

      return String.fromCodePoint(code);
    }

    const replacement = NAMED_ENTITIES[body.toLowerCase()];
    return replacement === undefined ? match : replacement;
  });

// Tautan dipertahankan sebagai teks "label (URL)" agar URL resmi di dalam artikel tidak hilang saat tag
// dibuang (dan agar jawaban yang mengutipnya bisa diverifikasi). Hanya http(s), mailto, dan tel.
const ANCHOR = new RegExp(`<a\\b(${TAG_BODY})>([\\s\\S]{0,2000}?)<\\/a\\s*>`, "gi");
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+))/i;
const SAFE_HREF = /^(?:https?:\/\/|mailto:|tel:)/i;

const expandAnchors = (html) =>
  html.replace(ANCHOR, (_match, attrs, inner) => {
    const found = HREF.exec(attrs);
    const href = String((found && (found[1] ?? found[2] ?? found[3])) || "").trim();

    if (!href || href.length > 300 || !SAFE_HREF.test(href) || inner.includes(href)) {
      return inner;
    }

    return `${inner} (${href}) `;
  });

const cleanText = (value) => {
  if (typeof value !== "string") return "";

  const withoutBogus = stripHiddenChars(value)
    .replace(/<!--[\s\S]*?(?:-->|$)/g, " ")
    .replace(/<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/g, " ")
    .replace(RAW_TEXT_BLOCK, " ")
    .replace(RAW_TEXT_OPEN_AT_END, " ")
    .replace(/<[!?][^>]*>/g, " ");

  const withoutTags = expandAnchors(withoutBogus)
    .replace(ANY_TAG, (_tag, name) => (INLINE_TAGS.has(name.toLowerCase()) ? "" : " "));

  return stripHiddenChars(decodeEntities(withoutTags))
    .replace(/\s+/g, " ")
    .trim();
};

const plainText = (value, maxLength = MAX_CONTENT_LENGTH) => cleanText(value).slice(0, maxLength);

// Konten dipotong di batas kata dan SELALU diberi penanda; total panjang <= MAX_CONTENT_LENGTH.
const clipContent = (text, forceMarker = false) => {
  if (text.length <= MAX_CONTENT_LENGTH && !forceMarker) return { content: text, truncated: false };
  if (text.length <= MAX_CONTENT_LENGTH) {
    const room = MAX_CONTENT_LENGTH - TRUNCATION_MARKER.length - 1;
    return { content: `${text.slice(0, room).trimEnd()} ${TRUNCATION_MARKER}`, truncated: true };
  }

  const room = MAX_CONTENT_LENGTH - TRUNCATION_MARKER.length - 1;
  let cut = text.slice(0, room);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > room * 0.8) cut = cut.slice(0, lastSpace);

  return { content: `${cut.trimEnd()} ${TRUNCATION_MARKER}`, truncated: true };
};

// `metadata` (tanpa id/slug/path) adalah satu-satunya bagian tambahan yang dibaca assistantGeminiService.
// Field datar lain (id, slug, sourcePath, ...) hanya dipakai server untuk membuat citation.
const sanitizeMetadata = (metadata) =>
  Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => [key, plainText(value, 200)])
      .filter(([, value]) => value)
  );

// Label sumber knowledge untuk ditampilkan ke frontend: teks polos satu baris, tanpa < >, maks 200
// karakter; kosong -> null (assistantCitationService memakai label bawaan).
const displayLabel = (value) => plainText(value, 200).replace(/[<>]/g, " ").replace(/\s+/g, " ").trim() || null;

const makeSource = (type, id, title, content, citationFields = {}, geminiMetadata = {}) => {
  const rawTooLong = typeof content === "string" && content.length > RAW_INPUT_LIMIT;
  const fullText = cleanText(rawTooLong ? content.slice(0, RAW_INPUT_LIMIT) : content);
  const { content: clipped, truncated } = clipContent(fullText, rawTooLong);

  return {
    type,
    id,
    title: plainText(title, 300),
    content: clipped,
    contentTruncated: truncated,
    scoreText: fullText.slice(0, SCORE_TEXT_LIMIT),
    ...citationFields,
    metadata: sanitizeMetadata(geminiMetadata),
  };
};

const tokenize = (value) =>
  String(value || "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];

// Kata kunci cocok dengan token jika sama persis, atau (kata kunci >= 5 huruf) menjadi awalan token:
// "wisuda" cocok dengan "wisudawan".
const matchesWord = (words, keyword) => {
  if (words.has(keyword)) return true;
  if (keyword.length < 5) return false;
  for (const word of words) {
    if (word.startsWith(keyword)) return true;
  }
  return false;
};

// ---------------------------------------------------------------------
// Niat "akreditasi". Pertanyaan umum ("Apa akreditasi Universitas LIA?") tidak punya kata yang
// cocok dengan kolom mana pun, sehingga dulu menghasilkan 0 sumber. Sekarang:
//   - tanpa nama spesifik  -> mode umum: ambil sedikit data terbaru (institusi, atau prodi jika
//     pertanyaan menyebut prodi/program studi), tetap hanya yang terbit;
//   - dengan nama spesifik -> pencarian kata kunci memakai HANYA kata spesifik itu, jadi kata umum
//     seperti "program" atau "akreditasi" tidak menarik data yang tidak relevan.
// ---------------------------------------------------------------------
const ACCREDITATION_TERMS = new Set([
  "akreditasi", "terakreditasi", "accreditation", "accredited", "banpt", "ban-pt",
]);
const INSTITUTION_SCOPE_WORDS = new Set([
  "institusi", "institusional", "perguruan", "tinggi", "kampus", "universitas", "lia",
]);
const PROGRAM_SCOPE_WORDS = new Set([
  "prodi", "program", "studi", "jurusan", "fakultas", "jenjang", "sarjana", "diploma",
]);
const GENERIC_ACCREDITATION_WORDS = new Set([
  "peringkat", "nilai", "status", "berlaku", "masa", "nomor", "surat", "keputusan", "terbaru",
  "terkini", "sekarang", "resmi", "lengkap", "daftar", "semua", "seluruh", "saja", "tahun",
  "berakhir", "kedaluwarsa", "kadaluarsa", "aktif", "valid", "hingga", "sampai", "tanggal",
  "penerbit", "lembaga", "badan", "nasional", "sk",
]);

const analyzeAccreditationIntent = (keywords) => {
  if (!keywords.some((word) => ACCREDITATION_TERMS.has(word))) {
    return {
      intent: false,
      generic: false,
      specific: keywords,
      searchKeywords: keywords,
      institutions: true,
      programs: true,
    };
  }

  const scopeInstitution = keywords.some((word) => INSTITUTION_SCOPE_WORDS.has(word));
  const scopeProgram = keywords.some((word) => PROGRAM_SCOPE_WORDS.has(word));
  const specific = keywords.filter(
    (word) =>
      !ACCREDITATION_TERMS.has(word) &&
      !INSTITUTION_SCOPE_WORDS.has(word) &&
      !PROGRAM_SCOPE_WORDS.has(word) &&
      !GENERIC_ACCREDITATION_WORDS.has(word)
  );
  const generic = specific.length === 0;

  return {
    intent: true,
    generic,
    specific,
    searchKeywords: specific,
    institutions: scopeInstitution || !scopeProgram,
    // Pertanyaan umum tanpa menyebut prodi tidak ikut menarik daftar prodi.
    programs: generic ? scopeProgram : scopeProgram || !scopeInstitution,
  };
};

const isAccreditationType = (type) => typeof type === "string" && type.startsWith("accreditation_");

const calculateRelevance = (source, keywords, plan) => {
  const accreditationBoost = plan?.intent && isAccreditationType(source.type);
  const activeKeywords = accreditationBoost ? plan.specific : keywords;

  const titleWords = new Set(tokenize(source.title));
  const contentWords = new Set(tokenize(source.scoreText ?? source.content));
  const categoryWords = new Set(tokenize(source.category));
  const knowledgeKeywords = new Set(
    (source.keywords || []).flatMap(tokenize)
  );

  let score = accreditationBoost ? ACCREDITATION_INTENT_BOOST : 0;

  for (const keyword of activeKeywords) {
    if (matchesWord(titleWords, keyword)) score += 5;
    if (matchesWord(knowledgeKeywords, keyword)) score += 5;
    if (matchesWord(categoryWords, keyword)) score += 3;
    if (matchesWord(contentWords, keyword)) score += 1;
  }

  return score;
};

// Jenjang (S1, S2, D3, ...) bertindak sebagai SARINGAN pada program studi; kata spesifik lain (nama
// prodi, fakultas, penerbit, ...) minimal satu harus ada di judul/isi. Tanpa ini, pencarian OR di
// database menarik semua prodi S1 hanya karena kata "S1" cocok.
const LEVEL_TERM = /^[sd][1-4]$/;

const passesAccreditationSpecificity = (source, plan) => {
  if (!plan.intent || plan.generic || !isAccreditationType(source.type)) return true;

  const levels = plan.specific.filter((word) => LEVEL_TERM.test(word));
  const names = plan.specific.filter((word) => !LEVEL_TERM.test(word));

  if (levels.length > 0 && source.type === "accreditation_study_program") {
    const sourceLevels = new Set(tokenize(source.educationLevel));
    if (!levels.some((level) => sourceLevels.has(level))) return false;
  }

  if (names.length > 0) {
    const words = new Set([...tokenize(source.title), ...tokenize(source.scoreText ?? source.content)]);
    if (!names.some((name) => matchesWord(words, name))) return false;
  }

  return true;
};

const rankRelevantSources = (sources, keywords, plan) =>
  sources
    .filter((source) => passesAccreditationSpecificity(source, plan))
    .map((source) => ({
      ...source,
      relevanceScore: calculateRelevance(source, keywords, plan),
    }))
    .filter(
      (source) =>
        source.relevanceScore >= MIN_RELEVANCE_SCORE
    )
    .sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore
    )
    .slice(0, MAX_FINAL_RESULTS)
    // scoreText hanya untuk perhitungan internal.
    .map(({ scoreText, ...source }) => source);

// Menjalankan query dan melempar error database yang sudah dibersihkan.
const run = async (context, query) => {
  const { data, error } = await query;
  if (error) throwDbError(`Assistant Retrieval: ${context}`, error);
  return data || [];
};

const mergeById = (...lists) => {
  const seen = new Set();
  const merged = [];
  for (const row of lists.flat()) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
};

// ---------------------------------------------------------------------
// assistant_knowledge: status published dan valid_until (DATE) kosong atau >= hari ini (WIB).
// Tiga jalur kandidat digabung:
//   1. indeks ringan (judul/kategori/keywords) dicocokkan di aplikasi, supaya keyword multi-kata
//      seperti "uang semester" tetap ketemu lewat kata "uang" atau "semester";
//   2. pencocokan teks di judul/kategori/isi lewat ilike;
//   3. pengambilan isi lengkap untuk kandidat jalur 1.
// ---------------------------------------------------------------------
const KNOWLEDGE_COLUMNS =
  "id, title, category, content, keywords, source_label, source_path, valid_until";

const getAssistantKnowledge = async (keywords, today) => {
  const published = (query) =>
    query
      .eq("status", "published")
      .or(`valid_until.is.null,valid_until.gte.${today}`);

  const index = await run(
    "assistant knowledge (indeks)",
    published(
      supabase
        .from("assistant_knowledge")
        .select("id, title, category, keywords")
    )
      .order("updated_at", { ascending: false })
      .limit(KNOWLEDGE_INDEX_LIMIT)
  );

  if (index.length >= KNOWLEDGE_INDEX_LIMIT) {
    console.warn(
      `[ASSISTANT] Indeks assistant_knowledge mencapai batas ${KNOWLEDGE_INDEX_LIMIT}; knowledge yang lebih lama bisa terlewat.`
    );
  }

  const indexedIds = index
    .map((row) => ({ id: row.id, score: calculateRelevance(row, keywords) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_PER_SOURCE)
    .map((row) => row.id);

  const [byIndex, byText] = await Promise.all([
    indexedIds.length
      ? run(
          "assistant knowledge (isi kandidat)",
          published(supabase.from("assistant_knowledge").select(KNOWLEDGE_COLUMNS))
            .in("id", indexedIds)
        )
      : [],
    run(
      "assistant knowledge (teks)",
      published(supabase.from("assistant_knowledge").select(KNOWLEDGE_COLUMNS))
        .or(buildSearchFilter(["title", "category", "content"], keywords))
        .order("updated_at", { ascending: false })
        .limit(MAX_RESULTS_PER_SOURCE)
    ),
  ]);

  return mergeById(byIndex, byText).map((row) =>
    makeSource(
      "knowledge",
      row.id,
      row.title,
      row.content,
      {
        category: plainText(row.category, 100),
        keywords: (Array.isArray(row.keywords) ? row.keywords : [])
          .filter((item) => typeof item === "string")
          .slice(0, 20)
          .map((item) => plainText(item, 50)),
        sourceLabel: displayLabel(row.source_label),
        sourcePath: row.source_path,
        validUntil: row.valid_until,
      },
      {
        category: row.category,
        sourceLabel: row.source_label,
        validUntil: row.valid_until,
      }
    )
  );
};

// ---------------------------------------------------------------------
// news & announcements: status published DAN published_at <= sekarang.
// Dua query: kolom berbobot tinggi (judul/ringkasan) dan isi. Dengan begitu berita lama yang
// judulnya cocok tidak tersingkir oleh banyak berita baru yang hanya menyebut kata itu di isinya.
// ---------------------------------------------------------------------
const getPublishedArticles = async ({ table, type, context }, keywords, now) => {
  const columns = "id, title, slug, excerpt, content_html, published_at";

  const fetchBy = (searchColumns) =>
    run(
      context,
      supabase
        .from(table)
        .select(columns)
        .eq("status", "published")
        .lte("published_at", now)
        .or(buildSearchFilter(searchColumns, keywords))
        .order("published_at", { ascending: false })
        .limit(MAX_RESULTS_PER_SOURCE)
    );

  const [byHeading, byBody] = await Promise.all([
    fetchBy(["title", "excerpt"]),
    fetchBy(["content_html"]),
  ]);

  return mergeById(byHeading, byBody).map((row) =>
    makeSource(
      type,
      row.id,
      row.title,
      row.content_html || row.excerpt,
      {
        slug: row.slug,
        publishedAt: row.published_at,
      },
      {
        publishedAt: row.published_at,
      }
    )
  );
};

const getNews = (keywords, now) =>
  getPublishedArticles(
    { table: "news", type: "news", context: "news" },
    keywords,
    now
  );

const getAnnouncements = (keywords, now) =>
  getPublishedArticles(
    { table: "announcements", type: "announcement", context: "announcements" },
    keywords,
    now
  );

// ---------------------------------------------------------------------
// academic_calendar_events: skema TIDAK punya published_at; satu-satunya aturan publikasi adalah
// status = published (sama dengan endpoint publik). Urut start_date terbaru dulu supaya agenda
// mendatang tidak tersingkir oleh agenda tahun-tahun lama. Tanggal dimasukkan ke teks sumber,
// dan agenda tanpa deskripsi tetap dipakai.
// ---------------------------------------------------------------------
const getAcademicCalendar = async (keywords) => {
  const rows = await run(
    "academic calendar",
    supabase
      .from("academic_calendar_events")
      .select("id, title, description, start_date, end_date, category")
      .eq("status", "published")
      .or(buildSearchFilter(["title", "description", "category"], keywords))
      .order("start_date", { ascending: false })
      .limit(MAX_RESULTS_PER_SOURCE)
  );

  return rows.map((row) =>
    makeSource(
      "academic_calendar",
      row.id,
      row.title,
      [
        row.description,
        `Kategori: ${row.category || "-"}`,
        `Tanggal mulai: ${row.start_date || "-"}`,
        `Tanggal selesai: ${row.end_date || "-"}`,
      ]
        .filter(Boolean)
        .join("\n"),
      {
        startDate: row.start_date,
        endDate: row.end_date,
        category: row.category,
      },
      {
        category: row.category,
        startDate: row.start_date,
        endDate: row.end_date,
      }
    )
  );
};

// ---------------------------------------------------------------------
// Akreditasi: status published DAN published_at <= sekarang (sama dengan endpoint publik).
// Akreditasi yang sudah lewat valid_until tetap ditampilkan situs publik, jadi tetap diambil,
// tetapi diberi label masa berlaku eksplisit agar tidak dijawab sebagai "masih berlaku".
// ---------------------------------------------------------------------
const EXPIRY_LABELS = {
  expired: "Kedaluwarsa (sudah tidak berlaku)",
  expiring: "Masih berlaku (segera berakhir)",
  active: "Masih berlaku",
  unknown: "Tidak diketahui",
};

const getAccreditationInstitutions = async (plan, nowIso, now) => {
  let query = supabase
    .from("accreditation_institutions")
    .select(
      "id, institution_name, rank, sk_number, decision_date, valid_from, valid_until, issuing_body, published_at"
    )
    .eq("status", "published")
    .lte("published_at", nowIso);

  if (!plan.generic) {
    query = query.or(
      buildSearchFilter(
        ["institution_name", "rank", "sk_number", "issuing_body"],
        plan.searchKeywords
      )
    );
  }

  const rows = await run(
    "accreditation institutions",
    query
      .order("published_at", { ascending: false })
      .limit(plan.generic ? GENERIC_INSTITUTION_LIMIT : MAX_RESULTS_PER_SOURCE)
  );

  return rows.map((row) =>
    makeSource(
      "accreditation_institution",
      row.id,
      row.institution_name,
      [
        `Nama institusi: ${row.institution_name}`,
        `Peringkat: ${row.rank}`,
        `Nomor SK: ${row.sk_number}`,
        `Tanggal keputusan: ${row.decision_date || "-"}`,
        `Berlaku mulai: ${row.valid_from || "-"}`,
        `Berlaku sampai: ${row.valid_until || "-"}`,
        `Status masa berlaku: ${EXPIRY_LABELS[computeExpiryStatus(row.valid_until, now)]}`,
        `Penerbit: ${row.issuing_body || "-"}`,
      ].join("\n"),
      {
        publishedAt: row.published_at,
      }
    )
  );
};

const getAccreditationStudyPrograms = async (plan, nowIso, now) => {
  let query = supabase
    .from("accreditation_study_programs")
    .select(
      "id, program_name, education_level, faculty, rank, sk_number, decision_date, valid_from, valid_until, issuing_body, published_at"
    )
    .eq("status", "published")
    .lte("published_at", nowIso);

  if (!plan.generic) {
    query = query.or(
      buildSearchFilter(
        ["program_name", "education_level", "faculty", "rank", "sk_number", "issuing_body"],
        plan.searchKeywords
      )
    );
  }

  const rows = await run(
    "accreditation study programs",
    query
      .order("published_at", { ascending: false })
      .limit(plan.generic ? GENERIC_PROGRAM_LIMIT : MAX_RESULTS_PER_SOURCE)
  );

  return rows.map((row) =>
    makeSource(
      "accreditation_study_program",
      row.id,
      row.program_name,
      [
        `Program studi: ${row.program_name}`,
        `Jenjang: ${row.education_level}`,
        `Fakultas: ${row.faculty || "-"}`,
        `Peringkat: ${row.rank}`,
        `Nomor SK: ${row.sk_number}`,
        `Tanggal keputusan: ${row.decision_date || "-"}`,
        `Berlaku mulai: ${row.valid_from || "-"}`,
        `Berlaku sampai: ${row.valid_until || "-"}`,
        `Status masa berlaku: ${EXPIRY_LABELS[computeExpiryStatus(row.valid_until, now)]}`,
        `Penerbit: ${row.issuing_body || "-"}`,
      ].join("\n"),
      {
        publishedAt: row.published_at,
        educationLevel: plainText(row.education_level, 50),
      }
    )
  );
};

// `now` hanya untuk pengujian; produksi memakai waktu sekarang.
const retrieveOfficialSources = async (question, { now = new Date() } = {}) => {
  if (typeof question !== "string" || !question.trim()) {
    return [];
  }

  const keywords = extractKeywords(question);

  if (keywords.length === 0) {
    return [];
  }

  const effectiveNow =
    now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const nowIso = effectiveNow.toISOString();
  // valid_until bertipe DATE: dibandingkan dengan tanggal hari ini menurut zona waktu bisnis (WIB),
  // bukan tanggal UTC, supaya knowledge tidak bertahan 7 jam melewati hari terakhirnya.
  const today = getToday(effectiveNow);
  const plan = analyzeAccreditationIntent(keywords);

  const tasks = [
    getAssistantKnowledge(keywords, today),
    getNews(keywords, nowIso),
    getAnnouncements(keywords, nowIso),
    getAcademicCalendar(keywords),
  ];

  if (plan.institutions) {
    tasks.push(getAccreditationInstitutions(plan, nowIso, effectiveNow));
  }

  if (plan.programs) {
    tasks.push(getAccreditationStudyPrograms(plan, nowIso, effectiveNow));
  }

  const results = await Promise.all(tasks);

  const sources = results
    .flat()
    .filter((item) => item.content);

  return rankRelevantSources(sources, keywords, plan);
};

module.exports = {
  extractKeywords,
  plainText,
  retrieveOfficialSources,
  // Diekspor untuk pengujian.
  analyzeAccreditationIntent,
  stripHiddenChars,
  TRUNCATION_MARKER,
  MAX_CONTENT_LENGTH,
};
