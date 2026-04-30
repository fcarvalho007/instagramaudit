/**
 * Server function que devolve o histórico recente de envolvimento médio
 * de um perfil. Usado pelo mini-gráfico "últimas análises" no
 * `/analyze/$username` (R3).
 *
 * Lê apenas snapshots prontos (`analysis_status = 'ready'`) e extrai o
 * `engagement_pct` do payload normalizado. Sem custos externos — consulta
 * direta à base via cliente admin (server-only).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  handle: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  limit: z.number().int().min(1).max(20).default(4),
});

export interface ProfileEngagementHistoryItem {
  /** ISO-8601 timestamp da análise (de `analysis_snapshots.created_at`). */
  analyzedAt: string;
  /** Envolvimento médio observado, em pontos percentuais. */
  engagementPct: number;
}

/**
 * Devolve até `limit` snapshots ordenados do mais recente para o mais antigo.
 * Filtra silenciosamente entradas sem `engagement_pct` numérico.
 */
export const getProfileEngagementHistory = createServerFn({ method: "GET" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ProfileEngagementHistoryItem[]> => {
    const handle = data.handle.toLowerCase();
    const { data: rows, error } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("created_at, normalized_payload")
      .eq("instagram_username", handle)
      .eq("analysis_status", "ready")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      console.error("[profile-history] supabase error:", error.message);
      return [];
    }

    const out: ProfileEngagementHistoryItem[] = [];
    for (const row of rows ?? []) {
      const payload = row.normalized_payload as
        | { profile?: { engagement_pct?: unknown } }
        | null;
      const raw = payload?.profile?.engagement_pct;
      const num = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(num)) continue;
      out.push({
        analyzedAt: row.created_at as string,
        engagementPct: Number(num.toFixed(2)),
      });
    }
    return out;
  });
// ─────────────────────────────────────────────────────────────────────
// Followers history (Phase 1B.1C)
// ─────────────────────────────────────────────────────────────────────

const FollowersInputSchema = z.object({
  handle: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  limit: z.number().int().min(1).max(20).default(2),
});

export interface ProfileFollowersHistoryItem {
  /** ISO-8601 timestamp da análise. */
  analyzedAt: string;
  /** Contagem de seguidores observada nessa análise. */
  followers: number;
}

/**
 * Devolve até `limit` snapshots ordenados do mais recente para o mais antigo,
 * extraindo apenas `profile.followers_count`. Sem custos externos — só
 * leitura à BD via cliente admin.
 */
export const getProfileFollowersHistory = createServerFn({ method: "GET" })
  .inputValidator((input) => FollowersInputSchema.parse(input))
  .handler(async ({ data }): Promise<ProfileFollowersHistoryItem[]> => {
    const handle = data.handle.toLowerCase();
    const { data: rows, error } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("created_at, normalized_payload")
      .eq("instagram_username", handle)
      .eq("analysis_status", "ready")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      console.error("[profile-history] followers supabase error:", error.message);
      return [];
    }

    const out: ProfileFollowersHistoryItem[] = [];
    for (const row of rows ?? []) {
      const payload = row.normalized_payload as
        | { profile?: { followers_count?: unknown } }
        | null;
      const raw = payload?.profile?.followers_count;
      const num = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(num) || num <= 0) continue;
      out.push({
        analyzedAt: row.created_at as string,
        followers: Math.round(num),
      });
    }
    return out;
  });
