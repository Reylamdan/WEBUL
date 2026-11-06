"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function UkmCta() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section aria-labelledby="ukm-cta-title" className="ukm-cta-section">
        <div className="ukm-cta-card">
          <div className="ukm-cta-content">
            <h3 className="ukm-cta-title" id="ukm-cta-title">
              Tertarik bergabung dengan UKM?
            </h3>
            <p className="ukm-cta-desc">
              Informasi kontak, jadwal open recruitment, dan tautan pendaftaran akan ditambahkan di sini.
            </p>
          </div>

          <div className="ukm-cta-action">
            <button
              className="ukm-cta-button"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              Informasi Pendaftaran
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
                  Pendaftaran Kegiatan Mahasiswa (UKM)
                </h4>
                <p className="ukm-modal-subtitle">
                  Informasi Open Recruitment Universitas LIA
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
                <p>
                  Pendaftaran terbuka untuk mahasiswa baru dan aktif pada awal Semester Ganjil dan Genap setiap tahun akademik.
                </p>
              </div>

              <div className="ukm-modal-item">
                <div className="ukm-modal-item-title">
                  <Icon name="graduate" size={16} />
                  <span>Persyaratan Pendaftaran</span>
                </div>
                <p>
                  Mahasiswa aktif Universitas LIA dengan komitmen mengikuti pelatihan rutin dan kegiatan ormawa.
                </p>
              </div>

              <div className="ukm-modal-item">
                <div className="ukm-modal-item-title">
                  <Icon name="message" size={16} />
                  <span>Kontak Kemahasiswaan</span>
                </div>
                <p>
                  Untuk informasi selengkapnya, hubungi Bagian Kemahasiswaan melalui email:{" "}
                  <a className="ukm-modal-link" href="mailto:kemahasiswaan@universitaslia.ac.id">
                    kemahasiswaan@universitaslia.ac.id
                  </a>{" "}
                  atau Biro Humas.
                </p>
              </div>
            </div>

            <div className="ukm-modal-footer">
              <button
                className="ukm-modal-btn-primary"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

