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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
