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
            className="inline-flex items-center justify-center cursor-help"
            style={{
              width: 16,
              height: 16,
              borderRadius: 9999,
              border: "1px solid #B4B2A9",
              backgroundColor: "#FFFFFF",
              color: "#5F5E5A",
              fontSize: 10,
              lineHeight: 1,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
            }}
          >
            i
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={8}
          style={{
            maxWidth: 280,
            backgroundColor: "#2C2C2A",
            color: "#FFFFFF",
            padding: "8px 12px",
            fontSize: 11,
            lineHeight: 1.5,
            borderRadius: 6,
            boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
          }}
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}