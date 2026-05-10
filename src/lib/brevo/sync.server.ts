/**
 * Brevo lead → contact sync orchestrator.
 *
 * `syncLeadToBrevo(leadId, reason)` is the single entry point used by the
 * unlock flow (and future backfills). It:
 *
 * 1. Loads the lead from Supabase (source of truth).
 * 2. Loads the most recent linked report_request.
 * 3. Counts total report_requests for the lead.
 * 4. Builds the 11-attribute payload.
 * 5. Calls upsertBrevoContact.
 * 6. Records `brevo_contact_synced` or `brevo_contact_sync_failed` in
 *    product_events with masked email + latency + reason.
 *
 * Never throws. Designed to be called fire-and-forget from unlock.server.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";

import { upsertBrevoContact } from "./contacts.server";
import type { BrevoSyncOutcome, BrevoSyncReason } from "./types";

function maskEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

function resolveBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    "https://instagramaudit.lovable.app"
  )
    .trim()
    .replace(/\/+$/, "");
}

export async function syncLeadToBrevo(
  leadId: string,
  reason: BrevoSyncReason,
): Promise<BrevoSyncOutcome> {
  const startedAt = Date.now();

  try {
    // 1. Load lead.
    const { data: lead, error: leadErr } = await (supabaseAdmin as any)
      .from("leads")
      .select(
        "id, email, source, commercial_status, profile_ownership, purpose, user_type, pricing_preference",
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead?.email) {
      const outcome: BrevoSyncOutcome = {
        ok: false,
        reason: leadErr ? `LEAD_LOAD_ERROR:${leadErr.message ?? "unknown"}` : "LEAD_NOT_FOUND",
        latencyMs: Date.now() - startedAt,
      };
      await safeRecordFailure(leadId, null, reason, outcome);
      return outcome;
    }

    // 2. Most recent report_request + 3. count, in parallel.
    const [{ data: latestRR }, { count: reportsCount }] = await Promise.all([
      (supabaseAdmin as any)
        .from("report_requests")
        .select("id, instagram_username, analysis_snapshot_id, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("report_requests")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", leadId),
    ]);

    const handle: string | null = latestRR?.instagram_username ?? null;
    const baseUrl = resolveBaseUrl();

    // 4. Build payload.
    const attributes = {
      INSTAGRAM_HANDLE: handle,
      REPORTS_COUNT: typeof reportsCount === "number" ? reportsCount : null,
      LAST_REPORT_URL: handle ? `${baseUrl}/analyze/${handle}` : null,
      LAST_REPORT_AT: latestRR?.created_at ?? new Date().toISOString(),
      PROFILE_OWNERSHIP: lead.profile_ownership ?? null,
      GOAL: lead.purpose ?? null,
      USER_TYPE: lead.user_type ?? null,
      PRICING_PREFERENCE: lead.pricing_preference ?? null,
      LEAD_SOURCE: (lead.source as string | null) ?? "public_report_unlock",
      COMMERCIAL_STATUS: (lead.commercial_status as string | null) ?? null,
      IS_CUSTOMER: false,
    };

    // 5. Call Brevo.
    const res = await upsertBrevoContact({
      email: lead.email,
      attributes,
    });

    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const outcome: BrevoSyncOutcome = {
        ok: false,
        reason: res.reason,
        latencyMs,
      };
      await safeRecordFailure(
        leadId,
        latestRR?.analysis_snapshot_id ?? null,
        reason,
        outcome,
        { email: lead.email, handle },
      );
      return outcome;
    }

    // 6. Success event.
    try {
      await recordProductEvent({
        eventType: "brevo_contact_synced",
        leadId,
        snapshotId: latestRR?.analysis_snapshot_id ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          sync_reason: reason,
          brevo_id: res.brevoId,
          status: res.status,
          latency_ms: latencyMs,
          email_masked: maskEmail(lead.email),
          reports_count: typeof reportsCount === "number" ? reportsCount : null,
        },
      });
    } catch (eventErr) {
      console.error("[brevo-sync] failed to record success event:", eventErr);
    }

    return {
      ok: true,
      brevoId: res.brevoId,
      status: res.status,
      latencyMs,
    };
  } catch (err) {
    const outcome: BrevoSyncOutcome = {
      ok: false,
      reason: `SYNC_UNEXPECTED:${err instanceof Error ? err.message : "unknown"}`,
      latencyMs: Date.now() - startedAt,
    };
    await safeRecordFailure(leadId, null, reason, outcome);
    return outcome;
  }
}

async function safeRecordFailure(
  leadId: string,
  snapshotId: string | null,
  reason: BrevoSyncReason,
  outcome: Extract<BrevoSyncOutcome, { ok: false }>,
  extra?: { email?: string | null; handle?: string | null },
): Promise<void> {
  try {
    await recordProductEvent({
      eventType: "brevo_contact_sync_failed",
      leadId,
      snapshotId: snapshotId ?? undefined,
      handle: extra?.handle ?? undefined,
      metadata: {
        sync_reason: reason,
        reason: outcome.reason,
        latency_ms: outcome.latencyMs,
        email_masked: maskEmail(extra?.email ?? null),
      },
    });
  } catch (eventErr) {
    console.error("[brevo-sync] failed to record failure event:", eventErr);
  }
}