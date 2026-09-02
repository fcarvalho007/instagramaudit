/**
 * Ronda 4 / Conversion UX 10B — motor único de conversão pós-valor.
 *
 * Um só componente serve os três pontos de entrada ("Guardar esta
 * auditoria", "Aprofundar a análise" e o CTA final): só a headline muda.
 * Pede um único campo (email), com opt-in de marketing separado e não
 * pré-seleccionado. Sem nome, sem password, sem onboarding de 3 passos.
 *
 * 10B — a pergunta de relação só aparece aqui quando não houve oportunidade
 * de qualificação durante o loading (ex.: cache hit rápido). Se o utilizador
 * já respondeu ou dispensou nessa sessão, não se repete a pergunta.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";
import type {
  ConversionEntryPoint,
  LeadCaptureResponse,
  UnlockStatusCode,
} from "@/lib/leads/lead-capture";
import { ProfileRelationshipField } from "@/components/conversion/profile-relationship-field";
import type { ProfileRelationship } from "@/lib/leads/profile-relationship";
import {
  QUALIFICATION_QUESTION_ID,
  clearQualificationPending,
  normalizeHandle,
  readQualification,
  writeQualification,
} from "@/lib/leads/qualification-session";

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
  const { t } = useTranslation("conversion");
  const isMobile = useIsMobile();

  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [unlockStatus, setUnlockStatus] = useState<UnlockStatusCode | null>(null);
  const [relationshipDone, setRelationshipDone] = useState(false);
  /** Estado da qualificação feita (ou dispensada) durante o loading. */
  const [askRelationship, setAskRelationship] = useState(false);
  const emailStartedRef = useRef(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const doneRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<{ cacheKey: string | null; grant: string | null }>({
    cacheKey: null,
    grant: null,
  });

  useEffect(() => {
    if (!open) return;
    trackAnonymousEvent("lead_capture_opened", {
      handle,
      snapshotId,
      metadata: { conversion_entry_point: entryPoint },
      dedupeKey: `${snapshotId}:${entryPoint}`,
    });
    // Só perguntamos aqui se a pergunta nunca apareceu no loading.
    setAskRelationship(readQualification(handle) === null);
  }, [open, entryPoint, handle, snapshotId]);

  // Desktop: foco no email ao abrir. Mobile: nunca — não forçar o teclado.
  useEffect(() => {
    if (!open || isMobile || phase !== "form") return;
    const id = window.setTimeout(() => emailInputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open, isMobile, phase]);

  useEffect(() => {
    if (phase !== "done" || isMobile) return;
    const id = window.setTimeout(() => doneRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [phase, isMobile]);

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

  const postRelationship = useCallback(
    async (relationship: ProfileRelationship) => {
      const { cacheKey, grant } = contextRef.current;
      if (!cacheKey) return;
      try {
        const res = await fetch("/api/public/report-relationship", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationship, cache_key: cacheKey, grant }),
        });
        if (res.ok) clearQualificationPending(handle);
      } catch {
        /* fail-soft: a qualificação nunca bloqueia o desbloqueio */
      }
    },
    [handle],
  );

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
          window.setTimeout(() => {
            emailInputRef.current?.focus();
            emailInputRef.current?.scrollIntoView({ block: "center" });
          }, 60);
          setError(
            body?.error === "RATE_LIMITED"
              ? t("errors.rate_limited")
              : body?.error === "INVALID_EMAIL"
                ? t("errors.invalid_email")
                : body?.error === "LEAD_CREATE_FAILED"
                  ? t("errors.lead_failed")
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

        contextRef.current = { cacheKey: body.cache_key, grant: body.grant };
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

        // Handoff 10B — relação declarada no loading é sincronizada agora.
        const stored = readQualification(handle);
        if (stored?.status === "answered" && stored.relationship) {
          void postRelationship(stored.relationship);
        } else if (stored === null) {
          trackAnonymousEvent("relationship_question_viewed", {
            handle,
            snapshotId,
            dedupeKey: snapshotId,
          });
        }
      } catch {
        setPhase("form");
        setError(t("errors.generic"));
        window.setTimeout(() => {
          emailInputRef.current?.focus();
          emailInputRef.current?.scrollIntoView({ block: "center" });
        }, 60);
      }
    },
    [email, entryPoint, handle, marketing, onUnlockStarted, phase, postRelationship, snapshotId, t],
  );

  const answerRelationship = async (relationship: ProfileRelationship | null) => {
    setRelationshipDone(true);
    if (!relationship) {
      writeQualification(handle, { status: "skipped" });
      trackAnonymousEvent("relationship_skipped", {
        handle,
        snapshotId,
        dedupeKey: snapshotId,
      });
      trackAnonymousEvent("qualification_skipped", {
        handle: normalizeHandle(handle),
        metadata: { question_id: QUALIFICATION_QUESTION_ID },
        dedupeKey: normalizeHandle(handle),
      });
      return;
    }
    writeQualification(handle, { status: "answered", relationship, pending: true });
    trackAnonymousEvent("relationship_answered", {
      handle,
      snapshotId,
      metadata: { relationship },
      dedupeKey: snapshotId,
    });
    trackAnonymousEvent("qualification_answered", {
      handle: normalizeHandle(handle),
      metadata: { question_id: QUALIFICATION_QUESTION_ID, relationship },
      dedupeKey: normalizeHandle(handle),
    });
    await postRelationship(relationship);
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
      case "snapshot_missing":
      case "error":
        return t("unlock.error");
      default:
        return t("unlock.saved");
    }
  })();

  const title = t(`headline.${entryPoint}`);
  const eyebrow = `@${handle.replace(/^@/, "")}`;

  const surfaceStyles = (
    <style>{`
      .cs-reveal { animation: cs-reveal-kf 220ms ease-out both; }
      .cs-reveal-delayed { animation-delay: 120ms; }
      @keyframes cs-reveal-kf {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .cs-reveal { animation: none; }
      }
    `}</style>
  );

  const body =
    phase === "done" ? (
      <div className="cs-reveal space-y-5" ref={doneRef} tabIndex={-1}>
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

        {!askRelationship ? null : relationshipDone ? (
          <p className="text-sm text-content-secondary">{t("relationship.thanks")}</p>
        ) : (
          <div className="cs-reveal cs-reveal-delayed">
            <p className="text-sm text-content-secondary">{t("relationship.intro")}</p>
            <div className="mt-3">
              <ProfileRelationshipField
                legend={t("relationship.question", { handle })}
                name="conversion-profile-relationship"
                onChange={(value) => void answerRelationship(value)}
              />
            </div>
            <button
              type="button"
              onClick={() => void answerRelationship(null)}
              className="mt-2 inline-flex min-h-11 items-center text-sm text-content-tertiary underline underline-offset-4 hover:text-content-secondary"
            >
              {t("relationship.skip")}
            </button>
          </div>
        )}
      </div>
    ) : (
      <form onSubmit={submit} className="space-y-4" aria-busy={phase === "submitting"}>
        <p className="text-sm leading-relaxed text-content-secondary">{t("subcopy")}</p>

        <ul className="grid gap-1.5">
          {(["posts", "formats", "comments"] as const).map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm text-content-secondary">
              <Check className="size-3.5 shrink-0 text-accent-primary" aria-hidden="true" />
              {t(`benefits.${key}`)}
            </li>
          ))}
        </ul>

        <div>
          <label
            htmlFor="conversion-email"
            className="text-eyebrow-sm text-content-secondary"
          >
            {t("email_label")}
          </label>
          <Input
            id="conversion-email"
            ref={emailInputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder={t("email_placeholder")}
            className="mt-1.5"
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? "conversion-email-error conversion-email-help" : "conversion-email-help"
            }
          />
          <p id="conversion-email-help" className="mt-1.5 text-xs text-content-tertiary">
            {t("email_help")}
          </p>
          {error ? (
            <p
              id="conversion-email-error"
              role="alert"
              className="mt-1.5 text-sm text-signal-error"
            >
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

        <Button
          type="submit"
          size="lg"
          disabled={phase === "submitting"}
          className="w-full text-sm font-semibold"
        >
          {phase === "submitting" ? t("submitting") : t("submit")}
        </Button>
        <p className="text-xs text-content-tertiary">{t("microcopy")}</p>
      </form>
    );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl border-border-default px-5 pb-8"
        >
          {surfaceStyles}
          <SheetHeader className="px-0 text-left">
            <span className="text-eyebrow-sm text-content-tertiary">{eyebrow}</span>
            <SheetTitle className="font-display text-xl">{title}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border-default sm:max-w-md sm:rounded-2xl">
        {surfaceStyles}
        <DialogHeader>
          <span className="text-eyebrow-sm text-content-tertiary">{eyebrow}</span>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
