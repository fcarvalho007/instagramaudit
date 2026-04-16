import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const switchVariants = cva(
  [
    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border",
    "transition-colors duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "bg-surface-elevated border-border-default",
    "data-[state=checked]:bg-accent-primary data-[state=checked]:border-accent-primary",
    "data-[state=checked]:shadow-glow-cyan",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-luminous focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
        lg: "h-7 w-[3.25rem]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const thumbVariants = cva(
  [
    "pointer-events-none block rounded-full",
    "bg-content-tertiary data-[state=checked]:bg-content-primary",
    "shadow-sm ring-0",
    "transition-transform duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "data-[state=unchecked]:translate-x-0.5",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4",
        md: "h-5 w-5 data-[state=checked]:translate-x-5",
        lg: "h-6 w-6 data-[state=checked]:translate-x-6",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface SwitchProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
      "size"
    >,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(switchVariants({ size }), className)}
    {...props}
  >
    <SwitchPrimitives.Thumb className={cn(thumbVariants({ size }))} />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch, switchVariants };
