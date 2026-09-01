import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Largura e ritmo horizontal canónicos do relatório público.
 *
 * O `ReportShellV2` usa estas mesmas classes no hero e na coluna
 * sidebar+conteúdo. A chrome renderizada pela rota `/analyze/$username`
 * (barra "Auditoria Instantânea", banner de packs, bloco "Aprofundar")
 * vive fora do shell e, sem este wrapper, ficava full-bleed — duas
 * grelhas diferentes na mesma página.
 *
 * Componente puramente de apresentação: sem estado, sem lógica.
 */
export const REPORT_GRID_ROW_CLASS =
  "mx-auto w-full max-w-[1520px] px-4 sm:px-5 md:px-6 lg:px-8";

export function ReportGridRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(REPORT_GRID_ROW_CLASS, className)}>{children}</div>;
}
