import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "../report-tokens";
import { BLOCKS } from "./block-config";
import { scrollToBlock, useActiveBlock } from "./use-active-block";

const BLOCK_IDS = BLOCKS.map((b) => b.id);

/**
 * Navegação lateral sticky para desktop (≥1024px). Lista os 6 blocos
 * com numeração mono e bullet azul a marcar o bloco activo.
 */
export function ReportBlockSidebar() {
  const active = useActiveBlock(BLOCK_IDS);

  return (
    <nav
      aria-label="Navegação do relatório"
      className="hidden lg:block sticky top-6 self-start w-56 shrink-0"
    >
      <p className={cn(REDESIGN_TOKENS.eyebrow, "mb-4 px-3")}>
        Secções do relatório
      </p>
      <ul className="space-y-1">
        {BLOCKS.map((block) => {
          const isActive = block.id === active;
          return (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => scrollToBlock(block.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                  "transition-colors duration-150",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    isActive ? "bg-blue-600" : "bg-slate-300",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.16em]",
                    isActive ? "text-blue-600" : "text-slate-400",
                  )}
                >
                  {block.number}
                </span>
                <span className="text-sm font-medium">{block.shortLabel}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Navegação horizontal sticky para mobile/tablet (<1024px).
 * Scroll-x interno com snap; bullet activo correcto.
 */
export function ReportBlockTopTabs() {
  const active = useActiveBlock(BLOCK_IDS);

  return (
    <nav
      aria-label="Navegação do relatório"
      className={cn(
        "lg:hidden sticky top-0 z-30 w-full",
        "bg-white/85 backdrop-blur border-b border-slate-200/70",
      )}
    >
      <ul
        className={cn(
          "mx-auto max-w-7xl flex gap-1 overflow-x-auto px-3 py-2",
          "snap-x snap-mandatory scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {BLOCKS.map((block) => {
          const isActive = block.id === active;
          return (
            <li key={block.id} className="snap-start shrink-0">
              <button
                type="button"
                onClick={() => scrollToBlock(block.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-2",
                  "text-xs font-medium transition-colors",
                  "min-h-[36px]",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.14em]",
                    isActive ? "text-white/80" : "text-slate-400",
                  )}
                >
                  {block.number}
                </span>
                <span>{block.shortLabel}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
