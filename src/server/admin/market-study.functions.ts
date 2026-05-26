/**
 * Server functions for /admin/estudo-mercado.
 *
 * Agrega respostas de feedback dispersas em duas tabelas:
 *  - `inline_report_feedback` → ratings 1–5 por bloco (overview/diagnostic/…)
 *  - `beta_feedback`          → modal de validação (usefulness, intenção, pricing)
 *
 * Tudo via `supabaseAdmin` (RLS bypass) — o gate é feito no shell
 * `/admin` (`AdminAuthShell`), igual às restantes server fns admin.
 *
 * Retorna sempre DTOs planos serializáveis. Sem cálculos pesados: agregações
 * feitas em memória sobre slices pequenos (limit 1000), suficiente para o
 * volume previsto.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WindowSchema = z.object({
  windowDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function distribution(nums: number[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const out: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const n of nums) {
    if (n >= 1 && n <= 5) out[n as 1 | 2 | 3 | 4 | 5]++;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Pulse                                                                     */
/* -------------------------------------------------------------------------- */

export const getMarketStudyPulse = createServerFn({ method: "GET" })
  .inputValidator((input: { windowDays?: 7 | 30 | 90 }) =>
    WindowSchema.parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const since = sinceIso(data.windowDays);
    const prevSince = sinceIso(data.windowDays * 2);

    const [inlineRes, prevInlineRes, modalRes, reportsRes] = await Promise.all([
      supabaseAdmin
        .from("inline_report_feedback")
        .select("rating, comment, block, created_at")
        .gte("created_at", since)
        .limit(1000),
      supabaseAdmin
        .from("inline_report_feedback")
        .select("rating")
        .gte("created_at", prevSince)
        .lt("created_at", since)
        .limit(1000),
      supabaseAdmin
        .from("beta_feedback")
        .select("usefulness_score, purchase_intent, clarity_text, missing_text, created_at")
        .gte("created_at", since)
        .limit(1000),
      supabaseAdmin
        .from("report_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

    const inline = inlineRes.data ?? [];
    const inlinePrev = prevInlineRes.data ?? [];
    const modal = modalRes.data ?? [];
    const reportsTotal = reportsRes.count ?? 0;

    const inlineAvg = avg(inline.map((r) => r.rating));
    const inlineAvgPrev = avg(inlinePrev.map((r) => r.rating));
    const inlineDelta =
      inlineAvg !== null && inlineAvgPrev !== null ? inlineAvg - inlineAvgPrev : null;

    const modalCount = modal.length;
    const responseRate = reportsTotal > 0 ? modalCount / reportsTotal : null;

    // Intenção de compra agregada (modal).
    const intentCounts: Record<string, number> = {};
    for (const m of modal) {
      if (m.purchase_intent) {
        intentCounts[m.purchase_intent] = (intentCounts[m.purchase_intent] ?? 0) + 1;
      }
    }

    // Top frases recorrentes (clarity_text + missing_text) — heurística simples
    // baseada em primeiras palavras significativas. Não substitui análise
    // textual mas dá um vislumbre rápido.
    const freeText: string[] = [];
    for (const m of modal) {
      if (typeof m.clarity_text === "string" && m.clarity_text.trim()) {
        freeText.push(m.clarity_text.trim());
      }
      if (typeof m.missing_text === "string" && m.missing_text.trim()) {
        freeText.push(m.missing_text.trim());
      }
    }
    for (const c of inline) {
      if (typeof c.comment === "string" && c.comment.trim()) {
        freeText.push(c.comment.trim());
      }
    }

    return {
      windowDays: data.windowDays,
      inline: {
        n: inline.length,
        avg: inlineAvg,
        delta: inlineDelta,
      },
      modal: {
        n: modalCount,
        responseRate,
        reportsTotal,
        intentCounts,
      },
      recentFreeText: freeText.slice(0, 5),
    };
  });

/* -------------------------------------------------------------------------- */
/*  Por bloco (emojis)                                                        */
/* -------------------------------------------------------------------------- */

const BLOCKS = ["overview", "diagnostic", "performance", "content"] as const;
type BlockKey = (typeof BLOCKS)[number];

export const getMarketStudyBlocks = createServerFn({ method: "GET" })
  .inputValidator((input: { windowDays?: 7 | 30 | 90 }) =>
    WindowSchema.parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const since = sinceIso(data.windowDays);

    const [rowsRes, commentsRes] = await Promise.all([
      supabaseAdmin
        .from("inline_report_feedback")
        .select("block, rating, created_at")
        .gte("created_at", since)
        .limit(2000),
      supabaseAdmin
        .from("inline_report_feedback")
        .select("block, rating, comment, handle, snapshot_id, created_at")
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const rows = rowsRes.data ?? [];
    const comments = (commentsRes.data ?? []).filter(
      (c) => typeof c.comment === "string" && c.comment.trim().length > 0,
    );

    const byBlock = BLOCKS.map((block) => {
      const subset = rows.filter((r) => r.block === block);
      const ratings = subset.map((r) => r.rating);
      const a = avg(ratings);
      const dist = distribution(ratings);
      const positive = ratings.filter((r) => r >= 4).length;
      const positiveRate = ratings.length > 0 ? positive / ratings.length : null;
      return {
        block,
        n: ratings.length,
        avg: a,
        positiveRate,
        distribution: dist,
      };
    });

    return {
      windowDays: data.windowDays,
      byBlock,
      comments: comments.map((c) => ({
        block: c.block as BlockKey,
        rating: c.rating,
        comment: c.comment ?? "",
        handle: c.handle,
        snapshotId: c.snapshot_id,
        createdAt: c.created_at,
      })),
    };
  });

/* -------------------------------------------------------------------------- */
/*  Modal (beta_feedback)                                                     */
/* -------------------------------------------------------------------------- */

export const getMarketStudyModal = createServerFn({ method: "GET" })
  .inputValidator((input: { windowDays?: 7 | 30 | 90 }) =>
    WindowSchema.parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const since = sinceIso(data.windowDays);

    const { data: rows = [] } = await supabaseAdmin
      .from("beta_feedback")
      .select(
        "id, lead_id, report_request_id, usefulness_score, clarity_text, missing_text, purchase_intent, pricing_preference, contact_consent, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const safeRows = rows ?? [];
    const scores = safeRows.map((r) => r.usefulness_score);
    const usefulnessDist = distribution(scores);
    const usefulnessAvg = avg(scores);

    const tally = <K extends string>(field: keyof (typeof safeRows)[number]) => {
      const acc: Record<string, number> = {};
      for (const r of safeRows) {
        const v = r[field];
        if (typeof v === "string" && v.trim()) {
          acc[v] = (acc[v] ?? 0) + 1;
        }
      }
      return acc as Record<K, number>;
    };

    const intentCounts = tally<string>("purchase_intent");
    const pricingCounts = tally<string>("pricing_preference");

    const consentTotal = safeRows.filter((r) => r.contact_consent === true).length;
    const consentRate = safeRows.length > 0 ? consentTotal / safeRows.length : null;

    const freeText = safeRows
      .map((r) => ({
        id: r.id,
        leadId: r.lead_id,
        reportRequestId: r.report_request_id,
        clarity: r.clarity_text,
        missing: r.missing_text,
        score: r.usefulness_score,
        intent: r.purchase_intent,
        createdAt: r.created_at,
      }))
      .filter(
        (r) =>
          (typeof r.clarity === "string" && r.clarity.trim().length > 0) ||
          (typeof r.missing === "string" && r.missing.trim().length > 0),
      )
      .slice(0, 50);

    return {
      windowDays: data.windowDays,
      n: safeRows.length,
      usefulness: { avg: usefulnessAvg, distribution: usefulnessDist },
      intentCounts,
      pricingCounts,
      consent: { total: consentTotal, rate: consentRate },
      freeText,
    };
  });

/* -------------------------------------------------------------------------- */
/*  Pricing interest (modal de intenção em /precos)                           */
/* -------------------------------------------------------------------------- */

type PricingOptionKey = "single_report" | "pack_5_reports";
type WouldPayKey = "sim" | "talvez" | "nao";
type FairnessKey = "barato" | "justo" | "caro";

export const getPricingInterest = createServerFn({ method: "GET" })
  .inputValidator((input: { windowDays?: 7 | 30 | 90 }) =>
    WindowSchema.parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const since = sinceIso(data.windowDays);

    const { data: rows = [] } = await supabaseAdmin
      .from("pricing_interest")
      .select(
        "id, pricing_option, would_pay, price_fairness, email, comment, referrer, user_agent, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const safe = rows ?? [];
    const n = safe.length;

    const wouldPayCounts: Record<WouldPayKey, number> = { sim: 0, talvez: 0, nao: 0 };
    for (const r of safe) {
      const k = r.would_pay as WouldPayKey | null;
      if (k && k in wouldPayCounts) wouldPayCounts[k]++;
    }

    const fairnessByOption: Record<
      PricingOptionKey,
      Record<FairnessKey, number>
    > = {
      single_report: { barato: 0, justo: 0, caro: 0 },
      pack_5_reports: { barato: 0, justo: 0, caro: 0 },
    };
    const optionCounts: Record<PricingOptionKey, number> = {
      single_report: 0,
      pack_5_reports: 0,
    };
    for (const r of safe) {
      const opt = r.pricing_option as PricingOptionKey | null;
      if (opt && opt in optionCounts) {
        optionCounts[opt]++;
        const f = r.price_fairness as FairnessKey | null;
        if (f && f in fairnessByOption[opt]) fairnessByOption[opt][f]++;
      }
    }

    const positive = wouldPayCounts.sim + wouldPayCounts.talvez;
    const positiveRate = n > 0 ? positive / n : null;
    const convictionRate = n > 0 ? wouldPayCounts.sim / n : null;

    const emailsCount = safe.filter(
      (r) => typeof r.email === "string" && r.email.trim().length > 0,
    ).length;

    const comments = safe
      .filter((r) => typeof r.comment === "string" && r.comment.trim().length > 0)
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        option: r.pricing_option as PricingOptionKey,
        wouldPay: r.would_pay as WouldPayKey,
        fairness: (r.price_fairness as FairnessKey | null) ?? null,
        email: (r.email as string | null) ?? null,
        comment: r.comment as string,
        createdAt: r.created_at,
      }));

    return {
      windowDays: data.windowDays,
      n,
      wouldPayCounts,
      optionCounts,
      fairnessByOption,
      positiveRate,
      convictionRate,
      emailsCount,
      comments,
    };
  });