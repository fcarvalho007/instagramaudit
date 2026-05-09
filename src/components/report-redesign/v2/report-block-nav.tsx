import { useState, useMemo } from "react";
import { Menu, Lock, Sparkles, ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  type ReportVariant,
  type VariantFeatures,
} from "@/lib/report/report-variant";
import { BLOCKS, type BlockConfig } from "./block-config";
import { scrollToBlock, useActiveBlock } from "./use-active-block";

// ── Types ────────────────────────────────────────────────────────────

type AccessState = "accessible" | "partial" | "locked";
type Group = "incluido" | "premium";

interface SidebarItem {
  block: BlockConfig;
  group: Group;
  access: AccessState;
  partialBadge?: string;
}

interface SidebarProfile {
  handle: string;
  avatarUrl?: string | null;
  displayName?: string | null;
}

interface SidebarProps {
  variant: ReportVariant;
  features: VariantFeatures;
  profile: SidebarProfile;
}

const COFRE_ANCHOR_ID = "report-cofre";

// ── Item builder ─────────────────────────────────────────────────────

function buildSidebarItems(
  variant: ReportVariant,
  features: VariantFeatures,
): SidebarItem[] {
  return BLOCKS.map((block) => {
    const fv = features[block.featureKey];
    if (variant === "internal_lab" || variant === "pro_preview") {
      return { block, group: "incluido" as Group, access: "accessible" as AccessState };
    }
    // public_mvp
    if (fv === "hidden") {
      return { block, group: "premium" as Group, access: "locked" as AccessState };
    }
    if (fv === "lightweight" || fv === "teaser") {
      return {
        block,
        group: "incluido" as Group,
        access: "partial" as AccessState,
        partialBadge: block.id === "performance" ? "3/5" : "parcial",
      };
    }
    return { block, group: "incluido" as Group, access: "accessible" as AccessState };
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

function scrollToCofre() {
  const el = document.getElementById(COFRE_ANCHOR_ID);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initialOf(handle: string) {
  return handle.replace(/^@/, "").charAt(0).toUpperCase() || "?";
}

function VariantBadge({ variant }: { variant: ReportVariant }) {
  if (variant === "internal_lab") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-content-secondary border border-border-default">
        <Sparkles className="size-3" aria-hidden="true" />
        Laboratório interno
      </span>
    );
  }
  if (variant === "pro_preview") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700 border border-blue-200">
        <Sparkles className="size-3" aria-hidden="true" />
        Pro ativo
      </span>
    );
  }
  return null;
}

function ProfileHeader({ profile }: { profile: SidebarProfile }) {
  const handle = profile.handle.startsWith("@") ? profile.handle : `@${profile.handle}`;
  return (
    <div className="flex items-center gap-3 px-1 pb-3 mb-3 border-b border-border-default/60">
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt=""
          className="size-10 rounded-full object-cover ring-1 ring-border-default"
        />
      ) : (
        <div
          aria-hidden="true"
          className="size-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-sm"
        >
          {initialOf(profile.handle)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-content-primary">
          {handle}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ accessible, total }: { accessible: number; total: number }) {
  const locked = total - accessible;
  return (
    <div className="px-1 pt-1 pb-3">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="bg-emerald-500"
          style={{ width: `${(accessible / total) * 100}%` }}
          aria-hidden="true"
        />
        <div
          className="bg-signal-warning/70"
          style={{ width: `${(locked / total) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
        <span className="text-emerald-600">{accessible} acessíveis</span>
        <span className="text-accent-gold">{locked} por desbloquear</span>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  isActive,
  onClick,
}: {
  item: SidebarItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const isLocked = item.access === "locked";
  const isPartial = item.access === "partial";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      aria-disabled={isLocked || undefined}
      className={cn(
        "group relative w-full flex items-center gap-3",
        "rounded-lg pl-3 pr-2.5 py-2.5 text-left",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-400 focus-visible:ring-offset-1",
        "focus-visible:ring-offset-white",
        isActive
          ? "bg-blue-50/80 text-blue-700"
          : isLocked
            ? "text-content-tertiary hover:bg-surface-muted/70"
            : "text-content-secondary hover:bg-surface-muted/70 hover:text-content-primary",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full transition-colors",
          isActive ? "bg-blue-500" : "bg-transparent group-hover:bg-border-default",
        )}
      />
      <span
        className={cn(
          "tabular-nums text-xs tracking-[0.16em]",
          isActive
            ? "text-blue-600"
            : isLocked
              ? "text-content-tertiary/80"
              : "text-content-tertiary",
        )}
      >
        {item.block.number}
      </span>
      {isLocked ? (
        <Lock className="size-3.5 text-content-tertiary" aria-hidden="true" />
      ) : null}
      <span
        className={cn(
          "text-sm truncate",
          isActive ? "font-semibold" : "font-medium",
          isLocked && "italic",
        )}
      >
        {item.block.shortLabel}
      </span>
      {isPartial && item.partialBadge ? (
        <span className="ml-auto inline-flex items-center rounded-full bg-signal-warning/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-accent-gold">
          {item.partialBadge}
        </span>
      ) : isActive ? (
        <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-blue-500" />
      ) : null}
    </button>
  );
}

function GroupHeader({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: "incluido" | "premium";
}) {
  return (
    <div className="flex items-center justify-between px-2 mt-3 mb-1">
      <div className="flex items-center gap-1.5">
        {variant === "incluido" ? (
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        ) : (
          <Sparkles className="size-3 text-accent-gold" aria-hidden="true" />
        )}
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.12em]",
            variant === "incluido" ? "text-emerald-600" : "text-accent-gold",
          )}
        >
          {label}
        </span>
      </div>
      <span className="text-xs tabular-nums text-content-tertiary">{count}</span>
    </div>
  );
}

function CofreCard() {
  return (
    <div
      id={COFRE_ANCHOR_ID}
      className="mt-4 rounded-2xl bg-content-primary p-4 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.4)]"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-amber-300" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Abrir o cofre</h3>
      </div>
      <p className="mt-1 text-xs text-white/70">
        3 secções premium · análise completa
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/10 p-2.5 ring-1 ring-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">
            Uma vez
          </p>
          <p className="mt-1 text-base font-bold tabular-nums">
            €3 <span className="text-[10px] font-medium text-white/60">+IVA</span>
          </p>
          <p className="mt-1 text-[10px] text-white/60 leading-tight">
            só esta análise
          </p>
        </div>
        <div className="relative rounded-lg bg-amber-500 p-2.5 text-content-primary ring-1 ring-amber-300/50">
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full bg-content-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
            <Star className="size-2.5 fill-amber-300" aria-hidden="true" />
            POUPA €2
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] opacity-80">
            Bundle 5
          </p>
          <p className="mt-1 text-base font-bold tabular-nums">
            €13 <span className="text-[10px] font-medium opacity-70">+IVA</span>
          </p>
          <p className="mt-1 text-[10px] opacity-80 leading-tight">
            5 análises · €2,60/cada
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-content-primary hover:bg-white/90 transition-colors"
      >
        Desbloquear
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

// ── Sidebar list (shared layout for desktop + mobile drawer) ─────────

function SidebarList({
  items,
  active,
  variant,
  onAccessibleClick,
  onLockedClick,
}: {
  items: SidebarItem[];
  active: string | null;
  variant: ReportVariant;
  onAccessibleClick: (id: string) => void;
  onLockedClick: () => void;
}) {
  const incluidos = items.filter((i) => i.group === "incluido");
  const premium = items.filter((i) => i.group === "premium");
  const accessibleCount = items.filter((i) => i.access !== "locked").length;
  const isPublic = variant === "public_mvp";

  return (
    <>
      <GroupHeader label="Incluído" count={incluidos.length} variant="incluido" />
      <ul className="space-y-0.5">
        {incluidos.map((item) => (
          <li key={item.block.id}>
            <ItemRow
              item={item}
              isActive={item.block.id === active}
              onClick={() => onAccessibleClick(item.block.id)}
            />
          </li>
        ))}
      </ul>

      {premium.length > 0 && (
        <>
          <GroupHeader label="Premium" count={premium.length} variant="premium" />
          <ul className="space-y-0.5">
            {premium.map((item) => (
              <li key={item.block.id}>
                <ItemRow
                  item={item}
                  isActive={false}
                  onClick={onLockedClick}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {isPublic && (
        <ProgressBar accessible={accessibleCount} total={items.length} />
      )}

      {isPublic && <CofreCard />}
    </>
  );
}

// ── Desktop sidebar ──────────────────────────────────────────────────

export function ReportBlockSidebar({ variant, features, profile }: SidebarProps) {
  const items = useMemo(() => buildSidebarItems(variant, features), [variant, features]);
  const accessibleIds = items.filter((i) => i.access !== "locked").map((i) => i.block.id);
  const active = useActiveBlock(accessibleIds);

  return (
    <nav
      aria-label="Navegação do relatório"
      className={cn(
        "hidden lg:block self-start shrink-0",
        "w-64 xl:w-72",
        "sticky top-24",
        "max-h-[calc(100vh-7rem)] overflow-y-auto",
        "rounded-2xl border border-border-default",
        "bg-white",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(15,23,42,0.12)]",
        "p-4 xl:p-5",
      )}
    >
      <ProfileHeader profile={profile} />
      <div className="mb-2 flex justify-end">
        <VariantBadge variant={variant} />
      </div>
      <SidebarList
        items={items}
        active={active}
        variant={variant}
        onAccessibleClick={scrollToBlock}
        onLockedClick={scrollToCofre}
      />
    </nav>
  );
}

// ── Mobile bottom tabs + drawer ──────────────────────────────────────

export function ReportBlockTopTabs({ variant, features, profile }: SidebarProps) {
  const items = useMemo(() => buildSidebarItems(variant, features), [variant, features]);
  const accessible = items.filter((i) => i.access !== "locked");
  const accessibleIds = accessible.map((i) => i.block.id);
  const active = useActiveBlock(accessibleIds);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeIndex = useMemo(
    () => Math.max(0, accessible.findIndex((i) => i.block.id === active)),
    [accessible, active],
  );

  const visibleIndices = useMemo(() => {
    const max = Math.min(3, accessible.length);
    if (max <= 0) return [] as number[];
    const start = Math.max(0, Math.min(activeIndex - 1, accessible.length - max));
    return Array.from({ length: max }, (_, i) => start + i);
  }, [activeIndex, accessible.length]);

  return (
    <nav
      aria-label="Navegação do relatório"
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-white/95 supports-[backdrop-filter]:backdrop-blur-lg",
        "border-t border-border-default",
        "shadow-[0_-2px_12px_rgba(15,23,42,0.06)]",
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      <div className="flex w-full items-stretch">
        <div className="flex flex-1">
          {visibleIndices.map((idx) => {
            const item = accessible[idx];
            const isActive = item.block.id === active;
            const Icon = item.block.icon;
            return (
              <button
                key={item.block.id}
                type="button"
                onClick={() => scrollToBlock(item.block.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1",
                  "py-2.5 min-h-[64px] transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:bg-blue-50/60",
                  isActive ? "text-blue-600" : "text-content-tertiary active:text-content-secondary",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-b-full bg-blue-500 transition-all duration-300"
                  />
                )}
                <Icon
                  className={cn(
                    "size-7 transition-colors duration-200",
                    isActive ? "text-blue-600" : "text-content-tertiary",
                  )}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs leading-tight truncate max-w-full px-1",
                    isActive
                      ? "text-blue-600 font-semibold"
                      : "text-content-secondary font-medium",
                  )}
                >
                  {item.block.shortLabel}
                  {item.access === "partial" && item.partialBadge ? (
                    <span className="ml-1 text-accent-gold tabular-nums">
                      {item.partialBadge}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-px bg-border-default my-3" aria-hidden="true" />

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Menu de secções"
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "w-[72px] min-h-[64px] transition-colors duration-200",
                "text-content-tertiary active:text-content-secondary",
                "focus-visible:outline-none focus-visible:bg-blue-50/60",
              )}
            >
              <Menu className="size-7" strokeWidth={1.6} aria-hidden="true" />
              <span className="text-xs font-medium leading-tight text-content-secondary">
                Menu
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-3 max-h-[88vh] overflow-y-auto">
            <SheetHeader className="pb-3 border-b border-border-default">
              <SheetTitle className="text-base font-semibold text-content-primary text-left">
                Secções do relatório
              </SheetTitle>
            </SheetHeader>
            <div className="mt-3">
              <ProfileHeader profile={profile} />
              <div className="mb-2 flex justify-end">
                <VariantBadge variant={variant} />
              </div>
              <SidebarList
                items={items}
                active={active}
                variant={variant}
                onAccessibleClick={(id) => {
                  setSheetOpen(false);
                  setTimeout(() => scrollToBlock(id), 180);
                }}
                onLockedClick={() => {
                  setSheetOpen(false);
                  setTimeout(() => scrollToCofre(), 180);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}