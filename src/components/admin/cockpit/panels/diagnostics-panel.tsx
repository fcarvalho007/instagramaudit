/**
 * Diagnóstico — saúde técnica e configuração.
 * Read-only. Nunca expõe valores de segredos, apenas presença.
 */

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Database,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  DataSourceBadge,
  PresenceBadge,
  ProviderStatusBadge,
} from "../cockpit-badges";
import {
  formatCost,
  formatDate,
  formatDuration,
  formatNumber,
} from "../cockpit-formatters";
import type { CockpitData } from "../cockpit-types";
import { DataTable, type DataTableColumn } from "../parts/data-table";
import { EmptyState } from "../parts/empty-state";

interface Props {
  data: CockpitData | null;
}

const SECRET_LABELS: Array<{ key: keyof CockpitData["secrets"]; label: string }> = [
  { key: "APIFY_TOKEN", label: "APIFY_TOKEN" },
  { key: "RESEND_API_KEY", label: "RESEND_API_KEY" },
  { key: "INTERNAL_API_TOKEN", label: "INTERNAL_API_TOKEN" },
];

export function DiagnosticsPanel({ data }: Props) {
  if (!data) return <PanelSkeleton />;

  const providerCalls = data.recent_provider_calls.rows;
  const callColumns: DataTableColumn<(typeof providerCalls)[number]>[] = [
    { key: "created_at", header: "Quando", render: (r) => formatDate(r.created_at) },
    { key: "actor", header: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor}</span> },
    { key: "handle", header: "Handle", render: (r) => <span className="font-mono">@{r.handle}</span> },
    { key: "status", header: "Estado", render: (r) => <ProviderStatusBadge value={r.status} /> },
    { key: "http", header: "HTTP", align: "right", render: (r) => formatNumber(r.http_status) },
    { key: "duration", header: "Duração", align: "right", render: (r) => formatDuration(r.duration_ms) },
    { key: "posts", header: "Posts", align: "right", render: (r) => formatNumber(r.posts_returned) },
    { key: "cost", header: "Custo", align: "right", render: (r) => <span className="font-mono">{formatCost(r.estimated_cost_usd)}</span> },
  ];

  return (
    <div className="space-y-8">
      <ReadinessCard data={data} />

      <Section
        title="Segredos"
        description="Apenas estado. Os valores nunca são expostos."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SECRET_LABELS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3"
            >
              <span className="font-mono text-xs text-content-secondary">
                {s.label}
              </span>
              <PresenceBadge present={data.secrets[s.key]} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Apify"
        description="Estado do provedor e tarifas usadas para estimar custo."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KV label="APIFY_ENABLED">
            <Badge variant={data.apify.enabled ? "danger" : "success"} dot>
              {data.apify.enabled
                ? "Ligado · chamadas reais"
                : "Desligado · sem chamadas"}
            </Badge>
          </KV>
          <KV label="Modo de teste">
            <Badge
              variant={data.testing_mode.active ? "accent" : "warning"}
              dot
            >
              {data.testing_mode.active
                ? "Allowlist activa"
                : "Aberto · qualquer handle"}
            </Badge>
          </KV>
          <KV label="Custo / perfil">
            <span className="font-mono">
              {formatCost(data.apify.cost_per_profile_usd)}
            </span>
          </KV>
          <KV label="Custo / post">
            <span className="font-mono">
              {formatCost(data.apify.cost_per_post_usd)}
            </span>
          </KV>
        </div>
      </Section>

      <Section
        title="Modo de teste"
        description="Quando activo, só os handles na allowlist disparam chamadas reais ao provedor."
      >
        <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
              Estado
            </span>
            <Badge variant={data.testing_mode.active ? "accent" : "warning"} dot>
              {data.testing_mode.active ? "Activo" : "Inactivo · aberto"}
            </Badge>
          </div>
          {data.testing_mode.allowlist.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
                Handles autorizados ({data.testing_mode.allowlist.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.testing_mode.allowlist.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center rounded-md border border-accent-primary/30 bg-accent-primary/10 px-2.5 py-1 font-mono text-xs text-accent-luminous"
                  >
                    @{h}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <Badge variant="warning" dot>
                Allowlist vazia — nenhuma chamada real será permitida em modo de
                teste
              </Badge>
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Última snapshot"
        description="Estado da última análise armazenada."
      >
        {data.snapshots.error ? (
          <ErrorBox message={data.snapshots.error} />
        ) : data.snapshots.latest_at ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <KV label="Handle">
              <span className="font-mono">@{data.snapshots.latest_username}</span>
            </KV>
            <KV label="Fonte">
              <DataSourceBadge value={data.snapshots.latest_data_source} />
            </KV>
            <KV label="Provider">
              <span className="font-mono text-xs">
                {data.snapshots.latest_provider}
              </span>
            </KV>
            <KV label="Atualizada">{formatDate(data.snapshots.latest_at)}</KV>
          </div>
        ) : (
          <EmptyState
            icon={<Database className="size-4" />}
            tone="ok"
            title="Sem snapshots ainda."
            description="Esperado antes da primeira análise real. Após o primeiro pedido em /analyze/<handle>, a snapshot mais recente aparece aqui."
          />
        )}
        <p className="mt-2 text-xs text-content-tertiary">
          Total de snapshots:{" "}
          <span className="font-mono">{formatNumber(data.snapshots.total)}</span>
        </p>
      </Section>

      <Section
        title="Últimas chamadas ao provedor"
        description="Para investigar timeouts, falhas HTTP ou erros de configuração."
      >
        {data.recent_provider_calls.error ? (
          <ErrorBox message={data.recent_provider_calls.error} />
        ) : (
          <DataTable
            columns={callColumns}
            rows={providerCalls}
            rowKey={(r) => r.id}
            empty={
              <EmptyState
                icon={<Network className="size-4" />}
                tone="ok"
                title="Sem chamadas registadas."
                description="Quando o Apify for activado e a primeira análise correr, as últimas chamadas (sucesso, timeout, erro) aparecem aqui."
              />
            }
          />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-base text-content-primary">{title}</h3>
        {description ? (
          <p className="text-sm text-content-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </p>
      <div className="mt-1.5 text-sm text-content-primary">{children}</div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 p-3 text-xs text-signal-danger">
      {message}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated"
        />
      ))}
    </div>
  );
}

/**
 * ReadinessCard — leitura imediata de "posso ativar o Apify agora?".
 *
 * Estados:
 *   ready    — APIFY_TOKEN + INTERNAL_API_TOKEN presentes, modo de teste activo
 *              com allowlist não vazia. Seguro para o smoke test.
 *   warning  — falta token, allowlist vazia, ou modo de teste inactivo (mas
 *              APIFY_ENABLED também desligado, por isso não há gasto real).
 *   critical — APIFY_ENABLED=true E modo de teste inactivo (chamadas reais sem
 *              allowlist → potencial gasto descontrolado).
 */

type ReadinessTone = "ready" | "warning" | "critical";

interface ChecklistItem {
  ok: boolean;
  label: string;
  hint?: string;
}

function buildChecklist(data: CockpitData): ChecklistItem[] {
  const allowlistSize = data.testing_mode.allowlist.length;
  return [
    {
      ok: data.secrets.APIFY_TOKEN,
      label: "APIFY_TOKEN configurado",
      hint: data.secrets.APIFY_TOKEN
        ? undefined
        : "Define o token nos Secrets antes de activar o provedor.",
    },
    {
      ok: data.secrets.INTERNAL_API_TOKEN,
      label: "INTERNAL_API_TOKEN configurado",
      hint: data.secrets.INTERNAL_API_TOKEN
        ? undefined
        : "Necessário para o gate de refresh forçado (?refresh=1).",
    },
    {
      ok: data.secrets.RESEND_API_KEY,
      label: "RESEND_API_KEY configurado",
      hint: data.secrets.RESEND_API_KEY
        ? undefined
        : "Sem isto, o envio de relatórios por email falha.",
    },
    {
      ok: data.testing_mode.active && allowlistSize > 0,
      label:
        data.testing_mode.active && allowlistSize > 0
          ? `Modo de teste activo (allowlist com ${allowlistSize} handle${allowlistSize === 1 ? "" : "s"})`
          : data.testing_mode.active
            ? "Modo de teste activo, mas allowlist vazia"
            : "Modo de teste inactivo",
      hint: !data.testing_mode.active
        ? "Sem allowlist, qualquer username dispara Apify quando activado."
        : allowlistSize === 0
          ? "Adiciona pelo menos um handle (ex.: frederico.m.carvalho)."
          : undefined,
    },
  ];
}

function readinessTone(data: CockpitData, items: ChecklistItem[]): ReadinessTone {
  const apifyOnWithoutAllowlist =
    data.apify.enabled && !data.testing_mode.active;
  if (apifyOnWithoutAllowlist) return "critical";
  const allOk = items.every((i) => i.ok);
  return allOk ? "ready" : "warning";
}

function ReadinessCard({ data }: { data: CockpitData }) {
  const items = buildChecklist(data);
  const tone = readinessTone(data, items);

  const meta: Record<
    ReadinessTone,
    {
      title: string;
      kicker: string;
      description: string;
      Icon: typeof CheckCircle2;
      iconClass: string;
      badgeVariant: "success" | "warning" | "danger";
      borderClass: string;
    }
  > = {
    ready: {
      title: "Pronto para activar Apify",
      kicker: "Configuração segura",
      description:
        "Quando ligares APIFY_ENABLED, só os handles na allowlist disparam chamadas reais.",
      Icon: CheckCircle2,
      iconClass: "text-signal-success",
      badgeVariant: "success",
      borderClass: "border-signal-success/30",
    },
    warning: {
      title: "Configuração incompleta",
      kicker: "Atenção",
      description: data.apify.enabled
        ? "APIFY está ligado — verifica abaixo o que ainda precisa de ser corrigido."
        : "APIFY ainda está desligado, por isso não há gasto. Resolve os pontos abaixo antes de activar.",
      Icon: AlertTriangle,
      iconClass: "text-signal-warning",
      badgeVariant: "warning",
      borderClass: "border-signal-warning/30",
    },
    critical: {
      title: "Risco de gasto descontrolado",
      kicker: "Crítico",
      description:
        "APIFY_ENABLED está ligado SEM modo de teste. Qualquer username submetido vai disparar Apify. Desliga ou activa a allowlist imediatamente.",
      Icon: ShieldAlert,
      iconClass: "text-signal-danger",
      badgeVariant: "danger",
      borderClass: "border-signal-danger/40",
    },
  };

  const m = meta[tone];

  return (
    <section
      className={cn(
        "rounded-xl border bg-surface-elevated p-5 sm:p-6",
        m.borderClass,
      )}
      aria-label="Estado de prontidão para Apify"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <m.Icon className={cn("mt-0.5 size-6 shrink-0", m.iconClass)} aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
              {m.kicker}
            </p>
            <h3 className="font-display text-lg text-content-primary">{m.title}</h3>
            <p className="max-w-2xl text-sm text-content-secondary">{m.description}</p>
          </div>
        </div>
        <Badge variant={m.badgeVariant} dot pulse={tone === "critical"}>
          {tone === "ready"
            ? "Pronto"
            : tone === "warning"
              ? "Atenção"
              : "Crítico"}
        </Badge>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-2.5 rounded-md border border-border-subtle bg-surface-base px-3 py-2.5"
          >
            {item.ok ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-signal-success"
                aria-label="OK"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-signal-warning"
                aria-label="Por resolver"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm text-content-primary">{item.label}</p>
              {!item.ok && item.hint ? (
                <p className="mt-0.5 text-xs text-content-tertiary">{item.hint}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
