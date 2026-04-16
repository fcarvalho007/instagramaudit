import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center whitespace-nowrap",
    "font-sans rounded-lg select-none",
    "transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-luminous focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "font-semibold text-content-inverse",
          "bg-gradient-to-br from-accent-primary to-accent-luminous",
          "shadow-glow-cyan",
          "hover:scale-[1.02] hover:brightness-110 hover:shadow-glow-cyan",
        ].join(" "),
        secondary: [
          "font-medium text-content-primary",
          "bg-surface-elevated border border-border-subtle",
          "hover:bg-surface-elevated hover:border-border-default hover:scale-[1.02]",
        ].join(" "),
        ghost: [
          "font-medium text-content-secondary bg-transparent",
          "hover:bg-surface-elevated/50 hover:text-content-primary",
        ].join(" "),
        outline: [
          "font-medium text-content-primary bg-transparent",
          "border border-border-default",
          "hover:bg-surface-elevated hover:border-border-strong",
        ].join(" "),
        destructive: [
          "font-medium text-white",
          "bg-signal-danger",
          "hover:bg-signal-danger/90 hover:scale-[1.02]",
        ].join(" "),
        premium: [
          "font-semibold text-accent-gold",
          "bg-surface-secondary border border-accent-gold/40",
          "shadow-glow-gold",
          "hover:scale-[1.02] hover:border-accent-gold/60 hover:bg-surface-elevated",
        ].join(" "),
        link: [
          "font-medium text-accent-luminous bg-transparent",
          "underline-offset-4 hover:underline",
          "h-auto px-0",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-4 text-sm gap-2 [&_svg]:size-4",
        md: "h-11 px-6 text-base gap-2 [&_svg]:size-[18px]",
        lg: "h-14 px-8 text-lg gap-3 [&_svg]:size-5",
        icon: "h-11 w-11 p-0 [&_svg]:size-[18px]",
      },
    },
    compoundVariants: [
      { variant: "link", size: "sm", class: "h-auto px-0" },
      { variant: "link", size: "md", class: "h-auto px-0" },
      { variant: "link", size: "lg", class: "h-auto px-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    const content = asChild ? (
      (children as React.ReactNode)
    ) : (
      <>
        <span
          className={cn(
            "inline-flex items-center justify-center gap-[inherit] transition-opacity duration-[150ms]",
            loading && "opacity-0",
          )}
        >
          {leftIcon}
          {children}
          {rightIcon}
        </span>
        {loading && (
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Loader2 className="animate-spin" aria-hidden="true" />
          </span>
        )}
      </>
    );

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        aria-live={loading ? "polite" : undefined}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
