/**
 * Server function for submitting beta analysis requests.
 * Creates a lead + report_request without triggering analysis.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const USER_TYPES = [
  "creator",
  "brand",
  "agency",
  "consultant",
  "ecommerce",
  "other",
] as const;

const PURPOSES = [
  "improve_content",
  "benchmark_competitors",
  "client_report",
  "grow_audience",
  "validate_brand",
  "other",
] as const;

const OWNERSHIPS = [
  "own_profile",
  "brand_profile",
  "client_profile",
] as const;

const betaRequestSchema = z.object({
  instagramHandle: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .transform((v) => v.replace(/^@/, "").toLowerCase()),
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(100),
  userType: z.enum(USER_TYPES),
  purpose: z.enum(PURPOSES),
  profileOwnership: z.enum(OWNERSHIPS),
  betaConsent: z.literal(true),
});

export type BetaRequestInput = z.infer<typeof betaRequestSchema>;

export const submitBetaRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => betaRequestSchema.parse(data))
  .handler(async ({ data }) => {
    // Dynamic import to keep admin client server-only
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const emailNormalized = data.email.toLowerCase().trim();

    // Check for duplicate: same handle + same email already pending
    const { data: existing } = await supabaseAdmin
      .from("report_requests")
      .select("id, request_status")
      .eq("instagram_username", data.instagramHandle)
      .in("request_status", ["pending_review", "approved", "processing"])
      .limit(1);

    // Also check if this email already submitted for this handle
    if (existing && existing.length > 0) {
      // Check if the lead email matches
      const { data: leadMatch } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("email_normalized", emailNormalized)
        .limit(1);

      if (leadMatch && leadMatch.length > 0) {
        const matchingRequest = await supabaseAdmin
          .from("report_requests")
          .select("id")
          .eq("instagram_username", data.instagramHandle)
          .eq("lead_id", leadMatch[0].id)
          .in("request_status", ["pending_review", "approved", "processing", "completed"])
          .limit(1);

        if (matchingRequest.data && matchingRequest.data.length > 0) {
          return {
            success: false as const,
            error: "duplicate",
            requestId: matchingRequest.data[0].id,
          };
        }
      }
    }

    // Create or find lead
    const { data: existingLead } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("email_normalized", emailNormalized)
      .limit(1);

    let leadId: string;

    if (existingLead && existingLead.length > 0) {
      leadId = existingLead[0].id;
      // Update with beta fields
      await supabaseAdmin
        .from("leads")
        .update({
          user_type: data.userType,
          purpose: data.purpose,
          profile_ownership: data.profileOwnership,
          beta_consent: true,
          beta_consent_at: new Date().toISOString(),
          source: "beta_form",
        })
        .eq("id", leadId);
    } else {
      const { data: newLead, error: leadError } = await supabaseAdmin
        .from("leads")
        .insert({
          email: data.email,
          email_normalized: emailNormalized,
          name: data.name,
          source: "beta_form",
          user_type: data.userType,
          purpose: data.purpose,
          profile_ownership: data.profileOwnership,
          beta_consent: true,
          beta_consent_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (leadError || !newLead) {
        console.error("[beta] Lead insert failed:", leadError);
        return { success: false as const, error: "server_error" };
      }
      leadId = newLead.id;
    }

    // Create report request in pending_review
    const { data: request, error: reqError } = await supabaseAdmin
      .from("report_requests")
      .insert({
        lead_id: leadId,
        instagram_username: data.instagramHandle,
        request_source: "beta_form",
        request_status: "pending_review",
        is_free_request: true,
        metadata: {
          beta_version: "v1",
          submitted_at: new Date().toISOString(),
          user_type: data.userType,
          purpose: data.purpose,
          profile_ownership: data.profileOwnership,
        },
      })
      .select("id")
      .single();

    if (reqError || !request) {
      console.error("[beta] Report request insert failed:", reqError);
      return { success: false as const, error: "server_error" };
    }

    return {
      success: true as const,
      requestId: request.id,
      handle: data.instagramHandle,
    };
  });