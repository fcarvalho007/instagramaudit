/**
 * ScoreOrbitBackground — decorative orbital particle effect around the global score ring.
 *
 * Renders a tiny <canvas> (150×150 CSS px) with 20 soft dots orbiting on
 * two concentric rings. Purely decorative, pointer-events-none, aria-hidden.
 *
 * Colour by ScoreFamily:
 *   danger  → rgba(163, 45, 45, ...)   rose/red
 *   warning → rgba(186, 117, 23, ...)  amber
 *   success → rgba(29, 158, 117, ...)  emerald
 *
 * Respects prefers-reduced-motion: reduce — hides animation entirely.
 * Uses requestAnimationFrame directly, no React state updates during animation.
 */

import { useEffect, useRef } from "react";
import type { ScoreFamily } from "./score-utils";

interface ScoreOrbitBackgroundProps {
  family: ScoreFamily;
}

/* ── Decorative RGBA colours (local to this component) ────────────── */
const FAMILY_RGB: Record<ScoreFamily, string> = {
  danger: "163, 45, 45",
  warning: "186, 117, 23",
  success: "29, 158, 117",
};

const CANVAS_CSS = 150; // CSS pixels
const PARTICLE_COUNT = 20;

interface Particle {
  orbit: number;   // radius from centre
  angle: number;   // current angle (radians)
  speed: number;   // radians per second
  baseR: number;   // base dot radius
  phase: number;   // phase offset for size pulse
  opacity: number; // 0.15–0.35
}

function createParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const isInner = i < PARTICLE_COUNT / 2;
    particles.push({
      orbit: isInner ? 36 + Math.random() * 6 : 52 + Math.random() * 6,
      angle: Math.random() * Math.PI * 2,
      speed: (0.3 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1), // rad/s
      baseR: 1 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.15 + Math.random() * 0.2,
    });
  }
  return particles;
}

export function ScoreOrbitBackground({ family }: ScoreOrbitBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Respect reduced motion
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_CSS * dpr;
    canvas.height = CANVAS_CSS * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = CANVAS_CSS / 2;
    const cy = CANVAS_CSS / 2;
    const rgb = FAMILY_RGB[family];
    const particles = createParticles();
    let prev = performance.now();

    function draw(now: number) {
      const dt = (now - prev) / 1000;
      prev = now;

      ctx!.clearRect(0, 0, CANVAS_CSS, CANVAS_CSS);

      for (const p of particles) {
        p.angle += p.speed * dt;
        const x = cx + Math.cos(p.angle) * p.orbit;
        const y = cy + Math.sin(p.angle) * p.orbit;
        // Subtle size pulse
        const pulse = 1 + 0.25 * Math.sin(now * 0.001 + p.phase);
        const r = p.baseR * pulse;

        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${rgb}, ${p.opacity})`;
        ctx!.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [family]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ width: CANVAS_CSS, height: CANVAS_CSS }}
    />
  );
}