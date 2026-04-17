/**
 * Public boundary for the premium gate modal.
 *
 * Frontend (anon) cannot write directly to `leads` / `report_requests` because
 * RLS is closed. This server route uses the service-role admin client to:
 *   1. validate + normalize payload
 *   2. upsert lead by `email_normalized`
 *   3. insert a new `report_requests` row
 *
 * Quota enforcement still lives in the browser (localStorage) for now —
 * this endpoint trusts the caller's quota check. Server-side quota will be
 * added in a later prompt together with auth + rate limiting.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  lead_id: string;
  report_request_id: string;
  message: string;
};

type FailureBody = {
  success: false;
  error_code: "INVALID_PAYLOAD" | "PERSISTENCE_FAILED";
  message: string;
};

const json = (body: SuccessBody | FailureBody, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

        // 2) Insert report_request row. DB defaults handle status / month / metadata baseline.
        const { data: reqRow, error: reqError } = await supabaseAdmin
          .from("report_requests")
          .insert({
            lead_id: leadRow.id,
            instagram_username,
            competitor_usernames,
            request_source,
            metadata: {
              quota_mode: "local_mock",
              flow_version: "v1",
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

        return json(
          {
            success: true,
            lead_id: leadRow.id,
            report_request_id: reqRow.id,
            message: "Pedido registado com sucesso.",
          },
          200,
        );
      },
    },
  },
});
