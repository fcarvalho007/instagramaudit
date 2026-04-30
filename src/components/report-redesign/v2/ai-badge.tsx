import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  /** `inline` = chip pequeno; `corner` = badge canto sup. direito do cartão. */
  variant?: "inline" | "corner";
  /** Override editorial do tooltip. */
  tooltip?: string;
  className?: string;
}

const DEFAULT_TOOLTIP =
  "Interpretação gerada por IA com base nos dados reais deste perfil. Os números são sempre calculados diretamente a partir das publicações.";

/**
 * Indicador visual de conteúdo gerado por IA.
 *
 * Usar **apenas** junto a texto realmente produzido pela OpenAI
 * (`aiInsightsV2.sections.*`). A ausência deste badge significa que o
 * elemento é determinístico — calculado a partir dos posts.
 */
export function AiBadge({ variant = "inline", tooltip, className }: Props) {
  const base =
    variant === "inline"
      ? "inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 ring-1 ring-blue-200 text-blue-700"
      : "inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 ring-1 ring-blue-200 text-blue-700 shadow-sm";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label="Conteúdo gerado por IA"
            tabIndex={0}
            className={cn(
              base,
              "font-mono text-[9px] uppercase tracking-[0.16em] cursor-help",
              "outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              className,
            )}
          >
            <Bot aria-hidden className="size-3" />
            <span>IA</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {tooltip ?? DEFAULT_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}