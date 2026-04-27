/**
 * Mapeamento TS → variáveis CSS de `admin-tokens.css`.
 *
 * Centraliza todas as cores e helpers usados pelos componentes admin v2 para
 * que não haja hex hardcoded fora de:
 *   1. Polígonos SVG do funil (precisam hex literal)
 *   2. Plugin do limite no gráfico de custos (`ReferenceLine` Recharts)
 */

export type AdminAccent =
  | "revenue"
  | "revenue-alt"
  | "leads"
  | "expense"
  | "signal"
  | "danger"
  | "info"
  | "neutral";

/** Cor "principal" 500 de cada família, em formato `rgb(var(...))`. */
export const ACCENT_500: Record<AdminAccent, string> = {
  revenue: "rgb(var(--admin-revenue-500))",
  "revenue-alt": "rgb(var(--admin-revenue-alt-400))",
  leads: "rgb(var(--admin-leads-500))",
  expense: "rgb(var(--admin-expense-500))",
  signal: "rgb(var(--admin-signal-500))",
  danger: "rgb(var(--admin-danger-500))",
  info: "rgb(var(--admin-info-500))",
  neutral: "rgb(var(--admin-neutral-400))",
};

/** Tom escuro (texto) por família. */
export const ACCENT_TEXT: Record<AdminAccent, string> = {
  revenue: "rgb(var(--admin-revenue-800))",
  "revenue-alt": "rgb(var(--admin-revenue-alt-700))",
  leads: "rgb(var(--admin-leads-700))",
  expense: "rgb(var(--admin-expense-700))",
  signal: "rgb(var(--admin-signal-700))",
  danger: "rgb(var(--admin-danger-700))",
  info: "rgb(var(--admin-info-700))",
  neutral: "rgb(var(--admin-neutral-800))",
};

/** Tom claro (fundo) por família — equivalente ao tom 50. */
export const ACCENT_BG_50: Record<AdminAccent, string> = {
  revenue: "rgb(var(--admin-revenue-50))",
  "revenue-alt": "rgb(var(--admin-revenue-alt-100))",
  leads: "rgb(var(--admin-leads-50))",
  expense: "rgb(var(--admin-expense-50))",
  signal: "rgb(var(--admin-signal-50))",
  danger: "rgb(var(--admin-danger-50))",
  info: "rgb(var(--admin-info-50))",
  neutral: "rgb(var(--admin-neutral-50))",
};

/**
 * Border subtle padrão do admin v2 (mantido por compatibilidade durante a
 * migração — preferir a classe Tailwind `border-admin-border` em código novo).
 */
export const ADMIN_BORDER =
  "1px solid rgb(var(--admin-border-rgb) / 0.08)";

/** Cor literal usada no plugin SVG do funil + ReferenceLine. */
export const ADMIN_LITERAL = {
  funnelTop: "#EEEDFE",
  funnelMid: "#CECBF6",
  funnelBase: "#534AB7",
  funnelBaseText: "#26215C",
  funnelEyebrow: "#3C3489",
  funnelLightEyebrow: "#CECBF6",
  revenueChartSubs: "#1D9E75",
  revenueChartOneOff: "#97C459",
  expenseChartApify: "#BA7517",
  expenseChartOpenAI: "#185FA5",
  capLine: "#A32D2D",
  heroGradient: "linear-gradient(135deg, #E1F5EE 0%, #EAF3DE 100%)",
  heroGradientBorder: "#5DCAA5",
  heroGradientEyebrow: "#085041",
  heroGradientValue: "#04342C",
  heroGradientDelta: "#0F6E56",
  // ===== Relatórios · pipeline =====
  pipelineRequest: "#534AB7",
  pipelineAnalysis: "#BA7517",
  pipelinePdf: "#185FA5",
  pipelineEmail: "#1D9E75",
  // ===== Relatórios · gráficos =====
  chartDelivered: "#1D9E75",
  chartFailed: "#E24B4A",
  chartQueued: "#888780",
  chartTiming: "#D85A30",
  slaLine: "#888780",
  // ===== Saúde / pulse =====
  healthOk: "#1D9E75",
  healthWarn: "#EF9F27",
  healthCritical: "#A32D2D",
} as const;