/**
 * OrphanAccountsPanel — diagnóstico de consistência auth.users ↔ leads.
 *
 * Consome `GET /api/admin/diagnostics/account-sync` e expõe acções de
 * limpeza pontual:
 *   - "Apagar auth órfão" → `POST /api/admin/auth-users/purge`
 *   - "Restaurar lead arquivado" → `POST /api/admin/leads/{id}/restore`
 *
 * Pensado para o tab "Diagnóstico" em /admin/leads.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminFetch } from "@/lib/admin/fetch";

type DiagResponse = {
  success: true;
  summary: {
    orphan_auth_users: number;
    orphan_leads: number;
    archived_leads: number;
    duplicate_emails: number;
    total_auth_users: number;
    total_leads: number;
  };
  orphan_auth_users: Array<{ id: string; email: string; created_at: string | null }>;
  orphan_leads: Array<{ id: string; email: string; archived_at: string | null; created_at: string | null }>;
  archived_leads: Array<{ id: string; email: string; archived_at: string | null }>;
  duplicate_emails: Array<{ email: string; lead_ids: string[] }>;
};

async function fetchDiagnostics(): Promise<DiagResponse> {
  const res = await adminFetch("/api/admin/diagnostics/account-sync");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as DiagResponse;
  if (!body.success) throw new Error("Falha no diagnóstico");
  return body;
}

export function OrphanAccountsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "diagnostics", "account-sync"],
    queryFn: fetchDiagnostics,
    staleTime: 30_000,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshAll = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
  };

  const purgeAuth = async (email: string) => {
    if (!confirm(`Apagar auth user órfão ${email}?`)) return;
    setBusy(`auth:${email}`);
    setFeedback(null);
    try {
      const res = await adminFetch("/api/admin/auth-users/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setFeedback(body.error ?? `Falha (HTTP ${res.status})`);
      } else {
        setFeedback(`Auth user ${email} apagado.`);
        refreshAll();
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const restoreLead = async (id: string, email: string) => {
    if (!confirm(`Restaurar lead arquivado ${email}?`)) return;
    setBusy(`lead:${id}`);
    setFeedback(null);
    try {
      const res = await adminFetch(`/api/admin/leads/${id}/restore`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setFeedback(body.error ?? `Falha (HTTP ${res.status})`);
      } else {
        setFeedback(`Lead ${email} restaurado.`);
        refreshAll();
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-admin-text-secondary">A carregar diagnóstico…</div>;
  }
  if (error || !data) {
    return (
      <div className="text-sm text-admin-danger-600">
        Falha ao carregar diagnóstico. <button className="underline" onClick={() => refetch()}>Tentar de novo</button>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Auth órfãos" value={summary.orphan_auth_users} />
        <Stat label="Leads órfãos" value={summary.orphan_leads} />
        <Stat label="Arquivados" value={summary.archived_leads} />
        <Stat label="Emails duplicados" value={summary.duplicate_emails} />
      </div>
      <p className="text-xs text-admin-text-tertiary">
        Totais: {summary.total_auth_users} auth users · {summary.total_leads} leads
      </p>

      {feedback && (
        <div className="text-sm rounded border border-[var(--color-admin-border)] px-3 py-2 bg-admin-surface-muted">
          {feedback}
        </div>
      )}

      <Section title="Auth users órfãos (sem lead)">
        {data.orphan_auth_users.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <thead><Tr><Th>Email</Th><Th>Criado</Th><Th /></Tr></thead>
            <tbody>
              {data.orphan_auth_users.map((u) => (
                <Tr key={u.id}>
                  <Td>{u.email}</Td>
                  <Td>{u.created_at ? new Date(u.created_at).toLocaleDateString("pt-PT") : "—"}</Td>
                  <Td>
                    <button
                      type="button"
                      disabled={busy === `auth:${u.email}`}
                      onClick={() => purgeAuth(u.email)}
                      className="text-xs px-2 py-1 rounded border border-[var(--color-admin-border)] hover:bg-admin-surface-muted disabled:opacity-50"
                    >
                      Apagar
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Leads arquivados">
        {data.archived_leads.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <thead><Tr><Th>Email</Th><Th>Arquivado</Th><Th /></Tr></thead>
            <tbody>
              {data.archived_leads.map((l) => (
                <Tr key={l.id}>
                  <Td>{l.email}</Td>
                  <Td>{l.archived_at ? new Date(l.archived_at).toLocaleDateString("pt-PT") : "—"}</Td>
                  <Td>
                    <button
                      type="button"
                      disabled={busy === `lead:${l.id}`}
                      onClick={() => restoreLead(l.id, l.email)}
                      className="text-xs px-2 py-1 rounded border border-[var(--color-admin-border)] hover:bg-admin-surface-muted disabled:opacity-50"
                    >
                      Restaurar
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Leads sem auth user">
        {data.orphan_leads.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <thead><Tr><Th>Email</Th><Th>Criado</Th><Th>Arquivado</Th></Tr></thead>
            <tbody>
              {data.orphan_leads.map((l) => (
                <Tr key={l.id}>
                  <Td>{l.email}</Td>
                  <Td>{l.created_at ? new Date(l.created_at).toLocaleDateString("pt-PT") : "—"}</Td>
                  <Td>{l.archived_at ? "sim" : "não"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Emails duplicados">
        {data.duplicate_emails.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <thead><Tr><Th>Email</Th><Th>Lead IDs</Th></Tr></thead>
            <tbody>
              {data.duplicate_emails.map((d) => (
                <Tr key={d.email}>
                  <Td>{d.email}</Td>
                  <Td className="font-mono text-xs">{d.lead_ids.join(", ")}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[var(--color-admin-border)] bg-admin-surface px-3 py-2">
      <div className="text-xs text-admin-text-tertiary">{label}</div>
      <div className="text-xl font-semibold tabular-nums text-admin-text-primary">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-admin-text-primary">{title}</h3>
      {children}
    </section>
  );
}

function Empty() {
  return <div className="text-xs text-admin-text-tertiary">Sem ocorrências.</div>;
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border border-[var(--color-admin-border)]">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--color-admin-border)] last:border-b-0">{children}</tr>;
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left px-3 py-2 text-xs font-medium text-admin-text-tertiary bg-admin-surface-muted">{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-admin-text-primary ${className ?? ""}`}>{children}</td>;
}