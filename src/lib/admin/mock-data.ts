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
  mrr: {
    eyebrow: "MRR · subscrições",
    value: "€684",
    deltaText: "+12%",
    deltaDirection: "up" as const,
    sub: "38 subscritores activos",
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
} as const;

/**
 * Evolução diária (mês corrente em curso) — 26 dias.
 * subscrições constante a €22, avulso crescente.
 */
export const MOCK_DAILY_REVENUE = Array.from({ length: 26 }, (_, i) => {
  const day = i + 1;
  const subs = 22;
  // Curva crescente suave com algum ruído determinístico
  const oneOff = Math.round(35 + i * 2.4 + ((i * 7) % 11));
  return { day: String(day).padStart(2, "0"), subs, oneOff };
});

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
 * Custos diários (26 dias) — Apify + OpenAI empilhados.
 * Soma média ≈ $1.10/dia, abaixo do limite $0.97 nalguns dias.
 */
export const MOCK_DAILY_COSTS = Array.from({ length: 26 }, (_, i) => {
  const day = i + 1;
  const apify = Number((0.45 + ((i * 13) % 9) * 0.05).toFixed(2));
  const openai = Number((0.25 + ((i * 7) % 6) * 0.04).toFixed(2));
  return { day: String(day).padStart(2, "0"), apify, openai };
});

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