/**
 * Typed query helpers for the `report_requests` table.
 *
 * Convention for this folder (`src/integrations/supabase/queries/`):
 *   - one file per domain entity
 *   - small, typed, single-purpose functions
 *   - UI never calls `supabase.from()` directly — always go through these helpers
 *
 * This keeps the data layer swappable (e.g., moving to RPCs or edge functions)
 * without touching consumer components.
 */

import { supabase } from "../client";
import type { TablesInsert } from "../types";

export type ReportRequestInsert = TablesInsert<"report_requests">;

export interface InsertReportRequestResult {
  error: Error | null;
}

export async function insertReportRequest(
  payload: ReportRequestInsert,
): Promise<InsertReportRequestResult> {
  const { error } = await supabase.from("report_requests").insert(payload);
  return { error: error ? new Error(error.message) : null };
}
