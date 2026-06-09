/**
 * DELETE /api/admin/leads-bulk — acção em massa sobre leads do /admin.
 *
 * Dois modos:
 *   - `mode: "archive"` (default, GDPR-safe): marca `leads.archived_at = now()`,
 *     escondendo dos KPIs/filtros activos. Mantém auth.users, pagamentos,
 *     créditos, snapshots e audit logs. A conta continua activa e
 *     `/api/onboarding/check-email` continua a devolver `exists: true`.
 *
 *   - `mode: "purge"` (destrutivo, contas de teste): apaga em ordem segura
 *     todas as tabelas que referenciam `leads.id`, depois remove os
 *     próprios leads, e por fim apaga o respectivo `auth.users` (via
 *     `auth.admin.deleteUser`) — garantindo que `check-email` devolve
 *     `exists: false` e que o email pode ser reutilizado.
 *     Bloqueado se algum lead tiver `lead_payments.status = 'paid'`,
 *     excepto se `force_paid: true` for enviado explicitamente.
 *
 * Protegido por `requireAdminSession`. Não há transação cross-table no
 * PostgREST — abortamos no primeiro erro e devolvemos o estado parcial
 * para diagnóstico.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const BodySchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1, "Pelo menos um id")
    .max(200, "Máximo 200 ids por pedido")
    .transform((arr) => Array.from(new Set(arr))),
  mode: z.enum(["archive", "purge"]).default("archive"),
  force_paid: z.boolean().optional().default(false),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Lookup auth.users IDs for a list of normalized emails. Paginates
 * `auth.admin.listUsers` because there is no per-email lookup in the
 * admin API. Returns a map email_normalized → user_id.
 */
async function findAuthUsersByEmails(
  emails: string[],
): Promise<Map<string, string>> {
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  const found = new Map<string, string>();
  if (wanted.size === 0) return found;

  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(`auth.listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      const e = (u.email ?? "").toLowerCase();
      if (wanted.has(e)) found.set(e, u.id);
    }
    if (users.length < perPage) break;
    if (found.size === wanted.size) break;
  }
  return found;
}

export const Route = createFileRoute("/api/admin/leads-bulk")({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        let admin;
        try {
          admin = await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let parsed;
        try {
          const raw = await request.json();
          parsed = BodySchema.safeParse(raw);
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }
        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              error: parsed.error.issues[0]?.message ?? "Pedido inválido",
            },
            400,
          );
        }
        const { ids, mode, force_paid } = parsed.data;

        // ────────────────────────────── ARCHIVE (soft) ──────────────────────────────
        if (mode === "archive") {
          const { error, count } = await supabaseAdmin
            .from("leads")
            .update(
              { archived_at: new Date().toISOString() },
              { count: "exact" },
            )
            .in("id", ids)
            .is("archived_at", null);
          if (error) {
            console.error("[leads-bulk] archive failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao arquivar contactos" },
              500,
            );
          }
          try {
            await supabaseAdmin.from("product_events").insert([
              {
                event_type: "leads_bulk_archived",
                metadata: {
                  count: count ?? 0,
                  requested: ids.length,
                  ids_sample: ids.slice(0, 10),
                  actor_email: admin?.email ?? null,
                },
              },
            ]);
          } catch (err) {
            console.error("[leads-bulk] archive audit insert failed", err);
          }
          return jsonResponse({
            success: true,
            mode: "archive",
            archived: count ?? 0,
          });
        }

        // ────────────────────────────── PURGE (hard) ──────────────────────────────
        // 0) Lookup leads + paid-payment guard
        const { data: leadRows, error: leadLookupErr } = await supabaseAdmin
          .from("leads")
          .select("id, email_normalized")
          .in("id", ids);
        if (leadLookupErr) {
          console.error("[leads-bulk] leads lookup failed", leadLookupErr);
          return jsonResponse(
            { success: false, error: "Falha ao ler contactos" },
            500,
          );
        }
        const emails = (leadRows ?? [])
          .map((r) => r.email_normalized)
          .filter((e): e is string => typeof e === "string" && e.length > 0);

        if (!force_paid) {
          const { data: paidRows, error: paidErr } = await supabaseAdmin
            .from("lead_payments")
            .select("lead_id")
            .in("lead_id", ids)
            .eq("status", "paid")
            .limit(1);
          if (paidErr) {
            console.error("[leads-bulk] paid check failed", paidErr);
            return jsonResponse(
              { success: false, error: "Falha ao verificar pagamentos" },
              500,
            );
          }
          if ((paidRows ?? []).length > 0) {
            return jsonResponse(
              {
                success: false,
                error_code: "PAID_LEAD_BLOCKED",
                error:
                  "Alguns contactos têm pagamentos confirmados. Use force_paid=true se mesmo assim quiser apagar.",
              },
              409,
            );
          }
        }

        const details = {
          profiles_unlinked: 0,
          feedback: 0,
          snapshots: 0,
          requests: 0,
          events: 0,
          payments: 0,
          credit_ledger: 0,
          entitlements: 0,
          report_unlocks: 0,
          coupon_redemptions: 0,
          lead_reports: 0,
          leads: 0,
          auth_users: 0,
        };

        // 1) desligar profiles
        {
          const { error, count } = await supabaseAdmin
            .from("profiles")
            .update({ lead_id: null }, { count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] profiles unlink failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao desligar perfis", details },
              500,
            );
          }
          details.profiles_unlinked = count ?? 0;
        }

        // 2) beta_feedback
        {
          const { error, count } = await supabaseAdmin
            .from("beta_feedback")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] beta_feedback delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar feedback", details },
              500,
            );
          }
          details.feedback = count ?? 0;
        }

        // 3) report_snapshots
        {
          const { error, count } = await supabaseAdmin
            .from("report_snapshots")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] report_snapshots delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar snapshots", details },
              500,
            );
          }
          details.snapshots = count ?? 0;
        }

        // 4) report_requests
        {
          const { error, count } = await supabaseAdmin
            .from("report_requests")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] report_requests delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar pedidos", details },
              500,
            );
          }
          details.requests = count ?? 0;
        }

        // 5) product_events
        {
          const { error, count } = await supabaseAdmin
            .from("product_events")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] product_events delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar eventos", details },
              500,
            );
          }
          details.events = count ?? 0;
        }

        // 6) lead_payments / credit_ledger / lead_entitlements /
        //    lead_report_unlocks / coupon_redemptions / lead_reports
        const cascadeTables: Array<keyof typeof details> = [
          "payments",
          "credit_ledger",
          "entitlements",
          "report_unlocks",
          "coupon_redemptions",
          "lead_reports",
        ];
        const tableMap: Record<(typeof cascadeTables)[number], string> = {
          payments: "lead_payments",
          credit_ledger: "credit_ledger",
          entitlements: "lead_entitlements",
          report_unlocks: "lead_report_unlocks",
          coupon_redemptions: "coupon_redemptions",
          lead_reports: "lead_reports",
        };
        for (const key of cascadeTables) {
          const table = tableMap[key];
          const { error, count } = await supabaseAdmin
            .from(table)
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error(`[leads-bulk] ${table} delete failed`, error);
            return jsonResponse(
              { success: false, error: `Falha ao apagar ${table}`, details },
              500,
            );
          }
          (details as Record<string, number>)[key] = count ?? 0;
        }

        // 7) leads
        {
          const { error, count } = await supabaseAdmin
            .from("leads")
            .delete({ count: "exact" })
            .in("id", ids);
          if (error) {
            console.error("[leads-bulk] leads delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar contactos", details },
              500,
            );
          }
          details.leads = count ?? 0;
        }

        // 8) auth.users — só depois de o lead estar fora, para o trigger
        //    handle_new_user não recriar nada (ele só dispara em INSERT).
        const authErrors: Array<{ email: string; message: string }> = [];
        try {
          const authMap = await findAuthUsersByEmails(emails);
          for (const [email, userId] of authMap.entries()) {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (error) {
              authErrors.push({ email, message: error.message });
              console.error(
                `[leads-bulk] auth.deleteUser failed for ${email}`,
                error,
              );
            } else {
              details.auth_users += 1;
            }
          }
        } catch (err) {
          console.error("[leads-bulk] auth cleanup failed", err);
          authErrors.push({
            email: "*",
            message: err instanceof Error ? err.message : String(err),
          });
        }

        // auditoria (best-effort)
        try {
          await supabaseAdmin.from("product_events").insert([
            {
              event_type: "leads_bulk_purged",
              metadata: {
                count: details.leads,
                requested: ids.length,
                ids_sample: ids.slice(0, 10),
                actor_email: admin?.email ?? null,
                force_paid,
                auth_errors: authErrors,
                details,
              },
            },
          ]);
        } catch (err) {
          console.error("[leads-bulk] audit insert failed", err);
        }

        return jsonResponse({
          success: true,
          mode: "purge",
          deleted: details.leads,
          auth_errors: authErrors,
          details,
        });
      },
    },
  },
});