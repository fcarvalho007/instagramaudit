/**
 * Conversion UX 10B — estado de sessão da qualificação anónima.
 *
 * Guarda apenas estado temporário de experiência em `sessionStorage`:
 * se a pergunta de relação já foi respondida ou dispensada para um handle
 * durante a sessão activa. Não cria lead, conta, linha em BD nem cookie.
 *
 * CROSS-SESSION FREQUENCY CAP: NOT IMPLEMENTED — ver plano 10B.
 */

import {
  isProfileRelationship,
  type ProfileRelationship,
} from "@/lib/leads/profile-relationship";

export const QUALIFICATION_QUESTION_ID = "profile_relationship_v1";

const PREFIX = "auditprofiles:qualification:v1:";
const VERSION = 1;

export type QualificationStatus = "answered" | "skipped";

export interface QualificationSessionState {
  question_id: string;
  handle: string;
  status: QualificationStatus;
  relationship?: ProfileRelationship;
  /** Sincronização pendente com `/api/public/report-relationship`. */
  pending?: boolean;
  timestamp: number;
  version: number;
}

export function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function keyFor(handle: string): string {
  return `${PREFIX}${normalizeHandle(handle)}`;
}

export function readQualification(handle: string): QualificationSessionState | null {
  if (typeof window === "undefined" || !handle) return null;
  try {
    const raw = window.sessionStorage.getItem(keyFor(handle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QualificationSessionState>;
    if (parsed?.status !== "answered" && parsed?.status !== "skipped") return null;
    if (parsed.version !== VERSION) return null;
    return {
      question_id: parsed.question_id ?? QUALIFICATION_QUESTION_ID,
      handle: normalizeHandle(handle),
      status: parsed.status,
      relationship: isProfileRelationship(parsed.relationship)
        ? parsed.relationship
        : undefined,
      pending: parsed.pending === true,
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
      version: VERSION,
    };
  } catch {
    return null;
  }
}

export function writeQualification(
  handle: string,
  state: Pick<QualificationSessionState, "status" | "relationship" | "pending">,
): void {
  if (typeof window === "undefined" || !handle) return;
  const payload: QualificationSessionState = {
    question_id: QUALIFICATION_QUESTION_ID,
    handle: normalizeHandle(handle),
    status: state.status,
    ...(state.relationship ? { relationship: state.relationship } : {}),
    ...(state.pending ? { pending: true } : {}),
    timestamp: Date.now(),
    version: VERSION,
  };
  try {
    window.sessionStorage.setItem(keyFor(handle), JSON.stringify(payload));
  } catch {
    /* ignore — o estado é apenas conveniência de UX */
  }
}

/** Marca a sincronização como concluída (deixa de estar pendente). */
export function clearQualificationPending(handle: string): void {
  const current = readQualification(handle);
  if (!current) return;
  writeQualification(handle, {
    status: current.status,
    relationship: current.relationship,
    pending: false,
  });
}
