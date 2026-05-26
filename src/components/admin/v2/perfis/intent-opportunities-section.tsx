/**
 * Tab Perfis · Secção 3 — Oportunidades de conversão (estado vazio).
 *
 * Depende de tracking de pesquisas anónimas dedup por utilizador, que ainda
 * não está implementado. Mostrado como EmptyStateCard até existir fonte real.
 */

import { EmptyStateCard } from "../empty-state-card";

export function IntentOpportunitiesSection() {
  return (
    <EmptyStateCard
      title="Oportunidades de conversão"
      accent="signal"
      info="Perfis pesquisados várias vezes pelo mesmo utilizador sem relatório pago."
      reason="Requer dedup de pesquisas anónimas por utilizador (ainda não tracked). Entretanto, a secção «Sinais de intenção» na Visão geral lista pesquisas repetidas por handle a partir de `analysis_events`."
    />
  );
}