import { useState, useMemo, useEffect, useRef } from "react";
import { Menu, Lock, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { useBlocks, type BlockConfig } from "./block-config";
import { scrollToBlock, useActiveBlock } from "./use-active-block";
import { PremiumInterestDialog } from "./premium-interest-dialog";
import { useReportTracking } from "./report-tracking-context";
import { trackEvent } from "@/lib/tracking.functions";

// ── Types ────────────────────────────────────────────────────────────

type AccessState = "accessible" | "partial" | "locked";
type Group = "incluido" | "premium";
type AccessBadge = "free" | "launch" | "premium";

interface SidebarItem {
  block: BlockConfig;
  group: Group;
  access: AccessState;
  accessBadge: AccessBadge;
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

// ── Item builder ─────────────────────────────────────────────────────

function buildSidebarItems(
  blocks: readonly BlockConfig[],
  variant: ReportVariant,
  features: VariantFeatures,
): SidebarItem[] {
  return blocks.map((block) => {
    const accessBadge: AccessBadge =
      block.id === "overview"
        ? "free"
        : block.id === "diagnostico"
          ? "launch"
          : "premium";
    const fv = features[block.featureKey];
    if (variant === "internal_lab" || variant === "pro_preview") {
      return { block, group: "incluido", access: "accessible", accessBadge };
    }
    // public_mvp
    if (fv === "hidden") {
      return { block, group: "premium", access: "locked", accessBadge };
    }
    if (fv === "lightweight" || fv === "teaser") {
      return {
        block,
        group: "incluido",
        access: "partial",
        accessBadge,
      };
    }
    return { block, group: "incluido", access: "accessible", accessBadge };
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

function initialOf(handle: string) {
  return handle.replace(/^@/, "").charAt(0).toUpperCase() || "?";
}

function VariantBadge({ variant }: { variant: ReportVariant }) {
  const { t } = useTranslation("report");
  if (variant === "internal_lab") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-content-secondary border border-border-default">
        <span aria-hidden="true">✦</span>
        {t("nav.lab")}
      </span>
    );
  }
  if (variant === "pro_preview") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700 border border-blue-200">
        <span aria-hidden="true">✦</span>
        {t("nav.pro_active")}
      </span>
    );
  }
  return null;
}

function ProfileHeader({ profile }: { profile: SidebarProfile }) {
  const { t } = useTranslation("report");
  const handle = profile.handle.startsWith("@") ? profile.handle : `@${profile.handle}`;
  return (
    <div className="flex items-center gap-3 px-1 pb-3 mb-3 border-b border-border-default/60">
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/public/ig-thumb?url=${encodeURIComponent(profile.avatarUrl)}`}
          alt={t("nav.avatar_alt", { handle })}
          loading="eager"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
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
        <p className="truncate text-base font-display font-semibold text-content-primary">
          {handle}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ items }: { items: SidebarItem[] }) {
  const { t } = useTranslation("report");
  const accessible = items.filter((i) => i.access === "accessible").length;
  const partial = items.filter((i) => i.access === "partial").length;
  const locked = items.filter((i) => i.access === "locked").length;
  return (
    <div className="px-1 pt-3 pb-1">
      <div className="flex w-full gap-1" aria-hidden="true">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-sm",
              item.access === "accessible" && "bg-emerald-500",
              item.access === "partial" && "bg-signal-warning",
              item.access === "locked" && "bg-signal-warning/25",
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
        <span className="text-emerald-600">
          {t("nav.accessible", { count: accessible + partial })}
        </span>
        <span className="text-accent-gold">{t("nav.locked", { count: locked })}</span>
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
  const { t } = useTranslation("report");
  const isLocked = item.access === "locked";
  const badgeKey =
    item.accessBadge === "free"
      ? "nav.access.badge_free"
      : item.accessBadge === "launch"
        ? "nav.access.badge_launch"
        : "nav.access.badge_premium";
  const badgeLabel = t(badgeKey);
  const badgeClass =
    item.accessBadge === "free"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : item.accessBadge === "launch"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-surface-muted text-content-secondary ring-border-default";
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
          "font-display italic tabular-nums text-sm",
          isActive
            ? "text-blue-600"
            : isLocked
              ? "text-accent-gold/70"
              : "text-content-tertiary",
        )}
      >
        {item.block.number}
      </span>
      {isLocked ? (
        <Lock className="size-3.5 text-accent-gold" aria-hidden="true" />
      ) : null}
      <span
        className={cn(
          "text-sm truncate",
          isActive ? "font-semibold" : "font-medium",
          isLocked && "font-display italic text-accent-gold/90",
        )}
      >
        {item.block.shortLabel}
      </span>
      <span
        className={cn(
          "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1",
          badgeClass,
        )}
      >
        {badgeLabel}
      </span>
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
    <div className="flex items-center justify-between px-2 mb-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.12em]",
            variant === "incluido" ? "text-emerald-600" : "text-accent-gold",
          )}
        >
          <span aria-hidden="true" className="mr-1">
            {variant === "incluido" ? "•" : "✦"}
          </span>
          {label}
        </span>
      </div>
      <span className="text-xs tabular-nums text-content-tertiary">{count}</span>
    </div>
  );
}

function CofreCard() {
  const { t } = useTranslation("report");
  const { snapshotId, handle, variant } = useReportTracking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registered, setRegistered] = useState<Set<PricingOption>>(new Set());

  const openDialog = () => setDialogOpen(true);

  const handleUnlock = () => {
    trackEvent({
      data: {
        eventType: "unlock_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: { variant, source_component: "sidebar_cofre" },
      },
    }).catch(() => {});
    openDialog();
  };

  const handlePricing = (option: PricingOption) => {
    if (!registered.has(option)) {
      setRegistered((prev) => {
        const next = new Set(prev);
        next.add(option);
        return next;
      });
      trackEvent({
        data: {
          eventType: "pricing_option_clicked",
          snapshotId: snapshotId ?? undefined,
          handle: handle ?? undefined,
          metadata: {
            pricing_option: option,
            variant,
            source_component: "sidebar_cofre",
          },
        },
      }).catch(() => {});
    }
    openDialog();
  };

  return (
    <div
      id={COFRE_ANCHOR_ID}
      className="relative mt-4 overflow-hidden rounded-2xl bg-content-primary p-4 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.4)]"
    >
      {/* Glow radial subtil — âmbar + indigo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 100%, rgba(186,117,23,0.22) 0%, transparent 55%), radial-gradient(100% 70% at 0% 0%, rgba(118,100,228,0.18) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-amber-300">✦</span>
        <h3 className="text-sm font-semibold">{t("nav.cofre.title")}</h3>
      </div>
      <p className="mt-1 text-xs text-white/70">
        {t("nav.cofre.subtitle")}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handlePricing("single_report")}
          aria-pressed={registered.has("single_report")}
          className="relative text-left rounded-lg bg-white/5 p-2.5 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {registered.has("single_report") && (
            <Check
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-3 text-emerald-400"
            />
          )}
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">
            {t("nav.cofre.single_eyebrow")}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums">
            €3 <span className="text-[10px] font-medium text-white/60">{t("nav.cofre.vat")}</span>
          </p>
          <p className="mt-1 text-[10px] text-white/60 leading-tight">
            {t("nav.cofre.single_detail")}
          </p>
        </button>
        <button
          type="button"
          onClick={() => handlePricing("pack_5_reports")}
          aria-pressed={registered.has("pack_5_reports")}
          className="relative text-left rounded-lg bg-amber-500 p-2.5 text-content-primary ring-1 ring-amber-300/50 shadow-[0_8px_24px_-12px_rgba(186,117,23,0.6)] hover:bg-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full bg-content-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
            <Star className="size-2.5 fill-amber-300" aria-hidden="true" />
            {t("nav.cofre.save_badge")}
          </span>
          {registered.has("pack_5_reports") && (
            <Check
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-3 text-content-primary"
            />
          )}
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] opacity-80">
            {t("nav.cofre.bundle_eyebrow")}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums">
            €13 <span className="text-[10px] font-medium opacity-70">{t("nav.cofre.vat")}</span>
          </p>
          <p className="mt-1 text-[10px] opacity-80 leading-tight">
            {t("nav.cofre.bundle_detail")}
          </p>
        </button>
      </div>

      <button
        type="button"
        onClick={handleUnlock}
        aria-label={t("nav.cofre.unlock_aria")}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-content-primary hover:bg-white/90 transition-colors"
      >
        {t("nav.cofre.unlock")}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
      </div>
      <PremiumInterestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        snapshotId={snapshotId}
        handle={handle}
        variant={variant}
        sourceComponent="sidebar_cofre"
      />
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
  const { t } = useTranslation("report");
  const incluidos = items.filter((i) => i.group === "incluido");
  const premium = items.filter((i) => i.group === "premium");
  const isPublic = variant === "public_mvp";

  return (
    <div className="space-y-3">
      <section>
        <GroupHeader label={t("nav.included")} count={incluidos.length} variant="incluido" />
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
      </section>

      {premium.length > 0 && (
        <section className="rounded-xl border border-signal-warning/20 bg-signal-warning/[0.04] p-2">
          <GroupHeader label={t("nav.premium")} count={premium.length} variant="premium" />
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
        </section>
      )}

      {isPublic && <ProgressBar items={items} />}
      {isPublic && <CofreCard />}
    </div>
  );
}

// ── Desktop sidebar ──────────────────────────────────────────────────

export function ReportBlockSidebar({ variant, features, profile }: SidebarProps) {
  const { t } = useTranslation("report");
  const blocks = useBlocks();
  const partialLabel = t("nav.partial");
  const items = useMemo(
    () => buildSidebarItems(blocks, variant, features, partialLabel),
    [blocks, variant, features, partialLabel],
  );
  const accessibleIds = items.filter((i) => i.access !== "locked").map((i) => i.block.id);
  const active = useActiveBlock(accessibleIds);

  return (
    <nav
      aria-label={t("nav.aria")}
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
  const { t } = useTranslation("report");
  const blocks = useBlocks();
  const partialLabel = t("nav.partial");
  const items = useMemo(
    () => buildSidebarItems(blocks, variant, features, partialLabel),
    [blocks, variant, features, partialLabel],
  );
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

  // Auto-center the active tab inside the scrolling rail. Useful when the
  // visible window shifts as the user scrolls between blocks.
  const railRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const btn = rail.querySelector<HTMLElement>('button[aria-current="true"]');
    if (!btn) return;
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  return (
    <nav
      aria-label={t("nav.aria")}
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-white/95 supports-[backdrop-filter]:backdrop-blur-lg",
        "border-t border-border-default",
        "shadow-[0_-2px_12px_rgba(15,23,42,0.06)]",
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      <div className="flex w-full items-stretch">
        <div ref={railRef} className="flex flex-1">
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
              aria-label={t("nav.menu_aria")}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "w-[72px] min-h-[64px] transition-colors duration-200",
                "text-content-tertiary active:text-content-secondary",
                "focus-visible:outline-none focus-visible:bg-blue-50/60",
              )}
            >
              <Menu className="size-7" strokeWidth={1.6} aria-hidden="true" />
              <span className="text-xs font-medium leading-tight text-content-secondary">
                {t("nav.menu")}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-3 max-h-[88vh] overflow-y-auto">
            <SheetHeader className="pb-3 border-b border-border-default">
              <SheetTitle className="text-base font-semibold text-content-primary text-left">
                {t("nav.sections")}
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