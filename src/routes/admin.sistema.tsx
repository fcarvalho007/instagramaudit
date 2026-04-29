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
import { LegacyAccessSection } from "@/components/admin/v2/sistema/legacy-access-section";

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
      const res = await fetch("/api/admin/sistema/sync-now", {
        method: "POST",
        credentials: "include",
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
            >
              <RotateCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "A sincronizar…" : "Sincronizar agora"}
            </AdminActionButton>
          </>
        }
      />
      <div className="flex flex-col gap-14">
        <HealthSection />
        <SecretsConfigSection />
        <CostsDetailSection />
        <LegacyAccessSection />
      </div>
    </>
  );
}