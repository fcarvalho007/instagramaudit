import type { ReactNode } from "react";
import { Clock, ShieldCheck, Heart } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReportLockGateProps {
  unlocked: boolean;
  onUnlockClick: () => void;
  children: ReactNode;
  /** Instagram handle without leading @ — used in the editorial title. */
  handle: string;
  /** Optional id for scroll anchoring. */
  id?: string;
}

/**
 * Visual-only lock gate. When `unlocked` is false, renders `children`
 * with a heavy blur + frosted gradient and an overlaid CTA card inviting
 * the user to start the unlock flow. No backend, no persistence.
 *
 * Used in the public report (`/analyze/$username`) to gate content from
 * the "Taxa de Engagement" card onward.
 */
export function ReportLockGate({
  unlocked,
  onUnlockClick,
  children,
  handle,
  id,
}: ReportLockGateProps) {
  const { t } = useTranslation("gate");
  if (unlocked) return <>{children}</>;

  const cleanedHandle = handle.replace(/^@/, "");

  return (
    <div id={id} className="relative isolate">
      {/* Blurred content (kept in DOM for layout, hidden from a11y/focus) */}
      <div
        aria-hidden="true"
        // @ts-expect-error inert is a valid HTML attr but missing from React types in some setups
        inert=""
        className="select-none pointer-events-none"
        style={{
          filter: "blur(10px) saturate(0.85)",
          WebkitFilter: "blur(10px) saturate(0.85)",
        }}
      >
        {children}
      </div>

      {/* Top fade — easing the transition from clear → blurred */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-surface-base via-surface-base/70 to-transparent"
      />

      {/* CTA overlay */}
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div
          role="region"
          aria-label={t("lockGate.ariaRegion")}
          className={cn(
            "pointer-events-auto sticky self-start",
            "top-24 mt-24 md:mt-32",
            "w-[calc(100%-32px)] max-w-lg",
            "relative isolate",
            "rounded-2xl border border-border-default bg-surface-card/95 backdrop-blur-xl",
            "shadow-[0_24px_70px_-24px_rgba(15,23,42,0.28),inset_0_1px_0_0_rgba(255,255,255,0.7)]",
            "p-6 md:p-7",
            "animate-in fade-in slide-in-from-bottom-2 duration-500",
          )}
        >
          {/* Prismatic halo (decorative, behind the card) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-10 -z-10 overflow-hidden rounded-[2rem]"
          >
            <div className="absolute -top-10 -left-10 size-[320px] rounded-full blur-3xl opacity-60 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--accent-primary)_22%,transparent),transparent_70%)]" />
            <div className="absolute -bottom-12 -right-8 size-[280px] rounded-full blur-3xl opacity-50 bg-[radial-gradient(circle_at_70%_70%,color-mix(in_oklab,var(--accent-secondary)_20%,transparent),transparent_70%)]" />
          </div>

          {/* Prism chip — decorative glass motif */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 -right-3 size-14 rounded-2xl bg-prism-chip rotate-[12deg] shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--accent-primary)_40%,transparent)] ring-1 ring-white/60"
          />

          {/* Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full",
              "border border-emerald-200/60 bg-emerald-50 px-3 py-1",
              "text-[11px] font-semibold uppercase tracking-wide leading-none",
              "text-emerald-700",
            )}
          >
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {t("lockGate.badge")}
          </span>

          {/* Title */}
          <h2 className="mt-5 font-display text-[24px] md:text-[32px] leading-[1.1] tracking-[-0.01em] text-content-primary break-words [overflow-wrap:anywhere]">
            <Trans
              i18nKey="lockGate.title"
              ns="gate"
              values={{ handle: cleanedHandle }}
              components={{
                free: (
                  <span className="font-semibold text-content-primary underline decoration-2 underline-offset-4 decoration-accent-primary/70" />
                ),
                accent: (
                  <em className="not-italic font-display italic text-accent-primary inline-block max-w-full [overflow-wrap:anywhere] break-words" />
                ),
                br: <br />,
              }}
            />
          </h2>

          {/* Subtitle */}
          <p className="mt-3 text-[14px] md:text-[15px] leading-relaxed text-content-secondary">
            <Trans
              i18nKey="lockGate.subtitle"
              ns="gate"
              components={{
                strong: <strong className="font-semibold text-content-primary" />,
              }}
            />
          </p>

          {/* CTA */}
          <Button
            type="button"
            onClick={onUnlockClick}
            className={cn(
              "mt-6 w-full rounded-lg font-medium",
              "bg-gradient-to-r from-accent-primary to-secondary",
              "hover:opacity-95",
            )}
            size="lg"
          >
            {t("lockGate.cta")}
          </Button>

          {/* Footer micro-tags */}
          <div className="mt-5 pt-4 border-t border-border-default/40 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-content-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden /> {t("lockGate.footer.time")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden /> {t("lockGate.footer.gdpr")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="size-3.5" aria-hidden /> {t("lockGate.footer.made")}
            </span>
          </div>
        </div>
      </div>

      {import.meta.env.DEV ? <DevResetButton /> : null}
    </div>
  );
}

function DevResetButton() {
  const { t } = useTranslation("gate");
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.sessionStorage.removeItem("ib_unlock_preview");
        } catch {
          /* ignore */
        }
        window.location.reload();
      }}
      className="fixed bottom-4 right-4 z-50 rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-xs text-content-tertiary shadow-md hover:text-content-primary"
    >
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        {t("lockGate.devReset")}
      </span>
    </button>
  );
}