import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  Clock,
  Briefcase,
  Check,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Loader2,
  Lock,
  Search,
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

const OPERATOR_INFO = {
  name: "DIGITALFC",
  city: "Lisboa, Portugal",
  nif: "509XXXXXX",
};

const UNLOCKED_ITEMS = [
  "Visão geral desbloqueada",
  "Diagnóstico desbloqueado",
  "Desempenho desbloqueado",
] as const;

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

const FIELD_LABELS_PT: Record<string, string> = {
  first_name: "Primeiro nome",
  last_name: "Apelido",
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

type Step = "intro" | 1 | 2 | 3 | 4 | 5 | "welcome-back";

const STEP_HEADERS: Record<
  1 | 2 | 3 | 4,
  {
    eyebrow: string;
    badge?: string;
    title: (handle: string) => React.ReactNode;
    subtitle: React.ReactNode;
  }
> = {
  1: {
    eyebrow: "PASSO 1 DE 4",
    badge: "~1 MIN",
    title: () => (
      <>
        Como te{" "}
        <em className="not-italic font-display italic text-primary">
          tratamos
        </em>
        ?
      </>
    ),
    subtitle:
      "Usamos estes dados para guardar o relatório e enviar o acesso por email.",
  },
  2: {
    eyebrow: "PASSO 2 DE 4",
    title: () => <>Que relação tens com este perfil?</>,
    subtitle: "Ajuda-nos a ajustar o tom da análise.",
  },
  3: {
    eyebrow: "PASSO 3 DE 4",
    title: () => <>O que queres perceber?</>,
    subtitle:
      "Escolhe o que mais te interessa. Destacamos o que importa.",
  },
  4: {
    eyebrow: "PASSO 4 DE 4",
    title: () => <>Como te descreves?</>,
    subtitle: "Última pergunta — depois abrimos o relatório.",
  },
};

export function UnlockModal({
  open,
  onOpenChange,
  snapshotId,
  instagramUsername,
  onUnlock,
}: UnlockModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<UnlockResult | null>(null);
  const [lookupPending, setLookupPending] = useState(false);
  const [knownFields, setKnownFields] = useState<Set<QField>>(new Set());
  const [returningFirstName, setReturningFirstName] = useState<string | null>(null);
  const [partialBanner, setPartialBanner] = useState<string | null>(null);

  // Track intro view once per modal open.
  useEffect(() => {
    if (!open || step !== "intro") return;
    void trackEvent({
      data: {
        eventType: "unlock_modal_intro_viewed",
        handle: instagramUsername,
        snapshotId,
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const form = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    mode: "onChange",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
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
    if (step === 1) fields = ["first_name", "last_name", "email", "gdpr_consent"];
    if (step === 2) fields = ["profile_ownership"];
    if (step === 3) {
      fields = ["goal"];
      if (form.getValues("goal") === "other") fields.push("goal_other_text");
    }
    const ok = await form.trigger(fields, { shouldFocus: true });
    if (!ok) return;

    if (step === 1) {
      // Manual non-empty enforcement (schema keeps these optional for back-compat).
      const firstName = (form.getValues("first_name") ?? "").trim();
      const lastName = (form.getValues("last_name") ?? "").trim();
      let invalid = false;
      if (!firstName) {
        form.setError("first_name", { message: "Indica o teu primeiro nome" });
        invalid = true;
      }
      if (!lastName) {
        form.setError("last_name", { message: "Indica o apelido" });
        invalid = true;
      }
      if (invalid) return;
    }

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

      if (exists && missing.length === 0) {
        setPartialBanner(null);
        setStep("welcome-back");
        return;
      }

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

    if (typeof step === "number" && step <= 4) {
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
      setStep("intro");
      return;
    }
    if (step === 1) {
      setStep("intro");
      return;
    }
    if (typeof step === "number" && step > 1 && step < 5) {
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
          name: `${(values.first_name ?? "").trim()} ${(values.last_name ?? "").trim()}`
            .trim() || undefined,
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
      setStep(5);
    } catch {
      setServerError(
        "Erro de ligação. Verifica a tua internet e tenta novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  });

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
      setStep(5);
    } catch {
      setStep(2);
      setServerError(
        "Erro de ligação. Verifica a tua internet e tenta novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stepNumForBar =
    step === "welcome-back" || step === "intro" ? 1 : (step as number);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto p-0 gap-0 border-border-default/60">
        {step === "intro" ? (
          <IntroCover
            handle={instagramUsername}
            onContinue={() => {
              void trackEvent({
                data: {
                  eventType: "unlock_modal_intro_cta_clicked",
                  handle: instagramUsername,
                  snapshotId,
                },
              }).catch(() => {});
              setStep(1);
            }}
          />
        ) : step === 5 ? (
          <SuccessStep
            firstName={
              returningFirstName ??
              (form.getValues("first_name") || null) ??
              firstNameFromEmail(form.getValues("email"))
            }
            email={form.getValues("email")}
            returningLead={Boolean(result?.returningLead)}
            onClose={() => onOpenChange(false)}
          />
        ) : step === "welcome-back" ? (
          <div className="px-7 py-8 sm:px-9 sm:py-9">
            <WelcomeBackState
              firstName={returningFirstName}
              submitting={submitting}
              serverError={serverError}
              onContinue={() => submitMinimal(form.getValues("email"))}
              onBack={goBack}
            />
          </div>
        ) : (
          <div className="px-7 py-8 sm:px-9 sm:py-9">
            <DialogHeader className="text-left space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-eyebrow-sm text-content-tertiary">
                  {STEP_HEADERS[step].eyebrow}
                </p>
                {STEP_HEADERS[step].badge ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-[1px] text-[10px] font-semibold tracking-wide">
                    {STEP_HEADERS[step].badge}
                  </span>
                ) : null}
              </div>
              <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
                {STEP_HEADERS[step].title(instagramUsername)}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
                {STEP_HEADERS[step].subtitle}
              </DialogDescription>
              <ProgressSegments current={stepNumForBar} total={TOTAL_STEPS} />
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
                  legend=""
                  name="profile_ownership"
                  options={PROFILE_OWNERSHIPS.map((v) => ({
                    value: v,
                    label: PROFILE_OWNERSHIP_LABELS[v],
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
                    label: GOAL_LABELS[v],
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
                  otherPlaceholder="ex: investigação académica sobre IA criativa"
                  otherEyebrow="descreve em poucas palavras"
                  otherHint="opcional · ajuda-nos a melhorar"
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
                  otherPlaceholder="ex: jornalista, investigador, curador"
                  otherEyebrow="selecciona para descrever"
                />
              ) : null}

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
                    "Abrir relatório  →"
                  ) : (
                    "Continuar  →"
                  )}
                </Button>
              </div>

              {step === 1 ? (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-content-tertiary">
                  <Lock className="size-3" aria-hidden="true" />
                  Operador:{" "}
                  <strong className="font-semibold text-content-secondary">
                    {OPERATOR_INFO.name}
                  </strong>{" "}
                  · {OPERATOR_INFO.city} · NIF {OPERATOR_INFO.nif} · Cancela quando quiseres.
                </p>
              ) : null}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function firstNameFromEmail(email: string | undefined): string | null {
  if (!email) return null;
  const handle = email.split("@")[0] ?? "";
  const cleaned = handle.replace(/[._-]/g, " ").trim();
  if (!cleaned) return null;
  const first = cleaned.split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
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

const INTRO_HIGHLIGHTS: ReadonlyArray<{
  Icon: IconCmp;
  title: string;
  body: string;
}> = [
  {
    Icon: Activity,
    title: "Diagnóstico editorial",
    body: "O que funciona, o que falha e onde estás abaixo do mercado.",
  },
  {
    Icon: BarChart3,
    title: "Comparação com perfis pares",
    body: "Onde estás no benchmark do teu escalão.",
  },
  {
    Icon: Compass,
    title: "Desempenho, conteúdo e procura",
    body: "Envolvimento, formatos, hashtags e sinais fora do Instagram.",
  },
];

function IntroCover({
  handle,
  onContinue,
}: {
  handle: string;
  onContinue: () => void;
}) {
  const cleaned = handle.replace(/^@/, "");
  return (
    <div className="px-7 py-8 sm:px-9 sm:py-9">
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-eyebrow-sm text-primary">+4 secções grátis</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          <Sparkles className="size-3" aria-hidden />
          Beta · acesso gratuito
        </span>
      </div>

      <DialogHeader className="text-left space-y-3">
        <DialogTitle className="font-display text-[28px] sm:text-[32px] leading-[1.1] tracking-[-0.01em] text-content-primary">
          Continua a leitura
          <br />
          do{" "}
          <em className="not-italic font-display italic text-primary">
            @{cleaned}
          </em>
        </DialogTitle>
        <DialogDescription className="text-[14px] text-content-secondary leading-relaxed">
          Já viste{" "}
          <strong className="font-semibold text-content-primary">
            2 das 6 secções
          </strong>{" "}
          do relatório. Faltam 4 — desbloqueia-as agora com o teu email. Demora
          menos de 1 minuto.
        </DialogDescription>
      </DialogHeader>

      <ul className="mt-6 space-y-2.5">
        {INTRO_HIGHLIGHTS.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border-default/60 bg-surface-muted/30"
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <item.Icon className="size-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-content-primary leading-snug">
                {item.title}
              </p>
              <p className="text-[12.5px] text-content-tertiary leading-relaxed mt-0.5">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-border-default/40 -mx-7 sm:-mx-9 px-7 sm:px-9 pt-5">
        <Button
          type="button"
          size="lg"
          className="w-full rounded-lg font-medium"
          onClick={onContinue}
        >
          Desbloquear as 4 secções →
        </Button>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-content-tertiary">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> ~1 minuto
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3" aria-hidden /> RGPD · sem spam
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3" aria-hidden /> BETA · capacidade limitada
          </span>
        </p>
      </div>
    </div>
  );
}

function Step1Email({
  form,
}: {
  form: ReturnType<typeof useForm<UnlockFormValues>>;
}) {
  const error = form.formState.errors.email?.message;
  const consentError = form.formState.errors.gdpr_consent?.message;
  const firstNameError = form.formState.errors.first_name?.message;
  const lastNameError = form.formState.errors.last_name?.message;
  const consent = form.watch("gdpr_consent");
  const marketing = form.watch("marketing_consent");
  const emailValue = form.watch("email");
  const emailIsValid = !error && emailValue && /\S+@\S+\.\S+/.test(emailValue);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="unlock-first-name" className="text-sm">
            Primeiro nome
          </Label>
          <Input
            id="unlock-first-name"
            type="text"
            autoFocus
            autoComplete="given-name"
            placeholder="Ana"
            aria-invalid={Boolean(firstNameError)}
            {...form.register("first_name")}
          />
          {firstNameError ? (
            <p className="text-xs text-destructive">{firstNameError}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unlock-last-name" className="text-sm">
            Apelido
          </Label>
          <Input
            id="unlock-last-name"
            type="text"
            autoComplete="family-name"
            placeholder="Marques"
            aria-invalid={Boolean(lastNameError)}
            {...form.register("last_name")}
          />
          {lastNameError ? (
            <p className="text-xs text-destructive">{lastNameError}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="unlock-email" className="text-sm">
          Email
        </Label>
        <div className="relative">
          <Input
            id="unlock-email"
            type="email"
            autoComplete="email"
            placeholder="ana@empresa.pt"
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
            Aceito o{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener"
              className="underline text-primary hover:text-primary/80"
            >
              tratamento dos meus dados
            </a>{" "}
            para gerar e guardar este relatório, e li a{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener"
              className="underline text-primary hover:text-primary/80"
            >
              política de privacidade
            </a>
            .{" "}
            <span className="inline-flex items-center rounded bg-pink-100 text-pink-700 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide ml-0.5 align-middle">
              OBRIG.
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
            Quero receber novidades e dicas sobre relatórios, análise de Instagram e marketing digital{" "}
            <span className="text-content-tertiary">
              (cancelas quando quiseres · ~1 email/semana)
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
                    placeholder={otherPlaceholder ?? "Conta-nos brevemente…"}
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
            RELATÓRIO ASSOCIADO{firstName ? ` · OBRIGADO ${firstName.toUpperCase()}` : ""}
          </p>
          <h2 className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
            Relatório{" "}
            <em className="not-italic font-display italic text-emerald-600">
              desbloqueado
            </em>
          </h2>
          <p className="text-[13px] text-content-secondary leading-relaxed">
            O relatório ficou associado ao email indicado para poderes voltar a consultá-lo mais tarde.
          </p>
        </div>
      </div>

      <div className="px-6 sm:px-8 py-6 space-y-5">
        <ul className="space-y-2">
          {UNLOCKED_ITEMS.map((label) => (
            <li
              key={label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-emerald-50/70 border-emerald-200/70"
            >
              <Check className="size-4 text-emerald-600 shrink-0" aria-hidden />
              <span className="text-[13px] text-content-primary flex-1">
                {label}
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
            Ver relatório gratuito agora  →
          </Button>
          <p className="text-xs text-content-tertiary text-center">
            Este relatório foi associado diretamente à tua conta.
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
  return (
    <div className="space-y-6">
      <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle2 className="size-6 text-emerald-600" aria-hidden />
      </div>
      <DialogHeader className="text-left space-y-2">
        <DialogTitle className="font-display text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em] text-content-primary">
          Bem-vindo de{" "}
          <em className="not-italic font-display italic text-emerald-600">
            volta
          </em>
          {firstName ? `, ${firstName}` : ""}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-content-secondary leading-relaxed">
          Podes voltar a consultar este relatório na tua área pessoal.
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
