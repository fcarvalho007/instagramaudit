import { useState } from "react";
import { Check, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompareHandleSide {
  handle: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  /** Optional display name shown under the handle pill in `lg` size. */
  displayName?: string | null;
}

interface Props {
  primary: CompareHandleSide;
  competitor: CompareHandleSide;
  /**
   * - "sm" (default): compact pills, 24 px avatar. Used inside compare cards.
   * - "lg": large pills with 64–80 px avatars + display name. Used by the
   *   top-level Comparison Hero.
   */
  size?: "sm" | "lg";
  /**
   * Visual prominence override for the `sm` size. "strong" raises the
   * pill text and avatar — used by the Phase 2 hero compare cards
   * (Format Mix / Weekday Rhythm) so their identity row reads louder
   * than the standard compare cards.
   */
  prominence?: "default" | "strong";
  className?: string;
}

/**
 * Shared identity row used by every compare card and by the Comparison
 * Hero. Renders two side-by-side handle pills — primary in
 * `accent-primary`, competitor in `compare-competitor` — with optional
 * avatar + verified check. Guarantees left/right ownership reads the same
 * across the whole "comparison mode".
 */
export function CompareHandleRow({
  primary,
  competitor,
  size = "sm",
  prominence = "strong",
  className,
}: Props) {
  if (size === "lg") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-8",
          className,
        )}
      >
        <LargeIdentity side="primary" data={primary} />
        <VsDivider />
        <LargeIdentity side="competitor" data={competitor} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 sm:gap-3",
        className,
      )}
    >
      <Pill side="primary" data={primary} prominence={prominence} />
      <span
        aria-hidden="true"
        className="font-serif text-xl sm:text-2xl text-content-tertiary tracking-tight"
      >
        vs
      </span>
      <Pill side="competitor" data={competitor} prominence={prominence} />
    </div>
  );
}

// ─── Small pill ────────────────────────────────────────────────────

function Pill({
  side,
  data,
  prominence,
}: {
  side: "primary" | "competitor";
  data: CompareHandleSide;
  prominence: "default" | "strong";
}) {
  const accent =
    side === "primary"
      ? "border-accent-primary/30 bg-accent-primary/8 text-accent-primary"
      : "border-compare-competitor/30 bg-compare-competitor/8 text-compare-competitor";
  const strong = prominence === "strong";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold min-w-0",
        strong
          ? "gap-2.5 px-3.5 py-2 text-sm sm:text-base"
          : "gap-2 px-3 py-1.5 text-sm",
        accent,
      )}
    >
      <Avatar
        avatarUrl={data.avatarUrl ?? null}
        name={data.handle}
        verified={Boolean(data.isVerified)}
        side={side}
        sizeClass={strong ? "size-9" : "size-7"}
        showRing={false}
        verifiedSizeClass="size-3.5"
        verifiedIconClass="size-2.5"
      />
      <span className="truncate max-w-[16rem]">
        @{data.handle}
      </span>
    </span>
  );
}

// ─── Large identity (hero) ─────────────────────────────────────────

function LargeIdentity({
  side,
  data,
}: {
  side: "primary" | "competitor";
  data: CompareHandleSide;
}) {
  const accentText =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  const eyebrow = side === "primary" ? "Perfil" : "Concorrente";
  return (
    <div className="flex flex-col items-center md:items-start gap-3 min-w-0">
      <span className={cn("text-eyebrow-sm", accentText)}>{eyebrow}</span>
      <div className="flex items-center gap-4 min-w-0">
        <Avatar
          avatarUrl={data.avatarUrl ?? null}
          name={data.displayName || data.handle}
          verified={Boolean(data.isVerified)}
          side={side}
          sizeClass="size-16 sm:size-20"
          showRing={true}
          verifiedSizeClass="size-5"
          verifiedIconClass="size-3"
        />
        <div className="min-w-0">
          <p className="font-sans text-base sm:text-lg font-semibold text-content-primary truncate">
            @{data.handle}
          </p>
          {data.displayName ? (
            <p className="font-display text-lg sm:text-xl text-content-secondary tracking-tight truncate">
              {data.displayName}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VsDivider() {
  return (
    <div className="relative flex items-center justify-center md:px-4">
      <span
        aria-hidden="true"
        className="hidden md:block absolute inset-x-0 top-1/2 h-px bg-border-default/60"
      />
      <span className="relative font-display text-3xl sm:text-4xl md:text-5xl font-medium text-content-tertiary bg-white px-3 md:px-4 tracking-tight">
        vs
      </span>
    </div>
  );
}

// ─── Shared avatar ─────────────────────────────────────────────────

export function CompareAvatar(props: {
  avatarUrl: string | null;
  name: string;
  verified?: boolean;
  side: "primary" | "competitor";
  sizeClass?: string;
  showRing?: boolean;
}) {
  return (
    <Avatar
      avatarUrl={props.avatarUrl}
      name={props.name}
      verified={Boolean(props.verified)}
      side={props.side}
      sizeClass={props.sizeClass ?? "size-4"}
      showRing={Boolean(props.showRing)}
      verifiedSizeClass="size-2.5"
      verifiedIconClass="size-1.5"
    />
  );
}

// ─── Shared thumbnail placeholder ──────────────────────────────────

/**
 * Square placeholder used wherever a post thumbnail is missing — keeps
 * fallback visuals consistent across compare cards.
 */
export function CompareThumbPlaceholder({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex aspect-square items-center justify-center rounded-md bg-surface-muted",
        className,
      )}
    >
      <ImageIcon className={cn("size-4 text-content-tertiary/60", iconClassName)} />
    </span>
  );
}

function Avatar({
  avatarUrl,
  name,
  verified,
  side,
  sizeClass,
  showRing,
  verifiedSizeClass,
  verifiedIconClass,
}: {
  avatarUrl: string | null;
  name: string;
  verified: boolean;
  side: "primary" | "competitor";
  sizeClass: string;
  showRing: boolean;
  verifiedSizeClass: string;
  verifiedIconClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const ringClass = showRing
    ? cn(
        "ring-2 ring-offset-2 ring-offset-white",
        side === "primary" ? "ring-accent-primary" : "ring-compare-competitor",
      )
    : "";

  const show = Boolean(avatarUrl) && !failed;

  const fallbackTint =
    side === "primary"
      ? "bg-gradient-to-br from-[color-mix(in_oklab,var(--accent-primary)_55%,white)] to-[var(--accent-primary)] text-white"
      : "bg-gradient-to-br from-[color-mix(in_oklab,var(--compare-competitor)_55%,white)] to-[var(--compare-competitor)] text-white";

  return (
    <span className="relative inline-flex shrink-0">
      {show ? (
        <img
          src={avatarUrl as string}
          alt={name}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "rounded-full object-cover bg-surface-muted",
            sizeClass,
            ringClass,
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "rounded-full flex items-center justify-center font-sans font-semibold text-[0.72em] leading-none",
            fallbackTint,
            sizeClass,
            ringClass,
          )}
        >
          {initials || "—"}
        </span>
      )}
      {verified ? (
        <span
          aria-label="Verificado"
          title="Verificado"
          className={cn(
            "absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-signal-success text-white ring-2 ring-white",
            verifiedSizeClass,
          )}
        >
          <Check className={verifiedIconClass} strokeWidth={3.5} aria-hidden="true" />
        </span>
      ) : null}
    </span>
  );
}