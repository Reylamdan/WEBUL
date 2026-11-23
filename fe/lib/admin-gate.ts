import { useSyncExternalStore } from "react";

/**
 * Status animasi "pintu terbuka" setelah login.
 * Disimpan di luar React supaya tidak ikut hilang saat halaman pindah
 * dari /admin/login ke /admin/beranda.
 *
 * idle   : tidak tampil
 * closed : dua panel menutup layar (menunggu halaman tujuan siap)
 * open   : panel membelah ke kiri dan kanan, memperlihatkan halaman admin
 */
export type GateState = "idle" | "closed" | "open";

let state: GateState = "idle";
let failsafe: number | undefined;
const listeners = new Set<() => void>();

function set(next: GateState) {
  state = next;
  if (typeof document !== "undefined") {
    if (next === "idle") delete document.body.dataset.adminGate;
    else document.body.dataset.adminGate = next;
  }
  listeners.forEach((listener) => listener());
}

/** Tutup layar. Otomatis dilepas setelah 8 detik supaya tidak pernah macet. */
export function closeGate() {
  window.clearTimeout(failsafe);
  set("closed");
  failsafe = window.setTimeout(() => set("idle"), 8000);
}

/** Buka pintu, lalu bersihkan setelah animasi selesai. */
export function openGate() {
  if (state !== "closed") return;
  window.clearTimeout(failsafe);
  set("open");
  failsafe = window.setTimeout(() => set("idle"), 1500);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGate(): GateState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => "idle" as GateState,
  );
}