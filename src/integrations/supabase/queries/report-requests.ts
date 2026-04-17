/**
 * Client-side helper for the public report request flow.
 *
 * The browser CANNOT write to `leads` / `report_requests` directly — RLS is
 * closed. All public writes go through the server route
 * `POST /api/request-full-report`, which uses the service-role admin client
 * AND enforces the monthly free-report quota server-side (counted by
 * `lead_id + request_month`). The client trusts the server's `quota_status`
 * verdict to drive UI state.
 */

export type QuotaStatus = "first_free" | "last_free" | "limit_reached";

export interface RequestFullReportPayload {
  email: string;
  name: string;
  company?: string;
  instagram_username: string;
  competitor_usernames?: string[];
  request_source?: "public_dashboard";
  /** Links the request to the exact analysis snapshot the user saw. */
  analysis_snapshot_id?: string;
}

export type RequestFullReportResult =
  | {
      success: true;
      quota_status: "first_free" | "last_free";
      remaining_free_reports: number;
      lead_id: string;
      report_request_id: string;
      message: string;
    }
  | {
      success: false;
      quota_status: "limit_reached";
      remaining_free_reports: 0;
      error_code: "QUOTA_REACHED";
      message: string;
    }
  | {
      success: false;
      error_code:
        | "INVALID_PAYLOAD"
        | "PERSISTENCE_FAILED"
        | "NETWORK"
        | "SNAPSHOT_NOT_FOUND"
        | "SNAPSHOT_MISMATCH";
      message: string;
    };

export async function requestFullReport(
  payload: RequestFullReportPayload,
): Promise<RequestFullReportResult> {
  try {
    const res = await fetch("/api/request-full-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await res.json().catch(() => null)) as RequestFullReportResult | null;
    if (body) return body;

    return {
      success: false,
      error_code: "PERSISTENCE_FAILED",
      message: "Não foi possível registar o pedido. Tentar novamente.",
    };
  } catch (err) {
    console.error("[requestFullReport] network error", err);
    return {
      success: false,
      error_code: "NETWORK",
      message: "Sem ligação. Verificar a internet e tentar novamente.",
    };
  }
}
