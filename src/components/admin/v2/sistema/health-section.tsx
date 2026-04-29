/**
 * Estado do sistema — readiness strip + verificações de runtime.
 * Dados reais via /api/admin/sistema/health e /runtime-checks.
 */

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, XCircle } from "lucide-react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { ADMIN_LITERAL } from "@/components/admin/v2/admin-tokens";
import {
  SectionError,
  SectionSkeleton,
} from "@/components/admin/v2/section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type {
  HealthChip,
  HealthStatus,
  RuntimeCheck,
} from "@/lib/admin/system-queries.server";

const STATUS_DOT: Record<HealthStatus, string> = {
  operational: ADMIN_LITERAL.healthOk,
  attention: ADMIN_LITERAL.healthWarn,
  critical: ADMIN_LITERAL.healthCritical,
};

const SMOKE_TONE: Record<
  RuntimeCheck["status"],
  { textClass: string; Icon: typeof Check }
> = {
  ok: { textClass: "text-admin-revenue-700", Icon: Check },
  warn: { textClass: "text-admin-expense-700", Icon: AlertTriangle },
  fail: { textClass: "text-admin-danger-700", Icon: XCircle },
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

function ReadinessChip({ chip }: { chip: HealthChip }) {
  const dotColor = STATUS_DOT[chip.status];
  return (
    <div className="bg-admin-surface px-5 py-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="block h-[9px] w-[9px] rounded-full shrink-0"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 0 3px ${dotColor}26`,
          }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary">
          {chip.service}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] tabular-nums text-admin-text-primary m-0">
        {chip.detail}
      </p>
    </div>
  );
}

function SmokeRow({ check, first }: { check: RuntimeCheck; first: boolean }) {
  const tone = SMOKE_TONE[check.status] ?? SMOKE_TONE.ok;
  const Icon = tone.Icon;
  return (
    <li
      className={`flex items-center justify-between py-3 px-4 ${
        first ? "" : "border-t border-admin-border"
      }`}
    >
      <span className="text-[13px] text-admin-text-primary">{check.name}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${tone.textClass}`}
      >
        {check.detail}
        <Icon size={14} strokeWidth={2.25} />
      </span>
    </li>
  );
}

export function HealthSection() {
  const health = useQuery({
    queryKey: ["admin", "sistema", "health"],
    queryFn: () => fetchJson<HealthChip[]>("/api/admin/sistema/health"),
    refetchInterval: 60_000,
  });
  const checks = useQuery({
    queryKey: ["admin", "sistema", "runtime-checks"],
    queryFn: () =>
      fetchJson<RuntimeCheck[]>("/api/admin/sistema/runtime-checks"),
    refetchInterval: 60_000,
  });

  const allOk =
    (checks.data ?? []).every((c) => c.status === "ok") &&
    (checks.data ?? []).length > 0;

  return (
    <section>
      <AdminSectionHeader
        accent="neutral"
        title="Estado do sistema"
        info="Visão consolidada da saúde técnica. Verde = operacional, âmbar = atenção, vermelho = crítico."
      />
      <AdminCard variant="flush" className="overflow-hidden">
        {health.isLoading ? (
          <div className="p-4">
            <SectionSkeleton rows={1} rowHeight={56} />
          </div>
        ) : health.error ? (
          <div className="p-4">
            <SectionError error={health.error} onRetry={() => health.refetch()} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-admin-border">
            {(health.data ?? []).map((chip) => (
              <ReadinessChip key={chip.service} chip={chip} />
            ))}
          </div>
        )}

        <div className="border-t border-admin-border px-6 pt-6 pb-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
                Verificações de runtime
              </h3>
              <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary">
                Verificações automáticas do estado do publicado
              </p>
            </div>
            <AdminBadge variant={allOk ? "revenue" : "expense"}>
              {allOk ? "Pronto" : "Atenção"}
            </AdminBadge>
          </div>
          {checks.isLoading ? (
            <SectionSkeleton rows={5} rowHeight={32} />
          ) : checks.error ? (
            <SectionError
              error={checks.error}
              onRetry={() => checks.refetch()}
            />
          ) : (
            <ul className="m-0 list-none p-0">
              {(checks.data ?? []).map((check, idx) => (
                <SmokeRow key={check.name} check={check} first={idx === 0} />
              ))}
            </ul>
          )}
        </div>
      </AdminCard>
    </section>
  );
}
