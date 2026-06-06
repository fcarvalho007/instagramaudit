/**
 * /admin/report-lab — Report Lab: visual variant preview for admin.
 *
 * Allows switching between public_mvp, internal_lab, and pro_preview
 * using the same ReportShellV2, without duplicating report code.
 *
 * - Admin-only (inherits admin layout gate).
 * - Does NOT call providers, does NOT expire snapshots.
 * - Loads cached snapshots via existing admin API.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportShellV2 } from "@/components/report-redesign/v2/report-shell-v2";
import { adminFetch } from "@/lib/admin/fetch";
import {
  snapshotToReportData,
  type AdapterResult,
  type SnapshotPayload,
  type SnapshotMetadata,
  type ReportBenchmarkInput,
} from "@/lib/report/snapshot-to-report-data";
import {
  type ReportVariant,
  getVariantFeatures,
  type FeatureVisibility,
  type VariantFeatures,
  FEATURE_LABELS,
  MODULE_READINESS,
  READINESS_STATUS_LABELS,
  type ReadinessStatus,
  type RiskLevel,
} from "@/lib/report/report-variant";
import { cn } from "@/lib/utils";
import { BLOCKS } from "@/components/report-redesign/v2/block-config";
import {
  FlaskConical,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  ClipboardCheck,
} from "lucide-react";
import { ModuleVisibilityMatrix } from "@/components/admin/v2/module-visibility-matrix";
import { readAdminEmail } from "@/lib/admin/simple-gate";
import { toast } from "sonner";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

// ── Search params schema ───────────────────────────────────────────

const VALID_VARIANTS = ["public_mvp", "internal_lab", "pro_preview"] as const;

const labSearchSchema = z.object({
  profile: fallback(z.string(), "").default(""),
  variant: fallback(z.enum(VALID_VARIANTS), "internal_lab").default("internal_lab"),
});

export const Route = createFileRoute("/admin/report-lab")({
  validateSearch: zodValidator(labSearchSchema),
  component: ReportLabPage,
});

// ── localStorage persistence ───────────────────────────────────────

const LS_KEY = "admin.report-lab.last";

interface LabPrefs { profile: string; variant: ReportVariant }

function readLabPrefs(): LabPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.profile === "string" && VALID_VARIANTS.includes(parsed.variant)) {
      return parsed as LabPrefs;
    }
  } catch { /* ignore */ }
  return null;
}

function writeLabPrefs(prefs: LabPrefs): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

// ── Constants ──────────────────────────────────────────────────────

const TEST_PROFILES = ["frederico.m.carvalho", "martimsilvai"] as const;

const VARIANT_OPTIONS: { value: ReportVariant; label: string; description: string }[] = [
  { value: "public_mvp", label: "Público geral", description: "Mostra blocos incluídos, secções premium bloqueadas e CTA de desbloqueio." },
  { value: "internal_lab", label: "Laboratório interno", description: "Mostra todos os blocos desbloqueados para trabalho/admin." },
  { value: "pro_preview", label: "Pro Preview", description: "Simula uma versão paga com todos os blocos desbloqueados." },
];

const MODE_TONES: Record<ReportVariant, string> = {
  public_mvp: "bg-blue-50 border-blue-200 text-blue-700",
  internal_lab: "bg-amber-50 border-amber-200 text-amber-700",
  pro_preview: "bg-purple-50 border-purple-200 text-purple-700",
};

// ── Snapshot loading ───────────────────────────────────────────────

interface SnapshotResponse {
  success: boolean;
  snapshot: {
    id: string;
    instagram_username: string;
    payload: SnapshotPayload;
    meta: SnapshotMetadata;
    created_at: string;
    expires_at: string | null;
    benchmark?: ReportBenchmarkInput;
  } | null;
  error_code?: string;
  message?: string;
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      result: AdapterResult;
      snapshotId: string;
      payload: SnapshotPayload;
      createdAt: string;
      expiresAt: string | null;
    };

// ── Main page ──────────────────────────────────────────────────────

function ReportLabPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const initialised = useRef(false);

  // ── Resolve initial values: query > localStorage > defaults ──
  const resolved = (() => {
    const saved = readLabPrefs();
    const p = search.profile || saved?.profile || TEST_PROFILES[0];
    const v = (search.profile ? search.variant : null) ?? saved?.variant ?? "internal_lab";
    return { profile: p, variant: v };
  })();

  const isPreset = (TEST_PROFILES as readonly string[]).includes(resolved.profile);

  const [profile, setProfile] = useState<string>(isPreset ? resolved.profile : TEST_PROFILES[0]);
  const [customProfile, setCustomProfile] = useState(isPreset ? "" : resolved.profile);
  const [committedCustom, setCommittedCustom] = useState(isPreset ? "" : resolved.profile);
  const [variant, setVariant] = useState<ReportVariant>(resolved.variant);
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [showModules, setShowModules] = useState(false);

  const activeProfile = committedCustom.trim() || profile;

  // ── Sync state → URL + localStorage ──
  useEffect(() => {
    // Skip the very first render to avoid replacing URL on mount when
    // state already matches the resolved search params.
    if (!initialised.current) {
      initialised.current = true;
      // But still persist to localStorage on first load
      writeLabPrefs({ profile: activeProfile, variant });
      return;
    }
    writeLabPrefs({ profile: activeProfile, variant });
    navigate({
      search: { profile: activeProfile, variant },
      replace: true,
    });
  }, [activeProfile, variant, navigate]);

  const loadSnapshot = useCallback(async (handle: string) => {
    setLoad({ kind: "loading" });
    try {
      const res = await adminFetch(
        `/api/admin/snapshot/${encodeURIComponent(handle.toLowerCase())}`,
      );
      const body = (await res.json().catch(() => ({}))) as SnapshotResponse;
      if (!res.ok || !body.success) {
        setLoad({ kind: "error", message: body.message ?? `Erro ${res.status}` });
        return;
      }
      if (!body.snapshot) {
        setLoad({ kind: "missing" });
        return;
      }
      const result = snapshotToReportData({
        payload: body.snapshot.payload ?? {},
        meta: body.snapshot.meta ?? undefined,
        benchmark: body.snapshot.benchmark,
      });
      setLoad({
        kind: "ready",
        result,
        snapshotId: body.snapshot.id,
        payload: body.snapshot.payload ?? {},
        createdAt: body.snapshot.created_at,
        expiresAt: body.snapshot.expires_at ?? null,
      });
    } catch (e) {
      setLoad({
        kind: "error",
        message: e instanceof Error ? e.message : "Erro desconhecido.",
      });
    }
  }, []);

  // Auto-load on profile change
  useEffect(() => {
    if (activeProfile) loadSnapshot(activeProfile);
  }, [activeProfile, loadSnapshot]);

  return (
    <div className="space-y-6">
      {/* ── 1. BANNER compacto ─────────────────────────────────── */}
      <div className={cn("rounded-xl border px-5 py-2.5 text-[13px] font-medium flex items-center gap-2", MODE_TONES[variant])}>
        <span className="shrink-0 text-xs">⚠</span>
        <span>
          {variant === "internal_lab"
            ? "Laboratório interno"
            : variant === "pro_preview"
              ? "Pré-visualização Pro"
              : "Versão pública"}
          {" — "}esta pré-visualização não altera dados nem gera novas análises.
        </span>
      </div>

      {/* ── 2. CONTROLOS: Perfil + Variante ────────────────────── */}
      <section>
        <div className="rounded-xl border border-admin-border bg-white p-5">
          <div className="flex flex-wrap items-start gap-8">
            {/* Profile selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-admin-text-tertiary">
                Perfil em análise
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={profile}
                  onChange={(e) => {
                    setProfile(e.target.value);
                    setCustomProfile("");
                    setCommittedCustom("");
                  }}
                  className="rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text-primary"
                >
                  {TEST_PROFILES.map((p) => (
                    <option key={p} value={p}>@{p}</option>
                  ))}
                </select>
                <span className="text-xs text-admin-text-tertiary">ou</span>
                <div className="flex items-center gap-1 rounded-lg border border-admin-border bg-white px-3 py-2">
                  <span className="text-sm text-admin-text-tertiary">@</span>
                  <input
                    type="text"
                    placeholder="outro username"
                    value={customProfile}
                    onChange={(e) => setCustomProfile(e.target.value)}
                    onBlur={() => setCommittedCustom(customProfile)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
                    className="bg-transparent text-sm text-admin-text-primary placeholder:text-admin-text-tertiary outline-none w-36"
                  />
                </div>
              </div>
            </div>

            {/* Variant switcher */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-admin-text-tertiary">
                Versão do relatório a pré-visualizar
              </label>
              <div className="flex flex-wrap gap-1 rounded-xl border border-admin-border bg-admin-surface-muted p-1 sm:inline-flex sm:flex-nowrap">
                {VARIANT_OPTIONS.map((opt) => {
                  const active = variant === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVariant(opt.value)}
                      className={cn(
                        "flex-1 sm:flex-none rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap",
                        active
                          ? "bg-white text-admin-text-primary shadow-sm border border-admin-border"
                          : "text-admin-text-secondary hover:text-admin-text-primary border border-transparent",
                      )}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-current" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-admin-text-tertiary mt-1">
                {VARIANT_OPTIONS.find((o) => o.value === variant)?.description}
              </p>
            </div>
          </div>
        </div>
        <BlockAccessMatrix variant={variant} />
        <p className="mt-2 text-[12px] text-admin-text-tertiary">
          Esta pré-visualização não gera novas análises nem altera dados. Apenas muda visibilidade e contexto comercial.
        </p>
      </section>

      {/* ── 3. ESTADO DO SNAPSHOT ──────────────────────────────── */}
      {load.kind === "loading" && (
        <StatusBox tone="neutral">A carregar snapshot de @{activeProfile}…</StatusBox>
      )}
      {load.kind === "missing" && (
        <StatusBox tone="warning">
          Não existe snapshot para @{activeProfile}. Corre uma análise primeiro.
        </StatusBox>
      )}
      {load.kind === "error" && (
        <StatusBox tone="danger">{load.message}</StatusBox>
      )}
      {load.kind === "ready" && (
        <SnapshotStatusBannerV2 expiresAt={load.expiresAt} createdAt={load.createdAt} />
      )}

      {/* ── 4. LINKS RÁPIDOS ───────────────────────────────────── */}
      {load.kind === "ready" && (
        <section>
          <div className="rounded-xl border border-admin-border bg-white p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1 — Relatório público */}
              <LinkBlock
                title="Relatório público"
                subtitle="Visível para qualquer pessoa"
                url={`/analyze/${activeProfile}`}
                actions={
                  <>
                    <AdminActionButton
                      label="Abrir público"
                      icon={<ExternalLink className="h-3.5 w-3.5" />}
                      onClick={() => window.open(`/analyze/${activeProfile}`, "_blank")}
                    />
                    <AdminActionButton
                      label="Copiar URL"
                      icon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/analyze/${activeProfile}`);
                        toast.success("Link público copiado.");
                      }}
                      copyMode
                    />
                  </>
                }
              />
              {/* 2 — Preview fullscreen admin */}
              <LinkBlock
                title="Preview fullscreen (admin)"
                subtitle={`Variante: ${variant}`}
                url={`/admin/report-preview/${activeProfile}?variant=${variant}`}
                actions={
                  <>
                    <AdminActionButton
                      label="Abrir preview"
                      icon={<FlaskConical className="h-3.5 w-3.5" />}
                      onClick={() => window.open(`/admin/report-preview/${activeProfile}?variant=${variant}`, "_blank")}
                    />
                    <AdminActionButton
                      label="Copiar URL"
                      icon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/admin/report-preview/${activeProfile}?variant=${variant}`);
                        toast.success("Link de preview copiado.");
                      }}
                      copyMode
                    />
                  </>
                }
              />
              {/* 3 — URL deste Lab */}
              <LinkBlock
                title="URL deste Lab"
                subtitle="Estado de configuração"
                url={`/admin/report-lab?profile=${activeProfile}&variant=${variant}`}
                actions={
                  <AdminActionButton
                    label="Copiar URL"
                    icon={<Link2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set("profile", activeProfile);
                      url.searchParams.set("variant", variant);
                      navigator.clipboard.writeText(url.toString());
                      toast.success("URL do lab copiado.");
                    }}
                    copyMode
                  />
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* ── 5. PAINEL ÚNICO: Visibilidade e prontidão ──────────── */}
      <section className="space-y-2">
        <ConsolidatedModuleTable variant={variant} />

        <CollapsibleCard
          icon={<span className="flex items-center justify-center h-8 w-8 rounded-lg bg-admin-info-50 text-admin-info-500"><FlaskConical className="h-4 w-4" /></span>}
          title="Gestor de visibilidade de módulos"
          subtitle="Activa ou esconde blocos individuais nesta variante"
          badge={<span className="text-[12px] text-admin-text-tertiary">{Object.keys(FEATURE_LABELS).length} módulos</span>}
          open={showModules}
          onToggle={() => setShowModules(!showModules)}
        >
          <ModuleVisibilityMatrix
            adminEmail={readAdminEmail() ?? ""}
            onPreviewDraft={(v) =>
              window.open(
                `/admin/report-preview/${activeProfile}?variant=${v}&draft=true`,
                "_blank",
              )
            }
            onOpenPublic={() =>
              window.open(`/analyze/${activeProfile}`, "_blank")
            }
          />
        </CollapsibleCard>
      </section>

      {/* ── 6. REPORT PREVIEW ──────────────────────────────────── */}
      {load.kind === "ready" && (
        <div className="rounded-2xl border border-admin-border overflow-hidden shadow-[var(--shadow-admin-card)]">
          <ReportThemeWrapper>
            <ReportShellV2
              result={load.result}
              snapshotId={load.snapshotId}
              payload={load.payload}
              analyzedAtIso={load.createdAt}
              variant={variant}
              premiumUnlocked={variant !== "public_mvp"}
              unlocked={variant !== "public_mvp"}
              actions={{}}
            />
          </ReportThemeWrapper>
        </div>
      )}

      {/* ── 7. FOOTER ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-[12px] text-admin-text-tertiary">
        <span className="h-1.5 w-1.5 rounded-full bg-admin-text-tertiary/40" />
        <span>Área interna · sem chamadas a APIs.</span>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────

function SnapshotStatusBannerV2({ expiresAt, createdAt }: { expiresAt: string | null; createdAt: string }) {
  const createdStr = new Date(createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });

  if (!expiresAt) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
        Snapshot de {createdStr} · sem data de expiração definida.
      </div>
    );
  }
  const exp = new Date(expiresAt);
  const now = new Date();
  const isValid = exp.getTime() > now.getTime();
  const staleLimit = new Date(exp.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isStale = !isValid && now.getTime() < staleLimit.getTime();
  const expStr = exp.toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });

  if (isValid) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-700">
        ✓ Snapshot de {createdStr} · válido até {expStr}.
      </div>
    );
  }
  if (isStale) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
        Snapshot de {createdStr} · expirado a {expStr} — dados stale.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
      Snapshot de {createdStr} · demasiado antigo (expirou a {expStr}).
    </div>
  );
}

function LinkBlock({ title, subtitle, url, actions }: {
  title: string;
  subtitle: string;
  url: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <span className="text-sm font-medium text-admin-text-primary">{title}</span>
        <span className="ml-2 text-[11px] text-admin-text-tertiary">{subtitle}</span>
      </div>
      <div className="rounded-lg border border-admin-border/50 bg-admin-bg/30 px-3 py-1.5">
        <code className="admin-code text-[11px] break-all select-all">{url}</code>
      </div>
      <div className="flex flex-wrap gap-1.5">{actions}</div>
    </div>
  );
}

function AdminActionButton({
  label,
  icon,
  onClick,
  copyMode,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  copyMode?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick();
    if (copyMode) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/50 px-3 py-1.5 text-xs font-medium text-admin-text-secondary backdrop-blur-sm transition-colors hover:bg-white/70 hover:text-admin-text-primary"

    >
      {copyMode && copied ? <Check className="h-4 w-4 text-green-600" /> : icon}
      {copyMode && copied ? "Copiado" : label}
    </button>
  );
}

function StatusBox({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "warning" | "danger";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-white/30 bg-white/30 text-admin-text-secondary";
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", toneClasses)}>
      {children}
    </div>
  );
}

// ── Collapsible card with icon + title + subtitle ──────────────────

function CollapsibleCard({
  icon,
  title,
  subtitle,
  badge,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-admin-border bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left hover:bg-admin-surface-muted/50 transition-colors"
      >
        {icon}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-admin-text-primary block">{title}</span>
          <span className="text-[12px] text-admin-text-secondary">{subtitle}</span>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
        {open ? (
          <ChevronUp className="h-4 w-4 text-admin-text-tertiary shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-admin-text-tertiary shrink-0" />
        )}
      </button>
      {open && <div className="border-t border-admin-border">{children}</div>}
    </div>
  );
}

// ── Consolidated module table ──────────────────────────────────────

const VISIBLE_MODULE_KEYS = (Object.keys(FEATURE_LABELS) as (keyof VariantFeatures)[]).filter(
  (k) => MODULE_READINESS[k].status !== "hidden",
);

const READINESS_BADGE: Record<ReadinessStatus, { cls: string }> = {
  ready:          { cls: "text-green-700 bg-green-50" },
  needs_review:   { cls: "text-amber-700 bg-amber-50" },
  internal_only:  { cls: "text-gray-600 bg-gray-100" },
  pro_candidate:  { cls: "text-purple-700 bg-purple-50" },
  hidden:         { cls: "text-gray-400 bg-gray-50" },
};

const RISK_DOT: Record<RiskLevel, string> = {
  low: "bg-green-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

const VIS_BADGE = (val: FeatureVisibility) => {
  if (val === "full") return { text: "Full", cls: "text-green-700 bg-green-50" };
  if (val === "lightweight") return { text: "Light", cls: "text-blue-700 bg-blue-50" };
  if (val === "teaser") return { text: "Teaser", cls: "text-purple-700 bg-purple-50" };
  return { text: "Oculto", cls: "text-gray-500 bg-gray-100" };
};

function ConsolidatedModuleTable({ variant }: { variant: ReportVariant }) {
  const [open, setOpen] = useState(false);

  const mvp = getVariantFeatures("public_mvp");
  const lab = getVariantFeatures("internal_lab");
  const pro = getVariantFeatures("pro_preview");

  const counts = VISIBLE_MODULE_KEYS.reduce(
    (acc, key) => {
      const s = MODULE_READINESS[key].status;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Partial<Record<ReadinessStatus, number>>,
  );

  const summaryItems = (
    [
      ["ready", "Ready", "text-green-700"],
      ["needs_review", "Needs review", "text-amber-700"],
      ["pro_candidate", "Pro", "text-purple-700"],
      ["internal_only", "Internal", "text-gray-500"],
    ] as const
  ).filter(([key]) => counts[key]);

  return (
    <div className="rounded-xl border border-admin-border bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left hover:bg-admin-surface-muted/50 transition-colors"
      >
        <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-50 text-green-600 shrink-0"><ClipboardCheck className="h-4 w-4" /></span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-admin-text-primary block">Visibilidade e prontidão dos módulos</span>
          <span className="text-[12px] text-admin-text-secondary">Comparação entre variantes + estado de cada módulo</span>
        </div>
        {!open && summaryItems.length > 0 && (
          <div className="flex items-center gap-2 text-[12px] shrink-0">
            {summaryItems.map(([key, label, cls], i) => (
              <span key={key} className="flex items-center gap-1">
                {i > 0 && <span className="text-admin-text-tertiary">·</span>}
                <span className={cn("font-semibold", cls)}>{counts[key]} {label}</span>
              </span>
            ))}
          </div>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 text-admin-text-tertiary shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-admin-text-tertiary shrink-0" />
        )}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-t border-admin-border bg-admin-surface-muted/30">
                <th className="px-4 py-2 font-medium text-admin-text-secondary">Módulo</th>
                <th className={cn("px-4 py-2 font-medium", variant === "public_mvp" ? "text-admin-text-primary" : "text-admin-text-secondary")}>Público</th>
                <th className={cn("px-4 py-2 font-medium", variant === "internal_lab" ? "text-admin-text-primary" : "text-admin-text-secondary")}>Interno</th>
                <th className={cn("px-4 py-2 font-medium", variant === "pro_preview" ? "text-admin-text-primary" : "text-admin-text-secondary")}>Pro</th>
                <th className="px-4 py-2 font-medium text-admin-text-secondary">Estado</th>
                <th className="px-4 py-2 font-medium text-admin-text-secondary">Risco</th>
                <th className="px-4 py-2 font-medium text-admin-text-secondary">Nota</th>
              </tr>
            </thead>
            <tbody>
              {VISIBLE_MODULE_KEYS.map((key) => {
                const readiness = MODULE_READINESS[key];
                const badge = READINESS_BADGE[readiness.status];
                const dot = RISK_DOT[readiness.risk];
                const mvpVis = VIS_BADGE(mvp[key]);
                const labVis = VIS_BADGE(lab[key]);
                const proVis = VIS_BADGE(pro[key]);
                return (
                  <tr key={key} className="border-t border-admin-border/50">
                    <td className="px-4 py-2 text-admin-text-primary">{FEATURE_LABELS[key]}</td>
                    <td className={cn("px-4 py-2", variant === "public_mvp" && "bg-admin-surface-muted/40")}>
                      <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", mvpVis.cls)}>{mvpVis.text}</span>
                    </td>
                    <td className={cn("px-4 py-2", variant === "internal_lab" && "bg-admin-surface-muted/40")}>
                      <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", labVis.cls)}>{labVis.text}</span>
                    </td>
                    <td className={cn("px-4 py-2", variant === "pro_preview" && "bg-admin-surface-muted/40")}>
                      <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", proVis.cls)}>{proVis.text}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-block rounded px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider", badge.cls)}>
                        {READINESS_STATUS_LABELS[readiness.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("inline-block h-2 w-2 rounded-full", dot)} />
                        <span className="text-admin-text-secondary capitalize">{readiness.risk}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-admin-text-secondary max-w-xs">{readiness.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Block-level access matrix (admin-only summary) ────────────────

function blockBadge(state: FeatureVisibility, variant: ReportVariant, blockId: string): { label: string; cls: string } {
  if (state === "hidden") {
    return variant === "public_mvp"
      ? { label: "Premium", cls: "bg-signal-warning/15 text-accent-gold border border-signal-warning/30" }
      : { label: "Oculto", cls: "bg-admin-surface-muted text-admin-text-tertiary" };
  }
  if (state === "lightweight" || state === "teaser") {
    return blockId === "performance"
      ? { label: "Parcial 3/5", cls: "bg-signal-warning/15 text-accent-gold" }
      : { label: "Parcial", cls: "bg-signal-warning/15 text-accent-gold" };
  }
  return variant === "public_mvp"
    ? { label: "Incluído", cls: "bg-emerald-50 text-emerald-700" }
    : { label: "Desbloqueado", cls: "bg-emerald-50 text-emerald-700" };
}

function BlockAccessMatrix({ variant }: { variant: ReportVariant }) {
  const mvp = getVariantFeatures("public_mvp");
  const lab = getVariantFeatures("internal_lab");
  const pro = getVariantFeatures("pro_preview");

  const colHeader = (label: string, active: boolean) => (
    <th
      className={cn(
        "px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.12em]",
        active ? "text-admin-text-primary" : "text-admin-text-tertiary",
      )}
    >
      {label}
    </th>
  );

  const cell = (state: FeatureVisibility, v: ReportVariant, blockId: string, active: boolean) => {
    const b = blockBadge(state, v, blockId);
    return (
      <td className={cn("px-4 py-2 text-center", active && "bg-admin-surface-muted/40")}>
        <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", b.cls)}>
          {b.label}
        </span>
      </td>
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-admin-border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-admin-surface-muted/30">
              <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-admin-text-tertiary">Bloco</th>
              {colHeader("Público", variant === "public_mvp")}
              {colHeader("Interno", variant === "internal_lab")}
              {colHeader("Pro", variant === "pro_preview")}
            </tr>
          </thead>
          <tbody>
            {BLOCKS.map((b) => (
              <tr key={b.id} className="border-t border-admin-border/50">
                <td className="px-4 py-2 text-admin-text-primary">
                  <span className="text-admin-text-tertiary tabular-nums mr-2">{b.number}</span>
                  {b.shortLabel}
                </td>
                {cell(mvp[b.featureKey], "public_mvp", b.id, variant === "public_mvp")}
                {cell(lab[b.featureKey], "internal_lab", b.id, variant === "internal_lab")}
                {cell(pro[b.featureKey], "pro_preview", b.id, variant === "pro_preview")}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}