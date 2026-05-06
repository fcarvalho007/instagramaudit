/**
 * Admin card — Test profile status panel.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import {
  getExecutionMode,
  getTestProfileStatuses,
  expireSnapshotForHandle,
  type TestProfileStatus,
} from "@/server/admin/execution-mode.functions";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-zinc-600"}`}
    />
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
      await expireSnapshotForHandle({ handle: p.handle });
      qc.invalidateQueries({ queryKey: ["admin", "test-profiles"] });
    } finally {
      setExpiring(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/30 p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-foreground">@{p.handle}</span>
        {p.latestSnapshotDate && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(p.latestSnapshotDate).toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <StatusDot ok={p.hasCachedReport} /> Report
        </span>
        <span className="flex items-center gap-1">
          <StatusDot ok={p.hasCaptionSemantic} /> Caption semantic
        </span>
        <span className="flex items-center gap-1">
          <StatusDot ok={p.hasCommentIntelligence} /> Comment intel
        </span>
        <span className="flex items-center gap-1">
          <StatusDot ok={p.hasVisualCover} /> Visual cover
        </span>
        {p.estimatedLastCostUsd !== null && (
          <span>
            Último custo: ${p.estimatedLastCostUsd.toFixed(4)}
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-1">
        <Link
          to="/analyze/$username"
          params={{ username: p.handle }}
          className="text-[11px] text-cyan-400 hover:underline"
        >
          Abrir report em cache
        </Link>
        <button
          type="button"
          onClick={handleForceRefresh}
          disabled={isCacheOnly || expiring}
          className="text-[11px] text-amber-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          title={isCacheOnly ? "Ative o modo Fresh para gerar nova análise." : "Expira o snapshot e força análise fresh na próxima visita."}
        >
          {expiring ? "A expirar…" : "Reanalisar fresh"}
        </button>
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

  return (
    <>
      <AdminSectionHeader title="Perfis de teste" />
      <AdminCard>
        <div className="flex flex-col gap-3 p-4">
          {isLoading && (
            <p className="text-xs text-muted-foreground">A carregar...</p>
          )}
          {data?.profiles.map((p) => (
            <ProfileRow key={p.handle} p={p} />
          ))}
        </div>
      </AdminCard>
    </>
  );
}