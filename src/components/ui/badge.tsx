import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-md border",
    "text-eyebrow-sm font-medium",
    "transition-colors duration-[150ms]",
    "whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-surface-elevated border-border-subtle text-content-secondary",
        success:
          "bg-signal-success/15 border-signal-success/30 text-signal-success",
        warning:
          "bg-signal-warning/15 border-signal-warning/30 text-signal-warning",
        danger:
          "bg-signal-danger/15 border-signal-danger/30 text-signal-danger",
        accent:
          "bg-accent-primary/15 border-accent-primary/30 text-accent-luminous",
        premium:
          "bg-accent-gold/[0.12] border-accent-gold/30 text-accent-gold",
        solid:
          "bg-content-primary border-transparent text-surface-base",
      },
      size: {
        sm: "h-5 px-2 text-[0.625rem] gap-1 [&_svg]:size-3",
        md: "h-6 px-2.5 text-xs gap-1.5 [&_svg]:size-3.5",
        lg: "h-7 px-3 text-sm gap-1.5 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const dotSizeMap = {
  sm: "h-1 w-1",
  md: "h-1.5 w-1.5",
  lg: "h-2 w-2",
} as const;

const dotColorMap = {
  default: "bg-content-secondary",
  success: "bg-signal-success",
  warning: "bg-signal-warning",
  danger: "bg-signal-danger",
  accent: "bg-accent-luminous",
  premium: "bg-accent-gold",
  solid: "bg-surface-base",
} as const;

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  children?: React.ReactNode;
}

let pulseStyleInjected = false;
function ensurePulseKeyframe() {
  if (pulseStyleInjected || typeof document === "undefined") return;
  const id = "ibm-badge-pulse-keyframe";
  if (document.getElementById(id)) {
    pulseStyleInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `@keyframes ibm-badge-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`;
  document.head.appendChild(style);
  pulseStyleInjected = true;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      leftIcon,
      dot = false,
      pulse = false,
      children,
      ...props
    },
    ref,
  ) => {
    React.useEffect(() => {
      if (dot && pulse) ensurePulseKeyframe();
    }, [dot, pulse]);

    const v = variant ?? "default";
    const s = size ?? "md";

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot ? (
          <span
            aria-hidden="true"
            className={cn("inline-block rounded-full", dotSizeMap[s], dotColorMap[v])}
            style={
              pulse
                ? { animation: "ibm-badge-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite" }
                : undefined
            }
          />
        ) : leftIcon ? (
          <span aria-hidden="true" className="inline-flex items-center">
            {leftIcon}
          </span>
        ) : null}
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
