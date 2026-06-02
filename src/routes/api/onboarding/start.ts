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
import { z, type ZodIssue } from "zod";

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
  // GDPR — exige `true` explícito. Ausência ou `false` → 400 INVALID_PAYLOAD.
  gdpr_consent: z.literal(true),
  // Anti-bot — campos opcionais; honeypot deve permanecer vazio e `_t`
  // (timestamp do form start em ms) deve estar pelo menos 2s no passado.
  website: z.string().max(0).optional(),
  _t: z.number().int().positive().optional(),
  // Tracking-only — não persiste em `leads`, serve para correlacionar
  // erros de validação com o handle que o utilizador estava a analisar.
  handle: z.string().trim().max(60).optional(),
});

type Payload = z.infer<typeof PayloadSchema>;

interface OkBody {
  ok: true;
  lead_id: string;
  credits: number;
}

export interface FieldIssue {
  field: string;
  code: string;
}

interface FailBody {
  ok: false;
  error_code:
    | "INVALID_PAYLOAD"
    | "PERSISTENCE_FAILED"
    | "INTERNAL_ERROR";
  message: string;
  /** Lista determinística de campos com problema (sem valores, sem PII). */
  issues?: FieldIssue[];
}

const GENERIC_FALLBACK_MESSAGE =
  "Não foi possível preparar o acesso ao relatório. Tenta novamente dentro de instantes.";

// Mensagens humanas PT-PT por campo. Mantemos pequeno e fechado: o
// cliente pode optar por traduzir via i18n, mas o servidor garante
// sempre uma mensagem útil de fallback.
const FIELD_MESSAGES_PT: Record<string, string> = {
  gdpr_consent: "Falta aceitar o tratamento de dados para continuar.",
  email: "O endereço de email indicado parece inválido.",
  name: "Falta indicar o teu nome.",
  phone: "O número de telefone indicado parece inválido.",
  purpose: "Volta ao passo anterior e escolhe o que queres perceber.",
  profile_ownership:
    "Volta ao passo anterior e indica a tua relação com o perfil.",
  _t: "Foste demasiado rápido a submeter. Confirma os campos e tenta de novo.",
  website: "Pedido recusado por verificação anti-spam.",
};
const FIELD_FALLBACK_PT = "Há um campo que precisa de revisão.";

function mapZodIssues(issues: readonly ZodIssue[]): FieldIssue[] {
  const seen = new Set<string>();
  const out: FieldIssue[] = [];
  for (const i of issues) {
    const field = (i.path[0] as string | undefined) ?? "_root";
    if (seen.has(field)) continue;
    seen.add(field);
    // Normaliza códigos zod para um vocabulário curto e estável.
    let code = "invalid";
    if (i.code === "invalid_type" && i.received === "undefined")
      code = "missing";
    else if (i.code === "invalid_literal") code = "missing";
    else if (i.code === "invalid_string") code = "format";
    else if (i.code === "too_small") code = "too_short";
    else if (i.code === "too_big") code = "too_long";
    out.push({ field, code });
  }
  return out;
}

function messageForIssues(issues: FieldIssue[]): string {
  if (issues.length === 0) return FIELD_FALLBACK_PT;
  const first = issues[0];
  return FIELD_MESSAGES_PT[first.field] ?? FIELD_FALLBACK_PT;
}

function safeHandle(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const h = (raw as { handle?: unknown }).handle;
  return typeof h === "string" && h.length > 0 && h.length <= 60
    ? h.toLowerCase()
    : null;
}

function presentFieldNames(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null) return [];
  return Object.keys(raw as Record<string, unknown>);
}

async function logServerOnboardingError(args: {
  errorCode: "INVALID_PAYLOAD" | "INVALID_TIMING";
  issues: FieldIssue[];
  handle: string | null;
  fieldsPresent: string[];
}): Promise<void> {
  console.warn("[onboarding/start] rejected", {
    error_code: args.errorCode,
    issues: args.issues,
    fields_present: args.fieldsPresent,
    handle: args.handle,
  });
  try {
    await supabaseAdmin.from("product_events").insert([
      {
        event_type: "onboarding_error",
        handle: args.handle,
        metadata: {
          step: 3,
          source: "server",
          error_code: args.errorCode,
          issues: args.issues,
          fields_present: args.fieldsPresent,
        },
      },
    ]);
  } catch (err) {
    console.warn("[onboarding/start] product_events insert failed", err);
  }
}

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
        gdpr_consent_at: consentTimestamp,
        gdpr_consent_version: "v1",
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
      gdpr_consent_at: consentTimestamp,
      gdpr_consent_version: "v1",
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
        message: "Pedido inválido (formato JSON).",
        issues: [{ field: "_root", code: "invalid_json" }],
      },
      400,
    );
  }

  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = mapZodIssues(parsed.error.issues);
    const handle = safeHandle(raw);
    await logServerOnboardingError({
      errorCode: "INVALID_PAYLOAD",
      issues,
      handle,
      fieldsPresent: presentFieldNames(raw),
    });
    return json(
      {
        ok: false,
        error_code: "INVALID_PAYLOAD",
        message: messageForIssues(issues),
        issues,
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
      const issues: FieldIssue[] = [{ field: "_t", code: "too_fast" }];
      await logServerOnboardingError({
        errorCode: "INVALID_TIMING",
        issues,
        handle: safeHandle(raw),
        fieldsPresent: presentFieldNames(raw),
      });
      return json(
        {
          ok: false,
          error_code: "INVALID_PAYLOAD",
          message: messageForIssues(issues),
          issues,
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