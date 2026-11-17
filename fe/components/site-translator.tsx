"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useContentLang } from "@/lib/content-language";

// Menerjemahkan SELURUH halaman (teks statis maupun dinamis) dari Indonesia ke Inggris memakai
// Google Website Translator. Bahasa dipilih lewat tombol ID/EN di header; pilihannya disimpan di
// store yang sama dengan konten berita/pengumuman (useContentLang), jadi:
//   - teks statis di semua halaman  -> diterjemahkan otomatis oleh Google Translate
//   - berita & pengumuman           -> tetap memakai terjemahan yang disetujui admin dari backend
//
// Cara kerja: Google membaca cookie `googtrans`. Saat bahasa berubah, cookie diatur lalu halaman
// dimuat ulang satu kali. Memuat ulang lebih stabil daripada mengganti bahasa tanpa reload,
// karena React dan Google sama-sama mengubah DOM.
//
// Google menerjemahkan SETELAH halaman tampil, sehingga teks Indonesia sempat terlihat. Untuk
// mencegahnya, halaman disembunyikan (opacity 0) sampai Google selesai menerjemahkan:
//   - muat pertama / reload : seluruh halaman disembunyikan ("all"); atribut sudah dipasang lebih
//                             awal oleh skrip kecil di <head> (lihat app/layout.tsx)
//   - pindah halaman        : hanya konten halaman yang disembunyikan ("page"); header dan footer
//                             yang sudah terjemahan tetap terlihat
// Ada batas waktu: jika terjemahan terlalu lama atau gagal, halaman tetap ditampilkan.

const COOKIE_NAME = "googtrans";
const COOKIE_VALUE_EN = "/id/en";
const CONTAINER_ID = "google-translate-element";
const SCRIPT_ID = "google-translate-script";
const INIT_CALLBACK = "__liaGoogleTranslateInit";
const RELOAD_GUARD_KEY = "lia-translate-reload";

const HIDE_ATTRIBUTE = "data-lia-translating";
// Halaman ditampilkan setelah tidak ada perubahan DOM sepanjang waktu ini (ms) sesudah Google
// mulai menerjemahkan. Naikkan jika masih ada teks Indonesia yang sempat terlihat.
const REVEAL_AFTER_QUIET_MS = 180;
// Batas maksimum halaman disembunyikan (ms), sebagai pengaman jika terjemahan gagal.
const MAX_HIDE_MS_FIRST_LOAD = 6000;
const MAX_HIDE_MS_NAVIGATION = 2500;

type HideMode = "all" | "page";

type TranslateElementConstructor = new (
  options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
  elementId: string,
) => unknown;

type TranslateWindow = Window & {
  google?: { translate?: { TranslateElement?: TranslateElementConstructor } };
  [INIT_CALLBACK]?: () => void;
};

// ---------- Cookie ----------

function hasEnglishCookie(): boolean {
  return document.cookie.split("; ").some((item) => {
    const separator = item.indexOf("=");
    if (separator === -1) return false;
    const name = item.slice(0, separator);
    const value = item.slice(separator + 1);
    try {
      return name === COOKIE_NAME && decodeURIComponent(value) === COOKIE_VALUE_EN;
    } catch {
      return false;
    }
  });
}

function setEnglishCookie() {
  document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE_EN}; path=/; max-age=31536000; SameSite=Lax`;
}

function clearEnglishCookie() {
  const host = window.location.hostname;
  const labels = host.split(".");
  // Google bisa menulis cookie di host maupun domain induknya, jadi hapus di semuanya.
  const domains: Array<string | null> = [null, host];
  for (let i = 0; i <= labels.length - 2; i += 1) {
    domains.push(`.${labels.slice(i).join(".")}`);
  }
  for (const domain of domains) {
    document.cookie =
      `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
      (domain ? `; domain=${domain}` : "");
  }
}

// ---------- Pencegah loop reload ----------
// Jika cookie tidak bisa ditulis (misalnya diblokir browser), jangan reload berulang-ulang.

function getReloadGuard(): string | null {
  try {
    return window.sessionStorage.getItem(RELOAD_GUARD_KEY);
  } catch {
    return null;
  }
}

function setReloadGuard(value: string) {
  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, value);
  } catch {
    // sessionStorage tidak tersedia: cek cookie di bawah tetap mencegah loop.
  }
}

function clearReloadGuard() {
  try {
    window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    // abaikan
  }
}

// Mengembalikan true bila halaman akan dimuat ulang (maka jangan ditampilkan dulu).
function switchTranslation(toEnglish: boolean): boolean {
  const target = toEnglish ? "en" : "id";
  if (getReloadGuard() === target) return false;
  setReloadGuard(target);

  if (toEnglish) setEnglishCookie();
  else clearEnglishCookie();

  // Cookie gagal diubah: jangan reload.
  if (hasEnglishCookie() !== toEnglish) return false;
  window.location.reload();
  return true;
}

// ---------- Menyembunyikan halaman sampai terjemahan selesai ----------

let cancelWatch: (() => void) | null = null;

function revealPage() {
  cancelWatch?.();
  document.documentElement.removeAttribute(HIDE_ATTRIBUTE);
}

// Google membungkus teks hasil terjemahan dengan elemen <font>; kemunculannya menandakan
// terjemahan sudah mulai masuk ke halaman.
function containsTranslatedText(node: Node): boolean {
  if (node.nodeName === "FONT") return true;
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).querySelector("font") !== null;
}

function hidePageUntilTranslated(mode: HideMode, maxHideMs: number) {
  cancelWatch?.();

  const root = document.documentElement;
  root.setAttribute(HIDE_ATTRIBUTE, mode);

  let sawTranslation = false;
  let quietTimer = 0;

  const stop = () => {
    observer.disconnect();
    window.clearTimeout(quietTimer);
    window.clearTimeout(maxTimer);
    if (cancelWatch === stop) cancelWatch = null;
  };

  const finish = () => {
    stop();
    root.removeAttribute(HIDE_ATTRIBUTE);
  };

  const observer = new MutationObserver((mutations) => {
    const container = document.getElementById(CONTAINER_ID);
    const relevant = mutations.filter((mutation) => !container?.contains(mutation.target));
    if (relevant.length === 0) return;

    if (!sawTranslation) {
      sawTranslation = relevant.some((mutation) =>
        Array.from(mutation.addedNodes).some(containsTranslatedText),
      );
      if (!sawTranslation) return;
    }

    // Selama DOM masih berubah, tunda menampilkan halaman.
    window.clearTimeout(quietTimer);
    quietTimer = window.setTimeout(finish, REVEAL_AFTER_QUIET_MS);
  });

  const maxTimer = window.setTimeout(finish, maxHideMs);
  observer.observe(document.body, { childList: true, subtree: true });
  cancelWatch = stop;
}

// ---------- Kompatibilitas React + Google Translate ----------
// Google membungkus teks dengan elemen <font>, sehingga node yang dikenal React bisa terlepas dari
// parent-nya. Tanpa pengaman ini React melempar "Failed to execute 'removeChild' on 'Node'"
// saat halaman diperbarui setelah diterjemahkan.

let domGuardsInstalled = false;

function installDomGuards() {
  if (domGuardsInstalled) return;
  domGuardsInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

// ---------- Memuat Google Website Translator ----------

function startGoogleTranslate() {
  installDomGuards();
  if (document.getElementById(SCRIPT_ID)) return;

  const translateWindow = window as TranslateWindow;
  translateWindow[INIT_CALLBACK] = () => {
    const TranslateElement = translateWindow.google?.translate?.TranslateElement;
    if (!TranslateElement || !document.getElementById(CONTAINER_ID)) return;
    new TranslateElement(
      { pageLanguage: "id", includedLanguages: "en", autoDisplay: false },
      CONTAINER_ID,
    );
  };

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = `https://translate.google.com/translate_a/element.js?cb=${INIT_CALLBACK}`;
  script.async = true;
  document.body.appendChild(script);
}

// Menyembunyikan banner, tooltip, dan sorotan bawaan Google agar tampilan situs tidak berubah,
// serta mengatur penyembunyian halaman selama terjemahan berlangsung.
const TRANSLATOR_CSS = `
body { top: 0 !important; }
iframe.skiptranslate,
iframe.goog-te-banner-frame,
.goog-te-banner-frame { display: none !important; }
#goog-gt-tt,
.goog-tooltip,
.goog-tooltip:hover { display: none !important; }
.goog-text-highlight { background: none !important; box-shadow: none !important; }

/* Muncul perlahan (fade-in) setelah terjemahan selesai. */
body { transition: opacity .25s ease; }
body > *:not(.site-header):not(.site-footer) { transition: opacity .25s ease; }

/* Muat pertama / reload: seluruh halaman tersembunyi sampai terjemahan selesai. */
html[${HIDE_ATTRIBUTE}="all"] body {
  opacity: 0 !important;
  transition: none !important;
}
/* Klik link: halaman lama memudar halus sementara halaman baru dimuat. */
html[${HIDE_ATTRIBUTE}="leaving"] body > *:not(.site-header):not(.site-footer) {
  opacity: 0 !important;
  transition: opacity .1s ease !important;
}
/* Halaman baru: tersembunyi sebentar sampai selesai diterjemahkan, lalu fade-in. */
html[${HIDE_ATTRIBUTE}="page"] body > *:not(.site-header):not(.site-footer) {
  opacity: 0 !important;
  transition: none !important;
}

/* Garis progres tipis di atas layar agar jeda terasa disengaja, bukan layar kosong. */
html[${HIDE_ATTRIBUTE}="leaving"]::after,
html[${HIDE_ATTRIBUTE}="page"]::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 0;
  background: var(--blue, #005b8c);
  z-index: 100000;
  pointer-events: none;
  animation: lia-translate-progress 1.5s cubic-bezier(.1, .6, .3, 1) forwards;
}
@keyframes lia-translate-progress {
  from { width: 0; }
  to { width: 92%; }
}
`;

const subscribeNever = () => () => {};

export function SiteTranslator() {
  const [lang] = useContentLang();
  const pathname = usePathname();
  // false di server dan saat hydration, true setelah hydration selesai. Mencegah efek di bawah
  // membaca bahasa bawaan server ("id") lalu menghapus cookie terjemahan secara keliru.
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);

  // useLayoutEffect (bukan useEffect) agar halaman baru disembunyikan SEBELUM sempat dicat
  // dalam bahasa Indonesia. Efek ini juga berjalan setiap pindah halaman (pathname berubah).
  useLayoutEffect(() => {
    if (!ready) return;

    const wantsEnglish = lang === "en";
    const hasCookie = hasEnglishCookie();

    if (wantsEnglish !== hasCookie) {
      // Pilihan bahasa dan cookie belum sinkron: atur cookie lalu reload. Saat menuju EN, halaman
      // tetap disembunyikan selama reload agar teks Indonesia tidak sempat terlihat.
      const reloading = switchTranslation(wantsEnglish);
      if (!(reloading && wantsEnglish)) revealPage();
      return;
    }

    clearReloadGuard();

    if (!wantsEnglish) {
      revealPage();
      return;
    }

    const firstLoad = !document.getElementById(SCRIPT_ID);
    hidePageUntilTranslated(
      firstLoad ? "all" : "page",
      firstLoad ? MAX_HIDE_MS_FIRST_LOAD : MAX_HIDE_MS_NAVIGATION,
    );
    startGoogleTranslate();
  }, [lang, ready, pathname]);

  // Mode EN: saat link internal diklik, halaman lama memudar dulu (bukan hilang mendadak).
  useEffect(() => {
    if (!ready || lang !== "en") return;

    let resetTimer = 0;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Halaman yang sama (atau hanya anchor #): tidak ada pindah halaman.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      const root = document.documentElement;
      if (root.hasAttribute(HIDE_ATTRIBUTE)) return;
      root.setAttribute(HIDE_ATTRIBUTE, "leaving");
      // Pengaman: jika navigasi batal, kembalikan tampilan.
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        if (root.getAttribute(HIDE_ATTRIBUTE) === "leaving") root.removeAttribute(HIDE_ATTRIBUTE);
      }, 3000);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(resetTimer);
    };
  }, [lang, ready]);

  return (
    <>
      <style>{TRANSLATOR_CSS}</style>
      <div
        id={CONTAINER_ID}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
        translate="no"
      />
    </>
  );
}