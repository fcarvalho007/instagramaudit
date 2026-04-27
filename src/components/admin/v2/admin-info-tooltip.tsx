/**
 * AdminInfoTooltip — gatilho "i" + tooltip dark cinematográfico.
 *
 * Usa o `Tooltip` do shadcn (Radix). O `TooltipProvider` é instalado
 * lazy à volta de cada gatilho, com `delayDuration={200}`, para que
 * possa ser usado sem provider global e mantenha a animação subtil.
 *
 * Visual:
 *  - Gatilho: círculo 16×16, border 1px strong, letra "i" Georgia italic
 *    10px weight 500. Hover → border + texto primary.
 *  - Conteúdo: bg #1F1E1B, texto creme #FAF9F5, Inter 11px, padding
 *    10×14, radius 8, max-width 240, box-shadow editorial.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminInfoTooltipProps {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  /** Override raro do label de a11y (default: o próprio texto). */
  ariaLabel?: string;
  className?: string;
}

export function AdminInfoTooltip({
  text,
  side = "top",
  ariaLabel,
  className,
}: AdminInfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel ?? text}
            className={`group inline-flex h-4 w-4 items-center justify-center rounded-full border bg-transparent leading-none transition-colors ${className ?? ""}`.trim()}
            style={{
              borderColor: "var(--color-admin-border-strong)",
              cursor: "help",
            }}
          >
            <span
              aria-hidden="true"
              className="text-admin-text-tertiary transition-colors group-hover:text-admin-text-primary"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontSize: 10,
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              i
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={6}
          className="z-50 border-0 bg-transparent p-0 shadow-none"
        >
          <div
            style={{
              backgroundColor: "#1F1E1B",
              color: "#FAF9F5",
              fontFamily:
                'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
              fontSize: 11,
              fontWeight: 400,
              lineHeight: 1.45,
              padding: "10px 14px",
              borderRadius: 8,
              maxWidth: 240,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {text}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}