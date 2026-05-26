/**
 * EmptyStateCard — wrapper para secções admin sem fonte de dados real
 * disponível (sem checkout, sem subscrições, sem pagamentos).
 *
 * Substitui `DemoOnlySection` nos casos em que NÃO há mock para mostrar:
 * comunica claramente o estado pendente sem expor números fictícios.
 */

import { AdminCard } from "./admin-card";
import { AdminSectionHeader } from "./admin-section-header";
import type { AdminAccent } from "./admin-tokens";

interface EmptyStateCardProps {
  title: string;
  subtitle?: string;
  accent?: AdminAccent;
  info?: string;
  reason: string;
}

export function EmptyStateCard({
  title,
  subtitle,
  accent,
  info,
  reason,
}: EmptyStateCardProps) {
  return (
    <section>
      <AdminSectionHeader
        title={title}
        subtitle={subtitle}
        accent={accent ?? "neutral"}
        info={info}
      />
      <AdminCard>
        <div className="flex flex-col items-start gap-2 py-6">
          <span className="text-eyebrow-sm text-admin-text-tertiary">
            Sem dados ainda
          </span>
          <p className="m-0 max-w-2xl text-sm leading-relaxed text-admin-text-secondary">
            {reason}
          </p>
        </div>
      </AdminCard>
    </section>
  );
}