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
 * Bottom navigation bar fixa para mobile/tablet (<1024px).
 * 6 ícones + label curto em grid, estilo app nativa (thumb zone).
 */
export function ReportBlockTopTabs() {
  const active = useActiveBlock(BLOCK_IDS);

  return (
    <nav
      aria-label="Navegação do relatório"
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-white/95 supports-[backdrop-filter]:backdrop-blur-lg",
        "border-t border-slate-200/80",
        "shadow-[0_-2px_12px_rgba(15,23,42,0.06)]",
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      <ul className="grid grid-cols-6 w-full">
        {BLOCKS.map((block) => {
          const isActive = block.id === active;
          const Icon = block.icon;
          return (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => scrollToBlock(block.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 w-full",
                  "py-2 pt-2.5 transition-colors duration-150",
                  "min-h-[52px]",
                  "focus-visible:outline-none focus-visible:bg-blue-50",
                  isActive
                    ? "text-blue-600"
                    : "text-slate-400 active:text-slate-600",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400",
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[9px] font-medium leading-tight truncate max-w-full px-0.5",
                    isActive ? "text-blue-600 font-semibold" : "text-slate-500",
                  )}
                >
                  {block.shortLabel}
                </span>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-blue-500"
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
