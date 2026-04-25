/**
 * GET /api/admin/diagnostics — readiness panel data.
 *
 * Reports the configuration state required for the Apify smoke test and
 * recent activity in `analysis_snapshots` and `report_requests`. Never
 * exposes the value of any secret — only a boolean indicating presence.
 *
 * Protected by `requireAdminSession`. Read-only.
 */

import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  isFresh,
  isWithinStaleWindow,
  type SnapshotRow,
} from "@/lib/analysis/cache";
import {
  getAllowlist,
  isTestingModeActive,
} from "@/lib/security/apify-allowlist";

interface SnapshotsBlock {
  total: number | null;
  latest_at: string | null;
  latest_username: string | null;
  latest_status: string | null;
  latest_provider: string | null;
  latest_data_source: "fresh" | "cache" | "stale" | null;
  error: string | null;
}

interface ReportsBlock {
  total: number | null;
  latest_at: string | null;
  latest_request_status: string | null;
  latest_pdf_status: string | null;
  latest_delivery_status: string | null;
  latest_pdf_error: string | null;
  latest_email_error: string | null;
  error: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function hasSecret(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

async function loadSnapshots(): Promise<SnapshotsBlock> {
  try {
    const [{ count, error: countError }, { data, error: rowError }] =
      await Promise.all([
        supabaseAdmin
          .from("analysis_snapshots")
          .select("*", { count: "exact", head: true }),
        supabaseAdmin
          .from("analysis_snapshots")
          .select(
            "instagram_username, analysis_status, provider, updated_at, created_at, expires_at",
          )
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (countError) {
      return {
        total: null,
        latest_at: null,
        latest_username: null,
        latest_status: null,
        latest_provider: null,
        latest_data_source: null,
        error: countError.message,
      };
    }

    if (rowError || !data) {
      return {
        total: count ?? 0,
        latest_at: null,
        latest_username: null,
        latest_status: null,
        latest_provider: null,
        latest_data_source: null,
        error: rowError?.message ?? null,
      };
    }

    // Reuse the freshness/staleness rules from the cache layer so this panel
    // never disagrees with the public endpoint about what counts as fresh.
    const row = data as Pick<
      SnapshotRow,
      | "instagram_username"
      | "analysis_status"
      | "provider"
      | "updated_at"
      | "created_at"
      | "expires_at"
    >;
    const snapshotShape = {
      ...row,
      // isFresh / isWithinStaleWindow only need expires_at + created_at
    } as SnapshotRow;

    let dataSource: "fresh" | "cache" | "stale" = "stale";
    if (isFresh(snapshotShape)) dataSource = "fresh";
    else if (isWithinStaleWindow(snapshotShape)) dataSource = "cache";

    return {
      total: count ?? 0,
      latest_at: row.updated_at,
      latest_username: row.instagram_username,
      latest_status: row.analysis_status,
      latest_provider: row.provider,
      latest_data_source: dataSource,
      error: null,
    };
  } catch (err) {
    return {
      total: null,
      latest_at: null,
      latest_username: null,
      latest_status: null,
      latest_provider: null,
      latest_data_source: null,
      error: (err as Error).message,
    };
  }
}

async function loadReports(): Promise<ReportsBlock> {
  try {
    const [{ count, error: countError }, { data, error: rowError }] =
      await Promise.all([
        supabaseAdmin
          .from("report_requests")
          .select("*", { count: "exact", head: true }),
        supabaseAdmin
          .from("report_requests")
          .select(
            "request_status, pdf_status, delivery_status, pdf_error_message, email_error_message, updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (countError) {
      return {
        total: null,
        latest_at: null,
        latest_request_status: null,
        latest_pdf_status: null,
        latest_delivery_status: null,
        latest_pdf_error: null,
        latest_email_error: null,
        error: countError.message,
      };
    }

    if (rowError || !data) {
      return {
        total: count ?? 0,
        latest_at: null,
        latest_request_status: null,
        latest_pdf_status: null,
        latest_delivery_status: null,
        latest_pdf_error: null,
        latest_email_error: null,
        error: rowError?.message ?? null,
      };
    }

    const row = data as {
      request_status: string;
      pdf_status: string;
      delivery_status: string;
      pdf_error_message: string | null;
      email_error_message: string | null;
      updated_at: string;
    };
    return {
      total: count ?? 0,
      latest_at: row.updated_at,
      latest_request_status: row.request_status,
      latest_pdf_status: row.pdf_status,
      latest_delivery_status: row.delivery_status,
      latest_pdf_error: row.pdf_error_message,
      latest_email_error: row.email_error_message,
      error: null,
    };
  } catch (err) {
    return {
      total: null,
      latest_at: null,
      latest_request_status: null,
      latest_pdf_status: null,
      latest_delivery_status: null,
      latest_pdf_error: null,
      latest_email_error: null,
      error: (err as Error).message,
    };
  }
}

export const Route = createFileRoute("/api/admin/diagnostics")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const [snapshots, reports] = await Promise.all([
          loadSnapshots(),
          loadReports(),
        ]);

        const body = {
          secrets: {
            APIFY_TOKEN: hasSecret("APIFY_TOKEN"),
            RESEND_API_KEY: hasSecret("RESEND_API_KEY"),
            INTERNAL_API_TOKEN: hasSecret("INTERNAL_API_TOKEN"),
          },
          testing_mode: {
            active: isTestingModeActive(),
            allowlist: getAllowlist(),
          },
          snapshots,
          report_requests: reports,
          generated_at: new Date().toISOString(),
        };

        return jsonResponse({ success: true, ...body }, 200);
      },
    },
  },
});
