/**
 * Receita · Secção 4 — Cohort de retenção.
 *
 * Tabela 6×8 com células coloridas via escala 5-step esmeralda.
 * Valores `null` no array de retenções renderizam como `—` (futuro).
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { MOCK_COHORTS } from "@/lib/admin/mock-data";

/** 5-step verde (escuro = retenção alta). */
function retentionStyle(pct: number): { bg: string; fg: string } {
  if (pct >= 90) return { bg: "rgb(var(--admin-revenue-800))", fg: "#FFFFFF" };
  if (pct >= 80) return { bg: "rgb(var(--admin-revenue-700))", fg: "#FFFFFF" };
  if (pct >= 70) return { bg: "rgb(var(--admin-revenue-500))", fg: "#FFFFFF" };
  if (pct >= 60) return { bg: "rgb(var(--admin-revenue-400))", fg: "rgb(var(--admin-revenue-900))" };
  return { bg: "rgb(var(--admin-revenue-100))", fg: "rgb(var(--admin-revenue-900))" };
}

const SCALE_LEGEND = [10, 50, 65, 75, 85, 95]; // pontos representativos para os 5 steps

export function CohortSection() {
  return (
    <section>
      <AdminSectionHeader
        title="Cohort de retenção"
        subtitle="% de subscritores que se mantêm activos"
        accent="leads"
      />

      <AdminCard className="!px-6 !py-5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="admin-eyebrow text-left pb-2 pr-3 font-normal">Cohort</th>
                <th className="admin-eyebrow text-right pb-2 px-3 font-normal">Início</th>
                {[1, 2, 3, 4, 5, 6].map((m) => (
                  <th
                    key={m}
                    className="admin-eyebrow pb-2 px-2 font-normal text-center"
                  >
                    M{m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_COHORTS.map((row) => (
                <tr
                  key={row.cohort}
                  className="border-t border-admin-border"
                >
                  <td className="py-2 pr-3 text-admin-text-primary font-medium">
                    {row.cohort}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-admin-text-secondary">
                    {row.start}
                  </td>
                  {row.retention.map((pct, i) => (
                    <td key={i} className="py-1 px-1 text-center">
                      {pct === null ? (
                        <span className="text-admin-text-tertiary">—</span>
                      ) : (
                        <span
                          className="inline-block min-w-[40px] rounded font-mono font-medium"
                          style={{
                            backgroundColor: retentionStyle(pct).bg,
                            color: retentionStyle(pct).fg,
                            padding: "6px 4px",
                          }}
                          aria-label={`Retenção mês ${i + 1}: ${pct}%`}
                        >
                          {pct}%
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border pt-3">
          <p className="m-0 text-[11px] text-admin-text-secondary">
            Cohorts mais antigos retêm 63% após 6 meses · sinal saudável
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-admin-text-tertiary">0%</span>
            {SCALE_LEGEND.slice(0, 5).map((pct) => (
              <span
                key={pct}
                aria-hidden="true"
                className="block h-2 w-4 rounded-sm"
                style={{ backgroundColor: retentionStyle(pct).bg }}
              />
            ))}
            <span className="text-[10px] text-admin-text-tertiary">100%</span>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}