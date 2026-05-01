/**
 * Segredos e configuração — dados reais via API.
 */

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { AdminInfoTooltip } from "@/components/admin/v2/admin-info-tooltip";
import {
  SectionError,
  SectionSkeleton,
} from "@/components/admin/v2/section-state";
import { CostCapsModal } from "@/components/admin/v2/sistema/cost-caps-modal";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/fetch";
import type {
  CostCaps,
  RuntimeCheck,
  SecretPresence,
} from "@/lib/admin/system-queries.server";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

function CardHeader({ title, info }: { title: string; info: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
        {title}
      </h3>
      <AdminInfoTooltip label={info} />
    </div>
  );
}

export function SecretsConfigSection() {
  const [capsOpen, setCapsOpen] = useState(false);
  const secrets = useQuery({
    queryKey: ["admin", "sistema", "secrets"],
    queryFn: () => fetchJson<SecretPresence[]>("/api/admin/sistema/secrets"),
    refetchInterval: 60_000,
  });
  const checks = useQuery({
    queryKey: ["admin", "sistema", "runtime-checks"],
    queryFn: () =>
      fetchJson<RuntimeCheck[]>("/api/admin/sistema/runtime-checks"),
    refetchInterval: 60_000,
  });
  const caps = useQuery({
    queryKey: ["admin", "sistema", "caps"],
    queryFn: () => fetchJson<CostCaps>("/api/admin/sistema/caps"),
  });

  const apifyEnabled = checks.data?.find((c) => c.name === "APIFY_ENABLED");
  const dfsEnabled = checks.data?.find(
    (c) => c.name === "DATAFORSEO_ENABLED",
  );
  const apifyTestMode = checks.data?.find(
    (c) => c.name === "Modo de teste Apify",
  );

  return (
    <section>
      <AdminSectionHeader
        accent="neutral"
        title="Segredos e configuração"
        info="Estado dos segredos configurados (apenas presença, nunca o valor) e parâmetros operacionais."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminCard>
          <CardHeader
            title="Segredos"
            info="Apenas estado de presença. Os valores nunca são expostos."
          />
          {secrets.isLoading ? (
            <SectionSkeleton rows={6} rowHeight={32} />
          ) : secrets.error ? (
            <SectionError
              error={secrets.error}
              onRetry={() => secrets.refetch()}
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {(secrets.data ?? []).map((s) => (
                <li
                  key={s.name}
                  className="flex items-center justify-between rounded-lg bg-admin-surface-muted px-3.5 py-3"
                >
                  <span className="font-mono text-[12px] text-admin-text-primary">
                    {s.name}
                  </span>
                  {s.configured ? (
                    <AdminBadge variant="revenue">Configurado</AdminBadge>
                  ) : (
                    <AdminBadge variant="danger">Em falta</AdminBadge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
                Configuração de custos
              </h3>
              <AdminInfoTooltip label="Estado dos provedores e caps mensais configurados em app_config." />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCapsOpen(true)}
              disabled={!caps.data}
            >
              Editar caps
            </Button>
          </div>
          {checks.isLoading || caps.isLoading ? (
            <SectionSkeleton rows={4} rowHeight={48} />
          ) : checks.error || caps.error ? (
            <SectionError
              error={checks.error ?? caps.error}
              onRetry={() => {
                checks.refetch();
                caps.refetch();
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-admin-border">
              <ConfigCell
                eyebrow="APIFY_ENABLED"
                value={apifyEnabled?.detail ?? "—"}
                sub={`Cap $${caps.data?.apify ?? "—"}`}
                tone={apifyEnabled?.status === "ok" ? "positive" : "default"}
              />
              <ConfigCell
                eyebrow="DATAFORSEO_ENABLED"
                value={dfsEnabled?.detail ?? "—"}
                sub={`Cap $${caps.data?.dataforseo ?? "—"}`}
                tone={dfsEnabled?.status === "ok" ? "positive" : "default"}
              />
              <ConfigCell
                eyebrow="OPENAI"
                value="API key configurada"
                sub={`Cap $${caps.data?.openai ?? "—"}`}
                tone={
                  checks.data?.find((c) => c.name === "OpenAI API Key")
                    ?.status === "ok"
                    ? "positive"
                    : "default"
                }
              />
              <ConfigCell
                eyebrow="MODO TESTE APIFY"
                value={apifyTestMode?.detail ?? "—"}
                sub="só handles na allowlist"
                tone={apifyTestMode?.status === "ok" ? "positive" : "default"}
              />
            </div>
          )}
          <p className="mt-3 text-[11px] text-admin-text-tertiary">
            Caps guardados em <code>app_config</code>. "Editar caps" atualiza
            os valores em tempo real.
          </p>
        </AdminCard>
      </div>
      {caps.data ? (
        <CostCapsModal
          open={capsOpen}
          onOpenChange={setCapsOpen}
          initial={caps.data}
        />
      ) : null}
    </section>
  );
}

function ConfigCell({
  eyebrow,
  value,
  sub,
  tone,
}: {
  eyebrow: string;
  value: string;
  sub: string;
  tone?: "default" | "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-admin-revenue-700"
      : tone === "negative"
        ? "text-admin-danger-700"
        : "text-admin-text-primary";
  return (
    <div className="bg-admin-surface px-4 py-3.5">
      <p className="text-eyebrow-sm m-0 text-admin-text-tertiary">
        {eyebrow}
      </p>
      <p className={`m-0 mt-1 font-mono text-[14px] ${valueClass}`}>{value}</p>
      <p className="m-0 mt-0.5 text-[11px] text-admin-text-tertiary">{sub}</p>
    </div>
  );
}
