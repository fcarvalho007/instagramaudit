/**
 * Deterministic mock analysis data generator.
 * Same username → same output (consistent UX across refreshes).
 * Future: replace with real Apify+Supabase fetch in route loader.
 *
 * Benchmark positioning is computed by the real benchmark engine
 * (src/lib/benchmark/) — only the upstream profile metrics remain mocked.
 */

import { computeBenchmarkPositioning } from "./benchmark/engine";
import type { BenchmarkPositioning } from "./benchmark/types";

export interface AnalysisProfile {
  handle: string;
  displayName: string;
  category: string;
  followers: number;
  avatarHue: number; // 0-360 for gradient placeholder
}

export interface AnalysisMetrics {
  engagement: number; // %
  postsAnalyzed: number;
  weeklyFrequency: number;
  dominantFormat: "Reels" | "Carrosséis" | "Imagens";
  dominantFormatShare: number; // %
}

export interface AnalysisBenchmark {
  value: number; // %
  reference: number; // %
  max: number;
  position: "above" | "on" | "below";
  helperText: string;
  formatLabel: string;
}

export interface AnalysisCompetitor {
  handle: string;
  engagement: number;
  isSelf: boolean;
}

export interface AnalysisPremiumTeasers {
  estimatedReach: string;
  aiInsightsCount: number;
  opportunitiesCount: number;
  recommendations30d: number;
}

export interface AnalysisData {
  profile: AnalysisProfile;
  metrics: AnalysisMetrics;
  benchmark: AnalysisBenchmark;
  benchmarkPositioning: BenchmarkPositioning;
  competitors: AnalysisCompetitor[];
  premiumTeasers: AnalysisPremiumTeasers;
}

// Stable hash → seeded numbers
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const CATEGORIES = [
  "Marca de moda",
  "Restauração",
  "Estúdio criativo",
  "Comércio local",
  "Beleza e bem-estar",
  "Hotelaria",
  "Tecnologia",
  "Fotografia",
];

const FORMATS: AnalysisMetrics["dominantFormat"][] = [
  "Reels",
  "Carrosséis",
  "Imagens",
];

export function getMockAnalysis(rawUsername: string): AnalysisData {
  const handle = rawUsername.replace(/^@/, "").toLowerCase().trim() || "perfil";
  const seed = hashString(handle);

  const followers = 2400 + (seed % 180000);
  const engagement = parseFloat((0.32 + ((seed % 130) / 100)).toFixed(2)); // 0.32 - 1.62
  const dominantFormat = pick(FORMATS, seed);
  const dominantFormatShare = 48 + (seed % 35);

  // Real benchmark engine — single source of truth for positioning
  const benchmarkPositioning = computeBenchmarkPositioning({
    followers,
    engagement,
    dominantFormat,
  });

  // Legacy benchmark shape — derived from engine result for back-compat
  // with consumers that haven't migrated yet (e.g., metric card hint).
  const reference =
    benchmarkPositioning.status === "available"
      ? benchmarkPositioning.benchmarkValue
      : engagement;

  const position: AnalysisBenchmark["position"] =
    benchmarkPositioning.status === "available"
      ? benchmarkPositioning.positionStatus === "above"
        ? "above"
        : benchmarkPositioning.positionStatus === "below"
          ? "below"
          : "on"
      : "on";

  const positionHelper: Record<AnalysisBenchmark["position"], string> = {
    above: "Posicionamento acima do benchmark do segmento. Margem para escalar frequência sem perder envolvimento.",
    on: "Posicionamento alinhado com o benchmark do segmento. Há espaço para diferenciar o formato dominante.",
    below: "Posicionamento abaixo do benchmark do segmento. Recomenda-se rever pacing e formato dominante.",
  };

  const compA = `concorrente_${pick(["a", "alpha", "primeiro", "lider"], seed >> 2)}`;
  const compB = `concorrente_${pick(["b", "beta", "rival", "secundario"], seed >> 4)}`;

  return {
    profile: {
      handle,
      displayName:
        handle.charAt(0).toUpperCase() + handle.slice(1).replace(/[._-]/g, " "),
      category: pick(CATEGORIES, seed),
      followers,
      avatarHue: seed % 360,
    },
    metrics: {
      engagement,
      postsAnalyzed: 24 + (seed % 18),
      weeklyFrequency: parseFloat((1.8 + ((seed % 40) / 10)).toFixed(1)),
      dominantFormat,
      dominantFormatShare,
    },
    benchmark: {
      value: engagement,
      reference,
      max: 1.8,
      position,
      helperText: positionHelper[position],
      formatLabel: `Benchmark · ${dominantFormat}`,
    },
    benchmarkPositioning,
    competitors: [
      { handle, engagement, isSelf: true },
      {
        handle: compA,
        engagement: parseFloat(
          Math.max(0.18, engagement - 0.12 - ((seed % 20) / 100)).toFixed(2),
        ),
        isSelf: false,
      },
      {
        handle: compB,
        engagement: parseFloat(
          Math.max(0.12, engagement - 0.28 - ((seed % 15) / 100)).toFixed(2),
        ),
        isSelf: false,
      },
    ],
    premiumTeasers: {
      estimatedReach: `${(12 + (seed % 28)).toFixed(0)}K – ${(38 + (seed % 60)).toFixed(0)}K`,
      aiInsightsCount: 3,
      opportunitiesCount: 5,
      recommendations30d: 7,
    },
  };
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}

export function formatPercent(n: number, digits = 2): string {
  return `${n.toFixed(digits).replace(".", ",")}%`;
}
