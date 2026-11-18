import type { TracerAnswersInput } from "./tracer-admin-api";

// Pembaca CSV untuk import data responden Tracer Study. Berjalan di browser; hasilnya divalidasi ulang oleh backend.

export const IMPORT_MAX_ROWS = 2000;
const MAX_REPORTED_ERRORS = 10;

export const CSV_TEMPLATE = "program_studi,f8,f14,f502,f505\nManajemen,1,2,3,4500000\nAkuntansi,5,,,\n";

// Memecah teks CSV menjadi baris dan kolom. Mendukung tanda kutip ("a,b", "" di dalam kutipan),
// BOM di awal file, akhir baris Windows/Unix, dan pemisah koma atau titik koma (dari Excel Indonesia).
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// "4500000", "4.500.000", "Rp 4.500.000", "4,5" -> angka. Selain itu NaN.
export function parseNumber(raw: string): number {
  const value = raw.replace(/rp/gi, "").replace(/[\s\u00a0]/g, "");
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)) return Number(value.replace(/\./g, "").replace(",", "."));
  if (/^-?\d+([.,]\d+)?$/.test(value)) return Number(value.replace(",", "."));
  return Number.NaN;
}

const HEADER_ALIASES: Record<string, "studyProgram" | "f8" | "f14" | "f502" | "f505"> = {
  programstudi: "studyProgram",
  program: "studyProgram",
  prodi: "studyProgram",
  studyprogram: "studyProgram",
  f8: "f8",
  f14: "f14",
  f502: "f502",
  f505: "f505",
};

export interface ParsedTracerCsv {
  rows: TracerAnswersInput[];
  errors: string[]; // maksimal MAX_REPORTED_ERRORS pesan pertama
  errorCount: number;
}

export function parseTracerCsv(text: string): ParsedTracerCsv {
  const table = parseCsv(text).filter((cells) => cells.some((cell) => cell.trim() !== ""));
  const errors: string[] = [];
  let errorCount = 0;
  const report = (message: string) => {
    errorCount += 1;
    if (errors.length < MAX_REPORTED_ERRORS) errors.push(message);
  };

  if (table.length === 0) {
    report("File kosong.");
    return { rows: [], errors, errorCount };
  }

  const columns = table[0].map((header) => HEADER_ALIASES[header.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null);
  if (!columns.includes("f8")) {
    report('Kolom "f8" tidak ditemukan di baris judul. Pakai template: program_studi,f8,f14,f502,f505.');
    return { rows: [], errors, errorCount };
  }

  const dataRows = table.slice(1);
  if (dataRows.length === 0) report("File hanya berisi baris judul, belum ada data.");
  if (dataRows.length > IMPORT_MAX_ROWS) report(`Maksimal ${IMPORT_MAX_ROWS} baris data per import (file ini ${dataRows.length}).`);

  const rows: TracerAnswersInput[] = [];
  dataRows.forEach((cells, index) => {
    const line = index + 2; // baris judul = 1
    const get = (key: string) => {
      const at = columns.indexOf(key as (typeof columns)[number]);
      return at >= 0 ? (cells[at] ?? "").trim() : "";
    };
    const problems: string[] = [];

    const f8Raw = get("f8");
    const f8 = parseNumber(f8Raw);
    if (f8Raw === "" || !Number.isInteger(f8) || f8 < 1 || f8 > 5) problems.push("f8 harus bilangan bulat 1–5");

    const optional = (key: "f14" | "f502" | "f505", validate: (n: number) => string | null): number | null => {
      const raw = get(key);
      if (raw === "") return null;
      const n = parseNumber(raw);
      const problem = Number.isNaN(n) ? `${key} bukan angka` : validate(n);
      if (problem) problems.push(problem);
      return Number.isNaN(n) ? null : n;
    };
    const f14 = optional("f14", (n) => (!Number.isInteger(n) || n < 1 || n > 5 ? "f14 harus bilangan bulat 1–5" : null));
    const f502 = optional("f502", (n) => (n < -600 || n > 600 ? "f502 harus antara -600 dan 600" : null));
    const f505 = optional("f505", (n) => (n < 0 || n > 1_000_000_000 ? "f505 harus antara 0 dan 1.000.000.000" : null));

    const program = get("studyProgram").replace(/\s+/g, " ");
    if (program.length > 100) problems.push("program studi maksimal 100 karakter");

    if (problems.length > 0) {
      report(`Baris ${line}: ${problems.join("; ")}.`);
      return;
    }
    rows.push({ studyProgram: program || null, f8, f14, f502, f505 });
  });

  // Satu baris salah membatalkan seluruh import supaya data tidak masuk setengah-setengah.
  if (errorCount > 0) return { rows: [], errors, errorCount };
  return { rows, errors, errorCount };
}
