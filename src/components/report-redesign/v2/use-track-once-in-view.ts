import { useEffect, useRef } from "react";

import {
  trackAnonymousEvent,
  type AnonymousFunnelEvent,
} from "@/lib/analytics/anonymous-funnel";

/**
 * Dispara `event` uma única vez, quando o elemento referenciado entra
 * no viewport. Deduplicado por montagem (ref guard) e delegado ao
 * `trackAnonymousEvent`, que já deduplica por sessão. No-op em SSR ou
 * quando `enabled` é falso.
 */
export function useTrackOnceInView<T extends HTMLElement>(
  event: AnonymousFunnelEvent,
  enabled: boolean,
  payload: { handle?: string; snapshotId?: string | null },
) {
  const ref = useRef<T | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (fired.current) return;
        fired.current = true;
        observer.disconnect();
        trackAnonymousEvent(event, {
          ...(payload.handle ? { handle: payload.handle } : {}),
          ...(payload.snapshotId ? { snapshotId: payload.snapshotId } : {}),
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, event, payload.handle, payload.snapshotId]);

  return ref;
}
