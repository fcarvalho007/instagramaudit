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
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
        {STATUS_ITEMS.map((s) => {
          const ok = p[s.key];
          return (
            <span
              key={s.key}
              className="inline-flex items-center gap-1 text-[10px] text-admin-text-tertiary"
              title={s.label}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${ok ? "bg-[rgb(var(--admin-revenue-400))]" : "bg-admin-text-tertiary/30"}`}
              />
              <span className="hidden sm:inline">{s.short}</span>
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
          className="text-[10px] text-[rgb(var(--admin-info-400))] hover:underline"
        >
          Abrir
        </Link>
        <button
          type="button"
          onClick={handleForceRefresh}
          disabled={isCacheOnly || expiring}
          className="text-[10px] text-[rgb(var(--admin-expense-400))] hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
          title={
            isCacheOnly
              ? "Ativa Fresh para gerar nova análise."
              : "Expira o snapshot e força análise fresh na próxima visita."
          }
        >
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
    <div className="rounded-xl border border-admin-border bg-admin-surface-secondary p-5 flex flex-col gap-3">
      <p className="text-eyebrow-sm text-admin-text-tertiary uppercase tracking-wider">
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