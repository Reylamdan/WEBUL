"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminIcon } from "@/components/admin/admin-icons";
import { ContentTab } from "./content-tab";
import { PhotosTab } from "./photos-tab";
import { VideosTab } from "./videos-tab";

type Tab = "content" | "photos" | "videos";

const TABS: { id: Tab; label: string }[] = [
  { id: "content", label: "Teks & Tautan" },
  { id: "photos", label: "Foto" },
  { id: "videos", label: "Video" },
];

export function BerandaAdmin() {
  const [tab, setTab] = useState<Tab>("content");
  const [notice, setNotice] = useState<string | null>(null);

  function switchTab(next: Tab) {
    setTab(next);
    setNotice(null);
  }

  return (
    <div className="aa-page">
      <header className="aa-header">
        <div>
          <h1 className="aa-title">Beranda</h1>
          <p className="aa-subtitle">
            Kelola isi halaman beranda: teks &amp; tautan tiap bagian, foto, dan video. Berita, pengumuman, dan agenda
            di beranda diambil otomatis dari menu masing-masing.
          </p>
        </div>
        <Link
          className="aa-btn"
          href="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          target="_blank"
        >
          <span>Lihat Beranda</span>
          <AdminIcon name="external" size={14} />
        </Link>
      </header>

      <div className="aa-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={`aa-tab${tab === item.id ? " is-active" : ""}`}
            key={item.id}
            onClick={() => switchTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="aa-notice" onClick={() => setNotice(null)}>
          ✓ {notice} <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 8 }}>(klik untuk menutup)</span>
        </p>
      )}

      {tab === "content" && <ContentTab onNotice={setNotice} />}
      {tab === "photos" && <PhotosTab onNotice={setNotice} />}
      {tab === "videos" && <VideosTab onNotice={setNotice} />}
    </div>
  );
}
