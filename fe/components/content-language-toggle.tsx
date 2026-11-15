"use client";

import { useContentLang } from "@/lib/content-language";

// Pengalih bahasa untuk konten berita/pengumuman. `pillClass` memakai kelas pil halaman pemakainya
// agar tampilannya sama dengan filter kategori di sebelahnya.
export function ContentLanguageToggle({ pillClass }: { pillClass: string }) {
  const [lang, setLang] = useContentLang();

  return (
    <div aria-label="Bahasa konten" className="content-lang-toggle" role="group">
      <span className="content-lang-label">Bahasa konten</span>
      {(["id", "en"] as const).map((option) => (
        <button
          aria-pressed={lang === option}
          className={`${pillClass} ${lang === option ? "is-active" : ""}`}
          key={option}
          onClick={() => setLang(option)}
          type="button"
        >
          {option === "id" ? "Indonesia" : "English"}
        </button>
      ))}
    </div>
  );
}
