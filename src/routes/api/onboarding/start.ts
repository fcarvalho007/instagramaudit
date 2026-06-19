/**
 * POST /api/onboarding/start
 *
 * Public boundary for the onboarding modal under `AUTH_MODE=password`.
 *
 *  1. Validate payload (Zod). `qualification` and `password` are required
 *     in `password` mode.
 *  2. Classify the email domain. Disposable / throwaway → reject 400.
 *  3. Create the Supabase auth user via
 *     `supabaseAdmin.auth.admin.createUser({ email, password,
 *     email_confirm: true })`. If the user already exists in
 *     `auth.users`, reject with 409 `EMAIL_ALREADY_EXISTS` so the client
 *     falls into the login flow — we never silently log a user in.
 *  4. Upsert the lead row by `email_normalized` and link it to the new
 *     auth user (`user_id`).
 *  5. Issue the signed `lead_session` cookie + grant initial credits —
 *     ONLY after the auth user is created (cookie ≠ proof-less session).
 *  6. Send a friendly transactional email with the report link. Never
 *     contains the password.
 *  7. Return `{ ok, lead_id, credits, requires_email_verification: false }`.
 *
 *  In `AUTH_MODE=password_with_email_verification` we create with
 *  `email_confirm: false`, skip cookie + credits, and require the user
 *  to click the Supabase confirmation email before they can use the
 *  product. The `magic_link` legacy mode is kept reachable via env
 *  but is no longer exposed in the public UX.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z, type ZodIssue } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { classifyEmailDomain } from "@/lib/leads/email-domain-class";
import { LEAD_QUALIFICATIONS } from "@/lib/leads/qualification";
import { getAuthMode } from "@/lib/config/auth-mode.server";
import { getBalance, grantInitialCredits } from "@/lib/credits/credits.server";
import { setLeadCookie } from "@/lib/leads/lead-cookie.server";
import { sendReportAccessEmail } from "@/lib/email/send-report-access.server";
import { enqueueReportForSnapshot } from "@/lib/orchestration/enqueue-report-for-snapshot.server";

const PayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional(),
  /**
   * User-defined password. Required in `AUTH_MODE=password` and
   * `AUTH_MODE=password_with_email_verification`. Min 8 chars. Server
   * lets Supabase Auth enforce HIBP (configured globally).
   */
  password: z
    .string()
    .min(8, "password_too_short")
    .max(72, "password_too_long")
    .optional(),
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
  /** Sempre presente quando a conta foi criada com sucesso. Pode estar
   *  ausente em `password_with_email_verification` enquanto o utilizador
   *  ainda não confirmou o email. */
  lead_id?: string;
  credits: number;
  /** `true` quando o cliente ainda tem de confirmar o email antes de
   *  poder usar o produto (apenas `password_with_email_verification`). */
  requires_email_verification: boolean;
  /** Eco do modo activo. */
  auth_mode: "password" | "password_with_email_verification" | "magic_link";
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
    | "EMAIL_ALREADY_EXISTS"
    | "PASSWORD_REQUIRED"
    | "AUTH_USER_CREATE_FAILED"
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
  password:
    "Define uma palavra-passe com pelo menos 8 caracteres para continuar.",
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
        instagram_handle: data.handle ?? null,
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
      instagram_handle: data.handle ?? null,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    return { error: inserted.error?.message ?? "insert failed" };
  }
  return { leadId: inserted.data.id, isNew: true };
}

/**
 * Emite cookie `lead_session` + grant inicial de créditos. Chamado APENAS
 * depois de o Supabase auth user existir — nunca antes.
 */
async function grantSessionAndCredits(leadId: string): Promise<number> {
  try {
    await grantInitialCredits(leadId);
  } catch (err) {
    console.warn("[onboarding/start] grantInitialCredits warn:", err);
  }
  setLeadCookie(leadId);
  try {
    return await getBalance(leadId);
  } catch (err) {
    console.warn("[onboarding/start] getBalance warn:", err);
    return 0;
  }
}

/**
 * Cria o utilizador Supabase Auth via service-role. Devolve `userId` ou
 * um dos códigos discriminados. Idempotência: se o email já existir em
 * `auth.users` devolvemos `EMAIL_ALREADY_EXISTS` — o cliente cai no
 * fluxo de login (signInWithPassword) sem nunca expor o status real da
 * password antiga.
 */
async function createAuthUser(args: {
  email: string;
  password: string;
  emailConfirm: boolean;
}): Promise<
  | { ok: true; userId: string }
  | { ok: false; code: "EMAIL_ALREADY_EXISTS" | "AUTH_USER_CREATE_FAILED"; detail?: string }
> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: args.emailConfirm,
  });
  if (!error && data?.user?.id) {
    return { ok: true, userId: data.user.id };
  }
  const msg = error?.message ?? "";
  if (
    /already (registered|exists)/i.test(msg) ||
    /user.+already/i.test(msg) ||
    error?.status === 422
  ) {
    return { ok: false, code: "EMAIL_ALREADY_EXISTS" };
  }
  console.warn("[onboarding/start] admin.createUser failed", {
    status: error?.status,
    message: msg,
  });
  try {
    await supabaseAdmin.from("product_events").insert([
      {
        event_type: "onboarding_auth_create_failed",
        metadata: {
          status: error?.status ?? null,
          message_excerpt: msg.slice(0, 200),
        },
      },
    ]);
  } catch (e) {
    console.warn("[onboarding/start] auth_create_failed event insert failed", e);
  }
  return { ok: false, code: "AUTH_USER_CREATE_FAILED", detail: msg };
}

/**
 * Tenta enfileirar imediatamente o report_request para o handle
 * indicado, ligando-o ao snapshot mais recente. Fail-soft — nunca
 * bloqueia a resposta do onboarding.
 */
async function tryEnqueueReportForHandle(args: {
  handle: string | null;
  leadId: string;
  userId: string | null;
  origin: string;
}): Promise<void> {
  const handle = args.handle?.trim().toLowerCase();
  if (!handle) return;

  try {
    const { data: snap } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("id")
      .ilike("instagram_username", handle)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!snap?.id) {
      console.info("[onboarding/start] no snapshot yet for handle, skip enqueue", {
        handle,
        lead_id: args.leadId,
      });
      return;
    }

    const res = await enqueueReportForSnapshot({
      leadId: args.leadId,
      userId: args.userId,
      instagramUsername: handle,
      analysisSnapshotId: snap.id,
      origin: args.origin,
      source: "onboarding_signup",
    });
    console.info("[onboarding/start] report enqueue", {
      handle,
      lead_id: args.leadId,
      ok: res.ok,
      created: res.created,
      reason: res.reason ?? null,
      report_request_id: res.reportRequestId ?? null,
    });
  } catch (err) {
    console.warn("[onboarding/start] enqueue report failed (soft)", err);
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
  const mode = getAuthMode();
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

  // Password é obrigatória em ambos os modos password.* — falha cedo com
  // mensagem específica antes de tocar na DB.
  if (
    (mode === "password" || mode === "password_with_email_verification") &&
    (!parsed.data.password || parsed.data.password.length < 8)
  ) {
    const issues: FieldIssue[] = [{ field: "password", code: "missing" }];
    await logServerOnboardingError({
      errorCode: "INVALID_PAYLOAD",
      issues,
      handle: safeHandle(raw),
      fieldsPresent: presentFieldNames(raw),
    });
    return json(
      {
        ok: false,
        error_code: "PASSWORD_REQUIRED",
        message: FIELD_MESSAGES_PT.password,
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
        requires_email_verification:
          mode === "password_with_email_verification",
        auth_mode: mode,
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

  // Em modos password.* o /start é EXCLUSIVAMENTE para criar conta.
  // Se o email já tem auth user, devolve 409 e o cliente salta para o
  // ecrã de login (signInWithPassword). Nunca se emite cookie sem
  // password verificada.
  if (mode === "password" || mode === "password_with_email_verification") {
    const authCreate = await createAuthUser({
      email: parsed.data.email,
      password: parsed.data.password!,
      emailConfirm: mode === "password",
    });
    if (!authCreate.ok) {
      if (authCreate.code === "EMAIL_ALREADY_EXISTS") {
        return json(
          {
            ok: false,
            error_code: "EMAIL_ALREADY_EXISTS",
            message:
              "Já existe uma conta com este email. Entra com a tua palavra-passe.",
          },
          409,
        );
      }
      return json(
        {
          ok: false,
          error_code: "AUTH_USER_CREATE_FAILED",
          message: GENERIC_FALLBACK_MESSAGE,
        },
        500,
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

    // O trigger `handle_new_user` em `auth.users` corre
    // `link_user_to_existing_reports`, que liga `profiles.lead_id` ao
    // lead com o mesmo `email_normalized`. Não precisamos de coluna
    // dedicada em `leads`.
    void authCreate.userId; // referenced for clarity; trigger does the work

    // `password_with_email_verification` adia cookie + créditos para
    // depois da confirmação por email (Supabase email + /reset-password
    // page reaproveitam o fluxo). Apenas devolvemos lead_id.
    if (mode === "password_with_email_verification") {
      return json(
        {
          ok: true,
          lead_id: upserted.leadId,
          credits: 0,
          requires_email_verification: true,
          auth_mode: mode,
        },
        200,
      );
    }

    const credits = await grantSessionAndCredits(upserted.leadId);
    console.info("[onboarding/start] password account created", {
      lead_id: upserted.leadId,
      handle: parsed.data.handle ?? null,
      is_new: upserted.isNew,
    });
    if (upserted.isNew) {
      void sendReportAccessEmail({
        leadId: upserted.leadId,
        toEmail: parsed.data.email,
        firstName: parsed.data.name?.split(/\s+/)[0] ?? null,
        instagramHandle: parsed.data.handle ?? null,
      }).then((r) => {
        if (!r.ok) {
          console.warn("[onboarding/start] report-access email failed", {
            lead_id: upserted.leadId,
            reason: r.reason,
          });
        }
      });
    }
    return json(
      {
        ok: true,
        lead_id: upserted.leadId,
        credits,
        requires_email_verification: false,
        auth_mode: "password",
      },
      200,
    );
  }

  // Legacy `magic_link` fallback — mantido reachable só por env override.
  // Não é usado no UX público. Re-importa dinamicamente para evitar
  // dependência de runtime no path quente.
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
  try {
    const { sendVerificationEmail } = await import(
      "@/lib/email/send-verification.server"
    );
    void sendVerificationEmail({
      leadId: upserted.leadId,
      toEmail: parsed.data.email,
      firstName: parsed.data.name?.split(/\s+/)[0] ?? null,
      instagramHandle: parsed.data.handle ?? null,
    });
  } catch (err) {
    console.warn("[onboarding/start] magic_link send unavailable", err);
  }
  return json(
    {
      ok: true,
      credits: 0,
      requires_email_verification: true,
      auth_mode: "magic_link",
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