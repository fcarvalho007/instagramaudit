/**
 * AdminInfoTooltip — pequeno círculo "i" editorial (Georgia italic) com
 * tooltip Radix em fundo escuro.
 *
 * Usado ao lado de eyebrows / títulos de KPI quando é preciso explicar a
 * fórmula ou origem da métrica sem ocupar espaço editorial.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminInfoTooltipProps {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function AdminInfoTooltip({ label, side = "top" }: AdminInfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-admin-border-strong text-[10px] leading-none text-admin-text-tertiary transition-colors hover:border-admin-text-primary hover:text-admin-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-revenue-500 cursor-help"
            style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
          >
            i
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={8}
          className="max-w-[280px] bg-admin-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}