/**
 * Ronda 4 — tipos e constantes partilhados da captura de lead pós-valor.
 * Client-safe: sem imports de servidor.
 */

export const CONVERSION_ENTRY_POINTS = [
  "save_audit",
  "comment_intelligence",
  "report_end",
] as const;

export type ConversionEntryPoint = (typeof CONVERSION_ENTRY_POINTS)[number];

/** Versão da copy de consentimento operacional (guardar/entregar auditoria). */
export const OPERATIONAL_CONSENT_VERSION = "2026-08-round4-operational";
/** Versão da copy do opt-in de marketing, registada em separado. */
export const MARKETING_CONSENT_VERSION = "2026-08-round4-marketing";

export type UnlockStatusCode =
  | "queued"
  | "pending"
  | "already_available"
  | "degraded"
  | "error"
  | "unavailable"
  | "snapshot_missing";

export interface LeadCaptureResponse {
  ok: true;
  lead_status: "created" | "existing";
  scoped: boolean;
  claimed: boolean;
  associated: boolean;
  cache_key: string | null;
  grant: string | null;
  unlock: { status: UnlockStatusCode; reason?: string; error?: string };
}
