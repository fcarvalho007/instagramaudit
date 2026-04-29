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
  totalUsageCreditsUsd?: number;
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

    // Fonte fiável de contagem de chamadas: provider_call_logs (a Apify
    // monthly usage API não devolve runCount fiável por dia).
    const since = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const { data: apifyLogs } = await supabaseAdmin
      .from("provider_call_logs")
      .select("created_at, status")
      .eq("provider", "apify")
      .gte("created_at", since);
    const callsPerDay = new Map<string, number>();
    for (const row of apifyLogs ?? []) {
      if (row.status !== "success") continue;
      const day = String(row.created_at).slice(0, 10);
      callsPerDay.set(day, (callsPerDay.get(day) ?? 0) + 1);
    }

    let upserted = 0;
    for (const day of daily) {
      const dayKey = day.date ?? day.day;
      if (!dayKey) continue;
      const amount = Number(
        day.totalUsageCreditsUsd ?? day.usageUsd ?? day.totalUsd ?? 0,
      );
      const dayKeyShort = dayKey.slice(0, 10);
      const calls = Number(day.runCount ?? callsPerDay.get(dayKeyShort) ?? 0);
      const row = {
        provider: "apify",
        day: dayKeyShort,
        amount_usd: Number(amount.toFixed(6)),
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
    // Fonte de verdade do custo diário: provider_call_logs (gravado em
    // runtime quando o nosso código chama a DataForSEO). A API
    // `appendix/user_data` é usada apenas para anotar o saldo actual.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("provider_call_logs")
      .select("created_at, actual_cost_usd, estimated_cost_usd, status")
      .eq("provider", "dataforseo")
      .gte("created_at", since);
    if (logsError) {
      return {
        provider: "dataforseo",
        ok: false,
        rows_upserted: 0,
        message: "Erro ao ler provider_call_logs",
        error: logsError.message,
      };
    }

    const buckets = new Map<string, { amount: number; calls: number }>();
    for (const row of logs ?? []) {
      if (row.status !== "success") continue;
      const day = String(row.created_at).slice(0, 10);
      const cost = Number(row.actual_cost_usd ?? row.estimated_cost_usd ?? 0);
      const bucket = buckets.get(day) ?? { amount: 0, calls: 0 };
      bucket.amount += cost;
      bucket.calls += 1;
      buckets.set(day, bucket);
    }

    // Tentativa best-effort de obter saldo actual. Falha não interrompe.
    let balance: number | null = null;
    try {
      const auth = Buffer.from(`${login}:${password}`).toString("base64");
      const res = await fetch(
        "https://api.dataforseo.com/v3/appendix/user_data",
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (res.ok) {
        const json = (await res.json()) as DfsUserDataResponse;
        const userData = json.tasks?.[0]?.result?.[0];
        const b = Number(userData?.money?.balance ?? 0);
        if (Number.isFinite(b)) balance = b;
      }
    } catch {
      /* sem rede / API indisponível — ignoramos */
    }

    const today = todayUtc();
    if (!buckets.has(today) && balance !== null) {
      // Garante que o cartão de hoje aparece com o saldo, mesmo sem chamadas.
      buckets.set(today, { amount: 0, calls: 0 });
    }

    let upserted = 0;
    for (const [day, bucket] of buckets) {
      const details: Record<string, unknown> = {
        source: "provider_call_logs_aggregate",
      };
      if (day === today && balance !== null) {
        details.balance_at_snapshot = balance;
      }
      const { error: upErr } = await supabaseAdmin.from("cost_daily").upsert(
        {
          provider: "dataforseo",
          day,
          amount_usd: Number(bucket.amount.toFixed(6)),
          call_count: bucket.calls,
          details: details as unknown as Json,
          collected_at: new Date().toISOString(),
        },
        { onConflict: "provider,day" },
      );
      if (!upErr) upserted += 1;
    }

    const balanceMsg =
      balance !== null ? ` · saldo $${balance.toFixed(2)}` : "";
    return {
      provider: "dataforseo",
      ok: true,
      rows_upserted: upserted,
      message: `Agregados ${upserted} dias a partir de provider_call_logs${balanceMsg}.`,
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
