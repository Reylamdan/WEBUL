import { AlumniHero, AlumniSection, AlumniCard } from "@/components/alumni";
import { Icon } from "@/components/icons";

export const metadata = {
  title: "Career Center - Universitas LIA",
  description: "Informasi lowongan kerja dan pengembangan karier bagi alumni Universitas LIA",
};

export default function CareerCenterPage() {
  return (
    <main>
      <AlumniHero
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Alumni", href: "/alumni" },
          { label: "Career Center" },
        ]}
        subtitle="Temukan informasi peluang karier dan langkah-langkah berikutnya dalam perjalanan profesional Anda."
        title="Career Center"
      />

      <AlumniSection
        eyebrow="CAREER CENTER"
        id="career-center-info"
        title="Pusat Pengembangan Karier"
      >
        <div className="profile-card col-span-full">
          <div className="profile-card-accent" />
          <div className="profile-card-body">
            <h3 className="profile-card-title">Cari Informasi Lowongan</h3>
            <div className="mt-4 flex gap-2">
              <input
                className="berita-search-input flex-1"
                placeholder="Cari posisi, perusahaan, atau kata kunci..."
                type="text"
              />
              <button className="button button-primary">
                Cari <Icon name="search" size={16} />
              </button>
            </div>
          </div>
        </div>

        <AlumniCard
          description="Akses daftar lowongan pekerjaan dari berbagai mitra perusahaan yang bekerja sama dengan Universitas LIA."
          title="Daftar Lowongan"
        />
        <AlumniCard
          description="Dapatkan panduan penyusunan CV, tips interview, dan strategi untuk bersaing di dunia kerja."
          title="Dukungan Karier"
        />
        <AlumniCard
          description="Layanan bagi perusahaan yang ingin mempublikasikan informasi lowongan kerja atau mencari talenta terbaik dari alumni LIA."
          title="Informasi untuk Perusahaan"
        />
        <AlumniCard
          description="Berita dan pengumuman terbaru seputar bursa kerja, seminar karier, dan pelatihan profesional."
          title="Catatan Informasi"
        />
      </AlumniSection>
    </main>
  );
}
