import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Banda editorial full-bleed. Fornece o ritmo vertical (~96px desktop,
 * 64px mobile), o separador de 1px e a grelha contexto/dados.
 *
 * Apresentação pura: sem estado, sem dados, sem lógica de negócio.
 */
export function ReportBand({
  id,
  context,
  children,
  className,
  labelledBy,
}: {
  id?: string;
  /** Coluna de contexto (colunas 1–4 em desktop). */
  context?: ReactNode;
  /** Coluna de dados (colunas 6–12 em desktop). */
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("ev2-band", className)}>
      <div className="ev2-wrap">
        <div className="ev2-grid">
          {context ? <div className="ev2-context">{context}</div> : null}
          <div className={context ? "ev2-data" : "ev2-context ev2-data"}>{children}</div>
        </div>
      </div>
    </section>
  );
}
