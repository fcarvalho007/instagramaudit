import { Bot, Cpu, Database } from "lucide-react";

import { cn } from "@/lib/utils";

export type SourceBadgeVariant = "extracted" | "auto" | "ai";

const COPY: Record<SourceBadgeVariant, { label: string; Icon: typeof Bot }> = {
  extracted: { label: "Dados extraídos", Icon: Database },
  auto: { label: "Leitura automática", Icon: Cpu },
  ai: { label: "Leitura IA", Icon: Bot },
};

const STYLE: Record<SourceBadgeVariant, string> = {
  extracted: "bg-slate-50 text-slate-600 ring-slate-200",
  auto: "bg-slate-50 text-slate-700 ring-slate-200",
  ai: "bg-blue-50 text-blue-700 ring-blue-100",
};

/**
 * Pequena badge usada na Pergunta 04 para sinalizar a origem de cada
 * sub-bloco da leitura editorial: dados crus extraídos, leitura
 * automática (heurísticas) ou leitura IA.
 */
export function SourceBadge({
  variant,
  className,
}: {
  variant: SourceBadgeVariant;
  className?: string;
}) {
  const { label, Icon } = COPY[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1",
        "font-mono text-[10px] uppercase tracking-[0.14em]",
        STYLE[variant],
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {label}
    </span>
  );
}