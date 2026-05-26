/**
 * Brevo paid-customer sync orchestrator.
 *
 * `syncCustomerToBrevo(leadId, reason)` mirrors a converted lead into Brevo
 * with `IS_CUSTOMER=true` and `COMMERCIAL_STATUS=convertido`.
 *
 * - Reads source-of-truth from Supabase (lead + latest report_request + count).
 * - Adds the contact to BREVO_PAID_CUSTOMERS_LIST_ID when defined; otherwise
 *   falls back to the default lead-magnet list via upsertBrevoContact.
 * - Records `brevo_customer_synced` / `brevo_customer_sync_failed`.
 * - Never throws. Designed to be fire-and-forget from the admin PATCH.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";

import { upsertBrevoContact } from "./contacts.server";
import type { BrevoSyncOutcome, BrevoSyncReason } from "./types";
import { mapLeadSource, mapPricingPreference } from "./enum-mappers";

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
    "https://auditprofiles.com"
  )
    .trim()
    .replace(/\/+$/, "");
}

function resolvePaidListIds(): number[] | undefined {
  const raw = process.env.BREVO_PAID_CUSTOMERS_LIST_ID?.trim();
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return [parsed];
}

export async function syncCustomerToBrevo(
  leadId: string,
  reason: BrevoSyncReason,
): Promise<BrevoSyncOutcome> {
  const startedAt = Date.now();

  try {
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
        reason: leadErr
          ? `LEAD_LOAD_ERROR:${leadErr.message ?? "unknown"}`
          : "LEAD_NOT_FOUND",
        latencyMs: Date.now() - startedAt,
      };
      await safeRecordFailure(leadId, null, reason, outcome);
      return outcome;
    }

    const [{ data: latestRR }, { count: reportsCount }] = await Promise.all([
      (supabaseAdmin as any)
        .from("report_requests")
        .select(
          "id, instagram_username, analysis_snapshot_id, report_snapshot_id, created_at",
        )
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
    const reportSnapshotId: string | null =
      latestRR?.report_snapshot_id ?? null;
    const baseUrl = resolveBaseUrl();
    const nowIso = new Date().toISOString();
    const plan: string | null = lead.pricing_preference ?? null;
    const paidListIds = resolvePaidListIds();

    const attributes = {
      INSTAGRAM_HANDLE: handle,
      REPORTS_COUNT: typeof reportsCount === "number" ? reportsCount : null,
      LAST_REPORT_URL: reportSnapshotId
        ? `${baseUrl}/reports/${encodeURIComponent(reportSnapshotId)}`
        : handle
          ? `${baseUrl}/analyze/${handle}`
          : null,
      LAST_REPORT_AT: latestRR?.created_at ?? nowIso,
      PROFILE_OWNERSHIP: lead.profile_ownership ?? null,
      GOAL: lead.purpose ?? null,
      USER_TYPE: lead.user_type ?? null,
      PRICING_PREFERENCE: mapPricingPreference(lead.pricing_preference),
      LEAD_SOURCE: mapLeadSource(lead.source as string | null),
      COMMERCIAL_STATUS: 2, // customer
      IS_CUSTOMER: true,
      PLAN: plan,
      LAST_PAYMENT_AT: nowIso,
    };

    const res = await upsertBrevoContact({
      email: lead.email,
      attributes,
      listIds: paidListIds,
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

    try {
      await recordProductEvent({
        eventType: "brevo_customer_synced",
        leadId,
        snapshotId: latestRR?.analysis_snapshot_id ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          sync_reason: reason,
          brevo_id: res.brevoId,
          status: res.status,
          latency_ms: latencyMs,
          email_masked: maskEmail(lead.email),
          list_id: paidListIds?.[0] ?? null,
          plan,
          reports_count: typeof reportsCount === "number" ? reportsCount : null,
        },
      });
    } catch (eventErr) {
      console.error("[brevo-customer-sync] failed to record success event:", eventErr);
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
      eventType: "brevo_customer_sync_failed",
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
    console.error("[brevo-customer-sync] failed to record failure event:", eventErr);
  }
}