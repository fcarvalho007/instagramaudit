/**
 * Public boundary for the premium gate modal.
 *
 * Frontend (anon) cannot write directly to `leads` / `report_requests` because
 * RLS is closed. This server route uses the service-role admin client to:
 *   1. validate + normalize payload
 *   2. upsert lead by `email_normalized`
 *   3. count free `report_requests` for that lead in the current month
 *   4. decide quota outcome: `first_free` | `last_free` | `limit_reached`
 *   5. only insert a new `report_requests` row when the quota allows it
 *
 * Quota is now strictly server-enforced (no localStorage trust). Race condition
 * (two concurrent submits crossing the count gate) is accepted as a residual
 * risk for the current low-volume / no-auth milestone — a `SELECT ... FOR
 * UPDATE` or SQL function with row lock can be added later when needed.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FREE_MONTHLY_LIMIT = 2;

const PayloadSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(120),
  company: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  instagram_username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._]{1,30}$/, "invalid_username"),
  competitor_usernames: z
    .array(z.string().trim().regex(/^[A-Za-z0-9._]{1,30}$/))
    .max(2)
    .optional()
    .default([]),
  request_source: z.enum(["public_dashboard"]).optional().default("public_dashboard"),
});

type SuccessBody = {
  success: true;
  quota_status: "first_free" | "last_free";
  remaining_free_reports: number;
  lead_id: string;
  report_request_id: string;
  message: string;
};

type QuotaReachedBody = {
  success: false;
  quota_status: "limit_reached";
  remaining_free_reports: 0;
  error_code: "QUOTA_REACHED";
  message: string;
};

type FailureBody = {
  success: false;
  error_code: "INVALID_PAYLOAD" | "PERSISTENCE_FAILED";
  message: string;
};

const json = (body: SuccessBody | QuotaReachedBody | FailureBody, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Compute the current month's first-day in UTC as `YYYY-MM-01`, matching the
 * default of `report_requests.request_month` (`date_trunc('month', now())::date`).
 */
function currentMonthStartIso(): string {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return monthStart.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/request-full-report")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),

      POST: async ({ request }) => {
        // Parse + validate payload.
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json(
            {
              success: false,
              error_code: "INVALID_PAYLOAD",
              message: "Pedido inválido.",
            },
            400,
          );
        }

        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          return json(
            {
              success: false,
              error_code: "INVALID_PAYLOAD",
              message: "Dados inválidos. Verificar os campos e tentar novamente.",
            },
            400,
          );
        }

        const { email, name, company, instagram_username, competitor_usernames, request_source } =
          parsed.data;
        const email_normalized = email.toLowerCase();

        // 1) Upsert lead by `email_normalized`.
        const { data: leadRow, error: leadError } = await supabaseAdmin
          .from("leads")
          .upsert(
            {
              email,
              email_normalized,
              name,
              company: company ?? null,
              source: "public_report_gate",
            },
            { onConflict: "email_normalized" },
          )
          .select("id")
          .single();

        if (leadError || !leadRow) {
          console.error("[request-full-report] lead upsert failed", leadError);
          return json(
            {
              success: false,
              error_code: "PERSISTENCE_FAILED",
              message: "Não foi possível registar o pedido. Tentar novamente.",
            },
            500,
          );
        }

        // 2) Count current month's free report_requests for this lead.
        const requestMonth = currentMonthStartIso();
        const { count, error: countError } = await supabaseAdmin
          .from("report_requests")
          .select("id", { count: "exact", head: true })
          .eq("lead_id", leadRow.id)
          .eq("request_month", requestMonth)
          .eq("is_free_request", true);

        if (countError) {
          console.error("[request-full-report] quota count failed", countError);
          return json(
            {
              success: false,
              error_code: "PERSISTENCE_FAILED",
              message: "Não foi possível verificar a quota. Tentar novamente.",
            },
            500,
          );
        }

        const used = count ?? 0;

        // 3) Quota gate — block before insert if limit reached.
        if (used >= FREE_MONTHLY_LIMIT) {
          return json(
            {
              success: false,
              quota_status: "limit_reached",
              remaining_free_reports: 0,
              error_code: "QUOTA_REACHED",
              message: "Foi atingido o limite de 2 relatórios gratuitos este mês.",
            },
            // 200 — business outcome, not a transport-level error
            200,
          );
        }

        // 4) Insert report_request row.
        const { data: reqRow, error: reqError } = await supabaseAdmin
          .from("report_requests")
          .insert({
            lead_id: leadRow.id,
            instagram_username,
            competitor_usernames,
            request_source,
            metadata: {
              quota_mode: "server_enforced",
              flow_version: "v2",
              route: `/analyze/${instagram_username}`,
            },
          })
          .select("id")
          .single();

        if (reqError || !reqRow) {
          console.error("[request-full-report] report_request insert failed", reqError);
          return json(
            {
              success: false,
              error_code: "PERSISTENCE_FAILED",
              message: "Não foi possível registar o pedido. Tentar novamente.",
            },
            500,
          );
        }

        // 5) Successful outcome — derive quota status from pre-insert count.
        const remaining = Math.max(0, FREE_MONTHLY_LIMIT - (used + 1));
        const quota_status: "first_free" | "last_free" = used === 0 ? "first_free" : "last_free";

        return json(
          {
            success: true,
            quota_status,
            remaining_free_reports: remaining,
            lead_id: leadRow.id,
            report_request_id: reqRow.id,
            message:
              quota_status === "first_free"
                ? "O pedido foi registado com sucesso."
                : "Foi utilizado o segundo e último relatório gratuito deste mês.",
          },
          200,
        );
      },
    },
  },
});
