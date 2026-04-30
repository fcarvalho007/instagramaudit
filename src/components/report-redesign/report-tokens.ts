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

  // ── V2 (Phase 1B.1 — Bloco 01 Overview) ────────────────────────────
  /**
   * Hero v2: gradiente azul-claro mais rico, com radial duplo e leve
   * vinheta inferior. Mantém-se dentro da paleta blue/slate.
   */
  heroBandV2:
    "bg-[radial-gradient(1200px_circle_at_15%_-10%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(900px_circle_at_85%_0%,rgba(99,102,241,0.10),transparent_60%),linear-gradient(180deg,#EDF3FF_0%,#F6F9FF_60%,#FAFBFD_100%)]",
  /** H1 do hero v2 — escala maior em desktop, mantém wrapping seguro. */
  h1HeroV2:
    "font-display text-[1.5rem] sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3.25rem] font-semibold tracking-[-0.025em] text-slate-900 leading-[1.1] break-words [word-break:normal] [hyphens:none]",
  /** Card KPI v2 — mais respiração, hover sobe ligeiramente. */
  kpiCardV2:
    "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_14px_36px_-18px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_22px_48px_-18px_rgba(15,23,42,0.14)]",
  /** Card de estado (benchmark) — fundo blue-50 muito suave. */
  kpiCardV2Status:
    "rounded-2xl border border-blue-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.7),rgba(255,255,255,1))] shadow-[0_1px_3px_rgba(15,23,42,0.03),0_14px_36px_-18px_rgba(59,130,246,0.20)] transition-all duration-200 hover:-translate-y-0.5",
  /** Caixa do ícone do KPI v2 — quadrado com gradient azul claro. */
  kpiIconBoxV2:
    "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#EFF6FF,#DBEAFE)] text-blue-600 ring-1 ring-blue-100",
  /** Valor numérico do KPI v2 — display maior, leading apertado. */
  kpiValueV2:
    "font-display text-[2.25rem] md:text-[2.5rem] font-semibold tracking-[-0.02em] text-slate-900 leading-none break-normal [overflow-wrap:normal] [hyphens:none]",
  /** Número decorativo do bloco (01, 02…) em estilo editorial. */
  blockNumberDecor:
    "font-display text-[5rem] md:text-[6rem] font-semibold leading-none tracking-tighter text-transparent [-webkit-text-stroke:1px_rgb(191,219,254)] select-none",
  /** Frame do insight principal — pull-quote editorial. */
  insightFrameV2:
    "relative pl-5 md:pl-6 border-l-2 border-blue-200",

  // ── V2 compact (Phase 1B.1A — Hero compacto + stats Instagram-like) ──
  /** Banda do hero v2 compacta — gradient ligeiramente menos saturado. */
  heroBandV2Compact:
    "bg-[radial-gradient(1000px_circle_at_15%_-10%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(800px_circle_at_85%_0%,rgba(99,102,241,0.08),transparent_60%),linear-gradient(180deg,#EFF4FF_0%,#F7FAFF_60%,#FAFBFD_100%)]",
  /** H1 do hero v2 compacto — escala mais discreta, mantém wrapping seguro. */
  h1HeroV2Compact:
    "font-display text-[1.5rem] sm:text-[1.875rem] md:text-[2.125rem] lg:text-[2.375rem] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] break-words [word-break:normal] [hyphens:none]",
  /** Item de stat estilo perfil Instagram — vertical compacto. */
  heroStatItem: "flex flex-col items-start gap-0.5 min-w-0",
  heroStatValue:
    "font-display text-base md:text-lg font-semibold text-slate-900 tabular-nums leading-none",
  heroStatLabel:
    "font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500",
  /** Strip de posicionamento integrada no hero (substitui a banda standalone). */
  positioningStrip:
    "mt-6 md:mt-7 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-slate-200/60 pt-4 md:pt-5",
  positioningChip:
    "inline-flex items-center gap-1.5 rounded-full ring-1 ring-blue-200 bg-blue-50 text-blue-700 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
  /** Valor categorical do KPI (ex.: nome de formato) — escala mais sóbria. */
  kpiValueV2Categorical:
    "font-display text-[1.375rem] md:text-[1.5rem] font-semibold tracking-tight text-slate-900 leading-tight break-words [word-break:normal] [hyphens:none]",
} as const;