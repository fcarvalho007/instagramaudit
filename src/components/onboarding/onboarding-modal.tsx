/**
 * OnboardingModal — entry + final + OTP (Fase 4 redesign).
 *
 * Public flow:
 *   Entry ──┬─► (new email)       Final 2-col ──► /api/onboarding/start
 *           └─► (existing email)  OTP 6 digits ──► supabase.auth.verifyOtp
 *                                               ──► /api/onboarding/claim-existing
 *
 * Security: the server (`start.ts`) rejects any payload whose email
 * already maps to a lead with `EMAIL_REQUIRES_VERIFICATION`. Only the OTP
 * path can grant a `lead_session` for existing emails, so a typo or a
 * malicious client cannot hijack someone else's reports.
 *
 * Copy lives in `gate.json` under `onboarding.entry`, `onboarding.final`,
 * and `onboarding.otp`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
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
} from "@/lib/unlock-flow";
import { supabase } from "@/integrations/supabase/client";
import { parseFullName } from "@/lib/names/parse-full-name";
import { useOnboardingDraft } from "@/lib/leads/use-onboarding-draft";
import { trackOnboardingEvent } from "@/lib/tracking/onboarding-events";
import { buildStartPayload } from "@/lib/leads/build-start-payload";
import { LEAD_QUALIFICATIONS, type LeadQualification } from "@/lib/leads/qualification";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const RESEND_COOLDOWN_SECONDS = 30;

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
}

/**
 * View state machine. Mutually exclusive — only one panel renders at a
 * time. The email captured at the entry step is the source of truth for
 * the remaining views; we never re-prompt for it.
 */
type View =
  | { kind: "entry" }
  | { kind: "final"; email: string }
  | { kind: "otp"; email: string; sentAt: number; mode: "new" | "existing" };

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
      // The dedicated step that asked for these is gone. We keep safe
      // defaults so the (legacy) schema validates; the payload builder
      // omits them when the form was never asked.
      profile_ownership: "own_profile" as never,
      goal: "improve_content" as never,
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
      const step = view.kind === "entry" ? 0 : view.kind === "final" ? 1 : 2;
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

  /**
   * Triggers Supabase Auth OTP for an email and switches to the verify
   * view. Used both from the entry step (existing email) and from the
   * /start endpoint fallback when the server reports
   * EMAIL_REQUIRES_VERIFICATION.
   *
   * `shouldCreateUser: true` is intentional: a lead row can exist without a
   * matching auth.users row (legacy leads). The first OTP confirm then
   * fires `handle_new_user`, which calls `link_user_to_existing_reports`
   * to bind the new auth user to the existing lead.
   */
  const sendOtpAndGoToOtpView = useCallback(
    async (email: string, mode: "new" | "existing" = "existing"): Promise<void> => {
      setSubmitting(true);
      setServerError(null);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) {
          setServerError(t("onboarding.otp.errors.sendFailed"));
          trackOnboardingEvent({
            event_type: "onboarding_error",
            step: 0,
            handle,
            error_code: `OTP_SEND_${error.status ?? "ERR"}`,
          });
          return;
        }
        setView({ kind: "otp", email, sentAt: Date.now(), mode });
      } catch {
        setServerError(t("onboarding.otp.errors.network"));
      } finally {
        setSubmitting(false);
      }
    },
    [handle, t],
  );

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
        } | null;
        if (!res.ok || !data || data.ok !== true) {
          setServerError(t("onboarding.errors.generic"));
          return;
        }
        if (data.exists) {
          await sendOtpAndGoToOtpView(email, "existing");
          return;
        }
        form.setValue("email", email, { shouldValidate: true });
        setView({ kind: "final", email });
      } catch {
        setServerError(t("onboarding.errors.network"));
      } finally {
        setSubmitting(false);
      }
    },
    [form, sendOtpAndGoToOtpView, t],
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
      // Defense-in-depth: if check-email raced and the email now exists as
      // a lead, the server returns EMAIL_REQUIRES_VERIFICATION. Reroute to
      // OTP with the email the user already typed.
      if (
        data &&
        data.ok === false &&
        data.error_code === "EMAIL_REQUIRES_VERIFICATION"
      ) {
        setSubmitting(false);
        await sendOtpAndGoToOtpView(values.email, "existing");
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
      // Fase 5: `/start` no longer grants credits. It triggered the
      // verification OTP server-side; route to the OTP panel so the user
      // can confirm and unlock the 2 free credits via /claim-existing.
      setView({
        kind: "otp",
        email: values.email,
        sentAt: Date.now(),
        mode: "new",
      });
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
   * Path B — verifies the 6-digit OTP via Supabase, then asks the server
   * to bind the verified session to a lead and issue `lead_session`.
   * This is the only path that grants a session for an existing email.
   */
  const handleOtpVerify = useCallback(
    async (email: string, code: string): Promise<void> => {
      setSubmitting(true);
      setServerError(null);
      try {
        const { data: verified, error } = await supabase.auth.verifyOtp({
          email,
          token: code.trim(),
          type: "email",
        });
        if (error || !verified.session) {
          const msg = error?.message ?? "";
          if (/expired/i.test(msg)) {
            setServerError(t("onboarding.otp.errors.expired"));
          } else {
            setServerError(t("onboarding.otp.errors.invalid"));
          }
          trackOnboardingEvent({
            event_type: "onboarding_error",
            step: 2,
            handle,
            error_code: `OTP_VERIFY_${error?.status ?? "ERR"}`,
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
          setServerError(t("onboarding.otp.errors.claimFailed"));
          trackOnboardingEvent({
            event_type: "onboarding_error",
            step: 2,
            handle,
            error_code: "OTP_CLAIM_FAILED",
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
        setServerError(t("onboarding.otp.errors.network"));
      } finally {
        setSubmitting(false);
      }
    },
    [clearDraft, handle, onSuccess, t],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-[820px] max-h-[92vh] overflow-x-hidden overflow-y-auto p-0 gap-0 border-border-default/60"
        data-testid="onboarding-modal"
      >
        {view.kind === "entry" ? (
          <EntryStepBody
            handle={handle}
            submitting={submitting}
            serverError={serverError}
            onSubmit={handleEntrySubmit}
            onSignInWithEmail={(email) => sendOtpAndGoToOtpView(email)}
            initialEmail={form.getValues("email")}
          />
        ) : view.kind === "final" ? (
          <FinalStepBody
            handle={handle}
            form={form}
            serverError={serverError}
            submitting={submitting}
            onBack={goBackToEntry}
            onSubmit={handleFinalSubmit}
            honeypotRef={honeypotRef}
          />
        ) : (
          <OtpVerifyPanel
            email={view.email}
            sentAt={view.sentAt}
            mode={view.mode}
            submitting={submitting}
            serverError={serverError}
            onVerify={(code) => handleOtpVerify(view.email, code)}
            onResend={() => sendOtpAndGoToOtpView(view.email, view.mode)}
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

function EntryStepBody({
  handle,
  submitting,
  serverError,
  onSubmit,
  onSignInWithEmail,
  initialEmail,
}: {
  handle: string;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (email: string) => Promise<void> | void;
  onSignInWithEmail: (email: string) => Promise<void> | void;
  initialEmail?: string;
}) {
  const { t } = useTranslation("gate");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

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
      <DialogHeader className="text-left space-y-2.5">
        <p className="text-eyebrow text-content-tertiary">
          {t("onboarding.entry.eyebrow")}
        </p>
        <DialogTitle className="font-display text-[28px] sm:text-[32px] leading-[1.08] tracking-[-0.015em] text-content-primary text-balance">
          {t("onboarding.entry.title")}
        </DialogTitle>
        <DialogDescription className="text-[15px] text-content-secondary leading-[1.55]">
          <Trans
            i18nKey="onboarding.entry.subtitle"
            ns="gate"
            values={{ handle }}
            components={{ 1: <span className="text-primary font-medium" /> }}
          />
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={submit}
        noValidate
        className="mt-6 relative rounded-2xl border-2 border-primary/40 bg-primary/[0.03] p-5 sm:p-6 space-y-4"
      >
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

        <Input
          id="onb-entry-email"
          type="email"
          autoFocus
          autoComplete="email"
          inputMode="email"
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
            t("onboarding.entry.newCta")
          )}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-border-default/50 bg-surface-muted/40 px-4 py-3">
        <span className="text-[13.5px] text-content-secondary">
          {t("onboarding.entry.haveAccount")}
        </span>
        <button
          type="button"
          onClick={() => void goSignIn()}
          disabled={submitting}
          className="text-[13.5px] font-semibold text-primary hover:underline disabled:opacity-60"
          data-testid="onboarding-entry-signin"
        >
          {t("onboarding.entry.haveAccountCta")}
        </button>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-content-tertiary flex items-center justify-center gap-1.5">
        <ShieldCheck className="size-3.5" aria-hidden />
        {t("onboarding.entry.trustLine")}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Final step — 2-col editorial (left navy, right form)                       */
/* -------------------------------------------------------------------------- */

function FinalStepBody({
  handle,
  form,
  serverError,
  submitting,
  onBack,
  onSubmit,
  honeypotRef,
}: {
  handle: string;
  form: ReturnType<typeof useForm<UnlockFormValues>>;
  serverError: string | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => Promise<void> | void;
  honeypotRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation("gate");
  const nameError = form.formState.errors.full_name?.message;
  const emailError = form.formState.errors.email?.message;
  const qualificationError = form.formState.errors.qualification?.message;
  const consentError = form.formState.errors.gdpr_consent?.message;
  const consent = form.watch("gdpr_consent");
  const marketing = form.watch("marketing_consent");
  const emailValue = form.watch("email");
  const qualificationValue = form.watch("qualification");
  const emailIsValid = !emailError && emailValue && EMAIL_RE.test(emailValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      noValidate
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] min-w-0"
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
      <aside className="bg-content-primary text-white px-6 py-7 sm:px-8 sm:py-9 lg:py-10 flex flex-col gap-5">
        <p className="text-eyebrow-sm text-cyan-300">
          {t("onboarding.final.left.eyebrow")}
        </p>
        <p className="font-display text-[28px] sm:text-[32px] leading-[1.08] tracking-[-0.015em] text-white text-balance">
          {t("onboarding.final.left.title")}
        </p>
        <ul className="space-y-3 pt-2">
          <FinalBullet>
            <Trans
              i18nKey="onboarding.final.left.bullets.report"
              ns="gate"
              values={{ handle }}
            />
          </FinalBullet>
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
        </ul>
      </aside>

      {/* Right — compact form */}
      <div className="px-5 py-6 sm:px-8 sm:py-8 flex flex-col gap-4 bg-white min-w-0">
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
            <p className="text-[12px] text-content-tertiary">
              {t("onboarding.final.right.emailHint")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="onb-qualification" className="text-[13.5px] font-medium text-content-primary">
            {t("onboarding.final.right.qualificationLabel")}
          </Label>
          <Select
            value={qualificationValue ?? undefined}
            onValueChange={(v) =>
              form.setValue("qualification", v as LeadQualification, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger
              id="onb-qualification"
              aria-invalid={Boolean(qualificationError)}
              className="text-base"
              data-testid="onboarding-qualification"
            >
              <SelectValue
                placeholder={t("onboarding.final.right.qualificationPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {LEAD_QUALIFICATIONS.map((q) => (
                <SelectItem key={q} value={q}>
                  {t(`onboarding.final.right.qualificationOptions.${q}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {qualificationError ? (
            <p className="text-[12.5px] text-destructive">{qualificationError}</p>
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

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={submitting}
            className="w-full sm:w-auto sm:flex-shrink-0 rounded-lg"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("onboarding.final.right.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full sm:flex-1 rounded-lg font-medium"
            data-testid="onboarding-final-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("onboarding.submitting")}
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden />
                {t("onboarding.final.right.cta")}
              </>
            )}
          </Button>
        </div>
        <p className="text-center text-[12px] text-content-tertiary mt-1">
          {t("onboarding.final.right.footnote")}
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
/* OTP verify panel — for existing emails (ownership proof)                   */
/* -------------------------------------------------------------------------- */

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}${user.length > 2 ? "•••" : ""}@${domain}`;
}

function OtpVerifyPanel({
  email,
  sentAt,
  mode,
  submitting,
  serverError,
  onVerify,
  onResend,
  onBack,
}: {
  email: string;
  sentAt: number;
  mode: "new" | "existing";
  submitting: boolean;
  serverError: string | null;
  onVerify: (code: string) => Promise<void> | void;
  onResend: () => Promise<void> | void;
  onBack: () => void;
}) {
  const { t } = useTranslation("gate");
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSeconds = Math.floor((now - sentAt) / 1000);
  const cooldown = Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
  const canResend = cooldown === 0 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 6) return;
    await onVerify(trimmed);
  };

  return (
    <div className="px-5 py-7 sm:px-9 sm:py-9" data-testid="onboarding-otp-step">
      <DialogHeader className="text-left space-y-2.5">
        <p className="text-eyebrow-sm text-content-tertiary">
          {t("onboarding.otp.eyebrow")}
        </p>
        {mode === "existing" ? (
          <p className="text-[13px] text-content-secondary leading-[1.5]">
            {t("onboarding.otp.existingTitle")}
          </p>
        ) : null}
        <DialogTitle className="font-display text-[24px] sm:text-[28px] leading-[1.1] tracking-[-0.015em] text-content-primary text-balance break-words">
          {t("onboarding.otp.title", { maskedEmail: maskEmail(email) })}
        </DialogTitle>
        <DialogDescription className="text-[14px] text-content-secondary leading-[1.55]">
          {t("onboarding.otp.subtitle")}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="onb-otp" className="text-[13.5px] font-medium text-content-primary">
            {t("onboarding.otp.codeLabel")}
          </Label>
          <Input
            id="onb-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder={t("onboarding.otp.codePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center font-mono text-[20px] tracking-[0.45em] h-12"
            data-testid="onboarding-otp-code"
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
          disabled={submitting || code.length !== 6}
          className="w-full rounded-lg font-medium h-12"
          data-testid="onboarding-otp-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("onboarding.otp.verifying")}
            </>
          ) : (
            t("onboarding.otp.cta")
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
            {t("onboarding.otp.back")}
          </button>
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={!canResend}
            className="text-[13px] font-medium text-primary hover:underline disabled:opacity-60 disabled:no-underline"
            data-testid="onboarding-otp-resend"
          >
            {canResend
              ? t("onboarding.otp.resend")
              : t("onboarding.otp.resendIn", { seconds: cooldown })}
          </button>
        </div>
      </form>
    </div>
  );
}