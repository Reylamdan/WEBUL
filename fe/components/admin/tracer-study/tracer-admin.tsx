"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TracerStudy } from "@/components/alumni/tracer-study";
import { errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  tracerAdminApi,
  type TracerAnswersInput,
  type TracerImportMode,
  type TracerResponse,
} from "@/lib/tracer-admin-api";
import { CSV_TEMPLATE, IMPORT_MAX_ROWS, parseTracerCsv, type ParsedTracerCsv } from "@/lib/tracer-csv";
// Gaya dasar (aa-*) ada di app/admin/admin.css; aa-modal-wide dan aa-hint ada di file berikut.
import "@/components/admin/berita-terkini/berita-admin.css";
import "./tracer-admin.css";

const PAGE_LIMIT = 20;
const CSV_MAX_BYTES = 1024 * 1024;

// Label F8 mengikuti kode di backend (config/tracerStudyMetrics.js).
const F8_LABELS: Record<number, string> = {
  1: "Bekerja (penuh/paruh waktu)",
  2: "Belum memungkinkan bekerja",
  3: "Wiraswasta / wirausaha",
  4: "Melanjutkan pendidikan",
  5: "Mencari pekerjaan",
};

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const formatNumber = (value: number | null, suffix = "") => (value === null ? "—" : `${value.toLocaleString("id-ID")}${suffix}`);

// ---------- Formulir tambah / ubah satu responden ----------

function ResponseForm({
  response,
  programs,
  defaultYear,
  onClose,
  onSaved,
}: {
  response: TracerResponse | null; // null = responden baru
  programs: string[];
  defaultYear: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const [year, setYear] = useState(String(response?.surveyYear ?? defaultYear));
  const [program, setProgram] = useState(response?.studyProgram ?? "");
  const [f8, setF8] = useState(String(response?.f8 ?? 1));
  const [f14, setF14] = useState(response?.f14 === null || response?.f14 === undefined ? "" : String(response.f14));
  const [f502, setF502] = useState(response?.f502 === null || response?.f502 === undefined ? "" : String(response.f502));
  const [f505, setF505] = useState(response?.f505 === null || response?.f505 === undefined ? "" : String(response.f505));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kolom angka opsional: kosong dikirim sebagai null.
  const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = {
        surveyYear: Number(year),
        studyProgram: program.trim() === "" ? null : program.trim(),
        f8: Number(f8),
        f14: optionalNumber(f14),
        f502: optionalNumber(f502),
        f505: optionalNumber(f505),
      };
      if (response) await tracerAdminApi.update(response.id, input);
      else await tracerAdminApi.create(input);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          {response ? "Ubah Data Responden" : "Tambah Responden"}
        </h2>

        <div className="aa-row">
          <label className="aa-field">
            <span>Tahun survei *</span>
            <input max={2100} min={2000} onChange={(e) => setYear(e.target.value)} required step={1} type="number" value={year} />
          </label>
          <label className="aa-field">
            <span>Program studi</span>
            <input list={`${uid}-programs`} maxLength={100} onChange={(e) => setProgram(e.target.value)} value={program} />
            <datalist id={`${uid}-programs`}>
              {programs.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="aa-field">
          <span>F8 — Status alumni saat ini *</span>
          <select onChange={(e) => setF8(e.target.value)} required value={f8}>
            {Object.entries(F8_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {code} · {label}
              </option>
            ))}
          </select>
        </label>

        <label className="aa-field">
          <span>
            F14 — Keselarasan horizontal <small className="aa-hint">(skala 1–5, hanya untuk alumni yang bekerja)</small>
          </span>
          <select onChange={(e) => setF14(e.target.value)} value={f14}>
            <option value="">Tidak diisi</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="aa-row">
          <label className="aa-field">
            <span>
              F502 — Waktu mendapat pekerjaan <small className="aa-hint">(bulan; negatif = sebelum lulus)</small>
            </span>
            <input max={600} min={-600} onChange={(e) => setF502(e.target.value)} step="any" type="number" value={f502} />
          </label>
          <label className="aa-field">
            <span>
              F505 — Take home pay <small className="aa-hint">(rupiah per bulan)</small>
            </span>
            <input max={1000000000} min={0} onChange={(e) => setF505(e.target.value)} step="any" type="number" value={f505} />
          </label>
        </div>

        {error && (
          <p className="aa-error" role="alert">
            {error}
          </p>
        )}

        <div className="aa-modal-actions">
          <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
            {saving ? "Menyimpan..." : response ? "Simpan Perubahan" : "Tambah Responden"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Import CSV ----------

function ImportModal({
  existingByYear,
  defaultYear,
  onClose,
  onDone,
}: {
  existingByYear: Map<number, number>;
  defaultYear: number;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const uid = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTracerCsv | null>(null);
  const [year, setYear] = useState(String(defaultYear));
  const [mode, setMode] = useState<TracerImportMode>("append");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    setFileName(null);
    if (!file) return;
    if (file.size > CSV_MAX_BYTES) return setError("Ukuran file maksimal 1 MB.");
    try {
      setParsed(parseTracerCsv(await file.text()));
      setFileName(file.name);
    } catch {
      setError("File tidak bisa dibaca. Pastikan formatnya CSV.");
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-tracer-study.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const yearNumber = Number(year);
  const validYear = Number.isInteger(yearNumber) && yearNumber >= 2000 && yearNumber <= 2100;
  const rows: TracerAnswersInput[] = parsed?.rows ?? [];
  const canSubmit = !saving && validYear && rows.length > 0 && rows.length <= IMPORT_MAX_ROWS;

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (!canSubmit) return;

    if (mode === "replace") {
      const existing = existingByYear.get(yearNumber) ?? 0;
      const message = existing
        ? `Seluruh data tahun ${yearNumber} (${existing} responden) akan DIGANTI dengan ${rows.length} data dari file ini. Lanjutkan?`
        : `Belum ada data tahun ${yearNumber}. ${rows.length} data dari file ini akan ditambahkan. Lanjutkan?`;
      if (!window.confirm(message)) return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await tracerAdminApi.importRows(yearNumber, mode, rows);
      onDone(
        result.removed > 0
          ? `Import berhasil: ${result.inserted} data tahun ${result.surveyYear} masuk, ${result.removed} data lama diganti.`
          : `Import berhasil: ${result.inserted} data tahun ${result.surveyYear} ditambahkan.`,
      );
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="aa-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form aria-labelledby={`${uid}-title`} aria-modal="true" className="aa-modal aa-modal-wide" onSubmit={submit} role="dialog">
        <h2 className="aa-modal-title" id={`${uid}-title`}>
          Import Data Responden (CSV)
        </h2>
        <p className="aa-subtitle">
          Kolom: <code>program_studi, f8, f14, f502, f505</code>. Hanya <code>f8</code> yang wajib. Pemisah koma atau titik koma
          (hasil simpan CSV dari Excel) sama-sama bisa dibaca.
        </p>

        <div className="tsa-import-box">
          <input
            accept=".csv,text/csv"
            aria-label="Pilih file CSV"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0])}
            ref={fileInput}
            type="file"
          />
          <button className="aa-btn aa-btn-sm" disabled={saving} onClick={() => fileInput.current?.click()} type="button">
            {fileName ? "Ganti file" : "Pilih file CSV"}
          </button>
          <button className="aa-btn aa-btn-sm" onClick={downloadTemplate} type="button">
            Unduh template
          </button>
          <small className="tsa-muted">{fileName ?? "Belum ada file dipilih · maks. 1 MB / 2.000 baris"}</small>
        </div>

        {parsed && parsed.errorCount > 0 && (
          <div className="aa-error" role="alert">
            <strong>
              File tidak bisa diimpor ({parsed.errorCount} masalah). Perbaiki lalu pilih file lagi:
            </strong>
            <ul className="tsa-errors">
              {parsed.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            {parsed.errorCount > parsed.errors.length && <small>…dan {parsed.errorCount - parsed.errors.length} masalah lainnya.</small>}
          </div>
        )}

        {rows.length > 0 && (
          <>
            <p className="aa-notice" style={{ cursor: "default" }}>
              {rows.length.toLocaleString("id-ID")} baris data valid. Pratinjau 5 baris pertama:
            </p>
            <div className="tsa-preview">
              <table>
                <thead>
                  <tr>
                    <th>Program studi</th>
                    <th>F8</th>
                    <th>F14</th>
                    <th>F502</th>
                    <th>F505</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      <td>{row.studyProgram ?? "—"}</td>
                      <td>{row.f8}</td>
                      <td>{row.f14 ?? "—"}</td>
                      <td>{row.f502 ?? "—"}</td>
                      <td>{row.f505 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <label className="aa-field">
          <span>Tahun survei untuk seluruh baris *</span>
          <input max={2100} min={2000} onChange={(e) => setYear(e.target.value)} required step={1} type="number" value={year} />
        </label>

        <div className="aa-field">
          <span>Cara import</span>
          <label className="tsa-radio">
            <input checked={mode === "append"} onChange={() => setMode("append")} type="radio" />
            <span>Tambahkan ke data yang sudah ada</span>
          </label>
          <label className="tsa-radio">
            <input checked={mode === "replace"} onChange={() => setMode("replace")} type="radio" />
            <span>
              Ganti seluruh data tahun ini
              {validYear && (existingByYear.get(yearNumber) ?? 0) > 0 && (
                <small className="aa-hint"> — {existingByYear.get(yearNumber)} data tahun {yearNumber} yang ada akan dihapus</small>
              )}
            </span>
          </label>
        </div>

        {error && (
          <p className="aa-error" role="alert">
            {error}
          </p>
        )}

        <div className="aa-modal-actions">
          <button className="aa-btn" disabled={saving} onClick={onClose} type="button">
            Batal
          </button>
          <button className="aa-btn aa-btn-primary" disabled={!canSubmit} type="submit">
            {saving ? "Mengimpor..." : rows.length > 0 ? `Import ${rows.length.toLocaleString("id-ID")} Data` : "Import"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Pengelolaan data (tabel responden) ----------

function ManagePanel({
  yearRows,
  programs,
  refresh,
  onEdit,
  onChanged,
  onError,
}: {
  yearRows: { year: number; total: number }[];
  programs: string[];
  refresh: number;
  onEdit: (response: TracerResponse) => void;
  onChanged: (notice: string) => void;
  onError: (message: string | null) => void;
}) {
  const [year, setYear] = useState<number | "">("");
  const [program, setProgram] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [year, program]);

  const list = useApi(`tracer-admin:${page}:${year}:${program}:${refresh}`, () =>
    tracerAdminApi.list({ page, limit: PAGE_LIMIT, year, program }),
  );
  const items = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  async function remove(response: TracerResponse) {
    if (!window.confirm("Hapus data responden ini? Tindakan ini tidak bisa dibatalkan.")) return;
    onError(null);
    try {
      await tracerAdminApi.remove(response.id);
      // Jika yang dihapus adalah satu-satunya item di halaman terakhir, mundur satu halaman.
      if (items.length === 1 && page > 1) setPage(page - 1);
      onChanged("Data responden dihapus.");
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function removeYear(target: number, total: number) {
    const typed = window.prompt(
      `Hapus SELURUH ${total} data tracer study tahun ${target}? Tindakan ini tidak bisa dibatalkan.\n\nKetik ${target} untuk melanjutkan:`,
    );
    if (typed === null) return;
    if (typed.trim() !== String(target)) {
      onError("Penghapusan dibatalkan: tahun yang diketik tidak cocok.");
      return;
    }
    onError(null);
    try {
      const result = await tracerAdminApi.removeYear(target);
      if (year === target) setYear("");
      onChanged(`${result.removed} data tahun ${target} dihapus.`);
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <div className="tsa-manage-body">
      {yearRows.length > 0 && (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Tahun survei</th>
                <th className="tsa-num">Jumlah responden</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {yearRows.map((row) => (
                <tr key={row.year}>
                  <td>
                    <strong>{row.year}</strong>
                  </td>
                  <td className="tsa-num">{row.total.toLocaleString("id-ID")}</td>
                  <td className="aa-actions">
                    <button className="aa-btn aa-btn-sm" onClick={() => setYear(row.year)} type="button">
                      Lihat data
                    </button>
                    <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => removeYear(row.year, row.total)} type="button">
                      Hapus tahun
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tsa-filters">
        <select
          aria-label="Filter tahun survei"
          onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
          value={year}
        >
          <option value="">Semua tahun</option>
          {yearRows.map((row) => (
            <option key={row.year} value={row.year}>
              {row.year}
            </option>
          ))}
        </select>
        <select aria-label="Filter program studi" onChange={(e) => setProgram(e.target.value)} value={program}>
          <option value="">Semua program studi</option>
          {programs.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          className="aa-btn"
          disabled={year === "" && program === ""}
          onClick={() => {
            setYear("");
            setProgram("");
          }}
          type="button"
        >
          Reset filter
        </button>
      </div>

      {list.error && !list.data ? (
        <p className="aa-error" role="alert">
          {errorMessage(list.error)}
        </p>
      ) : list.loading && !list.data ? (
        <p aria-live="polite" className="aa-empty">
          Memuat data responden...
        </p>
      ) : items.length === 0 ? (
        <p className="aa-empty">Tidak ada data responden yang cocok.</p>
      ) : (
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Tahun</th>
                <th>Program studi</th>
                <th>F8 · Status alumni</th>
                <th>F14</th>
                <th className="tsa-num">F502 (bulan)</th>
                <th className="tsa-num">F505 (take home pay)</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={String(row.id)}>
                  <td>{row.surveyYear}</td>
                  <td>{row.studyProgram ?? <span className="tsa-muted">—</span>}</td>
                  <td>{row.f8 === null ? "—" : `${row.f8} · ${F8_LABELS[row.f8] ?? "Kode tidak dikenal"}`}</td>
                  <td>{row.f14 ?? "—"}</td>
                  <td className="tsa-num">{formatNumber(row.f502)}</td>
                  <td className="tsa-num">{row.f505 === null ? "—" : rupiah.format(row.f505)}</td>
                  <td className="aa-actions">
                    <button className="aa-btn aa-btn-sm" onClick={() => onEdit(row)} type="button">
                      Ubah
                    </button>
                    <button className="aa-btn aa-btn-sm aa-btn-danger" onClick={() => remove(row)} type="button">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav aria-label="Halaman" className="aa-pagination">
          <button className="aa-btn aa-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">
            Sebelumnya
          </button>
          <span>
            Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total.toLocaleString("id-ID")} responden
          </span>
          <button className="aa-btn aa-btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} type="button">
            Berikutnya
          </button>
        </nav>
      )}
    </div>
  );
}

// ---------- Halaman ----------

export function TracerAdmin() {
  // Naik setiap ada perubahan data: memuat ulang grafik dan tabel pengelolaan.
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<TracerResponse | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const years = useApi(`tracer-admin-years:${refresh}`, tracerAdminApi.years);
  const yearRows = years.data?.years ?? [];
  const programs = years.data?.programs ?? [];
  const existingByYear = new Map(yearRows.map((row) => [row.year, row.total]));
  const defaultYear = yearRows[0]?.year ?? new Date().getFullYear();
  const totalResponses = yearRows.reduce((sum, row) => sum + row.total, 0);

  const changed = (message: string) => {
    setNotice(message);
    setRefresh((n) => n + 1);
  };

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Tracer Study</h1>
          <p className="aa-subtitle">
            Tampilan di bawah sama dengan halaman Tracer Study di website. Setelah import atau ubah data, grafik langsung
            diperbarui sehingga kamu bisa melihat apa yang berubah.
          </p>
        </div>
        <div className="tsa-actions-row">
          <button className="aa-btn" onClick={() => setImporting(true)} type="button">
            Import CSV
          </button>
          <button className="aa-btn aa-btn-primary" onClick={() => setEditing("new")} type="button">
            + Tambah Responden
          </button>
        </div>
      </header>

      {notice && (
        <p aria-live="polite" className="aa-notice" onClick={() => setNotice(null)} role="status">
          {notice}
        </p>
      )}
      {actionError && (
        <p className="aa-error" role="alert">
          {actionError}
        </p>
      )}
      {Boolean(years.error) && !years.data && (
        <p className="aa-error" role="alert">
          {errorMessage(years.error)}
        </p>
      )}

      {/* Komponen yang sama dengan halaman publik; key membuatnya mengambil data baru setelah ada perubahan. */}
      <div className="tsa-charts">
        <TracerStudy key={refresh} />
      </div>

      <details className="tsa-manage" onToggle={(e) => setManageOpen(e.currentTarget.open)}>
        <summary>
          Kelola data responden
          <small className="tsa-muted">
            {years.data ? ` · ${totalResponses.toLocaleString("id-ID")} responden, ${yearRows.length} tahun survei` : ""}
          </small>
        </summary>
        {manageOpen && (
          <ManagePanel
            onChanged={changed}
            onEdit={(response) => setEditing(response)}
            onError={setActionError}
            programs={programs}
            refresh={refresh}
            yearRows={yearRows}
          />
        )}
      </details>

      {editing && (
        <ResponseForm
          defaultYear={defaultYear}
          onClose={() => setEditing(null)}
          onSaved={() => {
            const isNew = editing === "new";
            setEditing(null);
            changed(isNew ? "Responden ditambahkan." : "Perubahan disimpan.");
          }}
          programs={programs}
          response={editing === "new" ? null : editing}
        />
      )}

      {importing && (
        <ImportModal
          defaultYear={defaultYear}
          existingByYear={existingByYear}
          onClose={() => setImporting(false)}
          onDone={(message) => {
            setImporting(false);
            changed(message);
          }}
        />
      )}
    </section>
  );
}
