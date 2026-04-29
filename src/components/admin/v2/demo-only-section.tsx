/**
 * DemoOnlySection — wrapper para secções do admin que ainda só têm
 * implementação mock.
 *
 * Comportamento:
 *   - `demoMode === true`  → renderiza `children` (mockup atual).
 *   - `demoMode === false` → renderiza empty state honesto, com indicação
 *     clara de que a secção depende de integração futura e como ativar a
 *     visualização demo.
 *
 * Garante que, por defeito, o utilizador vê o estado real (vazio ou
 * ainda-não-ligado) e não fica enganado por números fictícios.
 */

import type { ReactNode } from "react";
import { useDemoMode } from "@/lib/admin/demo-mode";
import { AdminCard } from "./admin-card";
import { AdminSectionHeader } from "./admin-section-header";

interface DemoOnlySectionProps {
  /** Título da secção (mesmo título que o mock usa). */
  title: string;
  /** Subtítulo/eyebrow opcional. */
  subtitle?: string;
  /** Cor de acento da secção (revenue, expense, signal, info, default). */
  accent?: "revenue" | "expense" | "signal" | "info" | "default";
  /** Tooltip "i" opcional. */
  info?: string;
  /**
   * Razão concreta pela qual ainda não há dados reais (ex.: "depende de
   * subscrições/checkout EuPago"). Aparece no empty state.
   */
  pendingReason: string;
  /** Mockup a renderizar quando demo mode está on. */
  children: ReactNode;
}

export function DemoOnlySection({
  title,
  subtitle,
  accent,
  info,
  pendingReason,
  children,
}: DemoOnlySectionProps) {
  const { enabled, set } = useDemoMode();

  if (enabled) {
    return <>{children}</>;
  }

  return (
    <section>
      <AdminSectionHeader
        title={title}
        subtitle={subtitle}
        accent={accent}
        info={info}
      />
      <AdminCard>
        <div className="flex flex-col items-start gap-3 py-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-text-tertiary">
            Sem dados reais ainda
          </span>
          <p className="m-0 max-w-xl text-sm leading-relaxed text-admin-text-secondary">
            {pendingReason}
          </p>
          <button
            type="button"
            onClick={() => set(true)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-admin-border bg-admin-surface px-2.5 py-1.5 text-[11px] font-medium text-admin-text-secondary transition-colors hover:border-admin-text-tertiary hover:text-admin-text-primary"
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "rgb(6 182 212)" }}
            />
            Ver layout com dados de demonstração
          </button>
        </div>
      </AdminCard>
    </section>
  );
}