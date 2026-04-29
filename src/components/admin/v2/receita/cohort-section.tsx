/**
 * Receita · Secção 4 — Cohort de retenção.
 *
 * Tabela 6×8 com células coloridas via escala 5-step esmeralda.
 * Valores `null` no array de retenções renderizam como `—` (futuro).
 */

import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import { MOCK_COHORTS } from "@/lib/admin/mock-data";

/** 5-step esmeralda — fundos suaves, leitura editorial (Bloomberg-like). */
function retentionStyle(pct: number): { bg: string; fg: string; border: string } {
  if (pct >= 90) return { bg: "#E1F5EE", fg: "#04342C", border: "#5DCAA5" };
  if (pct >= 80) return { bg: "#E8F7EF", fg: "#085041", border: "#9FE1CB" };
  if (pct >= 70) return { bg: "#EFF8F2", fg: "#0F6E56", border: "#C4E8D7" };
  if (pct >= 60) return { bg: "#F4F9F4", fg: "#1D9E75", border: "#D9ECDD" };
  return { bg: "#F7F8F4", fg: "#5F5E5A", border: "#E8E5DA" };
}

const SCALE_LEGEND = [10, 50, 65, 75, 85, 95]; // pontos representativos para os 5 steps

export function CohortSection() {
  return (
    <DemoOnlySection
      title="Cohort de retenção"
      subtitle="% de subscritores que se mantêm activos"
      accent="leads"
      info={"Percentagem de subscritores que se mantêm activos após o registo, agrupados por mês de entrada."}
      pendingReason={"A análise de cohort retention exige um histórico de subscrições (tabela `subscriptions` com mês de aquisição e estado activo). Será calculado quando o checkout estiver no sítio."}
    >
      <section>
      <AdminCard className="!px-6 !py-5">
        <div className="overflow-x-auto">
          <table
            className="w-full text-[12px]"
            style={{ borderCollapse: "separate", borderSpacing: "4px" }}
          >
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
                <tr key={row.cohort}>
                  <td className="py-2 pr-3 text-admin-text-primary font-medium">
                    {row.cohort}
                  </td>
                  <td
                    className="py-2 px-3 text-right font-mono text-admin-text-secondary"
                    style={{ fontFeatureSettings: "'tnum'" }}
                  >
                    {row.start}
                  </td>
                  {row.retention.map((pct, i) => (
                    <td key={i} className="text-center">
                      {pct === null ? (
                        <span className="text-admin-text-tertiary">—</span>
                      ) : (
                        (() => {
                          const s = retentionStyle(pct);
                          return (
                            <span
                              className="inline-block min-w-[40px] font-mono font-medium"
                              style={{
                                backgroundColor: s.bg,
                                color: s.fg,
                                border: `1px solid ${s.border}`,
                                padding: "7px 6px",
                                borderRadius: "6px",
                                fontFeatureSettings: "'tnum'",
                              }}
                              aria-label={`Retenção mês ${i + 1}: ${pct}%`}
                            >
                              {pct}%
                            </span>
                          );
                        })()
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
    </DemoOnlySection>
  );
}