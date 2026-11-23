"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";

const MAX_LENS = 0.9; // kekuatan fisheye maksimum (item tengah membesar ≈ 1 + MAX_LENS kali)
const LENS_GAIN = 0.04; // makin besar = makin mudah muncul saat digeser

export function PartnersSection({
  partners,
  title = "Mitra Kami",
}: {
  partners: string[];
  title?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list;

    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const items = Array.from(el.querySelectorAll<HTMLElement>("li")).map((li) => ({
      li,
      logo: li.querySelector<HTMLElement>("[data-logo]"),
    }));

    let raf = 0;
    let last = 0;
    let inView = false;
    let lastLeft = el.scrollLeft;
    let lastPageY = window.scrollY;

    let lens = 0; // kekuatan fisheye saat ini (0 = lurus/normal)
    let speed = 0; // kecepatan geser terkini (px per event scroll)

    /* ---------- bayangan tepi ---------- */
    function updateEdges() {
      const max = el.scrollWidth - el.clientWidth;
      const prev = el.scrollLeft > 4;
      const next = el.scrollLeft < max - 4;
      setEdges((cur) => (cur.prev === prev && cur.next === next ? cur : { prev, next }));
    }

    /* ---------- fisheye: lensa di tengah, item di tengah membesar, tepi mengecil ---------- */
    function apply() {
      const halfW = el.clientWidth / 2 || 1;
      for (const { li, logo } of items) {
        if (!logo) continue;
        const cx = li.offsetLeft + li.offsetWidth / 2 - el.scrollLeft;
        const t = (cx - halfW) / halfW; // -1 (tepi kiri) … 0 (tengah) … 1 (tepi kanan)
        const a = Math.abs(t);
        const sign = t < 0 ? -1 : 1;

        let pos: number;
        let scale: number;
        if (a <= 1) {
          const k = lens * a + 1;
          pos = sign * (((lens + 1) * a) / k); // posisi baru (fungsi fisheye)
          scale = (lens + 1) / (k * k); // skala = kemiringan fungsi di titik itu
        } else {
          pos = sign * (1 + (a - 1) / (lens + 1)); // di luar tepi: lanjut merapat
          scale = 1 / (lens + 1);
        }

        const shift = (pos - t) * halfW;
        const fade = 1 - 0.45 * (lens / MAX_LENS) * Math.min(a, 1);
        logo.style.transform = `translateX(${shift.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        logo.style.opacity = fade.toFixed(2);
      }
    }

    function reset() {
      for (const { logo } of items) {
        if (!logo) continue;
        logo.style.transform = "";
        logo.style.opacity = "";
      }
    }

    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      speed *= Math.pow(0.02, dt); // lensa bertahan sebentar setelah berhenti digeser
      const target = speed < 0.3 ? 0 : Math.min(MAX_LENS, speed * LENS_GAIN);
      const rate = target > lens ? 14 : 5; // muncul cepat, hilang pelan
      lens += (target - lens) * (1 - Math.exp(-rate * dt));

      if (target === 0 && lens < 0.01) {
        lens = 0;
        speed = 0;
        reset();
        raf = 0;
        return;
      }

      apply();
      raf = requestAnimationFrame(step);
    }

    function kick() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    }

    function onScroll() {
      updateEdges();
      const left = el.scrollLeft;
      const dx = left - lastLeft;
      lastLeft = left;
      if (!animate || dx === 0) return;

      speed = Math.max(speed, Math.min(Math.abs(dx), 80));
      kick();
    }

    // Scroll halaman (naik/turun) saat bagian ini terlihat juga memunculkan lensa
    function onPageScroll() {
      const y = window.scrollY;
      const dy = y - lastPageY;
      lastPageY = y;
      if (!animate || !inView || dy === 0) return;

      speed = Math.max(speed, Math.min(Math.abs(dy) * 0.3, 40));
      kick();
    }

    /* ---------- geser dengan mouse (drag) + inersia ---------- */
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let vx = 0;
    let glide = 0;

    function stopGlide() {
      if (glide) {
        cancelAnimationFrame(glide);
        glide = 0;
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      stopGlide();
      dragging = true;
      startX = lastX = e.clientX;
      startLeft = el.scrollLeft;
      lastT = performance.now();
      vx = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      vx = ((lastX - e.clientX) / dt) * 1000; // px/detik, arah scroll
      lastX = e.clientX;
      lastT = now;
      el.scrollLeft = startLeft - (e.clientX - startX);
    }

    function endDrag(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (performance.now() - lastT > 100) vx = 0;

      let prev = performance.now();
      const glideStep = (t: number) => {
        const dt = Math.min((t - prev) / 1000, 1 / 30);
        prev = t;
        el.scrollLeft += vx * dt;
        vx *= Math.pow(0.04, dt); // gesekan: sisa 4% kecepatan setelah 1 detik
        glide = Math.abs(vx) > 20 ? requestAnimationFrame(glideStep) : 0;
      };
      if (Math.abs(vx) > 20) glide = requestAnimationFrame(glideStep);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) inView = entry.isIntersecting;
      },
      { threshold: [0] },
    );
    observer.observe(el);

    updateEdges();
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    window.addEventListener("scroll", onPageScroll, { passive: true });
    window.addEventListener("resize", updateEdges);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("scroll", onPageScroll);
      window.removeEventListener("resize", updateEdges);
      observer.disconnect();
      stopGlide();
      if (raf) cancelAnimationFrame(raf);
      reset();
    };
  }, [partners]);

  return (
    <ScrollReveal>
      <section className="lp-partners">
        <div className="lp-wrap lp-partners-stack">
          <h2 className="lp-partners-title">{title}</h2>
          <ul
            aria-label="Daftar mitra"
            className={`lp-partners-list${edges.prev ? " can-prev" : ""}${edges.next ? " can-next" : ""}`}
            ref={listRef}
            tabIndex={0}
          >
            {partners.map((partner, index) => (
              <li className="lp-rope-item" key={partner}>
                <div className="lp-rope-logo" data-logo>
                  <span aria-hidden="true" className={`lp-mark lp-mark-${index % 4}`} />
                  {partner}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </ScrollReveal>
  );
}