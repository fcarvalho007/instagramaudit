import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { trackEvent } from "@/lib/tracking.functions";

import { PremiumInterestDialog } from "./premium-interest-dialog";
import { scrollToBlock } from "./use-active-block";

/**
 * Logical source identifiers for every premium CTA inside the public
 * report. New entry points MUST extend this union — never pass an
 * arbitrary string — so the tracking funnel stays consistent.
 */
export type PremiumCtaSource =
  | "sidebar"
  | "sidebar_section"
  | "sidebar_period"
  | "sidebar_add_competitor"
  | "analysis_period_selector"
  | "lock_gate"
  | "sticky_unlock_bar"
  | "premium_section"
  | "overview_pro_teaser";

interface PremiumCtaExtra {
  /** Period chip the user was looking at when they clicked, e.g. "30d". */
  selected_window?: string;
  /** Free-form extra metadata for niche callers (e.g. variant copy). */
  [key: string]: unknown;
}

export interface PremiumCtaContextValue {
  /** True only when the user has paid/premium access. */
  premiumUnlocked: boolean;
  /**
   * Opens the unified premium access modal and dispatches
   * `premium_cta_clicked`. Fire-and-forget — never awaits, never throws.
   * When `premiumUnlocked` is true, scrolls to the first premium block
   * instead of opening the modal (the CTA shouldn't even be visible in
   * that case; this is a defensive no-op).
   */
  handlePremiumAccessClick: (
    source: PremiumCtaSource,
    extra?: PremiumCtaExtra,
  ) => void;
  /**
   * Dispatches `premium_window_interest` when the user opens a locked
   * window popover in the analysis-period selector. Does NOT open the
   * modal.
   */
  trackPremiumWindowInterest: (windowDays: number) => void;
}

const PremiumCtaContext = createContext<PremiumCtaContextValue | null>(null);

interface ProviderProps {
  snapshotId: string | null;
  handle: string | null;
  variant: string;
  premiumUnlocked: boolean;
  children: ReactNode;
}

/**
 * Wraps the public report tree with a single source of truth for the
 * "Desbloquear relatório completo" flow. All premium CTAs (sidebar,
 * sticky bar, period selector, callouts, end-of-free, post comparison)
 * call `handlePremiumAccessClick(source)` and the provider takes care
 * of opening **one** `PremiumInterestDialog` instance plus tracking.
 *
 * The provider intentionally does NOT touch the lead-capture flow
 * (`UnlockModal` / `ReportLockGate`). Those keep their own handler in
 * the route — the premium dialog is reserved for users that already
 * captured (or for the snapshot-public route where no lead exists yet).
 */
export function PremiumCtaProvider({
  snapshotId,
  handle,
  variant,
  premiumUnlocked,
  children,
}: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<PremiumCtaSource>("sidebar");

  const handlePremiumAccessClick = useCallback<
    PremiumCtaContextValue["handlePremiumAccessClick"]
  >(
    (nextSource, extra) => {
      // Fire-and-forget tracking; never block the UI.
      trackEvent({
        data: {
          eventType: "premium_cta_clicked",
          snapshotId: snapshotId ?? undefined,
          handle: handle ?? undefined,
          metadata: {
            variant,
            source_component: nextSource,
            ...(extra ?? {}),
          },
        },
      }).catch(() => {});

      if (premiumUnlocked) {
        // Defensive no-op + soft scroll to the first premium block.
        // CTAs should be hidden in this case, but if one slips through
        // we don't want to re-open a pricing dialog to a paid user.
        if (typeof window !== "undefined") {
          window.setTimeout(() => scrollToBlock("compare"), 0);
        }
        return;
      }

      setSource(nextSource);
      setOpen(true);
    },
    [snapshotId, handle, variant, premiumUnlocked],
  );

  const trackPremiumWindowInterest = useCallback(
    (windowDays: number) => {
      trackEvent({
        data: {
          eventType: "premium_window_interest",
          snapshotId: snapshotId ?? undefined,
          handle: handle ?? undefined,
          metadata: {
            variant,
            selected_window: `${windowDays}d`,
          },
        },
      }).catch(() => {});
    },
    [snapshotId, handle, variant],
  );

  const value = useMemo<PremiumCtaContextValue>(
    () => ({
      premiumUnlocked,
      handlePremiumAccessClick,
      trackPremiumWindowInterest,
    }),
    [premiumUnlocked, handlePremiumAccessClick, trackPremiumWindowInterest],
  );

  return (
    <PremiumCtaContext.Provider value={value}>
      {children}
      <PremiumInterestDialog
        open={open}
        onOpenChange={setOpen}
        snapshotId={snapshotId}
        handle={handle}
        variant={variant}
        sourceComponent={source}
      />
    </PremiumCtaContext.Provider>
  );
}

/**
 * Consumes the premium CTA context. Throws when used outside the
 * provider so misuse fails loudly during development instead of
 * silently no-op'ing in production.
 */
export function usePremiumCta(): PremiumCtaContextValue {
  const ctx = useContext(PremiumCtaContext);
  if (!ctx) {
    throw new Error(
      "usePremiumCta must be used inside a <PremiumCtaProvider>.",
    );
  }
  return ctx;
}