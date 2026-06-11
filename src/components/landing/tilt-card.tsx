import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export interface TiltCardProps {
  tiltLimit?: number;
  scale?: number;
  perspective?: number;
  effect?: "gravitate" | "evade";
  spotlight?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

/**
 * TiltCard — 3D parallax tilt with optional cursor spotlight.
 * Respects prefers-reduced-motion (no tilt, no spotlight).
 */
export function TiltCard({
  tiltLimit = 8,
  scale = 1.02,
  perspective = 1400,
  effect = "gravitate",
  spotlight = true,
  className,
  style,
  children,
}: TiltCardProps) {
  const reduced = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rest = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  const [transform, setTransform] = useState(rest);
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const [animating, setAnimating] = useState(false);

  const dir = effect === "evade" ? -1 : 1;

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const xRot = (py - 0.5) * (tiltLimit * 2) * dir;
      const yRot = (px - 0.5) * -(tiltLimit * 2) * dir;
      setTransform(
        `perspective(${perspective}px) rotateX(${xRot.toFixed(2)}deg) rotateY(${yRot.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
      );
      if (spotlight) setSpotlightPos({ x: px * 100, y: py * 100 });
    },
    [dir, perspective, reduced, scale, spotlight, tiltLimit],
  );

  const handlePointerEnter = useCallback(() => {
    if (reduced) return;
    setAnimating(false);
  }, [reduced]);

  const handlePointerLeave = useCallback(() => {
    if (reduced) return;
    setAnimating(true);
    setTransform(rest);
  }, [reduced, rest]);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={cn("relative", className)}
      style={{
        ...style,
        transform: reduced ? undefined : transform,
        transformStyle: "preserve-3d",
        transition: animating
          ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)"
          : "none",
        willChange: "transform",
      }}
    >
      {children}
      {spotlight && !reduced ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
          style={{
            opacity: animating ? 0 : 1,
            background: `radial-gradient(circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(56, 189, 248, 0.22), transparent 55%)`,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
    </div>
  );
}