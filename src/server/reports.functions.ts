import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface UserReport {
  id: string;
  instagramUsername: string;
  competitorUsernames: string[];
  requestStatus: string;
  pdfStatus: string;
  deliveryStatus: string;
  createdAt: string;
  pdfGeneratedAt: string | null;
  emailSentAt: string | null;
  analysisSnapshotId: string | null;
}

export const getUserReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserReport[]> => {
    const { supabase, userId } = context;

    // Fetch profile to get lead_id for legacy report association
    const { data: profile } = await supabase
      .from("profiles")
      .select("lead_id")
      .eq("id", userId)
      .single();

    const leadId = profile?.lead_id ?? null;

    // Build query: user_id match OR lead_id match (for legacy pre-signup reports)
    let query = supabase
      .from("report_requests")
      .select(
        "id, instagram_username, competitor_usernames, request_status, pdf_status, delivery_status, created_at, pdf_generated_at, email_sent_at, analysis_snapshot_id",
      )
      .order("created_at", { ascending: false });

    if (leadId) {
      query = query.or(`user_id.eq.${userId},lead_id.eq.${leadId}`);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("getUserReports query error:", error.message);
      throw new Error("Não foi possível carregar os relatórios.");
    }

    return (data ?? []).map((r) => ({
      id: r.id,
      instagramUsername: r.instagram_username,
      competitorUsernames: Array.isArray(r.competitor_usernames)
        ? (r.competitor_usernames as string[])
        : [],
      requestStatus: r.request_status,
      pdfStatus: r.pdf_status,
      deliveryStatus: r.delivery_status,
      createdAt: r.created_at,
      pdfGeneratedAt: r.pdf_generated_at,
      emailSentAt: r.email_sent_at,
      analysisSnapshotId: r.analysis_snapshot_id,
    }));
  });
