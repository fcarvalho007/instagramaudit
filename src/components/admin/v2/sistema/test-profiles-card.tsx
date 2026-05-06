/**
 * Admin card — Test profile status panel (rendered in Sistema).
 * Compact horizontal rows with inline status dots.
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
import { ExternalLink, RefreshCw } from "lucide-react";

const STATUS_ITEMS: Array<{
  key: keyof Pick<
    TestProfileStatus,
    "hasCachedReport" | "hasCaptionSemantic" | "hasCommentIntelligence" | "hasVisualCover"
  >;
  label: string;
  short: string;
}> = [
  { key: "hasCachedReport", label: "Report cache", short: "Report" },
  { key: "hasCaptionSemantic", label: "Legendas IA", short: "Legendas" },
  { key: "hasCommentIntelligence", label: "Comentários", short: "Coment." },
  { key: "hasVisualCover", label: "Capas visuais", short: "Capas" },
];

function ProfileRow({ p, isLast }: { p: TestProfileStatus; isLast: boolean }) {
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

  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${!isLast ? "border-b border-admin-border/50" : ""}`}
    >
      {/* Handle */}
      <span className="font-mono text-xs text-admin-text-primary shrink-0">
        @{p.handle}
      </span>

      {/* Status chips */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
        {STATUS_ITEMS.map((s) => {
          const ok = p[s.key];
          return (
            <span
              key={s.key}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                ok
                  ? "bg-[rgb(var(--admin-revenue-500))]/10 text-[rgb(var(--admin-revenue-700))]"
                  : "bg-admin-surface-muted text-admin-text-tertiary"
              }`}
              title={s.label}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${ok ? "bg-[rgb(var(--admin-revenue-500))]" : "bg-admin-text-tertiary/30"}`}
              />
              <span>{s.short}</span>
            </span>
          );
        })}
      </div>

      {/* Date */}
      {p.latestSnapshotDate && (
        <span className="text-[10px] text-admin-text-tertiary shrink-0 hidden md:inline tabular-nums">
          {new Date(p.latestSnapshotDate).toLocaleDateString("pt-PT", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/analyze/$username"
          params={{ username: p.handle }}
          className="inline-flex items-center gap-1 rounded-md border border-admin-border px-2.5 py-1 text-[10px] font-medium text-admin-text-secondary hover:bg-admin-surface-muted hover:text-admin-text-primary transition-colors"
        >
          <ExternalLink size={10} />
          Abrir
        </Link>
        <button
          type="button"
          onClick={handleForceRefresh}
          disabled={isCacheOnly || expiring}
          className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--admin-expense-400))]/30 px-2.5 py-1 text-[10px] font-medium text-[rgb(var(--admin-expense-500))] hover:bg-[rgb(var(--admin-expense-400))]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={
            isCacheOnly
              ? "Ativa Fresh para gerar nova análise."
              : "Expira o snapshot e força análise fresh na próxima visita."
          }
        >
          <RefreshCw size={10} className={expiring ? "animate-spin" : ""} />
          {expiring ? "…" : "Fresh"}
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

  const profiles = data?.profiles ?? [];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-admin-text-secondary uppercase tracking-wider">
        Perfis de teste
      </p>
      {isLoading && (
        <p className="text-[11px] text-admin-text-tertiary">A carregar...</p>
      )}
      <div>
        {profiles.map((p, i) => (
          <ProfileRow key={p.handle} p={p} isLast={i === profiles.length - 1} />
        ))}
      </div>
    </div>
  );
}