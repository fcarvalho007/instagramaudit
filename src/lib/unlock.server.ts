/**
 * Server-only helper for the public report unlock flow.
 *
 * Captures email + progressive disclosure answers, reuses or creates a
 * lead by `email_normalized`, links a `report_request` to the analysis
 * snapshot, and emits product events. Idempotent for `(email, snapshot)`.
 *
 * No providers, no email sending, no auth. Pure persistence + events.
 */

import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import { ensureReportSnapshotForRequest } from "@/lib/report-snapshots/persist-report-snapshot.server";
import { parseFullName } from "@/lib/names/parse-full-name";

export const PROFILE_OWNERSHIPS = [
  "own_profile",
  "brand_profile",
  "client_profile",
  "competitor_research",
  "curiosity",
] as const;

export const GOALS = [
  "improve_content",
  "benchmark_competitors",
  "client_report",
  "grow_audience",
  "validate_brand",
  "other",
] as const;

export const USER_TYPES = [
  "creator",
  "brand",
  "agency",
  "consultant",
  "ecommerce",
  "student",
  "other",
] as const;

export const reportUnlockSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    instagram_username: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .transform((v) => v.replace(/^@/, "").toLowerCase()),
    analysis_snapshot_id: z.string().uuid(),
    profile_ownership: z.enum(PROFILE_OWNERSHIPS).optional(),
    goal: z.enum(GOALS).optional(),
    user_type: z.enum(USER_TYPES).optional(),
    pricing_preference: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    full_name: z.string().trim().min(2).max(120).optional(),
    first_name: z.string().trim().min(1).max(60).optional(),
    last_name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(3).max(40).optional(),
    goal_other_text: z.string().trim().min(1).max(80).optional(),
    user_type_other_text: z.string().trim().min(1).max(80).optional(),
    gdpr_consent: z.boolean().optional(),
    marketing_consent: z.boolean().optional(),
  })
  .strict();

export type ReportUnlockInput = z.infer<typeof reportUnlockSchema>;

export interface ReportUnlockSuccess {
  success: true;
  lead_id: string;
  report_request_id: string;
  returning_lead: boolean;
  access_state: "unlocked";
  created_report_request: boolean;
}

export interface ReportUnlockFailure {
  success: false;
  status: 400 | 404 | 500;
  error: "INVALID_PAYLOAD" | "SNAPSHOT_NOT_FOUND" | "INTERNAL_ERROR";
  issues?: unknown;
}

export type ReportUnlockResult = ReportUnlockSuccess | ReportUnlockFailure;

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const head = user.slice(0, 1);
  return `${head}***@${domain}`;
}

/**
 * Minimal phone normaliser — keeps a leading `+` and digits only.
 * Returns null when the result is empty or too short to be useful.
 * No libphonenumber dependency; we store the raw value in `leads.phone`
 * for CRM display and the cleaned value in `leads.phone_normalized` for
 * future dedup/match.
 */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  const out = hasPlus ? `+${digits}` : digits;
  return out.length >= 4 ? out : null;
}

function deriveFirstName(data: {
  first_name?: string;
  full_name?: string;
  name?: string;
}): string | null {
  if (data.first_name && data.first_name.trim()) return data.first_name.trim();
  const parsed = parseFullName(data.full_name ?? data.name ?? "");
  return parsed.first_name || null;
}

function deriveLeadName(data: {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}): string {
  if (data.full_name && data.full_name.trim()) return data.full_name.trim();
  if (data.first_name && data.first_name.trim()) {
    const last = data.last_name?.trim();
    return last ? `${data.first_name.trim()} ${last}` : data.first_name.trim();
  }
  if (data.name && data.name.trim()) return data.name.trim();
  return "Sem nome";
}

/**
 * Defensive event dedup window — same `(snapshot_id, lead_id, event_type)`
 * within 5s is treated as a duplicate (StrictMode, double-click, retries).
 */
async function isDuplicateEventRecent(params: {
  eventType: string;
  leadId: string;
  snapshotId: string;
}): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 5_000).toISOString();
    const { data } = await (supabaseAdmin as any)
      .from("product_events")
      .select("id")
      .eq("event_type", params.eventType)
      .eq("snapshot_id", params.snapshotId)
      .eq("lead_id", params.leadId)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Process a public report unlock submission.
 *
 * Flow:
 *  1. Validate payload (Zod, strict).
 *  2. Verify the snapshot exists.
 *  3. Lookup lead by `email_normalized`. If found, conservatively fill
 *     missing qualification fields. If not, create with `source = public_report_unlock`.
 *  4. Lookup `(lead_id, analysis_snapshot_id)` in `report_requests`.
 *     If missing, INSERT with `request_source = public_unlock`,
 *     `request_status = unlocked`. If present, merge metadata (no overwrite).
 *  5. Emit `unlock_email_submitted`, `unlock_completed`,
 *     `returning_lead_detected` (when applicable), and
 *     `report_saved_to_account` (only on first INSERT).
 */
export async function processReportUnlock(
  rawInput: unknown,
): Promise<ReportUnlockResult> {
  // 1. Validate
  const parsed = reportUnlockSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      status: 400,
      error: "INVALID_PAYLOAD",
      issues: parsed.error.flatten(),
    };
  }
  const data = parsed.data;
  const emailNormalized = data.email; // already lowercased + trimmed by Zod

  try {
    // 2. Verify snapshot
    const { data: snap } = await (supabaseAdmin as any)
      .from("analysis_snapshots")
      .select("id")
      .eq("id", data.analysis_snapshot_id)
      .maybeSingle();
    if (!snap) {
      return { success: false, status: 404, error: "SNAPSHOT_NOT_FOUND" };
    }

    // 3. Find or create lead
    const { data: existingLead } = await (supabaseAdmin as any)
      .from("leads")
      .select(
        "id, user_type, purpose, profile_ownership, pricing_preference, name, phone, phone_normalized, beta_consent, marketing_consent",
      )
      .eq("email_normalized", emailNormalized)
      .maybeSingle();

    let leadId: string;
    const returningLead = Boolean(existingLead);

    if (existingLead) {
      leadId = existingLead.id as string;

      // Conservative update: only fill NULL/empty fields.
      const patch: Record<string, unknown> = {};
      const fieldsUpdated: string[] = [];
      if (!existingLead.user_type && data.user_type) {
        patch.user_type = data.user_type;
        fieldsUpdated.push("user_type");
      }
      if (!existingLead.purpose && data.goal) {
        patch.purpose = data.goal;
        fieldsUpdated.push("purpose");
      }
      if (!existingLead.profile_ownership && data.profile_ownership) {
        patch.profile_ownership = data.profile_ownership;
        fieldsUpdated.push("profile_ownership");
      }
      if (!existingLead.pricing_preference && data.pricing_preference) {
        patch.pricing_preference = data.pricing_preference;
        fieldsUpdated.push("pricing_preference");
      }
      if (!existingLead.phone && data.phone) {
        patch.phone = data.phone;
        patch.phone_normalized = normalizePhone(data.phone);
        fieldsUpdated.push("phone");
      }
      if (!existingLead.beta_consent && data.gdpr_consent === true) {
        patch.beta_consent = true;
        patch.beta_consent_at = new Date().toISOString();
        fieldsUpdated.push("beta_consent");
      }
      if (!existingLead.marketing_consent && data.marketing_consent === true) {
        patch.marketing_consent = true;
        patch.marketing_consent_at = new Date().toISOString();
        fieldsUpdated.push("marketing_consent");
      }
      if (Object.keys(patch).length > 0) {
        await (supabaseAdmin as any)
          .from("leads")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", leadId);
      }

      // Returning-lead event (deduped within 5s)
      if (
        !(await isDuplicateEventRecent({
          eventType: "returning_lead_detected",
          leadId,
          snapshotId: data.analysis_snapshot_id,
        }))
      ) {
        await recordProductEvent({
          eventType: "returning_lead_detected",
          leadId,
          snapshotId: data.analysis_snapshot_id,
          handle: data.instagram_username,
          metadata: {
            fields_updated: fieldsUpdated,
          },
        });
      }
    } else {
      const { data: inserted, error: insertErr } = await (supabaseAdmin as any)
        .from("leads")
        .insert({
          email: data.email,
          email_normalized: emailNormalized,
          name: deriveLeadName(data),
          phone: data.phone ?? null,
          phone_normalized: normalizePhone(data.phone),
          source: "public_report_unlock",
          commercial_status: "novo_pedido",
          user_type: data.user_type ?? null,
          purpose: data.goal ?? null,
          profile_ownership: data.profile_ownership ?? null,
          pricing_preference: data.pricing_preference ?? null,
          beta_consent: data.gdpr_consent === true,
          beta_consent_at:
            data.gdpr_consent === true ? new Date().toISOString() : null,
          marketing_consent: data.marketing_consent === true,
          marketing_consent_at:
            data.marketing_consent === true ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (insertErr || !inserted) {
        console.error(
          "[unlock] lead insert failed for",
          maskEmail(data.email),
          insertErr,
        );
        return { success: false, status: 500, error: "INTERNAL_ERROR" };
      }
      leadId = inserted.id as string;
    }

    // unlock_email_submitted (deduped within 5s)
    if (
      !(await isDuplicateEventRecent({
        eventType: "unlock_email_submitted",
        leadId,
        snapshotId: data.analysis_snapshot_id,
      }))
    ) {
      await recordProductEvent({
        eventType: "unlock_email_submitted",
        leadId,
        snapshotId: data.analysis_snapshot_id,
        handle: data.instagram_username,
        metadata: { returning_lead: returningLead },
      });
    }

    // 4. Find or create report_request for (lead_id, snapshot)
    const newMeta: Record<string, unknown> = {
      source: "public_unlock",
      unlocked_at: new Date().toISOString(),
    };
    if (data.profile_ownership) newMeta.profile_ownership = data.profile_ownership;
    if (data.goal) newMeta.goal = data.goal;
    if (data.user_type) newMeta.user_type = data.user_type;
    if (data.pricing_preference) newMeta.pricing_preference = data.pricing_preference;
    if (data.goal === "other" && data.goal_other_text)
      newMeta.goal_other_text = data.goal_other_text;
    if (data.user_type === "other" && data.user_type_other_text)
      newMeta.user_type_other_text = data.user_type_other_text;
    if (data.gdpr_consent === true) newMeta.gdpr_consent = true;
    if (data.marketing_consent === true) newMeta.marketing_consent = true;

    const { data: existingRR } = await (supabaseAdmin as any)
      .from("report_requests")
      .select("id, metadata")
      .eq("lead_id", leadId)
      .eq("analysis_snapshot_id", data.analysis_snapshot_id)
      .limit(1)
      .maybeSingle();

    let reportRequestId: string;
    let createdReportRequest = false;

    if (existingRR) {
      reportRequestId = existingRR.id as string;
      // Merge metadata: existing keys win.
      const merged = { ...newMeta, ...(existingRR.metadata ?? {}) };
      await (supabaseAdmin as any)
        .from("report_requests")
        .update({ metadata: merged, updated_at: new Date().toISOString() })
        .eq("id", reportRequestId);
    } else {
      const { data: insertedRR, error: rrErr } = await (supabaseAdmin as any)
        .from("report_requests")
        .insert({
          lead_id: leadId,
          instagram_username: data.instagram_username,
          analysis_snapshot_id: data.analysis_snapshot_id,
          request_source: "public_unlock",
          request_status: "unlocked",
          is_free_request: true,
          metadata: newMeta,
        })
        .select("id")
        .single();
      if (rrErr || !insertedRR) {
        // Race: another concurrent unlock for the same (lead, snapshot) won
        // the insert. The unique partial index report_requests_lead_snapshot_unique
        // raises 23505. Refetch and treat as existing (no duplicate email).
        if ((rrErr as { code?: string } | null)?.code === "23505") {
          const { data: raceRR } = await (supabaseAdmin as any)
            .from("report_requests")
            .select("id, metadata")
            .eq("lead_id", leadId)
            .eq("analysis_snapshot_id", data.analysis_snapshot_id)
            .limit(1)
            .maybeSingle();
          if (raceRR?.id) {
            reportRequestId = raceRR.id as string;
            createdReportRequest = false;
            // Mirror the existingRR branch: merge metadata so a losing
            // concurrent submission still contributes any new fields it
            // brought (existing keys win).
            const merged = { ...newMeta, ...(raceRR.metadata ?? {}) };
            await (supabaseAdmin as any)
              .from("report_requests")
              .update({ metadata: merged, updated_at: new Date().toISOString() })
              .eq("id", reportRequestId);
          } else {
            console.error(
              "[unlock] 23505 but no row found for lead",
              leadId,
              rrErr,
            );
            return { success: false, status: 500, error: "INTERNAL_ERROR" };
          }
        } else {
          console.error(
            "[unlock] report_request insert failed for lead",
            leadId,
            rrErr,
          );
          return { success: false, status: 500, error: "INTERNAL_ERROR" };
        }
      } else {
        reportRequestId = insertedRR.id as string;
        createdReportRequest = true;

        await recordProductEvent({
          eventType: "report_saved_to_account",
          leadId,
          snapshotId: data.analysis_snapshot_id,
          handle: data.instagram_username,
          metadata: {
            returning_lead: returningLead,
            report_request_id: reportRequestId,
          },
        });
      }
    }

    // Observability: when no new report_request was created (returning lead
    // re-unlocking the same snapshot), the lead-magnet sequence is
    // intentionally NOT invoked. Emit an event so admin/event logs do not
    // misinterpret this as a broken email pipeline.
    if (!createdReportRequest) {
      await recordProductEvent({
        eventType: "lead_magnet_sequence_not_invoked",
        leadId,
        snapshotId: data.analysis_snapshot_id,
        handle: data.instagram_username,
        metadata: {
          reason: "returning_lead_existing_report_request",
          lead_id: leadId,
          report_request_id: reportRequestId,
          analysis_snapshot_id: data.analysis_snapshot_id,
          email_normalized: emailNormalized,
          transactional_delivery: false,
        },
      });
    }

    // unlock_completed (deduped within 5s)
    if (
      !(await isDuplicateEventRecent({
        eventType: "unlock_completed",
        leadId,
        snapshotId: data.analysis_snapshot_id,
      }))
    ) {
      const fieldsPresent: string[] = [];
      if (data.profile_ownership) fieldsPresent.push("profile_ownership");
      if (data.goal) fieldsPresent.push("goal");
      if (data.user_type) fieldsPresent.push("user_type");
      if (data.pricing_preference) fieldsPresent.push("pricing_preference");
      await recordProductEvent({
        eventType: "unlock_completed",
        leadId,
        snapshotId: data.analysis_snapshot_id,
        handle: data.instagram_username,
        metadata: {
          returning_lead: returningLead,
          fields_present: fieldsPresent,
          report_request_id: reportRequestId,
          phone_provided: Boolean(data.phone),
        },
      });
    }

    // Phase 2 — persist immutable report_snapshot (fail-soft, no providers)
    const reportSnapshotResult = await ensureReportSnapshotForRequest(reportRequestId, "public_unlock", {
      handle: data.instagram_username,
      leadId,
      snapshotId: data.analysis_snapshot_id,
    });
    const reportSnapshotId = reportSnapshotResult?.snapshotId ?? null;

    // 5. Best-effort lifecycle advance (fail-open).
    try {
      const { maybeAdvanceLeadStatus } = await import(
        "@/lib/admin/lead-lifecycle"
      );
      const { updateLeadCommercialStatus } = await import(
        "@/lib/admin/lead-events.server"
      );
      const { data: leadRow } = await (supabaseAdmin as any)
        .from("leads")
        .select("commercial_status")
        .eq("id", leadId)
        .maybeSingle();
      const next = maybeAdvanceLeadStatus(
        leadRow?.commercial_status ?? null,
        "relatorio_visto",
      );
      if (next) {
        await updateLeadCommercialStatus({
          leadId,
          status: next,
          source: "auto",
          reason: "report_unlock",
        });
      }
    } catch (err) {
      console.error("[unlock] lifecycle advance failed:", err);
    }

    // 6. Lead-magnet email sequence — only on first-time creation of
    //    (lead, report_request). Brand-new leads receive `welcome-beta`
    //    + `report-summary`; returning leads receive only `report-summary`.
    //    The `personal-area-saved` email was deprecated (it duplicated
    //    report-summary without real KPIs). The orchestrator dedups against
    //    `product_events` keyed by `report_request_id`. Never blocks unlock.
    if (createdReportRequest) {
      const firstName =
        deriveFirstName(data) ??
        parseFullName((existingLead?.name as string | null | undefined) ?? "")
          .first_name ||
        null;

      // Awaited (não fire-and-forget): Cloudflare Workers matam o trabalho
      // assíncrono em background assim que a resposta volta (sem
      // `waitUntil`), o que estava a engolir o email `report-summary` —
      // mesmo padrão que o passo 7 (Brevo sync). `sendLeadMagnetSequence`
      // já tem try/catch por cada email e nunca propaga exceções, por
      // isso não pode bloquear o unlock.
      try {
        const { sendLeadMagnetSequence } = await import(
          "@/lib/email/lead-magnet-sequence.server"
        );
        await sendLeadMagnetSequence({
          leadId,
          reportRequestId,
          snapshotId: data.analysis_snapshot_id,
          reportSnapshotId,
          toEmail: data.email,
          firstName,
          instagramHandle: data.instagram_username,
          sendWelcome: !returningLead,
        });
      } catch (err) {
        console.error("[unlock] lead-magnet sequence error:", err);
      }
    }

    // 7. Brevo contact mirror — awaited.
    //
    // We previously fire-and-forget'd this, but Cloudflare Workers terminate
    // background async work as soon as the response is returned (no
    // `waitUntil` is registered here), so the sync was silently dropped in
    // production. The upsert is a single HTTP call to Brevo (~300–600ms);
    // awaiting it keeps unlock latency acceptable while guaranteeing the
    // contact is mirrored. `syncLeadToBrevo` never throws and records
    // success/failure events internally.
    try {
      const { syncLeadToBrevo } = await import("@/lib/brevo/sync.server");
      await syncLeadToBrevo(leadId, "report_unlock");
    } catch (err) {
      console.error("[unlock] brevo sync error:", err);
    }

    return {
      success: true,
      lead_id: leadId,
      report_request_id: reportRequestId,
      returning_lead: returningLead,
      access_state: "unlocked",
      created_report_request: createdReportRequest,
    };
  } catch (err) {
    console.error(
      "[unlock] unexpected error for",
      maskEmail(data.email),
      err,
    );
    return { success: false, status: 500, error: "INTERNAL_ERROR" };
  }
}