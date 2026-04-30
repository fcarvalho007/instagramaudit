/**
 * Tokens visuais para o redesign Iconosquare-style de
 * `/analyze/$username`. Cards brancos, bandas alternadas branco↔canvas,
 * azul como única família de cor de acento. Sem novos design tokens
 * globais — apenas combinações reutilizáveis.
 */

export const REDESIGN_TOKENS = {
  // ── Canvas e bandas ────────────────────────────────────────────────
  /** Fundo da página: gradient azul muito suave no topo, neutro depois. */
  pageCanvas:
    "bg-[linear-gradient(180deg,#F5F8FF_0%,#FAFBFC_320px,#FAFBFC_100%)]",
  /** Banda do hero: azul-claro premium com radial sutil. */
  heroBand:
    "bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.10),transparent_60%),linear-gradient(180deg,#EEF4FF_0%,#F8FAFF_100%)]",
  /** Banda branca para secções L1 (KPI grid, AI reading). */
  bandWhite: "bg-white",
  /** Banda canvas (transparente — herda fundo da página). */
  bandCanvas: "bg-transparent",
  /** Banda azul muito suave para secções analíticas alternadas. */
  bandSoftBlue: "bg-[linear-gradient(180deg,#F8FAFF_0%,#F3F6FF_100%)]",

  // ── Cards ───────────────────────────────────────────────────────────
  /** Card analítico padrão (L2). */
  card:
    "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
  /** Card KPI (L1) — sombra ligeiramente mais presente. */
  cardKpi:
    "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_12px_32px_-16px_rgba(15,23,42,0.10)] transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_-16px_rgba(15,23,42,0.14)]",
  /** Card discreto (L3) — fundo azul-50 muito suave. */
  cardSoft: "rounded-2xl border border-blue-100 bg-blue-50/40",

  // ── Tipografia ──────────────────────────────────────────────────────
  h1Hero:
    "font-display text-[1.25rem] sm:text-[2rem] md:text-[2.5rem] lg:text-[2.75rem] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.15] break-words [word-break:normal] [hyphens:none]",
  h2Section:
    "font-display text-[1.5rem] md:text-[1.75rem] font-semibold tracking-tight text-slate-900 leading-tight",
  eyebrow:
    "font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500",
  eyebrowAccent:
    "font-mono text-[10px] uppercase tracking-[0.18em] text-blue-600",
  subtitle: "text-sm md:text-[15px] text-slate-600 leading-relaxed",
  kpiValue:
    "font-display text-[2rem] md:text-[2.25rem] font-semibold tracking-tight text-slate-900 leading-none",
  kpiLabel:
    "font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500",
  kpiHelp: "text-xs text-slate-500 leading-snug",
} as const;