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

/** Versão da copy de consentimento registada com o opt-in. */
export const MARKETING_CONSENT_VERSION = "2026-08-round4";

export type UnlockStatusCode =
  | "queued"
  | "pending"
  | "already_available"
  | "degraded"
  | "error"
  | "unavailable";

export interface LeadCaptureResponse {
  ok: true;
  lead_status: "created" | "existing";
  scoped: boolean;
  claimed: boolean;
  cache_key: string | null;
  grant: string | null;
  unlock: { status: UnlockStatusCode; reason?: string; error?: string };
}
