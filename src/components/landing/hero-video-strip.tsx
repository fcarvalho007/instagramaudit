import { useEffect, useState } from "react";

import videoAsset from "@/assets/background-strip.mp4.asset.json";
import posterAsset from "@/assets/background-strip-poster.jpg.asset.json";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function HeroVideoStrip() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[90px] sm:h-[130px] md:h-[170px] lg:h-[210px] overflow-hidden"
    >
      {reduced ? (
        <img
          src={posterAsset.url}
          alt=""
          className="w-full h-full object-cover opacity-[0.35] sm:opacity-[0.5] lg:opacity-[0.6]"
          draggable={false}
        />
      ) : (
        <video
          className="w-full h-full object-cover opacity-[0.35] sm:opacity-[0.5] lg:opacity-[0.6]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterAsset.url}
          tabIndex={-1}
          disablePictureInPicture
        >
          <source src={videoAsset.url} type="video/mp4" />
        </video>
      )}

      {/* Vertical fade: transparent on top → hero bg at bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgb(var(--hero-bg-base) / 0.35) 0%, rgb(var(--hero-bg-base) / 0) 35%, rgb(var(--hero-bg-base) / 0) 70%, rgb(var(--hero-bg-base) / 0.55) 100%)",
        }}
      />
      {/* Lateral fade to avoid hard edges on ultra-wide */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgb(var(--hero-bg-base) / 0.25) 0%, rgb(var(--hero-bg-base) / 0) 8%, rgb(var(--hero-bg-base) / 0) 92%, rgb(var(--hero-bg-base) / 0.25) 100%)",
        }}
      />
    </div>
  );
}