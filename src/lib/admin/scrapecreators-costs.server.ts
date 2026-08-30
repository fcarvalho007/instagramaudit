/**
 * Leitura admin dos custos ScrapeCreators.
 *
 * Fonte única: `provider_call_logs` (provider = 'scrapecreators').
 * Nunca contacta o provider — o saldo apresentado é o último observado nos
 * logs. A sincronização real de saldo é manual e vive em
 * `syncScrapeCreatorsBalance()`, porque consome 1 crédito.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  aggregateScrapeCreatorsCosts,
  SCRAPECREATORS_LIST_COST_PER_CREDIT_USD,
  type ScrapeCreatorsCostSummary,
  type ScrapeCreatorsLogRow,
} from "./scrapecreators-costs";

const DAY_MS = 86_400_000;

function costPerCreditUsd(): number {
  const raw = process.env.SCRAPECREATORS_COST_PER_CREDIT_USD;
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return SCRAPECREATORS_LIST_COST_PER_CREDIT_USD;
}

/** Créditos promocionais em uso enquanto não for configurado um pack pago. */
function isPromotional(): boolean {
  return !process.env.SCRAPECREATORS_COST_PER_CREDIT_USD;
}

export async function fetchScrapeCreatorsCosts(): Promise<
  ScrapeCreatorsCostSummary & { configured: boolean }
> {
  const [logsRes, freshRes, unlocksRes] = await Promise.all([
    supabaseAdmin
      .from("provider_call_logs")
      .select(
        "endpoint, status, cached, credits_charged, credits_remaining, source_context, duration_ms, analysis_event_id, created_at",
      )
      .eq("provider", "scrapecreators")
      .order("created_at", { ascending: true })
      .limit(5000),
    supabaseAdmin
      .from("analysis_events")
      .select("id", { count: "exact", head: true })
      .eq("outcome", "success")
      .eq("data_source", "fresh")
      .gte("created_at", new Date(Date.now() - 30 * DAY_MS).toISOString()),
    supabaseAdmin
      .from("comment_enrichment_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 30 * DAY_MS).toISOString()),
  ]);

  const rows = (logsRes.data ?? []) as unknown as ScrapeCreatorsLogRow[];

  const summary = aggregateScrapeCreatorsCosts(rows, {
    costPerCreditUsd: costPerCreditUsd(),
    promotional: isPromotional(),
    freshAudits30d: freshRes.count ?? 0,
    commentUnlocks30d: unlocksRes.count ?? 0,
  });

  return { ...summary, configured: Boolean(process.env.SCRAPECREATORS_API_KEY) };
}

export interface BalanceSyncResult {
  ok: boolean;
  credits_remaining: number | null;
  message: string;
}

/**
 * Consulta o saldo oficial no ScrapeCreators. CONSOME 1 CRÉDITO.
 * Só deve ser chamada a partir de uma acção manual confirmada pelo admin.
 */
export async function syncScrapeCreatorsBalance(): Promise<BalanceSyncResult> {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) {
    return { ok: false, credits_remaining: null, message: "SCRAPECREATORS_API_KEY em falta." };
  }
  const base = process.env.SCRAPECREATORS_BASE_URL ?? "https://api.scrapecreators.com";
  const started = Date.now();
  try {
    const res = await fetch(new URL("/v1/account/credit-balance", base).toString(), {
      headers: { "x-api-key": key, accept: "application/json" },
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        credits_remaining: null,
        message: `ScrapeCreators ${res.status}: ${text.slice(0, 160)}`,
      };
    }
    const payload = JSON.parse(text) as Record<string, unknown>;
    const remaining =
      typeof payload.credits_remaining === "number"
        ? payload.credits_remaining
        : typeof payload.credits === "number"
          ? payload.credits
          : null;

    await supabaseAdmin.from("provider_call_logs").insert({
      provider: "scrapecreators",
      actor: "/v1/account/credit-balance",
      endpoint: "/v1/account/credit-balance",
      network: "instagram",
      handle: "-",
      status: "success",
      http_status: res.status,
      duration_ms: Date.now() - started,
      posts_returned: 0,
      credits_charged: 1,
      credits_remaining: remaining,
      cached: false,
      source_context: "admin_balance_sync",
    });

    return {
      ok: true,
      credits_remaining: remaining,
      message: "Saldo actualizado (1 crédito consumido).",
    };
  } catch (err) {
    return {
      ok: false,
      credits_remaining: null,
      message: `Falhou: ${(err as Error).message}`,
    };
  }
}
