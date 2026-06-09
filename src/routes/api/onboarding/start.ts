/**
 * POST /api/onboarding/start
 *
 * Public boundary for the onboarding modal (Fase 5 — verification-gated
 * free credits).
 *
 *  1. Validate payload (Zod). Phone is optional; `qualification` is required.
 *  2. Classify the email domain. Disposable / throwaway → reject 400.
 *  3. Upsert lead by `email_normalized` (service role) with the new
 *     `qualification` + `email_domain_class` columns.
 *  4. Issue signed `lead_session` cookie bound to the lead so the report
 *     opens immediately, but DO NOT grant the 2 free credits yet.
 *  5. Trigger Supabase Auth OTP (`signInWithOtp`, shouldCreateUser=true)
 *     so the user can verify the email and then activate the credits via
 *     `/api/onboarding/claim-existing`.
 *  6. Return `{ ok, lead_id, credits: 0, verification_required: true }`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z, type ZodIssue } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { classifyEmailDomain } from "@/lib/leads/email-domain-class";
import { LEAD_QUALIFICATIONS } from "@/lib/leads/qualification";

const PayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional(),
  marketing_consent: z.boolean().optional().default(false),
  beta_consent: z.boolean().optional().default(false),
  user_type: z.string().trim().max(40).optional(),
  purpose: z.string().trim().max(120).optional(),
  profile_ownership: z.string().trim().max(40).optional(),
  qualification: z.enum(LEAD_QUALIFICATIONS, {
    required_error: "missing",
    invalid_type_error: "invalid",
  }),
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
}).strict();

type Payload = z.infer<typeof PayloadSchema>;

interface OkBody {
  ok: true;
  /**
   * O `lead_id` NÃO é devolvido neste passo: a sessão (cookie `lead_session`)
   * só é emitida em `/api/onboarding/claim-existing` depois do OTP validar
   * o email. Devolver o id antes da prova de propriedade permitiria a um
   * atacante criar conta com o email de outra pessoa.
   */
  credits: 0;
  /** Always `true` for new leads since Fase 5 — credits unlock on OTP. */
  verification_required: boolean;
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
    | "EMAIL_REQUIRES_VERIFICATION"
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
  qualification: "Escolhe o contexto que melhor te descreve.",
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
          issues: args.issues.map((i) => ({ field: i.field, code: i.code })),
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
  emailDomainClass: string,
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
        marketing_consent: data.marketing_consent,
        marketing_consent_at: data.marketing_consent ? consentTimestamp : null,
        beta_consent: data.beta_consent,
        beta_consent_at: data.beta_consent ? consentTimestamp : null,
        user_type: data.user_type ?? null,
        purpose: data.purpose ?? null,
        profile_ownership: data.profile_ownership ?? null,
        qualification: data.qualification,
        email_domain_class: emailDomainClass,
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
      marketing_consent: data.marketing_consent,
      marketing_consent_at: data.marketing_consent ? consentTimestamp : null,
      beta_consent: data.beta_consent,
      beta_consent_at: data.beta_consent ? consentTimestamp : null,
      user_type: data.user_type ?? null,
      purpose: data.purpose ?? null,
      profile_ownership: data.profile_ownership ?? null,
      qualification: data.qualification,
      email_domain_class: emailDomainClass,
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
 * Fire-and-forget Supabase OTP email. Failures are logged but do not block
 * the response — the user can retry from the OTP panel ("Reenviar código").
 */
async function sendOtpEmail(email: string, leadId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { lead_id: leadId } },
    });
    if (error) {
      console.warn(
        "[onboarding/start] OTP send failed",
        JSON.stringify({ status: error.status, message: error.message }),
      );
    }
  } catch (err) {
    console.warn("[onboarding/start] OTP send threw", err);
  }
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

  // Email-domain classification. Disposable / throwaway domains are hard
  // rejected so abusers cannot farm free credits via temp-mail addresses.
  const emailDomainClass = classifyEmailDomain(parsed.data.email);
  if (emailDomainClass === "disposable_or_suspicious") {
    const issues: FieldIssue[] = [{ field: "email", code: "disposable" }];
    await logServerOnboardingError({
      errorCode: "INVALID_PAYLOAD",
      issues,
      handle: safeHandle(raw),
      fieldsPresent: presentFieldNames(raw),
    });
    return json(
      {
        ok: false,
        error_code: "INVALID_PAYLOAD",
        message:
          "Usa um email permanente — não aceitamos endereços temporários.",
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
        credits: 0,
        verification_required: true,
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

  // Defense-in-depth ownership guard. /api/onboarding/check-email tells the
  // client to take the OTP path when the email already belongs to a lead;
  // we re-check here so a misbehaving / malicious client cannot bypass it.
  const emailNormalizedForGuard = parsed.data.email.toLowerCase();
  const existingLead = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("email_normalized", emailNormalizedForGuard)
    .maybeSingle();
  if (existingLead.data) {
    return json(
      {
        ok: false,
        error_code: "EMAIL_REQUIRES_VERIFICATION",
        message:
          "Este email já tem conta. Confirma a tua identidade para abrir o relatório.",
      },
      403,
    );
  }

  const upserted = await upsertLead(parsed.data, emailDomainClass);
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

  // Initial credit grant E sessão (`lead_session` cookie) só são emitidos
  // em `/api/onboarding/claim-existing` depois do OTP validar o email.
  // Aqui ficamos só com o registo do lead em DB.

  // Send the verification OTP. Best-effort: the modal also lets the user
  // resend from the OTP panel if delivery fails.
  await sendOtpEmail(parsed.data.email, upserted.leadId);

  return json(
    {
      ok: true,
      credits: 0,
      verification_required: true,
    },
    200,
  );
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