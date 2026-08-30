/**
 * Núcleo partilhado do desbloqueio de Comment Intelligence (Nível 2).
 *
 * Usado por:
 *  - `POST /api/public/unlock-comments` (cliente com `lead_session`);
 *  - `POST /api/public/lead-capture` (Ronda 4 — desbloqueio inline logo
 *    após a captura de email, sem exigir password nem segunda chamada).
 *
 * Garantias:
 *  - a análise base (apify/instagram-scraper) NUNCA é repetida aqui;
 *  - idempotente: um job activo para o snapshot devolve `pending`;
 *  - o soft cap mensal degrada em vez de queimar os últimos créditos;
 *  - limites por IP e tecto global horário limitam abuso em massa.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { leadOwnsReport } from "@/lib/credits/lead-reports.server";
import { enqueueCommentScrapingForSnapshot } from "@/lib/enrichment/enqueue-paid.server";
import { isApifyMonthlySoftCapReached } from "@/lib/security/apify-budget.server";

export type UnlockOutcome =
  | { ok: true; status: "queued" | "already_available" | "pending" }
  | { ok: true; status: "degraded"; reason: "MONTHLY_SOFT_CAP" }
  | { ok: false; error: string; httpStatus: number };

const IP_WINDOW_MS = 60 * 60 * 1000;

function readInt(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

const IP_MAX_UNLOCKS = readInt("UNLOCK_COMMENTS_MAX_PER_IP_HOUR", 5, 1, 100);
const GLOBAL_MAX_PER_HOUR = readInt(
  "UNLOCK_COMMENTS_MAX_GLOBAL_HOUR",
  30,
  1,
  1000,
);

const ipHits = new Map<string, number[]>();

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Limitador best-effort por isolate; o tecto na BD é a garantia real. */
function ipRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_MAX_UNLOCKS) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return false;
}

/** Tecto global de novos jobs de comentários por hora, entre instâncias. */
async function globalHourlyCeilingReached(): Promise<boolean> {
  const sinceIso = new Date(Date.now() - IP_WINDOW_MS).toISOString();
  const { count, error } = await (supabaseAdmin as never as {
    from: (t: string) => {
      select: (
        c: string,
        o: { count: "exact"; head: true },
      ) => { gte: (c: string, v: string) => Promise<{ count: number | null; error: unknown }> };
    };
  })
    .from("comment_enrichment_jobs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) return false; // fail-open: os gates estruturais mantêm-se
  return (count ?? 0) >= GLOBAL_MAX_PER_HOUR;
}

export async function runCommentUnlock(input: {
  leadId: string;
  cacheKey: string;
  origin: string;
  ip: string;
}): Promise<UnlockOutcome> {
  const owns = await leadOwnsReport(input.leadId, input.cacheKey);
  if (!owns) return { ok: false, error: "REPORT_NOT_OWNED", httpStatus: 403 };

  const { data: snap } = await supabaseAdmin
    .from("analysis_snapshots")
    .select("id, normalized_payload")
    .eq("cache_key", input.cacheKey)
    .maybeSingle();
  if (!snap?.id) return { ok: false, error: "SNAPSHOT_NOT_FOUND", httpStatus: 404 };

  const payload = (snap.normalized_payload ?? {}) as Record<string, unknown>;
  const ci = payload.comment_intelligence as { available?: boolean } | undefined;
  if (ci?.available === true) return { ok: true, status: "already_available" };

  // Idempotência: um job activo já cobre este snapshot.
  const { data: existingJob } = await supabaseAdmin
    .from("comment_enrichment_jobs")
    .select("id")
    .eq("snapshot_id", snap.id)
    .in("status", ["pending", "processing"])
    .maybeSingle();
  if (existingJob?.id) return { ok: true, status: "pending" };

  if (await isApifyMonthlySoftCapReached()) {
    return { ok: true, status: "degraded", reason: "MONTHLY_SOFT_CAP" };
  }

  if (ipRateLimited(input.ip) || (await globalHourlyCeilingReached())) {
    return { ok: false, error: "RATE_LIMITED", httpStatus: 429 };
  }

  try {
    await enqueueCommentScrapingForSnapshot({
      snapshotId: snap.id,
      origin: input.origin,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Índice único em jobs activos → submissão concorrente duplicada.
    if (message.includes("duplicate key") || message.includes("23505")) {
      return { ok: true, status: "pending" };
    }
    return { ok: false, error: "UNLOCK_FAILED", httpStatus: 500 };
  }

  return { ok: true, status: "queued" };
}
