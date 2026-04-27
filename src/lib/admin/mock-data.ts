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