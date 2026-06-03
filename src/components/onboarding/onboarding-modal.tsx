/**
 * OnboardingModal — Fase 3 (redesenho 3 passos).
 *
 * Fluxo: Intro (0) → Nome (1) → Contexto: relação + objetivo (2) → Email/GDPR (3).
 *
 * Liga-se a:
 *  - `useOnboardingDraft` (sessionStorage debounced; clear no sucesso)
 *  - `trackOnboardingEvent` (step_view / step_complete / abandon / success)
 *  - `/api/onboarding/start` com `_t` (timing ≥2s) e `website` (honeypot)
 *
 * Copy vive em `gate.json` em `onboarding.*` — `unlock.*` é legado do
 * `unlock-modal` antigo e não é aqui consumido.
 *
 * `user_type` não é recolhido na UI; o payload omite o campo. A coluna
 * `leads.user_type` mantém-se nullable.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Binoculars,
  Briefcase,
  Check,
  CheckCircle2,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
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
  unlockFormSchema,
  type Goal,
  type ProfileOwnership,
  type UnlockFormValues,
} from "@/lib/unlock-flow";
import { parseFullName } from "@/lib/names/parse-full-name";
import { useOnboardingDraft } from "@/lib/leads/use-onboarding-draft";
import { trackOnboardingEvent } from "@/lib/tracking/onboarding-events";
import { buildStartPayload } from "@/lib/leads/build-start-payload";

const TOTAL_STEPS = 3;

const RELATIONSHIP_VALUES = [
  "own_profile",
  "client_profile",
  "brand_profile",
  "competitor_research",
] as const satisfies readonly ProfileOwnership[];

const GOAL_VALUES = [
  "improve_content",
  "benchmark_competitors",
  "grow_audience",
  "validate_brand",
] as const satisfies readonly Goal[];

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
   * Called AFTER `/api/onboarding/start` returns ok=true and the
   * `lead_session` cookie is set. Caller should then navigate to
   * `/analyze/$username` to trigger provider work.
   */
  onSuccess: (handle: string, result: OnboardingSuccess) => void;
}

type IntroStep = 0;
type FormStep = 1 | 2 | 3;
type Step = IntroStep | FormStep;

interface OnboardingApiOk {
  ok: true;
  lead_id: string;
  credits: number;
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
}: OnboardingModalProps) {
  const { t } = useTranslation("gate");
  const [step, setStep] = useState<Step>(0);
  const [view, setView] = useState<"intro" | "login">("intro");
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
      profile_ownership: undefined as unknown as ProfileOwnership,
      goal: undefined as unknown as Goal,
      // user_type mantém-se no schema (legado) mas nunca é editado nem enviado.
      // O zodResolver vai aceitar o default seguinte porque tornamos o submit
      // imune a esse erro (ver handleFinalSubmit que envia sem o campo).
      user_type: "creator",
      goal_other_text: "",
      user_type_other_text: "",
      gdpr_consent: false as unknown as true,
      marketing_consent: false,
    },
  });

  const { clear: clearDraft } = useOnboardingDraft(form, handle);

  // Reset state quando o modal abre (não quando fecha — assim o `abandon`
  // ainda pode ler `step`). `formStartedAt` reinicia para garantir ≥2s reais.
  useEffect(() => {
    if (!open) return;
    succeededRef.current = false;
    formStartedAtRef.current = Date.now();
    setStep(0);
    setView("intro");
    setServerError(null);
    trackOnboardingEvent({
      event_type: "onboarding_step_view",
      step: 0,
      handle,
    });
    // intencional: handle estável por sessão do modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fireStepView = useCallback(
    (s: Step) => {
      trackOnboardingEvent({
        event_type: "onboarding_step_view",
        step: s,
        handle,
      });
    },
    [handle],
  );

  const handleClose = (next: boolean) => {
    if (submitting) return;
    if (!next && open && !succeededRef.current) {
      trackOnboardingEvent({
        event_type: "onboarding_abandon",
        step,
        handle,
      });
    }
    onOpenChange(next);
  };

  const goNext = async () => {
    setServerError(null);
    if (step === 0) {
      setStep(1);
      fireStepView(1);
      return;
    }
    let fields: (keyof UnlockFormValues)[] = [];
    if (step === 1) fields = ["full_name"];
    if (step === 2) fields = ["profile_ownership", "goal"];
    if (step === 3) fields = ["email", "phone", "gdpr_consent"];
    const ok = await form.trigger(fields, { shouldFocus: true });
    if (!ok) return;

    trackOnboardingEvent({
      event_type: "onboarding_step_complete",
      step,
      handle,
    });

    if (step === 3) {
      await handleFinalSubmit();
      return;
    }
    const nextStep = (step + 1) as FormStep;
    setStep(nextStep);
    fireStepView(nextStep);
  };

  const goBack = () => {
    setServerError(null);
    if (step === 0) {
      onOpenChange(false);
      return;
    }
    if (step === 1) {
      setStep(0);
      return;
    }
    const prev = (step - 1) as FormStep;
    setStep(prev);
  };

  const handleFinalSubmit = form.handleSubmit(async (values) => {
    // Timing guard cliente — espelha o servidor, mas evita request inútil.
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
        // Required so the browser accepts the Set-Cookie response when the
        // app is loaded inside a third-party iframe (Lovable preview).
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res
        .json()
        .catch(() => null)) as OnboardingApiResponse | null;
      if (!res.ok || !data || data.ok !== true) {
        const msg =
          (data && "message" in data && data.message) ||
          t("onboarding.errors.generic");
        setServerError(msg);
        const code =
          data && "error_code" in data && data.error_code
            ? data.error_code
            : `HTTP_${res.status}`;
        // Mapeia issues do servidor para erros de campo no react-hook-form
        // e foca o primeiro input afectado. Para `gdpr_consent` e
        // `_t`/`website` (sem input visível) caímos só no banner.
        const issues =
          data && data.ok === false && Array.isArray(data.issues)
            ? data.issues
            : [];
        const fieldErrorMap: Record<string, keyof UnlockFormValues> = {
          name: "full_name",
          email: "email",
          phone: "phone",
          gdpr_consent: "gdpr_consent",
          purpose: "goal",
          profile_ownership: "profile_ownership",
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
            // setFocus falha silenciosamente se o input não estiver montado.
          }
        }
        const errorCode = issues.length > 0 ? `${code}_${issues[0].field}` : code;
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
      clearDraft();
      onSuccess(handle, { leadId: data.lead_id, credits: data.credits });
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-[760px] max-h-[92vh] overflow-x-hidden overflow-y-auto p-0 gap-0 border-border-default/60"
        data-testid="onboarding-modal"
      >
        {step === 0 && view === "login" ? (
          <LoginStepBody
            handle={handle}
            onBackToIntro={() => {
              setView("intro");
              trackOnboardingEvent({
                event_type: "onboarding_step_view",
                step: 0,
                handle,
              });
            }}
          />
        ) : step === 0 ? (
          <IntroStepBody
            handle={handle}
            onContinue={() => {
              setStep(1);
              fireStepView(1);
            }}
            onSignIn={() => {
              setView("login");
              trackOnboardingEvent({
                event_type: "onboarding_step_view",
                step: 0,
                handle,
              });
            }}
          />
        ) : (
          <FormStepBody
            step={step as FormStep}
            handle={handle}
            form={form}
            serverError={serverError}
            submitting={submitting}
            goBack={goBack}
            goNext={goNext}
            honeypotRef={honeypotRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IntroStepBody({
  handle,
  onContinue,
  onSignIn,
}: {
  handle: string;
  onContinue: () => void;
  onSignIn: () => void;
}) {
  const { t } = useTranslation("gate");

  return (
    <div
      className="px-6 py-8 sm:px-10 sm:py-10"
      data-testid="onboarding-intro-step"
    >
      <DialogHeader className="text-left space-y-3">
        <p className="text-eyebrow text-content-tertiary">
          {t("onboarding.intro.eyebrow")}
        </p>
        <DialogTitle className="font-display text-[30px] sm:text-[34px] leading-[1.1] tracking-[-0.015em] text-content-primary text-balance">
          <Trans
            i18nKey="onboarding.intro.title"
            ns="gate"
            components={{ free: <span className="text-emerald-600" /> }}
          />
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("onboarding.intro.handleContext", { handle })}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 space-y-5">
        <div
          className="rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4 space-y-2"
          data-testid="onboarding-handle-context"
        >
          <p className="text-[15px] font-medium text-content-primary leading-[1.5]">
            <Trans
              i18nKey="onboarding.intro.handleContext"
              ns="gate"
              values={{ handle }}
              components={{ 1: <span className="text-primary" /> }}
            >
              {`Vais analisar @${handle}`}
            </Trans>
          </p>
          <p className="text-[14px] text-content-secondary leading-[1.5]">
            <Trans
              i18nKey="onboarding.intro.creditNote"
              ns="gate"
              components={{ strong: <strong className="text-content-primary" /> }}
            />
          </p>
        </div>

        <p className="text-[14px] text-content-tertiary leading-[1.5]">
          {t("onboarding.intro.personalHint")}
        </p>

        <Button
          type="button"
          size="lg"
          className="w-full rounded-lg font-medium h-12 text-[15px]"
          onClick={onContinue}
          data-testid="onboarding-intro-cta"
        >
          {t("onboarding.intro.cta")}
        </Button>

        <div className="border-t border-border-default/50 pt-4 space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onSignIn}
            className="w-full rounded-lg h-12 text-[14px] font-medium text-content-secondary hover:text-primary hover:bg-primary/[0.04]"
            data-testid="onboarding-intro-signin"
          >
            <span>{t("onboarding.intro.haveAccount")}</span>
            <span className="ml-1.5 text-primary font-semibold">
              {t("onboarding.intro.haveAccountCta")}
            </span>
          </Button>
          <p className="text-center text-[13px] text-content-tertiary flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden />
            {t("onboarding.intro.trustLine")}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginStepBody({
  handle,
  onBackToIntro,
}: {
  handle: string;
  onBackToIntro: () => void;
}) {
  const { t } = useTranslation("gate");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const LOGIN_BACKEND_READY = false;

  useEffect(() => {
    trackOnboardingEvent({
      event_type: "onboarding_step_view",
      step: 0,
      handle,
      // marca a vista de login mesmo sem novo event_type formal — o step=0
      // partilhado evita inflar o funil; usamos o error_code como tag.
      error_code: "LOGIN_VIEW",
    });
  }, [handle]);

  const isValid = /^\S+@\S+\.\S+$/.test(email.trim());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValid) {
      setError(t("onboarding.login.emailInvalid"));
      return;
    }
    setSubmitting(true);
    try {
      if (LOGIN_BACKEND_READY) {
        const res = await fetch("/api/onboarding/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: email.trim(), handle }),
        });
        if (!res.ok) throw new Error("login_failed");
      }
      setSent(email.trim());
      trackOnboardingEvent({
        event_type: LOGIN_BACKEND_READY
          ? "onboarding_step_complete"
          : "onboarding_error",
        step: 0,
        handle,
        error_code: LOGIN_BACKEND_READY ? undefined : "LOGIN_PENDING_BACKEND",
      });
    } catch {
      setError(t("onboarding.login.errors.network"));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    const masked = maskEmail(sent);
    return (
      <div className="px-5 py-7 sm:px-9 sm:py-9" data-testid="onboarding-login-success">
        <DialogHeader className="text-left space-y-2.5">
          <p className="text-eyebrow-sm text-content-tertiary">
            {t("onboarding.login.eyebrow")}
          </p>
          <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.08] tracking-[-0.015em] text-content-primary text-balance">
            {t("onboarding.login.success.title")}
          </DialogTitle>
          <DialogDescription className="text-[15px] text-content-secondary leading-[1.55]">
            {t("onboarding.login.success.body", { email: masked })}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full rounded-lg"
            onClick={onBackToIntro}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("onboarding.login.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-7 sm:px-9 sm:py-9" data-testid="onboarding-login-step">
      <DialogHeader className="text-left space-y-2.5">
        <p className="text-eyebrow-sm text-content-tertiary">
          {t("onboarding.login.eyebrow")}
        </p>
        <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.08] tracking-[-0.015em] text-content-primary text-balance">
          {t("onboarding.login.title")}
        </DialogTitle>
        <DialogDescription className="text-[15px] text-content-secondary leading-[1.55]">
          <Trans
            i18nKey="onboarding.login.subtitle"
            ns="gate"
            values={{ handle }}
            components={{ 1: <span className="text-primary font-medium" /> }}
          />
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="onb-login-email" className="text-[15px] font-medium text-content-primary">
            {t("onboarding.login.emailLabel")}
          </Label>
          <Input
            id="onb-login-email"
            type="email"
            autoFocus
            autoComplete="email"
            placeholder={t("onboarding.login.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            data-testid="onboarding-login-email"
            className="text-base"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-lg font-medium"
          disabled={submitting}
          data-testid="onboarding-login-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("onboarding.login.submitting")}
            </>
          ) : (
            t("onboarding.login.cta")
          )}
        </Button>

        <p className="text-center text-[13px] text-content-tertiary leading-[1.5]">
          {t("onboarding.login.secureHint")}
        </p>

        <div className="border-t border-border-default/50 pt-3">
          <p className="text-center text-[13.5px] text-content-secondary">
            {t("onboarding.login.noAccount")}{" "}
            <button
              type="button"
              onClick={onBackToIntro}
              className="font-medium text-primary hover:underline"
              data-testid="onboarding-login-back"
            >
              {t("onboarding.login.noAccountCta")}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}${user.length > 2 ? "•••" : ""}@${domain}`;
}

function ProgressSegments({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 pt-2" aria-hidden>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        return (
          <span
            key={i}
            className={
              "h-[3px] flex-1 rounded-full transition-colors " +
              (filled ? "bg-primary" : "bg-border-default/60")
            }
          />
        );
      })}
    </div>
  );
}

function FormStepBody({
  step,
  handle,
  form,
  serverError,
  submitting,
  goBack,
  goNext,
  honeypotRef,
}: {
  step: FormStep;
  handle: string;
  form: ReturnType<typeof useForm<UnlockFormValues>>;
  serverError: string | null;
  submitting: boolean;
  goBack: () => void;
  goNext: () => Promise<void> | void;
  honeypotRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation("gate");
  const stepKey = String(step) as "1" | "2" | "3";
  const eyebrow = t(`onboarding.steps.${stepKey}.eyebrow`);
  const title = t(`onboarding.steps.${stepKey}.title`);
  const subtitle = t(`onboarding.steps.${stepKey}.subtitle`);
  const badge =
    step === 3 ? t("onboarding.steps.3.badge", { defaultValue: "" }) : "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void goNext();
      }}
      noValidate
      className="min-w-0 flex flex-col max-h-[92vh]"
    >
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-9 sm:py-9">
      <DialogHeader className="min-w-0 text-left space-y-2 sm:space-y-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <p className="text-eyebrow-sm text-content-tertiary">{eyebrow}</p>
          {badge ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-[1px] text-[10px] font-semibold tracking-wide">
              {badge}
            </span>
          ) : null}
        </div>
        <DialogTitle className="font-display text-[24px] sm:text-[30px] leading-[1.08] tracking-[-0.015em] text-content-primary min-w-0 break-words text-balance">
          <Trans i18nKey={`onboarding.steps.${stepKey}.title`} ns="gate" components={{ em: <em className="not-italic text-primary" /> }}>
            {title}
          </Trans>
        </DialogTitle>
        <DialogDescription className="text-[15px] text-content-secondary leading-[1.55] break-words">
          {subtitle}
        </DialogDescription>
        <ProgressSegments current={step} total={TOTAL_STEPS} />
      </DialogHeader>

      <div className="space-y-5 mt-4 sm:mt-5">
        {/* Honeypot — invisível para humanos, atrai bots */}
        <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden>
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

        {step === 1 ? <Step1Name form={form} /> : null}
        {step === 2 ? <Step2Context form={form} handle={handle} /> : null}
        {step === 3 ? <Step3EmailGdpr form={form} /> : null}

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      </div>

      <div
        className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 sm:flex-row sm:gap-3 border-t border-border-default/40 bg-background px-5 sm:px-9 pt-3 sm:pt-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-4 min-w-0"
      >
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={submitting}
            className="w-full sm:w-auto sm:flex-shrink-0 rounded-lg"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("onboarding.cta.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="w-full sm:flex-1 sm:w-auto min-w-0 rounded-lg font-medium"
            disabled={submitting}
            data-testid={
              step === 3 ? "onboarding-submit" : "onboarding-continue"
            }
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("onboarding.submitting")}
              </>
            ) : step === 3 ? (
              <>
                <Sparkles className="size-4" aria-hidden />
                {t("onboarding.cta.final")}
              </>
            ) : (
              t("onboarding.cta.continue")
            )}
          </Button>
      </div>
    </form>
  );
}

function Step1Name({
  form,
}: {
  form: ReturnType<typeof useForm<UnlockFormValues>>;
}) {
  const { t } = useTranslation("gate");
  const error = form.formState.errors.full_name?.message;
  return (
    <div className="space-y-2">
      <Label htmlFor="onb-full-name" className="text-[15px] font-medium text-content-primary">
        {t("onboarding.steps.1.nameLabel")}
      </Label>
      <Input
        id="onb-full-name"
        type="text"
        autoFocus
        autoComplete="name"
        placeholder={t("onboarding.steps.1.namePlaceholder")}
        aria-invalid={Boolean(error)}
        className="text-base"
        {...form.register("full_name")}
      />
      <p className="text-[13px] text-content-tertiary leading-[1.45]">
        {t("onboarding.steps.1.nameHint")}
      </p>
      {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
    </div>
  );
}

function ChipGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  options: { value: T; label: string; icon: LucideIcon }[];
  value: T | undefined;
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label={name}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
      >
        {options.map((o) => {
          const selected = value === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={
                "flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-lg border px-2.5 py-2.5 sm:py-3.5 min-h-[68px] sm:min-h-[88px] text-center text-[14px] font-semibold transition-colors " +
                (selected
                  ? "border-primary bg-primary/[0.06] text-primary"
                  : "border-border-default/60 bg-card text-content-secondary hover:border-primary/40 hover:text-content-primary")
              }
              data-testid={`chip-${name}-${o.value}`}
            >
              <Icon
                className={
                  "size-[18px] sm:size-[22px] " +
                  (selected ? "text-primary" : "text-content-tertiary")
                }
                aria-hidden="true"
                strokeWidth={1.75}
              />
              <span className="leading-[1.2] break-words hyphens-auto">{o.label}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-[13px] text-destructive mt-1.5">{error}</p> : null}
    </div>
  );
}

function Step2Context({
  form,
  handle,
}: {
  form: ReturnType<typeof useForm<UnlockFormValues>>;
  handle: string;
}) {
  const { t } = useTranslation("gate");
  const ownership = form.watch("profile_ownership");
  const goal = form.watch("goal");
  const ownershipError = form.formState.errors.profile_ownership?.message;
  const goalError = form.formState.errors.goal?.message;

  const ownershipIcons: Record<(typeof RELATIONSHIP_VALUES)[number], LucideIcon> = {
    own_profile: User,
    client_profile: Briefcase,
    brand_profile: Star,
    competitor_research: Binoculars,
  };
  const goalIcons: Record<(typeof GOAL_VALUES)[number], LucideIcon> = {
    improve_content: Lightbulb,
    benchmark_competitors: Users,
    grow_audience: TrendingUp,
    validate_brand: CheckCircle2,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
        <p className="text-[15px] font-medium text-content-primary">
          <Trans
            i18nKey="onboarding.steps.2.relationshipQuestion"
            ns="gate"
            values={{ handle }}
            components={{ 1: <span className="text-primary" /> }}
          />
        </p>
        <ChipGroup
          name="profile_ownership"
          options={RELATIONSHIP_VALUES.map((v) => ({
            value: v,
            label: t(`onboarding.compactOptions.profileOwnership.${v}`),
            icon: ownershipIcons[v],
          }))}
          value={ownership as ProfileOwnership | undefined}
          onChange={(v) =>
            form.setValue("profile_ownership", v as ProfileOwnership, {
              shouldValidate: true,
            })
          }
          error={ownershipError}
        />
        </div>

        <div className="space-y-2">
        <p className="text-[15px] font-medium text-content-primary">
          {t("onboarding.steps.2.goalQuestion")}
        </p>
        <ChipGroup
          name="goal"
          options={GOAL_VALUES.map((v) => ({
            value: v,
            label: t(`onboarding.compactOptions.goal.${v}`),
            icon: goalIcons[v],
          }))}
          value={goal as Goal | undefined}
          onChange={(v) =>
            form.setValue("goal", v as Goal, { shouldValidate: true })
          }
          error={goalError}
        />
        </div>
      </div>

      <p className="text-[13px] text-content-tertiary leading-[1.5]">
        {t("onboarding.steps.2.consequenceLine")}
      </p>
    </div>
  );
}

function Step3EmailGdpr({
  form,
}: {
  form: ReturnType<typeof useForm<UnlockFormValues>>;
}) {
  const { t } = useTranslation("gate");
  const error = form.formState.errors.email?.message;
  const phoneError = form.formState.errors.phone?.message;
  const consentError = form.formState.errors.gdpr_consent?.message;
  const consent = form.watch("gdpr_consent");
  const marketing = form.watch("marketing_consent");
  const emailValue = form.watch("email");
  const emailIsValid = !error && emailValue && /\S+@\S+\.\S+/.test(emailValue);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onb-email" className="text-[15px] font-medium text-content-primary">
          {t("onboarding.steps.3.emailLabel")}
        </Label>
        <div className="relative">
          <Input
            id="onb-email"
            type="email"
            autoFocus
            autoComplete="email"
            placeholder={t("onboarding.steps.3.emailPlaceholder")}
            aria-invalid={Boolean(error)}
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
        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="onb-phone" className="text-[15px] font-medium text-content-primary">
          {t("onboarding.steps.3.phoneLabel")}{" "}
          <span className="text-content-tertiary text-[13px] font-normal">
            — {t("onboarding.steps.3.phoneOptional")}
          </span>
        </Label>
        <Input
          id="onb-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t("onboarding.steps.3.phonePlaceholder")}
          aria-invalid={Boolean(phoneError)}
          className="text-base"
          {...form.register("phone")}
        />
        <p className="text-[13px] text-content-tertiary leading-[1.45]">
          {t("onboarding.steps.3.phoneHint")}
        </p>
        {phoneError ? (
          <p className="text-[13px] text-destructive">{phoneError}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border-default/40 bg-surface-muted/40 p-4 space-y-3">
        <label
          htmlFor="onb-gdpr"
          className="flex items-start gap-2.5 cursor-pointer"
        >
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
          <span className="text-[14px] text-content-secondary leading-[1.55] flex-1">
            <Trans
              i18nKey="onboarding.steps.3.consentText"
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
              {t("onboarding.steps.3.consentMandatory")}
            </span>
          </span>
        </label>

        <div className="border-t border-dashed border-border-default/50" />

        <label
          htmlFor="onb-marketing"
          className="flex items-start gap-2.5 cursor-pointer"
        >
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
          <span className="text-[14px] text-content-secondary leading-[1.55] flex-1">
            {t("onboarding.steps.3.marketingText")}{" "}
            <span className="text-content-tertiary">
              {t("onboarding.steps.3.marketingOptional")}
            </span>
          </span>
        </label>
      </div>

      {consentError ? (
        <p className="text-[13px] text-destructive">{consentError}</p>
      ) : null}
    </div>
  );
}