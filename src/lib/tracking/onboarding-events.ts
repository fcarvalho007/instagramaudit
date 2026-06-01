/**
 * Pequeno helper para registar eventos do funil de onboarding.
 *
 * - Usa `navigator.sendBeacon` em `abandon` (sobrevive a unload/navigate).
 * - Resto vai via `fetch` keepalive.
 * - Falhas silenciosas (tracking nunca bloqueia UX).
 */

export type OnboardingEventType =
  | "onboarding_step_view"
  | "onboarding_step_complete"
  | "onboarding_abandon"
  | "onboarding_success";

export interface OnboardingEventPayload {
  event_type: OnboardingEventType;
  step: 0 | 1 | 2 | 3;
  handle?: string;
  marketing_consent?: boolean;
}

const ENDPOINT = "/api/public/onboarding-event";

export function trackOnboardingEvent(payload: OnboardingEventPayload): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify(payload);
    if (
      payload.event_type === "onboarding_abandon" &&
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // intentionally swallow
  }
}