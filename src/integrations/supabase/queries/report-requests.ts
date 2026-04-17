/**
 * Client-side helper for the public report request flow.
 *
 * The browser CANNOT write to `leads` / `report_requests` directly — RLS is
 * closed. All public writes go through the server route
 * `POST /api/request-full-report`, which uses the service-role admin client.
 *
 * Keep this helper thin: it just shapes the request and parses the response.
 */

export interface RequestFullReportPayload {
  email: string;
  name: string;
  company?: string;
  instagram_username: string;
  competitor_usernames?: string[];
  request_source?: "public_dashboard";
}

export type RequestFullReportResult =
  | {
      success: true;
      lead_id: string;
      report_request_id: string;
      message: string;
    }
  | {
      success: false;
      error_code: "INVALID_PAYLOAD" | "PERSISTENCE_FAILED" | "NETWORK";
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
