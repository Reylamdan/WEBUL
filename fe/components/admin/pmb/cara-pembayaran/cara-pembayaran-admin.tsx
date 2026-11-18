"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage } from "@/lib/api";
import { useApi, useDebouncedValue } from "@/lib/use-api";
import {
  paymentGuideAdminApi,
  type AdminPaymentChannel,
  type AdminPaymentVaStep,
  type PaymentChannelInput,
  type PaymentGuideSettingsInput,
  type PaymentVaStepInput,
  type PublishStatus,
} from "@/lib/payment-guide-admin-api";

const PAGE_LIMIT = 20;

// ================= Modal Kanal Pembayaran =================
function ChannelModal({
  channel,
  onClose,
  onSaved,
}: {
  channel: AdminPaymentChannel | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<PaymentChannelInput>({
    channelId: channel?.channelId ?? "",
    name: channel?.name ?? "",
    steps: channel?.steps ? [...channel.steps] : [""],
    note: channel?.note ?? "",
    technicalNoteTitle: channel?.technicalNoteTitle ?? "",
    technicalNote: channel?.technicalNote ?? "",
    sortOrder: channel?.sortOrder ?? 0,
    status: channel?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddStep = () => {
    setForm((cur) => ({ ...cur, steps: [...cur.steps, ""] }));
  };

  const handleUpdateStep = (index: number, val: string) => {
    setForm((cur) => {
      const next = [...cur.steps];
      next[index] = val;
      return { ...cur, steps: next };
    });
  };

  const handleRemoveStep = (index: number) => {
    setForm((cur) => ({ ...cur, steps: cur.steps.filter((_, i) => i !== index) }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama kanal pembayaran wajib diisi.");
      return;
    }
    if (!form.channelId.trim()) {
      setError("ID / Slug kanal pembayaran wajib diisi.");
      return;
    }

    const validSteps = form.steps.map((s) => s.trim()).filter((s) => s.length > 0);
    if (validSteps.length === 0) {
      setError("Kanal pembayaran minimal harus memiliki satu langkah pembayaran.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: PaymentChannelInput = {
        ...form,
        channelId: form.channelId.trim().toLowerCase().replace(/\s+/g, "-"),
        name: form.name.trim(),
        steps: validSteps,
        note: form.note?.trim() || null,
        technicalNoteTitle: form.technicalNoteTitle?.trim() || null,
        technicalNote: form.technicalNote?.trim() || null,
      };

      if (channel) {
        await paymentGuideAdminApi.updateChannel(channel.id, payload);
        onSaved(`Kanal "${form.name}" berhasil diperbarui.`);
      } else {
        await paymentGuideAdminApi.createChannel(payload);
        onSaved(`Kanal "${form.name}" berhasil ditambahkan.`);
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
      <div className="aa-modal aa-modal-large" style={{ maxWidth: 720 }}>
        <header className="aa-modal-header">
          <h2 className="aa-modal-title">
            {channel ? "Edit Kanal Pembayaran" : "Tambah Kanal Pembayaran"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-name`}>
                Nama Kanal Pembayaran <span className="aa-required">*</span>
              </label>
              <input
                id={`${uid}-name`}
                onChange={(e) => setForm((cur) => ({ ...cur, name: e.target.value }))}
                placeholder="Contoh: Pembayaran melalui ATM Mandiri"
                required
                type="text"
                value={form.name}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-id`}>
                ID / Slug Kanal <span className="aa-required">*</span>
              </label>
              <input
                id={`${uid}-id`}
                onChange={(e) => setForm((cur) => ({ ...cur, channelId: e.target.value }))}
                placeholder="Contoh: atm-mandiri"
                required
                type="text"
                value={form.channelId}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-sort`}>Urutan Tampilan</label>
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

          {/* Langkah-langkah instruksi */}
          <div style={{ marginTop: "0.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ margin: 0, fontWeight: 600 }}>
                Langkah-langkah Pembayaran <span className="aa-required">*</span>
              </label>
              <button
                className="aa-btn aa-btn-secondary"
                onClick={handleAddStep}
                style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                type="button"
              >
                + Tambah Langkah
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
              {form.steps.map((st, idx) => (
                <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: "28px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      color: "#64748b",
                      fontSize: "0.85rem",
                    }}
                  >
                    {idx + 1}.
                  </span>
                  <textarea
                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                    placeholder={`Instruksi langkah ke-${idx + 1}`}
                    required
                    rows={2}
                    style={{ flex: 1 }}
                    value={st}
                  />
                  {form.steps.length > 1 && (
                    <button
                      aria-label={`Hapus langkah ${idx + 1}`}
                      className="aa-btn aa-btn-danger"
                      onClick={() => handleRemoveStep(idx)}
                      style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", alignSelf: "center" }}
                      type="button"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Catatan Tambahan (Opsional) */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
            <label htmlFor={`${uid}-note`}>Catatan Khusus (Opsional)</label>
            <input
              id={`${uid}-note`}
              onChange={(e) => setForm((cur) => ({ ...cur, note: e.target.value }))}
              placeholder="Contoh: Pastikan memilih metode/layanan transfer ONLINE (BUKAN RTGS)."
              type="text"
              value={form.note ?? ""}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1rem" }}>
            <div>
              <label htmlFor={`${uid}-tech-title`}>Judul Catatan Teknis (Opsional)</label>
              <input
                id={`${uid}-tech-title`}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, technicalNoteTitle: e.target.value }))
                }
                placeholder="Contoh: Ketentuan nominal pembayaran"
                type="text"
                value={form.technicalNoteTitle ?? ""}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-tech-desc`}>Isi Catatan Teknis (Opsional)</label>
              <textarea
                id={`${uid}-tech-desc`}
                onChange={(e) => setForm((cur) => ({ ...cur, technicalNote: e.target.value }))}
                placeholder="Contoh: Saat menginput nominal tagihan pada Mobile Banking bank lain..."
                rows={2}
                value={form.technicalNote ?? ""}
              />
            </div>
          </div>

          <footer className="aa-modal-footer">
            <button className="aa-btn aa-btn-secondary" onClick={onClose} type="button">
              Batal
            </button>
            <button className="aa-btn aa-btn-primary" disabled={saving} type="submit">
              {saving ? "Menyimpan..." : channel ? "Simpan Perubahan" : "Tambah Kanal"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Modal Langkah SiAkad (VA Step) =================
function VaStepModal({
  step,
  onClose,
  onSaved,
}: {
  step: AdminPaymentVaStep | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const uid = useId();
  const [form, setForm] = useState<PaymentVaStepInput>({
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
      setError("Judul langkah SiAkad wajib diisi.");
      return;
    }
    if (!form.description.trim()) {
      setError("Deskripsi langkah SiAkad wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (step) {
        await paymentGuideAdminApi.updateVaStep(step.id, form);
        onSaved(`Langkah "${form.title}" berhasil diperbarui.`);
      } else {
        await paymentGuideAdminApi.createVaStep(form);
        onSaved(`Langkah "${form.title}" berhasil ditambahkan.`);
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
            {step ? "Edit Langkah SiAkad" : "Tambah Langkah SiAkad"}
          </h2>
          <button className="aa-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <form className="aa-form" onSubmit={submit}>
          {error && <p className="aa-error">{error}</p>}
          <div>
            <label htmlFor={`${uid}-title`}>
              Judul Langkah <span className="aa-required">*</span>
            </label>
            <input
              id={`${uid}-title`}
              onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))}
              placeholder="Contoh: Login SiAkad"
              required
              type="text"
              value={form.title}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-desc`}>
              Deskripsi Instruksi <span className="aa-required">*</span>
            </label>
            <textarea
              id={`${uid}-desc`}
              onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
              placeholder="Contoh: Login pada sistem informasi akademik kampus."
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
              {saving ? "Menyimpan..." : step ? "Simpan Perubahan" : "Tambah Langkah"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ================= Komponen Utama CaraPembayaranAdmin =================

export function CaraPembayaranAdmin() {
  const [activeTab, setActiveTab] = useState<"channels" | "va-steps" | "settings">("channels");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Channels state
  const [channelSearchInput, setChannelSearchInput] = useState("");
  const channelSearch = useDebouncedValue(channelSearchInput, 400);
  const [channelStatus, setChannelStatus] = useState<PublishStatus | "">("");
  const [refreshChannels, setRefreshChannels] = useState(0);
  const [editingChannel, setEditingChannel] = useState<AdminPaymentChannel | "new" | null>(null);

  // VA Steps state
  const [stepSearchInput, setStepSearchInput] = useState("");
  const stepSearch = useDebouncedValue(stepSearchInput, 400);
  const [stepStatus, setStepStatus] = useState<PublishStatus | "">("");
  const [refreshSteps, setRefreshSteps] = useState(0);
  const [editingStep, setEditingStep] = useState<AdminPaymentVaStep | "new" | null>(null);

  // Settings state
  const [refreshSettings, setRefreshSettings] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<PaymentGuideSettingsInput>({
    heroEyebrow: "INFORMASI PEMBAYARAN",
    heroTitle: "Cara Pembayaran",
    heroDescription:
      "Ikuti panduan berikut untuk membuat kode Virtual Account dari SiAkad dan membayar tagihan kuliah melalui berbagai kanal pembayaran.",
    vaSectionEyebrow: "PANDUAN SIAKAD",
    vaSectionTitle: "Generated kode bayar atau Virtual Account (VA)",
    vaSectionDescription:
      "Buat kode pembayaran melalui menu Riwayat Keuangan di sistem informasi akademik.",
    vaImage1Url: "/Screenshot%20from%202026-11-10%2009-21-35.png",
    vaImage1Alt: "Menu profil SiAkad dengan pilihan Tagihan Mahasiswa",
    vaImage1Caption: "Buka menu profil, lalu pilih Tagihan Mahasiswa untuk melihat tagihan.",
    vaImage2Url: "/Screenshot%20from%202026-11-10%2009-21-49.png",
    vaImage2Alt: "Halaman Riwayat Keuangan dengan metode pembayaran Mandiri dan tombol Bayar Tagihan",
    vaImage2Caption: "Pada halaman keuangan, pilih metode pembayaran dan klik Bayar Tagihan.",
    methodsSectionEyebrow: "PILIH KANAL PEMBAYARAN",
    methodsSectionTitle: "Panduan pembayaran",
    methodsSectionDescription:
      "Gunakan kode bayar atau nomor Virtual Account yang sudah diterbitkan melalui SiAkad.",
  });

  // Queries
  const channelsList = useApi(
    `payment-channels-${channelStatus}-${channelSearch}-${refreshChannels}`,
    () =>
      paymentGuideAdminApi.listChannels({
        status: channelStatus,
        search: channelSearch,
        limit: PAGE_LIMIT,
      })
  );

  const stepsList = useApi(`payment-steps-${stepStatus}-${stepSearch}-${refreshSteps}`, () =>
    paymentGuideAdminApi.listVaSteps({
      status: stepStatus,
      search: stepSearch,
      limit: PAGE_LIMIT,
    })
  );

  const settingsData = useApi(`payment-settings-${refreshSettings}`, () =>
    paymentGuideAdminApi.getSettings()
  );

  useEffect(() => {
    if (settingsData.data) {
      setSettingsForm({
        heroEyebrow: settingsData.data.heroEyebrow,
        heroTitle: settingsData.data.heroTitle,
        heroDescription: settingsData.data.heroDescription,
        vaSectionEyebrow: settingsData.data.vaSectionEyebrow,
        vaSectionTitle: settingsData.data.vaSectionTitle,
        vaSectionDescription: settingsData.data.vaSectionDescription,
        vaImage1Url: settingsData.data.vaImage1Url,
        vaImage1Alt: settingsData.data.vaImage1Alt,
        vaImage1Caption: settingsData.data.vaImage1Caption,
        vaImage2Url: settingsData.data.vaImage2Url,
        vaImage2Alt: settingsData.data.vaImage2Alt,
        vaImage2Caption: settingsData.data.vaImage2Caption,
        methodsSectionEyebrow: settingsData.data.methodsSectionEyebrow,
        methodsSectionTitle: settingsData.data.methodsSectionTitle,
        methodsSectionDescription: settingsData.data.methodsSectionDescription,
      });
    }
  }, [settingsData.data]);

  // Actions
  async function handleDeleteChannel(item: AdminPaymentChannel) {
    if (!window.confirm(`Hapus kanal "${item.name}"?`)) return;
    try {
      setActionError(null);
      await paymentGuideAdminApi.removeChannel(item.id);
      setNotice(`Kanal "${item.name}" berhasil dihapus.`);
      setRefreshChannels((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleToggleChannelStatus(item: AdminPaymentChannel) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await paymentGuideAdminApi.updateChannel(item.id, { status: nextStatus });
      setRefreshChannels((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleDeleteStep(item: AdminPaymentVaStep) {
    if (!window.confirm(`Hapus langkah SiAkad "${item.title}"?`)) return;
    try {
      setActionError(null);
      await paymentGuideAdminApi.removeVaStep(item.id);
      setNotice(`Langkah "${item.title}" berhasil dihapus.`);
      setRefreshSteps((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleToggleStepStatus(item: AdminPaymentVaStep) {
    const nextStatus: PublishStatus = item.status === "published" ? "draft" : "published";
    try {
      setActionError(null);
      await paymentGuideAdminApi.updateVaStep(item.id, { status: nextStatus });
      setRefreshSteps((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await paymentGuideAdminApi.updateSettings(settingsForm);
      setNotice("Pengaturan teks & gambar panduan pembayaran berhasil diperbarui.");
      setRefreshSettings((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <section className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Cara Pembayaran (Panduan VA & Bank)</h1>
          <p className="aa-subtitle">
            Kelola petunjuk generate kode Virtual Account di SiAkad, panduan pembayaran melalui berbagai kanal ATM/bank, serta gambar tangkapan layar pendukung.
          </p>
        </div>
        <div>
          {activeTab === "channels" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setEditingChannel("new")}
              type="button"
            >
              + Tambah Kanal Pembayaran
            </button>
          )}
          {activeTab === "va-steps" && (
            <button
              className="aa-btn aa-btn-primary"
              onClick={() => setEditingStep("new")}
              type="button"
            >
              + Tambah Langkah SiAkad
            </button>
          )}
        </div>
      </header>

      {/* Navigasi Tab */}
      <nav aria-label="Tab Menu Cara Pembayaran" className="aa-tabs">
        <button
          className={`aa-tab ${activeTab === "channels" ? "is-active" : ""}`}
          onClick={() => setActiveTab("channels")}
          type="button"
        >
          Kanal Pembayaran (Bank & ATM)
        </button>
        <button
          className={`aa-tab ${activeTab === "va-steps" ? "is-active" : ""}`}
          onClick={() => setActiveTab("va-steps")}
          type="button"
        >
          Panduan SiAkad (Generate VA)
        </button>
        <button
          className={`aa-tab ${activeTab === "settings" ? "is-active" : ""}`}
          onClick={() => setActiveTab("settings")}
          type="button"
        >
          Pengaturan Header & Screenshot
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

      {/* ================= TAB 1: KANAL PEMBAYARAN ================= */}
      {activeTab === "channels" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari kanal"
              onChange={(e) => setChannelSearchInput(e.target.value)}
              placeholder="Cari nama kanal atau ID..."
              type="search"
              value={channelSearchInput}
            />
            <select
              aria-label="Filter status"
              onChange={(e) => setChannelStatus(e.target.value as PublishStatus | "")}
              value={channelStatus}
            >
              <option value="">Semua status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {channelsList.error && !channelsList.data ? (
            <p className="aa-error">{errorMessage(channelsList.error)}</p>
          ) : channelsList.loading && !channelsList.data ? (
            <p className="aa-empty">Memuat daftar kanal pembayaran...</p>
          ) : (channelsList.data?.items?.length ?? 0) === 0 ? (
            <p className="aa-empty">Belum ada kanal pembayaran. Tambahkan yang pertama!</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: "8%", textAlign: "center" }}>No</th>
                    <th style={{ width: "32%" }}>Nama Kanal & ID</th>
                    <th style={{ width: "15%" }}>Jumlah Langkah</th>
                    <th style={{ width: "23%" }}>Catatan Tambahan</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Status</th>
                    <th style={{ width: "12%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(channelsList.data?.items || []).map((ch, idx) => (
                    <tr key={ch.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {String(ch.sortOrder || idx + 1).padStart(2, "0")}
                      </td>
                      <td>
                        <strong>{ch.name}</strong>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>ID: {ch.channelId}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                          {ch.steps?.length || 0} Langkah Instruksi
                        </span>
                      </td>
                      <td>
                        {ch.note ? (
                          <span style={{ fontSize: "0.8rem", color: "#b45309" }} title={ch.note}>
                            Ada catatan khusus
                          </span>
                        ) : ch.technicalNote ? (
                          <span style={{ fontSize: "0.8rem", color: "#0369a1" }}>Ada catatan teknis</span>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`aa-badge ${ch.status === "published" ? "aa-badge-published" : "aa-badge-draft"}`}
                          onClick={() => handleToggleChannelStatus(ch)}
                          style={{ cursor: "pointer", border: "none" }}
                          type="button"
                        >
                          {ch.status === "published" ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="aa-btn aa-btn-secondary"
                            onClick={() => setEditingChannel(ch)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="aa-btn aa-btn-danger"
                            onClick={() => handleDeleteChannel(ch)}
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

      {/* ================= TAB 2: PANDUAN SIAKAD (VA STEPS) ================= */}
      {activeTab === "va-steps" && (
        <>
          <div className="aa-filters">
            <input
              aria-label="Cari langkah"
              onChange={(e) => setStepSearchInput(e.target.value)}
              placeholder="Cari judul langkah SiAkad atau keterangan..."
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
            <p className="aa-empty">Memuat daftar langkah SiAkad...</p>
          ) : (stepsList.data?.items?.length ?? 0) === 0 ? (
            <p className="aa-empty">Belum ada langkah SiAkad.</p>
          ) : (
            <div className="aa-table-wrap">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th style={{ width: "8%", textAlign: "center" }}>Langkah</th>
                    <th style={{ width: "32%" }}>Judul Langkah</th>
                    <th style={{ width: "40%" }}>Keterangan Instruksi</th>
                    <th style={{ width: "8%", textAlign: "center" }}>Status</th>
                    <th style={{ width: "12%", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(stepsList.data?.items || []).map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {s.sortOrder || idx + 1}
                      </td>
                      <td>
                        <strong>{s.title}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.875rem", color: "#475569" }}>{s.description}</span>
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

      {/* ================= TAB 3: PENGATURAN HEADER & SCREENSHOT ================= */}
      {activeTab === "settings" && (
        <form className="aa-form" onSubmit={handleSaveSettings} style={{ maxWidth: 760 }}>
          <section className="aa-settings-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
              Teks Pengantar Hero
            </h2>

            <div>
              <label htmlFor="settings-hero-eyebrow">Eyebrow Hero</label>
              <input
                id="settings-hero-eyebrow"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroEyebrow: e.target.value }))}
                type="text"
                value={settingsForm.heroEyebrow ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-hero-title">Judul Utama Halaman</label>
              <input
                id="settings-hero-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroTitle: e.target.value }))}
                type="text"
                value={settingsForm.heroTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-hero-desc">Deskripsi Hero</label>
              <textarea
                id="settings-hero-desc"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, heroDescription: e.target.value }))}
                rows={3}
                value={settingsForm.heroDescription ?? ""}
              />
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Bagian 1: Panduan SiAkad (Generate VA)
            </h2>

            <div>
              <label htmlFor="settings-va-title">Judul Bagian SiAkad</label>
              <input
                id="settings-va-title"
                onChange={(e) => setSettingsForm((cur) => ({ ...cur, vaSectionTitle: e.target.value }))}
                type="text"
                value={settingsForm.vaSectionTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-va-desc">Deskripsi Bagian SiAkad</label>
              <textarea
                id="settings-va-desc"
                onChange={(e) =>
                  setSettingsForm((cur) => ({ ...cur, vaSectionDescription: e.target.value }))
                }
                rows={2}
                value={settingsForm.vaSectionDescription ?? ""}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "6px" }}>
                <strong style={{ fontSize: "0.9rem" }}>Screenshot SiAkad 1</strong>
                <div style={{ marginTop: "0.5rem" }}>
                  <label htmlFor="settings-img1-url" style={{ fontSize: "0.8rem" }}>Path / URL Gambar</label>
                  <input
                    id="settings-img1-url"
                    onChange={(e) => setSettingsForm((cur) => ({ ...cur, vaImage1Url: e.target.value }))}
                    type="text"
                    value={settingsForm.vaImage1Url ?? ""}
                  />
                </div>
                <div>
                  <label htmlFor="settings-img1-caption" style={{ fontSize: "0.8rem" }}>Keterangan (Caption)</label>
                  <input
                    id="settings-img1-caption"
                    onChange={(e) =>
                      setSettingsForm((cur) => ({ ...cur, vaImage1Caption: e.target.value }))
                    }
                    type="text"
                    value={settingsForm.vaImage1Caption ?? ""}
                  />
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "6px" }}>
                <strong style={{ fontSize: "0.9rem" }}>Screenshot SiAkad 2</strong>
                <div style={{ marginTop: "0.5rem" }}>
                  <label htmlFor="settings-img2-url" style={{ fontSize: "0.8rem" }}>Path / URL Gambar</label>
                  <input
                    id="settings-img2-url"
                    onChange={(e) => setSettingsForm((cur) => ({ ...cur, vaImage2Url: e.target.value }))}
                    type="text"
                    value={settingsForm.vaImage2Url ?? ""}
                  />
                </div>
                <div>
                  <label htmlFor="settings-img2-caption" style={{ fontSize: "0.8rem" }}>Keterangan (Caption)</label>
                  <input
                    id="settings-img2-caption"
                    onChange={(e) =>
                      setSettingsForm((cur) => ({ ...cur, vaImage2Caption: e.target.value }))
                    }
                    type="text"
                    value={settingsForm.vaImage2Caption ?? ""}
                  />
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>
              Bagian 2: Kanal Pembayaran (Bank & ATM)
            </h2>

            <div>
              <label htmlFor="settings-methods-title">Judul Bagian Kanal</label>
              <input
                id="settings-methods-title"
                onChange={(e) =>
                  setSettingsForm((cur) => ({ ...cur, methodsSectionTitle: e.target.value }))
                }
                type="text"
                value={settingsForm.methodsSectionTitle ?? ""}
              />
            </div>

            <div>
              <label htmlFor="settings-methods-desc">Deskripsi Bagian Kanal</label>
              <textarea
                id="settings-methods-desc"
                onChange={(e) =>
                  setSettingsForm((cur) => ({ ...cur, methodsSectionDescription: e.target.value }))
                }
                rows={2}
                value={settingsForm.methodsSectionDescription ?? ""}
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
      {editingChannel && (
        <ChannelModal
          channel={editingChannel === "new" ? null : editingChannel}
          onClose={() => setEditingChannel(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshChannels((n) => n + 1);
          }}
        />
      )}

      {editingStep && (
        <VaStepModal
          onClose={() => setEditingStep(null)}
          onSaved={(msg) => {
            setNotice(msg);
            setRefreshSteps((n) => n + 1);
          }}
          step={editingStep === "new" ? null : editingStep}
        />
      )}
    </section>
  );
}

