"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useApi } from "@/lib/use-api";
import { ukmApi } from "@/lib/api";

export function UkmCta() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data } = useApi("public-ukm", () => ukmApi.get());

  const s = data?.settings;
  const ctaTitle = s?.ctaTitle || "Tertarik bergabung dengan UKM?";
  const ctaDesc =
    s?.ctaDescription ||
    "Informasi kontak, jadwal open recruitment, dan tautan pendaftaran akan ditambahkan di sini.";
  const ctaButtonLabel = s?.ctaButtonLabel || "Informasi Pendaftaran";

  const modalTitle = s?.modalTitle || "Pendaftaran Kegiatan Mahasiswa (UKM)";
  const modalSubtitle = s?.modalSubtitle || "Informasi Open Recruitment Universitas LIA";
  const modalSchedule =
    s?.modalScheduleText ||
    "Pendaftaran terbuka untuk mahasiswa baru dan aktif pada awal Semester Ganjil dan Genap setiap tahun akademik.";
  const modalRequirements =
    s?.modalRequirementsText ||
    "Mahasiswa aktif Universitas LIA dengan komitmen mengikuti pelatihan rutin dan kegiatan ormawa.";
  const modalEmail = s?.modalContactEmail || "kemahasiswaan@universitaslia.ac.id";

  return (
    <>
      <section aria-labelledby="ukm-cta-title" className="ukm-cta-section">
        <div className="ukm-cta-card">
          <div className="ukm-cta-content">
            <h3 className="ukm-cta-title" id="ukm-cta-title">
              {ctaTitle}
            </h3>
            <p className="ukm-cta-desc">{ctaDesc}</p>
          </div>

          <div className="ukm-cta-action">
            <button
              className="ukm-cta-button"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              {ctaButtonLabel}
            </button>
          </div>
        </div>
      </section>

      {/* Info Modal */}
      {modalOpen && (
        <div
          aria-labelledby="ukm-modal-title"
          aria-modal="true"
          className="ukm-modal-backdrop"
          onClick={() => setModalOpen(false)}
          role="dialog"
        >
          <div
            className="ukm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ukm-modal-header">
              <div className="ukm-modal-header-icon">
                <Icon name="sparkle" size={20} />
              </div>
              <div>
                <h4 className="ukm-modal-title" id="ukm-modal-title">
                  {modalTitle}
                </h4>
                <p className="ukm-modal-subtitle">
                  {modalSubtitle}
                </p>
              </div>
              <button
                aria-label="Tutup jendela modal"
                className="ukm-modal-close"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="ukm-modal-body">
              <div className="ukm-modal-item">
                <div className="ukm-modal-item-title">
                  <Icon name="calendar" size={16} />
                  <span>Jadwal Open Recruitment</span>
                </div>
                <p>{modalSchedule}</p>
              </div>

              <div className="ukm-modal-item">
                <div className="ukm-modal-item-title">
                  <Icon name="graduate" size={16} />
                  <span>Persyaratan Pendaftaran</span>
                </div>
                <p>{modalRequirements}</p>
              </div>

              <div className="ukm-modal-item">
                <div className="ukm-modal-item-title">
                  <Icon name="message" size={16} />
                  <span>Kontak Kemahasiswaan</span>
                </div>
                <p>
                  Untuk informasi selengkapnya, hubungi Bagian Kemahasiswaan melalui email:{" "}
                  <a className="ukm-modal-link" href={`mailto:${modalEmail}`}>
                    {modalEmail}
                  </a>{" "}
                  atau Biro Humas.
                </p>
              </div>
            </div>

            <div className="ukm-modal-footer">
              <button
                className="ukm-modal-btn-close"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
