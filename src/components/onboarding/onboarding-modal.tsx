/**
 * OnboardingModal — Fase 3.
 *
 * Modal de entrada antes da geração da análise. Submete a
 * `/api/onboarding/start` (Fase 1), que cria/actualiza o lead, atribui 2
 * créditos iniciais idempotentes e assina o cookie `lead_session`.
 *
 * Reutiliza:
 *  - `unlockFormSchema` e enums de `@/lib/unlock-flow`
 *  - Componentes de passo já exportados de `@/components/product/unlock-modal`
 *    (Step1FullName, Step5EmailPhone, RadioCardField, ProgressSegments,
 *    useStepHeader, PROFILE_OWNERSHIP_ICONS)
 *  - Copy i18n existente em `gate.json` ("unlock.step1..5", "unlock.options.*")
 *
 * Adiciona Step 0 (intro) com expectation management e troca o submit final
 * pelo endpoint de onboarding. Em sucesso, dispara `onSuccess(handle)` para
 * o caller navegar para `/analyze/$username`.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useTranslation } from "react-i18next";
import { ArrowLeft, Check, Loader2, Lock, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GOALS,
  PROFILE_OWNERSHIPS,
  USER_TYPES,
  unlockFormSchema,
  type Goal,
  type ProfileOwnership,
  type UnlockFormValues,
  type UserType,
} from "@/lib/unlock-flow";
import { parseFullName } from "@/lib/names/parse-full-name";
import {
  PROFILE_OWNERSHIP_ICONS,
  ProgressSegments,
  RadioCardField,
  Step1FullName,
  Step5EmailPhone,
  useStepHeader,
} from "@/components/product/unlock-modal";

const TOTAL_STEPS = 5;

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
type FormStep = 1 | 2 | 3 | 4 | 5;
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
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    mode: "onChange",
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      profile_ownership: undefined as unknown as ProfileOwnership,
      goal: undefined as unknown as Goal,
      user_type: undefined as unknown as UserType,
      goal_other_text: "",
      user_type_other_text: "",
      gdpr_consent: false as unknown as true,
      marketing_consent: false,
    },
  });

  const handleClose = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
  };

  const goNext = async () => {
    setServerError(null);
    if (step === 0) {
      setStep(1);
      return;
    }
    let fields: (keyof UnlockFormValues)[] = [];
    if (step === 1) fields = ["full_name"];
    if (step === 2) fields = ["profile_ownership"];
    if (step === 3) {
      fields = ["goal"];
      if (form.getValues("goal") === "other") fields.push("goal_other_text");
    }
    if (step === 4) {
      fields = ["user_type"];
      if (form.getValues("user_type") === "other")
        fields.push("user_type_other_text");
    }
    if (step === 5) fields = ["email", "phone", "gdpr_consent"];
    const ok = await form.trigger(fields, { shouldFocus: true });
    if (!ok) return;

    if (step === 5) {
      await handleFinalSubmit();
      return;
    }
    if (step >= 1 && step <= 4) {
      setStep((step + 1) as FormStep);
    }
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
    if (step > 1 && step <= 5) {
      setStep((step - 1) as FormStep);
    }
  };

  const handleFinalSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const parsed = parseFullName(values.full_name);
      const res = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.full_name || values.full_name,
          email: values.email,
          phone: values.phone?.trim() ? values.phone.trim() : undefined,
          marketing_consent: values.marketing_consent === true,
          beta_consent: false,
          user_type: values.user_type,
          purpose: values.goal,
          profile_ownership: values.profile_ownership,
        }),
      });
      const data = (await res
        .json()
        .catch(() => null)) as OnboardingApiResponse | null;
      if (!res.ok || !data || data.ok !== true) {
        const msg =
          (data && "message" in data && data.message) ||
          t("onboarding.errors.generic");
        setServerError(msg);
        return;
      }
      onSuccess(handle, { leadId: data.lead_id, credits: data.credits });
    } catch {
      setServerError(t("onboarding.errors.network"));
    } finally {
      setSubmitting(false);
    }
  });

  // Progress bar segments: step 0 has zero filled segments; steps 1..5 fill
  // 1..5. Total is TOTAL_STEPS (5).
  const stepNumForBar = step === 0 ? 0 : (step as number);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto p-0 gap-0 border-border-default/60"
        data-testid="onboarding-modal"
      >
        {step === 0 ? (
          <IntroStepBody
            handle={handle}
            onContinue={() => setStep(1)}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <FormStepBody
            step={step as FormStep}
            stepNumForBar={stepNumForBar}
            form={form}
            serverError={serverError}
            submitting={submitting}
            goBack={goBack}
            goNext={goNext}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IntroStepBody({
  handle,
  onContinue,
  onClose,
}: {
  handle: string;
  onContinue: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("gate");
  const freeValue = t("onboarding.intro.freeValue", {
    returnObjects: true,
  }) as unknown;
  const items: string[] = Array.isArray(freeValue)
    ? (freeValue as string[])
    : [];
  void onClose;

  return (
    <div
      className="px-7 py-8 sm:px-9 sm:py-9"
      data-testid="onboarding-intro-step"
    >
      <DialogHeader className="text-left space-y-3">
        <p className="text-eyebrow-sm text-content-tertiary">
          {t("onboarding.intro.eyebrow")}
        </p>
        <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
          {t("onboarding.intro.title")}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
          {t("onboarding.intro.subtitle")}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 space-y-4">
        {/* Handle + credit context */}
        <div
          className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3.5 space-y-1.5"
          data-testid="onboarding-handle-context"
        >
          <p className="text-[13px] font-medium text-content-primary">
            <Trans
              i18nKey="onboarding.intro.handleContext"
              ns="gate"
              values={{ handle }}
              components={{ 1: <span className="text-primary" /> }}
            >
              {`Vais analisar @${handle}`}
            </Trans>
          </p>
          <p className="text-[12.5px] text-content-secondary leading-relaxed">
            {t("onboarding.intro.creditNote")}
          </p>
        </div>

        {/* Free value list */}
        <div className="rounded-xl border border-border-default/60 bg-surface-muted/30 p-4 space-y-3">
          <p className="text-eyebrow-sm text-content-tertiary flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            {t("onboarding.intro.freeValueTitle")}
          </p>
          <ul className="space-y-2">
            {items.map((label, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-[13px] text-content-primary"
              >
                <Check
                  className="size-4 text-emerald-600 shrink-0 mt-0.5"
                  aria-hidden
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-dashed border-border-default/50 pt-3">
            <p className="text-[12px] text-content-tertiary leading-relaxed flex items-start gap-1.5">
              <Lock className="size-3 mt-0.5 shrink-0" aria-hidden />
              <span>{t("onboarding.intro.premiumNote")}</span>
            </p>
          </div>
        </div>

        {/* Personal-profile caveat */}
        <p className="text-[12px] text-content-tertiary leading-relaxed">
          {t("onboarding.intro.personalHint")}
        </p>

        {/* CTA */}
        <Button
          type="button"
          size="lg"
          className="w-full rounded-lg font-medium"
          onClick={onContinue}
          data-testid="onboarding-intro-cta"
        >
          {t("onboarding.intro.cta")}
        </Button>
        <p className="text-center text-[11px] text-content-tertiary">
          {t("onboarding.intro.trustLine")}
        </p>
      </div>
    </div>
  );
}

function FormStepBody({
  step,
  stepNumForBar,
  form,
  serverError,
  submitting,
  goBack,
  goNext,
}: {
  step: FormStep;
  stepNumForBar: number;
  form: ReturnType<typeof useForm<UnlockFormValues>>;
  serverError: string | null;
  submitting: boolean;
  goBack: () => void;
  goNext: () => Promise<void> | void;
}) {
  const { t } = useTranslation("gate");
  const header = useStepHeader(step);

  const profileOwnershipLabels = (v: ProfileOwnership) =>
    t(`unlock.options.profileOwnership.${v}`);
  const goalLabels = (v: Goal) => t(`unlock.options.goal.${v}`);
  const userTypeLabels = (v: UserType) => t(`unlock.options.userType.${v}`);

  return (
    <div className="px-7 py-8 sm:px-9 sm:py-9">
      <DialogHeader className="text-left space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-eyebrow-sm text-content-tertiary">
            {header.eyebrow}
          </p>
          {header.badge ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-[1px] text-[10px] font-semibold tracking-wide">
              {header.badge}
            </span>
          ) : null}
        </div>
        <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
          {header.title}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
          {header.subtitle}
        </DialogDescription>
        <ProgressSegments current={stepNumForBar} total={TOTAL_STEPS} />
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void goNext();
        }}
        className="space-y-6 mt-6"
      >
        {step === 1 ? <Step1FullName form={form} /> : null}
        {step === 2 ? (
          <RadioCardField
            legend=""
            name="profile_ownership"
            options={PROFILE_OWNERSHIPS.map((v) => ({
              value: v,
              label: profileOwnershipLabels(v),
              icon: PROFILE_OWNERSHIP_ICONS[v],
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
            legend=""
            name="goal"
            options={GOALS.map((v) => ({ value: v, label: goalLabels(v) }))}
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
            otherPlaceholder={t("unlock.step3.otherPlaceholder")}
            otherEyebrow={t("unlock.step3.otherEyebrow")}
            otherHint={t("unlock.step3.otherHint")}
          />
        ) : null}
        {step === 4 ? (
          <RadioCardField
            legend=""
            name="user_type"
            twoColumns
            fullWidthValues={["other"]}
            options={USER_TYPES.map((v) => ({
              value: v,
              label: userTypeLabels(v),
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
            otherPlaceholder={t("unlock.step4.otherPlaceholder")}
            otherEyebrow={t("unlock.step4.otherEyebrow")}
          />
        ) : null}
        {step === 5 ? <Step5EmailPhone form={form} /> : null}

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex gap-3 pt-1 border-t border-border-default/40 -mx-7 sm:-mx-9 px-7 sm:px-9 pt-5 mt-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={submitting}
            className="flex-shrink-0 rounded-lg"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("unlock.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="flex-1 rounded-lg font-medium"
            disabled={submitting}
            data-testid={
              step === 5 ? "onboarding-submit" : "onboarding-continue"
            }
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("onboarding.submitting")}
              </>
            ) : step === 5 ? (
              <>
                <Lock className="size-4" aria-hidden />
                {t("unlock.openSummary")}
              </>
            ) : (
              t("unlock.continue")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}