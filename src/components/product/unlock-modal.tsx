import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

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
  PRICING_PREFERENCE_LABELS,
  PRICING_PREFERENCES,
  PROFILE_OWNERSHIP_LABELS,
  PROFILE_OWNERSHIPS,
  USER_TYPE_LABELS,
  USER_TYPES,
  unlockFormSchema,
  type Goal,
  type PricingPreference,
  type ProfileOwnership,
  type UnlockFormValues,
  type UserType,
} from "@/lib/unlock-flow";

const TOTAL_STEPS = 5;

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

type Step = 1 | 2 | 3 | 4 | 5 | "success";

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

  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      profile_ownership: undefined as unknown as ProfileOwnership,
      goal: undefined as unknown as Goal,
      user_type: undefined as unknown as UserType,
      pricing_preference: undefined as unknown as PricingPreference,
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
    if (step === 4) fields = ["user_type"];
    const ok = await form.trigger(fields, { shouldFocus: true });
    if (!ok) return;
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
          pricing_preference: values.pricing_preference,
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

  const stepNum = step === "success" ? TOTAL_STEPS : step;
  const progressPct = ((stepNum as number) / TOTAL_STEPS) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
        {step === "success" ? (
          <SuccessState
            returningLead={Boolean(result?.returningLead)}
            email={form.getValues("email")}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader className="text-left space-y-2">
              <p className="text-eyebrow-sm text-primary">
                Passo {step} de {TOTAL_STEPS}
              </p>
              <DialogTitle className="font-fraunces text-2xl leading-tight">
                Desbloquear relatório gratuito
              </DialogTitle>
              <DialogDescription className="text-sm text-content-secondary">
                Acesso gratuito durante a beta · Demora cerca de 1 minuto
              </DialogDescription>
              <div
                className="h-1 w-full rounded-full bg-surface-muted overflow-hidden"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={TOTAL_STEPS}
                aria-valuenow={step}
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 5) void handleFinalSubmit();
                else void goNext();
              }}
              className="space-y-5 mt-2"
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
              {step === 5 ? (
                <RadioCardField
                  legend="Quanto pagarias por um relatório mensal?"
                  name="pricing_preference"
                  options={PRICING_PREFERENCES.map((v) => ({
                    value: v,
                    label: PRICING_PREFERENCE_LABELS[v],
                  }))}
                  value={form.watch("pricing_preference")}
                  onChange={(v) =>
                    form.setValue(
                      "pricing_preference",
                      v as PricingPreference,
                      { shouldValidate: true },
                    )
                  }
                  error={form.formState.errors.pricing_preference?.message}
                />
              ) : null}

              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex gap-2 pt-1">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={goBack}
                    disabled={submitting}
                    className="flex-shrink-0"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    Voltar
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      A desbloquear…
                    </>
                  ) : step === 5 ? (
                    "Desbloquear relatório"
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </div>

              {step === 1 ? (
                <div className="flex items-start gap-2 rounded-lg bg-surface-muted/60 p-3">
                  <ShieldCheck
                    className="size-4 shrink-0 mt-0.5 text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-content-tertiary leading-relaxed">
                    Sem spam. Usamos o email para guardar este report e enviar o
                    acesso.
                  </p>
                </div>
              ) : null}
            </form>
          </>
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
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-content-primary mb-1">
        {legend}
      </legend>
      <div className="grid gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-3 min-h-12 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                "hover:bg-surface-muted/60",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border-default",
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="size-4 accent-primary"
              />
              <span className="text-sm text-content-primary">{opt.label}</span>
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
  onClose,
}: {
  returningLead: boolean;
  onClose: () => void;
}) {
  return (
    <div className="text-center space-y-4 py-2">
      <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="size-6 text-primary" aria-hidden />
      </div>
      <DialogHeader className="space-y-2">
        <DialogTitle className="font-fraunces text-2xl text-center">
          {returningLead ? "Bem-vindo de volta" : "Relatório desbloqueado"}
        </DialogTitle>
        <DialogDescription className="text-sm text-content-secondary text-center">
          {returningLead
            ? "Este report foi guardado na tua área."
            : "Também guardámos este report na tua área pessoal."}
        </DialogDescription>
      </DialogHeader>
      <Button size="lg" className="w-full" onClick={onClose}>
        Ver relatório
      </Button>
    </div>
  );
}
