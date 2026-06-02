/**
 * Hero ambient background — DARK variant scoped to the `.hero-dark` island
 * on the homepage. Consumes `--hero-bg`, `--hero-accent`, `--hero-cyan` from
 * src/styles/hero-dark.css. Editado 2026-06-02 com autorização.
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
            "linear-gradient(160deg, #060A18 0%, #0A1126 55%, #060A18 100%)",
        }}
      />
      <div
        className="absolute -top-1/3 -right-1/4 w-[720px] h-[720px] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgb(79 140 255 / 0.18), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute -bottom-1/3 -left-1/4 w-[560px] h-[560px] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgb(109 211 231 / 0.10), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* Fine grain noise */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
    </div>
  );
}
