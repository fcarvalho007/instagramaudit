/**
 * Editorial V2 — adaptador puro das Prioridades de ação (07).
 *
 * Reutiliza EXACTAMENTE a montagem de produção (`buildPriorityItems`):
 * mesmas regras determinísticas, mesma prosa de IA já persistida, mesma
 * sanitização numérica, mesmo dedupe, mesma ordem e mesmo corte.
 *
 * Não gera nada, não faz I/O, não infere categorias, níveis, evidência
 * nem `basedOn`, e não introduz uma taxonomia de acção nova.
 */

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type { VisualCoverAnalysis } from "@/lib/report/visual-cover-types";
import {
  classifyAudienceResponse,
  classifyCaptionPattern,
  classifyChannelIntegration,
  classifyContentType,
  classifyFunnelStage,
  type PriorityItem,
} from "@/lib/report/block02-diagnostic";
import { buildPriorityItems } from "@/lib/report/build-priority-items";

export interface EditorialPrioritiesData {
  items: PriorityItem[];
  /** True quando produção não devolve qualquer prioridade. */
  empty: boolean;
}

/** Mesmo parse defensivo do bloco de produção. */
function parseVisualCoverAnalysis(
  payload?: SnapshotPayload,
): VisualCoverAnalysis | null {
  const raw = payload?.visual_cover_analysis;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.overallScore !== "number" || typeof r.status !== "string") {
    return null;
  }
  return raw as VisualCoverAnalysis;
}

export function buildEditorialPrioritiesData(
  result: AdapterResult,
  payload: SnapshotPayload | undefined,
  /** `features.commentIntelligence === "full"` em produção. */
  commentIntelligenceFull: boolean,
): EditorialPrioritiesData {
  const posts = payload?.posts ?? [];
  const bio = result.enriched.profile.bio ?? null;
  const externalUrls = result.enriched.profile.externalUrls ?? [];

  const contentType = classifyContentType(posts);
  const funnel = classifyFunnelStage(posts);
  const caption = classifyCaptionPattern(posts);
  const audience = classifyAudienceResponse(posts);
  const integration = classifyChannelIntegration(bio, externalUrls, posts);
  const dominantFormat = contentType.available ? contentType.distribution[0] : null;
  const coverAnalysis = parseVisualCoverAnalysis(payload);

  const { items } = buildPriorityItems({
    aiPriorities: result.enriched.aiInsightsV2?.priorities,
    deterministicArgs: {
      contentType,
      funnel,
      caption,
      audience,
      integration,
      dominantFormatShare: dominantFormat?.sharePct ?? 0,
      dominantFormatLabel: dominantFormat?.label ?? null,
      commentIntel: commentIntelligenceFull
        ? (result.enriched.commentIntelligence ?? null)
        : null,
      coverAnalysis,
      cadence: result.enriched.cadence
        ? {
            weekly: result.enriched.cadence.weekly,
            sufficient: result.enriched.cadence.sufficient,
          }
        : null,
    },
    sanitizationPool: {
      keyMetrics: result.data.keyMetrics,
      cadence: result.enriched.cadence ?? null,
      commentIntelligence: result.enriched.commentIntelligence ?? null,
      coverAnalysis,
      contentType,
      caption,
      audience,
      integration,
      dominantFormatShare: dominantFormat?.sharePct ?? 0,
    },
  });

  return { items, empty: items.length === 0 };
}
