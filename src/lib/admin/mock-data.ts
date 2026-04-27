/**
 * MOCK DATA — admin v2 / tab Visão Geral.
 *
 * Todos os números aqui são placeholders editorialmente coerentes com o
 * estado real esperado quando o produto tiver clientes. Vão ser substituídos
 * por queries Supabase em iteração posterior.
 *
 * Não usar estas constantes em rotas públicas (`/`, `/analyze`, `/report/*`).
 */

/**
 * MODELO DE DADOS — tab Clientes (futura migração Supabase).
 *
 * Documentado aqui para referência. Não criar tabelas ainda; usar apenas os
 * mocks abaixo (`MOCK_PIPELINE`, `MOCK_CUSTOMERS_LIST`, `MOCK_SELECTED_CUSTOMER`,
 * `MOCK_CUSTOMER_ACTIVITY`, `MOCK_CUSTOMER_PROFILES`, `MOCK_CUSTOMER_NOTES`).
 *
 * ```ts
 * type Customer = {
 *   id: string;
 *   name: string;
 *   email: string;
 *   location?: string;
 *   state: 'lead' | 'one_time' | 'recurring' | 'subscription' | 'churned';
 *   plan?: 'starter' | 'pro' | 'agency';
 *   monthly_value?: number;
 *   total_spent: number;          // LTV realizado
 *   reports_count: number;
 *   free_analyses_count: number;
 *   signed_up_at: Date;
 *   last_activity_at: Date;
 *   health_score?: number;        // 0-10
 *   signal?: 'active' | 'sub_candidate' | 'repeated_search' | 'at_risk' | null;
 * };
 *
 * type CustomerNote = {
 *   id: string;
 *   customer_id: string;
 *   title: string;
 *   body: string;
 *   created_at: Date;
 * };
 *
 * type CustomerActivity = {
 *   id: string;
 *   customer_id: string;
 *   type: 'payment' | 'report_generated' | 'free_analysis'
 *       | 'subscription_started' | 'subscription_changed';
 *   description: string;
 *   occurred_at: Date;
 *   metadata?: Record<string, unknown>;
 * };
 * ```
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

/* ============================================================
 * Tab Clientes
 * ============================================================ */

/** Pipeline horizontal — 4 estados + 3 transições entre eles. */
export const MOCK_PIPELINE = {
  states: [
    {
      key: "lead",
      eyebrow: "Lead · sem compra",
      value: "187",
      sub: "+24 novos · 38 activos esta semana",
      // Estilo cinza-pedra (border-left + tom 50)
      borderColor: "#B4B2A9",
      bg: "rgb(var(--admin-neutral-50))",
      eyebrowColor: "rgb(var(--admin-neutral-600))",
      valueColor: "rgb(var(--admin-neutral-900))",
      subColor: "rgb(var(--admin-neutral-600))",
    },
    {
      key: "one_time",
      eyebrow: "Avulso · 1 compra",
      value: "73",
      sub: "+14 este mês · €29 média",
      borderColor: "#EF9F27",
      bg: "#FAEEDA",
      eyebrowColor: "#854F0B",
      valueColor: "#412402",
      subColor: "#854F0B",
    },
    {
      key: "recurring",
      eyebrow: "Avulso recorrente",
      value: "14",
      sub: "2-3 compras · €72 média",
      borderColor: "#534AB7",
      bg: "#EEEDFE",
      eyebrowColor: "#3C3489",
      valueColor: "#26215C",
      subColor: "#3C3489",
    },
    {
      key: "subscription",
      eyebrow: "Subscrição activa",
      value: "38",
      sub: "+7 este mês · €18 ARPU",
      borderColor: "#1D9E75",
      bg: "#E1F5EE",
      eyebrowColor: "#085041",
      valueColor: "#04342C",
      subColor: "#085041",
    },
  ],
  transitions: [
    { from: "lead", to: "one_time", qty: 23 },
    { from: "one_time", to: "recurring", qty: 8 },
    { from: "recurring", to: "subscription", qty: 3 },
  ],
} as const;

export const MOCK_PIPELINE_FOOTER = {
  conversions: [
    { label: "lead → cliente", value: "12.3%" },
    { label: "cliente → recorrente", value: "11.0%" },
    { label: "recorrente → sub", value: "21.4%" },
  ],
  churn: "1 cancelamento",
} as const;

/** Filtros pill no header da tabela. */
export const MOCK_CUSTOMERS_TOTALS = [
  { key: "all", label: "Todos", count: 312 },
  { key: "subscribers", label: "Subscritores", count: 38 },
  { key: "one_off", label: "Avulso", count: 87 },
  { key: "at_risk", label: "Em risco", count: 5 },
] as const;

export type CustomerSignalKind =
  | "active"
  | "sub_candidate"
  | "repeated_search"
  | "at_risk"
  | "none";

export type CustomerAvatarVariant = "revenue" | "leads" | "neutral";

export type CustomerBadgeVariant =
  | "revenue"
  | "leads"
  | "expense"
  | "neutral";

export interface CustomerRow {
  id: string;
  initials: string;
  name: string;
  email: string;
  badgeLabel: string;
  badgeVariant: CustomerBadgeVariant;
  avatarVariant: CustomerAvatarVariant;
  ltv: string;            // "€144" ou "—"
  reports: string;        // "12" ou "3 grátis"
  reportsMuted?: boolean; // true para "X grátis"
  lastActivity: string;
  signal: { kind: CustomerSignalKind; label?: string };
  selected?: boolean;
}

export const MOCK_CUSTOMERS_LIST: ReadonlyArray<CustomerRow> = [
  {
    id: "pedro-silva",
    initials: "PS",
    name: "Pedro Silva",
    email: "pedro@agencianext.pt",
    badgeLabel: "Agency · €49",
    badgeVariant: "revenue",
    avatarVariant: "revenue",
    ltv: "€392",
    reports: "12",
    lastActivity: "há 3h",
    signal: { kind: "active" },
  },
  {
    id: "ana-marques",
    initials: "AM",
    name: "Ana Marques",
    email: "ana.marques@nike.pt",
    badgeLabel: "Pro · €18",
    badgeVariant: "revenue",
    avatarVariant: "leads",
    ltv: "€144",
    reports: "4",
    lastActivity: "há 12 min",
    signal: { kind: "active" },
    selected: true,
  },
  {
    id: "ines-costa",
    initials: "IC",
    name: "Inês Costa",
    email: "ines@flow.pt",
    badgeLabel: "Avulso recorrente",
    badgeVariant: "leads",
    avatarVariant: "leads",
    ltv: "€87",
    reports: "3",
    lastActivity: "há 1h",
    signal: { kind: "sub_candidate", label: "candidato sub" },
  },
  {
    id: "joana-costa",
    initials: "JC",
    name: "Joana Costa",
    email: "joana@brandlab.pt",
    badgeLabel: "Pro · €18",
    badgeVariant: "revenue",
    avatarVariant: "revenue",
    ltv: "€126",
    reports: "7",
    lastActivity: "há 6h",
    signal: { kind: "active" },
  },
  {
    id: "joao-pereira",
    initials: "JP",
    name: "João Pereira",
    email: "joao.p@galp.pt",
    badgeLabel: "Avulso · 1 compra",
    badgeVariant: "expense",
    avatarVariant: "neutral",
    ltv: "€29",
    reports: "1",
    lastActivity: "há 2h",
    signal: { kind: "none" },
  },
  {
    id: "carla-mendes",
    initials: "CM",
    name: "Carla Mendes",
    email: "carla.m@gmail.com",
    badgeLabel: "Lead",
    badgeVariant: "neutral",
    avatarVariant: "neutral",
    ltv: "—",
    reports: "3 grátis",
    reportsMuted: true,
    lastActivity: "há 1d",
    signal: { kind: "repeated_search", label: "7× repetiu" },
  },
  {
    id: "rui-tavares",
    initials: "RT",
    name: "Rui Tavares",
    email: "rui@socialedge.pt",
    badgeLabel: "Starter · €9",
    badgeVariant: "revenue",
    avatarVariant: "revenue",
    ltv: "€36",
    reports: "2",
    lastActivity: "há 2 sem",
    signal: { kind: "at_risk", label: "em risco" },
  },
];

/** Cliente seleccionado (Ana Marques). */
export const MOCK_SELECTED_CUSTOMER = {
  initials: "AM",
  name: "Ana Marques",
  email: "ana.marques@nike.pt",
  location: "Lisboa, PT",
  planLabel: "Pro · €18/mês",
  since: "desde 12 Jan 2026",
  kpis: [
    { eyebrow: "Receita gerada", value: "€144", sub: "8 meses como sub" },
    { eyebrow: "Reports gerados", value: "4", sub: "média 0.5/mês" },
    { eyebrow: "LTV projectado", value: "€692", sub: "a 38 meses" },
    {
      eyebrow: "Saúde",
      value: "8.4",
      sub: "activa, paga em dia",
      bars: { filled: 4, total: 5 },
    },
  ],
} as const;

export type CustomerActivityType =
  | "payment"
  | "report"
  | "free_analysis"
  | "subscription_started";

export const MOCK_CUSTOMER_ACTIVITY: ReadonlyArray<{
  type: CustomerActivityType;
  title: string;
  detail: string;
}> = [
  {
    type: "payment",
    title: "Pagamento Pro · €18.00",
    detail: "há 12 min · renovação automática",
  },
  {
    type: "report",
    title: "Report gerado · @nikeportugal",
    detail: "há 12 min · entregue por email",
  },
  {
    type: "free_analysis",
    title: "Análise pública · @adidasportugal",
    detail: "há 2 dias · não converteu em report",
  },
  {
    type: "report",
    title: "Report gerado · @nikeportugal",
    detail: "há 5 dias · entregue",
  },
  {
    type: "payment",
    title: "Pagamento Pro · €18.00",
    detail: "26 Mar · renovação automática",
  },
  {
    type: "subscription_started",
    title: "Subscreveu plano Pro",
    detail: "12 Jan · primeira compra",
  },
];

export const MOCK_CUSTOMER_PROFILES: ReadonlyArray<{
  handle: string;
  classification: string;
  classificationMuted?: boolean;
  count: string;
  countMuted?: boolean;
  when: string;
}> = [
  {
    handle: "@nikeportugal",
    classification: "marca própria",
    count: "3 reports",
    when: "último há 12min",
  },
  {
    handle: "@adidasportugal",
    classification: "concorrente",
    count: "1 report",
    when: "há 8 dias",
  },
  {
    handle: "@pumaportugal",
    classification: "concorrente",
    count: "só análise",
    countMuted: true,
    when: "há 14 dias",
  },
];

export const MOCK_CUSTOMER_NOTES = [
  {
    title: "Brand manager Nike Portugal",
    body: "Cliente-âncora · contactar antes de qualquer mudança de pricing.",
  },
] as const;

/* ============================================================
 * MOCK DATA — tab Relatórios
 * ============================================================ */

export type ReportPipelineHealth = "ok" | "warn" | "critical";

export const MOCK_PIPELINE_PHASES: ReadonlyArray<{
  id: "request" | "analysis" | "pdf" | "email";
  eyebrow: string;
  label: string;
  value: number;
  sub: string;
  /** Literal para `border-left` — fica em `ADMIN_LITERAL.pipeline*`. */
  accentKey: "pipelineRequest" | "pipelineAnalysis" | "pipelinePdf" | "pipelineEmail";
  health: ReportPipelineHealth;
}> = [
  {
    id: "request",
    eyebrow: "PEDIDO",
    label: "recebido",
    value: 12,
    sub: "em fila",
    accentKey: "pipelineRequest",
    health: "ok",
  },
  {
    id: "analysis",
    eyebrow: "ANÁLISE",
    label: "Apify",
    value: 3,
    sub: "a correr",
    accentKey: "pipelineAnalysis",
    health: "ok",
  },
  {
    id: "pdf",
    eyebrow: "PDF",
    label: "gerado",
    value: 2,
    sub: "a renderizar",
    accentKey: "pipelinePdf",
    health: "ok",
  },
  {
    id: "email",
    eyebrow: "EMAIL",
    label: "entregue",
    value: 147,
    sub: "entregues hoje",
    accentKey: "pipelineEmail",
    health: "ok",
  },
];

export const MOCK_PIPELINE_AGGREGATES = {
  avgTotalTime: { eyebrow: "TEMPO MÉDIO TOTAL", value: "4m 12s", sub: "do pedido ao email" },
  successRate: { eyebrow: "TAXA DE ENTREGA", value: "98.6%", sub: "últimas 24h" },
  failuresToRecover: { eyebrow: "FALHAS A RECUPERAR", value: 2, sub: "intervenção manual" },
  avgCost: { eyebrow: "CUSTO MÉDIO", value: "$0.34", sub: "Apify + OpenAI" },
} as const;

export const MOCK_REPORT_METRICS = {
  delivered: {
    eyebrow: "Relatórios entregues · 30d",
    value: 147,
    delta: { text: "+18% vs mês anterior", direction: "up" as const },
    sub: "ritmo de 4.9/dia",
    info: "Total de relatórios entregues por email com sucesso nos últimos 30 dias.",
  },
  avgTime: {
    eyebrow: "Tempo médio · entrega",
    value: "4m 12s",
    sub: "P95: 8m 31s",
    info: "Tempo médio entre pedido e email entregue. P95 indica o percentil 95 — 95% dos relatórios são mais rápidos que este valor.",
  },
  successRate: {
    eyebrow: "Taxa de sucesso",
    value: "98.6%",
    delta: { text: "+0.4 p.p.", direction: "up" as const },
    sub: "2 falhas em 147",
    info: "Percentagem de relatórios entregues com sucesso (sem necessidade de intervenção manual).",
  },
  avgCost: {
    eyebrow: "Custo médio · por relatório",
    value: "$0.34",
    /** down semanticamente positivo — despesa a baixar. Renderizado verde. */
    delta: { text: "−$0.04", direction: "down-good" as const },
    sub: "$0.21 Apify + $0.13 OpenAI",
    info: "Custo combinado de Apify (scraping) e OpenAI (análise IA) dividido pelo número de relatórios.",
  },
} as const;

/** Volume diário (30d). Determinístico: variação por índice em vez de Math.random. */
export const MOCK_DAILY_VOLUME: ReadonlyArray<{
  day: number;
  delivered: number;
  failed: number;
  queued: number;
}> = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  // Padrão: subida ao longo do mês com pequena variação cíclica.
  const base = 3 + Math.round(2 + Math.sin(i / 2.4) * 1.6 + i * 0.05);
  const delivered = Math.max(2, base);
  const failed = i % 9 === 0 ? 1 : 0;
  const queued = i === 29 ? 2 : i % 5 === 0 ? 1 : 0;
  return { day, delivered, failed, queued };
});

/** Tempo médio diário em segundos (30d), oscilando à volta de 4m. */
export const MOCK_DAILY_TIMING: ReadonlyArray<{
  day: number;
  avgSeconds: number;
}> = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const base = 240; // 4 minutos
  const wave = Math.round(Math.sin(i / 3) * 35 + Math.cos(i / 5) * 18);
  const drift = i > 24 ? 30 : 0; // pequeno aumento na última semana (perto do SLA)
  return { day, avgSeconds: base + wave + drift };
});

/** SLA-alvo em segundos (5 minutos). */
export const REPORT_SLA_SECONDS = 300;

export type ReportStatus = "delivered" | "processing" | "queued" | "failed";
export type ReportOrigin = "subscription" | "one_off";

export interface MockReport {
  id: string;
  customer: string;
  profile: string;
  origin: ReportOrigin;
  status: ReportStatus;
  startedAt: string; // pré-formatado dd/MM HH:mm
  duration: string | null; // "4m 12s" | "em curso" | null se em fila
  cost: string | null; // "$0.34" | null se ainda não calculado
}

export const MOCK_REPORTS_LIST: ReadonlyArray<MockReport> = [
  {
    id: "R-2847",
    customer: "Ana Marques",
    profile: "@nikeportugal",
    origin: "subscription",
    status: "delivered",
    startedAt: "26/04 21:02",
    duration: "3m 48s",
    cost: "$0.31",
  },
  {
    id: "R-2846",
    customer: "João Pereira",
    profile: "@galpenergia",
    origin: "one_off",
    status: "delivered",
    startedAt: "26/04 19:34",
    duration: "4m 22s",
    cost: "$0.36",
  },
  {
    id: "R-2845",
    customer: "Sofia Almeida",
    profile: "@worten",
    origin: "one_off",
    status: "processing",
    startedAt: "26/04 21:14",
    duration: "em curso",
    cost: null,
  },
  {
    id: "R-2844",
    customer: "Pedro Silva",
    profile: "@continente",
    origin: "subscription",
    status: "delivered",
    startedAt: "26/04 14:02",
    duration: "4m 02s",
    cost: "$0.33",
  },
  {
    id: "R-2843",
    customer: "Inês Costa",
    profile: "@sportzone",
    origin: "one_off",
    status: "processing",
    startedAt: "26/04 21:08",
    duration: "em curso",
    cost: null,
  },
  {
    id: "R-2842",
    customer: "Tiago Ribeiro",
    profile: "@meo",
    origin: "one_off",
    status: "failed",
    startedAt: "25/04 22:41",
    duration: "1m 12s",
    cost: "$0.04",
  },
  {
    id: "R-2841",
    customer: "Marta Lopes",
    profile: "@adidasportugal",
    origin: "one_off",
    status: "queued",
    startedAt: "26/04 21:18",
    duration: null,
    cost: null,
  },
  {
    id: "R-2840",
    customer: "Rui Tavares",
    profile: "@decathlon",
    origin: "subscription",
    status: "delivered",
    startedAt: "25/04 18:08",
    duration: "3m 56s",
    cost: "$0.31",
  },
];

export const MOCK_REPORTS_COUNTS = {
  all: 147,
  delivered: 144,
  inProgress: 5,
  failed: 2,
} as const;

/* =====================================================================
 * Tab Perfis — datasets
 * ===================================================================== */

export type ProfileCategory =
  | "brand"
  | "retail"
  | "influencer"
  | "sport"
  | "other";

/** Mapa categoria → variante visual reutilizada em badges, avatares e barras. */
export const PROFILE_CATEGORY_META: Record<
  ProfileCategory,
  { label: string; badge: AdminAccent; avatar: AdminAccent }
> = {
  brand: { label: "marca", badge: "expense", avatar: "expense" },
  retail: { label: "retalho", badge: "leads", avatar: "leads" },
  influencer: { label: "influencer", badge: "revenue", avatar: "revenue" },
  sport: { label: "desporto", badge: "info", avatar: "info" },
  other: { label: "outros", badge: "neutral", avatar: "neutral" },
};

export const MOCK_PROFILES_METRICS = {
  uniqueProfiles: {
    eyebrow: "Perfis únicos · 30d",
    value: "284",
    delta: { text: "+47 novos", direction: "up" as const },
    sub: "238 análises grátis · 87 reports",
    info:
      "Perfis Instagram diferentes que foram pesquisados ou geraram relatórios pagos.",
  },
  repeated: {
    eyebrow: "Repetidos · 2+ análises",
    value: "62",
    sub: "21.8% do total · sinal de intenção",
    info:
      "Perfis pesquisados múltiplas vezes pelo mesmo utilizador. Sinal forte de intenção de compra.",
  },
  conversion: {
    eyebrow: "Conversão · pesquisa → report",
    value: "30.6%",
    delta: { text: "+2.1 p.p.", direction: "up" as const },
    sub: "87 reports de 284 perfis",
    info:
      "Percentagem de perfis pesquisados que geraram pelo menos um relatório pago.",
  },
  avgRevenuePerProfile: {
    eyebrow: "Receita média · por perfil",
    value: "€10.02",
    sub: "€2.847 ÷ 284 perfis",
    info:
      "Receita total dividida pelo número de perfis únicos analisados.",
  },
} as const;

export interface MockTopProfile {
  rank: number;
  handle: string;
  category: ProfileCategory;
  /** Sub-categoria editorial (ex.: "supermercado", "energia"). */
  sub: string;
  analyses: number;
  reports: number;
}

export const MOCK_TOP_PROFILES: ReadonlyArray<MockTopProfile> = [
  { rank: 1,  handle: "@nikeportugal",    category: "brand",   sub: "desporto",      analyses: 47, reports: 12 },
  { rank: 2,  handle: "@continente",      category: "retail",  sub: "supermercado",  analyses: 38, reports:  8 },
  { rank: 3,  handle: "@galpenergia",     category: "brand",   sub: "energia",       analyses: 34, reports: 11 },
  { rank: 4,  handle: "@worten",          category: "retail",  sub: "electrónica",   analyses: 29, reports:  7 },
  { rank: 5,  handle: "@sportzone",       category: "retail",  sub: "desporto",      analyses: 24, reports:  5 },
  { rank: 6,  handle: "@meo",             category: "brand",   sub: "telecom",       analyses: 22, reports:  6 },
  { rank: 7,  handle: "@adidasportugal",  category: "brand",   sub: "desporto",      analyses: 19, reports:  4 },
  { rank: 8,  handle: "@decathlon",       category: "retail",  sub: "desporto",      analyses: 17, reports:  4 },
  { rank: 9,  handle: "@pumaportugal",    category: "brand",   sub: "desporto",      analyses: 15, reports:  3 },
  { rank: 10, handle: "@glovoapp",        category: "brand",   sub: "delivery",      analyses: 14, reports:  3 },
];

export interface MockProfileCategorySlice {
  category: string;
  count: number;
  pct: number;
  color: string;
}

export const MOCK_PROFILES_BY_CATEGORY: ReadonlyArray<MockProfileCategorySlice> = [
  { category: "Marcas",          count: 108, pct: 38, color: "#BA7517" },
  { category: "Retalho",         count:  68, pct: 24, color: "#534AB7" },
  { category: "Influenciadores", count:  51, pct: 18, color: "#1D9E75" },
  { category: "Desporto",        count:  34, pct: 12, color: "#185FA5" },
  { category: "Outros",          count:  23, pct:  8, color: "#888780" },
];

export interface MockRepeatedSearch {
  profile: string;
  user: string;
  count: string;
  window: string;
}

export const MOCK_REPEATED_SEARCHES: ReadonlyArray<MockRepeatedSearch> = [
  { profile: "@nikeportugal",   user: "Carla Mendes",   count: "7×", window: "48h" },
  { profile: "@continente",     user: "Bruno Faria",    count: "5×", window: "72h" },
  { profile: "@galpenergia",    user: "Sofia Almeida",  count: "4×", window: "24h" },
  { profile: "@worten",         user: "Helena Vaz",     count: "3×", window: "96h" },
  { profile: "@adidasportugal", user: "Tiago Ribeiro",  count: "3×", window: "24h" },
  { profile: "@meo",            user: "Filipa Santos",  count: "3×", window: "5d"  },
];

export interface MockProfileFunnel {
  handle: string;
  analyses: number;
  reports: number;
  conversionPct: string;
}

export const MOCK_PROFILE_FUNNELS: ReadonlyArray<MockProfileFunnel> = [
  { handle: "@nikeportugal", analyses: 47, reports: 12, conversionPct: "25.5%" },
  { handle: "@continente",   analyses: 38, reports:  8, conversionPct: "21.1%" },
  { handle: "@galpenergia",  analyses: 34, reports: 11, conversionPct: "32.4%" },
  { handle: "@worten",       analyses: 29, reports:  7, conversionPct: "24.1%" },
  { handle: "@sportzone",    analyses: 24, reports:  5, conversionPct: "20.8%" },
];

export interface MockProfileRow {
  handle: string;
  category: ProfileCategory;
  sub: string;
  analyses: number;
  reports: number;
  conversionPct: number; // numérico para semáforo
  revenue: string | null;
  lastActivity: string;
}

export const MOCK_PROFILES_LIST: ReadonlyArray<MockProfileRow> = [
  { handle: "@nikeportugal",     category: "brand",      sub: "desporto",     analyses: 47, reports: 12, conversionPct: 25.5, revenue: "€348", lastActivity: "há 12 min" },
  { handle: "@continente",       category: "retail",     sub: "supermercado", analyses: 38, reports:  8, conversionPct: 21.1, revenue: "€232", lastActivity: "há 38 min" },
  { handle: "@galpenergia",      category: "brand",      sub: "energia",      analyses: 34, reports: 11, conversionPct: 32.4, revenue: "€319", lastActivity: "há 2h"     },
  { handle: "@worten",           category: "retail",     sub: "electrónica",  analyses: 29, reports:  7, conversionPct: 24.1, revenue: "€203", lastActivity: "há 1h"     },
  { handle: "@sportzone",        category: "retail",     sub: "desporto",     analyses: 24, reports:  5, conversionPct: 20.8, revenue: "€145", lastActivity: "há 3h"     },
  { handle: "@meo",              category: "brand",      sub: "telecom",      analyses: 22, reports:  6, conversionPct: 27.3, revenue: "€174", lastActivity: "há 5h"     },
  { handle: "@adidasportugal",   category: "brand",      sub: "desporto",     analyses: 19, reports:  4, conversionPct: 21.1, revenue: "€116", lastActivity: "há 8h"     },
  { handle: "@cristianoronaldo", category: "influencer", sub: "pessoa",       analyses: 18, reports:  0, conversionPct:  0,   revenue: null,   lastActivity: "há 1d"     },
  { handle: "@decathlon",        category: "retail",     sub: "desporto",     analyses: 17, reports:  4, conversionPct: 23.5, revenue: "€116", lastActivity: "há 6h"     },
  { handle: "@pumaportugal",     category: "brand",      sub: "desporto",     analyses: 15, reports:  3, conversionPct: 20.0, revenue:  "€87", lastActivity: "há 12h"    },
];

export const MOCK_PROFILES_COUNTS = {
  all: 284,
  withReports: 87,
  repeated: 62,
  noConversion: 197,
} as const;

// ============================================================================
// MOCK DATA — tab Sistema
// ============================================================================

export type MockHealthStatus = "operational" | "attention" | "critical";

export interface MockSystemHealthChip {
  service: string;
  status: MockHealthStatus;
  detail: string;
}

export interface MockSmokeCheck {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface MockSecret {
  name: string;
  configured: boolean;
}

export interface MockApifyConfig {
  enabled: { value: string; sub: string };
  mode: { value: string; sub: string };
  costPerProfile: { value: string; sub: string };
  costPerPost: { value: string; sub: string };
  allowlist: string[];
}

export interface MockCostKPI {
  value: string;
  sub: string;
}

export interface MockProviderCall {
  when: string;
  provider: "Apify" | "OpenAI";
  model: string;
  handle: string;
  status: "success" | "cache" | "failure";
  http: number;
  duration: string;
  cost: string | null;
}

export interface MockAlert {
  severity: "warning" | "critical" | "info";
  title: string;
  detail: string;
  when: string;
}

export const MOCK_SYSTEM_HEALTH: MockSystemHealthChip[] = [
  { service: "Apify",       status: "operational", detail: "Operacional"      },
  { service: "Resend",      status: "operational", detail: "Operacional"      },
  { service: "OpenAI",      status: "operational", detail: "Operacional"      },
  { service: "Modo teste",  status: "operational", detail: "Allowlist activa" },
  { service: "Allowlist",   status: "operational", detail: "1 handle"         },
];

export const MOCK_SMOKE_CHECKS: MockSmokeCheck[] = [
  { name: "Token Apify",     status: "ok", detail: "Configurado"                       },
  { name: "APIFY_ENABLED",   status: "ok", detail: "Ligado · chamadas reais"           },
  { name: "Modo de teste",   status: "ok", detail: "Allowlist activa"                  },
  { name: "Perfil de teste", status: "ok", detail: "@frederico.m.carvalho permitido"   },
  { name: "Estado final",    status: "ok", detail: "Pronto para smoke"                 },
];

export const MOCK_SECRETS: MockSecret[] = [
  { name: "APIFY_TOKEN",        configured: true },
  { name: "RESEND_API_KEY",     configured: true },
  { name: "INTERNAL_API_TOKEN", configured: true },
  { name: "OPENAI_API_KEY",     configured: true },
];

export const MOCK_APIFY_CONFIG: MockApifyConfig = {
  enabled:        { value: "Ligado", sub: "chamadas reais"  },
  mode:           { value: "Activo", sub: "allowlist"        },
  costPerProfile: { value: "$0.005", sub: "por perfil"       },
  costPerPost:    { value: "$0.0005", sub: "por post"        },
  allowlist:      ["@frederico.m.carvalho"],
};

export const MOCK_COST_METRICS: {
  apify24h: MockCostKPI;
  openai24h: MockCostKPI;
  cacheHits: MockCostKPI;
  cacheSavings: MockCostKPI;
} = {
  apify24h:     { value: "$1.42", sub: "12 chamadas"        },
  openai24h:    { value: "$0.87", sub: "8 análises IA"      },
  cacheHits:    { value: "15",    sub: "61% das pesquisas"  },
  cacheSavings: { value: "$0.82", sub: "vs sem cache"        },
};

export const MOCK_PROVIDER_CALLS: MockProviderCall[] = [
  { when: "26/04 21:14", provider: "Apify",  model: "apify/instagram-scraper", handle: "@sofia.almeida",   status: "success", http: 200, duration: "6.4s",   cost: "$0.011" },
  { when: "26/04 21:08", provider: "OpenAI", model: "gpt-4o",                  handle: "analysis #2843",   status: "success", http: 200, duration: "4.2s",   cost: "$0.13"  },
  { when: "26/04 21:02", provider: "Apify",  model: "apify/instagram-scraper", handle: "@nikeportugal",    status: "cache",   http: 200, duration: "184ms",  cost: null     },
  { when: "26/04 19:34", provider: "Apify",  model: "apify/instagram-scraper", handle: "@galpenergia",     status: "success", http: 200, duration: "7.1s",   cost: "$0.011" },
  { when: "26/04 19:30", provider: "OpenAI", model: "gpt-4o",                  handle: "analysis #2846",   status: "success", http: 200, duration: "5.8s",   cost: "$0.14"  },
  { when: "26/04 18:47", provider: "Apify",  model: "apify/instagram-scraper", handle: "@worten",          status: "success", http: 200, duration: "5.9s",   cost: "$0.011" },
  { when: "26/04 16:18", provider: "Apify",  model: "apify/instagram-scraper", handle: "@worten",          status: "cache",   http: 200, duration: "124ms",  cost: null     },
  { when: "26/04 16:05", provider: "Apify",  model: "apify/instagram-scraper", handle: "@sportzone",       status: "success", http: 200, duration: "6.8s",   cost: "$0.011" },
  { when: "26/04 14:30", provider: "OpenAI", model: "gpt-4o",                  handle: "analysis #2842",   status: "failure", http: 500, duration: "12.4s",  cost: null     },
  { when: "25/04 22:41", provider: "Apify",  model: "apify/instagram-scraper", handle: "@sportzone",       status: "failure", http: 429, duration: "1.2s",   cost: "$0.004" },
];

export const MOCK_ALERTS: MockAlert[] = [
  {
    severity: "warning",
    title: "Pico de chamadas em curto período",
    detail: "@sportzone · 8 análises em 30min · limite 5/30min",
    when: "há 2h",
  },
  {
    severity: "critical",
    title: "Apify devolveu 429 (rate limit) repetidamente",
    detail: "@meo · 3 falhas consecutivas · investigar token",
    when: "há 12h",
  },
];