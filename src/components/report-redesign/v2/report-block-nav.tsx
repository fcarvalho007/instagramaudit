import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Menu, Lock, ArrowRight, Check, UserPlus, CheckCircle2, Calendar, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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
import {
  useBlocks,
  type BlockConfig,
  COMMERCIAL_SECTIONS,
  type CommercialSection,
} from "./block-config";
import { scrollToBlock, useActiveBlock } from "./use-active-block";
import { useReportTracking } from "./report-tracking-context";
import { usePremiumCta } from "./premium-cta-context";
import { trackEvent } from "@/lib/tracking.functions";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { useServerFn } from "@tanstack/react-start";
import { getMyCreditBalance } from "@/lib/credits/credits.functions";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import {
  ConsumeCreditDialog,
  type ConsumeCreditIntent,
} from "./consume-credit-dialog";

/**
 * Hook: returns true once the user has scrolled past `threshold` px.
 * Debounced via requestAnimationFrame to avoid re-render storms.
 * No-op on SSR.
 */
function useSidebarCompact(threshold = 220): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const next = window.scrollY > threshold;
      setCompact((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return compact;
}

// ── Types ────────────────────────────────────────────────────────────

type AccessState = "accessible" | "locked";
type Group = "incluido" | "premium";
type AccessBadge = "free" | "included" | "premium";

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
  profile?: SidebarProfile;
  profiles?: SidebarProfile[];
  /** When false in public_mvp, sidebar shows a soft "continue free" CTA
   *  instead of the pricing/access card. */
  unlocked?: boolean;
  /** True only when the user has paid Pro access. Commercial sidebar
   *  uses this to unlock items 03–07. Defaults to false. */
  premiumUnlocked?: boolean;
  /** Handler that opens the existing UnlockModal (lead-magnet flow). */
  onUnlockClick?: () => void;
  /** Free sample size used by the Explorar period chip. */
  sampleSize?: number;
  /** Number of days observed in the sample window. */
  observedDays?: number;
  /** Current competitor count for the Explorar section (Pro state). */
  competitorCount?: number;
  /** Max competitors allowed in Pro. Defaults to 3. */
  competitorMax?: number;
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
        : "premium";
    if (variant === "internal_lab" || variant === "pro_preview") {
      return { block, group: "incluido", access: "accessible", accessBadge };
    }
    // public_mvp: somente overview fica acessível na sidebar.
    // O corpo do relatório continua a respeitar features[block.featureKey].
    if (block.id === "overview") {
      return { block, group: "incluido", access: "accessible", accessBadge };
    }
    return { block, group: "premium", access: "locked", accessBadge };
  });
}

/**
 * Convert a CommercialSection into a SidebarItem reusing the existing
 * sidebar UI. The synthesized BlockConfig only fills fields actually
 * read by `ItemRow` (id, number, shortLabel, icon).
 */
function commercialToSidebarItem(
  s: CommercialSection,
  premiumUnlocked: boolean,
): SidebarItem {
  const accessBadge: AccessBadge = s.tier === "free" ? "free" : "premium";
  const access: AccessState =
    s.tier === "free" || premiumUnlocked ? "accessible" : "locked";
  // When Pro is unlocked, every section sits in the "available now" list.
  // Otherwise, premium-tier sections move into the locked Premium card.
  const group: Group =
    s.tier === "free" || premiumUnlocked ? "incluido" : "premium";
  const pseudoBlock = {
    id: s.id,
    number: s.number,
    shortLabel: s.shortLabel,
    question: "",
    subtitle: "",
    icon: s.icon,
    featureKey: "blockOverview",
    tier: s.tier,
  } as unknown as BlockConfig;
  return { block: pseudoBlock, group, access, accessBadge };
}

function buildCommercialSidebarItems(
  premiumUnlocked: boolean,
): SidebarItem[] {
  return COMMERCIAL_SECTIONS.map((s) =>
    commercialToSidebarItem(s, premiumUnlocked),
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function initialOf(handle: string) {
  return handle.replace(/^@/, "").charAt(0).toUpperCase() || "?";
}

function VariantBadge({ variant }: { variant: ReportVariant }) {
  const { t } = useTranslation("report");
  if (variant === "internal_lab") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-content-secondary border border-border-default">
        <span aria-hidden="true">✦</span>
        {t("nav.lab")}
      </span>
    );
  }
  if (variant === "pro_preview") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--accent-soft-pale))] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--accent-violet-deep))] border border-[rgb(var(--accent-soft))]">
        <span aria-hidden="true">✦</span>
        {t("nav.pro_active")}
      </span>
    );
  }
  return null;
}

function normalizeProfiles(
  profile?: SidebarProfile,
  profiles?: SidebarProfile[],
): SidebarProfile[] {
  if (profiles && profiles.length > 0) return profiles;
  if (profile) return [profile];
  return [];
}

function formatHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function ProfileAvatar({
  profile,
  size = "md",
  ringOffset = true,
}: {
  profile: SidebarProfile;
  size?: "md" | "sm";
  ringOffset?: boolean;
}) {
  const { t } = useTranslation("report");
  const handle = formatHandle(profile.handle);
  const sizeCls = size === "md" ? "size-10 text-sm" : "size-7 text-[11px]";
  const ringCls = ringOffset
    ? "ring-1 ring-border-default ring-offset-2 ring-offset-white"
    : "ring-2 ring-white";
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={t("nav.avatar_alt", { handle })}
        loading="eager"
        decoding="async"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className={cn("rounded-full object-cover", sizeCls, ringCls)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-full bg-[rgb(var(--accent-primary))] text-white font-semibold flex items-center justify-center",
        sizeCls,
        ringCls,
      )}
    >
      {initialOf(profile.handle)}
    </div>
  );
}

function ProfileHeader({
  profiles,
  paidStatus,
  compact = false,
}: {
  profiles: SidebarProfile[];
  paidStatus?: { totalSections: number } | null;
  compact?: boolean;
}) {
  const { t } = useTranslation("report");
  if (profiles.length === 0) return null;
  const isMulti = profiles.length > 1;
  const eyebrow = isMulti
    ? t("nav.eyebrow_multi", { count: profiles.length })
    : t("nav.eyebrow_single");
  const primary = profiles[0];
  const primaryHandle = formatHandle(primary.handle);
  return (
    <div
      className={cn(
        "px-1 transition-all duration-200",
        compact ? "pb-2 mb-2" : "pb-3 mb-3 border-b border-border-default/60",
      )}
    >
      <div className={cn("flex items-center", compact ? "gap-2" : "gap-3")}>
        {!isMulti && (
          <ProfileAvatar profile={primary} size={compact ? "sm" : "md"} />
        )}
        <div className="min-w-0 flex-1">
          {!compact && (
            <p className="text-eyebrow-sm text-content-tertiary mb-1">{eyebrow}</p>
          )}
          {isMulti ? (
            <div className="flex items-center">
              {profiles.map((p) => (
                <span
                  key={p.handle}
                  title={formatHandle(p.handle)}
                  aria-label={formatHandle(p.handle)}
                  className="-ml-2 first:ml-0 inline-flex"
                >
                  <ProfileAvatar profile={p} size="sm" ringOffset={false} />
                </span>
              ))}
            </div>
          ) : (
            <p
              className={cn(
                "truncate font-semibold text-content-primary",
                compact ? "text-sm" : "text-base",
              )}
            >
              {primaryHandle}
            </p>
          )}
        </div>
      </div>
      {paidStatus ? (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 font-medium text-emerald-700",
            compact ? "mt-1 text-[11px]" : "mt-2 text-xs",
          )}
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          {compact
            ? t("nav.status.header_paid_compact")
            : t("nav.status.header_paid", { count: paidStatus.totalSections })}
        </p>
      ) : null}
    </div>
  );
}

function ProgressSummary({ items }: { items: SidebarItem[] }) {
  const { t } = useTranslation("report");
  const accessible = items.filter((i) => i.access === "accessible").length;
  const total = items.length;
  return (
    <div className="px-1 pt-3 pb-1">
      <p className="mb-2 text-xs font-medium text-content-secondary">
        {t("nav.access.progress", { accessible, total })}
      </p>
      <div className="flex w-full gap-1" aria-hidden="true">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "h-[5px] flex-1 rounded-sm",
              item.accessBadge === "free" && "bg-emerald-500",
              item.accessBadge === "included" && "bg-[rgb(var(--accent-primary))]",
              item.access === "locked" && "bg-border-default",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  isActive,
  onClick,
  showBadge = true,
  compact = false,
}: {
  item: SidebarItem;
  isActive: boolean;
  onClick: () => void;
  showBadge?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation("report");
  const isFree = item.accessBadge === "free";
  const badgeLabel = isFree
    ? t("nav.access.badge_free")
    : t("nav.access.badge_premium");
  const badgeClass = isFree
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-surface-muted text-content-secondary ring-border-default";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group relative w-full flex items-center gap-3",
        "rounded-lg pl-3 pr-2.5 text-left",
        compact ? "py-1.5" : "py-2.5",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[rgb(var(--accent-primary))] focus-visible:ring-offset-1",
        "focus-visible:ring-offset-white",
        isActive
          ? "bg-surface-muted/70 text-content-primary"
          : "text-content-secondary hover:bg-surface-muted/70 hover:text-content-primary",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full transition-colors",
          isActive ? "bg-border-strong" : "bg-transparent group-hover:bg-border-default",
        )}
      />
      <span
        className={cn(
          "font-display italic tabular-nums text-sm",
          isActive ? "text-content-primary" : "text-content-tertiary",
        )}
      >
        {item.block.number}
      </span>
      <span
        className={cn(
          "text-sm truncate",
          isActive ? "font-semibold" : "font-medium",
        )}
      >
        {item.block.shortLabel}
      </span>
      {showBadge && !compact ? (
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ring-1",
            badgeClass,
          )}
        >
          {badgeLabel}
        </span>
      ) : null}
    </button>
  );
}

// ── Sidebar list (shared layout for desktop + mobile drawer) ─────────

function LockedItemRow({
  item,
  isActive,
  onClick,
  compact = false,
}: {
  item: SidebarItem;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation("report");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      aria-label={t("nav.access.cta_aria")}
      className={cn(
        "group relative w-full flex items-center gap-3",
        "rounded-lg pl-3 pr-2.5 text-left",
        compact ? "py-1.5" : "py-2.5",
        "transition-colors duration-150",
        isActive
          ? "bg-surface-muted/70 text-content-secondary"
          : "text-content-tertiary hover:bg-surface-muted/70 hover:text-content-secondary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-primary))] focus-visible:ring-offset-1 focus-visible:ring-offset-white",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full transition-colors",
          isActive ? "bg-border-strong" : "bg-transparent group-hover:bg-border-default",
        )}
      />
      <Lock
        className="size-3 text-content-tertiary"
        aria-hidden="true"
      />
      <span className={cn(
        "font-display italic tabular-nums text-sm",
        isActive ? "text-content-secondary" : "text-content-tertiary",
      )}>
        {item.block.number}
      </span>
      <span className={cn(
        "text-sm truncate",
        isActive ? "font-semibold" : "font-medium",
      )}>{item.block.shortLabel}</span>
    </button>
  );
}

const PREMIUM_WINDOWS = [30, 90] as const;

const DIAGNOSTIC_SECTION_ID = "diagnostico-editorial";

const DIAGNOSTIC_SUBITEMS = [
  { id: "diag-conteudo", key: "conteudo" },
  { id: "diag-funil", key: "funil" },
  { id: "diag-hashtags", key: "hashtags" },
  { id: "diag-legendas", key: "legendas" },
  { id: "diag-capas", key: "capas" },
  { id: "diag-audiencia", key: "audiencia" },
  { id: "diag-integracao", key: "integracao" },
] as const;

function DiagnosticSubList({
  activeSub,
  compact = false,
}: {
  activeSub: string | null;
  compact?: boolean;
}) {
  const { t } = useTranslation("report");
  if (compact) return null;
  return (
    <ul className="ml-7 mt-0.5 mb-1 space-y-0 border-l border-border-default/60 pl-3">
      {DIAGNOSTIC_SUBITEMS.map((s) => {
        const isActive = activeSub === s.id;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => scrollToBlock(s.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "w-full text-left py-1 text-[12px] transition-colors rounded-md px-1.5",
                isActive
                  ? "text-content-primary font-semibold"
                  : "text-content-tertiary hover:text-content-secondary",
              )}
            >
              {t(`nav.diagnostic_subitems.${s.key}`)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ExploreSection({
  premiumUnlocked,
  sampleSize,
  observedDays,
  competitorCount,
  competitorMax,
  compact = false,
  primaryHandle,
  existingCompetitors = [],
}: {
  premiumUnlocked: boolean;
  sampleSize: number;
  observedDays: number;
  competitorCount: number;
  competitorMax: number;
  compact?: boolean;
  primaryHandle?: string;
  existingCompetitors?: string[];
}) {
  const { t } = useTranslation("report");
  const { handlePremiumAccessClick } = usePremiumCta();
  const fetchBalance = useServerFn(getMyCreditBalance);
  const [balance, setBalance] = useState(0);
  const [intent, setIntent] = useState<ConsumeCreditIntent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Carrega o saldo de créditos beta apenas no estado paid — nunca antes
  // da compra, para nunca revelar o bónus ao utilizador free.
  useEffect(() => {
    if (!premiumUnlocked) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchBalance();
        if (!cancelled && r.hasLead) setBalance(r.balance);
      } catch {
        /* sem créditos visíveis em caso de falha */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [premiumUnlocked, fetchBalance]);

  const refreshBalance = useCallback(async () => {
    try {
      const r = await fetchBalance();
      if (r.hasLead) setBalance(r.balance);
    } catch {
      /* ignore */
    }
  }, [fetchBalance]);

  const openConsumeDialog = useCallback((nextIntent: ConsumeCreditIntent) => {
    setIntent(nextIntent);
    setErrorMessage(null);
    setDialogOpen(true);
    trackEvent({
      data: {
        eventType: "credit_consume_dialog_opened",
        metadata: {
          intent_kind: nextIntent.kind,
          intent_days:
            nextIntent.kind === "period" ? nextIntent.days : undefined,
          balance,
        },
      },
    }).catch(() => {});
  }, [balance]);

  const onConfirmConsume = useCallback(
    async (nextIntent: ConsumeCreditIntent) => {
      // Period: backend não suporta janela personalizada ainda — apenas
      // regista intenção (NÃO consome crédito) e fecha o dialog. UI já
      // mostra "em preparação".
      if (nextIntent.kind === "period") {
        trackEvent({
          data: {
            eventType: "beta_credit_intent_period",
            metadata: {
              action_type: "period_analysis",
              days: nextIntent.days,
            },
          },
        }).catch(() => {});
        setDialogOpen(false);
        return;
      }

      // Competitor: chama o endpoint existente, que reserva/confirma/
      // liberta o crédito server-side de forma atómica.
      const newHandle = nextIntent.handle?.trim().toLowerCase();
      if (!newHandle || !primaryHandle) {
        setErrorMessage(t("nav.explore.consume_dialog.error_generic"));
        return;
      }
      if (submitting) return;

      setSubmitting(true);
      setErrorMessage(null);

      trackEvent({
        data: {
          eventType: "beta_credit_intent_competitor",
          metadata: {
            action_type: "competitor_add",
            competitor_handle: newHandle,
            credit_amount: 1,
          },
        },
      }).catch(() => {});

      const competitorList = [...existingCompetitors, newHandle].slice(0, 2);

      try {
        const result = await fetchPublicAnalysis(primaryHandle, competitorList);

        if (result.success) {
          trackEvent({
            data: {
              eventType: "beta_credit_used_competitor",
              metadata: {
                action_type: "competitor_add",
                competitor_handle: newHandle,
                credit_amount: 1,
              },
            },
          }).catch(() => {});
          trackEvent({
            data: {
              eventType: "beta_credit_used",
              metadata: {
                action_type: "competitor_add",
                competitor_handle: newHandle,
                credit_amount: 1,
              },
            },
          }).catch(() => {});

          await refreshBalance();
          toast.success(t("nav.explore.consume_dialog.success_toast"));
          setDialogOpen(false);

          // Atualiza o URL com a nova lista; o route re-faz fetch
          // (servido do snapshot/cache, sem novo débito de crédito —
          // o endpoint deduplica por (lead_id, cache_key)).
          navigate({
            to: "/analyze/$username",
            params: { username: primaryHandle },
            search: { vs: competitorList.join(",") },
            replace: false,
          }).catch(() => {});
        } else {
          trackEvent({
            data: {
              eventType: "beta_credit_use_failed",
              metadata: {
                action_type: "competitor_add",
                competitor_handle: newHandle,
                error_code: result.error_code,
              },
            },
          }).catch(() => {});
          // O servidor já libertou a reserva — refresca o saldo para
          // reflectir o estado real.
          await refreshBalance();
          setErrorMessage(
            t("nav.explore.consume_dialog.error_generic_with_code", {
              code: result.error_code,
              defaultValue:
                result.message ?? t("nav.explore.consume_dialog.error_generic"),
            }),
          );
        }
      } catch (err) {
        trackEvent({
          data: {
            eventType: "beta_credit_use_failed",
            metadata: {
              action_type: "competitor_add",
              competitor_handle: newHandle,
              error_code: "NETWORK_ERROR",
            },
          },
        }).catch(() => {});
        await refreshBalance();
        setErrorMessage(t("nav.explore.consume_dialog.error_generic"));
      } finally {
        setSubmitting(false);
      }
    },
    [
      primaryHandle,
      existingCompetitors,
      submitting,
      navigate,
      refreshBalance,
      t,
    ],
  );

  const onPeriodLockedClick = (days: number) => {
    handlePremiumAccessClick("sidebar_period", {
      selected_window: `${days}d`,
    });
  };

  const onAddCompetitor = () => {
    if (premiumUnlocked) {
      openConsumeDialog({ kind: "competitor" });
      return;
    }
    handlePremiumAccessClick("sidebar_add_competitor");
  };

  const onPeriodPaidClick = (days: number) => {
    openConsumeDialog({ kind: "period", days });
  };

  // Compact layout: render "Período" and "Concorrente" as two small
  // buttons side-by-side. Period button opens the modal (free) or is a
  // UI-only placeholder (paid, same behaviour as the expanded chips).
  if (compact) {
    const onPeriodCompact = () => {
      if (premiumUnlocked) {
        // Sem dia específico no compact — abre o dialog genérico
        // (paid users escolhem a janela no relatório completo).
        openConsumeDialog({ kind: "period", days: 30 });
        return;
      }
      handlePremiumAccessClick("sidebar_period");
    };
    return (
      <section className="grid grid-cols-2 gap-1.5 px-1">
        <button
          type="button"
          onClick={onPeriodCompact}
          aria-label={t("nav.explore.period_label")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-8 rounded-md border text-[11px] font-medium transition-colors",
            "border-border-default bg-white text-content-secondary",
            "hover:border-border-strong hover:text-content-primary",
          )}
        >
          <Calendar className="size-3" aria-hidden="true" />
          <span>{t("nav.explore.period_label")}</span>
          {!premiumUnlocked && (
            <Lock className="size-2.5 text-content-tertiary" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onAddCompetitor}
          aria-label={t("nav.explore.add_competitor_aria")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-8 rounded-md border text-[11px] font-medium transition-colors",
            "border-border-default bg-white text-content-secondary",
            "hover:border-border-strong hover:text-content-primary",
          )}
        >
          <UserPlus className="size-3" aria-hidden="true" />
          <span>{t("nav.explore.add_competitor_short", { defaultValue: "Concorrente" })}</span>
          {!premiumUnlocked && (
            <Lock className="size-2.5 text-content-tertiary" aria-hidden="true" />
          )}
        </button>
        {premiumUnlocked ? (
          <ConsumeCreditDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            intent={intent}
            balance={balance}
            onConfirm={onConfirmConsume}
            submitting={submitting}
            errorMessage={errorMessage}
            primaryHandle={primaryHandle}
            existingCompetitors={existingCompetitors}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <p className="px-2 text-eyebrow-sm text-content-tertiary">
        {t("nav.explore.title")}
      </p>

      {/* Period */}
      <div className="px-2 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-content-secondary">
            {t("nav.explore.period_label")}
          </span>
          {!premiumUnlocked ? (
            <Lock className="size-3 text-content-tertiary" aria-hidden="true" />
          ) : observedDays > 0 ? (
            <span className="text-[11px] text-content-tertiary tabular-nums">
              {t("nav.explore.period_observed", { days: observedDays })}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
              "bg-content-primary text-white text-[11px] font-semibold",
            )}
            aria-current="true"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            {sampleSize > 0
              ? t("nav.explore.period_sample", { count: sampleSize })
              : "—"}
          </span>
          {PREMIUM_WINDOWS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() =>
                premiumUnlocked
                  ? onPeriodPaidClick(days)
                  : onPeriodLockedClick(days)
              }
              aria-disabled={premiumUnlocked ? undefined : "true"}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                "border border-border-default text-[11px] font-medium",
                "transition-colors duration-150",
                premiumUnlocked
                  ? "bg-white text-content-secondary hover:border-border-strong hover:text-content-primary cursor-pointer"
                  : "bg-surface-muted text-content-tertiary hover:bg-surface-base hover:border-border-strong hover:text-content-secondary",
              )}
              title={!premiumUnlocked ? t("nav.explore.period_locked_hint") : undefined}
            >
              {!premiumUnlocked && (
                <Lock className="size-2.5" aria-hidden="true" />
              )}
              {`${days}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Competitors */}
      <div className="px-2 space-y-1.5">
        <button
          type="button"
          onClick={onAddCompetitor}
          aria-label={t("nav.explore.add_competitor_aria")}
          className={cn(
            "inline-flex w-full items-center justify-center gap-1.5",
            "rounded-lg border border-dashed h-9 px-3",
            "text-xs font-medium transition-colors duration-150",
            premiumUnlocked
              ? "border-border-default bg-white text-content-secondary hover:border-border-strong hover:text-content-primary"
              : "border-border-default bg-surface-muted text-content-tertiary hover:border-border-strong hover:text-content-secondary",
          )}
          title={!premiumUnlocked ? t("nav.explore.competitors_locked_hint") : undefined}
        >
          {premiumUnlocked ? (
            <UserPlus className="size-3.5" aria-hidden="true" />
          ) : (
            <Lock className="size-3" aria-hidden="true" />
          )}
          <span>{t("nav.explore.add_competitor")}</span>
        </button>
        {premiumUnlocked ? (
          <p className="text-[11px] text-content-tertiary tabular-nums">
            {t("nav.explore.competitors_count", {
              count: competitorCount,
              max: competitorMax,
            })}
          </p>
        ) : null}
      </div>

      {premiumUnlocked ? (
        <div className="px-2">
          <p className="text-[11px] text-content-tertiary tabular-nums">
            {balance > 0
              ? t("nav.explore.beta_credits_available", { count: balance })
              : t("nav.explore.beta_credits_empty")}
          </p>
        </div>
      ) : null}

      {premiumUnlocked ? (
        <ConsumeCreditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          intent={intent}
          balance={balance}
          onConfirm={onConfirmConsume}
          submitting={submitting}
          errorMessage={errorMessage}
          primaryHandle={primaryHandle}
          existingCompetitors={existingCompetitors}
        />
      ) : null}
    </section>
  );
}

function UnlockPromoCard({
  premiumCount,
  onOpenDialog,
  compact = false,
}: {
  premiumCount: number;
  onOpenDialog: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation("report");
  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;
  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpenDialog}
        aria-label={t("nav.access.cta_aria")}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full",
          "bg-content-primary px-3 py-2 text-xs font-semibold text-white",
          "hover:bg-content-primary/90 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-primary))] focus-visible:ring-offset-1",
        )}
      >
        {t("nav.unlock.cta_compact", { price: priceLabel })}
        <ArrowRight className="size-3" aria-hidden="true" />
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-border-default bg-surface-muted/40 p-3 space-y-2.5">
      <button
        type="button"
        onClick={onOpenDialog}
        aria-label={t("nav.access.cta_aria")}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full",
          "bg-content-primary px-4 py-2.5 text-sm font-semibold text-white",
          "hover:bg-content-primary/90 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-primary))] focus-visible:ring-offset-1",
        )}
      >
        {t("nav.access.cta")}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
      <p className="text-center text-[11px] leading-relaxed text-content-tertiary">
        {t("nav.unlock.subcopy", { count: premiumCount })}
      </p>
    </div>
  );
}

function SidebarList({
  items,
  active,
  variant,
  onAccessibleClick,
  unlocked = true,
  onUnlockClick,
  premiumUnlocked = false,
  sampleSize = 0,
  observedDays = 0,
  competitorCount = 0,
  competitorMax = 3,
  compact = false,
  primaryHandle,
  existingCompetitors = [],
}: {
  items: SidebarItem[];
  active: string | null;
  variant: ReportVariant;
  onAccessibleClick: (id: string) => void;
  unlocked?: boolean;
  onUnlockClick?: () => void;
  premiumUnlocked?: boolean;
  sampleSize?: number;
  observedDays?: number;
  competitorCount?: number;
  competitorMax?: number;
  compact?: boolean;
  primaryHandle?: string;
  existingCompetitors?: string[];
}) {
  const { t } = useTranslation("report");
  const { snapshotId, handle, variant: trackingVariant } = useReportTracking();
  const { handlePremiumAccessClick } = usePremiumCta();
  const incluidos = items.filter((i) => i.group === "incluido");
  const premium = items.filter((i) => i.group === "premium");
  // The grouped Free / Premium layout is the commercial sidebar shape.
  // Only the internal lab variant gets the flat 6-block lab list.
  const isCommercial = variant !== "internal_lab";

  // Diagnostic sub-items scroll-spy (paid state only — runs harmless in free).
  const activeSub = useActiveBlock(
    DIAGNOSTIC_SUBITEMS.map((s) => s.id) as unknown as string[],
  );
  const [diagExpanded, setDiagExpanded] = useState(false);
  useEffect(() => {
    if (active === DIAGNOSTIC_SECTION_ID) setDiagExpanded(true);
  }, [active]);

  const openDialog = () => {
    handlePremiumAccessClick("sidebar_main_cta");
  };

  const focusLeadMagnet = () => {
    // Lead-capture flow (NOT premium). Keep `unlock_clicked` for
    // backwards-compat with existing funnel dashboards.
    trackEvent({
      data: {
        eventType: "unlock_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          variant: trackingVariant,
          source_component: "sidebar_continue_free",
        },
      },
    }).catch(() => {});
    if (typeof document === "undefined") return;
    const el = document.getElementById("lead-magnet-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      onUnlockClick?.();
    }
  };

  if (!isCommercial) {
    return (
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.block.id}>
            <ItemRow
              item={item}
              isActive={item.block.id === active}
              onClick={() => onAccessibleClick(item.block.id)}
              compact={compact}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn("transition-all duration-200", compact ? "space-y-2" : "space-y-4")}>
      {!premiumUnlocked && !compact && <ProgressSummary items={items} />}

      {premiumUnlocked ? (
        <section className={cn(compact ? "space-y-0.5" : "space-y-1")}>
          {!compact && (
            <p className="px-2 text-eyebrow-sm text-content-tertiary">
              {t("nav.access.section_paid")}
            </p>
          )}
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isDiag = item.block.id === DIAGNOSTIC_SECTION_ID;
              const showSubs = !compact && isDiag && diagExpanded;
              return (
                <li key={item.block.id}>
                  <div className="relative">
                    <ItemRow
                      item={item}
                      isActive={item.block.id === active}
                      onClick={() => onAccessibleClick(item.block.id)}
                      showBadge={false}
                      compact={compact}
                    />
                    {isDiag && !compact && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDiagExpanded((v) => !v);
                        }}
                        aria-label={t("nav.diagnostic_subitems.toggle_aria")}
                        aria-expanded={diagExpanded}
                        className={cn(
                          "absolute right-1 top-1/2 -translate-y-1/2",
                          "inline-flex size-6 items-center justify-center rounded-md",
                          "text-content-tertiary hover:bg-surface-muted hover:text-content-secondary",
                          "transition-colors",
                        )}
                      >
                        <ChevronDown
                          className={cn(
                            "size-3.5 transition-transform",
                            diagExpanded ? "rotate-180" : "rotate-0",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                  {showSubs && <DiagnosticSubList activeSub={activeSub} />}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <>
          <section className={cn(compact ? "space-y-0.5" : "space-y-1")}>
            {!compact && (
              <p className="px-2 text-eyebrow-sm text-content-tertiary">
                {t("nav.access.section_free")}
              </p>
            )}
            <ul className="space-y-0.5">
              {incluidos.map((item) => (
                <li key={item.block.id}>
                  <ItemRow
                    item={item}
                    isActive={item.block.id === active}
                    onClick={() => onAccessibleClick(item.block.id)}
                    compact={compact}
                  />
                </li>
              ))}
            </ul>
          </section>

          {premium.length > 0 && (
            <section className={cn(compact ? "space-y-0.5" : "space-y-1")}>
              {!compact && (
                <p className="px-2 text-eyebrow-sm text-content-tertiary">
                  {t("nav.access.section_premium")}
                </p>
              )}
              <ul className="space-y-0.5">
                {premium.map((item) => {
                  const isDiag = item.block.id === DIAGNOSTIC_SECTION_ID;
                  return (
                    <li key={item.block.id}>
                      <LockedItemRow
                        item={item}
                        isActive={item.block.id === active}
                        onClick={() => {
                          // First scroll the user to the matching teaser
                          // card so they see what's locked, then open the
                          // existing premium dialog after the scroll lands.
                          scrollToBlock(item.block.id);
                          window.setTimeout(() => {
                            handlePremiumAccessClick("sidebar_section", {
                              block_id: item.block.id,
                            });
                          }, 350);
                        }}
                        compact={compact}
                      />
                      {isDiag && !compact && (
                        <p className="pl-9 pr-3 pb-1 -mt-0.5 text-[11px] text-content-tertiary">
                          {t("nav.diagnostic_subitems.note")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <ExploreSection
        premiumUnlocked={premiumUnlocked}
        sampleSize={sampleSize}
        observedDays={observedDays}
        competitorCount={competitorCount}
        competitorMax={competitorMax}
        compact={compact}
        primaryHandle={primaryHandle}
        existingCompetitors={existingCompetitors}
      />

      {!premiumUnlocked && (
        unlocked ? (
          <UnlockPromoCard premiumCount={premium.length} onOpenDialog={openDialog} compact={compact} />
        ) : (
          <UnlockPromoCard premiumCount={premium.length} onOpenDialog={focusLeadMagnet} compact={compact} />
        )
      )}
    </div>
  );
}

// ── Desktop sidebar ──────────────────────────────────────────────────

export function ReportBlockSidebar({
  variant,
  features,
  profile,
  profiles,
  unlocked,
  premiumUnlocked = false,
  onUnlockClick,
  sampleSize = 0,
  observedDays = 0,
  competitorCount = 0,
  competitorMax = 3,
}: SidebarProps) {
  const { t } = useTranslation("report");
  const blocks = useBlocks();
  const profileList = useMemo(
    () => normalizeProfiles(profile, profiles),
    [profile, profiles],
  );
  const items = useMemo(
    () =>
      variant === "internal_lab"
        ? buildSidebarItems(blocks, variant, features)
        : buildCommercialSidebarItems(premiumUnlocked),
    [blocks, variant, features, premiumUnlocked],
  );
  // Scroll-spy across ALL sections — locked teaser cards still own a
  // matching DOM anchor (`#frequencia`, `#publicacoes-chave`, …), so they
  // light up as the reader scrolls past their teaser.
  const allIds = useMemo(() => items.map((i) => i.block.id), [items]);
  const active = useActiveBlock(allIds);
  const compact = useSidebarCompact();
  const isCommercial = variant !== "internal_lab";
  const paidStatus = isCommercial && premiumUnlocked
    ? { totalSections: items.length }
    : null;

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
        "transition-all duration-200",
        compact ? "p-3" : "p-4 xl:p-5",
      )}
    >
      <ProfileHeader profiles={profileList} paidStatus={paidStatus} compact={compact} />
      {!compact && (
        <div className="mb-2 flex justify-end">
          <VariantBadge variant={variant} />
        </div>
      )}
      <SidebarList
        items={items}
        active={active}
        variant={variant}
        onAccessibleClick={scrollToBlock}
        unlocked={unlocked}
        onUnlockClick={onUnlockClick}
        premiumUnlocked={premiumUnlocked}
        sampleSize={sampleSize}
        observedDays={observedDays}
        competitorCount={competitorCount}
        competitorMax={competitorMax}
        compact={compact}
        primaryHandle={profileList[0]?.handle}
        existingCompetitors={profileList.slice(1).map((p) => p.handle)}
      />
    </nav>
  );
}

// ── Mobile bottom tabs + drawer ──────────────────────────────────────

export function ReportBlockTopTabs({
  variant,
  features,
  profile,
  profiles,
  unlocked,
  premiumUnlocked = false,
  onUnlockClick,
  sampleSize = 0,
  observedDays = 0,
  competitorCount = 0,
  competitorMax = 3,
}: SidebarProps) {
  const { t } = useTranslation("report");
  const blocks = useBlocks();
  const profileList = useMemo(
    () => normalizeProfiles(profile, profiles),
    [profile, profiles],
  );
  const items = useMemo(
    () =>
      variant === "internal_lab"
        ? buildSidebarItems(blocks, variant, features)
        : buildCommercialSidebarItems(premiumUnlocked),
    [blocks, variant, features, premiumUnlocked],
  );
  const accessible = items.filter((i) => i.access !== "locked");
  const accessibleIds = accessible.map((i) => i.block.id);
  const active = useActiveBlock(accessibleIds);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isCommercial = variant !== "internal_lab";
  const paidStatus = isCommercial && premiumUnlocked
    ? { totalSections: items.length }
    : null;

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
                  "focus-visible:outline-none focus-visible:bg-[rgb(var(--accent-soft-pale))]/60",
                  isActive ? "text-[rgb(var(--accent-primary))]" : "text-content-tertiary active:text-content-secondary",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-b-full bg-[rgb(var(--accent-primary))] transition-all duration-300"
                  />
                )}
                <Icon
                  className={cn(
                    "size-7 transition-colors duration-200",
                    isActive ? "text-[rgb(var(--accent-primary))]" : "text-content-tertiary",
                  )}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs leading-tight truncate max-w-full px-1",
                    isActive
                      ? "text-[rgb(var(--accent-primary))] font-semibold"
                      : "text-content-secondary font-medium",
                  )}
                >
                  {item.block.shortLabel}
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
                "focus-visible:outline-none focus-visible:bg-[rgb(var(--accent-soft-pale))]/60",
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
              <ProfileHeader profiles={profileList} paidStatus={paidStatus} />
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
                unlocked={unlocked}
                onUnlockClick={() => {
                  setSheetOpen(false);
                  setTimeout(() => onUnlockClick?.(), 180);
                }}
                premiumUnlocked={premiumUnlocked}
                sampleSize={sampleSize}
                observedDays={observedDays}
                competitorCount={competitorCount}
                competitorMax={competitorMax}
                primaryHandle={profileList[0]?.handle}
                existingCompetitors={profileList.slice(1).map((p) => p.handle)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}