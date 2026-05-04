import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Fetch a single report request owned by the current user.
 * Uses supabaseAdmin to avoid needing a second RLS policy for single-row fetch,
 * but explicitly checks ownership via user_id.
 */
export const getOwnedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reportId: string }) => {
    if (!data.reportId || typeof data.reportId !== "string") {
      throw new Error("reportId is required");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: report, error } = await supabaseAdmin
      .from("report_requests")
      .select(
        "id, instagram_username, created_at, updated_at, request_status, pdf_status, delivery_status, email_sent_at, analysis_snapshot_id, competitor_usernames, pdf_error_message, email_error_message, request_source, is_free_request, user_id",
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

    // Sanitize error messages — don't leak internal details
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
      competitor_usernames: report.competitor_usernames,
      request_source: report.request_source,
      is_free_request: report.is_free_request,
      has_pdf_error: !!report.pdf_error_message,
      has_email_error: !!report.email_error_message,
      pdf_error_hint: report.pdf_error_message
        ? "Ocorreu um erro ao gerar o PDF. Contacta o suporte se o problema persistir."
        : null,
    };
  });

/**
 * Generate a short-lived signed URL for a report's PDF.
 * Only works if the report is owned by the current user and PDF is generated.
 */
export const getReportPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reportId: string }) => {
    if (!data.reportId || typeof data.reportId !== "string") {
      throw new Error("reportId is required");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verify ownership and PDF readiness
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

    // Generate signed URL (60 seconds expiry)
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from("report-pdfs")
      .createSignedUrl(report.pdf_storage_path, 60);

    if (signError || !signedData?.signedUrl) {
      console.error("Signed URL error:", signError?.message);
      throw new Error("Não foi possível gerar o link de download.");
    }

    return { url: signedData.signedUrl };
  });
