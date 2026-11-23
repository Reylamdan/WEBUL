import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteBreadcrumb, SiteFooter, SiteHeader } from "@/components/site-shell";
import { VirtualAssistant } from "@/components/virtual-assistant";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Universitas LIA — Empowering Minds, Inspiring Futures",
  description:
    "Temukan program studi, kehidupan kampus, dan informasi penerimaan mahasiswa baru Universitas LIA.",
  icons: {
    icon: "/logo-lia.png",
  },
};

// Berjalan SINKRON di <head>, sebelum browser mencat HTML Indonesia dari server. Jika pengunjung
// memilih EN, seluruh halaman disembunyikan sampai SiteTranslator selesai menerjemahkan.
// Pengaman: jika hydration/terjemahan gagal, halaman tetap ditampilkan setelah 7 detik.
const ANTI_FLASH_SCRIPT = `(function(){try{if(window.localStorage.getItem("lia-content-lang")==="en"){var d=document.documentElement;d.setAttribute("data-lia-translating","all");setTimeout(function(){if(d.getAttribute("data-lia-translating")==="all")d.removeAttribute("data-lia-translating")},7000)}}catch(e){}})();`;

const ANTI_FLASH_CSS = `html[data-lia-translating="all"] body{opacity:0!important;transition:none!important}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${inter.className} font-sans h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: ANTI_FLASH_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col font-sans`}>
        <SiteHeader />
        {children}
        <SiteFooter />
        <VirtualAssistant />
      </body>
    </html>
  );
}