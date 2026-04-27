/**
 * Estado do sistema — readiness strip (5 chips com semáforo) + smoke test
 * (5 verificações em lista vertical).
 *
 * Os dots usam directamente os literais `healthOk/Warn/Critical` definidos
 * em `admin-tokens.ts` (sem novas variáveis CSS). O resto da estilização
 * vem dos tokens admin existentes.
 */

import { Check } from "lucide-react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { ADMIN_LITERAL } from "@/components/admin/v2/admin-tokens";
import {
  MOCK_SMOKE_CHECKS,
  MOCK_SYSTEM_HEALTH,
  type MockHealthStatus,
  type MockSmokeCheck,
  type MockSystemHealthChip,
} from "@/lib/admin/mock-data";

const STATUS_DOT: Record<MockHealthStatus, string> = {
  operational: ADMIN_LITERAL.healthOk,
  attention: ADMIN_LITERAL.healthWarn,
  critical: ADMIN_LITERAL.healthCritical,
};

function ReadinessChip({ chip }: { chip: MockSystemHealthChip }) {
  return (
    <div className="bg-admin-surface px-5 py-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: STATUS_DOT[chip.status] }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary">
          {chip.service}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-admin-text-primary m-0">
        {chip.detail}
      </p>
    </div>
  );
}

function SmokeRow({ check, last }: { check: MockSmokeCheck; last: boolean }) {
  return (
    <li
      className={`flex items-center justify-between py-3 px-4 ${
        last ? "" : "border-b border-admin-border"
      }`}
    >
      <span className="text-[13px] text-admin-text-primary">{check.name}</span>
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-admin-revenue-700">
        {check.detail}
        <Check size={14} strokeWidth={2.25} />
      </span>
    </li>
  );
}

export function HealthSection() {
  return (
    <section>
      <AdminSectionHeader
        accent="neutral"
        title="Estado do sistema"
        info="Visão consolidada da saúde técnica. Verde = operacional, âmbar = atenção, vermelho = crítico. O smoke test verifica todas as integrações."
      />
      <AdminCard variant="flush" className="overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-admin-border">
          {MOCK_SYSTEM_HEALTH.map((chip) => (
            <ReadinessChip key={chip.service} chip={chip} />
          ))}
        </div>

        <div className="border-t border-admin-border px-6 pt-6 pb-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
                Verificações de runtime
              </h3>
              <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary">
                5 verificações automáticas do estado do publicado
              </p>
            </div>
            <AdminBadge variant="revenue">Pronto</AdminBadge>
          </div>
          <ul className="m-0 list-none p-0">
            {MOCK_SMOKE_CHECKS.map((check, idx) => (
              <SmokeRow
                key={check.name}
                check={check}
                last={idx === MOCK_SMOKE_CHECKS.length - 1}
              />
            ))}
          </ul>
        </div>
      </AdminCard>
    </section>
  );
}