/**
 * /admin/perfis — tab Perfis do admin v2.
 *
 * Operacionaliza a vista de perfis Instagram analisados, respondendo a três
 * perguntas:
 *   1. Quais os perfis mais analisados? (top performers)
 *   2. Que perfis estão a gerar receita? (conversão pesquisa → report)
 *   3. Onde estão as oportunidades? (perfis pesquisados várias vezes sem report)
 *
 * Estrutura: 4 secções verticais com `gap-14` (56px), mesmas convenções de Receita
 * e Relatórios.
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { AdminSearchInput } from "@/components/admin/v2/admin-search-input";
import {
  PeriodSelect,
  ExportCsvButton,
  type AdminPeriod,
} from "@/components/admin/v2/period-select";
import { MetricsSection } from "@/components/admin/v2/perfis/metrics-section";
import { TopProfilesSection } from "@/components/admin/v2/perfis/top-profiles-section";
import { IntentOpportunitiesSection } from "@/components/admin/v2/perfis/intent-opportunities-section";
import { ProfilesTableSection } from "@/components/admin/v2/perfis/profiles-table-section";

export const Route = createFileRoute("/admin/perfis")({
  component: PerfisPage,
});

function PerfisPage() {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const [search, setSearch] = useState("");

  return (
    <>
      <AdminPageHeader
        title="Perfis"
        subtitle="Perfis Instagram analisados, repetições e conversão em relatórios"
        actions={
          <>
            <AdminSearchInput
              placeholder="Pesquisar perfil..."
              value={search}
              onChange={setSearch}
            />
            <PeriodSelect value={period} onChange={setPeriod} />
            <ExportCsvButton
              onExport={() => {
                // Mock por agora — endpoint CSV virá numa próxima iteração.
                // eslint-disable-next-line no-console
                console.info("[admin/perfis] export CSV", { period, search });
              }}
            />
          </>
        }
      />
      <div className="flex flex-col gap-14">
        <MetricsSection />
        <TopProfilesSection />
        <IntentOpportunitiesSection />
        <ProfilesTableSection />
      </div>
    </>
  );
}