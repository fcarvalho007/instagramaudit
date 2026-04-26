/**
 * Custos — agregados financeiros (estimados) e poupança via cache.
 *
 * O custo é uma estimativa baseada em ASSUMED_POSTS_PER_CACHE_HIT posts por
 * análise. Não é a fatura real do Apify.
 */

import { formatCost, formatNumber } from "../cockpit-formatters";
import type { ActivityWindow, CockpitData } from "../cockpit-types";
import { StatCard } from "../parts/stat-card";

const ASSUMED_POSTS_PER_CACHE_HIT = 12;

interface Props {
  data: CockpitData | null;
}

function ratio(numerator: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((numerator / total) * 100)}%`;
}

function costPerCacheHit(data: CockpitData): number {
  return (
    data.apify.cost_per_profile_usd +
    data.apify.cost_per_post_usd * ASSUMED_POSTS_PER_CACHE_HIT
  );
}

export function CostsPanel({ data }: Props) {
  if (!data) return <PanelSkeleton />;

  const perHit = costPerCacheHit(data);
  const cacheSaved24h = Math.round(data.analytics.last_24h.cache * perHit * 1e5) / 1e5;
  const cacheSaved7d = Math.round(data.analytics.last_7d.cache * perHit * 1e5) / 1e5;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Custo · 24h"
          value={formatCost(data.analytics.last_24h.estimated_cost_usd)}
          tone="accent"
        />
        <StatCard
          label="Custo · 7d"
          value={formatCost(data.analytics.last_7d.estimated_cost_usd)}
          tone="accent"
        />
        <StatCard
          label="Cache hits · 7d"
          value={formatNumber(data.analytics.last_7d.cache)}
          sublabel={`24h: ${formatNumber(data.analytics.last_24h.cache)}`}
        />
        <StatCard
          label="Poupança via cache · 7d"
          value={formatCost(cacheSaved7d)}
          sublabel={`24h: ${formatCost(cacheSaved24h)}`}
          tone="success"
        />
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="font-display text-base text-content-primary">Distribuição</h3>
          <p className="text-xs text-content-tertiary">
            Rácio entre análises servidas pela cache, frescas e falhadas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DistributionCard label="Últimas 24h" w={data.analytics.last_24h} />
          <DistributionCard label="Últimos 7 dias" w={data.analytics.last_7d} />
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-surface-elevated p-4 text-xs text-content-tertiary">
        <p className="font-mono uppercase tracking-[0.18em] text-content-secondary">
          Metodologia
        </p>
        <p className="mt-2">
          O custo registado em cada evento é{" "}
          <span className="text-content-secondary">estimado</span> a partir das tarifas
          configuradas (
          <span className="font-mono">{formatCost(data.apify.cost_per_profile_usd)}</span>{" "}
          por perfil +{" "}
          <span className="font-mono">{formatCost(data.apify.cost_per_post_usd)}</span>{" "}
          por post). A poupança via cache assume {ASSUMED_POSTS_PER_CACHE_HIT} posts por
          análise. Estes valores não substituem a fatura real do Apify.
        </p>
      </section>
    </div>
  );
}

function DistributionCard({ label, w }: { label: string; w: ActivityWindow }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row k="Eventos" v={formatNumber(w.events)} />
        <Row k="Fresh" v={`${formatNumber(w.fresh)} (${ratio(w.fresh, w.events)})`} />
        <Row k="Cache" v={`${formatNumber(w.cache)} (${ratio(w.cache, w.events)})`} />
        <Row k="Falhas" v={`${formatNumber(w.failed)} (${ratio(w.failed, w.events)})`} />
        <Row k="Bloqueados (allowlist)" v={formatNumber(w.blocked)} />
      </dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-content-tertiary">{k}</dt>
      <dd className="font-mono text-content-primary">{v}</dd>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
    </div>
  );
}