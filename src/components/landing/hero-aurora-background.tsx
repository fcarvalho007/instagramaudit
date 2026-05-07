/**
 * Soft ambient gradient background for the hero area.
 * Light-first: subtle blue-lilac tint fading to white.
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
            "linear-gradient(135deg, rgb(239 244 251) 0%, rgb(245 243 255) 30%, rgb(250 251 253) 70%, rgb(255 255 255) 100%)",
        }}
      />
      <div
        className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgb(55 114 229 / 0.15), transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgb(118 100 228 / 0.12), transparent 70%)",
          filter: "blur(60px)",
        }}
      />
    </div>
  );
}
