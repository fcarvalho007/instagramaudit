/**
 * Admin card — Test profile status panel (rendered in Sistema).
 * Redesigned with avatar circles, PRONTO/PARCIAL badges, dual buttons,
 * cache breakdown dots, and "+ Adicionar perfil" header.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getExecutionMode,
  getTestProfileStatuses,
  expireSnapshotForHandle,
  type TestProfileStatus,
} from "@/server/admin/execution-mode.functions";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, RefreshCw, Clock, Plus, DollarSign } from "lucide-react";

const STATUS_ITEMS: Array<{
  key: keyof Pick<
    TestProfileStatus,
    "hasCachedReport" | "hasCaptionSemantic" | "hasCommentIntelligence" | "hasVisualCover" | "hasInsightsV1" | "hasInsightsV2" | "hasMarketSignals"
  >;
  label: string;
  short: string;
}> = [
  { key: "hasCachedReport", label: "Report cache", short: "Report" },
  { key: "hasInsightsV1", label: "Insights v1", short: "Insights v1" },
  { key: "hasInsightsV2", label: "Insights v2", short: "Insights v2" },
  { key: "hasCaptionSemantic", label: "Legendas IA", short: "Legendas" },
  { key: "hasVisualCover", label: "Capas visuais", short: "Capas" },
  { key: "hasMarketSignals", label: "Market signals", short: "Mercado" },
  { key: "hasCommentIntelligence", label: "Comentários", short: "Comentários" },
];

/* ── Avatar with gradient ── */
function ProfileAvatar({ handle }: { handle: string }) {
  const initials = handle
    .split(".")
    .map((s) => s[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-full text-white font-semibold text-[13px]"
      style={{
        width: 42,
        height: 42,
        background: "linear-gradient(135deg, #1D9E75, #378ADD)",
      }}
    >
      {initials || "?"}
    </div>
  );
}

function ProfileRow({ p }: { p: TestProfileStatus }) {
  const qc = useQueryClient();
  const [expiring, setExpiring] = useState(false);

  const { data: modeData } = useQuery({
    queryKey: ["admin", "execution-mode"],
    queryFn: () => getExecutionMode(),
    staleTime: 10_000,
  });
  const isCacheOnly = (modeData?.mode ?? "cache_only") === "cache_only";

  const handleForceRefresh = async () => {
    setExpiring(true);
    try {
      await expireSnapshotForHandle({ data: { handle: p.handle } });
      qc.invalidateQueries({ queryKey: ["admin", "test-profiles"] });
    } finally {
      setExpiring(false);
    }
  };

  const expiresIn = p.snapshotExpiresAt
    ? Math.max(0, Math.round((new Date(p.snapshotExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  const allComplete = STATUS_ITEMS.every((s) => p[s.key]);
  const someComplete = STATUS_ITEMS.some((s) => p[s.key]);

  return (
    <div
      className="rounded-xl border bg-white p-4"
      style={{ borderColor: "#E5E3D9" }}
    >
      {/* Row 1: Avatar + info + actions */}
      <div className="flex items-center gap-3">
        <ProfileAvatar handle={p.handle} />

        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-admin-text-primary">
              @{p.handle}
            </span>
            {allComplete ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: "#E8F5EE", color: "#1D9E75" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Pronto
              </span>
            ) : someComplete ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: "#FFF3E0", color: "#BA7517" }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#BA7517" }} />
                Parcial
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-admin-text-tertiary">
            {p.latestFreshCostTotal != null && (
              <span className="inline-flex items-center gap-1">
                <DollarSign size={10} />
                <span className="font-mono tabular-nums">${p.latestFreshCostTotal.toFixed(3)}</span>
                <span>custo cache</span>
              </span>
            )}
            {expiresIn !== null && (
              <span className="inline-flex items-center gap-1">
                <Clock size={10} />
                expira em {expiresIn}h
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/analyze/$username"
            params={{ username: p.handle }}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium text-admin-text-secondary hover:bg-admin-surface-muted hover:text-admin-text-primary transition-colors"
            style={{ borderColor: "#E5E3D9" }}
          >
            <ExternalLink size={12} />
            Abrir relatório
          </Link>
          <button
            type="button"
            onClick={handleForceRefresh}
            disabled={isCacheOnly || expiring}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: isCacheOnly ? "#E5E3D9" : "rgba(186,117,23,0.3)",
              color: isCacheOnly ? "#888780" : "#BA7517",
              backgroundColor: isCacheOnly ? "transparent" : "rgba(186,117,23,0.05)",
            }}
            title={
              isCacheOnly
                ? "Troca para \"Buscar dados novos\" para ativar esta ação."
                : "Expira o snapshot e força análise nova na próxima visita."
            }
          >
            <RefreshCw size={12} className={expiring ? "animate-spin" : ""} />
            {expiring ? "A processar…" : "Buscar novo"}
          </button>
        </div>
      </div>

      {/* Row 2: Cache breakdown chips */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3 pl-[54px]">
        <span className="text-[12px] text-admin-text-tertiary uppercase tracking-wider font-medium mr-1">
          Em cache:
        </span>
        {STATUS_ITEMS.map((s) => {
          const ok = p[s.key];
          return (
            <span
              key={s.key}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
              style={{
                backgroundColor: ok ? "#E8F5EE" : "#F3F2EE",
                color: ok ? "#1D9E75" : "#888780",
              }}
              title={s.label}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: ok ? "#1D9E75" : "transparent",
                  border: ok ? "none" : "1.5px solid #C4C3BC",
                }}
              />
              {s.short}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function TestProfilesCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "test-profiles"],
    queryFn: () => getTestProfileStatuses(),
    staleTime: 30_000,
  });

  const profiles = data?.profiles ?? [];
  const readyCount = profiles.filter((p) =>
    STATUS_ITEMS.every((s) => p[s.key])
  ).length;

  const firstExpiry = profiles
    .map((p) => p.snapshotExpiresAt)
    .filter(Boolean)
    .sort()[0];
  const cacheHours = firstExpiry
    ? Math.max(0, Math.round((new Date(firstExpiry).getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header with counter and add button */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-admin-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-admin-text-tertiary">◎</span>
          Perfis de teste
        </p>
        <div className="flex items-center gap-3">
          {profiles.length > 0 && (
            <span className="text-[12px] text-admin-text-tertiary">
              {readyCount} perfis prontos
              {cacheHours != null && <> · cache válida {cacheHours}h</>}
            </span>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium text-admin-text-secondary hover:bg-admin-surface-muted transition-colors"
            style={{ borderColor: "#E5E3D9" }}
          >
            <Plus size={12} />
            Adicionar perfil
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-[12px] text-admin-text-tertiary">A carregar...</p>
      )}
      <div className="flex flex-col gap-3">
        {profiles.map((p) => (
          <ProfileRow key={p.handle} p={p} />
        ))}
      </div>
    </div>
  );
}
