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

const TOTAL_STEPS = 4;

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

type Step = 1 | 2 | 3 | 4 | "success";

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

  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      profile_ownership: undefined as unknown as ProfileOwnership,
      goal: undefined as unknown as Goal,
      user_type: undefined as unknown as UserType,
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
    if (step === 1) fields = ["email"];
    if (step === 2) fields = ["profile_ownership"];
    if (step === 3) fields = ["goal"];
    const ok = await form.trigger(fields, { shouldFocus: true });
    if (!ok) return;

    // After step 1 (email), check if this is a returning lead with full
    // qualification → skip steps 2-4 entirely. Conservative fallback:
    // any error or timeout keeps the standard 4-step flow.
    if (step === 1) {
      const email = form.getValues("email");
      setLookupPending(true);
      let canSkip = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch("/api/public/lookup-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            exists?: boolean;
            has_qualification?: boolean;
          };
          canSkip = Boolean(data.exists && data.has_qualification);
        }
      } catch {
        canSkip = false;
      } finally {
        setLookupPending(false);
      }

      if (canSkip) {
        await submitMinimal(email);
        return;
      }
    }

    setStep(((step as number) + 1) as Step);
  };

  const goBack = () => {
    setServerError(null);
    if (typeof step === "number" && step > 1) setStep((step - 1) as Step);
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
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        lead_id?: string;
        report_request_id?: string;
        returning_lead?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success || !data.lead_id || !data.report_request_id) {
        setServerError(
          "Não foi possível desbloquear agora. Tenta novamente em instantes.",
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

  const stepNum = step === "success" ? TOTAL_STEPS : step;
  const progressPct = ((stepNum as number) / TOTAL_STEPS) * 100;

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
                className="h-[2px] w-full rounded-full bg-primary/15 overflow-hidden mt-1"
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
  return (
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
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
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
}: {
  legend: string;
  name: string;
  options: RadioOption[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
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
            <label
              key={opt.value}
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
          text="Acede sempre que quiseres em /me"
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
