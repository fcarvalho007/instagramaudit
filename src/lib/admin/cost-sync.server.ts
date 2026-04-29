/**
 * Helpers partilhados pelos sync jobs de custos (Apify, DataForSEO, OpenAI).
 *
 * Cada função sincroniza o respectivo provedor para a tabela `cost_daily`
 * fazendo `upsert` por `(provider, day)`. Devolvem um resumo do que fizeram
 * para o caller (rota TanStack) responder ao cron / botão admin.
 *
 * Princípios:
 *   - Falha de um provedor nunca interrompe os outros (caller usa
 *     `Promise.allSettled`).
 *   - Não escrevem novos `provider_call_logs` — esses são gerados pelo flow
 *     real de análise. Aqui só agregamos custos a nível de dia.
 *   - Nunca expõem secrets nos detalhes. `details` guarda apenas snapshots
 *     numéricos do que cada API devolveu.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export interface SyncSummary {
  provider: "apify" | "openai" | "dataforseo";
  ok: boolean;
  rows_upserted: number;
  message: string;
  error?: string;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/* --------------------------------------------------------------- Apify -- */

interface ApifyDailyUsageItem {
  date?: string;
  day?: string;
  usageUsd?: number;
  totalUsd?: number;
  runCount?: number;
}

interface ApifyMonthlyUsageResponse {
  data?: {
    monthlyUsageUsd?: number;
    dailyUsages?: ApifyDailyUsageItem[];
    dailyServiceUsages?: ApifyDailyUsageItem[];
  };
}

export async function syncApifyCosts(): Promise<SyncSummary> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return {
      provider: "apify",
      ok: false,
      rows_upserted: 0,
      message: "APIFY_TOKEN não configurado",
      error: "missing_token",
    };
  }

  try {
    const url = `https://api.apify.com/v2/users/me/usage/monthly?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return {
        provider: "apify",
        ok: false,
        rows_upserted: 0,
        message: `HTTP ${res.status}`,
        error: `http_${res.status}`,
      };
    }
    const json = (await res.json()) as ApifyMonthlyUsageResponse;
    const daily =
      json.data?.dailyUsages ?? json.data?.dailyServiceUsages ?? [];

    let upserted = 0;
    for (const day of daily) {
      const dayKey = day.date ?? day.day;
      if (!dayKey) continue;
      const amount = Number(day.usageUsd ?? day.totalUsd ?? 0);
      const calls = Number(day.runCount ?? 0);
      const row = {
        provider: "apify",
        day: dayKey.slice(0, 10),
        amount_usd: amount,
        call_count: calls,
        details: day as unknown as Json,
        collected_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin
        .from("cost_daily")
        .upsert(row, { onConflict: "provider,day" });
      if (!error) upserted += 1;
    }

    return {
      provider: "apify",
      ok: true,
      rows_upserted: upserted,
      message: `Sincronizados ${upserted} dias.`,
    };
  } catch (err) {
    return {
      provider: "apify",
      ok: false,
      rows_upserted: 0,
      message: "Falha ao chamar a Apify.",
      error: (err as Error).message,
    };
  }
}

/* ----------------------------------------------------------- DataForSEO -- */

interface DfsUserDataResponse {
  tasks?: Array<{
    result?: Array<{
      money?: { balance?: number; total?: number; spent?: number };
      statistics?: { api?: { entity_calls?: number } };
    }>;
  }>;
}

export async function syncDataForSeoCosts(): Promise<SyncSummary> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    return {
      provider: "dataforseo",
      ok: false,
      rows_upserted: 0,
      message: "Credenciais DataForSEO não configuradas",
      error: "missing_credentials",
    };
  }

  try {
    const auth = Buffer.from(`${login}:${password}`).toString("base64");
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      return {
        provider: "dataforseo",
        ok: false,
        rows_upserted: 0,
        message: `HTTP ${res.status}`,
        error: `http_${res.status}`,
      };
    }
    const json = (await res.json()) as DfsUserDataResponse;
    const userData = json.tasks?.[0]?.result?.[0];
    const totalSpent = Number(userData?.money?.spent ?? 0);
    const balance = Number(userData?.money?.balance ?? 0);
    const calls = Number(userData?.statistics?.api?.entity_calls ?? 0);

    // Snapshot do dia anterior mais recente para calcular o delta.
    const today = todayUtc();
    const { data: previous } = await supabaseAdmin
      .from("cost_daily")
      .select("amount_usd, details")
      .eq("provider", "dataforseo")
      .lt("day", today)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousTotal = Number(
      (previous?.details as { total_spent_at_snapshot?: number } | null)
        ?.total_spent_at_snapshot ?? 0,
    );
    const dailyDelta = Math.max(0, totalSpent - previousTotal);

    const { error } = await supabaseAdmin.from("cost_daily").upsert(
      {
        provider: "dataforseo",
        day: today,
        amount_usd: dailyDelta,
        call_count: calls,
        details: {
          total_spent_at_snapshot: totalSpent,
          balance_at_snapshot: balance,
          statistics: userData?.statistics,
        },
        collected_at: new Date().toISOString(),
      },
      { onConflict: "provider,day" },
    );
    if (error) {
      return {
        provider: "dataforseo",
        ok: false,
        rows_upserted: 0,
        message: "Erro ao gravar cost_daily",
        error: error.message,
      };
    }

    return {
      provider: "dataforseo",
      ok: true,
      rows_upserted: 1,
      message: `Delta hoje: $${dailyDelta.toFixed(4)} · saldo $${balance.toFixed(2)}.`,
    };
  } catch (err) {
    return {
      provider: "dataforseo",
      ok: false,
      rows_upserted: 0,
      message: "Falha ao chamar a DataForSEO.",
      error: (err as Error).message,
    };
  }
}

/* --------------------------------------------------------------- OpenAI -- */

/**
 * Para OpenAI usamos o caminho fiável: agregar `actual_cost_usd` de
 * `provider_call_logs` por dia. Esse valor já é gravado em runtime quando
 * o nosso código chama a API, portanto é tão "real" quanto a fatura sem
 * precisar da Costs API (que requer admin key separada).
 */
export async function syncOpenAiCosts(): Promise<SyncSummary> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("provider_call_logs")
      .select("created_at, actual_cost_usd, estimated_cost_usd")
      .eq("provider", "openai")
      .gte("created_at", since);
    if (error) {
      return {
        provider: "openai",
        ok: false,
        rows_upserted: 0,
        message: "Erro ao ler provider_call_logs",
        error: error.message,
      };
    }

    const buckets = new Map<string, { amount: number; calls: number }>();
    for (const row of data ?? []) {
      const day = (row.created_at as string).slice(0, 10);
      const cost = Number(row.actual_cost_usd ?? row.estimated_cost_usd ?? 0);
      const bucket = buckets.get(day) ?? { amount: 0, calls: 0 };
      bucket.amount += cost;
      bucket.calls += 1;
      buckets.set(day, bucket);
    }

    let upserted = 0;
    for (const [day, bucket] of buckets) {
      const { error: upErr } = await supabaseAdmin.from("cost_daily").upsert(
        {
          provider: "openai",
          day,
          amount_usd: Number(bucket.amount.toFixed(4)),
          call_count: bucket.calls,
          details: { source: "provider_call_logs_aggregate" },
          collected_at: new Date().toISOString(),
        },
        { onConflict: "provider,day" },
      );
      if (!upErr) upserted += 1;
    }

    return {
      provider: "openai",
      ok: true,
      rows_upserted: upserted,
      message: `Agregados ${upserted} dias a partir de provider_call_logs.`,
    };
  } catch (err) {
    return {
      provider: "openai",
      ok: false,
      rows_upserted: 0,
      message: "Falha no sync OpenAI.",
      error: (err as Error).message,
    };
  }
}
