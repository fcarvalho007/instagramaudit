/**
 * MOCK DATA — admin v2 / tab Visão Geral.
 *
 * Todos os números aqui são placeholders editorialmente coerentes com o
 * estado real esperado quando o produto tiver clientes. Vão ser substituídos
 * por queries Supabase em iteração posterior.
 *
 * Não usar estas constantes em rotas públicas (`/`, `/analyze`, `/report/*`).
 */

export const MOCK_FUNNEL = {
  visitors: { eyebrow: "Visitantes anónimos", value: "1.847" },
  freeAnalyses: { eyebrow: "Análises grátis feitas", value: "2.314" },
  leads: { eyebrow: "Leads · registados", value: "312" },
  visitorToLead: { eyebrow: "conversão visitante → lead", value: "16.9%" },
  customers: { eyebrow: "Clientes · pagaram", value: "125" },
  leadToCustomer: { eyebrow: "conversão lead → cliente", value: "40.1%" },
  totals: [
    {
      eyebrow: "Conversão total",
      value: "6.8%",
      sub: "visitante → cliente",
    },
    {
      eyebrow: "Receita por lead",
      value: "€9.13",
      sub: "€2.847 ÷ 312 leads",
    },
    {
      eyebrow: "Valor médio cliente",
      value: "€22.78",
      sub: "€2.847 ÷ 125 clientes",
    },
  ],
} as const;

export const MOCK_REVENUE_KPIS = {
  /** Métrica herói — saúde do negócio (receita previsível). */
  mrr: {
    eyebrow: "MRR · subscrições",
    value: "€684",
    deltaText: "+12%",
    deltaDirection: "up" as const,
    sub: "38 subscritores activos · ARPU €18",
  },
  oneOff: {
    eyebrow: "Avulso · 30 dias",
    value: "€2.163",
    highlightText: "87 reports",
    sub: "€24.86 ticket médio",
  },
  total: {
    eyebrow: "Receita total · 30 dias",
    value: "€2.847",
    deltaText: "+18%",
    deltaDirection: "up" as const,
    sub: "€94.90 média diária",
  },
  arpu: {
    eyebrow: "ARPU · 30 dias",
    value: "€22.78",
    sub: "€2.847 ÷ 125 clientes",
  },
} as const;

/**
 * Evolução diária da receita — 30 dias.
 * Σ subs = €684 (= MRR), Σ avulso = €2.163, Σ total = €2.847.
 */
export const MOCK_DAILY_REVENUE = [
  { day: "01", subs: 22, oneOff: 23 },
  { day: "02", subs: 22, oneOff: 36 },
  { day: "03", subs: 22, oneOff: 36 },
  { day: "04", subs: 32, oneOff: 36 },
  { day: "05", subs: 22, oneOff: 36 },
  { day: "06", subs: 24, oneOff: 50 },
  { day: "07", subs: 22, oneOff: 50 },
  { day: "08", subs: 22, oneOff: 50 },
  { day: "09", subs: 22, oneOff: 50 },
  { day: "10", subs: 22, oneOff: 50 },
  { day: "11", subs: 24, oneOff: 63 },
  { day: "12", subs: 24, oneOff: 63 },
  { day: "13", subs: 24, oneOff: 63 },
  { day: "14", subs: 22, oneOff: 63 },
  { day: "15", subs: 24, oneOff: 77 },
  { day: "16", subs: 24, oneOff: 77 },
  { day: "17", subs: 22, oneOff: 77 },
  { day: "18", subs: 22, oneOff: 77 },
  { day: "19", subs: 22, oneOff: 77 },
  { day: "20", subs: 24, oneOff: 90 },
  { day: "21", subs: 22, oneOff: 90 },
  { day: "22", subs: 22, oneOff: 90 },
  { day: "23", subs: 22, oneOff: 90 },
  { day: "24", subs: 22, oneOff: 104 },
  { day: "25", subs: 22, oneOff: 104 },
  { day: "26", subs: 22, oneOff: 104 },
  { day: "27", subs: 22, oneOff: 104 },
  { day: "28", subs: 22, oneOff: 104 },
  { day: "29", subs: 22, oneOff: 117 },
  { day: "30", subs: 22, oneOff: 112 },
] as const;

export const MOCK_EXPENSE = {
  apify: {
    label: "APIFY",
    spent: 18.42,
    cap: 29,
    projection: 21.3,
  },
  openai: {
    label: "OPENAI",
    spent: 9.87,
    cap: 25,
    projection: 11.4,
    softCap: true,
  },
  total: {
    spent: 28.29,
    revenuePct: 9,
    operatingMarginPct: 91,
    apifyShare: 65,
    openaiShare: 35,
  },
} as const;

/**
 * Custos diários (30 dias) — Apify + OpenAI empilhados.
 * Σ Apify = $18.42, Σ OpenAI = $9.87, Σ total = $28.29.
 * 27/30 dias abaixo do limite diário ($0.97), 3 picos por análises pesadas.
 */
export const MOCK_DAILY_COSTS = [
  { day: "01", apify: 0.53, openai: 0.30 },
  { day: "02", apify: 0.62, openai: 0.29 },
  { day: "03", apify: 0.52, openai: 0.31 },
  { day: "04", apify: 0.56, openai: 0.25 },
  { day: "05", apify: 0.44, openai: 0.35 },
  { day: "06", apify: 0.54, openai: 0.30 },
  { day: "07", apify: 0.58, openai: 0.32 },
  { day: "08", apify: 0.63, openai: 0.24 },
  { day: "09", apify: 0.42, openai: 0.30 },
  { day: "10", apify: 0.47, openai: 0.24 },
  { day: "11", apify: 0.41, openai: 0.31 },
  { day: "12", apify: 1.39, openai: 0.79 },
  { day: "13", apify: 0.58, openai: 0.22 },
  { day: "14", apify: 0.57, openai: 0.28 },
  { day: "15", apify: 0.52, openai: 0.33 },
  { day: "16", apify: 0.61, openai: 0.32 },
  { day: "17", apify: 1.32, openai: 0.85 },
  { day: "18", apify: 0.57, openai: 0.22 },
  { day: "19", apify: 0.54, openai: 0.23 },
  { day: "20", apify: 0.40, openai: 0.22 },
  { day: "21", apify: 1.21, openai: 0.84 },
  { day: "22", apify: 0.57, openai: 0.22 },
  { day: "23", apify: 0.62, openai: 0.30 },
  { day: "24", apify: 0.48, openai: 0.30 },
  { day: "25", apify: 0.56, openai: 0.25 },
  { day: "26", apify: 0.54, openai: 0.25 },
  { day: "27", apify: 0.58, openai: 0.26 },
  { day: "28", apify: 0.53, openai: 0.22 },
  { day: "29", apify: 0.59, openai: 0.23 },
  { day: "30", apify: 0.52, openai: 0.33 },
] as const;

export const DAILY_COST_LIMIT = 29 / 30; // $0.97

export const MOCK_KANBAN = [
  {
    id: "subscription",
    title: "Subscrição activa",
    subtitle: "receita previsível",
    accent: "revenue" as const,
    count: 38,
    items: [
      { name: "Ana Marques", meta: "Pro · €18 · 4 reports" },
      { name: "Pedro Silva", meta: "Agency · €49 · 12 reports" },
      { name: "Joana Costa", meta: "Pro · €18 · 7 reports" },
    ],
  },
  {
    id: "recurring",
    title: "Avulso recorrente",
    subtitle: "alvo conversão sub",
    accent: "leads" as const,
    count: 14,
    items: [
      { name: "Inês Costa", meta: "3 compras · €87" },
      { name: "Rui Tavares", meta: "2 compras · €58" },
      { name: "Marta Lopes", meta: "2 compras · €58" },
    ],
  },
  {
    id: "single",
    title: "Avulso · 1 compra",
    subtitle: "remarketing",
    accent: "expense" as const,
    count: 73,
    items: [
      { name: "João Pereira", meta: "€29 · há 2h" },
      { name: "Sofia Almeida", meta: "€29 · há 5h" },
      { name: "Tiago Ribeiro", meta: "€29 · ontem" },
    ],
  },
  {
    id: "lead",
    title: "Lead · sem compra",
    subtitle: "funil topo",
    accent: "neutral" as const,
    count: 187,
    items: [
      { name: "Carla Mendes", meta: "3 análises · há 1d" },
      { name: "Bruno Faria", meta: "5 análises · há 3d" },
      { name: "Helena Vaz", meta: "2 análises · há 4d" },
    ],
  },
] as const;

export const MOCK_INTENT_REPEATED = [
  { profile: "@nikeportugal", lead: "Carla Mendes", count: "7×", time: "48h" },
  { profile: "@continente", lead: "Bruno Faria", count: "5×", time: "72h" },
  { profile: "@galpenergia", lead: "Sofia Almeida", count: "4×", time: "24h" },
  { profile: "@worten", lead: "Helena Vaz", count: "3×", time: "96h" },
] as const;

export const MOCK_RECENT_REPORTS = [
  {
    profile: "@nikeportugal",
    customer: "Ana Marques",
    plan: "sub",
    status: "entregue" as const,
  },
  {
    profile: "@continente",
    customer: "Pedro Silva",
    plan: "sub",
    status: "entregue" as const,
  },
  {
    profile: "@worten",
    customer: "Inês Costa",
    plan: "avulso",
    status: "a processar" as const,
  },
  {
    profile: "@galpenergia",
    customer: "João Pereira",
    plan: "avulso",
    status: "entregue" as const,
  },
] as const;

/* =====================================================================
 * Tab Receita — datasets
 * ===================================================================== */

/** KPIs principais da tab Receita (2 linhas × 4 cartões). */
export const MOCK_MRR_METRICS = {
  // Linha 1 — receita recorrente
  mrr: {
    eyebrow: "MRR",
    value: "€684",
    deltaText: "+€72",
    deltaDirection: "up" as const,
    sub: "vs €612 mês anterior",
  },
  arr: {
    eyebrow: "ARR projectado",
    value: "€8.208",
    sub: "MRR × 12",
  },
  arpu: {
    eyebrow: "ARPU",
    value: "€18.00",
    sub: "€684 ÷ 38 subscritores",
  },
  churn: {
    eyebrow: "Churn mensal",
    value: "2.6%",
    suffix: "1 cancel.",
    sub: "retenção 97.4%",
  },
  // Linha 2 — outras métricas
  ltv: {
    eyebrow: "LTV estimado",
    value: "€692",
    sub: "ARPU ÷ churn",
  },
  oneOff: {
    eyebrow: "Receita avulsa",
    value: "€2.163",
    sub: "87 reports · ticket €24.86",
  },
  total: {
    eyebrow: "Receita total",
    value: "€2.847",
    deltaText: "+18%",
    deltaDirection: "up" as const,
    sub: "vs mês anterior",
  },
  mix: {
    eyebrow: "Mix subscrição",
    value: "24%",
    sub: "€684 de €2.847 · sub vs total",
  },
} as const;

/**
 * Waterfall MRR — 612 → 684.
 * `type: "total"` representa pontos âncora (inicial / final).
 */
export const MOCK_MRR_WATERFALL = [
  { label: "MRR inicial",   type: "total" as const,    value: 612 },
  { label: "+ Novo",        type: "positive" as const, value: 126 },
  { label: "+ Expansão",    type: "positive" as const, value:  18 },
  { label: "− Contracção",  type: "negative" as const, value: -18 },
  { label: "− Churn",       type: "negative" as const, value: -54 },
  { label: "MRR final",     type: "total" as const,    value: 684 },
];

/** Detalhe textual por baixo do waterfall (5 colunas). */
export const MOCK_MRR_WATERFALL_DETAIL = [
  { label: "Inicial",       value: "€612",  sub: "34 subscritores",       tone: "neutral" as const },
  { label: "+ Novo",        value: "+€126", sub: "7 novos sub",           tone: "positive" as const },
  { label: "+ Expansão",    value: "+€18",  sub: "1 upgrade Pro→Agency",  tone: "positive" as const },
  { label: "− Contracção",  value: "−€18",  sub: "2 downgrades",          tone: "negative" as const },
  { label: "− Churn",       value: "−€54",  sub: "1 Agency cancelou",     tone: "negative" as const },
] as const;

/**
 * Distribuição por plano — barra horizontal por plano.
 * `pct` é proporção do MRR total reportada na descrição (não soma 100% por design).
 */
import type { AdminAccent } from "@/components/admin/v2/admin-tokens";

export interface PlanDistribution {
  name: string;
  price: string;
  subs: number;
  mrr: number;
  pct: number;
  accent: AdminAccent;
  /** Quando true, usa o tom 800 do esmeralda (Agency). */
  dark?: boolean;
}

export const MOCK_PLAN_DISTRIBUTION: PlanDistribution[] = [
  { name: "Starter", price: "€9/mês",  subs: 9,  mrr: 81,  pct: 12, accent: "revenue-alt" },
  { name: "Pro",     price: "€18/mês", subs: 23, mrr: 414, pct: 60, accent: "revenue" },
  { name: "Agency",  price: "€49/mês", subs: 6,  mrr: 294, pct: 43, accent: "revenue", dark: true },
];

export const MOCK_PLAN_TOTALS = {
  mrr: "€789",
  subs: "38",
} as const;

/** Concentração de receita por escalão de cliente. */
export const MOCK_CONCENTRATION = [
  {
    label: "10%",
    title: "Top 10% clientes",
    sub: "4 clientes · €312 MRR",
    revenue: "46%",
    bg: "rgb(var(--admin-revenue-900))",
    fg: "#ffffff",
  },
  {
    label: "25%",
    title: "Top 25%",
    sub: "10 clientes · €492 MRR",
    revenue: "72%",
    bg: "rgb(var(--admin-revenue-500))",
    fg: "#ffffff",
  },
  {
    label: "50%",
    title: "Bottom 50%",
    sub: "19 clientes · €192 MRR",
    revenue: "28%",
    bg: "rgb(var(--admin-revenue-alt-400))",
    fg: "rgb(var(--admin-revenue-alt-900))",
  },
] as const;

/**
 * Cohorts de retenção mensal.
 * `null` representa meses ainda não atingidos pelo cohort.
 */
export const MOCK_COHORTS: ReadonlyArray<{
  cohort: string;
  start: number;
  retention: ReadonlyArray<number | null>;
}> = [
  { cohort: "Out 2025", start: 8, retention: [100, 88, 75, 75, 63, 63] },
  { cohort: "Nov 2025", start: 6, retention: [100, 83, 83, 67, 67, null] },
  { cohort: "Dez 2025", start: 9, retention: [100, 89, 78, 78, null, null] },
  { cohort: "Jan 2026", start: 5, retention: [100, 100, 80, null, null, null] },
  { cohort: "Fev 2026", start: 4, retention: [100, 100, null, null, null, null] },
  { cohort: "Mar 2026", start: 7, retention: [100, null, null, null, null, null] },
];

/** Últimas 6 faturas / movimentos. */
export const MOCK_INVOICES = [
  { date: "26/04 21:02", customer: "Ana Marques",    type: "subscrição" as const, item: "Pro · renovação",          amount: "€18.00", status: "paga" as const },
  { date: "26/04 19:34", customer: "João Pereira",   type: "avulso" as const,     item: "Report @galpenergia",      amount: "€29.00", status: "paga" as const },
  { date: "26/04 16:18", customer: "Sofia Almeida",  type: "avulso" as const,     item: "Report @worten",           amount: "€29.00", status: "paga" as const },
  { date: "26/04 14:02", customer: "Pedro Silva",    type: "subscrição" as const, item: "Agency · renovação",       amount: "€49.00", status: "paga" as const },
  { date: "25/04 22:41", customer: "Tiago Ribeiro",  type: "avulso" as const,     item: "Report @sportzone",        amount: "€29.00", status: "falhou" as const },
  { date: "25/04 18:08", customer: "Inês Costa",     type: "avulso" as const,     item: "Report @worten",           amount: "€29.00", status: "paga" as const },
] as const;