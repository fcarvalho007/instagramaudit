/**
 * Single source of truth for the example report.
 * All numbers, dates, and labels are consistent across every section.
 */

// Deterministic temporal series — 30 daily data points with realistic shape
function buildTemporalSeries() {
  const baseDate = new Date(2026, 2, 19); // 19 Mar 2026
  const days: Array<{
    date: string;
    isoDate: string;
    likes: number;
    comments: number;
    views: number;
  }> = [];

  // Realistic-looking pattern: midweek peaks, weekend dips, slight upward drift
  const likesPattern = [
    180, 220, 310, 285, 240, 165, 140, 195, 245, 340, 305, 270, 180, 155,
    210, 260, 360, 320, 295, 200, 175, 230, 285, 410, 365, 320, 220, 195,
    250, 290,
  ];
  const commentsPattern = [
    12, 15, 24, 21, 18, 10, 8, 14, 19, 28, 25, 20, 13, 11, 16, 21, 30, 26, 23,
    15, 12, 18, 22, 35, 30, 26, 17, 14, 19, 23,
  ];
  const viewsPattern = [
    2400, 3100, 5800, 5200, 4400, 2800, 2200, 3000, 4500, 7200, 6400, 5600,
    3000, 2600, 3800, 5000, 8400, 7000, 6200, 3400, 2900, 4100, 5400, 9800,
    8200, 6800, 3900, 3300, 4700, 6100,
  ];

  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    days.push({
      date: `${day}/${month}`,
      isoDate: d.toISOString().slice(0, 10),
      likes: likesPattern[i],
      comments: commentsPattern[i],
      views: viewsPattern[i],
    });
  }
  return days;
}

// Deterministic 7×24 heatmap matrix — peaks weekday 9-11h & 20-22h, weekend afternoons
function buildHeatmapMatrix(): number[][] {
  const m: number[][] = [];
  for (let day = 0; day < 7; day++) {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      let v = 0.05;
      // Sleep hours
      if (hour >= 0 && hour <= 6) v = 0.02;
      // Morning rise
      else if (hour >= 7 && hour <= 8) v = 0.25;
      // Morning peak (weekdays)
      else if (hour >= 9 && hour <= 11 && day < 5) v = 0.85;
      else if (hour >= 9 && hour <= 11) v = 0.45;
      // Lunch
      else if (hour >= 12 && hour <= 13) v = 0.55;
      // Afternoon
      else if (hour >= 14 && hour <= 17) v = 0.4;
      // Weekend afternoon spike
      if (hour >= 14 && hour <= 16 && (day === 5 || day === 6)) v = 0.78;
      // Evening peak (weekdays)
      if (hour >= 20 && hour <= 22 && day < 5) v = 0.92;
      // Friday night extra hot
      if (day === 4 && hour === 21) v = 1.0;
      // Wednesday morning best
      if (day === 2 && hour === 10) v = 1.0;
      // Late night drop
      if (hour === 23) v = 0.15;
      row.push(v);
    }
    m.push(row);
  }
  return m;
}

export const reportData = {
  // Editorial meta — defaults match the original visual of /report/example.
  // The real-data adapter overrides these (e.g. when the sample is smaller
  // than 30 days). Keep optional to stay backward compatible.
  meta: {
    windowLabel: "últimos 30 dias",
    windowShortLabel: "30 dias",
    kpiSubtitle: "janela de 30 dias",
    isAdminPreview: false,
    // Optional fields populated only by the real-data adapter. When absent
    // the editorial mock keeps the original copy and behaviour.
    sampleCaption: undefined as string | undefined,
    temporalLabel: undefined as string | undefined,
    topPostsSubtitle: undefined as string | undefined,
    benchmarkStatus: undefined as
      | "real"
      | "partial"
      | "placeholder"
      | undefined,
    benchmarkDatasetVersion: undefined as string | undefined,
    viewsAvailable: undefined as boolean | undefined,
  },
  profile: {
    username: "frederico.marketing",
    fullName: "Frederico Marketing",
    avatarGradient: "from-indigo-400 via-blue-400 to-cyan-400",
    followers: 15420,
    following: 834,
    postsCount: 287,
    tier: "Micro",
    tierRange: "10K–50K",
    verified: false,
    analyzedAt: "17 Abr 2026",
    windowDays: 30,
    postsAnalyzed: 36,
  },

  keyMetrics: {
    engagementRate: 0.68,
    engagementBenchmark: 1.52,
    engagementDeltaPct: -55.3,
    postsAnalyzed: 36,
    postingFrequencyWeekly: 4.4,
    dominantFormat: "Reels",
    dominantFormatShare: 69,
  },

  temporalSeries: buildTemporalSeries(),

  formatBreakdown: [
    {
      format: "Reels",
      sharePct: 69,
      engagement: 0.52,
      benchmark: 1.55,
      tint: "primary" as const,
      status: "abaixo" as const,
    },
    {
      format: "Carousels",
      sharePct: 22,
      engagement: 1.45,
      benchmark: 0.55,
      tint: "success" as const,
      status: "acima" as const,
    },
    {
      format: "Imagens",
      sharePct: 9,
      engagement: 0.98,
      benchmark: 0.37,
      tint: "warning" as const,
      status: "ligeiramente-acima" as const,
    },
  ],

  competitors: [
    {
      username: "frederico.marketing",
      label: "Perfil analisado",
      engagement: 0.68,
      followers: 15420,
      isOwn: true,
      avatarGradient: "from-indigo-400 via-blue-400 to-cyan-400",
    },
    {
      username: "marketing.digital.pt",
      label: "Concorrente 1",
      engagement: 0.5,
      followers: 12800,
      isOwn: false,
      avatarGradient: "from-rose-400 via-orange-400 to-amber-400",
    },
    {
      username: "gestor.marcas.pt",
      label: "Concorrente 2",
      engagement: 0.34,
      followers: 18900,
      isOwn: false,
      avatarGradient: "from-emerald-400 via-teal-400 to-cyan-400",
    },
  ],

  topPosts: [
    {
      id: "p1",
      date: "12 Abr",
      format: "Carousel",
      thumbnail: "from-cyan-300 via-blue-400 to-indigo-500",
      thumbnailUrl: undefined as string | undefined,
      permalink: null as string | null,
      likes: 1247,
      comments: 89,
      engagementPct: 8.6,
      caption:
        "5 erros que se cometem no primeiro ano a fazer marketing para clientes locais.",
    },
    {
      id: "p2",
      date: "08 Abr",
      format: "Carousel",
      thumbnail: "from-violet-300 via-fuchsia-400 to-rose-500",
      thumbnailUrl: undefined as string | undefined,
      permalink: null as string | null,
      likes: 982,
      comments: 64,
      engagementPct: 6.8,
      caption:
        "Como estruturar uma proposta comercial que não precisa de regateio de preço.",
    },
    {
      id: "p3",
      date: "03 Abr",
      format: "Reel",
      thumbnail: "from-amber-300 via-orange-400 to-red-500",
      thumbnailUrl: undefined as string | undefined,
      permalink: null as string | null,
      likes: 821,
      comments: 47,
      engagementPct: 5.6,
      caption:
        "O detalhe mais subestimado de uma campanha bem-sucedida no Instagram.",
    },
    {
      id: "p4",
      date: "28 Mar",
      format: "Imagem",
      thumbnail: "from-emerald-300 via-teal-400 to-cyan-500",
      thumbnailUrl: undefined as string | undefined,
      permalink: null as string | null,
      likes: 678,
      comments: 38,
      engagementPct: 4.6,
      caption: "Três métricas que importam mais do que o número de seguidores.",
    },
    {
      id: "p5",
      date: "22 Mar",
      format: "Reel",
      thumbnail: "from-slate-300 via-indigo-400 to-violet-500",
      thumbnailUrl: undefined as string | undefined,
      permalink: null as string | null,
      likes: 591,
      comments: 31,
      engagementPct: 4.0,
      caption:
        "Por que razão nenhum cliente compra logo na primeira interação.",
    },
  ],

  postingHeatmap: {
    days: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    matrix: buildHeatmapMatrix(),
    bestSlots: [
      { day: "Qua", hour: "10h", engagement: 2.3 },
      { day: "Sex", hour: "21h", engagement: 2.1 },
      { day: "Sáb", hour: "15h", engagement: 1.9 },
    ],
  },

  topHashtags: [
    { tag: "#marketingdigital", uses: 14, avgEngagement: 1.2 },
    { tag: "#empreendedorismo", uses: 11, avgEngagement: 0.9 },
    { tag: "#smallbusiness", uses: 8, avgEngagement: 1.5 },
    { tag: "#portugal", uses: 7, avgEngagement: 0.8 },
    { tag: "#negocios", uses: 6, avgEngagement: 1.1 },
  ],

  topKeywords: [
    { word: "estratégia", count: 22 },
    { word: "clientes", count: 19 },
    { word: "vendas", count: 16 },
    { word: "conteúdo", count: 14 },
    { word: "marca", count: 12 },
  ],

  bestDays: [
    { day: "Seg", fullDay: "Segunda", avgEngagement: 0.41, isLeader: false },
    { day: "Ter", fullDay: "Terça", avgEngagement: 0.67, isLeader: false },
    { day: "Qua", fullDay: "Quarta", avgEngagement: 1.12, isLeader: true },
    { day: "Qui", fullDay: "Quinta", avgEngagement: 0.55, isLeader: false },
    { day: "Sex", fullDay: "Sexta", avgEngagement: 0.98, isLeader: false },
    { day: "Sáb", fullDay: "Sábado", avgEngagement: 0.89, isLeader: false },
    { day: "Dom", fullDay: "Domingo", avgEngagement: 0.38, isLeader: false },
  ],

  // Mini-trend (last 15 days) drawn next to each hero KPI value.
  // The "Estado do benchmark" card omits a sparkline and uses a badge.
  heroSparklines: {
    engagementRate: [
      0.08, 0.09, 0.11, 0.1, 0.12, 0.09, 0.11, 0.1, 0.13, 0.1, 0.11, 0.09,
      0.12, 0.11, 0.11,
    ],
    postsAnalyzed: [0, 1, 1, 2, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
    postingFrequencyWeekly: [
      5.5, 5.8, 6.0, 5.9, 6.0, 6.1, 6.0, 6.0, 5.9, 6.0, 6.0, 6.1, 6.0, 6.0,
      6.0,
    ],
    dominantFormatShare: [
      62, 64, 65, 67, 68, 69, 70, 71, 72, 71, 72, 73, 74, 74, 75,
    ],
  },

  aiInsights: [
    {
      number: "01",
      label: "Insight prioritário",
      text: "A performance em Reels está 66% abaixo do benchmark do escalão Micro. O formato domina 69% do conteúdo mas entrega o menor envolvimento por publicação — há um desalinhamento claro entre esforço investido e retorno obtido.",
    },
    {
      number: "02",
      label: "Oportunidade imediata",
      text: "Os carousels apresentam 1,45% de envolvimento, quase 3 vezes acima do benchmark. Aumentar a frequência de carousels de 22% para 35% do conteúdo pode elevar o envolvimento médio da conta em cerca de 40% nos próximos 30 dias.",
    },
    {
      number: "03",
      label: "Recomendação para os próximos 30 dias",
      text: "Reduzir Reels para 2 por semana, subir carousels para 3 por semana, manter 1 imagem semanal. Concentrar publicações às quartas (10h) e sextas (21h) — os dois picos detetados de resposta da audiência.",
    },
  ],
};

export type ReportData = typeof reportData;
