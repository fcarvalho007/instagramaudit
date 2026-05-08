import { useState, useMemo } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { REDESIGN_TOKENS } from "../report-tokens";
import { BLOCKS } from "./block-config";
import { scrollToBlock, useActiveBlock } from "./use-active-block";

/**
 * Navegação lateral sticky para desktop (≥1024px). Lista os 6 blocos
 * com numeração mono e bullet azul a marcar o bloco activo.
 */
export function ReportBlockSidebar({ visibleBlockIds }: { visibleBlockIds?: string[] }) {
  const filtered = visibleBlockIds
    ? BLOCKS.filter((b) => visibleBlockIds.includes(b.id))
    : BLOCKS;
  const ids = filtered.map((b) => b.id);
  const active = useActiveBlock(ids);

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
        {filtered.map((block) => {
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
                    "tabular-nums text-xs tabular-nums tracking-[0.16em]",
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
 * Mostra 3 ícones contextuais grandes (ativo + adjacentes) + hamburger
 * para navegação completa via Sheet drawer.
 */
export function ReportBlockTopTabs({ visibleBlockIds }: { visibleBlockIds?: string[] }) {
  const filtered = visibleBlockIds
    ? BLOCKS.filter((b) => visibleBlockIds.includes(b.id))
    : BLOCKS;
  const ids = filtered.map((b) => b.id);
  const active = useActiveBlock(ids);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeIndex = useMemo(
    () => Math.max(0, filtered.findIndex((b) => b.id === active)),
    [active],
  );

  // 3 ícones visíveis: ativo + adjacentes, clamped aos limites
  const visibleIndices = useMemo(() => {
    const start = Math.max(0, Math.min(activeIndex - 1, filtered.length - 3));
    return [start, start + 1, start + 2];
  }, [activeIndex]);

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
      <div className="flex w-full items-stretch">
        {/* 3 ícones contextuais */}
        <div className="flex flex-1">
          {visibleIndices.map((idx) => {
            const block = filtered[idx];
            const isActive = block.id === active;
            const Icon = block.icon;
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => scrollToBlock(block.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1",
                  "py-2.5 min-h-[64px] transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:bg-blue-50/60",
                  isActive
                    ? "text-blue-600"
                    : "text-slate-400 active:text-slate-600",
                )}
              >
                {/* Barra superior ativa */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-b-full bg-blue-500 transition-all duration-300"
                  />
                )}
                <Icon
                  className={cn(
                    "size-7 transition-colors duration-200",
                    isActive ? "text-blue-600" : "text-slate-400",
                  )}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs leading-tight truncate max-w-full px-1",
                    isActive
                      ? "text-blue-600 font-semibold"
                      : "text-slate-500 font-medium",
                  )}
                >
                  {block.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Separador vertical */}
        <div className="w-px bg-slate-200/70 my-3" aria-hidden="true" />

        {/* Hamburger → Sheet com todas as secções */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Menu de secções"
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "w-[72px] min-h-[64px] transition-colors duration-200",
                "text-slate-400 active:text-slate-600",
                "focus-visible:outline-none focus-visible:bg-blue-50/60",
              )}
            >
              <Menu className="size-7" strokeWidth={1.6} aria-hidden="true" />
              <span className="text-xs font-medium leading-tight text-slate-500">
                Menu
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-3">
            <SheetHeader className="pb-3 border-b border-slate-100">
              <SheetTitle className="text-base font-semibold text-slate-900">
                Secções do relatório
              </SheetTitle>
            </SheetHeader>
            <ul className="mt-3 space-y-1">
              {filtered.map((block) => {
                const isActive = block.id === active;
                const Icon = block.icon;
                return (
                  <li key={block.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        // small delay so sheet closes before scroll
                        setTimeout(() => scrollToBlock(block.id), 180);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3",
                        "transition-colors duration-150",
                        isActive
                          ? "bg-blue-50/80 text-blue-700"
                          : "text-slate-600 active:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "tabular-nums text-xs tabular-nums tracking-widest",
                          isActive ? "text-blue-500" : "text-slate-400",
                        )}
                      >
                        {block.number}
                      </span>
                      <Icon
                        className={cn(
                          "size-5 shrink-0",
                          isActive ? "text-blue-600" : "text-slate-400",
                        )}
                        strokeWidth={isActive ? 2 : 1.6}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "text-sm",
                          isActive ? "font-semibold" : "font-medium",
                        )}
                      >
                        {block.shortLabel}
                      </span>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="ml-auto size-1.5 rounded-full bg-blue-500"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
