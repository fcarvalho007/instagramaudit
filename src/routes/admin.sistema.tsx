/**
 * /admin/sistema — tab Sistema do admin v2.
 *
 * Vista operacional/técnica que consolida o que está hoje espalhado pelo
 * cockpit legado em quatro secções verticais:
 *   1. Estado do sistema (readiness strip + smoke test)
 *   2. Segredos e configuração (presença de secrets + Apify config + allowlist)
 *   3. Custos detalhados (KPIs + últimas chamadas + alertas operacionais)
 *   4. Cockpit legado (acordeão com link em nova aba)
 *
 * Esta é a última tab do redesign — todas as 6 tabs do `/admin` v2 ficam
 * completas. As pendências funcionais transversais (ligação Supabase,
 * estados loading/erro/vazio, responsivo mobile profundo, auditoria a11y)
 * ficam para uma fase seguinte do projecto.
 */

import { RotateCw, PlayCircle } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { AdminActionButton } from "@/components/admin/v2/admin-action-button";
import { HealthSection } from "@/components/admin/v2/sistema/health-section";
import { SecretsConfigSection } from "@/components/admin/v2/sistema/secrets-config-section";
import { CostsDetailSection } from "@/components/admin/v2/sistema/costs-detail-section";
import { LegacyAccessSection } from "@/components/admin/v2/sistema/legacy-access-section";

export const Route = createFileRoute("/admin/sistema")({
  component: SistemaPage,
});

function SistemaPage() {
  return (
    <>
      <AdminPageHeader
        title="Sistema"
        subtitle="Diagnóstico técnico, custos detalhados e alertas operacionais"
        actions={
          <>
            <AdminActionButton
              onClick={() => {
                // Mock por agora — endpoint smoke-test virá numa próxima iteração.
                // eslint-disable-next-line no-console
                console.info("[admin/sistema] smoke test");
              }}
            >
              <PlayCircle size={14} />
              Smoke test
            </AdminActionButton>
            <AdminActionButton
              onClick={() => {
                // eslint-disable-next-line no-console
                console.info("[admin/sistema] refresh");
              }}
            >
              <RotateCw size={14} />
              Atualizar
            </AdminActionButton>
          </>
        }
      />
      <div className="flex flex-col" style={{ gap: 56 }}>
        <HealthSection />
        <SecretsConfigSection />
        <CostsDetailSection />
        <LegacyAccessSection />
      </div>
    </>
  );
}