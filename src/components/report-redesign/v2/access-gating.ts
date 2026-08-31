/**
 * Pure access-gating rules for the commercial sections of the report.
 *
 * Extracted from `report-block-nav.tsx` so the A/B/C state matrix can be
 * asserted in tests without rendering React. No behaviour change — the
 * nav imports these helpers and keeps its own presentation logic.
 *
 * Estados:
 *   A — Auditoria Instantânea (anónimo):      leadCaptured=false, premium=false
 *   B — Análise Aprofundada (email):          leadCaptured=true,  premium=false
 *   C — Pro:                                  premium=true
 */

import type { CommercialSection } from "./block-config";

export type AccessState = "accessible" | "locked";
export type Group = "incluido" | "premium";
export type AccessBadge = "free" | "free_email" | "included" | "premium";

export interface SectionAccess {
  access: AccessState;
  accessBadge: AccessBadge;
  group: Group;
}

export function resolveSectionAccess(
  tier: CommercialSection["tier"],
  premiumUnlocked: boolean,
  leadCaptured: boolean,
): SectionAccess {
  // `free_email` = Conversas (Comment Intelligence): gratuito, mas só
  // acessível depois da captura de email.
  const unlockedForUser =
    tier === "free" ||
    premiumUnlocked ||
    (tier === "free_email" && leadCaptured);

  const accessBadge: AccessBadge =
    tier === "free"
      ? "free"
      : tier === "free_email"
        ? leadCaptured
          ? "free"
          : "free_email"
        : "premium";

  return {
    access: unlockedForUser ? "accessible" : "locked",
    // When Pro is unlocked, every section sits in the "available now" list.
    group: unlockedForUser ? "incluido" : "premium",
    accessBadge,
  };
}
