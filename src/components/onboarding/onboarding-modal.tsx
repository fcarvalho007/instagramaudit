/**
 * OnboardingModal — entry + qualification + final + login (password mode).
 *
 * Public flow (AUTH_MODE=password):
 *   Entry ──┬─► (new email)       Qualification ─► Final form (com password)
 *           │                                      ──► POST /api/onboarding/start
 *           │                                          (admin.createUser + cookie)
 *           └─► (existing email)  Login (email + password)
 *                                 ──► supabase.auth.signInWithPassword
 *                                 ──► POST /api/onboarding/claim-existing
 *
 * Security: o servidor (`start.ts`) cria a Supabase auth user via
 * service-role e só emite o cookie `lead_session` após sucesso. Para email
 * já existente, `/start` rejeita com `EMAIL_ALREADY_EXISTS` e o cliente
 * salta para o ecrã de login. Nunca emitimos sessão sem prova de
 * propriedade.
 *
 * Magic link / OTP foram removidos da UX pública — ficam reachable só via
 * `AUTH_MODE=magic_link` (env override) para contingência.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Briefcase,
  Eye,
  EyeOff,
  LineChart,
  Loader2,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  unlockFormSchema,
  type UnlockFormValues,
  type Goal,
  type ProfileOwnership,
} from "@/lib/unlock-flow";
import {
  LEAD_QUALIFICATIONS,
  LEAD_QUALIFICATION_LABELS_PT,
  type LeadQualification,
} from "@/lib/leads/qualification";
import { GridSelectField } from "@/components/onboarding/grid-select-field";
import { supabase } from "@/integrations/supabase/client";
import { parseFullName } from "@/lib/names/parse-full-name";
import { useOnboardingDraft } from "@/lib/leads/use-onboarding-draft";
import { trackOnboardingEvent } from "@/lib/tracking/onboarding-events";
import { buildStartPayload } from "@/lib/leads/build-start-payload";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export interface OnboardingSuccess {
  leadId: string;
  credits: number;
}

export interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Handle that will be analysed after onboarding succeeds. */
  handle: string;
  /**
   * Called AFTER the `lead_session` cookie is set (via /start for new
   * emails or /claim-existing for OTP-verified ones). Caller should then
   * navigate to /analyze/$username to trigger provider work.
   */
  onSuccess: (handle: string, result: OnboardingSuccess) => void;
  /**
   * Origin of the modal. Default `"analyze"` keeps the legacy copy that
   * references the handle being analysed. `"checkout"` swaps the
   * handle-dependent copy for checkout-friendly text (no `@username`
   * interpolation) so the modal can be rendered from `/precos` or any
   * focused checkout flow before a handle has been chosen.
   */
  purpose?: "analyze" | "checkout";
}

/**
 * View state machine. Mutually exclusive — only one panel renders at a
 * time. The email captured at the entry step is the source of truth for
 * the remaining views; we never re-prompt for it.
 */
type View =
  | { kind: "entry" }
  | { kind: "qualification"; email: string }
  | { kind: "final"; email: string }
  | { kind: "login"; email: string };

interface OnboardingApiOk {
  ok: true;
  lead_id?: string;
  credits?: number;
  requires_email_verification?: boolean;
  auth_mode?: "password" | "password_with_email_verification" | "magic_link";
}
interface OnboardingApiFail {
  ok: false;
  error_code: string;
  message: string;
  issues?: { field: string; code: string }[];
}
type OnboardingApiResponse = OnboardingApiOk | OnboardingApiFail;

export function OnboardingModal({
  open,
  onOpenChange,
  handle,
  onSuccess,
  purpose = "analyze",
}: OnboardingModalProps) {
  const { t } = useTranslation("gate");
  const [view, setView] = useState<View>({ kind: "entry" });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const formStartedAtRef = useRef<number>(Date.now());
  const succeededRef = useRef<boolean>(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    mode: "onChange",
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
      // O single-step signup recolhe apenas `qualification`. Mantemos
      // valores neutros para `profile_ownership`/`goal` (campos legados,
      // ainda presentes no schema) — o server deriva o que precisa de
      // `qualification`.
      profile_ownership: "curiosity" as ProfileOwnership,
      goal: "improve_content" as Goal,
      user_type: "creator",
      goal_other_text: "",
      user_type_other_text: "",
      qualification: undefined,
      gdpr_consent: false as unknown as true,
      marketing_consent: false,
    },
  });

  const { clear: clearDraft } = useOnboardingDraft(form, handle);

  // Reset state when the modal opens. `formStartedAt` reinicia para garantir
  // ≥2s antes do submit (timing guard espelhado pelo servidor).
  useEffect(() => {
    if (!open) return;
    succeededRef.current = false;
    formStartedAtRef.current = Date.now();
    setView({ kind: "entry" });
    setServerError(null);
    trackOnboardingEvent({
      event_type: "onboarding_step_view",
      step: 0,
      handle,
    });
    // intentional: handle is stable per modal session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = (next: boolean) => {
    if (submitting) return;
    if (!next && open && !succeededRef.current) {
      const step =
        view.kind === "entry"
          ? 0
          : view.kind === "qualification"
            ? 1
            : view.kind === "final"
              ? 2
              : 3;
      trackOnboardingEvent({
        event_type: "onboarding_abandon",
        step: step as 0 | 1 | 2 | 3,
        handle,
      });
    }
    onOpenChange(next);
  };

  const goBackToEntry = useCallback(() => {
    setServerError(null);
    setView({ kind: "entry" });
  }, []);

  const goBackToQualification = useCallback((email: string) => {
    setServerError(null);
    setView({ kind: "qualification", email });
  }, []);

  /**
   * Switch to the login view for an existing email. Pure UI transition —
   * no email is sent and no Supabase call is made until the user enters
   * the password.
   */
  const goToLoginView = useCallback((email: string) => {
    setServerError(null);
    setView({ kind: "login", email });
  }, []);

  /**
   * Resolves the entry step. Looks up the email via /check-email and
   * routes to either the final form (new lead) or OTP (existing lead).
   */
  const handleEntrySubmit = useCallback(
    async (email: string): Promise<void> => {
      setServerError(null);
      setSubmitting(true);
      try {
        const res = await fetch("/api/onboarding/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok: boolean;
          exists?: boolean;
          verification_mode?: "off" | "magic_link" | "otp";
          claimed?: boolean;
          lead_id?: string;
          credits?: number;
        } | null;
        if (!res.ok || !data || data.ok !== true) {
          setServerError(t("onboarding.errors.generic"));
          return;
        }
        if (data.exists) {
          // Email já tem conta — pedimos a palavra-passe. Nenhum email é
          // enviado neste passo.
          goToLoginView(email);
          return;
        }
        form.setValue("email", email, { shouldValidate: true });
        // Single-step signup: a qualificação é recolhida no próprio form
        // final (select inline), sem passo intermédio.
        setView({ kind: "final", email });
      } catch {
        setServerError(t("onboarding.errors.network"));
      } finally {
        setSubmitting(false);
      }
    },
    [form, goToLoginView, t],
  );

  /**
   * Path A — new email. Submits the full lead row to /api/onboarding/start.
   */
  const handleFinalSubmit = form.handleSubmit(async (values) => {
    const elapsed = Date.now() - formStartedAtRef.current;
    if (elapsed < 2_000) {
      setServerError(t("onboarding.errors.generic"));
      trackOnboardingEvent({
        event_type: "onboarding_error",
        step: 3,
        handle,
        error_code: "TIMING_GUARD",
      });
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const parsed = parseFullName(values.full_name);
      const honeypot = honeypotRef.current?.value ?? "";
      const payload = buildStartPayload(
        values,
        parsed.full_name,
        honeypot,
        formStartedAtRef.current,
        handle,
      );
      const res = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res
        .json()
        .catch(() => null)) as OnboardingApiResponse | null;
      // Race condition: o utilizador acabou de criar conta noutro
      // separador OU a conta já existia e o /check-email falhou silenciosa.
      // Redirige para o ecrã de login para o user introduzir a password.
      if (
        data &&
        data.ok === false &&
        (data.error_code === "EMAIL_ALREADY_EXISTS" ||
          data.error_code === "EMAIL_REQUIRES_VERIFICATION")
      ) {
        setSubmitting(false);
        goToLoginView(values.email);
        return;
      }
      if (!res.ok || !data || data.ok !== true) {
        const msg =
          (data && "message" in data && data.message) ||
          t("onboarding.errors.generic");
        setServerError(msg);
        const code =
          data && "error_code" in data && data.error_code
            ? data.error_code
            : `HTTP_${res.status}`;
        const issues =
          data && data.ok === false && Array.isArray(data.issues)
            ? data.issues
            : [];
        const fieldErrorMap: Record<string, keyof UnlockFormValues> = {
          name: "full_name",
          email: "email",
          qualification: "qualification",
          gdpr_consent: "gdpr_consent",
        };
        let firstFocus: keyof UnlockFormValues | null = null;
        for (const issue of issues) {
          const target = fieldErrorMap[issue.field];
          if (!target) continue;
          const fieldMsg =
            t(`onboarding.errors.fields.${issue.field}`, {
              defaultValue: msg,
            }) || msg;
          form.setError(target, { type: "server", message: fieldMsg });
          if (!firstFocus) firstFocus = target;
        }
        if (firstFocus && firstFocus !== "gdpr_consent") {
          try {
            form.setFocus(firstFocus);
          } catch {
            // setFocus silently fails if the input isn't mounted.
          }
        }
        const errorCode =
          issues.length > 0 ? `${code}_${issues[0].field}` : code;
        trackOnboardingEvent({
          event_type: "onboarding_error",
          step: 3,
          handle,
          error_code: errorCode,
        });
        return;
      }
      succeededRef.current = true;
      trackOnboardingEvent({
        event_type: "onboarding_success",
        step: 3,
        handle,
        marketing_consent: values.marketing_consent === true,
      });
      // `AUTH_MODE=password`: o servidor já criou a Supabase auth user e
      // emitiu o cookie `lead_session`. Avançamos directamente.
      if (
        data.auth_mode === "password" &&
        data.requires_email_verification === false &&
        data.lead_id
      ) {
        clearDraft();
        onSuccess(handle, {
          leadId: data.lead_id,
          credits: data.credits ?? 0,
        });
        return;
      }
      // `password_with_email_verification`: precisa de clicar no email.
      // Tratamos com a mesma cópia que o login pendente — neste momento
      // este modo não está activo no UX público, só por env override.
      setServerError(
        "Verifica o teu email para activar a conta antes de continuar.",
      );
    } catch {
      setServerError(t("onboarding.errors.network"));
      trackOnboardingEvent({
        event_type: "onboarding_error",
        step: 3,
        handle,
        error_code: "NETWORK",
      });
    } finally {
      setSubmitting(false);
    }
  });

  /**
   * Path B — email + password sign-in for existing accounts. Uses
   * `signInWithPassword`, then trades the access token at
   * `/api/onboarding/claim-existing` for our own `lead_session` cookie.
   */
  const handleLoginSubmit = useCallback(
    async (email: string, password: string): Promise<void> => {
      setSubmitting(true);
      setServerError(null);
      try {
        const { data: verified, error } =
          await supabase.auth.signInWithPassword({ email, password });
        if (error || !verified.session) {
          setServerError("Email ou palavra-passe incorretos.");
          trackOnboardingEvent({
            event_type: "onboarding_error",
            step: 2,
            handle,
            error_code: `LOGIN_${error?.status ?? "ERR"}`,
          });
          return;
        }
        const claim = await fetch("/api/onboarding/claim-existing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            access_token: verified.session.access_token,
            handle,
          }),
        });
        const claimData = (await claim.json().catch(() => null)) as {
          ok: boolean;
          lead_id?: string;
          credits?: number;
        } | null;
        if (
          !claim.ok ||
          !claimData ||
          claimData.ok !== true ||
          !claimData.lead_id
        ) {
          setServerError(
            "Não conseguimos preparar o acesso ao relatório. Tenta novamente.",
          );
          trackOnboardingEvent({
            event_type: "onboarding_error",
            step: 2,
            handle,
            error_code: "LOGIN_CLAIM_FAILED",
          });
          return;
        }
        succeededRef.current = true;
        trackOnboardingEvent({
          event_type: "onboarding_success",
          step: 2,
          handle,
        });
        clearDraft();
        onSuccess(handle, {
          leadId: claimData.lead_id,
          credits: claimData.credits ?? 0,
        });
      } catch {
        setServerError("Erro de rede. Tenta novamente.");
      } finally {
        setSubmitting(false);
      }
    },
    [clearDraft, handle, onSuccess],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:w-[calc(100vw-3rem)] sm:max-w-[820px] max-h-[92vh] overflow-x-hidden overflow-y-auto p-0 gap-0 border-border-default/60"
        data-testid="onboarding-modal"
      >
        {view.kind === "entry" ? (
          <EntryStepBody
            handle={handle}
            purpose={purpose}
            submitting={submitting}
            serverError={serverError}
            onSubmit={handleEntrySubmit}
            onSignInWithEmail={(email) => goToLoginView(email)}
            initialEmail={form.getValues("email")}
          />
        ) : view.kind === "qualification" ? (
          <QualificationStepBody
            form={form}
            purpose={purpose}
            submitting={submitting}
            serverError={serverError}
            onBack={goBackToEntry}
            onContinue={() => setView({ kind: "final", email: view.email })}
          />
        ) : view.kind === "final" ? (
          <FinalStepBody
            handle={handle}
            purpose={purpose}
            form={form}
            serverError={serverError}
            submitting={submitting}
            onBack={() => goBackToQualification(view.email)}
            onSubmit={handleFinalSubmit}
            onMissingQualification={() =>
              setView({ kind: "qualification", email: view.email })
            }
            honeypotRef={honeypotRef}
          />
        ) : (
          <LoginPanel
            email={view.email}
            purpose={purpose}
            submitting={submitting}
            serverError={serverError}
            onSubmit={(password) => handleLoginSubmit(view.email, password)}
            onBack={goBackToEntry}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Entry step — single screen with the dual path                              */
/* -------------------------------------------------------------------------- */

/* Magic-link-sent panel — shown when /check-email enqueued a signed link */
function MagicLinkSentPanel({
  email,
  onBack,
  onResend,
  submitting,
}: {
  email: string;
  onBack: () => void;
  onResend: () => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("gate");
  return (
    <div
      className="px-5 py-7 sm:px-9 sm:py-9"
      data-testid="onboarding-magic-link-sent"
    >
      <DialogHeader className="text-left space-y-2.5">
        <p className="text-eyebrow-sm text-content-tertiary">
          {t("onboarding.otp.eyebrow", { defaultValue: "Verificação" })}
        </p>
        <DialogTitle className="font-display text-[24px] sm:text-[28px] leading-[1.1] tracking-[-0.015em] text-content-primary text-balance break-words">
          Verifica o teu email
        </DialogTitle>
        <DialogDescription className="text-[14px] text-content-secondary leading-[1.55]">
          Enviámos um link seguro para{" "}
          <strong className="text-content-primary">{email}</strong>. Abre o
          email e clica no botão para entrar — não precisas de password.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 rounded-lg border border-border-default/60 bg-surface-muted/60 p-4">
        <p className="text-[13px] text-content-secondary leading-[1.55]">
          <ShieldCheck
            className="inline-block size-3.5 mr-1.5 -mt-0.5 text-content-tertiary"
            aria-hidden
          />
          Pedimos esta verificação só por segurança — para garantir que ninguém
          abre relatórios em teu nome. O link expira em 30 minutos.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1 text-[13px] text-content-secondary hover:text-content-primary disabled:opacity-60"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Voltar
        </button>
        <button
          type="button"
          onClick={() => void onResend()}
          disabled={submitting}
          className="text-[13px] font-medium text-primary hover:underline disabled:opacity-60 disabled:no-underline"
        >
          {submitting ? "A reenviar…" : "Reenviar link"}
        </button>
      </div>
    </div>
  );
}

/* Step indicator shared across entry → qualification → final */
function OnboardingStepHeader({
  current,
  className,
}: {
  current: 1 | 2 | 3;
  className?: string;
}) {
  const { t } = useTranslation("gate");
  const steps: Array<{ id: 1 | 2 | 3; key: "entry" | "qualification" | "final" }> = [
    { id: 1, key: "entry" },
    { id: 2, key: "qualification" },
    { id: 3, key: "final" },
  ];
  return (
    <div
      className={`flex items-center justify-between gap-3 ${className ?? ""}`}
      data-testid="onboarding-step-header"
    >
      <ol className="flex items-center gap-1.5" aria-label={`Passo ${current} de 3`}>
        {steps.map((s) => {
          const state =
            s.id < current ? "done" : s.id === current ? "active" : "future";
          return (
            <li
              key={s.id}
              className={`h-1.5 w-7 rounded-full transition-colors ${
                state === "active"
                  ? "bg-primary"
                  : state === "done"
                  ? "bg-primary/40"
                  : "bg-border-default"
              }`}
              aria-current={state === "active" ? "step" : undefined}
            />
          );
        })}
      </ol>
      <span className="text-eyebrow-sm text-content-tertiary whitespace-nowrap">
        {current === 3
          ? t("onboarding.stepper.badgeLast")
          : t("onboarding.stepper.badge", { n: current, total: 3 })}
      </span>
    </div>
  );
}

function EntryStepBody({
  handle,
  purpose,
  submitting,
  serverError,
  onSubmit,
  onSignInWithEmail,
  initialEmail,
}: {
  handle: string;
  purpose: "analyze" | "checkout";
  submitting: boolean;
  serverError: string | null;
  onSubmit: (email: string) => Promise<void> | void;
  onSignInWithEmail: (email: string) => Promise<void> | void;
  initialEmail?: string;
}) {
  const { t } = useTranslation("gate");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const isCheckout = purpose === "checkout";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setLocalError(t("onboarding.entry.emailInvalid"));
      return;
    }
    setLocalError(null);
    await onSubmit(value);
  };

  const goSignIn = async () => {
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setLocalError(t("onboarding.entry.emailInvalid"));
      return;
    }
    setLocalError(null);
    await onSignInWithEmail(value);
  };

  return (
    <div
      className="px-6 py-7 sm:px-10 sm:py-9"
      data-testid="onboarding-entry-step"
    >
      <OnboardingStepHeader current={1} className="mb-5" />
      <DialogHeader className="text-left space-y-2.5">
        <p className="text-eyebrow text-content-tertiary">
          {t(
            purpose === "checkout"
              ? "onboarding.entry.eyebrowCheckout"
              : "onboarding.entry.eyebrow",
          )}
        </p>
        <DialogTitle className="font-display text-[28px] sm:text-[32px] leading-[1.08] tracking-[-0.015em] text-content-primary text-balance">
          {t(
            purpose === "checkout"
              ? "onboarding.entry.titleCheckout"
              : "onboarding.entry.title",
          )}
        </DialogTitle>
        <DialogDescription className="text-[15px] text-content-secondary leading-[1.55]">
          {purpose === "checkout" ? (
            t("onboarding.entry.subtitleCheckout")
          ) : (
            <Trans
              i18nKey="onboarding.entry.subtitle"
              ns="gate"
              values={{ handle }}
              components={{ 1: <span className="text-primary font-medium" /> }}
            />
          )}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={submit}
        noValidate
        className={
          isCheckout
            ? "mt-6 relative rounded-2xl border border-border-default bg-white p-5 sm:p-6 space-y-4"
            : "mt-6 relative rounded-2xl border-2 border-primary/40 bg-primary/[0.03] p-5 sm:p-6 space-y-4"
        }
      >
        {!isCheckout ? (
          <>
            <span className="absolute -top-2.5 left-4 inline-flex items-center rounded-full bg-primary text-white px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              {t("onboarding.entry.newBadge")}
            </span>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden />
              <p className="text-[15px] font-semibold text-content-primary">
                {t("onboarding.entry.newTitle")}
              </p>
            </div>
            <p className="text-[14px] text-content-secondary leading-[1.5]">
              {t("onboarding.entry.newPromise")}
            </p>
          </>
        ) : null}

        <Input
          id="onb-entry-email"
          type="email"
          autoFocus
          autoComplete="email"
          inputMode="email"
          aria-label={t("onboarding.entry.emailPlaceholder")}
          placeholder={t("onboarding.entry.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(localError)}
          className="text-base bg-white"
          data-testid="onboarding-entry-email"
        />

        {localError || serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{localError ?? serverError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full rounded-lg font-medium h-12 text-[15px]"
          data-testid="onboarding-entry-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("onboarding.entry.checking")}
            </>
          ) : (
            t(isCheckout ? "onboarding.entry.newCtaCheckout" : "onboarding.entry.newCta")
          )}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-border-default/50 bg-surface-muted/40 px-4 py-3">
        <span className="text-[13.5px] text-content-secondary">
          {t(isCheckout ? "onboarding.entry.haveAccountCheckout" : "onboarding.entry.haveAccount")}
        </span>
        <button
          type="button"
          onClick={() => void goSignIn()}
          disabled={submitting}
          className="text-[13.5px] font-semibold text-primary hover:underline disabled:opacity-60"
          data-testid="onboarding-entry-signin"
        >
          {t(isCheckout ? "onboarding.entry.haveAccountCtaCheckout" : "onboarding.entry.haveAccountCta")}
        </button>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-content-tertiary flex items-center justify-center gap-1.5">
        <ShieldCheck className="size-3.5" aria-hidden />
        {t(isCheckout ? "onboarding.entry.trustLineCheckout" : "onboarding.entry.trustLine")}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Final step — 2-col editorial (left navy, right form)                       */
/* -------------------------------------------------------------------------- */

function FinalStepBody({
  handle,
  purpose,
  form,
  serverError,
  submitting,
  onBack,
  onSubmit,
  onMissingQualification,
  honeypotRef,
}: {
  handle: string;
  purpose: "analyze" | "checkout";
  form: ReturnType<typeof useForm<UnlockFormValues>>;
  serverError: string | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => Promise<void> | void;
  onMissingQualification: () => void;
  honeypotRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation("gate");
  const isCheckout = purpose === "checkout";
  const nameError = form.formState.errors.full_name?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  const confirmError = form.formState.errors.confirm_password?.message;
  const consentError = form.formState.errors.gdpr_consent?.message;
  const consent = form.watch("gdpr_consent");
  const marketing = form.watch("marketing_consent");
  const emailValue = form.watch("email");
  const emailIsValid = !emailError && emailValue && EMAIL_RE.test(emailValue);

  const trySubmit = async () => {
    const ok = await form.trigger();
    if (!ok) {
      const errs = form.formState.errors;
      // Erros que vivem no passo 2 (qualificação) → manda o user para lá.
      if (errs.profile_ownership || errs.goal || errs.goal_other_text) {
        onMissingQualification();
        return;
      }
      // Erros visíveis no passo 3 — react-hook-form já marca os campos.
      return;
    }
    await onSubmit();
  };

  // Defesa: se houver erros em campos que não renderizamos no passo 3,
  // mostramos um alerta no topo para nunca falhar em silêncio.
  const hiddenErrorKeys = (
    ["profile_ownership", "goal", "goal_other_text", "user_type", "user_type_other_text"] as const
  ).filter((k) => Boolean(form.formState.errors[k]));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void trySubmit();
      }}
      noValidate
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] min-w-0"
    >
      {/* Honeypot — invisible to humans, attracts bots */}
      <div
        className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden"
        aria-hidden
      >
        <label htmlFor="onb-website">Website</label>
        <input
          id="onb-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          ref={honeypotRef}
          name="website"
          defaultValue=""
        />
      </div>

      {/* Left — navy value panel */}
      <aside className="bg-content-primary text-white px-6 py-7 sm:px-7 sm:py-9 lg:py-10 flex flex-col gap-5">
        <p className="text-eyebrow-sm text-cyan-300">
          {t(
            purpose === "checkout"
              ? "onboarding.final.left.eyebrowCheckout"
              : "onboarding.final.left.eyebrow",
          )}
        </p>
        <p className="font-display text-[28px] sm:text-[32px] leading-[1.08] tracking-[-0.015em] text-white text-balance">
          {t(
            purpose === "checkout"
              ? "onboarding.final.left.titleCheckout"
              : "onboarding.final.left.title",
          )}
        </p>
        <ul className="space-y-3 pt-2">
          <FinalBullet>
            {purpose === "checkout" ? (
              t("onboarding.final.left.bullets.reportCheckout")
            ) : (
              <Trans
                i18nKey="onboarding.final.left.bullets.report"
                ns="gate"
                values={{ handle }}
              />
            )}
          </FinalBullet>
          {isCheckout ? (
            <>
              <FinalBullet>
                {t("onboarding.final.left.bullets.receiptCheckout")}
              </FinalBullet>
              <FinalBullet>
                {t("onboarding.final.left.bullets.returnCheckout")}
              </FinalBullet>
              <FinalBullet>
                {t("onboarding.final.left.bullets.noSubCheckout")}
              </FinalBullet>
            </>
          ) : (
            <>
              <FinalBullet>
                <Trans
                  i18nKey="onboarding.final.left.bullets.credits"
                  ns="gate"
                  components={{ strong: <strong className="text-white" /> }}
                />
              </FinalBullet>
              <FinalBullet>
                {t("onboarding.final.left.bullets.save")}
              </FinalBullet>
            </>
          )}
        </ul>
      </aside>

      {/* Right — compact form */}
      <div className="px-5 py-6 sm:px-7 sm:py-8 flex flex-col gap-4 bg-white min-w-0">
        <OnboardingStepHeader current={3} className="mb-2" />
        <div className="space-y-1.5">
          <Label htmlFor="onb-name" className="text-[13.5px] font-medium text-content-primary">
            {t("onboarding.final.right.nameLabel")}
          </Label>
          <Input
            id="onb-name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder={t("onboarding.final.right.namePlaceholder")}
            aria-invalid={Boolean(nameError)}
            className="text-base"
            {...form.register("full_name")}
          />
          {nameError ? (
            <p className="text-[12.5px] text-destructive">{nameError}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="onb-email" className="text-[13.5px] font-medium text-content-primary">
            {t("onboarding.final.right.emailLabel")}
          </Label>
          <div className="relative">
            <Input
              id="onb-email"
              type="email"
              autoComplete="email"
              placeholder={t("onboarding.final.right.emailPlaceholder")}
              aria-invalid={Boolean(emailError)}
              className="pr-9 text-base"
              {...form.register("email")}
            />
            {emailIsValid ? (
              <Check
                className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600"
                aria-hidden
              />
            ) : null}
          </div>
          {emailError ? (
            <p className="text-[12.5px] text-destructive">{emailError}</p>
          ) : (
            <p className="text-[12px] text-content-secondary">
              {t("onboarding.final.right.emailHint")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="onb-password"
            className="text-[13.5px] font-medium text-content-primary"
          >
            Palavra-passe
          </Label>
          <Input
            id="onb-password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={Boolean(passwordError)}
            className="text-base"
            {...form.register("password")}
            data-testid="onboarding-password"
          />
          {passwordError ? (
            <p className="text-[12.5px] text-destructive">{passwordError}</p>
          ) : (
            <p className="text-[12px] text-content-secondary">
              Usa pelo menos 8 caracteres. Vamos validar contra palavras-passe
              comuns para te proteger.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="onb-confirm-password"
            className="text-[13.5px] font-medium text-content-primary"
          >
            Confirmar palavra-passe
          </Label>
          <Input
            id="onb-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(confirmError)}
            className="text-base"
            {...form.register("confirm_password")}
            data-testid="onboarding-confirm-password"
          />
          {confirmError ? (
            <p className="text-[12.5px] text-destructive">{confirmError}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-border-default/40 bg-surface-muted/40 p-3 space-y-2.5">
          <label htmlFor="onb-gdpr" className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox
              id="onb-gdpr"
              checked={consent === true}
              onCheckedChange={(v) =>
                form.setValue(
                  "gdpr_consent",
                  v === true ? true : (false as unknown as true),
                  { shouldValidate: true },
                )
              }
              aria-invalid={Boolean(consentError)}
              className="mt-0.5"
            />
            <span className="text-[13px] text-content-secondary leading-[1.5] flex-1">
              <Trans
                i18nKey="onboarding.final.right.consentText"
                ns="gate"
                components={{
                  a: (
                    <a
                      href="/aviso-legal"
                      target="_blank"
                      rel="noopener"
                      className="underline text-primary hover:text-primary/80"
                    />
                  ),
                  a2: (
                    <a
                      href="/privacidade"
                      target="_blank"
                      rel="noopener"
                      className="underline text-primary hover:text-primary/80"
                    />
                  ),
                }}
              />{" "}
              <span className="text-content-tertiary">
                {t("onboarding.final.right.consentMandatory")}
              </span>
            </span>
          </label>

          <div className="border-t border-dashed border-border-default/50" />

          <label htmlFor="onb-marketing" className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox
              id="onb-marketing"
              checked={marketing === true}
              onCheckedChange={(v) =>
                form.setValue("marketing_consent", v === true, {
                  shouldValidate: false,
                })
              }
              className="mt-0.5"
            />
            <span className="text-[13px] text-content-secondary leading-[1.5] flex-1">
              {t("onboarding.final.right.marketingText")}{" "}
              <span className="text-content-tertiary">
                {t("onboarding.final.right.marketingOptional")}
              </span>
            </span>
          </label>
        </div>

        {consentError ? (
          <p className="text-[12.5px] text-destructive">{consentError}</p>
        ) : null}

        {hiddenErrorKeys.length > 0 ? (
          <Alert variant="destructive" aria-live="polite">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{t("onboarding.final.right.missingQualification")}</span>
              <button
                type="button"
                onClick={onMissingQualification}
                className="font-semibold underline shrink-0"
              >
                {t("onboarding.final.right.back")}
              </button>
            </AlertDescription>
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="destructive" aria-live="polite">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col-reverse md:flex-row gap-2 md:gap-3 pt-1 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onBack}
            disabled={submitting}
            className="w-full md:w-auto md:flex-shrink-0 rounded-lg min-w-0 text-content-secondary"
          >
            <ArrowLeft className="size-4 hidden md:inline" aria-hidden />
            {t("onboarding.final.right.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full md:flex-1 md:min-w-0 rounded-lg font-medium"
            data-testid="onboarding-final-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span>{t("onboarding.submitting")}</span>
              </>
            ) : (
              <>
                {isCheckout ? (
                  <Lock className="size-4" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
                <span>
                  {t(isCheckout ? "onboarding.final.right.ctaCheckout" : "onboarding.final.right.cta")}
                </span>
              </>
            )}
          </Button>
        </div>
        <p className="text-center text-[12px] text-content-tertiary mt-1">
          {t(isCheckout ? "onboarding.final.right.footnoteCheckout" : "onboarding.final.right.footnote")}
        </p>
      </div>
    </form>
  );
}

function FinalBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[13.5px] text-white/85 leading-[1.5]">
      <Check
        className="size-4 mt-0.5 text-white/70 shrink-0"
        aria-hidden
        strokeWidth={2.25}
      />
      <span>{children}</span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Qualification step — single select between entry and final                 */
/* -------------------------------------------------------------------------- */

function QualificationStepBody({
  form,
  purpose,
  submitting,
  serverError,
  onBack,
  onContinue,
}: {
  form: ReturnType<typeof useForm<UnlockFormValues>>;
  purpose: "analyze" | "checkout";
  submitting: boolean;
  serverError: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation("gate");
  const isCheckout = purpose === "checkout";
  const ownership = form.watch("profile_ownership") as
    | ProfileOwnership
    | undefined;
  const goal = form.watch("goal") as Goal | undefined;
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  const OWNERSHIP_OPTIONS: Array<{
    value: ProfileOwnership;
    Icon: typeof User;
  }> = [
    { value: "own_profile", Icon: User },
    { value: "brand_profile", Icon: Star },
    { value: "client_profile", Icon: Briefcase },
    { value: "competitor_research", Icon: Eye },
  ];

  const GOAL_OPTIONS: Array<{ value: Goal; Icon: typeof User }> = [
    { value: "improve_content", Icon: Sparkles },
    { value: "benchmark_competitors", Icon: Scale },
    { value: "client_report", Icon: LineChart },
    { value: "grow_audience", Icon: TrendingUp },
  ];

  const handleContinue = () => {
    let hasError = false;
    if (!ownership) {
      setOwnershipError(t("onboarding.qualification.ownershipError"));
      hasError = true;
    } else {
      setOwnershipError(null);
    }
    if (!goal) {
      setGoalError(t("onboarding.qualification.goalError"));
      hasError = true;
    } else {
      setGoalError(null);
    }
    if (hasError) return;
    onContinue();
  };

  return (
    <div
      className="px-6 py-6 sm:px-10 sm:py-8"
      data-testid="onboarding-qualification-step"
    >
      <OnboardingStepHeader current={2} className="mb-5" />
      <DialogHeader className="text-left space-y-2.5">
        <p className="text-eyebrow text-content-tertiary">
          {t(isCheckout ? "onboarding.qualification.eyebrowCheckout" : "onboarding.qualification.eyebrow")}
        </p>
        <DialogTitle className="font-display text-[28px] sm:text-[32px] leading-[1.08] tracking-[-0.015em] text-content-primary text-balance">
          {t(isCheckout ? "onboarding.qualification.titleCheckout" : "onboarding.qualification.title")}
        </DialogTitle>
        <DialogDescription className="text-[15px] text-content-secondary leading-[1.55]">
          {t(isCheckout ? "onboarding.qualification.subtitleCheckout" : "onboarding.qualification.subtitle")}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-5" data-testid="onboarding-qualification">
        <GridSelectField
          legend={t("onboarding.qualification.ownershipLegend")}
          name="profile_ownership"
          options={OWNERSHIP_OPTIONS.map((o) => ({
            value: o.value,
            label: t(`onboarding.compactOptions.profileOwnership.${o.value}`),
            Icon: o.Icon,
          }))}
          value={ownership}
          onChange={(v) => {
            form.setValue("profile_ownership", v as ProfileOwnership, {
              shouldValidate: true,
            });
            setOwnershipError(null);
          }}
          error={ownershipError ?? undefined}
        />

        <GridSelectField
          legend={t("onboarding.qualification.goalLegend")}
          name="goal"
          options={GOAL_OPTIONS.map((o) => ({
            value: o.value,
            label: t(`onboarding.compactOptions.goal.${o.value}`),
            Icon: o.Icon,
          }))}
          value={goal}
          onChange={(v) => {
            form.setValue("goal", v as Goal, { shouldValidate: true });
            form.setValue("goal_other_text", "", { shouldValidate: false });
            setGoalError(null);
          }}
          error={goalError ?? undefined}
        />

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 min-w-0">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={submitting}
          className="w-full sm:w-auto sm:flex-shrink-0 rounded-lg min-w-0"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("onboarding.qualification.back")}
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={handleContinue}
          disabled={submitting || !ownership || !goal}
          className="w-full sm:flex-1 sm:min-w-0 rounded-lg font-medium"
          data-testid="onboarding-qualification-continue"
        >
          <span className="truncate">{t("onboarding.qualification.cta")}</span>
        </Button>
      </div>
      {!submitting && (!ownership || !goal) ? (
        <p
          className="mt-2 text-xs text-content-tertiary text-center sm:text-right"
          aria-live="polite"
        >
          {t("onboarding.qualification.missingHint")}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Login panel — email + password sign-in for existing accounts               */
/* -------------------------------------------------------------------------- */

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}${user.length > 2 ? "•••" : ""}@${domain}`;
}

function LoginPanel({
  email,
  purpose,
  submitting,
  serverError,
  onSubmit,
  onBack,
}: {
  email: string;
  purpose: "analyze" | "checkout";
  submitting: boolean;
  serverError: string | null;
  onSubmit: (password: string) => Promise<void> | void;
  onBack: () => void;
}) {
  void purpose;
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    await onSubmit(password);
  };

  return (
    <div
      className="px-5 py-7 sm:px-9 sm:py-9"
      data-testid="onboarding-login-step"
    >
      <DialogHeader className="text-left space-y-2.5">
        <p className="text-eyebrow-sm text-content-tertiary">
          Entrar na conta
        </p>
        <DialogTitle className="font-display text-[24px] sm:text-[28px] leading-[1.1] tracking-[-0.015em] text-content-primary text-balance break-words">
          Já tens conta com {maskEmail(email)}
        </DialogTitle>
        <DialogDescription className="text-[14px] text-content-secondary leading-[1.55]">
          Introduz a tua palavra-passe para abrir o relatório. Os teus dados
          continuam protegidos.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label
            htmlFor="onb-login-email"
            className="text-[13.5px] font-medium text-content-primary"
          >
            Email
          </Label>
          <Input
            id="onb-login-email"
            type="email"
            autoComplete="email"
            value={email}
            readOnly
            className="bg-surface-muted/40 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="onb-login-password"
              className="text-[13.5px] font-medium text-content-primary"
            >
              Palavra-passe
            </Label>
            <a
              href="/reset-password"
              className="text-[12px] font-medium text-primary hover:underline"
              target="_blank"
              rel="noopener"
            >
              Esqueceste-te?
            </a>
          </div>
          <Input
            id="onb-login-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-base"
            data-testid="onboarding-login-password"
          />
        </div>

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={submitting || password.length === 0}
          className="w-full rounded-lg font-medium h-12"
          data-testid="onboarding-login-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              A entrar…
            </>
          ) : (
            <>
              <Lock className="size-4" aria-hidden />
              Entrar
            </>
          )}
        </Button>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="inline-flex items-center gap-1 text-[13px] text-content-secondary hover:text-content-primary disabled:opacity-60"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Voltar
          </button>
          <span className="text-[12px] text-content-tertiary">
            Não és tu?{" "}
            <button
              type="button"
              onClick={onBack}
              className="font-medium text-primary hover:underline"
            >
              Usar outro email
            </button>
          </span>
        </div>
      </form>
    </div>
  );
}