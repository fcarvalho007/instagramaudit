/**
 * Hero ambient background — LIGHT. Subtle gradient + soft accent blobs
 * that sit on top of the global light surface. Editado 2026-06-02:
 * homepage passa a ser 100% light (Iconosquare-style); o "dark island"
 * foi removido por instrução do owner.
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
            "linear-gradient(180deg, rgb(var(--surface-base)) 0%, rgb(var(--surface-muted)) 100%)",
        }}
      />
      <div
        className="absolute -top-1/3 -right-1/4 w-[720px] h-[720px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--accent-primary) / 0.10), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute -bottom-1/3 -left-1/4 w-[560px] h-[560px] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgb(var(--accent-violet) / 0.08), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}
