/**
 * GET /api/admin/diagnostics/account-sync
 *
 * Diagnóstico de consistência entre `auth.users` e `public.leads`.
 * Devolve quatro listas (cada uma limitada a 200 linhas) para o admin
 * detectar contas órfãs, leads arquivados e emails duplicados.
 *
 *   - orphan_auth_users  → `auth.users` sem `leads` correspondente
 *   - orphan_leads       → `leads` reais (não-QA) sem `auth.users`
 *   - archived_leads     → `leads.archived_at IS NOT NULL`
 *   - duplicate_emails   → mesmo `email_normalized` em ≥2 leads
 */
import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function listAllAuthUsers(): Promise<
  Array<{ id: string; email: string; created_at: string | null }>
> {
  const out: Array<{ id: string; email: string; created_at: string | null }> = [];
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    for (const u of users) {
      out.push({
        id: u.id,
        email: (u.email ?? "").toLowerCase(),
        created_at: u.created_at ?? null,
      });
    }
    if (users.length < perPage) break;
  }
  return out;
}

export const Route = createFileRoute("/api/admin/diagnostics/account-sync")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        // 1) Pull all leads (cap 5000 — admin scale).
        const { data: leads, error: leadsErr } = await supabaseAdmin
          .from("leads")
          .select("id, email, email_normalized, archived_at, created_at")
          .limit(5000);
        if (leadsErr) {
          console.error("[diagnostics/account-sync] leads error", leadsErr);
          return json(
            { success: false, error: "Falha ao ler leads" },
            500,
          );
        }

        const leadsByEmail = new Map<string, typeof leads>();
        for (const l of leads ?? []) {
          const key = (l.email_normalized ?? "").toLowerCase();
          if (!key) continue;
          const arr = leadsByEmail.get(key) ?? [];
          arr.push(l);
          leadsByEmail.set(key, arr);
        }

        // 2) Pull all auth users.
        let authUsers: Awaited<ReturnType<typeof listAllAuthUsers>> = [];
        try {
          authUsers = await listAllAuthUsers();
        } catch (err) {
          console.error("[diagnostics/account-sync] auth list failed", err);
          return json(
            { success: false, error: "Falha ao listar auth users" },
            500,
          );
        }
        const authByEmail = new Map(authUsers.map((u) => [u.email, u]));

        // 3) Compute the four buckets.
        const orphan_auth_users = authUsers
          .filter((u) => u.email && !leadsByEmail.has(u.email))
          .slice(0, 200);

        const orphan_leads = (leads ?? [])
          .filter((l) => {
            const key = (l.email_normalized ?? "").toLowerCase();
            return key && !authByEmail.has(key);
          })
          .slice(0, 200)
          .map((l) => ({
            id: l.id,
            email: l.email,
            archived_at: l.archived_at,
            created_at: l.created_at,
          }));

        const archived_leads = (leads ?? [])
          .filter((l) => l.archived_at != null)
          .slice(0, 200)
          .map((l) => ({
            id: l.id,
            email: l.email,
            archived_at: l.archived_at,
          }));

        const duplicate_emails: Array<{ email: string; lead_ids: string[] }> = [];
        for (const [email, rows] of leadsByEmail.entries()) {
          if (rows.length >= 2) {
            duplicate_emails.push({ email, lead_ids: rows.map((r) => r.id) });
          }
        }

        return json({
          success: true,
          summary: {
            orphan_auth_users: orphan_auth_users.length,
            orphan_leads: orphan_leads.length,
            archived_leads: archived_leads.length,
            duplicate_emails: duplicate_emails.length,
            total_auth_users: authUsers.length,
            total_leads: leads?.length ?? 0,
          },
          orphan_auth_users,
          orphan_leads,
          archived_leads,
          duplicate_emails,
        });
      },
    },
  },
});