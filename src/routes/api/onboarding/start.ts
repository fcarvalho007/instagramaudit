/**
 * POST /api/onboarding/start
 *
 * Public boundary for the onboarding modal (Fase 1).
 *
 *  1. Validate payload (Zod).
 *  2. Upsert lead by `email_normalized` (service role).
 *  3. Grant initial credits (idempotent — at most one per lead via partial
 *     unique index `uniq_credit_ledger_initial_grant`).
 *  4. Issue signed `lead_session` cookie bound to the lead.
 *  5. Return `{ ok, lead_id, credits }`.
 *
 * Does NOT trigger any analysis or cache lookup. The credit reserve /
 * confirm / release lifecycle starts on a subsequent endpoint (Fase 2).
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getBalance, grantInitialCredits } from "@/lib/credits/credits.server";
import { setLeadCookie } from "@/lib/leads/lead-cookie.server";

const PayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  marketing_consent: z.boolean().optional().default(false),
  beta_consent: z.boolean().optional().default(false),
  user_type: z.string().trim().max(40).optional(),
  purpose: z.string().trim().max(120).optional(),
  profile_ownership: z.string().trim().max(40).optional(),
  pricing_preference: z.string().trim().max(40).optional(),
  // Anti-bot — campos opcionais; honeypot deve permanecer vazio e `_t`
  // (timestamp do form start em ms) deve estar pelo menos 2s no passado.
  website: z.string().max(0).optional(),
  _t: z.number().int().positive().optional(),
});

type Payload = z.infer<typeof PayloadSchema>;

interface OkBody {
  ok: true;
  lead_id: string;
  credits: number;
}

interface FailBody {
  ok: false;
  error_code:
    | "INVALID_PAYLOAD"
    | "PERSISTENCE_FAILED"
    | "INTERNAL_ERROR";
  message: string;
}

const GENERIC_FALLBACK_MESSAGE =
  "Não foi possível preparar o acesso ao relatório. Tenta novamente dentro de instantes.";

function warnIfSecretMisconfigured(): void {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.warn(
      "[onboarding/start] SESSION_SECRET misconfigured (missing or <32 chars) — cookie write will fail.",
    );
  }
}

function json(body: OkBody | FailBody, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

async function upsertLead(
  data: Payload,
): Promise<{ leadId: string; isNew: boolean } | { error: string }> {
  const emailNormalized = data.email.toLowerCase();
  const consentTimestamp = nowIso();

  const existing = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .maybeSingle();

  if (existing.error) {
    return { error: existing.error.message };
  }

  if (existing.data) {
    const update = await supabaseAdmin
      .from("leads")
      .update({
        name: data.name,
        phone: data.phone ?? null,
        phone_normalized: data.phone ? data.phone.replace(/\D/g, "") : null,
        marketing_consent: data.marketing_consent,
        marketing_consent_at: data.marketing_consent ? consentTimestamp : null,
        beta_consent: data.beta_consent,
        beta_consent_at: data.beta_consent ? consentTimestamp : null,
        user_type: data.user_type ?? null,
        purpose: data.purpose ?? null,
        profile_ownership: data.profile_ownership ?? null,
        pricing_preference: data.pricing_preference ?? null,
      })
      .eq("id", existing.data.id);
    if (update.error) return { error: update.error.message };
    return { leadId: existing.data.id, isNew: false };
  }

  const inserted = await supabaseAdmin
    .from("leads")
    .insert({
      name: data.name,
      email: data.email,
      email_normalized: emailNormalized,
      phone: data.phone ?? null,
      phone_normalized: data.phone ? data.phone.replace(/\D/g, "") : null,
      marketing_consent: data.marketing_consent,
      marketing_consent_at: data.marketing_consent ? consentTimestamp : null,
      beta_consent: data.beta_consent,
      beta_consent_at: data.beta_consent ? consentTimestamp : null,
      user_type: data.user_type ?? null,
      purpose: data.purpose ?? null,
      profile_ownership: data.profile_ownership ?? null,
      pricing_preference: data.pricing_preference ?? null,
      source: "onboarding_modal",
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    return { error: inserted.error?.message ?? "insert failed" };
  }
  return { leadId: inserted.data.id, isNew: true };
}

/**
 * Pure handler — exported para permitir testes unitários sem montar o
 * router. Comportamento idêntico ao `POST` registado no `Route` abaixo.
 */
export async function handleOnboardingStart(
  request: Request,
): Promise<Response> {
  warnIfSecretMisconfigured();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(
      {
        ok: false,
        error_code: "INVALID_PAYLOAD",
        message: "Pedido inválido.",
      },
      400,
    );
  }

  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      {
        ok: false,
        error_code: "INVALID_PAYLOAD",
        message: "Dados inválidos. Verificar os campos.",
      },
      400,
    );
  }

  // Honeypot tripped → drena silenciosamente. Devolve forma de
  // sucesso com lead_id sintético e 0 créditos; nada vai à DB.
  const rawWebsite =
    typeof raw === "object" && raw && "website" in raw
      ? (raw as { website?: unknown }).website
      : undefined;
  if (typeof rawWebsite === "string" && rawWebsite.length > 0) {
    console.warn("[onboarding/start] honeypot tripped — draining");
    return json(
      {
        ok: true,
        lead_id: "00000000-0000-0000-0000-000000000000",
        credits: 0,
      },
      200,
    );
  }

  // Timing check: rejeita submits <2s após carregamento.
  if (typeof parsed.data._t === "number") {
    const ageMs = Date.now() - parsed.data._t;
    if (ageMs >= 0 && ageMs < 2_000) {
      return json(
        {
          ok: false,
          error_code: "INVALID_PAYLOAD",
          message: "Dados inválidos. Verificar os campos.",
        },
        400,
      );
    }
  }

  const upserted = await upsertLead(parsed.data);
  if ("error" in upserted) {
    console.error("[onboarding/start] lead upsert failed", upserted.error);
    return json(
      {
        ok: false,
        error_code: "PERSISTENCE_FAILED",
        message: GENERIC_FALLBACK_MESSAGE,
      },
      500,
    );
  }

  try {
    await grantInitialCredits(upserted.leadId);
  } catch (err) {
    console.error("[onboarding/start] grant failed", err);
    return json(
      {
        ok: false,
        error_code: "INTERNAL_ERROR",
        message: GENERIC_FALLBACK_MESSAGE,
      },
      500,
    );
  }

  try {
    setLeadCookie(upserted.leadId);
  } catch (err) {
    console.error("[onboarding/start] cookie write failed", err);
    return json(
      {
        ok: false,
        error_code: "INTERNAL_ERROR",
        message: GENERIC_FALLBACK_MESSAGE,
      },
      500,
    );
  }

  let credits = 0;
  try {
    credits = await getBalance(upserted.leadId);
  } catch (err) {
    console.error("[onboarding/start] balance read failed", err);
  }

  return json({ ok: true, lead_id: upserted.leadId, credits }, 200);
}

export const Route = createFileRoute("/api/onboarding/start")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),

      POST: async ({ request }) => handleOnboardingStart(request),
    },
  },
});