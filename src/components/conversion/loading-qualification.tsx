/**
 * Conversion UX 10B — pergunta de qualificação anónima durante o loading.
 *
 * Bloco secundário, integrado no estado de espera (nunca modal, nunca
 * bloqueante). Só fica elegível após ~3 s de loading contínuo, desmonta
 * assim que o relatório fica pronto e respeita "Agora não" durante a sessão.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ProfileRelationshipField } from "@/components/conversion/profile-relationship-field";
import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";
import type { ProfileRelationship } from "@/lib/leads/profile-relationship";
import {
  QUALIFICATION_QUESTION_ID,
  normalizeHandle,
  readQualification,
  writeQualification,
} from "@/lib/leads/qualification-session";

export const QUALIFICATION_DELAY_MS = 3000;

export function LoadingQualification({
  handle,
  delayMs = QUALIFICATION_DELAY_MS,
}: {
  handle: string;
  delayMs?: number;
}) {
  const { t } = useTranslation("conversion");
  const normalized = useMemo(() => normalizeHandle(handle), [handle]);
  const [eligible, setEligible] = useState(false);
  const [resolved, setResolved] = useState<ProfileRelationship | "skipped" | null>(null);
  const [alreadyHandled, setAlreadyHandled] = useState(true);

  useEffect(() => {
    // Uma vez por handle durante a sessão activa.
    setAlreadyHandled(readQualification(normalized) !== null);
  }, [normalized]);

  useEffect(() => {
    if (alreadyHandled) return;
    const id = setTimeout(() => setEligible(true), delayMs);
    return () => clearTimeout(id);
  }, [alreadyHandled, delayMs]);

  const visible = eligible && !alreadyHandled;

  useEffect(() => {
    if (!visible) return;
    trackAnonymousEvent("qualification_prompt_viewed", {
      handle: normalized,
      metadata: { question_id: QUALIFICATION_QUESTION_ID },
      dedupeKey: normalized,
    });
  }, [visible, normalized]);

  if (!visible) return null;

  if (resolved) {
    return (
      <p className="text-center font-sans text-xs text-content-tertiary" role="status">
        {t("relationship.thanks")}
      </p>
    );
  }

  const answer = (relationship: ProfileRelationship) => {
    setResolved(relationship);
    writeQualification(normalized, {
      status: "answered",
      relationship,
      pending: true,
    });
    trackAnonymousEvent("qualification_answered", {
      handle: normalized,
      metadata: { question_id: QUALIFICATION_QUESTION_ID, relationship },
      dedupeKey: normalized,
    });
  };

  const skip = () => {
    setResolved("skipped");
    writeQualification(normalized, { status: "skipped" });
    trackAnonymousEvent("qualification_skipped", {
      handle: normalized,
      metadata: { question_id: QUALIFICATION_QUESTION_ID },
      dedupeKey: normalized,
    });
  };

  return (
    <div className="lq-enter w-full border-t border-border-default/70 pt-4">
      <style>{`
        .lq-enter { animation: lq-enter-kf 250ms ease-out both; }
        @keyframes lq-enter-kf {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lq-enter { animation: none; }
        }
      `}</style>
      <p className="text-center text-eyebrow-sm text-content-tertiary">
        {t("loading_qualification.eyebrow")}
      </p>
      <div className="mt-3">
        <ProfileRelationshipField
          legend={t("relationship.question", { handle: normalized })}
          name="loading-profile-relationship"
          compact
          onChange={answer}
        />
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={skip}
          className="inline-flex min-h-11 items-center px-3 text-xs text-content-tertiary underline underline-offset-4 hover:text-content-secondary"
        >
          {t("relationship.skip")}
        </button>
      </div>
    </div>
  );
}
