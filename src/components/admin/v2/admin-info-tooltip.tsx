/**
 * AdminInfoTooltip — pequeno ícone "i" com tooltip Radix.
 *
 * Usado ao lado de eyebrows / títulos de KPI quando é preciso explicar a
 * fórmula ou origem da métrica sem ocupar espaço editorial.
 */

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminInfoTooltipProps {
  label: string;
  /** Override de tamanho do ícone (default 12px). */
  size?: number;
}

export function AdminInfoTooltip({ label, size = 13 }: AdminInfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center justify-center rounded-full text-admin-text-tertiary transition-colors hover:text-admin-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-revenue-500"
          >
            <Info size={size} strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] bg-admin-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}