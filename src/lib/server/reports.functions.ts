import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withSupabaseHeaders } from "@/lib/auth-middleware-client";

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
  reportSnapshotId: string | null;
}

export const getUserReports = createServerFn({ method: "GET" })
  .middleware([withSupabaseHeaders, requireSupabaseAuth])
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
        "id, instagram_username, competitor_usernames, request_status, pdf_status, delivery_status, created_at, pdf_generated_at, email_sent_at, analysis_snapshot_id, report_snapshot_id",
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
      reportSnapshotId: (r as { report_snapshot_id: string | null }).report_snapshot_id ?? null,
    }));
  });

/**
 * Fetch a single report request owned by the current user.
 */
export const getOwnedReport = createServerFn({ method: "POST" })
  .middleware([withSupabaseHeaders, requireSupabaseAuth])
  .inputValidator((data: { reportId: string }) => {
    if (!data.reportId || typeof data.reportId !== "string") {
      throw new Error("reportId is required");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report, error } = await supabaseAdmin
      .from("report_requests")
      .select(
        "id, instagram_username, created_at, updated_at, request_status, pdf_status, delivery_status, email_sent_at, pdf_generated_at, analysis_snapshot_id, report_snapshot_id, competitor_usernames, pdf_error_message, email_error_message, request_source, is_free_request, user_id",
      )
      .eq("id", data.reportId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("getOwnedReport query error:", error.message);
      throw new Error("Erro ao carregar o relatório.");
    }

    if (!report) {
      throw new Error("NOT_FOUND");
    }

    return {
      id: report.id,
      instagram_username: report.instagram_username,
      created_at: report.created_at,
      updated_at: report.updated_at,
      request_status: report.request_status,
      pdf_status: report.pdf_status,
      delivery_status: report.delivery_status,
      email_sent_at: report.email_sent_at,
      analysis_snapshot_id: report.analysis_snapshot_id,
      report_snapshot_id:
        (report as { report_snapshot_id: string | null }).report_snapshot_id ?? null,
      competitor_usernames: report.competitor_usernames,
      request_source: report.request_source,
      is_free_request: report.is_free_request,
      pdf_generated_at: report.pdf_generated_at ?? null,
      has_pdf_error: !!report.pdf_error_message,
      has_email_error: !!report.email_error_message,
      pdf_error_hint: report.pdf_error_message
        ? "Ocorreu um erro ao gerar o PDF. Contacta o suporte se o problema persistir."
        : null,
    };
  });

/**
 * Generate a short-lived signed URL for a report's PDF.
 */
export const getReportPdfUrl = createServerFn({ method: "POST" })
  .middleware([withSupabaseHeaders, requireSupabaseAuth])
  .inputValidator((data: { reportId: string }) => {
    if (!data.reportId || typeof data.reportId !== "string") {
      throw new Error("reportId is required");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report, error } = await supabaseAdmin
      .from("report_requests")
      .select("id, pdf_status, pdf_storage_path, user_id")
      .eq("id", data.reportId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !report) {
      throw new Error("NOT_FOUND");
    }

    if (report.pdf_status !== "generated" || !report.pdf_storage_path) {
      throw new Error("PDF_NOT_READY");
    }

    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from("report-pdfs")
      .createSignedUrl(report.pdf_storage_path, 60);

    if (signError || !signedData?.signedUrl) {
      console.error("Signed URL error:", signError?.message);
      throw new Error("Não foi possível gerar o link de download.");
    }

    return { url: signedData.signedUrl };
  });
