import { useEffect, useState } from "react";

import type { PricingFeedbackTrigger } from "@/lib/pricing-feedback";
import { trackEvent } from "@/lib/tracking.functions";

const PDF_EVENT = "ib:pdf-export";
const SCROLL_THRESHOLD = 0.7;
const TIMER_MS = 90_000;

function storageKey(snapshotId: string) {
  return `ib_pricing_asked:${snapshotId}`;
}

function alreadyAsked(snapshotId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(snapshotId)) === "1";
  } catch {
    return false;
  }
}

function markAsked(snapshotId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(snapshotId), "1");
  } catch {
    /* ignore */
  }
}

export interface UsePricingFeedbackTriggerArgs {
  enabled: boolean;
  snapshotId: string | null | undefined;
}

export interface UsePricingFeedbackTriggerResult {
  open: boolean;
  trigger: PricingFeedbackTrigger | null;
  /** Close & permanently mark this snapshot as asked. */
  dismiss: () => void;
}

/**
 * Opens the pricing-feedback sheet on the FIRST of:
 *  - 70% scroll depth
 *  - PDF export (CustomEvent "ib:pdf-export")
 *  - 90 seconds after `enabled` flips true
 *
 * Idempotent per snapshot via localStorage. Once asked (even if dismissed
 * without answering), never reopens for the same snapshot.
 */
export function usePricingFeedbackTrigger({
  enabled,
  snapshotId,
}: UsePricingFeedbackTriggerArgs): UsePricingFeedbackTriggerResult {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<PricingFeedbackTrigger | null>(null);

  useEffect(() => {
    if (!enabled || !snapshotId) return;
    if (alreadyAsked(snapshotId)) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let scrollRaf: number | null = null;

    const fire = (t: PricingFeedbackTrigger) => {
      if (cancelled) return;
      cancelled = true;
      markAsked(snapshotId);
      setTrigger(t);
      setOpen(true);
      try {
        void trackEvent({
          data: {
            eventType: "pricing_feedback_shown",
            snapshotId,
            metadata: { trigger: t },
          },
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    };

    const onScroll = () => {
      if (scrollRaf !== null) return;
      scrollRaf = window.requestAnimationFrame(() => {
        scrollRaf = null;
        const doc = document.documentElement;
        const total = doc.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        const pct = (window.scrollY + window.innerHeight) / doc.scrollHeight;
        if (pct >= SCROLL_THRESHOLD) fire("scroll");
      });
    };

    const onPdf = () => fire("pdf");

    const timer = window.setTimeout(() => fire("timer"), TIMER_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(PDF_EVENT, onPdf as EventListener);

    // Run once on mount in case the page is already scrolled past 70%
    onScroll();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(PDF_EVENT, onPdf as EventListener);
      if (scrollRaf !== null) window.cancelAnimationFrame(scrollRaf);
    };
  }, [enabled, snapshotId]);

  return {
    open,
    trigger,
    dismiss: () => {
      if (snapshotId) markAsked(snapshotId);
      setOpen(false);
    },
  };
}

export const PRICING_PDF_EVENT = PDF_EVENT;