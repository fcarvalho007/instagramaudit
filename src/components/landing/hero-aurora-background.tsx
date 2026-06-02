/**
 * Hero ambient background — DARK ("Editorial Tech Noir"). Reposto em
 * 2026-06-02. Deep navy base + aurora cyan/violet blobs em opacidade
 * baixa + grain noise subtil. Pensado para viver dentro de .hero-dark.
 */
export function HeroAuroraBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #060A18 0%, #0A1230 60%, #060A18 100%)",
        }}
      />
      <div
        className="absolute -top-1/3 -right-1/4 w-[720px] h-[720px] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--hero-cyan) / 0.22), transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute -bottom-1/3 -left-1/4 w-[560px] h-[560px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--hero-violet) / 0.18), transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      {/* Subtle grain to add cinematic texture */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
