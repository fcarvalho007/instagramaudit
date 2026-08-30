/**
 * Ronda 4 — motor único de conversão pós-valor.
 *
 * Um só componente serve os três pontos de entrada ("Guardar esta
 * auditoria", "Aprofundar a análise" e o CTA final): só a headline muda.
 * Pede um único campo (email), com opt-in de marketing separado e não
 * pré-seleccionado. Sem nome, sem password, sem onboarding de 3 passos.
 *
 * Depois da submissão o utilizador fica na mesma página: mostramos o estado
 * real do desbloqueio e, em paralelo, a pergunta contextual de relação —
 * que nunca bloqueia o Comment Intelligence.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";
import type {
  ConversionEntryPoint,
  LeadCaptureResponse,
  UnlockStatusCode,
} from "@/lib/leads/lead-capture";
import {
  PROFILE_RELATIONSHIPS,
  PROFILE_RELATIONSHIP_LABELS_EN,
  PROFILE_RELATIONSHIP_LABELS_PT,
  type ProfileRelationship,
} from "@/lib/leads/profile-relationship";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Phase = "form" | "submitting" | "done";

export interface ConversionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryPoint: ConversionEntryPoint;
  handle: string;
  snapshotId: string;
  /** Notifica o relatório de que o Nível 2 arrancou (para polling do bloco). */
  onUnlockStarted?: (cacheKey: string) => void;
}

export function ConversionSheet({
  open,
  onOpenChange,
  entryPoint,
  handle,
  snapshotId,
  onUnlockStarted,
}: ConversionSheetProps) {
  const { t, i18n } = useTranslation("conversion");
  const isMobile = useIsMobile();

  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [unlockStatus, setUnlockStatus] = useState<UnlockStatusCode | null>(null);
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [grant, setGrant] = useState<string | null>(null);
  const [relationshipDone, setRelationshipDone] = useState(false);
  const emailStartedRef = useRef(false);

  const relationshipLabels = useMemo(
    () =>
      i18n.language?.startsWith("en")
        ? PROFILE_RELATIONSHIP_LABELS_EN
        : PROFILE_RELATIONSHIP_LABELS_PT,
    [i18n.language],
  );

  useEffect(() => {
    if (!open) return;
    trackAnonymousEvent("lead_capture_opened", {
      handle,
      snapshotId,
      metadata: { conversion_entry_point: entryPoint },
      dedupeKey: `${snapshotId}:${entryPoint}`,
    });
  }, [open, entryPoint, handle, snapshotId]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!emailStartedRef.current && value.trim().length > 0) {
      emailStartedRef.current = true;
      trackAnonymousEvent("email_field_started", {
        handle,
        snapshotId,
        metadata: { conversion_entry_point: entryPoint },
        dedupeKey: snapshotId,
      });
    }
  };

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (phase === "submitting") return;
      const value = email.trim();
      if (!EMAIL_RE.test(value)) {
        setError(t("errors.invalid_email"));
        trackAnonymousEvent("email_validation_failed", {
          handle,
          snapshotId,
          metadata: { conversion_entry_point: entryPoint },
        });
        return;
      }
      setError(null);
      setPhase("submitting");
      trackAnonymousEvent("email_submitted", {
        handle,
        snapshotId,
        metadata: { conversion_entry_point: entryPoint },
      });
      // Fecha o teclado em mobile e devolve o contexto do relatório.
      (document.activeElement as HTMLElement | null)?.blur?.();

      try {
        const res = await fetch("/api/public/lead-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: value,
            handle,
            marketing_consent: marketing,
            entry_point: entryPoint,
          }),
        });
        const body = (await res.json().catch(() => null)) as
          | (LeadCaptureResponse & { error?: string })
          | null;

        if (!res.ok || !body?.ok) {
          setPhase("form");
          setError(
            body?.error === "RATE_LIMITED"
              ? t("errors.rate_limited")
              : body?.error === "INVALID_EMAIL"
                ? t("errors.invalid_email")
                : t("errors.generic"),
          );
          return;
        }

        trackAnonymousEvent(
          body.lead_status === "created" ? "lead_created" : "existing_lead_detected",
          {
            handle,
            snapshotId,
            metadata: { conversion_entry_point: entryPoint },
            dedupeKey: snapshotId,
          },
        );
        if (body.claimed) {
          trackAnonymousEvent("snapshot_claimed", {
            handle,
            snapshotId,
            dedupeKey: snapshotId,
          });
        }

        setCacheKey(body.cache_key);
        setGrant(body.grant);
        setUnlockStatus(body.unlock?.status ?? "unavailable");

        const status = body.unlock?.status;
        if (status === "queued" || status === "pending") {
          trackAnonymousEvent("level2_unlock_started", {
            handle,
            snapshotId,
            metadata: { conversion_entry_point: entryPoint },
            dedupeKey: snapshotId,
          });
          trackAnonymousEvent("comment_intelligence_started", {
            handle,
            snapshotId,
            dedupeKey: snapshotId,
          });
          if (body.cache_key) onUnlockStarted?.(body.cache_key);
        } else if (status === "already_available") {
          trackAnonymousEvent("comment_intelligence_success", {
            handle,
            snapshotId,
            dedupeKey: snapshotId,
          });
        } else if (status === "error" || status === "degraded") {
          trackAnonymousEvent("comment_intelligence_failed", {
            handle,
            snapshotId,
            metadata: { reason: body.unlock?.reason ?? body.unlock?.error ?? status },
            dedupeKey: snapshotId,
          });
        }

        setPhase("done");
        trackAnonymousEvent("relationship_question_viewed", {
          handle,
          snapshotId,
          dedupeKey: snapshotId,
        });
      } catch {
        setPhase("form");
        setError(t("errors.generic"));
      }
    },
    [email, entryPoint, handle, marketing, onUnlockStarted, phase, snapshotId, t],
  );

  const answerRelationship = async (relationship: ProfileRelationship | null) => {
    setRelationshipDone(true);
    if (!relationship) {
      trackAnonymousEvent("relationship_skipped", {
        handle,
        snapshotId,
        dedupeKey: snapshotId,
      });
      return;
    }
    trackAnonymousEvent("relationship_answered", {
      handle,
      snapshotId,
      metadata: { relationship },
      dedupeKey: snapshotId,
    });
    if (!cacheKey) return;
    try {
      await fetch("/api/public/report-relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship, cache_key: cacheKey, grant }),
      });
    } catch {
      /* fail-soft: a qualificação nunca bloqueia o desbloqueio */
    }
  };

  const unlockMessage = (() => {
    switch (unlockStatus) {
      case "queued":
      case "pending":
        return t("unlock.processing");
      case "already_available":
        return t("unlock.available");
      case "degraded":
        return t("unlock.degraded");
      case "error":
        return t("unlock.error");
      default:
        return t("unlock.saved");
    }
  })();

  const title = t(`headline.${entryPoint}`);

  const body =
    phase === "done" ? (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-muted px-4 py-3">
          {unlockStatus === "queued" || unlockStatus === "pending" ? (
            <Loader2
              className="mt-0.5 size-4 shrink-0 animate-spin text-accent-primary"
              aria-hidden="true"
            />
          ) : (
            <Check className="mt-0.5 size-4 shrink-0 text-accent-primary" aria-hidden="true" />
          )}
          <p className="text-sm text-content-secondary" role="status">
            {unlockMessage}
          </p>
        </div>

        {relationshipDone ? (
          <p className="text-sm text-content-secondary">{t("relationship.thanks")}</p>
        ) : (
          <div>
            <p className="text-sm text-content-secondary">{t("relationship.intro")}</p>
            <p className="mt-1 text-base font-semibold text-content-primary">
              {t("relationship.question", { handle })}
            </p>
            <div className="mt-3 grid gap-2">
              {PROFILE_RELATIONSHIPS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => void answerRelationship(option)}
                  className="rounded-lg border border-border-default bg-surface-secondary px-4 py-2.5 text-left text-sm text-content-primary transition hover:border-accent-primary/60"
                >
                  {relationshipLabels[option]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void answerRelationship(null)}
              className="mt-3 text-sm text-content-tertiary underline underline-offset-4"
            >
              {t("relationship.skip")}
            </button>
          </div>
        )}
      </div>
    ) : (
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-relaxed text-content-secondary">{t("subcopy")}</p>
        <div>
          <label
            htmlFor="conversion-email"
            className="text-eyebrow-sm text-content-secondary"
          >
            {t("email_label")}
          </label>
          <Input
            id="conversion-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder={t("email_placeholder")}
            className="mt-1.5"
            aria-invalid={error ? true : undefined}
          />
          {error ? (
            <p role="alert" className="mt-1.5 text-sm text-signal-error">
              {error}
            </p>
          ) : null}
        </div>

        <label className="flex items-start gap-2.5 text-sm text-content-secondary">
          <Checkbox
            checked={marketing}
            onCheckedChange={(v) => setMarketing(v === true)}
            className="mt-0.5"
          />
          <span>{t("marketing_optin")}</span>
        </label>

        <button
          type="submit"
          disabled={phase === "submitting"}
          className="w-full rounded-lg bg-accent-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-primary/90 disabled:opacity-60"
        >
          {phase === "submitting" ? t("submitting") : t("submit")}
        </button>
        <p className="text-xs text-content-tertiary">{t("microcopy")}</p>
      </form>
    );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl px-5 pb-8"
        >
          <SheetHeader className="px-0 text-left">
            <SheetTitle className="font-display text-xl">{title}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
