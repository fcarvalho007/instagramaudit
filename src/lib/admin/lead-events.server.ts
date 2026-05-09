/**
 * Server-only helpers for lead lifecycle mutations.
 * Wraps recordProductEvent + leads update so callers can stay declarative.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import {
  LIFECYCLE_STATUSES,
  type LifecycleStatus,
} from "./lead-lifecycle";

export interface RecordLeadEventInput {
  leadId: string;
  eventType: string;
  snapshotId?: string | null;
  handle?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordLeadEvent(input: RecordLeadEventInput): Promise<void> {
  await recordProductEvent({
    eventType: input.eventType,
    leadId: input.leadId,
    snapshotId: input.snapshotId ?? null,
    handle: input.handle ?? null,
    metadata: input.metadata,
  });
}

export interface UpdateLeadStatusInput {
  leadId: string;
  status: LifecycleStatus;
  source: "manual" | "auto" | "trigger";
  reason?: string;
}

export interface UpdateLeadStatusResult {
  ok: boolean;
  changed: boolean;
  previous: string | null;
  error?: string;
}

/**
 * Updates the commercial_status on a lead and emits a lead_status_changed
 * product event with the source so we can audit manual vs automatic moves.
 * No-op if the status is already set (still returns ok=true, changed=false).
 */
export async function updateLeadCommercialStatus(
  input: UpdateLeadStatusInput
): Promise<UpdateLeadStatusResult> {
  if (!LIFECYCLE_STATUSES.includes(input.status)) {
    return { ok: false, changed: false, previous: null, error: "Invalid status" };
  }

  const { data: existing, error: readErr } = await supabaseAdmin
    .from("leads")
    .select("commercial_status")
    .eq("id", input.leadId)
    .maybeSingle();

  if (readErr || !existing) {
    return {
      ok: false,
      changed: false,
      previous: null,
      error: readErr?.message ?? "Lead not found",
    };
  }

  const previous = existing.commercial_status as string | null;
  if (previous === input.status) {
    return { ok: true, changed: false, previous };
  }

  const updates: Record<string, unknown> = {
    commercial_status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.status === "arquivado") {
    updates.archived_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabaseAdmin
    .from("leads")
    .update(updates)
    .eq("id", input.leadId);

  if (updateErr) {
    return {
      ok: false,
      changed: false,
      previous,
      error: updateErr.message,
    };
  }

  await recordLeadEvent({
    leadId: input.leadId,
    eventType: "lead_status_changed",
    metadata: {
      previous_status: previous,
      new_status: input.status,
      source: input.source,
      reason: input.reason ?? null,
    },
  });

  return { ok: true, changed: true, previous };
}