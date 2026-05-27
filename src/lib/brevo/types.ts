/**
 * Shared types for the Brevo integration. Client-safe — no env access,
 * no fetch, no secrets. Importable from anywhere.
 */

export type BrevoAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface UpsertBrevoContactInput {
  email: string;
  attributes?: BrevoAttributes;
  /** Optional override; defaults to [BREVO_LEAD_MAGNET_LIST_ID]. */
  listIds?: number[];
}

export type UpsertBrevoContactResult =
  | { ok: true; brevoId: number | null; status: number }
  | { ok: false; reason: string };

export type BrevoSyncReason =
  | "report_unlock"
  | "manual_resync"
  | "backfill"
  | "admin_conversion"
  | "payment_webhook";

export type BrevoSyncOutcome =
  | {
      ok: true;
      brevoId: number | null;
      status: number;
      latencyMs: number;
      manualAction?: string;
    }
  | {
      ok: false;
      reason: string;
      latencyMs: number;
      manualAction?: string;
    };