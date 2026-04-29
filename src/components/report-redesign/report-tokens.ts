/**
 * Tokens visuais auxiliares para o redesign editorial de
 * `/analyze/$username`. Não introduzem novas cores — apenas combinam
 * tokens semânticos existentes em gradientes pastel reutilizáveis.
 *
 * Devolvem strings de classes Tailwind para serem usadas via `className`.
 */

export const REDESIGN_TOKENS = {
  /** Gradiente pastel cyan→violeta muito suave. Usado em hero e CTA. */
  surfacePastelCyan:
    "bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.10),transparent_60%)] bg-surface-base",
  /** Gradiente pastel mais frio para AI reading. */
  surfacePastelViolet:
    "bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.08),transparent_60%)] bg-surface-base",
  /** Tinta neutra para secções analíticas calmas. */
  surfaceCalm: "bg-surface-secondary/30",
  /** Card branco/suave reutilizável. */
  card:
    "rounded-2xl border border-border-subtle/40 bg-surface-base/70 backdrop-blur-sm",
  cardElevated:
    "rounded-2xl border border-border-subtle/40 bg-surface-base/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]",
} as const;