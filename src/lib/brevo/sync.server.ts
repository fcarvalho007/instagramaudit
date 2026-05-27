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
import {
  mapCommercialStatus,
  mapLeadSource,
  mapPricingPreference,
} from "./enum-mappers";
import { parseFullName } from "@/lib/names/parse-full-name";

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

export async function syncLeadToBrevo(
  leadId: string,
  reason: BrevoSyncReason,
): Promise<BrevoSyncOutcome> {
  const startedAt = Date.now();

  // Kill switch: BREVO_CONTACT_SYNC_ENABLED. Default ON; set to literal
  // "false" to disable Brevo contact sync without breaking unlock or report.
  if ((process.env.BREVO_CONTACT_SYNC_ENABLED ?? "true").trim().toLowerCase() === "false") {
    const outcome: BrevoSyncOutcome = {
      ok: false,
      reason: "DISABLED_BY_FLAG",
      latencyMs: Date.now() - startedAt,
    };
    try {
      await recordProductEvent({
        eventType: "brevo_contact_sync_skipped" as any,
        leadId,
        metadata: { reason, flag: "BREVO_CONTACT_SYNC_ENABLED" },
      });
    } catch (err) {
      console.error("[brevo-sync] failed to record skipped event:", err);
    }
    return outcome;
  }

  try {
    // 1. Load lead.
    const { data: lead, error: leadErr } = await (supabaseAdmin as any)
      .from("leads")
      .select(
        "id, email, name, phone, phone_normalized, source, commercial_status, profile_ownership, purpose, user_type, pricing_preference, marketing_consent",
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

    // Operational CRM mirror: o sync acontece após GDPR consent (precondição
    // do unlock). O atributo `MARKETING_CONSENT` regista o opt-in de
    // newsletter para segmentação futura — quem não opt-in fica no CRM com
    // a flag a false e NÃO é adicionado a listas de marketing.
    const marketingConsent = lead.marketing_consent === true;

    // Optional Brevo name/phone mapping (behind feature flag).
    const nameAttrsEnabled =
      (process.env.BREVO_NAME_PHONE_ATTRS_ENABLED ?? "false")
        .trim()
        .toLowerCase() === "true";
    const parsedName = nameAttrsEnabled ? parseFullName(lead.name) : null;
    const phoneE164: string | null = (() => {
      if (!nameAttrsEnabled) return null;
      const normalized =
        typeof lead.phone_normalized === "string" && lead.phone_normalized.trim().length > 0
          ? lead.phone_normalized.trim()
          : typeof lead.phone === "string" && lead.phone.trim().length > 0
            ? lead.phone.trim()
            : null;
      if (!normalized) return null;
      // Brevo SMS requires E.164 (must start with `+`). If we lack the
      // country prefix, skip rather than send an invalid value.
      return normalized.startsWith("+") ? normalized : null;
    })();

    // 2. Most recent report_request + 3. count, in parallel.
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

    // 4. Build payload.
    const attributes = {
      INSTAGRAM_HANDLE: handle,
      REPORTS_COUNT: typeof reportsCount === "number" ? reportsCount : null,
      LAST_REPORT_URL: reportSnapshotId
        ? `${baseUrl}/reports/${encodeURIComponent(reportSnapshotId)}`
        : handle
          ? `${baseUrl}/analyze/${handle}`
          : null,
      LAST_REPORT_AT: latestRR?.created_at ?? new Date().toISOString(),
      PROFILE_OWNERSHIP: lead.profile_ownership ?? null,
      GOAL: lead.purpose ?? null,
      USER_TYPE: lead.user_type ?? null,
      PRICING_PREFERENCE: mapPricingPreference(lead.pricing_preference),
      LEAD_SOURCE: mapLeadSource(lead.source as string | null),
      COMMERCIAL_STATUS: mapCommercialStatus(
        lead.commercial_status as string | null,
        "lead",
      ),
      IS_CUSTOMER: false,
      MARKETING_CONSENT: marketingConsent,
      ...(parsedName
        ? {
            FIRSTNAME: parsedName.first_name || null,
            LASTNAME: parsedName.last_name,
          }
        : {}),
      ...(phoneE164 ? { SMS: phoneE164 } : {}),
    };

    // 5. Call Brevo.
    const res = await upsertBrevoContact({
      email: lead.email,
      attributes,
    });

    const latencyMs = Date.now() - startedAt;

    // If the flag is ON and the lead has a phone we couldn't normalize to
    // E.164, log it so we can audit and ask for country prefix upstream.
    const phoneSkippedReason =
      nameAttrsEnabled &&
      !phoneE164 &&
      ((typeof lead.phone === "string" && lead.phone.trim().length > 0) ||
        (typeof lead.phone_normalized === "string" &&
          lead.phone_normalized.trim().length > 0))
        ? "PHONE_NOT_E164"
        : undefined;
    if (phoneSkippedReason) {
      try {
        await recordProductEvent({
          eventType: "brevo_contact_sync_skipped" as any,
          leadId,
          metadata: {
            sync_reason: reason,
            skipped_field: "phone",
            reason: phoneSkippedReason,
          },
        });
      } catch (err) {
        console.error("[brevo-sync] failed to record phone-skip event:", err);
      }
    }
    const manualAction = phoneSkippedReason;

    if (!res.ok) {
      const outcome: BrevoSyncOutcome = {
        ok: false,
        reason: res.reason,
        latencyMs,
        manualAction,
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
          marketing_consent: marketingConsent,
          sms_sent: !!phoneE164,
          name_attrs_sent: !!parsedName,
          ...(phoneSkippedReason
            ? { sms_skipped_reason: phoneSkippedReason }
            : {}),
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
      manualAction,
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