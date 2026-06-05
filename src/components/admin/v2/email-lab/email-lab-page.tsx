/**
 * EmailLabPage — laboratório read-only dos templates operacionais.
 *
 * Visual alinhado com o mockup pós-pivot light-first:
 *   - header com KPIs + acções dominantes;
 *   - lista esquerda agrupada por categoria com search;
 *   - painel direito com tabs Pré-visualização / Variáveis / Wiring
 *     e frame estilo email client.
 * Continua sem fetch, sem mutações, sem chamadas a Resend/Brevo.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileCheck2,
  MessageSquare,
  Bookmark,
  Sparkles,
  Send,
  DollarSign,
  CreditCard,
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AdminPageHeader } from "../admin-page-header";
import { AdminCard } from "../admin-card";
import { AdminActionButton } from "../admin-action-button";
import type { RenderedEmail } from "@/lib/email/templates";
import {
  EMAIL_TEMPLATES as TEMPLATES,
  CATEGORY_LABELS,
  LIFECYCLE_ORDER,
  LIFECYCLE_LABELS,
  STATUS_BADGE_LABELS,
  type EmailTemplateKey as TemplateKey,
  type EmailLifecycleStage,
  type EmailStatusBadge,
  type EmailTemplateEntry,
} from "@/lib/admin/email-template-registry";
import { adminFetch } from "@/lib/admin/fetch";
import type { AutomationFlowResponse } from "@/lib/admin/automation-flow-types";

const TEMPLATE_ICON: Record<TemplateKey, LucideIcon> = {
  request_received: CheckCircle2,
  report_ready: FileCheck2,
  feedback_request: MessageSquare,
  personal_area_saved: Bookmark,
  welcome_beta: Sparkles,
  report_summary: Send,
  commercial_followup: DollarSign,
  payment_confirmed: CreditCard,
  report_saved: Bookmark,
};

type DetailTab = "preview" | "variables" | "wiring";

type FilterChip =
  | "todos"
  | "ligados"
  | "manuais"
  | "transaccionais"
  | "kill_switch"
  | "legado"
  | "sem_trigger";

const FILTER_CHIPS: Array<{ key: FilterChip; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "ligados", label: "Ligados" },
  { key: "manuais", label: "Manuais" },
  { key: "transaccionais", label: "Transaccionais" },
  { key: "kill_switch", label: "Kill-switch" },
  { key: "legado", label: "Legado" },
  { key: "sem_trigger", label: "Sem trigger" },
];

function lifecycleOf(t: EmailTemplateEntry): EmailLifecycleStage {
  if (t.lifecycleStage) return t.lifecycleStage;
  // Defensive fallback — should never happen with current registry.
  return "legado";
}

function badgesOf(t: EmailTemplateEntry): EmailStatusBadge[] {
  if (t.statusBadges && t.statusBadges.length > 0) return t.statusBadges;
  return t.wired ? ["ligado"] : ["sem_trigger"];
}

function matchesChip(t: EmailTemplateEntry, chip: FilterChip): boolean {
  const badges = badgesOf(t);
  switch (chip) {
    case "todos":
      return true;
    case "ligados":
      return badges.includes("ligado");
    case "manuais":
      return badges.includes("manual");
    case "transaccionais":
      return badges.includes("transaccional");
    case "kill_switch":
      return badges.includes("kill_switch_off");
    case "legado":
      return lifecycleOf(t) === "legado" || badges.includes("legado");
    case "sem_trigger":
      return badges.includes("sem_trigger");
  }
}

export function EmailLabPage() {
  const [selectedKey, setSelectedKey] = useState<TemplateKey>(() => {
    if (typeof window === "undefined") return "request_received";
    const url = new URL(window.location.href);
    const t = url.searchParams.get("template") as TemplateKey | null;
    if (t && TEMPLATES.some((x) => x.key === t)) return t;
    return "request_received";
  });
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<FilterChip>("todos");
  const [tab, setTab] = useState<DetailTab>("preview");
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  const [reloadTick, setReloadTick] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "ok">("idle");

  const selected = TEMPLATES.find((t) => t.key === selectedKey)!;
  const rendered = useMemo<RenderedEmail | { error: string }>(() => {
    try {
      return selected.render();
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
    // reloadTick lets "Recarregar wiring" force a re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, reloadTick]);
  const renderError = "error" in rendered ? rendered.error : null;
  const safeRendered = renderError ? null : (rendered as RenderedEmail);

  const wiredCount = TEMPLATES.filter((t) => t.wired).length;
  const orphanCount = TEMPLATES.length - wiredCount;

  // Reaproveita o agregado de /api/admin/automation-flow para mostrar
  // contagem real de envios nos últimos 30 dias (mesma fonte que o cockpit
  // de automações). Sem novo endpoint, sem chamada extra ao DB.
  const { data: flowData } = useQuery({
    queryKey: ["admin", "automation-flow"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/automation-flow");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as AutomationFlowResponse;
    },
    staleTime: 30_000,
  });
  const sentLast30d = flowData?.kpis?.sent.last30d ?? null;

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filterText = (t: EmailTemplateEntry) =>
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.internalName.toLowerCase().includes(q) ||
      t.shortDescription.toLowerCase().includes(q);

    return LIFECYCLE_ORDER.map((stage) => ({
      stage,
      label: LIFECYCLE_LABELS[stage],
      items: TEMPLATES.filter((t) => lifecycleOf(t) === stage)
        .filter((t) => matchesChip(t, chip))
        .filter(filterText),
    })).filter((g) => g.items.length > 0);
  }, [search, chip]);

  const handleCopy = async () => {
    if (!safeRendered) return;
    try {
      await navigator.clipboard.writeText(safeRendered.html);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      /* noop */
    }
  };

  const handleOpenHtml = () => {
    if (!safeRendered || typeof window === "undefined") return;
    const blob = new Blob([safeRendered.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <>
      <AdminPageHeader
        title="Templates de email"
        subtitle="Pré-visualização e edição dos emails operacionais. Nada é enviado a partir desta página."
        actions={
          <>
            <AdminActionButton onClick={() => setReloadTick((t) => t + 1)}>
              <RefreshCw size={14} />
              Recarregar wiring
            </AdminActionButton>
            <SendTestButton size="md" />
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Total" value={TEMPLATES.length} sub="templates" />
          <KpiTile
            label="Ligados"
            value={wiredCount}
            sub="com trigger"
            tone="success"
          />
          <KpiTile
            label="Sem trigger"
            value={orphanCount}
            sub={orphanCount === 1 ? "por ligar" : "por ligar"}
            tone="warning"
          />
          <KpiTile
            label="Envios (30d)"
            value={sentLast30d ?? "—"}
            sub={sentLast30d === null ? "a carregar…" : "eventos registados"}
            tone={sentLast30d && sentLast30d > 0 ? "default" : "muted"}
          />
        </div>

        <ReadOnlyBanner />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          {/* Lista */}
          <div className="flex flex-col gap-3">
            <SearchBox value={search} onChange={setSearch} />
            <FilterChips value={chip} onChange={setChip} />
            {grouped.length === 0 ? (
              <p className="text-[12px] text-admin-text-tertiary">
                Sem templates a corresponder ao filtro.
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.stage} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between px-1">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: lifecycleAccent(group.stage) }}
                    >
                      • {group.label}
                    </span>
                    <span className="text-[10px] tabular-nums text-admin-text-tertiary">
                      {group.items.length}
                    </span>
                  </div>
                  {group.stage === "legado" ? (
                    <p className="px-1 text-[10px] italic text-admin-text-tertiary">
                      Mantidos em disco para auditoria — não disparam.
                    </p>
                  ) : null}
                  {group.items.map((t) => (
                    <TemplateCard
                      key={t.key}
                      template={t}
                      active={t.key === selectedKey}
                      onClick={() => {
                        setSelectedKey(t.key);
                        setTab("preview");
                      }}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Detalhe */}
          <AdminCard variant="flush" className="overflow-hidden">
            <DetailHeader
              template={selected}
              onCopy={handleCopy}
              onOpenHtml={handleOpenHtml}
              copyState={copyState}
              hasContent={Boolean(safeRendered)}
            />

            <DetailTabs tab={tab} onChange={setTab} />

            <div className="p-5">
              {tab === "preview" ? (
                <PreviewTab
                  template={selected}
                  rendered={safeRendered}
                  renderError={renderError}
                  previewMode={previewMode}
                  onPreviewModeChange={setPreviewMode}
                />
              ) : tab === "variables" ? (
                <VariablesTab template={selected} />
              ) : (
                <WiringTab template={selected} />
              )}
            </div>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Send-test button (disabled with tooltip — alinhado com /admin/automacoes) */
/* ────────────────────────────────────────────────────────────────────────── */

function SendTestButton({ size = "md" }: { size?: "sm" | "md" }) {
  const height = size === "sm" ? "h-8" : "h-8";
  const iconSize = size === "sm" ? 13 : 14;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            className={`inline-flex ${height} items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white`}
            style={{
              background: "rgb(var(--admin-button-dark))",
              opacity: 0.85,
              cursor: "not-allowed",
            }}
          >
            <Send size={iconSize} />
            Enviar teste
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Disponível em breve</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* KPI tile                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function KpiTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const accent =
    tone === "success"
      ? "rgb(var(--admin-success-500))"
      : tone === "warning"
        ? "rgb(var(--admin-warning-500))"
        : tone === "muted"
          ? "rgb(var(--admin-text-tertiary))"
          : "rgb(var(--admin-text-primary))";
  const bgTint =
    tone === "success"
      ? "rgb(var(--admin-success-500) / 0.06)"
      : tone === "warning"
        ? "rgb(var(--admin-warning-500) / 0.06)"
        : tone === "muted"
          ? "rgb(var(--admin-surface-muted))"
          : "rgb(var(--admin-surface-base))";
  return (
    <AdminCard variant="flush" className="overflow-hidden">
      <div
        className="flex flex-col gap-1 px-4 py-3"
        style={{ background: bgTint }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-tertiary">
          {label}
        </span>
        <span
          className="text-[22px] font-semibold leading-none tabular-nums"
          style={{ color: accent }}
        >
          {value}
        </span>
        {sub ? (
          <span className="text-[11px] text-admin-text-tertiary">{sub}</span>
        ) : null}
      </div>
    </AdminCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Search                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label
      className="flex h-9 items-center gap-2 rounded-lg border px-3"
      style={{
        borderColor: "rgb(var(--admin-border-default))",
        background: "rgb(var(--admin-surface-base))",
      }}
    >
      <Search size={14} className="text-admin-text-tertiary" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Procurar template..."
        className="w-full border-0 bg-transparent text-[13px] text-admin-text-primary outline-none placeholder:text-admin-text-tertiary"
      />
    </label>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Template card                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function TemplateCard({
  template,
  active,
  onClick,
}: {
  template: EmailTemplateEntry;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = TEMPLATE_ICON[template.key];
  const orphan = !template.wired;

  const borderStyle = active
    ? `1.5px solid rgb(var(--admin-leads-500))`
    : orphan
      ? `1px dashed rgb(var(--admin-warning-500) / 0.6)`
      : `1px solid rgb(var(--admin-border-default))`;
  const background = active
    ? "rgb(var(--admin-leads-500) / 0.06)"
    : "rgb(var(--admin-surface-base))";

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-3 py-3 text-left transition-colors"
      style={{ border: borderStyle, background }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: active
              ? "rgb(var(--admin-leads-500) / 0.12)"
              : "rgb(var(--admin-surface-muted))",
            color: active
              ? "rgb(var(--admin-leads-500))"
              : "rgb(var(--admin-text-secondary))",
          }}
        >
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {active ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
                  style={{ background: "rgb(var(--admin-leads-500))" }}
                  aria-hidden="true"
                />
              ) : null}
              <span className="truncate text-[13px] font-medium text-admin-text-primary">
                {template.title}
              </span>
            </div>
            <StatusPill wired={template.wired} />
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-admin-text-tertiary">
            {template.internalName}
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] text-admin-text-secondary">
            {template.shortDescription}
          </p>
        </div>
      </div>
    </button>
  );
}

function StatusPill({ wired }: { wired: boolean }) {
  return wired ? (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
      style={{
        background: "rgb(var(--admin-success-500) / 0.12)",
        color: "rgb(var(--admin-success-500))",
      }}
    >
      Ligado
    </span>
  ) : (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
      style={{
        background: "rgb(var(--admin-warning-500) / 0.12)",
        color: "rgb(var(--admin-warning-500))",
      }}
    >
      Sem trigger
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Detail header & tabs                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function DetailHeader({
  template,
  onCopy,
  onOpenHtml,
  copyState,
  hasContent,
}: {
  template: EmailTemplateEntry;
  onCopy: () => void;
  onOpenHtml: () => void;
  copyState: "idle" | "ok";
  hasContent: boolean;
}) {
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3"
      style={{ borderBottom: "1px solid rgb(var(--admin-border-default))" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="m-0 text-[18px] font-semibold text-admin-text-primary">
            {template.title}
          </h2>
          <StatusPill wired={template.wired} />
        </div>
        <p className="mt-1 font-mono text-[11px] text-admin-text-tertiary">
          {template.internalName} ·{" "}
          <span className="lowercase">
            {CATEGORY_LABELS[template.category]}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AdminActionButton onClick={onOpenHtml} disabled={!hasContent}>
          <ExternalLink size={13} />
          Ver HTML
        </AdminActionButton>
        <AdminActionButton onClick={onCopy} disabled={!hasContent}>
          <Copy size={13} />
          {copyState === "ok" ? "Copiado" : "Copiar"}
        </AdminActionButton>
        <SendTestButton size="sm" />
      </div>
    </div>
  );
}

function DetailTabs({
  tab,
  onChange,
}: {
  tab: DetailTab;
  onChange: (t: DetailTab) => void;
}) {
  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: "preview", label: "Pré-visualização" },
    { key: "variables", label: "Variáveis" },
    { key: "wiring", label: "Wiring" },
  ];
  return (
    <div
      className="flex items-center gap-1 px-5 pt-3 pb-0"
      style={{ borderBottom: "1px solid rgb(var(--admin-border-default))" }}
    >
      {tabs.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className="relative px-3 pb-2.5 pt-1 text-[12px] font-medium transition-colors"
            style={{
              color: active
                ? "rgb(var(--admin-text-primary))"
                : "rgb(var(--admin-text-tertiary))",
            }}
          >
            {t.label}
            {active ? (
              <span
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                style={{ background: "rgb(var(--admin-text-primary))" }}
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tabs                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function PreviewTab({
  template,
  rendered,
  renderError,
  previewMode,
  onPreviewModeChange,
}: {
  template: EmailTemplateEntry;
  rendered: RenderedEmail | null;
  renderError: string | null;
  previewMode: "html" | "text";
  onPreviewModeChange: (m: "html" | "text") => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border p-3"
        style={{ borderColor: "rgb(var(--admin-border-default))" }}>
        <MetaRow
          label="Subject"
          value={rendered?.subject ?? "—"}
        />
        {template.preheader ? (
          <MetaRow label="Preheader" value={template.preheader} />
        ) : null}
        <MetaRow
          label="Para"
          value="{{email}}"
          mono
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-admin-text-tertiary">
          Pré-visualização — dados de exemplo, nada é enviado.
        </span>
        <div
          className="flex items-center gap-1 rounded-md border p-0.5"
          style={{ borderColor: "rgb(var(--admin-border-default))" }}
        >
          {(["html", "text"] as const).map((mode) => {
            const active = mode === previewMode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onPreviewModeChange(mode)}
                className="rounded px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  background: active
                    ? "rgb(var(--admin-text-primary))"
                    : "transparent",
                  color: active
                    ? "#ffffff"
                    : "rgb(var(--admin-text-secondary))",
                }}
              >
                {mode === "html" ? "HTML" : "Texto"}
              </button>
            );
          })}
        </div>
      </div>

      {renderError ? (
        <p className="text-[13px] text-admin-danger-500">
          Erro ao renderizar template: {renderError}
        </p>
      ) : (
        <EmailClientFrame>
          {previewMode === "html" ? (
            <iframe
              srcDoc={rendered!.html}
              sandbox=""
              title={`Pré-visualização — ${template.title}`}
              className="block w-full"
              style={{ height: 560, border: 0, background: "#ffffff" }}
            />
          ) : (
            <pre
              className="m-0 max-h-[560px] overflow-auto p-5 font-mono text-[12px] leading-relaxed text-admin-text-primary whitespace-pre-wrap break-words"
              style={{ background: "#ffffff" }}
            >
              {rendered!.text}
            </pre>
          )}
        </EmailClientFrame>
      )}
    </div>
  );
}

function VariablesTab({ template }: { template: EmailTemplateEntry }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr
            style={{
              borderBottom: "1px solid rgb(var(--admin-border-default))",
            }}
          >
            <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-tertiary">
              Variável
            </th>
            <th className="py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-tertiary">
              Valor de exemplo
            </th>
          </tr>
        </thead>
        <tbody>
          {template.variables.map((v) => (
            <tr
              key={v.key}
              style={{
                borderBottom: "1px solid rgb(var(--admin-border-default))",
              }}
            >
              <td className="py-2 pr-4 font-mono text-admin-text-secondary whitespace-nowrap">
                {v.key}
              </td>
              <td className="py-2 font-mono text-admin-text-primary break-all">
                {v.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WiringTab({ template }: { template: EmailTemplateEntry }) {
  return (
    <div className="flex flex-col gap-3">
      <MetaRow
        label="Estado"
        value={template.wired ? "Ligado a um trigger" : "Sem trigger"}
      />
      <MetaRow
        label="Origem"
        value={template.wiredAt ?? "Não está ligado a nenhum endpoint"}
        mono={Boolean(template.wiredAt)}
      />
      {template.wiredNote ? (
        <p className="rounded-lg border p-3 text-[12px] text-admin-text-secondary"
          style={{
            borderColor: "rgb(var(--admin-border-default))",
            background: "rgb(var(--admin-surface-muted))",
          }}>
          {template.wiredNote}
        </p>
      ) : null}
      {!template.wired ? (
        <p
          className="rounded-lg border p-3 text-[12px]"
          style={{
            borderColor: "rgb(var(--admin-warning-500) / 0.4)",
            background: "rgb(var(--admin-warning-500) / 0.06)",
            color: "rgb(var(--admin-warning-500))",
          }}
        >
          Este template ainda não tem trigger. Vai ser ligado num sprint
          dedicado — entretanto, fica disponível só para pré-visualização.
        </p>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Email client frame                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function EmailClientFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: "rgb(var(--admin-border-default))",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: "rgb(var(--admin-surface-muted))",
          borderBottom: "1px solid rgb(var(--admin-border-default))",
        }}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
        </span>
        <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.08em] text-admin-text-tertiary">
          Inbox · Mira
        </span>
      </div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Misc                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-tertiary">
        {label}
      </span>
      <span
        className={`text-[13px] text-admin-text-primary break-words ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ReadOnlyBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border px-4 py-2.5 text-[12px]"
      style={{
        borderColor: "rgb(var(--admin-info-500) / 0.3)",
        background: "rgb(var(--admin-info-500) / 0.06)",
      }}
    >
      <span
        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={{
          background: "rgb(var(--admin-info-500))",
          color: "#ffffff",
        }}
        aria-hidden="true"
      >
        i
      </span>
      <span>
        <strong className="font-semibold text-admin-text-primary">
          Modo visualização.
        </strong>{" "}
        <span className="text-admin-text-secondary">
          Nenhum email é enviado a partir desta página. Os envios reais
          continuam a acontecer em <em>Leads</em> e nas automações
          operacionais.
        </span>
      </span>
    </div>
  );
}

function lifecycleAccent(stage: EmailLifecycleStage): string {
  switch (stage) {
    case "captacao":
      return "rgb(var(--admin-leads-500))";
    case "entrega":
      return "rgb(var(--admin-info-500))";
    case "retencao":
      return "rgb(var(--admin-warning-500))";
    case "conversao":
      return "rgb(var(--admin-leads-500))";
    case "pagamento":
      return "rgb(var(--admin-success-500))";
    case "legado":
      return "rgb(var(--admin-text-tertiary))";
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Filter chips                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function FilterChips({
  value,
  onChange,
}: {
  value: FilterChip;
  onChange: (c: FilterChip) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTER_CHIPS.map((c) => {
        const active = c.key === value;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              border: `1px solid ${
                active
                  ? "rgb(var(--admin-text-primary))"
                  : "rgb(var(--admin-border-default))"
              }`,
              background: active
                ? "rgb(var(--admin-text-primary))"
                : "rgb(var(--admin-surface-base))",
              color: active
                ? "#ffffff"
                : "rgb(var(--admin-text-secondary))",
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Status badges                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function badgeStyle(badge: EmailStatusBadge): {
  bg: string;
  fg: string;
} {
  switch (badge) {
    case "ligado":
      return {
        bg: "rgb(var(--admin-success-500) / 0.12)",
        fg: "rgb(var(--admin-success-500))",
      };
    case "manual":
      return {
        bg: "rgb(var(--admin-leads-500) / 0.12)",
        fg: "rgb(var(--admin-leads-500))",
      };
    case "transaccional":
      return {
        bg: "rgb(var(--admin-text-primary) / 0.08)",
        fg: "rgb(var(--admin-text-primary))",
      };
    case "kill_switch_off":
    case "planeado":
    case "sem_trigger":
      return {
        bg: "rgb(var(--admin-warning-500) / 0.12)",
        fg: "rgb(var(--admin-warning-500))",
      };
    case "legado":
    case "desactivado":
      return {
        bg: "rgb(var(--admin-text-tertiary) / 0.12)",
        fg: "rgb(var(--admin-text-tertiary))",
      };
  }
}

function StatusBadge({ badge }: { badge: EmailStatusBadge }) {
  const s = badgeStyle(badge);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: s.bg, color: s.fg }}
    >
      {STATUS_BADGE_LABELS[badge]}
    </span>
  );
}

function StatusBadgeRow({
  badges,
  max,
}: {
  badges: EmailStatusBadge[];
  max?: number;
}) {
  const limit = max ?? badges.length;
  const visible = badges.slice(0, limit);
  const overflow = badges.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((b) => (
        <StatusBadge key={b} badge={b} />
      ))}
      {overflow > 0 ? (
        <span className="text-[9px] font-semibold text-admin-text-tertiary">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

