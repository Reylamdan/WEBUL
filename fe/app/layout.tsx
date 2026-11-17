import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteBreadcrumb, SiteFooter, SiteHeader } from "@/components/site-shell";
import { VirtualAssistant } from "@/components/virtual-assistant";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono", 
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: ANTI_FLASH_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <SiteBreadcrumb />
        {children}
        <SiteFooter />
        <VirtualAssistant />
      </body>
    </html>
  );
}