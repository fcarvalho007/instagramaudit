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

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
} from "@/lib/report/report-variant";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/report-lab")({
  component: ReportLabPage,
});

// ── Constants ──────────────────────────────────────────────────────

const TEST_PROFILES = ["frederico.m.carvalho", "martimsilvai"] as const;

const VARIANT_OPTIONS: { value: ReportVariant; label: string }[] = [
  { value: "public_mvp", label: "Public MVP" },
  { value: "internal_lab", label: "Internal Lab" },
  { value: "pro_preview", label: "Pro Preview" },
];

const MODE_LABELS: Record<ReportVariant, string> = {
  public_mvp: "Está a visualizar a versão pública limpa.",
  internal_lab: "Está a visualizar a versão interna de trabalho.",
  pro_preview: "Está a visualizar uma simulação da versão avançada.",
};

const MODE_TONES: Record<ReportVariant, string> = {
  public_mvp: "bg-blue-50 border-blue-200 text-blue-700",
  internal_lab: "bg-amber-50 border-amber-200 text-amber-700",
  pro_preview: "bg-purple-50 border-purple-200 text-purple-700",
};

// ── Module visibility reference ────────────────────────────────────

interface ModuleRow {
  name: string;
  public_mvp: string;
  internal_lab: string;
  pro_preview: string;
}

const MODULE_VISIBILITY: ModuleRow[] = [
  { name: "Overview (Hero + KPIs)", public_mvp: "Full", internal_lab: "Full", pro_preview: "Full" },
  { name: "Diagnostic (Q01–Q07)", public_mvp: "Full", internal_lab: "Full", pro_preview: "Full" },
  { name: "P05 Conversa (post-level)", public_mvp: "Full", internal_lab: "Full", pro_preview: "Full" },
  { name: "P05 Comment Intelligence", public_mvp: "Hidden", internal_lab: "Full", pro_preview: "Teaser" },
  { name: "Captions (P04)", public_mvp: "Lightweight", internal_lab: "Full", pro_preview: "Lightweight" },
  { name: "Market Signals", public_mvp: "Full", internal_lab: "Full", pro_preview: "Full" },
  { name: "Benchmark Gauge", public_mvp: "Full", internal_lab: "Full", pro_preview: "Full" },
  { name: "Methodology", public_mvp: "Full", internal_lab: "Full", pro_preview: "Full" },
  { name: "Beta Feedback", public_mvp: "Full", internal_lab: "Hidden", pro_preview: "Hidden" },
  { name: "Debug labels", public_mvp: "Hidden", internal_lab: "Full", pro_preview: "Hidden" },
];

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
    };

// ── Main page ──────────────────────────────────────────────────────

function ReportLabPage() {
  const [profile, setProfile] = useState<string>(TEST_PROFILES[0]);
  const [customProfile, setCustomProfile] = useState("");
  const [variant, setVariant] = useState<ReportVariant>("internal_lab");
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [showModules, setShowModules] = useState(false);

  const activeProfile = customProfile.trim() || profile;

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-admin-text-secondary" />
        <div>
          <h1 className="text-xl font-semibold text-admin-text-primary">Report Lab</h1>
          <p className="text-sm text-admin-text-secondary">
            Pré-visualiza o relatório em diferentes variantes sem duplicar código.
          </p>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-start gap-4">
        {/* Profile selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-admin-text-tertiary">
            Perfil
          </label>
          <div className="flex items-center gap-2">
            <select
              value={profile}
              onChange={(e) => {
                setProfile(e.target.value);
                setCustomProfile("");
              }}
              className="rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-sm text-admin-text-primary backdrop-blur-sm"
            >
              {TEST_PROFILES.map((p) => (
                <option key={p} value={p}>@{p}</option>
              ))}
            </select>
            <span className="text-xs text-admin-text-tertiary">ou</span>
            <input
              type="text"
              placeholder="outro username"
              value={customProfile}
              onChange={(e) => setCustomProfile(e.target.value)}
              className="rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-sm text-admin-text-primary placeholder:text-admin-text-tertiary backdrop-blur-sm w-44"
            />
          </div>
        </div>

        {/* Variant switcher */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-admin-text-tertiary">
            Variante
          </label>
          <div className="inline-flex rounded-xl border border-white/30 bg-white/20 p-1 backdrop-blur-sm">
            {VARIANT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVariant(opt.value)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  variant === opt.value
                    ? "bg-white/90 text-admin-text-primary shadow-sm"
                    : "text-admin-text-secondary hover:bg-white/40 hover:text-admin-text-primary",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mode label */}
      <div className={cn("rounded-lg border px-4 py-2.5 text-sm font-medium", MODE_TONES[variant])}>
        {MODE_LABELS[variant]}
      </div>

      {/* Admin actions */}
      {load.kind === "ready" && (
        <div className="flex flex-wrap gap-2">
          <AdminActionButton
            label="Abrir relatório público"
            icon={<ExternalLink className="h-3.5 w-3.5" />}
            onClick={() => window.open(`/analyze/${activeProfile}`, "_blank")}
          />
          <AdminActionButton
            label="Copiar link público"
            icon={<Copy className="h-3.5 w-3.5" />}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/analyze/${activeProfile}`);
              toast.success("Link público copiado.");
            }}
            copyMode
          />
          <AdminActionButton
            label="Abrir preview interno"
            icon={<ExternalLink className="h-3.5 w-3.5" />}
            onClick={() => window.open(`/admin/report-preview/${activeProfile}`, "_blank")}
          />
          <AdminActionButton
            label="Copiar link interno"
            icon={<Copy className="h-3.5 w-3.5" />}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/admin/report-preview/${activeProfile}`);
              toast.success("Link interno copiado.");
            }}
            copyMode
          />
        </div>
      )}

      {/* Module visibility table */}
      <div className="rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm overflow-hidden">
        <button
          onClick={() => setShowModules(!showModules)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-admin-text-primary hover:bg-white/10 transition-colors"
        >
          <span>Visibilidade de módulos por variante</span>
          {showModules ? (
            <ChevronUp className="h-4 w-4 text-admin-text-tertiary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-admin-text-tertiary" />
          )}
        </button>
        {showModules && <ModuleVisibilityTable activeVariant={variant} />}
      </div>

      {/* Snapshot status */}
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
        <p className="text-xs text-admin-text-tertiary">
          Snapshot de{" "}
          {new Date(load.createdAt).toLocaleString("pt-PT", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}

      {/* Report render area */}
      {load.kind === "ready" && (
        <div className="rounded-2xl border border-white/30 overflow-hidden shadow-lg">
          <ReportThemeWrapper>
            <ReportShellV2
              result={load.result}
              snapshotId={load.snapshotId}
              payload={load.payload}
              analyzedAtIso={load.createdAt}
              variant={variant}
              actions={{}}
            />
          </ReportThemeWrapper>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────

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
      {copyMode && copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : icon}
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

function ModuleVisibilityTable({ activeVariant }: { activeVariant: ReportVariant }) {
  const visLabel = (val: string) => {
    if (val === "Full") return { text: val, cls: "text-green-700 bg-green-50" };
    if (val === "Teaser") return { text: val, cls: "text-purple-700 bg-purple-50" };
    if (val === "Lightweight") return { text: val, cls: "text-blue-700 bg-blue-50" };
    return { text: val, cls: "text-gray-500 bg-gray-100" };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-t border-white/20 bg-white/10">
            <th className="px-4 py-2 font-medium text-admin-text-secondary">Módulo</th>
            {VARIANT_OPTIONS.map((v) => (
              <th
                key={v.value}
                className={cn(
                  "px-4 py-2 font-medium text-admin-text-secondary",
                  v.value === activeVariant && "bg-white/20",
                )}
              >
                {v.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULE_VISIBILITY.map((row) => (
            <tr key={row.name} className="border-t border-white/10">
              <td className="px-4 py-2 text-admin-text-primary">{row.name}</td>
              {(["public_mvp", "internal_lab", "pro_preview"] as const).map((v) => {
                const { text, cls } = visLabel(row[v]);
                return (
                  <td
                    key={v}
                    className={cn("px-4 py-2", v === activeVariant && "bg-white/20")}
                  >
                    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>
                      {text}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}