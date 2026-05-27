import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Briefcase,
  Check,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Lock,
  Search,
  Sparkles,
  Trophy,
  Users,
  Star,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
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

const TOTAL_STEPS = 5;

const UNLOCKED_ITEM_KEYS = ["overview", "diagnosis", "performance"] as const;

type IconCmp = typeof User;

const PROFILE_OWNERSHIP_ICONS: Record<
  ProfileOwnership,
  { Icon: IconCmp; bg: string; fg: string }
> = {
  own_profile: { Icon: User, bg: "bg-blue-100", fg: "text-blue-600" },
  brand_profile: { Icon: Star, bg: "bg-purple-100", fg: "text-purple-600" },
  client_profile: {
    Icon: Briefcase,
    bg: "bg-emerald-100",
    fg: "text-emerald-600",
  },
  competitor_research: {
    Icon: Search,
    bg: "bg-amber-100",
    fg: "text-amber-700",
  },
  curiosity: { Icon: HelpCircle, bg: "bg-pink-100", fg: "text-pink-600" },
};

function extractServerError(
  data: {
    error?: string;
    issues?: { fieldErrors?: Record<string, string[]> };
  },
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const fe = data.issues?.fieldErrors ?? {};
  const firstField = Object.keys(fe)[0];
  if (firstField) {
    const msg = fe[firstField]?.[0];
    const label = t(`unlock.fieldLabels.${firstField}`, {
      defaultValue: firstField,
    });
    return msg
      ? t("unlock.errors.fieldWithMessage", { label, message: msg })
      : t("unlock.errors.fieldGeneric", { label });
  }
  if (data.error === "SNAPSHOT_NOT_FOUND") {
    return t("unlock.errors.snapshotExpired");
  }
  return t("unlock.errors.generic");
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

type Step = 1 | 2 | 3 | 4 | 5 | 6;

function useStepHeader(step: 1 | 2 | 3 | 4 | 5) {
  const { t } = useTranslation("gate");
  const eyebrow = t(`unlock.step${step}.eyebrow`);
  const subtitle = t(`unlock.step${step}.subtitle`);
  const badge =
    step === 1
      ? t("unlock.stepBadgeMinute")
      : step === 5
        ? t("unlock.stepBadgeLast")
        : undefined;
  const title =
    step === 1 ? (
      <>
        {t("unlock.step1.titlePrefix")}{" "}
        <em className="not-italic font-display italic text-primary">
          {t("unlock.step1.titleEm")}
        </em>
        {t("unlock.step1.titleSuffix")}
      </>
    ) : (
      <>{t(`unlock.step${step}.title`)}</>
    );
  return { eyebrow, badge, subtitle, title };
}

export function UnlockModal({
  open,
  onOpenChange,
  snapshotId,
  instagramUsername,
  onUnlock,
}: UnlockModalProps) {
  const { t } = useTranslation("gate");
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<UnlockResult | null>(null);
  const lookupPending = false;

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

  // (Pricing-seen tracking removed — pricing no longer lives in this modal.)

  const handleClose = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
  };

  const goNext = async () => {
    setServerError(null);
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
      setStep((step + 1) as Step);
    }
  };

  const goBack = () => {
    setServerError(null);
    if (step === 1) {
      onOpenChange(false);
      return;
    }
    if (typeof step === "number" && step > 1 && step < 6) {
      setStep((step - 1) as Step);
    }
  };

  const handleFinalSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const parsed = parseFullName(values.full_name);
      const res = await fetch("/api/public/report-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          full_name: parsed.full_name || undefined,
          first_name: parsed.first_name || undefined,
          last_name: parsed.last_name ?? undefined,
          name: parsed.full_name || undefined,
          phone: values.phone?.trim() ? values.phone.trim() : undefined,
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
          marketing_consent: values.marketing_consent === true ? true : undefined,
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
        setServerError(extractServerError(data, t));
        return;
      }
      const r: UnlockResult = {
        leadId: data.lead_id,
        reportRequestId: data.report_request_id,
        returningLead: Boolean(data.returning_lead),
      };
      setResult(r);
      onUnlock(r);
      setStep(6);
    } catch {
      setServerError(t("unlock.errors.network"));
    } finally {
      setSubmitting(false);
    }
  });

  const stepNumForBar = step as number;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto p-0 gap-0 border-border-default/60">
        {step === 6 ? (
          <SuccessStep
            email={form.getValues("email")}
            returningLead={Boolean(result?.returningLead)}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <StepShellAndForm
            step={step as 1 | 2 | 3 | 4 | 5}
            instagramUsername={instagramUsername}
            stepNumForBar={stepNumForBar}
            form={form}
            serverError={serverError}
            submitting={submitting}
            lookupPending={lookupPending}
            goBack={goBack}
            goNext={goNext}
            handleFinalSubmit={handleFinalSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepShellAndForm({
  step,
  instagramUsername,
  stepNumForBar,
  form,
  serverError,
  submitting,
  lookupPending,
  goBack,
  goNext,
  handleFinalSubmit,
}: {
  step: 1 | 2 | 3 | 4 | 5;
  instagramUsername: string;
  stepNumForBar: number;
  form: ReturnType<typeof useForm<UnlockFormValues>>;
  serverError: string | null;
  submitting: boolean;
  lookupPending: boolean;
  goBack: () => void;
  goNext: () => Promise<void> | void;
  handleFinalSubmit: () => Promise<void> | void;
}) {
  const { t } = useTranslation("gate");
  const header = useStepHeader(step);
  void instagramUsername;

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
                if (step === 5) void handleFinalSubmit();
                else void goNext();
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
                  options={GOALS.map((v) => ({
                    value: v,
                    label: goalLabels(v),
                  }))}
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
                    {t("unlock.back")}
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
                      {lookupPending ? t("unlock.verifying") : t("unlock.unlocking")}
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

              {step === 1 || step === 5 ? (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-content-tertiary">
                  <Lock className="size-3" aria-hidden="true" />
                  <Trans
                    i18nKey="unlock.operatorLine"
                    ns="gate"
                    values={{
                      name: t("unlock.operator.name"),
                      city: t("unlock.operator.city"),
                    }}
                    components={{
                      strong: (
                        <strong className="font-semibold text-content-secondary" />
                      ),
                    }}
                  />
                </p>
              ) : null}
            </form>
    </div>
  );
}

function ProgressSegments({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      className="flex gap-1.5 mt-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i < current;
        return (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              isActive
                ? "bg-gradient-to-r from-primary to-secondary"
                : "bg-primary/10",
            )}
          />
        );
      })}
    </div>
  );
}

function Step1FullName({
  form,
}: {
  form: ReturnType<typeof useForm<UnlockFormValues>>;
}) {
  const { t } = useTranslation("gate");
  const error = form.formState.errors.full_name?.message;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="unlock-full-name" className="text-sm">
          {t("unlock.step1.fullNameLabel")}
        </Label>
        <Input
          id="unlock-full-name"
          type="text"
          autoFocus
          autoComplete="name"
          placeholder={t("unlock.step1.fullNamePlaceholder")}
          aria-invalid={Boolean(error)}
          {...form.register("full_name")}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function Step2EmailPhone({
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
      <div className="space-y-1.5">
        <Label htmlFor="unlock-email" className="text-sm">
          {t("unlock.step1.emailLabel")}
        </Label>
        <div className="relative">
          <Input
            id="unlock-email"
            type="email"
            autoFocus
            autoComplete="email"
            placeholder={t("unlock.step1.emailPlaceholder")}
            aria-invalid={Boolean(error)}
            className="pr-9"
            {...form.register("email")}
          />
          {emailIsValid ? (
            <Check
              className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600"
              aria-hidden
            />
          ) : null}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="unlock-phone" className="text-sm">
          {t("unlock.step2.phoneLabel")}
        </Label>
        <Input
          id="unlock-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t("unlock.step2.phonePlaceholder")}
          aria-invalid={Boolean(phoneError)}
          {...form.register("phone")}
        />
        <p className="text-[11px] text-content-tertiary">
          {t("unlock.step2.phoneHint")}
        </p>
        {phoneError ? (
          <p className="text-xs text-destructive">{phoneError}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border-default/40 bg-surface-muted/40 p-4 space-y-3">
        <label
          htmlFor="unlock-gdpr"
          className="flex items-start gap-2.5 cursor-pointer"
        >
          <Checkbox
            id="unlock-gdpr"
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
          <span className="text-[12.5px] text-content-secondary leading-relaxed flex-1">
            <Trans
              i18nKey="unlock.step1.consentText"
              ns="gate"
              components={{
                a: (
                  <a
                    href="/privacidade"
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
            <span className="inline-flex items-center rounded bg-pink-100 text-pink-700 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide ml-0.5 align-middle">
              {t("unlock.step1.consentBadgeRequired")}
            </span>
          </span>
        </label>

        <div className="border-t border-dashed border-border-default/50" />

        <label
          htmlFor="unlock-marketing"
          className="flex items-start gap-2.5 cursor-pointer"
        >
          <Checkbox
            id="unlock-marketing"
            checked={marketing === true}
            onCheckedChange={(v) =>
              form.setValue("marketing_consent", v === true, {
                shouldValidate: false,
              })
            }
            className="mt-0.5"
          />
          <span className="text-[12.5px] text-content-secondary leading-relaxed flex-1">
            {t("unlock.step1.marketingText")}{" "}
            <span className="text-content-tertiary">
              {t("unlock.step1.marketingHint")}
            </span>
          </span>
        </label>
      </div>

      {consentError ? (
        <p className="text-xs text-destructive">{consentError}</p>
      ) : null}
    </div>
  );
}

interface RadioOption {
  value: string;
  label: string;
  icon?: { Icon: IconCmp; bg: string; fg: string };
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
  otherPlaceholder,
  otherEyebrow,
  otherHint,
  twoColumns,
  fullWidthValues,
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
  otherPlaceholder?: string;
  otherEyebrow?: string;
  otherHint?: string;
  twoColumns?: boolean;
  fullWidthValues?: string[];
}) {
  const { t } = useTranslation("gate");
  return (
    <fieldset className="space-y-3">
      {legend ? (
        <legend className="text-[14px] font-medium text-content-primary mb-1">
          {legend}
        </legend>
      ) : null}
      <div className={cn("grid gap-2", twoColumns ? "grid-cols-2" : "grid-cols-1")}>
        {options.map((opt) => {
          const selected = value === opt.value;
          const isOther = otherValue && opt.value === otherValue;
          const isFullWidth =
            twoColumns && fullWidthValues?.includes(opt.value);
          return (
            <div
              key={opt.value}
              className={isFullWidth ? "col-span-2" : undefined}
            >
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
                  className="sr-only peer"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-base",
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
                {opt.icon ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg",
                      opt.icon.bg,
                    )}
                  >
                    <opt.icon.Icon className={cn("size-4", opt.icon.fg)} />
                  </span>
                ) : null}
                <span
                  className={cn(
                    "text-[14px] leading-snug flex-1",
                    selected
                      ? "text-content-primary font-medium"
                      : "text-content-primary",
                  )}
                >
                  {opt.label}
                </span>
                {isOther && !selected && otherEyebrow ? (
                  <span className="text-[11px] italic text-content-tertiary shrink-0">
                    {otherEyebrow}
                  </span>
                ) : null}
              </label>
              {selected && isOther && onOtherTextChange ? (
                <div className="mt-2 ml-7 space-y-1">
                  <Input
                    autoFocus
                    maxLength={80}
                    placeholder={
                      otherPlaceholder ?? t("unlock.options.tellUsBriefly")
                    }
                    value={otherText ?? ""}
                    onChange={(e) => onOtherTextChange(e.target.value)}
                    aria-invalid={Boolean(otherError)}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-content-tertiary">
                      {otherError ? (
                        <span className="text-destructive">{otherError}</span>
                      ) : (
                        otherHint ?? ""
                      )}
                    </span>
                    <span className="text-[11px] text-content-tertiary tabular-nums">
                      {(otherText ?? "").length} / 80
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

function SuccessStep({
  firstName,
  email,
  returningLead,
  onClose,
}: {
  firstName: string | null;
  email: string;
  returningLead: boolean;
  onClose: () => void;
}) {
  void email;
  void returningLead;
  const { t } = useTranslation("gate");
  return (
    <div>
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 px-6 pt-7 pb-5 sm:px-8">
        <div
          className="absolute right-0 top-0 size-40 rounded-full bg-emerald-200/30 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div className="relative space-y-3">
          <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_0_4px_rgb(16_185_129_/_0.18)]">
            <CheckCircle2 className="size-5 text-white" aria-hidden />
          </div>
          <p className="text-eyebrow-sm text-emerald-700">
            {t("unlock.success.eyebrowAssoc")}
            {firstName
              ? ` · ${t("unlock.success.eyebrowThanks", { name: firstName.toUpperCase() })}`
              : ""}
          </p>
          <h2 className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
            {t("unlock.success.titlePrefix")}{" "}
            <em className="not-italic font-display italic text-emerald-600">
              {t("unlock.success.titleEm")}
            </em>
          </h2>
          <p className="text-[13px] text-content-secondary leading-relaxed">
            {t("unlock.success.subtitle")}
          </p>
        </div>
      </div>

      <div className="px-6 sm:px-8 py-6 space-y-5">
        <ul className="space-y-2">
          {UNLOCKED_ITEM_KEYS.map((key) => (
            <li
              key={key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-emerald-50/70 border-emerald-200/70"
            >
              <Check className="size-4 text-emerald-600 shrink-0" aria-hidden />
              <span className="text-[13px] text-content-primary flex-1">
                {t(`unlock.success.items.${key}`)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 pt-2 border-t border-border-default/40">
          <Button
            size="lg"
            className="w-full rounded-lg font-medium mt-4"
            onClick={onClose}
          >
            {t("unlock.success.cta")}
          </Button>
          <p className="text-xs text-content-tertiary text-center">
            {t("unlock.success.footnote")}
          </p>
        </div>
      </div>
    </div>
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
  const { t } = useTranslation("gate");
  return (
    <div className="space-y-6">
      <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle2 className="size-6 text-emerald-600" aria-hidden />
      </div>
      <DialogHeader className="text-left space-y-2">
        <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
          {t("unlock.welcomeBack.titlePrefix")}{" "}
          <em className="not-italic font-display italic text-emerald-600">
            {t("unlock.welcomeBack.titleEm")}
          </em>
          {firstName ? `, ${firstName}` : ""}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
          {t("unlock.welcomeBack.subtitle")}
        </DialogDescription>
      </DialogHeader>

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
          onClick={onBack}
          disabled={submitting}
          className="flex-shrink-0 rounded-lg"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("unlock.back")}
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
              {t("unlock.unlocking")}
            </>
          ) : (
            t("unlock.continue").replace(/\s*→\s*$/, "")
          )}
        </Button>
      </div>
    </div>
  );
}
