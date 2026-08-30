/**
 * /admin/sistema — tab Sistema do admin v2.
 *
 * Vista operacional/técnica que consolida:
 *   1. Controlo operacional (modo, perfis, cache)
 *   2. Estado do sistema (readiness strip + smoke test)
 *   3. Segredos e configuração
 *   4. Custos detalhados
 *   5. Cockpit legado
 */

import { RotateCw } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { AdminActionButton } from "@/components/admin/v2/admin-action-button";
import { HealthSection } from "@/components/admin/v2/sistema/health-section";
import { SecretsConfigSection } from "@/components/admin/v2/sistema/secrets-config-section";
import { CostsDetailSection } from "@/components/admin/v2/sistema/costs-detail-section";
import { ScrapeCreatorsCostsCard } from "@/components/admin/v2/sistema/scrapecreators-costs-card";
import { LegacyAccessSection } from "@/components/admin/v2/sistema/legacy-access-section";
import { AnalysisCostBreakdown } from "@/components/admin/v2/sistema/analysis-cost-breakdown";
import { adminFetch } from "@/lib/admin/fetch";
import { ExecutionModeCard } from "@/components/admin/v2/sistema/execution-mode-card";
import { TestProfilesCard } from "@/components/admin/v2/sistema/test-profiles-card";
import { CacheMaintenanceCard } from "@/components/admin/v2/sistema/cache-maintenance-card";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { ThumbnailPersistenceCard } from "@/components/admin/v2/sistema/thumbnail-persistence-card";
import { OnboardingFunnelCard } from "@/components/admin/v2/sistema/onboarding-funnel-card";
import { ApifyActualCostBackfillCard } from "@/components/admin/v2/sistema/apify-actual-cost-backfill-card";

export const Route = createFileRoute("/admin/sistema")({
  component: SistemaPage,
});

function SistemaPage() {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const onSyncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await adminFetch("/api/admin/sistema/sync-now", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Record<
        "apify" | "openai" | "dataforseo",
        { ok: boolean; message?: string }
      >;
      const failed = (Object.entries(json) as [string, { ok: boolean; message?: string }][])
        .filter(([, v]) => !v.ok)
        .map(([k]) => k);
      if (failed.length === 0) {
        toast.success("Sincronização concluída.");
      } else {
        toast.warning(`Falhou: ${failed.join(", ")}.`);
      }
      qc.invalidateQueries({ queryKey: ["admin", "sistema"] });
    } catch (err) {
      toast.error(`Erro a sincronizar: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Sistema"
        subtitle="Diagnóstico técnico, custos detalhados e alertas operacionais"
        actions={
          <>
            <AdminActionButton
              onClick={onSyncNow}
              disabled={syncing}
              aria-busy={syncing}
              title="Os custos atualizam-se automaticamente a cada 60 segundos. Este botão força a sincronização imediata com Apify, OpenAI e DataForSEO."
            >
              <RotateCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "A sincronizar…" : "Forçar sync provedores"}
            </AdminActionButton>
          </>
        }
      />
      <div className="flex flex-col gap-14">
        {/* ═══ CONTROLO OPERACIONAL ════════════════════════════════════ */}
        <section>
          <AdminSectionHeader
            title="Controlo operacional"
            subtitle="Modo, perfis e cache"
            accent="expense"
            info="Modo de execução, perfis de teste e gestão de cache para desenvolvimento."
          />

          {/* Section header + subtitle */}
          <div className="mb-5">
            <h3
              className="text-[20px] font-semibold"
              style={{ color: "#2C2C2A" }}
            >
              Modo, perfis e cache
            </h3>
            <p className="text-[13px] mt-0.5" style={{ color: "#888780" }}>
              Define como a aplicação trata pedidos de análise e gere os perfis em teste.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {/* Modo de execução — inside card */}
            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: "#E5E3D9", backgroundColor: "#FAFAF7" }}
            >
              <ExecutionModeCard />
            </div>

            {/* Perfis de teste */}
            <TestProfilesCard />

            {/* Zona de risco */}
            <CacheMaintenanceCard />
          </div>

          {/* Footer note */}
          <p
            className="mt-6 text-[12px] leading-relaxed flex items-start gap-1.5"
            style={{ color: "#A8A7A0" }}
          >
            <span className="shrink-0 mt-px">◌</span>
            Modo &ldquo;dados guardados&rdquo; não chama APIs pagas. Modo &ldquo;buscar novo&rdquo; chama Apify, OpenAI e DataForSEO conforme necessário e regista o custo em{" "}
            <span className="font-mono text-xs text-admin-text-tertiary">
              provider_call_logs
            </span>
            .
          </p>
        </section>

        <HealthSection />
        <ThumbnailPersistenceCard />
        <OnboardingFunnelCard />
        <ApifyActualCostBackfillCard />
        <SecretsConfigSection />
        <ScrapeCreatorsCostsCard />
        <CostsDetailSection />
        <AnalysisCostBreakdown />
        <LegacyAccessSection />
      </div>
    </>
  );
}
