"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  rplAdminApi,
  type AdminRplFee,
  type AdminRplRequirement,
  type AdminRplSchedule,
  type AdminRplStep,
  type PublishStatus,
  type RplFeeInput,
  type RplRequirementInput,
  type RplScheduleInput,
  type RplSettingsInput,
  type RplStepInput,
} from "@/lib/rpl-admin-api";

const PAGE_LIMIT = 20;

// ================= Modal Step =================
function StepModal({
  step,
  onClose,
  onSaved,
}: {
  step: AdminRplStep | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<RplStepInput>({
    title: step?.title ?? "",
    description: step?.description ?? "",
    sortOrder: step?.sortOrder ?? 0,
    status: step?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Judul alur pendaftaran wajib diisi.");
      return;
    }
    if (!form.description.trim()) {
      setError("Deskripsi alur pendaftaran wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (step) {
        await rplAdminApi.updateStep(step.id, form);
        onSaved(`Tahapan "${form.title}" berhasil diperbarui.`);
      } else {
        await rplAdminApi.createStep(form);
        onSaved(`Tahapan "${form.title}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 540 }}>
        <header className="aa-modal-header">
          <h2 className="aa-modal-title">
            {step ? "Edit Tahapan Alur Pendaftaran" : "Tambah Tahapan Alur Pendaftaran"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}
          <div>
            <label htmlFor={`${uid}-title`}>
              Judul Tahapan <span className="aa-required">*</span>
            </label>
            <input
              id={`${uid}-title`}
              onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))}
              placeholder="Contoh: Mengisi formulir RPL"
              required
              type="text"
              value={form.title}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-desc`}>
              Deskripsi / Keterangan <span className="aa-required">*</span>
            </label>
            <textarea
              id={`${uid}-desc`}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="Contoh: Lengkapi formulir pendaftaran dan berkas pendukung."
              required
              rows={3}
              value={form.description}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-sort`}>Urutan</label>
              <input
                id={`${uid}-sort`}
                max={9999}
                min={0}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, sortOrder: parseInt(e.target.value, 10) || 0 }))
                }
                type="number"
                value={form.sortOrder}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-status`}>Status</label>
              <select
                id={`${uid}-status`}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, status: e.target.value as PublishStatus }))
                }
                value={form.status}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <footer className="aa-modal-footer">
            <button className="aa-btn aa-btn-secondary" onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : step ? "Simpan Perubahan" : "Tambah Tahapan"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Requirement =================
function RequirementModal({
  item,
  defaultType,
  onClose,
  onSaved,
}: {
  item: AdminRplRequirement | null;
  defaultType: "syarat" | "dokumen";
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<RplRequirementInput>({
    type: item?.type ?? defaultType,
    title: item?.title ?? "",
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Isi syarat atau dokumen wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (item) {
        await rplAdminApi.updateRequirement(item.id, form);
        onSaved(`Data ${form.type === "syarat" ? "syarat" : "dokumen"} berhasil diperbarui.`);
      } else {
        await rplAdminApi.createRequirement(form);
        onSaved(`Data ${form.type === "syarat" ? "syarat" : "dokumen"} berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 540 }}>
        <header className="aa-modal-header">
          <h2 className="aa-modal-title">
            {item ? "Edit Syarat / Dokumen" : "Tambah Syarat / Dokumen"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}
          <div>
            <label htmlFor={`${uid}-type`}>
              Kategori <span className="aa-required">*</span>
            </label>
            <select
              id={`${uid}-type`}
              onChange={(e) =>
                setForm((cur) => ({ ...cur, type: e.target.value as "syarat" | "dokumen" }))
              }
              value={form.type}
            >
              <option value="syarat">Syarat Pendaftaran</option>
              <option value="dokumen">Dokumen Pendaftaran (Berkas)</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-title`}>
              Uraian Syarat / Nama Dokumen <span className="aa-required">*</span>
            </label>
            <textarea
              id={`${uid}-title`}
              onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))}
              placeholder={
                form.type === "syarat"
                  ? "Contoh: Membayar biaya pendaftaran Rp100.000"
                  : "Contoh: Ijazah / Sertifikat Kompetensi"
              }
              required
              rows={3}
              value={form.title}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-sort`}>Urutan</label>
              <input
                id={`${uid}-sort`}
                max={9999}
                min={0}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, sortOrder: parseInt(e.target.value, 10) || 0 }))
                }
                type="number"
                value={form.sortOrder}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-status`}>Status</label>
              <select
                id={`${uid}-status`}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, status: e.target.value as PublishStatus }))
                }
                value={form.status}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <footer className="aa-modal-footer">
            <button className="aa-btn aa-btn-secondary" onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : item ? "Simpan Perubahan" : "Tambah Data"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Schedule =================
function ScheduleModal({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: AdminRplSchedule | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<RplScheduleInput>({
    day: schedule?.day ?? "",
    hours: schedule?.hours ?? "",
    sortOrder: schedule?.sortOrder ?? 0,
    status: schedule?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.day.trim() || !form.hours.trim()) {
      setError("Hari dan jam perkuliahan wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (schedule) {
        await rplAdminApi.updateSchedule(schedule.id, form);
        onSaved(`Jadwal hari "${form.day}" berhasil diperbarui.`);
      } else {
        await rplAdminApi.createSchedule(form);
        onSaved(`Jadwal hari "${form.day}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 480 }}>
        <header className="aa-modal-header">
          <h2 className="aa-modal-title">
            {schedule ? "Edit Jadwal Perkuliahan" : "Tambah Jadwal Perkuliahan"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}
          <div>
            <label htmlFor={`${uid}-day`}>
              Hari <span className="aa-required">*</span>
            </label>
            <input
              id={`${uid}-day`}
              onChange={(e) => setForm((cur) => ({ ...cur, day: e.target.value }))}
              placeholder="Contoh: Kamis / Jumat / Sabtu"
              required
              type="text"
              value={form.day}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-hours`}>
              Jam Perkuliahan <span className="aa-required">*</span>
            </label>
            <input
              id={`${uid}-hours`}
              onChange={(e) => setForm((cur) => ({ ...cur, hours: e.target.value }))}
              placeholder="Contoh: 16:00 - 22:00 WIB"
              required
              type="text"
              value={form.hours}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-sort`}>Urutan</label>
              <input
                id={`${uid}-sort`}
                max={9999}
                min={0}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, sortOrder: parseInt(e.target.value, 10) || 0 }))
                }
                type="number"
                value={form.sortOrder}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-status`}>Status</label>
              <select
                id={`${uid}-status`}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, status: e.target.value as PublishStatus }))
                }
                value={form.status}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <footer className="aa-modal-footer">
            <button className="aa-btn aa-btn-secondary" onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : schedule ? "Simpan Perubahan" : "Tambah Jadwal"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Fee =================
function FeeModal({
  fee,
  onClose,
  onSaved,
}: {
  fee: AdminRplFee | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<RplFeeInput>({
    type: fee?.type ?? "",
    amount: fee?.amount ?? "",
    sortOrder: fee?.sortOrder ?? 0,
    status: fee?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type.trim() || !form.amount.trim()) {
      setError("Jenis biaya dan nominal wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (fee) {
        await rplAdminApi.updateFee(fee.id, form);
        onSaved(`Biaya "${form.type}" berhasil diperbarui.`);
      } else {
        await rplAdminApi.createFee(form);
        onSaved(`Biaya "${form.type}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div aria-modal="true" className="aa-modal-backdrop" role="dialog">
      <div className="aa-modal" style={{ maxWidth: 480 }}>
        <header className="aa-modal-header">
          <h2 className="aa-modal-title">
            {fee ? "Edit Komponen Biaya" : "Tambah Komponen Biaya"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}
          <div>
            <label htmlFor={`${uid}-type`}>
              Jenis Biaya <span className="aa-required">*</span>
            </label>
            <input
              id={`${uid}-type`}
              onChange={(e) => setForm((cur) => ({ ...cur, type: e.target.value }))}
              placeholder="Contoh: Pendaftaran / Asesmen / Kuliah"
              required
              type="text"
              value={form.type}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-amount`}>
              Nominal Biaya <span className="aa-required">*</span>
            </label>
            <input
              id={`${uid}-amount`}
              onChange={(e) => setForm((cur) => ({ ...cur, amount: e.target.value }))}
              placeholder="Contoh: Rp100.000 / Rp3.000.000"
              required
              type="text"
              value={form.amount}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-sort`}>Urutan</label>
              <input
                id={`${uid}-sort`}
                max={9999}
                min={0}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, sortOrder: parseInt(e.target.value, 10) || 0 }))
                }
                type="number"
                value={form.sortOrder}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-status`}>Status</label>
              <select
                id={`${uid}-status`}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, status: e.target.value as PublishStatus }))
                }
                value={form.status}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <footer className="aa-modal-footer">
            <button className="aa-btn aa-btn-secondary" onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : fee ? "Simpan Perubahan" : "Tambah Biaya"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Komponen Utama RplAdmin =================

export function RplAdmin() {
  const [activeTab, setActiveTab] = useState<"steps" | "requirements" | "schedules-fees" | "settings">(
    "steps"
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Steps state
  const [stepSearchInput, setStepSearchInput] = useState("");
  const stepSearch = useDebouncedValue(stepSearchInput, 400);
  const [stepStatus, setStepStatus] = useState<PublishStatus | "">("");
  const [refreshSteps, setRefreshSteps] = useState(0);
  const [editingStep, setEditingStep] = useState<AdminRplStep | "new" | null>(null);

  // Requirements state
  const [reqType, setReqType] = useState<"syarat" | "dokumen" | "">("");
  const [reqSearchInput, setReqSearchInput] = useState("");
  const reqSearch = useDebouncedValue(reqSearchInput, 400);
  const [reqStatus, setReqStatus] = useState<PublishStatus | "">("");
  const [refreshReqs, setRefreshReqs] = useState(0);
  const [editingReq, setEditingReq] = useState<AdminRplRequirement | "new" | null>(null);

  // Schedules & Fees state
  const [refreshSchedules, setRefreshSchedules] = useState(0);
  const [refreshFees, setRefreshFees] = useState(0);
  const [editingSchedule, setEditingSchedule] = useState<AdminRplSchedule | "new" | null>(null);
  const [editingFee, setEditingFee] = useState<AdminRplFee | "new" | null>(null);

  // Settings state
  const [refreshSettings, setRefreshSettings] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newBenefitInput, setNewBenefitInput] = useState("");
  const [settingsForm, setSettingsForm] = useState<RplSettingsInput>({
    heroEyebrow: "JALUR PENERIMAAN MAHASISWA BARU",
    heroTitle: "Raih Sarjana dengan Pengalaman Kerja",
    heroDescription:
      "Merupakan jalur penerimaan mahasiswa baru yang memberikan kesempatan kepada calon mahasiswa untuk mendapatkan pengakuan atas pembelajaran yang telah diperoleh sebelumnya, baik melalui pengalaman kerja, pendidikan formal, informal, maupun nonformal",
    heroArtMark: "RPL",
    heroArtCaption: "PENGALAMANMU\nPUNYA NILAI",
    sectionEyebrow: "JALUR RPL",
    sectionTitle: "Rekognisi Pembelajaran Lampau (RPL)",
    benefits: ["Lulus lebih cepat", "Kuliah fleksibel", "Hemat biaya"],
    scheduleNote: "Awal perkuliahan dilaksanakan bulan September 2026 pada:",
    registrationDeadline: "31 Juli 2026",
    registrationUrl: "https://pmb.universitaslia.ac.id/home",
    transferCreditTitle: "Transfer Kredit",
    transferCreditDescription:
      "Persyaratan dan dokumen untuk Transfer Kredit mengikuti hasil evaluasi terhadap pendidikan dan capaian pembelajaran sebelumnya.",
  });

  // Queries
  const stepsList = useApi(`rpl-steps-${stepStatus}-${stepSearch}-${refreshSteps}`, () =>
    rplAdminApi.listSteps({ status: stepStatus, search: stepSearch, limit: PAGE_LIMIT })
  );

  const reqsList = useApi(
    `rpl-reqs-${reqType}-${reqStatus}-${reqSearch}-${refreshReqs}`,
    () =>
      rplAdminApi.listRequirements({
        type: reqType,
        status: reqStatus,
        search: reqSearch,
        limit: 100,
      })
  );

  const schedulesList = useApi(`rpl-schedules-${refreshSchedules}`, () =>
    rplAdminApi.listSchedules()
  );

  const feesList = useApi(`rpl-fees-${refreshFees}`, () => rplAdminApi.listFees());

  const settingsData = useApi(`rpl-settings-${refreshSettings}`, () =>
    rplAdminApi.getSettings()
  );

  useEffect(() => {
    if (settingsData.data) {
      setSettingsForm({
        heroEyebrow: settingsData.data.heroEyebrow,
        heroTitle: settingsData.data.heroTitle,
        heroDescription: settingsData.data.heroDescription,
        heroArtMark: settingsData.data.heroArtMark,
        heroArtCaption: settingsData.data.heroArtCaption,
        sectionEyebrow: settingsData.data.sectionEyebrow,
        sectionTitle: settingsData.data.sectionTitle,
        benefits: settingsData.data.benefits || ["Lulus lebih cepat", "Kuliah fleksibel", "Hemat biaya"],
        scheduleNote: settingsData.data.scheduleNote,
        registrationDeadline: settingsData.data.registrationDeadline,
        registrationUrl: settingsData.data.registrationUrl,
        transferCreditTitle: settingsData.data.transferCreditTitle,
        transferCreditDescription: settingsData.data.transferCreditDescription,
      });
    }
  }, [settingsData.data]);

  // Actions
  async function handleDeleteStep(item: AdminRplStep) {
    if (!window.confirm(`Hapus alur "${item.title}"?`)) return;
    try {
      setActionError(null);
      await rplAdminApi.removeStep(item.id);
      setNotice(`Tahapan "${item.title}" berhasil dihapus.`);
      setRefreshSteps((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleToggleStepStatus(item: AdminRplStep) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await rplAdminApi.updateStep(item.id, { status: nextStatus });
      setRefreshSteps((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleDeleteReq(item: AdminRplRequirement) {
    if (!window.confirm(`Hapus data ${item.type === "syarat" ? "syarat" : "dokumen"} ini?`)) return;
    try {
      setActionError(null);
      await rplAdminApi.removeRequirement(item.id);
      setNotice(`Data berhasil dihapus.`);
      setRefreshReqs((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleToggleReqStatus(item: AdminRplRequirement) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await rplAdminApi.updateRequirement(item.id, { status: nextStatus });
      setRefreshReqs((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleDeleteSchedule(item: AdminRplSchedule) {
    if (!window.confirm(`Hapus jadwal hari "${item.day}"?`)) return;
    try {
      setActionError(null);
      await rplAdminApi.removeSchedule(item.id);
      setNotice(`Jadwal "${item.day}" berhasil dihapus.`);
      setRefreshSchedules((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleDeleteFee(item: AdminRplFee) {
    if (!window.confirm(`Hapus komponen biaya "${item.type}"?`)) return;
    try {
      setActionError(null);
      await rplAdminApi.removeFee(item.id);
      setNotice(`Biaya "${item.type}" berhasil dihapus.`);
      setRefreshFees((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await rplAdminApi.updateSettings(settingsForm);
      setNotice("Pengaturan teks & tautan jalur RPL berhasil diperbarui.");
      setRefreshSettings((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  const handleAddBenefit = () => {
    const trimmed = newBenefitInput.trim();
    if (!trimmed) return;
    setSettingsForm((cur) => ({
      ...cur,
      benefits: [...(cur.benefits || []), trimmed],
    }));
    setNewBenefitInput("");
  };

  const handleRemoveBenefit = (index: number) => {
    setSettingsForm((cur) => ({
      ...cur,
      benefits: (cur.benefits || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <section className="aa-page pmb-admin-editor">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Jalur RPL (Rekognisi Pembelajaran Lampau)</h1>
          <p className="aa-subtitle">
            Kelola alur pendaftaran, persyaratan & dokumen berkas, jadwal perkuliahan, rincian biaya, serta informasi pengantar halaman RPL.
          </p>
        </div>
        <div>
          {activeTab === "steps" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setEditingStep("new")}
              type="button"
            >
              + Tambah Alur
            </button>
          )}
          {activeTab === "requirements" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setEditingReq("new")}
              type="button"
            >
              + Tambah Syarat / Dokumen
            </button>
          )}
        </div>
      </header>

      {/* Tabs Menu */}
      <nav aria-label="Tab Menu Jalur RPL" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "steps" ? "is-active" : ""}`}
          onClick={() => setActiveTab("steps")}
          type="button"
        >
          Alur Pendaftaran
        </button>
        <button
          className={`aa-tab ${activeTab === "requirements" ? "is-active" : ""}`}
          onClick={() => setActiveTab("requirements")}
          type="button"
        >
          Persyaratan & Dokumen
        </button>
        <button
          className={`aa-tab ${activeTab === "schedules-fees" ? "is-active" : ""}`}
          onClick={() => setActiveTab("schedules-fees")}
          type="button"
        >
          Jadwal & Biaya Kuliah
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Header & Teks Umum
        </button>
      </nav>

      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)} role="status">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="aa-error" role="alert">
          {actionError}
        </p>
      )}

      {/* ================= TAB 1: ALUR PENDAFTARAN (STEPS) ================= */}
      {activeTab === "steps" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari alur"
              onChange={(e) => setStepSearchInput(e.target.value)}
              placeholder="Cari judul alur atau deskripsi..."
              type="search"
              value={stepSearchInput}
            />
            <select
              aria-label="Filter status"
              onChange={(e) => setStepStatus(e.target.value as PublishStatus | "")}
              value={stepStatus}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {stepsList.error && !stepsList.data ? (
            <p className="aa-error">{errorMessage(stepsList.error)}</p>
          ) : stepsList.loading && !stepsList.data ? (
            <p className="aa-empty">Memuat daftar alur pendaftaran...</p>
          ) : (stepsList.data?.items?.length ?? 0) === 0 ? (
            <p className="aa-empty">Belum ada alur pendaftaran. Tambahkan yang pertama!</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: "8%", textAlign: "center" }}>Tahap</th>
                    <th style={{ width: "27%" }}>Judul Alur</th>
                    <th style={{ width: "40%" }}>Keterangan / Instruksi</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Status</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(stepsList.data?.items || []).map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {String(s.sortOrder || idx + 1).padStart(2, "0")}
                      </td>
                      <td>
                        <strong>{s.title}</strong>
                      </td>
                      <td>
                        <span style={{ color: "#475569", fontSize: "0.875rem" }}>{s.description}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`aa-badge ${s.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}
                          onClick={() => handleToggleStepStatus(s)}
                          style={{ cursor: "pointer", border: "none" }}
                          type="button"
                        >
                          {s.status === "published" ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="aa-btn aa-btn-secondary"
                            onClick={() => setEditingStep(s)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="aa-btn aa-btn-danger"
                            onClick={() => handleDeleteStep(s)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ================= TAB 2: PERSYARATAN & DOKUMEN ================= */}
      {activeTab === "requirements" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari syarat atau dokumen"
              onChange={(e) => setReqSearchInput(e.target.value)}
              placeholder="Cari uraian syarat atau nama berkas..."
              type="search"
              value={reqSearchInput}
            />
            <select
              aria-label="Filter kategori"
              onChange={(e) => setReqType(e.target.value as "syarat" | "dokumen" | "")}
              value={reqType}
            >
              <option value="">Semua Kategori</option>
              <option value="syarat">Syarat Pendaftaran</option>
              <option value="dokumen">Dokumen Pendaftaran</option>
            </select>
            <select
              aria-label="Filter status"
              onChange={(e) => setReqStatus(e.target.value as PublishStatus | "")}
              value={reqStatus}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {reqsList.error && !reqsList.data ? (
            <p className="aa-error">{errorMessage(reqsList.error)}</p>
          ) : reqsList.loading && !reqsList.data ? (
            <p className="aa-empty">Memuat daftar syarat & dokumen...</p>
          ) : (reqsList.data?.items?.length ?? 0) === 0 ? (
            <p className="aa-empty">Belum ada data syarat atau dokumen yang sesuai.</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: "15%" }}>Kategori</th>
                    <th style={{ width: "55%" }}>Uraian Persyaratan / Dokumen</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Urutan</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Status</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(reqsList.data?.items || []).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: r.type === "syarat" ? "#e0e7ff" : "#fef3c7",
                            color: r.type === "syarat" ? "#3730a3" : "#92400e",
                          }}
                        >
                          {r.type === "syarat" ? "Syarat" : "Dokumen"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.9rem" }}>{r.title}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>{r.sortOrder}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`aa-badge ${r.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}
                          onClick={() => handleToggleReqStatus(r)}
                          style={{ cursor: "pointer", border: "none" }}
                          type="button"
                        >
                          {r.status === "published" ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="aa-btn aa-btn-secondary"
                            onClick={() => setEditingReq(r)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="aa-btn aa-btn-danger"
                            onClick={() => handleDeleteReq(r)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ================= TAB 3: JADWAL & BIAYA PERKULIAHAN ================= */}
      {activeTab === "schedules-fees" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Section 1: Jadwal */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
                  Jadwal Hari & Jam Perkuliahan
                </h2>
                <span className="aa-help">Jadwal fleksibel untuk mahasiswa kelas pekerja.</span>
              </div>
              <button
                className="aa-btn aa-btn-primary"
                onClick={() => setEditingSchedule("new")}
                type="button"
              >
                + Tambah Jadwal Hari
              </button>
            </div>

            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Hari</th>
                    <th style={{ width: "45%" }}>Jam Kuliah</th>
                    <th style={{ width: "15%", textAlign: "center" }}>Urutan</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(schedulesList.data || []).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.day}</strong>
                      </td>
                      <td>{s.hours}</td>
                      <td style={{ textAlign: "center" }}>{s.sortOrder}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="aa-btn aa-btn-secondary"
                            onClick={() => setEditingSchedule(s)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="aa-btn aa-btn-danger"
                            onClick={() => handleDeleteSchedule(s)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(schedulesList.data?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>
                        Belum ada jadwal perkuliahan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Biaya */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
                  Komponen Biaya RPL
                </h2>
                <span className="aa-help">Rincian biaya pendaftaran, asesmen, dan biaya kuliah.</span>
              </div>
              <button
                className="aa-btn aa-btn-primary"
                onClick={() => setEditingFee("new")}
                type="button"
              >
                + Tambah Biaya
              </button>
            </div>

            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Jenis Biaya</th>
                    <th style={{ width: "35%" }}>Nominal</th>
                    <th style={{ width: "15%", textAlign: "center" }}>Urutan</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(feesList.data || []).map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.type}</strong>
                      </td>
                      <td>{f.amount}</td>
                      <td style={{ textAlign: "center" }}>{f.sortOrder}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="aa-btn aa-btn-secondary"
                            onClick={() => setEditingFee(f)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="aa-btn aa-btn-danger"
                            onClick={() => handleDeleteFee(f)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(feesList.data?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>
                        Belum ada data komponen biaya.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PENGATURAN HEADER & TEKS UMUM ================= */}
      {activeTab === "settings" && (
        <form className="aa-form" onSubmit={handleSaveSettings} style={{ maxWidth: 760 }}>
          <section className="aa-settings-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
              Teks Pengantar Hero
            </h2>

            <div>
              <label htmlFor="rpl-hero-eyebrow">Eyebrow Hero</label>
              <input
                id="rpl-hero-eyebrow"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroEyebrow: e.target.value }))}
                type="text"
                value={settingsForm.heroEyebrow ?? ""}
              />
            </div>

            <div>
              <label htmlFor="rpl-hero-title">Judul Hero</label>
              <input
                id="rpl-hero-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroTitle: e.target.value }))}
                type="text"
                value={settingsForm.heroTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="rpl-hero-desc">Deskripsi Hero</label>
              <textarea
                id="rpl-hero-desc"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroDescription: e.target.value }))}
                rows={3}
                value={settingsForm.heroDescription ?? ""}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label htmlFor="rpl-art-mark">Badge / Singkatan Hero Art</label>
                <input
                  id="rpl-art-mark"
                  onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroArtMark: e.target.value }))}
                  type="text"
                  value={settingsForm.heroArtMark ?? ""}
                />
              </div>
              <div>
                <label htmlFor="rpl-art-caption">Caption Art Hero</label>
                <input
                  id="rpl-art-caption"
                  onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroArtCaption: e.target.value }))}
                  type="text"
                  value={settingsForm.heroArtCaption ?? ""}
                />
              </div>
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Informasi Umum & Jadwal
            </h2>

            <div>
              <label htmlFor="rpl-sec-title">Judul Bagian Rincian</label>
              <input
                id="rpl-sec-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, sectionTitle: e.target.value }))}
                type="text"
                value={settingsForm.sectionTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="rpl-sched-note">Catatan Jadwal Kuliah</label>
              <input
                id="rpl-sched-note"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, scheduleNote: e.target.value }))}
                placeholder="Contoh: Awal perkuliahan dilaksanakan bulan September 2026 pada:"
                type="text"
                value={settingsForm.scheduleNote ?? ""}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label htmlFor="rpl-deadline">Batas Pendaftaran</label>
                <input
                  id="rpl-deadline"
                  onChange={(e) =>
                    setSettingsForm((cur) => ({ ...cur, registrationDeadline: e.target.value }))
                  }
                  placeholder="Contoh: 31 Juli 2026"
                  type="text"
                  value={settingsForm.registrationDeadline ?? ""}
                />
              </div>

              <div>
                <label htmlFor="rpl-url">URL Portal Pendaftaran</label>
                <input
                  id="rpl-url"
                  onChange={(e) => setSettingsForm((cur) => ({ ...cur, registrationUrl: e.target.value }))}
                  placeholder="https://pmb.universitaslia.ac.id/home"
                  type="url"
                  value={settingsForm.registrationUrl ?? ""}
                />
              </div>
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Keunggulan Jalur RPL (Benefits)
            </h2>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                onChange={(e) => setNewBenefitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddBenefit();
                  }
                }}
                placeholder="Tambah poin keunggulan..."
                style={{ flex: 1 }}
                type="text"
                value={newBenefitInput}
              />
              <button className="aa-btn aa-btn-secondary" onClick={handleAddBenefit} type="button">
                + Tambah
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {(settingsForm.benefits || []).map((b, idx) => (
                <span
                  key={idx}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.6rem",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                  }}
                >
                  {b}
                  <button
                    onClick={() => handleRemoveBenefit(idx)}
                    style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Informasi Transfer Kredit
            </h2>

            <div>
              <label htmlFor="rpl-transfer-title">Judul Transfer Kredit</label>
              <input
                id="rpl-transfer-title"
                onChange={(e) =>
                  setSettingsForm((cur) => ({ ...cur, transferCreditTitle: e.target.value }))
                }
                type="text"
                value={settingsForm.transferCreditTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="rpl-transfer-desc">Deskripsi Transfer Kredit</label>
              <textarea
                id="rpl-transfer-desc"
                onChange={(e) =>
                  setSettingsForm((cur) => ({ ...cur, transferCreditDescription: e.target.value }))
                }
                rows={3}
                value={settingsForm.transferCreditDescription ?? ""}
              />
            </div>

            <div style={{ marginTop: "1rem" }}>
              <button className="aa-btn aa-btn-primary" disabled={savingSettings} type="submit">
                {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </section>
        </form>
      )}

      {/* Modals */}
      {editingStep && (
        <StepModal
          onClose={() => setEditingStep(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshSteps((n) => n + 1);
          }}
          step={editingStep === "new" ? null : editingStep}
        />
      )}

      {editingReq && (
        <RequirementModal
          defaultType={reqType || "dokumen"}
          item={editingReq === "new" ? null : editingReq}
          onClose={() => setEditingReq(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshReqs((n) => n + 1);
          }}
        />
      )}

      {editingSchedule && (
        <ScheduleModal
          onClose={() => setEditingSchedule(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshSchedules((n) => n + 1);
          }}
          schedule={editingSchedule === "new" ? null : editingSchedule}
        />
      )}

      {editingFee && (
        <FeeModal
          fee={editingFee === "new" ? null : editingFee}
          onClose={() => setEditingFee(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshFees((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

