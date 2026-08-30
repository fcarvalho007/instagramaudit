/**
 * Ronda 3 — cliente de tracking do funil anónimo.
 *
 * Fire-and-forget para `/api/public/funnel-event`. Nunca lança, nunca
 * bloqueia a navegação e faz dedupe por chave (memória + sessionStorage)
 * para eventos que só devem disparar uma vez por sessão/snapshot.
 */

export type AnonymousFunnelEvent =
  | "landing_view"
  | "instagram_handle_submitted"
  | "anonymous_analysis_started"
  | "anonymous_analysis_success"
  | "anonymous_analysis_failed"
  | "instant_audit_viewed"
  | "instant_audit_scroll_25"
  | "instant_audit_scroll_50"
  | "instant_audit_scroll_75"
  | "instant_audit_scroll_100"
  | "save_audit_cta_viewed"
  | "save_audit_cta_clicked"
  | "level2_cta_viewed"
  | "level2_cta_clicked"
  | "lead_cta_viewed"
  | "lead_cta_clicked"
  | "lead_capture_opened"
  | "email_field_started"
  | "email_submitted"
  | "email_validation_failed"
  | "lead_created"
  | "existing_lead_detected"
  | "snapshot_claimed"
  | "level2_unlock_started"
  | "relationship_question_viewed"
  | "relationship_answered"
  | "relationship_skipped"
  | "comment_intelligence_started"
  | "comment_intelligence_success"
  | "comment_intelligence_failed";

interface TrackOptions {
  handle?: string;
  snapshotId?: string;
  metadata?: Record<string, unknown>;
  /** Chave de dedupe; quando presente, o evento dispara uma única vez. */
  dedupeKey?: string;
}

const SENT = new Set<string>();
const STORAGE_KEY = "ib:funnel_events_sent";

function alreadySent(key: string): boolean {
  if (SENT.has(key)) return true;
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(list) && list.includes(key)) {
      SENT.add(key);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function markSent(key: string): void {
  SENT.add(key);
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const list = Array.isArray(parsed) ? (parsed as string[]) : [];
    if (!list.includes(key)) {
      list.push(key);
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list.slice(-200)),
      );
    }
  } catch {
    /* ignore */
  }
}

export function trackAnonymousEvent(
  event: AnonymousFunnelEvent,
  options: TrackOptions = {},
): void {
  if (typeof window === "undefined") return;

  const key = options.dedupeKey ?? null;
  if (key) {
    const full = `${event}:${key}`;
    if (alreadySent(full)) return;
    markSent(full);
  }

  try {
    void fetch("/api/public/funnel-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_type: event,
        handle: options.handle,
        snapshot_id: options.snapshotId,
        metadata: options.metadata,
      }),
    }).catch(() => {
      /* fire-and-forget */
    });
  } catch {
    /* ignore */
  }
}

/**
 * Dispara marcos de scroll (25/50/75/100%) uma única vez por snapshot.
 * Devolve uma função de limpeza.
 */
export function observeScrollMilestones(opts: {
  handle: string;
  snapshotId: string;
}): () => void {
  if (typeof window === "undefined") return () => {};
  const milestones: Array<[number, AnonymousFunnelEvent]> = [
    [25, "instant_audit_scroll_25"],
    [50, "instant_audit_scroll_50"],
    [75, "instant_audit_scroll_75"],
    [100, "instant_audit_scroll_100"],
  ];
  const fired = new Set<number>();

  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const pct = max > 0 ? ((window.scrollY / max) * 100) : 100;
    for (const [threshold, event] of milestones) {
      if (pct >= threshold - 0.5 && !fired.has(threshold)) {
        fired.add(threshold);
        trackAnonymousEvent(event, {
          handle: opts.handle,
          snapshotId: opts.snapshotId,
          dedupeKey: opts.snapshotId,
        });
      }
    }
    if (fired.size === milestones.length) {
      window.removeEventListener("scroll", onScroll);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  return () => window.removeEventListener("scroll", onScroll);
}
