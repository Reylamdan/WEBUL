"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./tracer-form.css";
import { BasketballUpload } from "./basketball-upload";
import { fetchTracerFilters } from "./tracer-types";
import { submitTracerStudy, SubmitError, type SubmissionChannel } from "./tracer-submit";

/* ---------- pilihan jawaban (sama dengan definisi metrik di backend) ---------- */
const STATUS_OPTIONS = [
  { value: 1, label: "Bekerja (penuh waktu/paruh waktu)" },
  { value: 3, label: "Wiraswasta/wirausaha/pekerja lepas" },
  { value: 4, label: "Melanjutkan pendidikan" },
  { value: 5, label: "Tidak bekerja tetapi sedang mencari pekerjaan" },
  { value: 2, label: "Belum memungkinkan bekerja (sakit, mengurus keluarga, dan/atau alasan lainnya)" },
];

const MATCH_OPTIONS = [
  { value: 1, label: "Sangat erat" },
  { value: 2, label: "Erat" },
  { value: 3, label: "Cukup erat" },
  { value: 4, label: "Kurang erat" },
  { value: 5, label: "Tidak sama sekali" },
];

/** Program studi Universitas LIA (sesuai halaman Akademik). */
const PROGRAMS = [
  "D3 Bahasa Inggris",
  "S1 Bahasa Inggris",
  "S1 Bahasa Jepang",
  "S1 Desain Komunikasi Visual",
  "S1 Bisnis Digital",
  "S1 Informatika",
  "S1 Sistem Informasi",
];
const OTHER = "__other";

const STEPS = ["Data Diri", "Tracer Study", "Kirim"] as const;
const THIS_YEAR = new Date().getFullYear();

type Alumni = { fullName: string; nim: string; studyProgram: string; graduationYear: string; email: string; phone: string };
type Tracer = { f8: number | null; f14: number | null; waitMonths: string; beforeGraduation: boolean; pay: string };
type Errors = Record<string, string>;

const EMPTY_ALUMNI: Alumni = { fullName: "", nim: "", studyProgram: "", graduationYear: "", email: "", phone: "" };
const EMPTY_TRACER: Tracer = { f8: null, f14: null, waitMonths: "", beforeGraduation: false, pay: "" };

const hasWork = (f8: number | null) => f8 === 1 || f8 === 3;
const digits = (v: string) => v.replace(/\D/g, "");
const rupiah = (v: string) => (v ? Number(v).toLocaleString("id-ID") : "");

function validateAlumni(a: Alumni): Errors {
  const e: Errors = {};
  if (a.fullName.trim().length < 2) e.fullName = "Nama lengkap wajib diisi";
  if (!a.nim.trim()) e.nim = "NIM wajib diisi";
  else if (!/^[A-Za-z0-9./-]+$/.test(a.nim.trim())) e.nim = "NIM hanya boleh huruf, angka, titik, garis miring, dan strip";
  if (!a.studyProgram.trim()) e.studyProgram = "Program studi wajib diisi";
  const y = Number(a.graduationYear);
  if (!a.graduationYear) e.graduationYear = "Tahun lulus wajib diisi";
  else if (!Number.isInteger(y) || y < 1980 || y > THIS_YEAR) e.graduationYear = `Isi tahun antara 1980 dan ${THIS_YEAR}`;
  if (!a.email.trim()) e.email = "Email wajib diisi";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) e.email = "Format email tidak valid";
  if (a.phone.trim() && !/^(\+62|62|0)8\d{7,12}$/.test(a.phone.replace(/[\s-]/g, ""))) e.phone = "Nomor HP tidak valid (contoh: 081234567890)";
  return e;
}

function validateTracer(t: Tracer): Errors {
  const e: Errors = {};
  if (t.f8 == null) e.f8 = "Pilih status Anda saat ini";
  if (t.f8 === 1 && t.f14 == null) e.f14 = "Pilih tingkat keselarasan";
  if (hasWork(t.f8)) {
    if (!t.beforeGraduation && t.waitMonths !== "") {
      const m = Number(t.waitMonths);
      if (!Number.isInteger(m) || m < 0 || m > 600) e.waitMonths = "Isi bilangan bulat 0–600";
    }
    if (t.pay !== "" && Number(t.pay) > 1_000_000_000) e.pay = "Nominal terlalu besar";
  }
  return e;
}

/* ---------- komponen kecil ---------- */
function Field({
  id, label, error, hint, optional, children,
}: { id: string; label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className={`tf-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label} {optional && <em>(opsional)</em>}
      </label>
      {children}
      {hint && !error && <small id={`${id}-d`}>{hint}</small>}
      {error && <small id={`${id}-d`} className="tf-error" role="alert">{error}</small>}
    </div>
  );
}

function Choice({
  name, options, value, onChange, error,
}: { name: string; options: { value: number; label: string }[]; value: number | null; onChange: (v: number) => void; error?: string }) {
  return (
    <>
      <div className="tf-choices">
        {options.map((o) => (
          <label key={o.value} className={`tf-choice${value === o.value ? " is-on" : ""}`}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && <small className="tf-error" role="alert">{error}</small>}
    </>
  );
}

export function TracerForm() {
  const [step, setStep] = useState(0);
  const [alumni, setAlumni] = useState<Alumni>(EMPTY_ALUMNI);
  const [tracer, setTracer] = useState<Tracer>(EMPTY_TRACER);
  const [errors, setErrors] = useState<Errors>({});
  const [extraPrograms, setExtraPrograms] = useState<string[]>([]);
  const [otherProgram, setOtherProgram] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ballBusy, setBallBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [done, setDone] = useState<{ channel: SubmissionChannel } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const lastChannel = useRef<SubmissionChannel>("form");

  useEffect(() => {
    const ac = new AbortController();
    fetchTracerFilters(ac.signal).then((f) => setExtraPrograms(f.programs)).catch(() => {});
    return () => ac.abort();
  }, []);

  const goTo = (n: number) => {
    setStep(n);
    setSendError(null);
    root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Daftar resmi + program yang sudah pernah tercatat di data survei (tanpa duplikat).
  const programOptions = useMemo(() => [...new Set([...PROGRAMS, ...extraPrograms])], [extraPrograms]);
  const programSelect = otherProgram ? OTHER : programOptions.includes(alumni.studyProgram) ? alumni.studyProgram : "";

  const setA = (k: keyof Alumni) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlumni((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = step === 0 ? validateAlumni(alumni) : validateTracer(tracer);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(".has-error input, .tf-error")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    goTo(step + 1);
  };

  const payload = useMemo(() => {
    const work = hasWork(tracer.f8);
    return {
      alumni: {
        fullName: alumni.fullName.trim(),
        nim: alumni.nim.trim(),
        studyProgram: alumni.studyProgram.trim(),
        graduationYear: Number(alumni.graduationYear),
        email: alumni.email.trim(),
        phone: alumni.phone.trim() || null,
      },
      tracer: {
        f8: tracer.f8 ?? 0,
        f14: tracer.f8 === 1 ? tracer.f14 : null,
        f502: work ? (tracer.beforeGraduation ? -1 : tracer.waitMonths === "" ? null : Number(tracer.waitMonths)) : null,
        f505: work && tracer.pay !== "" ? Number(tracer.pay) : null,
      },
    };
  }, [alumni, tracer]);

  /** Mengirim ke server; melempar error bila gagal. Dipakai oleh kedua cara pengiriman. */
  const send = async (channel: SubmissionChannel) => {
    lastChannel.current = channel;
    setBusy(true);
    setSendError(null);
    try {
      await submitTracerStudy({ ...payload, channel });
    } catch (e) {
      const msg = e instanceof SubmitError ? e.message : "Terjadi kesalahan saat mengirim form";
      setSendError(msg);
      throw new Error(msg);
    } finally {
      setBusy(false);
    }
  };

  const sendDirect = async () => {
    try {
      await send("form");
      setDone({ channel: "form" });
      root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      /* pesan sudah ditampilkan lewat sendError */
    }
  };

  const reset = () => {
    setAlumni(EMPTY_ALUMNI);
    setOtherProgram(false);
    setTracer(EMPTY_TRACER);
    setErrors({});
    setSendError(null);
    setDone(null);
    setStep(0);
  };

  /* ---------- tampilan sukses ---------- */
  if (done) {
    return (
      <div className="tf-root" ref={root}>
        <section className="tf-card tf-done" aria-live="polite">
          <div className="tf-done-icon" aria-hidden="true">✓</div>
          <h2>Terima kasih, {alumni.fullName.split(" ")[0]}!</h2>
          <p>
            Jawaban tracer study Anda sudah kami terima
            {done.channel === "basketball" ? " — dan masuk tepat ke ring. 🏀" : "."}
            {" "}Data Anda membantu Universitas LIA meningkatkan kualitas pendidikan dan layanan bagi lulusan.
          </p>
          <button type="button" className="tf-btn tf-btn-ghost" onClick={reset}>Isi untuk alumni lain</button>
        </section>
      </div>
    );
  }

  return (
    <div className="tf-root" ref={root}>
      <ol className="tf-steps" aria-label="Langkah pengisian">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "is-current" : i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>
            <button type="button" disabled={i >= step} onClick={() => goTo(i)} aria-label={`${s}${i < step ? " (selesai, klik untuk ubah)" : ""}`}>
              <span className="tf-step-dot">{i < step ? "✓" : i + 1}</span>
              <span className="tf-step-name">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* ---------- Form 1: data diri ---------- */}
      {step === 0 && (
        <form className="tf-card" onSubmit={next} noValidate>
          <header className="tf-head">
            <span className="tf-chip">Form 1 dari 2</span>
            <h2>Data diri alumni</h2>
            <p>Data ini disimpan terpisah dari jawaban survei dan tidak pernah ditampilkan pada statistik publik.</p>
          </header>

          <div className="tf-grid">
            <Field id="fullName" label="Nama lengkap" error={errors.fullName}>
              <input id="fullName" autoComplete="name" value={alumni.fullName} onChange={setA("fullName")} aria-invalid={!!errors.fullName} aria-describedby="fullName-d" maxLength={120} />
            </Field>
            <Field id="nim" label="NIM" error={errors.nim}>
              <input id="nim" inputMode="text" value={alumni.nim} onChange={setA("nim")} aria-invalid={!!errors.nim} aria-describedby="nim-d" maxLength={30} />
            </Field>
            <Field id="studyProgram" label="Program studi" error={errors.studyProgram}>
              <select
                id="studyProgram"
                value={programSelect}
                onChange={(e) => {
                  const v = e.target.value;
                  setOtherProgram(v === OTHER);
                  setAlumni((p) => ({ ...p, studyProgram: v === OTHER ? "" : v }));
                  if (errors.studyProgram) setErrors((p) => ({ ...p, studyProgram: "" }));
                }}
                aria-invalid={!!errors.studyProgram}
                aria-describedby="studyProgram-d"
              >
                <option value="">Pilih program studi</option>
                {programOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value={OTHER}>Lainnya…</option>
              </select>
              {otherProgram && (
                <input aria-label="Nama program studi" placeholder="Tulis nama program studi" value={alumni.studyProgram} onChange={setA("studyProgram")} maxLength={100} autoFocus />
              )}
            </Field>
            <Field id="graduationYear" label="Tahun lulus" error={errors.graduationYear}>
              <input id="graduationYear" inputMode="numeric" placeholder={String(THIS_YEAR - 1)} value={alumni.graduationYear} onChange={(e) => { setAlumni((p) => ({ ...p, graduationYear: digits(e.target.value).slice(0, 4) })); if (errors.graduationYear) setErrors((p) => ({ ...p, graduationYear: "" })); }} aria-invalid={!!errors.graduationYear} aria-describedby="graduationYear-d" />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <input id="email" type="email" autoComplete="email" value={alumni.email} onChange={setA("email")} aria-invalid={!!errors.email} aria-describedby="email-d" maxLength={160} />
            </Field>
            <Field id="phone" label="Nomor HP / WhatsApp" optional error={errors.phone}>
              <input id="phone" type="tel" autoComplete="tel" placeholder="081234567890" value={alumni.phone} onChange={setA("phone")} aria-invalid={!!errors.phone} aria-describedby="phone-d" maxLength={20} />
            </Field>
          </div>

          <footer className="tf-actions">
            <span />
            <button type="submit" className="tf-btn">Lanjut ke form tracer study →</button>
          </footer>
        </form>
      )}

      {/* ---------- Form 2: tracer study ---------- */}
      {step === 1 && (
        <form className="tf-card" onSubmit={next} noValidate>
          <header className="tf-head">
            <span className="tf-chip">Form 2 dari 2</span>
            <h2>Tracer study</h2>
            <p>Ceritakan kondisi Anda saat ini setelah lulus dari Universitas LIA.</p>
          </header>

          <fieldset className="tf-q">
            <legend><b>F8</b> Status Anda saat ini</legend>
            <Choice
              name="f8"
              options={STATUS_OPTIONS}
              value={tracer.f8}
              error={errors.f8}
              onChange={(v) => {
                setTracer((p) => ({ ...p, f8: v, f14: v === 1 ? p.f14 : null }));
                setErrors((p) => ({ ...p, f8: "" }));
              }}
            />
          </fieldset>

          {tracer.f8 === 1 && (
            <fieldset className="tf-q tf-reveal">
              <legend><b>F14</b> Seberapa erat hubungan bidang studi Anda dengan pekerjaan saat ini?</legend>
              <Choice
                name="f14"
                options={MATCH_OPTIONS}
                value={tracer.f14}
                error={errors.f14}
                onChange={(v) => {
                  setTracer((p) => ({ ...p, f14: v }));
                  setErrors((p) => ({ ...p, f14: "" }));
                }}
              />
            </fieldset>
          )}

          {hasWork(tracer.f8) && (
            <div className="tf-q tf-reveal">
              <div className="tf-grid">
                <Field id="waitMonths" label="F502 · Berapa bulan setelah lulus Anda mendapat pekerjaan pertama?" optional error={errors.waitMonths} hint="Isi 0 bila langsung bekerja setelah lulus">
                  <input id="waitMonths" inputMode="numeric" disabled={tracer.beforeGraduation} placeholder="mis. 3" value={tracer.beforeGraduation ? "" : tracer.waitMonths} onChange={(e) => { setTracer((p) => ({ ...p, waitMonths: digits(e.target.value).slice(0, 3) })); setErrors((p) => ({ ...p, waitMonths: "" })); }} aria-invalid={!!errors.waitMonths} aria-describedby="waitMonths-d" />
                  <label className="tf-check">
                    <input type="checkbox" checked={tracer.beforeGraduation} onChange={(e) => setTracer((p) => ({ ...p, beforeGraduation: e.target.checked }))} />
                    Sudah bekerja sebelum lulus
                  </label>
                </Field>
                <Field id="pay" label="F505 · Take home pay per bulan" optional error={errors.pay} hint="Total penghasilan bersih per bulan, dalam rupiah">
                  <div className="tf-money">
                    <span>Rp</span>
                    <input id="pay" inputMode="numeric" placeholder="5.000.000" value={rupiah(tracer.pay)} onChange={(e) => { setTracer((p) => ({ ...p, pay: digits(e.target.value).slice(0, 10) })); setErrors((p) => ({ ...p, pay: "" })); }} aria-invalid={!!errors.pay} aria-describedby="pay-d" />
                  </div>
                </Field>
              </div>
            </div>
          )}

          <footer className="tf-actions">
            <button type="button" className="tf-btn tf-btn-ghost" onClick={() => goTo(0)}>← Kembali</button>
            <button type="submit" className="tf-btn">Lanjut ke pengiriman →</button>
          </footer>
        </form>
      )}

      {/* ---------- Kirim: dua cara ---------- */}
      {step === 2 && (
        <section className="tf-card">
          <header className="tf-head">
            <span className="tf-chip">Langkah terakhir</span>
            <h2>Kirim jawaban Anda</h2>
            <p>Periksa ringkasan di bawah, lalu pilih cara mengirim. Keduanya menyimpan data yang sama.</p>
          </header>

          <dl className="tf-summary">
            <div><dt>Nama</dt><dd>{payload.alumni.fullName}</dd></div>
            <div><dt>NIM</dt><dd>{payload.alumni.nim}</dd></div>
            <div><dt>Program studi</dt><dd>{payload.alumni.studyProgram}</dd></div>
            <div><dt>Tahun lulus</dt><dd>{payload.alumni.graduationYear}</dd></div>
            <div><dt>Email</dt><dd>{payload.alumni.email}</dd></div>
            <div><dt>Status</dt><dd>{STATUS_OPTIONS.find((o) => o.value === tracer.f8)?.label}</dd></div>
            {payload.tracer.f14 != null && <div><dt>Keselarasan</dt><dd>{MATCH_OPTIONS.find((o) => o.value === payload.tracer.f14)?.label}</dd></div>}
            {payload.tracer.f502 != null && <div><dt>Waktu tunggu kerja</dt><dd>{payload.tracer.f502 < 0 ? "Sebelum lulus" : `${payload.tracer.f502} bulan`}</dd></div>}
            {payload.tracer.f505 != null && <div><dt>Take home pay</dt><dd>Rp{payload.tracer.f505.toLocaleString("id-ID")}</dd></div>}
          </dl>

          {sendError && !busy && (
            <div className="tf-alert" role="alert">
              <strong>Form belum terkirim.</strong> {sendError}
            </div>
          )}

          <div className="tf-send">
            <div className="tf-send-direct">
              <h3>Kirim langsung</h3>
              <p>Cara cepat tanpa animasi.</p>
              <button type="button" className="tf-btn" onClick={sendDirect} disabled={busy || ballBusy}>
                {busy && lastChannel.current === "form" ? "Mengirim…" : "Kirim sekarang"}
              </button>
            </div>
            <div className="tf-send-or" aria-hidden="true"><span>atau</span></div>
            <div className="tf-send-ball">
              <BasketballUpload
                disabled={busy}
                onBusyChange={setBallBusy}
                sizeBytes={JSON.stringify(payload).length}
                onSend={() => send("basketball")}
                onScored={() => setDone({ channel: "basketball" })}
              />
            </div>
          </div>

          <footer className="tf-actions">
            <button type="button" className="tf-btn tf-btn-ghost" onClick={() => goTo(1)} disabled={busy || ballBusy}>← Ubah jawaban</button>
            <span />
          </footer>
        </section>
      )}
    </div>
  );
}

export default TracerForm;
