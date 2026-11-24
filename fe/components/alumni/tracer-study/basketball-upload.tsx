"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Mengirim form ke server. Harus melempar error bila gagal. */
  onSend: () => Promise<void>;
  /** Dipanggil setelah berkas masuk ring, terkirim, dan animasi selesai. */
  onScored: () => void;
  disabled?: boolean;
  /** Memberi tahu induk saat berkas sedang dilempar/dikirim, supaya tombol lain dikunci. */
  onBusyChange?: (busy: boolean) => void;
  fileName?: string;
  sizeBytes?: number;
}

type Phase = "ready" | "drag" | "fly" | "upload" | "sent" | "error";

/* ---------- geometri arena (viewBox 440 x 500) ---------- */
const W = 440;
const H = 500;
const HOME = { x: 64, y: 430 };
const RIM = { x: 220, y: 232 };
const RIM_HALF = 34;
const NET_BOTTOM = RIM.y + 58;
const G = 1400;

const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Kecepatan awal agar berkas dari (x,y) pasti jatuh tepat ke tengah ring dari atas. */
function aimAtRim(x: number, y: number) {
  const dx = RIM.x - x;
  const dy = RIM.y - y;
  const rise = Math.max(0, -dy);
  // waktu terbang: cukup lama supaya berkas sudah turun saat tiba di ring
  const T = Math.max(0.62 + Math.hypot(dx, dy) / 900, 1.12 * Math.sqrt((2 * rise) / G) + 0.18);
  return { vx: dx / T, vy: (dy - 0.5 * G * T * T) / T, T };
}

const kb = (n: number) => `${(n / 1024).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KB`;

export function BasketballUpload({ onSend, onScored, disabled, onBusyChange, fileName = "ALUMNI UNIVERSITAS LIA", sizeBytes = 600 }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [progress, setProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hot, setHot] = useState(false);
  const [swish, setSwish] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<SVGGElement>(null);
  const phaseRef = useRef<Phase>("ready");
  const alive = useRef(true);
  const cleanup = useRef<(() => void) | null>(null);

  const setPh = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    alive.current = true;
    place(HOME.x, HOME.y, 0, 1, 1);
    return () => {
      alive.current = false;
      cleanup.current?.();
    };
  }, []);

  const busy = phase === "fly" || phase === "upload" || phase === "sent";
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  /* ---------- util posisi berkas (langsung ke DOM, tanpa render ulang) ---------- */
  function place(x: number, y: number, rot = 0, scale = 1, opacity = 1) {
    const el = fileRef.current;
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
    el.style.opacity = String(opacity);
  }

  const tween = async (ms: number, fn: (t: number) => void) => {
    const t0 = performance.now();
    for (;;) {
      const now = await frame();
      if (!alive.current) return;
      const t = clamp((now - t0) / ms, 0, 1);
      fn(t);
      if (t >= 1) return;
    }
  };

  /** Berkas muncul kembali di posisi awal dengan efek "pop". */
  const returnHome = async (from?: { x: number; y: number }) => {
    if (from) {
      await tween(260, (t) => {
        const e = 1 - Math.pow(1 - t, 3);
        place(from.x + (HOME.x - from.x) * e, from.y + (HOME.y - from.y) * e, 0, 1, 1);
      });
    } else {
      await tween(320, (t) => {
        const s = t < 1 ? 1 + Math.sin(t * Math.PI) * 0.15 : 1;
        place(HOME.x, HOME.y, 0, t * s, t);
      });
    }
    if (alive.current) place(HOME.x, HOME.y, 0, 1, 1);
  };

  /* ---------- unggah setelah bola masuk ring ---------- */
  const runUpload = async () => {
    setPh("upload");
    setError(null);
    setProgress(4);
    const t0 = performance.now();
    let result: Error | null | undefined;
    onSend().then(
      () => {
        result = null;
      },
      (e: unknown) => {
        result = e instanceof Error ? e : new Error("Gagal mengirim form");
      },
    );

    let p = 4;
    while (alive.current) {
      await frame();
      if (result !== undefined && performance.now() - t0 > 1100) break;
      p += (88 - p) * 0.045;
      setProgress(Math.round(p));
    }
    if (!alive.current) return;

    if (result) {
      setError(result.message);
      setProgress(0);
      setPh("error");
      await returnHome();
      return;
    }
    setProgress(100);
    setPh("sent");
    await sleep(1200);
    if (alive.current) onScored();
  };

  /* ---------- fisika lemparan ---------- */
  const launch = (x0: number, y0: number, vx0: number, vy0: number) => {
    setPh("fly");
    setHot(false);
    setAttempts((n) => n + 1);

    let x = x0, y = y0, vx = vx0, vy = vy0;
    let rot = 0;
    let spin = clamp(vx0 * 0.35, -420, 420);
    let scored = false;
    let last = performance.now();
    const born = last;
    let stop = false;
    cleanup.current = () => {
      stop = true;
    };

    const rimPts = [
      { x: RIM.x - RIM_HALF, y: RIM.y },
      { x: RIM.x + RIM_HALF, y: RIM.y },
    ];
    const RC = 12; // radius tabrakan dengan tepi ring

    const step = (now: number) => {
      if (stop || !alive.current) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      for (let i = 0; i < 2; i++) {
        const h = dt / 2;
        const prevY = y;
        vy += G * h;
        // bantuan bidik halus saat bola turun di dekat ring
        if (!scored && vy > 0 && y > RIM.y - 170 && y < RIM.y && Math.abs(x - RIM.x) < 110) vx += (RIM.x - x) * 4.5 * h;
        x += vx * h;
        y += vy * h;

        if (!scored) {
          for (const e of rimPts) {
            const dx = x - e.x, dy = y - e.y;
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < RC) {
              const nx = dx / d, ny = dy / d;
              x = e.x + nx * RC;
              y = e.y + ny * RC;
              const dot = vx * nx + vy * ny;
              if (dot < 0) {
                vx -= 1.5 * dot * nx;
                vy -= 1.5 * dot * ny;
                spin = -spin;
              }
            }
          }
          if (prevY < RIM.y && y >= RIM.y && vy > 0 && Math.abs(x - RIM.x) < RIM_HALF - 3) {
            scored = true;
            setSwish((n) => n + 1);
          }
        } else {
          vx += (RIM.x - x) * 10 * h;
          vx *= 0.97;
          vy *= 0.985;
          spin *= 0.95;
        }
      }
      rot += spin * dt;
      place(x, y, rot);

      if (scored && y > NET_BOTTOM - 14) {
        stop = true;
        void (async () => {
          await tween(200, (t) => place(RIM.x, NET_BOTTOM - 14 + t * 14, rot, 1 - t, 1 - t));
          if (alive.current) void runUpload();
        })();
        return;
      }
      if (y > H + 40 || x < -60 || x > W + 60 || now - born > 5000) {
        stop = true;
        setPh("ready");
        void returnHome();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- drag & drop ---------- */
  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const canGrab = () => !disabled && (phaseRef.current === "ready" || phaseRef.current === "error");

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canGrab() || e.button > 0) return;
    e.preventDefault();
    const start = toSvg(e.clientX, e.clientY);
    const fm = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(fileRef.current?.style.transform ?? "");
    const fx = fm ? Number(fm[1]) : HOME.x;
    const fy = fm ? Number(fm[2]) : HOME.y;
    const off = { x: fx - start.x, y: fy - start.y };
        let pos = { x: fx, y: fy };
    setPh("drag");
    setError(null);
    setHot(true);
    showGuide(pos.x, pos.y);

    const move = (ev: PointerEvent) => {
      const p = toSvg(ev.clientX, ev.clientY);
      pos = { x: clamp(p.x + off.x, 14, W - 14), y: clamp(p.y + off.y, 14, H - 14) };
      place(pos.x, pos.y, 0, 1.06, 1);
      showGuide(pos.x, pos.y);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      cleanup.current = null;

      // Dilepas di mana pun: berkas otomatis meluncur ke ring.
      hideGuide();
      const { vx, vy } = aimAtRim(pos.x, pos.y);
      launch(pos.x, pos.y, vx, vy);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    cleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  };

  /** Tanpa drag (keyboard / ketuk): berkas meluncur dari posisi awal. */
  const autoShot = () => {
    if (!canGrab()) return;
    setError(null);
    place(HOME.x, HOME.y, 0, 1, 1);
    const { vx, vy } = aimAtRim(HOME.x, HOME.y);
    launch(HOME.x, HOME.y, vx, vy);
  };

  /* ---------- garis bantu titik-titik menuju ring saat berkas diseret ---------- */
  const guideRef = useRef<SVGGElement>(null);
  const GUIDE_DOTS = 14;
  function showGuide(x: number, y: number) {
    const g = guideRef.current;
    if (!g) return;
    const { vx, vy, T } = aimAtRim(x, y);
    const dots = g.children;
    for (let i = 0; i < dots.length; i++) {
      const t = ((i + 1) / (GUIDE_DOTS + 1)) * T;
      dots[i].setAttribute("cx", String(x + vx * t));
      dots[i].setAttribute("cy", String(y + vy * t + 0.5 * G * t * t));
    }
    g.style.opacity = "1";
  }
  function hideGuide() {
    if (guideRef.current) guideRef.current.style.opacity = "0";
  }

  const pct = phase === "sent" ? 100 : progress;
  const status =
    phase === "error" ? (error ?? "Gagal terkirim, tembak lagi") :
    phase === "sent" ? "Terkirim 🎉" :
    phase === "upload" ? "Mengirim berkas…" :
    phase === "fly" ? "Berkas melayang…" :
    "Menunggu tembakan…";

  return (
    <div className={`bb-card bb-${phase}${hot ? " is-hot" : ""}`}>
      <header className="bb-head">
        <div>
          <h4>Kirim formulir</h4>
          <p>Seret berkas ke mana saja, lepas, dan otomatis masuk ring.</p>
        </div>
        <span className="bb-pill">Percobaan <b>{attempts}</b></span>
      </header>

      <div className="bb-arena">
        <div className="bb-zone" />

        <div className="bb-row" aria-live="polite">
          <div className="bb-row-top">
            <span className="bb-badge">LIA</span>
            <b className="bb-name">{fileName}</b>
            <span className="bb-pct">{pct}%</span>
          </div>
          <div className="bb-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="bb-meta">
            <span className="bb-status">{status}</span>
            <span>{kb(sizeBytes)}</span>
          </div>
        </div>

        <svg ref={svgRef} className="bb-svg" viewBox={`0 0 ${W} ${H}`} aria-label="Ring basket tempat berkas dilempar">
          <defs>
            <filter id="bb-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1c2b4a" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* papan */}
          <rect x="172" y="138" width="96" height="84" rx="4" fill="#fff" stroke="#c9d0dc" strokeWidth="2" />
          <rect x="203" y="184" width="34" height="30" rx="2" fill="none" className="bb-board-mark" strokeWidth="3" />

          {/* jaring */}
          <g key={swish} className="bb-net">
            <path
              d={`M${RIM.x - RIM_HALF} ${RIM.y} L${RIM.x - 21} ${NET_BOTTOM} M${RIM.x - 17} ${RIM.y + 5} L${RIM.x - 8} ${NET_BOTTOM} M${RIM.x} ${RIM.y + 6} L${RIM.x} ${NET_BOTTOM} M${RIM.x + 17} ${RIM.y + 5} L${RIM.x + 8} ${NET_BOTTOM} M${RIM.x + RIM_HALF} ${RIM.y} L${RIM.x + 21} ${NET_BOTTOM} M${RIM.x - 29} ${RIM.y + 20} Q${RIM.x} ${RIM.y + 30} ${RIM.x + 29} ${RIM.y + 20} M${RIM.x - 25} ${RIM.y + 40} Q${RIM.x} ${RIM.y + 50} ${RIM.x + 25} ${RIM.y + 40}`}
              fill="none"
              stroke="#8fa0bd"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
          <ellipse className="bb-rim" cx={RIM.x} cy={RIM.y} rx={RIM_HALF} ry="7" fill="none" strokeWidth="4.5" />

          <g ref={guideRef} className="bb-guide">
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} r={2.6 - i * 0.05} />
            ))}
          </g>

          {/* berkas (bisa diseret) */}
          <g
            ref={fileRef}
            className="bb-file"
            onPointerDown={onPointerDown}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                autoShot();
              }
            }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Berkas ALUMNI UNIVERSITAS LIA. Seret lalu lepas, atau tekan Enter, agar otomatis masuk ring"
          >
            <g filter="url(#bb-shadow)">
              <rect x="-24" y="-24" width="48" height="48" rx="14" className="bb-file-badge" />
            </g>
            <rect x="-24" y="-24" width="48" height="48" rx="14" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
            <text x="0" y="6.5" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff" letterSpacing="0.5">LIA</text>
          </g>
        </svg>
      </div>

      <p className="bb-hint">Tidak perlu membidik. Tinggal seret dan lepas, atau cukup ketuk berkasnya.</p>
    </div>
  );
}
