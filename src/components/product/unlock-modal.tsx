import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookmarkPlus, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  GOAL_LABELS,
  GOALS,
  PROFILE_OWNERSHIP_LABELS,
  PROFILE_OWNERSHIPS,
  USER_TYPE_LABELS,
  USER_TYPES,
  unlockFormSchema,
  type Goal,
  type ProfileOwnership,
  type UnlockFormValues,
  type UserType,
} from "@/lib/unlock-flow";
import { trackEvent } from "@/lib/tracking.functions";

const TOTAL_STEPS = 4;

const FIELD_LABELS_PT: Record<string, string> = {
  email: "Email",
  gdpr_consent: "Consentimento",
  profile_ownership: "Tipo de perfil",
  goal: "Objetivo",
  user_type: "Como te descreves",
  goal_other_text: "Detalhe do objetivo",
  user_type_other_text: "Detalhe de como te descreves",
  analysis_snapshot_id: "Relatório",
  instagram_username: "Perfil Instagram",
};

function extractServerError(data: {
  error?: string;
  issues?: { fieldErrors?: Record<string, string[]> };
}): string {
  const fe = data.issues?.fieldErrors ?? {};
  const firstField = Object.keys(fe)[0];
  if (firstField) {
    const msg = fe[firstField]?.[0];
    const label = FIELD_LABELS_PT[firstField] ?? firstField;
    return msg ? `${label}: ${msg}` : `Campo inválido: ${label}`;
  }
  if (data.error === "SNAPSHOT_NOT_FOUND") {
    return "Este relatório expirou. Volta a abrir a página e tenta de novo.";
  }
  return "Não foi possível desbloquear agora. Tenta novamente em instantes.";
}

type QField = "profile_ownership" | "goal" | "user_type";
const STEP_FIELD: Record<2 | 3 | 4, QField> = {
  2: "profile_ownership",
  3: "goal",
  4: "user_type",
};

export interface UnlockResult {
  leadId: string;
  reportRequestId: string;
  returningLead: boolean;
}

export interface UnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  instagramUsername: string;
  /** Called after a successful backend unlock, before the success state closes. */
  onUnlock: (result: UnlockResult) => void;
}

type Step = 1 | 2 | 3 | 4 | "welcome-back" | "success";

export function UnlockModal({
  open,
  onOpenChange,
  snapshotId,
  instagramUsername,
  onUnlock,
}: UnlockModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<UnlockResult | null>(null);
  const [lookupPending, setLookupPending] = useState(false);
  const [knownFields, setKnownFields] = useState<Set<QField>>(new Set());
  const [returningFirstName, setReturningFirstName] = useState<string | null>(null);
  const [partialBanner, setPartialBanner] = useState<string | null>(null);

  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      profile_ownership: undefined as unknown as ProfileOwnership,
      goal: undefined as unknown as Goal,
      user_type: undefined as unknown as UserType,
      goal_other_text: "",
      user_type_other_text: "",
      gdpr_consent: false as unknown as true,
    },
  });

  // Reset when reopening from a fresh state
  useEffect(() => {
    if (!open && step !== "success") {
      // do not wipe values; user may reopen mid-flow
    }
  }, [open, step]);

  const handleClose = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
  };

  const goNext = async () => {
    setServerError(null);
    let fields: (keyof UnlockFormValues)[] = [];
    if (step === 1) fields = ["email", "gdpr_consent"];
    if (step === 2) fields = ["profile_ownership"];
    if (step === 3) {
      fields = ["goal"];
      if (form.getValues("goal") === "other") fields.push("goal_other_text");
    }
    const ok = await form.trigger(fields, { shouldFocus: true });
    if (!ok) return;

    // After step 1 (email), call unlock-check to discover which qualification
    // fields are already on file. Skip those steps; show welcome state if
    // nothing is missing. Any error / timeout falls back to the full flow.
    if (step === 1) {
      const email = form.getValues("email");
      setLookupPending(true);
      let exists = false;
      let missing: QField[] = ["profile_ownership", "goal", "user_type"];
      let firstName: string | null = null;
      const knownSet = new Set<QField>();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch("/api/public/unlock-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            exists?: boolean;
            knownFields?: QField[];
            missingFields?: QField[];
            display?: { firstName?: string | null };
          };
          exists = Boolean(data.exists);
          if (Array.isArray(data.knownFields)) {
            for (const f of data.knownFields) knownSet.add(f);
          }
          if (Array.isArray(data.missingFields) && data.missingFields.length) {
            missing = data.missingFields;
          } else if (exists) {
            missing = (["profile_ownership", "goal", "user_type"] as QField[])
              .filter((f) => !knownSet.has(f));
          }
          firstName = data.display?.firstName ?? null;
        }
      } catch {
        // fallback: full flow
      } finally {
        setLookupPending(false);
      }

      setKnownFields(knownSet);
      setReturningFirstName(firstName);

      if (exists) {
        void trackEvent({
          data: {
            eventType: "unlock_check_returning_lead",
            handle: instagramUsername,
            snapshotId,
            metadata: { knownCount: knownSet.size },
          },
        }).catch(() => {});
        if (knownSet.size > 0) {
          void trackEvent({
            data: {
              eventType: "unlock_check_skipped_steps",
              handle: instagramUsername,
              snapshotId,
              metadata: { skipped: Array.from(knownSet) },
            },
          }).catch(() => {});
        }
      }

      // All qualification known → welcome state, then minimal submit.
      if (exists && missing.length === 0) {
        setPartialBanner(null);
        setStep("welcome-back");
        return;
      }

      // Partial: jump to first missing step + show neutral banner (no name).
      if (exists && missing.length > 0 && missing.length < 3) {
        setPartialBanner(
          `Já temos parte dos teus dados. Faltam só ${missing.length} ${
            missing.length === 1 ? "passo rápido" : "passos rápidos"
          }.`,
        );
        const firstMissing = missing[0];
        const targetStep = (Object.keys(STEP_FIELD) as Array<"2" | "3" | "4">)
          .find((k) => STEP_FIELD[Number(k) as 2 | 3 | 4] === firstMissing);
        setStep((Number(targetStep ?? "2") as Step));
        return;
      }

      setPartialBanner(null);
    }

    // Advance to next step, skipping any field already known.
    if (typeof step === "number") {
      let next = step + 1;
      while (next <= 4 && knownFields.has(STEP_FIELD[next as 2 | 3 | 4])) {
        next += 1;
      }
      if (next > 4) {
        await handleFinalSubmit();
        return;
      }
      setStep(next as Step);
    }
  };

  const goBack = () => {
    setServerError(null);
    if (step === "welcome-back") {
      setStep(1);
      return;
    }
    if (typeof step === "number" && step > 1) {
      let prev = step - 1;
      while (prev >= 2 && knownFields.has(STEP_FIELD[prev as 2 | 3 | 4])) {
        prev -= 1;
      }
      setStep((prev < 1 ? 1 : prev) as Step);
    }
  };

  const handleFinalSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/public/report-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          instagram_username: instagramUsername,
          analysis_snapshot_id: snapshotId,
          profile_ownership: values.profile_ownership,
          goal: values.goal,
          user_type: values.user_type,
          goal_other_text:
            values.goal === "other" ? values.goal_other_text : undefined,
          user_type_other_text:
            values.user_type === "other"
              ? values.user_type_other_text
              : undefined,
          gdpr_consent: values.gdpr_consent === true ? true : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        lead_id?: string;
        report_request_id?: string;
        returning_lead?: boolean;
        error?: string;
        issues?: { fieldErrors?: Record<string, string[]> };
      };
      if (!res.ok || !data.success || !data.lead_id || !data.report_request_id) {
        setServerError(extractServerError(data));
        return;
      }
      const r: UnlockResult = {
        leadId: data.lead_id,
        reportRequestId: data.report_request_id,
        returningLead: Boolean(data.returning_lead),
      };
      setResult(r);
      onUnlock(r);
      setStep("success");
    } catch {
      setServerError(
        "Erro de ligação. Verifica a tua internet e tenta novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  /**
   * Minimal-payload submit for returning leads with full qualification.
   * Sends only email + snapshot + handle. The server merges conservatively
   * (never regresses qualification fields).
   */
  const submitMinimal = async (email: string) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/public/report-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          instagram_username: instagramUsername,
          analysis_snapshot_id: snapshotId,
          gdpr_consent: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        lead_id?: string;
        report_request_id?: string;
        returning_lead?: boolean;
      };
      if (!res.ok || !data.success || !data.lead_id || !data.report_request_id) {
        // Fallback: drop the skip and let the user complete the 3 questions.
        setStep(2);
        setServerError(
          "Precisamos de mais 3 detalhes rápidos para desbloquear.",
        );
        return;
      }
      const r: UnlockResult = {
        leadId: data.lead_id,
        reportRequestId: data.report_request_id,
        returningLead: Boolean(data.returning_lead),
      };
      setResult(r);
      onUnlock(r);
      setStep("success");
    } catch {
      setStep(2);
      setServerError(
        "Erro de ligação. Verifica a tua internet e tenta novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stepNum =
    step === "success" || step === "welcome-back"
      ? TOTAL_STEPS
      : (step as number);
  const progressPct = (stepNum / TOTAL_STEPS) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[92vh] overflow-y-auto p-0 gap-0 border-border-default/60">
        {step === "success" ? (
          <div className="px-6 py-7 sm:px-7 sm:py-8">
            <SuccessState
              returningLead={Boolean(result?.returningLead)}
              email={form.getValues("email")}
              onClose={() => onOpenChange(false)}
            />
          </div>
        ) : step === "welcome-back" ? (
          <div className="px-6 py-7 sm:px-7 sm:py-8">
            <WelcomeBackState
              firstName={returningFirstName}
              submitting={submitting}
              serverError={serverError}
              onContinue={() => submitMinimal(form.getValues("email"))}
              onBack={goBack}
            />
          </div>
        ) : (
          <div className="px-6 py-7 sm:px-7 sm:py-8">
            <DialogHeader className="text-left space-y-3">
              <p className="text-eyebrow-sm text-content-tertiary">
                Passo {step} de {TOTAL_STEPS}
              </p>
              <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
                Desbloquear relatório gratuito
              </DialogTitle>
              <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
                Acesso gratuito durante a beta · demora cerca de 1 minuto
              </DialogDescription>
              <div
                className="h-1.5 w-full rounded-full bg-primary/10 overflow-hidden mt-1"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={TOTAL_STEPS}
                aria-valuenow={step}
              >
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 4) void handleFinalSubmit();
                else void goNext();
              }}
              className="space-y-6 mt-6"
            >
              {partialBanner && step !== 1 ? (
                <p className="text-[12px] text-content-tertiary border border-border-default/60 rounded-lg px-3 py-2 bg-surface-muted/40">
                  {partialBanner}
                </p>
              ) : null}
              {step === 1 ? <Step1Email form={form} /> : null}
              {step === 2 ? (
                <RadioCardField
                  legend="Este perfil é teu?"
                  name="profile_ownership"
                  options={PROFILE_OWNERSHIPS.map((v) => ({
                    value: v,
                    label: PROFILE_OWNERSHIP_LABELS[v],
                  }))}
                  value={form.watch("profile_ownership")}
                  onChange={(v) =>
                    form.setValue("profile_ownership", v as ProfileOwnership, {
                      shouldValidate: true,
                    })
                  }
                  error={form.formState.errors.profile_ownership?.message}
                />
              ) : null}
              {step === 3 ? (
                <RadioCardField
                  legend="Qual é o teu objetivo principal?"
                  name="goal"
                  options={GOALS.map((v) => ({ value: v, label: GOAL_LABELS[v] }))}
                  value={form.watch("goal")}
                  onChange={(v) =>
                    form.setValue("goal", v as Goal, { shouldValidate: true })
                  }
                  error={form.formState.errors.goal?.message}
                  otherValue="other"
                  otherText={form.watch("goal_other_text") ?? ""}
                  onOtherTextChange={(v) =>
                    form.setValue("goal_other_text", v, { shouldValidate: true })
                  }
                  otherError={form.formState.errors.goal_other_text?.message}
                />
              ) : null}
              {step === 4 ? (
                <RadioCardField
                  legend="Como te descreves?"
                  name="user_type"
                  options={USER_TYPES.map((v) => ({
                    value: v,
                    label: USER_TYPE_LABELS[v],
                  }))}
                  value={form.watch("user_type")}
                  onChange={(v) =>
                    form.setValue("user_type", v as UserType, {
                      shouldValidate: true,
                    })
                  }
                  error={form.formState.errors.user_type?.message}
                  otherValue="other"
                  otherText={form.watch("user_type_other_text") ?? ""}
                  onOtherTextChange={(v) =>
                    form.setValue("user_type_other_text", v, {
                      shouldValidate: true,
                    })
                  }
                  otherError={form.formState.errors.user_type_other_text?.message}
                />
              ) : null}

              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex gap-3 pt-1 border-t border-border-default/40 -mx-6 sm:-mx-7 px-6 sm:px-7 pt-5 mt-2">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={goBack}
                    disabled={submitting}
                    className="flex-shrink-0 rounded-lg"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    Voltar
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 rounded-lg font-medium"
                  disabled={submitting || lookupPending}
                >
                  {submitting || lookupPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {lookupPending ? "A verificar…" : "A desbloquear…"}
                    </>
                  ) : step === 4 ? (
                    "Desbloquear relatório"
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </div>

              {step === 1 ? (
                <p className="flex items-center justify-center gap-1.5 text-[12px] text-content-tertiary">
                  <Lock className="size-3" aria-hidden="true" />
                  Sem spam. Email usado só para guardar e enviar este report.
                </p>
              ) : null}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Step1Email({
  form,
}: {
  form: ReturnType<typeof useForm<UnlockFormValues>>;
}) {
  const error = form.formState.errors.email?.message;
  const consentError = form.formState.errors.gdpr_consent?.message;
  const consent = form.watch("gdpr_consent");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="unlock-email" className="text-sm">
          Email
        </Label>
        <Input
          id="unlock-email"
          type="email"
          autoFocus
          autoComplete="email"
          placeholder="ana@empresa.pt"
          aria-invalid={Boolean(error)}
          {...form.register("email")}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="unlock-gdpr"
          className="flex items-start gap-2.5 cursor-pointer"
        >
          <Checkbox
            id="unlock-gdpr"
            checked={consent === true}
            onCheckedChange={(v) =>
              form.setValue("gdpr_consent", v === true ? true : (false as unknown as true), {
                shouldValidate: true,
              })
            }
            aria-invalid={Boolean(consentError)}
            className="mt-0.5"
          />
          <span className="text-[12px] text-content-secondary leading-relaxed">
            Aceito que o meu email seja guardado para criar este relatório e
            receber atualizações ocasionais. Posso cancelar a qualquer momento.{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener"
              className="underline hover:text-content-primary"
            >
              Política de privacidade
            </a>
            .
          </span>
        </label>
        {consentError ? (
          <p className="text-xs text-destructive">{consentError}</p>
        ) : null}
      </div>
    </div>
  );
}

interface RadioOption {
  value: string;
  label: string;
}

function RadioCardField({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  otherValue,
  otherText,
  onOtherTextChange,
  otherError,
}: {
  legend: string;
  name: string;
  options: RadioOption[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
  otherValue?: string;
  otherText?: string;
  onOtherTextChange?: (v: string) => void;
  otherError?: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[14px] font-medium text-content-primary mb-1">
        {legend}
      </legend>
      <div className="grid gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <div key={opt.value}>
            <label
              className={cn(
                "group flex items-center gap-3 min-h-12 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150",
                selected
                  ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1px_rgb(var(--accent-primary)/0.20)]"
                  : "border-border-default/60 hover:border-border-default hover:bg-surface-muted/40",
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected
                    ? "border-primary"
                    : "border-border-default group-hover:border-border-strong",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full bg-primary transition-transform duration-150",
                    selected ? "scale-100" : "scale-0",
                  )}
                />
              </span>
              <span className="text-[14px] text-content-primary leading-snug">
                {opt.label}
              </span>
            </label>
              {selected && otherValue && opt.value === otherValue && onOtherTextChange ? (
                <div className="mt-2 ml-7 space-y-1">
                  <Input
                    autoFocus
                    maxLength={120}
                    placeholder="Conta-nos brevemente…"
                    value={otherText ?? ""}
                    onChange={(e) => onOtherTextChange(e.target.value)}
                    aria-invalid={Boolean(otherError)}
                  />
                  <div className="flex items-center justify-between">
                    {otherError ? (
                      <p className="text-xs text-destructive">{otherError}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-[11px] text-content-tertiary">
                      {(otherText ?? "").length}/120
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}

function SuccessState({
  returningLead,
  email,
  onClose,
}: {
  returningLead: boolean;
  email: string;
  onClose: () => void;
}) {
  const signupHref = `/signup?email=${encodeURIComponent(email)}`;
  return (
    <div className="space-y-6">
      <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="size-6 text-primary" aria-hidden />
      </div>
      <DialogHeader className="text-left space-y-2">
        <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
          {returningLead ? "Bem-vindo de volta" : "Relatório desbloqueado"}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
          {returningLead
            ? "Este report já estava guardado na tua área pessoal."
            : "Também guardámos este report na tua área pessoal para acesso futuro."}
        </DialogDescription>
      </DialogHeader>

      <ul className="space-y-3">
        <NextStepRow
          icon={<BookmarkPlus className="size-4" aria-hidden="true" />}
          text="Acede sempre que quiseres em /app/reports"
        />
        <NextStepRow
          icon={<Mail className="size-4" aria-hidden="true" />}
          text={`Enviámos uma confirmação para ${email}`}
        />
      </ul>

      <div className="space-y-3 pt-2 border-t border-border-default/40">
        <Button size="lg" className="w-full rounded-lg font-medium mt-4" onClick={onClose}>
          Ver relatório completo
        </Button>
        <a
          href={signupHref}
          className="block text-center text-[13px] font-medium text-primary hover:underline"
        >
          Criar conta com este email para aceder mais tarde
        </a>
        <p className="text-[12px] text-content-tertiary text-center">
          Já tens conta?{" "}
          <a href="/login" className="underline hover:text-content-secondary">
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}

function NextStepRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-lg bg-surface-muted text-primary">
        {icon}
      </span>
      <span className="text-[13px] text-content-secondary leading-relaxed">
        {text}
      </span>
    </li>
  );
}

function WelcomeBackState({
  firstName,
  submitting,
  serverError,
  onContinue,
  onBack,
}: {
  firstName: string | null;
  submitting: boolean;
  serverError: string | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="size-6 text-primary" aria-hidden />
      </div>
      <DialogHeader className="text-left space-y-2">
        <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
          Bem-vindo de volta{firstName ? `, ${firstName}` : ""}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
          Vamos guardar este report na tua área pessoal.
        </DialogDescription>
      </DialogHeader>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex gap-3 pt-1 border-t border-border-default/40 -mx-6 sm:-mx-7 px-6 sm:px-7 pt-5 mt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={submitting}
          className="flex-shrink-0 rounded-lg"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar
        </Button>
        <Button
          type="button"
          size="lg"
          className="flex-1 rounded-lg font-medium"
          onClick={onContinue}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              A desbloquear…
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      </div>
    </div>
  );
}
