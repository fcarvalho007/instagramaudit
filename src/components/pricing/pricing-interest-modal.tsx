import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trackEvent } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";
import { usePricing } from "@/lib/pricing/use-pricing";

export type PricingInterestOption = "single_report" | "pack_5_reports";
type WouldPay = "sim" | "talvez" | "nao";
type Fairness = "barato" | "justo" | "caro";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: PricingInterestOption | null;
  planLabel: string;
  planPrice: string;
}

export function PricingInterestModal({
  open,
  onOpenChange,
  option,
  planLabel,
  planPrice,
}: Props) {
  const { t } = useTranslation("pricing");
  const { plans } = usePricing();
  const planFromDb = option ? plans[option] : null;
  // Preferimos sempre o valor vindo da DB; caímos para o prop apenas se ainda
  // não temos resposta (placeholderData garante valor imediato).
  const effectiveLabel = planFromDb?.label ?? planLabel;
  const effectivePrice = planFromDb?.priceFormatted ?? planPrice;
  const [wouldPay, setWouldPay] = useState<WouldPay | "">("");
  const [fairness, setFairness] = useState<Fairness | "">("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset to allow exit animation
      const id = setTimeout(() => {
        setWouldPay("");
        setFairness("");
        setEmail("");
        setComment("");
        setSubmitting(false);
        setSuccess(false);
        setError(null);
      }, 250);
      return () => clearTimeout(id);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!option || !wouldPay) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/pricing-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricing_option: option,
          would_pay: wouldPay,
          price_fairness: fairness || null,
          email: email.trim() || undefined,
          comment: comment.trim() || undefined,
          referrer:
            typeof document !== "undefined" ? document.referrer || null : null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !body.ok) {
        setError(t("interest_modal.error"));
        setSubmitting(false);
        return;
      }
      trackEvent({
        data: {
          eventType: "pricing_interest_submitted",
          metadata: {
            pricing_option: option,
            would_pay: wouldPay,
            price_fairness: fairness || null,
            with_email: email.trim().length > 0,
          },
        },
      }).catch(() => {});
      setSuccess(true);
      setSubmitting(false);
    } catch {
      setError(t("interest_modal.error"));
      setSubmitting(false);
    }
  };

  const wouldPayOpts = t("interest_modal.would_pay_options", {
    returnObjects: true,
  }) as Record<WouldPay, string>;
  const fairnessOpts = t("interest_modal.fairness_options", {
    returnObjects: true,
  }) as Record<Fairness, string>;

  const interpolated = {
    plan: effectiveLabel,
    price: effectivePrice,
  };
  const introHtml = t("interest_modal.intro", interpolated);
  const wouldPayLabel = t("interest_modal.would_pay_label", interpolated);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {success ? (
          <SuccessState
            title={t("interest_modal.success_title")}
            body={t("interest_modal.success_body")}
            close={t("interest_modal.success_close")}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader className="space-y-2 text-left">
              <span className="text-eyebrow-sm text-accent-primary">
                {t("interest_modal.eyebrow")} · {effectiveLabel} · {effectivePrice}
              </span>
              <DialogTitle className="font-fraunces text-2xl font-medium tracking-tight text-content-primary">
                {t("interest_modal.title")}
              </DialogTitle>
              <DialogDescription
                className="text-sm leading-relaxed text-content-secondary"
                // Permite o <strong> com o plano + preço a partir do i18n.
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            </DialogHeader>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-content-primary">
                {wouldPayLabel}
              </legend>
              <RadioGroup
                value={wouldPay}
                onValueChange={(v) => setWouldPay(v as WouldPay)}
                className="grid grid-cols-1 gap-1.5 sm:grid-cols-3"
              >
                {(["sim", "talvez", "nao"] as WouldPay[]).map((k) => (
                  <RadioOption
                    key={k}
                    id={`wp-${k}`}
                    value={k}
                    label={wouldPayOpts[k]}
                    checked={wouldPay === k}
                  />
                ))}
              </RadioGroup>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-content-primary">
                {t("interest_modal.fairness_label")}
              </legend>
              <RadioGroup
                value={fairness}
                onValueChange={(v) => setFairness(v as Fairness)}
                className="grid grid-cols-3 gap-1.5"
              >
                {(["barato", "justo", "caro"] as Fairness[]).map((k) => (
                  <RadioOption
                    key={k}
                    id={`f-${k}`}
                    value={k}
                    label={fairnessOpts[k]}
                    checked={fairness === k}
                  />
                ))}
              </RadioGroup>
            </fieldset>

            <div className="space-y-1.5">
              <Label
                htmlFor="pi-email"
                className="text-sm font-semibold text-content-primary"
              >
                {t("interest_modal.email_label")}
              </Label>
              <Input
                id="pi-email"
                type="email"
                inputMode="email"
                maxLength={255}
                placeholder={t("interest_modal.email_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="pi-comment"
                className="text-sm font-semibold text-content-primary"
              >
                {t("interest_modal.comment_label")}
              </Label>
              <Textarea
                id="pi-comment"
                rows={3}
                maxLength={500}
                placeholder={t("interest_modal.comment_placeholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="text-sm text-signal-danger"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
              <p className="text-xs text-content-tertiary sm:max-w-[60%]">
                {t("interest_modal.rgpd")}
              </p>
              <Button
                type="submit"
                variant="primary"
                disabled={!wouldPay || submitting}
                className="sm:min-w-[180px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    {t("interest_modal.submitting")}
                  </>
                ) : (
                  t("interest_modal.submit")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RadioOption({
  id,
  value,
  label,
  checked,
}: {
  id: string;
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        checked
          ? "border-accent-primary/40 bg-accent-primary/5 text-content-primary"
          : "border-border-default bg-surface-elevated/40 text-content-secondary hover:border-accent-primary/30",
      )}
    >
      <RadioGroupItem id={id} value={value} className="size-4" />
      <span>{label}</span>
    </Label>
  );
}

function SuccessState({
  title,
  body,
  close,
  onClose,
}: {
  title: string;
  body: string;
  close: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5 text-center sm:text-left">
      <DialogHeader className="space-y-2 text-left">
        <DialogTitle className="font-fraunces text-2xl font-medium tracking-tight text-content-primary">
          {title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-content-secondary">
          {body}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="primary" onClick={onClose}>
          {close}
        </Button>
      </DialogFooter>
    </div>
  );
}