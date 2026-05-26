import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  feedbackFormSchema,
  type FeedbackFormInput,
  type FeedbackFormValues,
  PRICING_PREFERENCE_LABELS,
  PRICING_PREFERENCE_VALUES,
  PURCHASE_INTENT_LABELS,
  PURCHASE_INTENT_VALUES,
} from "@/lib/feedback/feedback-schema";

interface FeedbackFormProps {
  requestId: string;
  leadFirstName: string | null;
  handle: string;
  onSubmitted: () => void;
}

const SCORE_LABELS = ["Nada útil", "Pouco útil", "Razoável", "Útil", "Muito útil"];

export function FeedbackForm({ requestId, leadFirstName, handle, onSubmitted }: FeedbackFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FeedbackFormInput, unknown, FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      contact_consent: false,
    },
  });

  const score = form.watch("usefulness_score");

  const onSubmit = async (values: FeedbackFormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/feedback/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
      };
      if (!res.ok || !data.ok) {
        if (data.code === "ALREADY_SUBMITTED") {
          onSubmitted();
          return;
        }
        setSubmitError("Não foi possível enviar o feedback. Tenta novamente.");
        return;
      }
      onSubmitted();
    } catch {
      setSubmitError("Erro de ligação. Verifica a internet e tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <header className="space-y-2">
        <p className="text-eyebrow-sm text-content-tertiary">
          Feedback · @{handle}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-content-primary">
          {leadFirstName ? `Obrigado, ${leadFirstName}.` : "Obrigado pelo teu tempo."}
        </h1>
        <p className="text-sm text-content-secondary">
          6 perguntas curtas · cerca de 1 minuto. O teu feedback ajuda-nos a decidir os próximos passos do AuditProfiles.
        </p>
      </header>

      {/* 1. Usefulness */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-content-primary">
          1. O relatório foi útil?
        </legend>
        <Controller
          control={form.control}
          name="usefulness_score"
          render={({ field }) => (
            <div className="flex gap-2" role="radiogroup" aria-label="Utilidade">
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = field.value === n;
                return (
                  <button
                    type="button"
                    key={n}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(n)}
                    className={cn(
                      "flex-1 h-12 rounded-md border text-base font-semibold tabular-nums transition-colors",
                      selected
                        ? "border-accent-primary bg-accent-primary text-white"
                        : "border-border-default bg-surface-elevated text-content-secondary hover:border-accent-primary/40",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          )}
        />
        <div className="flex justify-between text-xs text-content-tertiary">
          <span>Nada útil</span>
          <span>Muito útil</span>
        </div>
        {score ? (
          <p className="text-xs text-content-secondary">
            {SCORE_LABELS[score - 1]}
          </p>
        ) : null}
        {form.formState.errors.usefulness_score ? (
          <p className="text-xs text-signal-negative">
            {form.formState.errors.usefulness_score.message}
          </p>
        ) : null}
      </fieldset>

      {/* 2. Clarity */}
      <div className="space-y-2">
        <Label htmlFor="clarity_text" className="text-sm font-medium text-content-primary">
          2. O que ficou mais claro sobre o perfil?
        </Label>
        <Textarea
          id="clarity_text"
          rows={3}
          maxLength={500}
          placeholder="Opcional"
          {...form.register("clarity_text")}
        />
      </div>

      {/* 3. Missing */}
      <div className="space-y-2">
        <Label htmlFor="missing_text" className="text-sm font-medium text-content-primary">
          3. Que dado ou análise faltou?
        </Label>
        <Textarea
          id="missing_text"
          rows={3}
          maxLength={500}
          placeholder="Opcional"
          {...form.register("missing_text")}
        />
      </div>

      {/* 4. Purchase intent */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-content-primary">
          4. Pagarias por uma análise completa?
        </legend>
        <Controller
          control={form.control}
          name="purchase_intent"
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              className="grid grid-cols-3 gap-2"
            >
              {PURCHASE_INTENT_VALUES.map((v) => (
                <Label
                  key={v}
                  htmlFor={`pi-${v}`}
                  className={cn(
                    "flex items-center justify-center h-11 rounded-md border cursor-pointer text-sm font-medium transition-colors",
                    field.value === v
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border-default bg-surface-elevated text-content-secondary hover:border-accent-primary/40",
                  )}
                >
                  <RadioGroupItem id={`pi-${v}`} value={v} className="sr-only" />
                  {PURCHASE_INTENT_LABELS[v]}
                </Label>
              ))}
            </RadioGroup>
          )}
        />
        {form.formState.errors.purchase_intent ? (
          <p className="text-xs text-signal-negative">
            {form.formState.errors.purchase_intent.message}
          </p>
        ) : null}
      </fieldset>

      {/* 5. Pricing preference */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-content-primary">
          5. Qual opção faria mais sentido?
        </legend>
        <Controller
          control={form.control}
          name="pricing_preference"
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              className="space-y-2"
            >
              {PRICING_PREFERENCE_VALUES.map((v) => (
                <Label
                  key={v}
                  htmlFor={`pp-${v}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-3 cursor-pointer text-sm transition-colors",
                    field.value === v
                      ? "border-accent-primary bg-accent-primary/5 text-content-primary"
                      : "border-border-default bg-surface-elevated text-content-secondary hover:border-accent-primary/40",
                  )}
                >
                  <RadioGroupItem id={`pp-${v}`} value={v} />
                  <span>{PRICING_PREFERENCE_LABELS[v]}</span>
                </Label>
              ))}
            </RadioGroup>
          )}
        />
      </fieldset>

      {/* 6. Contact consent */}
      <div className="flex items-start gap-3 rounded-md border border-border-default bg-surface-elevated p-3">
        <Controller
          control={form.control}
          name="contact_consent"
          render={({ field }) => (
            <Switch
              id="contact_consent"
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
              aria-label="Consentimento de contacto"
            />
          )}
        />
        <Label htmlFor="contact_consent" className="text-sm text-content-secondary leading-snug cursor-pointer">
          Podemos contactar-te para próximos passos? <span className="text-content-tertiary">(opcional)</span>
        </Label>
      </div>

      {submitError ? (
        <p className="text-sm text-signal-negative" role="alert">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" className="w-full h-12" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar…
          </>
        ) : (
          "Enviar feedback"
        )}
      </Button>
    </form>
  );
}