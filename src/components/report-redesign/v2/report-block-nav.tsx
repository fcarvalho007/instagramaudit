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
      className={cn(
        "hidden lg:block self-start shrink-0",
        "w-60 xl:w-64",
        // Global header is sticky h-16 md:h-20 (max 80 px). Use 96 px so
        // the panel keeps a comfortable breathing band under the header
        // and never feels cut off while scrolling.
        "sticky top-24",
        // Cap height + internal scroll if the viewport is short.
        "max-h-[calc(100vh-7rem)] overflow-y-auto",
        // Editorial card surface — translucent, soft border, gentle shadow.
        "rounded-2xl border border-slate-200/70",
        "bg-white/70 supports-[backdrop-filter]:backdrop-blur-md",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(15,23,42,0.12)]",
        "ring-1 ring-white/60",
        "p-4 xl:p-5",
      )}
    >
      <p
        className={cn(
          REDESIGN_TOKENS.eyebrow,
          "mb-3 px-2 text-slate-500",
        )}
      >
        Secções do relatório
      </p>
      <ul className="space-y-0.5">
        {BLOCKS.map((block) => {
          const isActive = block.id === active;
          return (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => scrollToBlock(block.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative w-full flex items-center gap-3",
                  "rounded-lg pl-3 pr-2.5 py-2.5 text-left",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-blue-400 focus-visible:ring-offset-1",
                  "focus-visible:ring-offset-white",
                  isActive
                    ? "bg-blue-50/80 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
                )}
              >
                {/* Vertical accent rail when active */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full transition-colors",
                    isActive
                      ? "bg-blue-500"
                      : "bg-transparent group-hover:bg-slate-200",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums tracking-[0.16em]",
                    isActive
                      ? "text-blue-600"
                      : "text-slate-400 group-hover:text-slate-500",
                  )}
                >
                  {block.number}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isActive ? "font-semibold" : "font-medium",
                  )}
                >
                  {block.shortLabel}
                </span>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="ml-auto size-1.5 rounded-full bg-blue-500"
                  />
                ) : null}
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
                    "text-eyebrow-sm",
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
