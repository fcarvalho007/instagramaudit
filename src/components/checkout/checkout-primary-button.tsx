import { forwardRef } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Local navy override for primary CTAs inside the checkout flow only.
 * Neutralises the global violet gradient of `variant="primary"` without
 * touching `button.tsx`. Do NOT use this outside `/checkout/*`.
 */
const NAVY_OVERRIDE = [
  "!bg-[rgb(var(--text-primary))] !bg-none",
  "!text-[rgb(var(--text-inverse))]",
  "hover:!bg-[rgb(var(--text-primary))]/90",
  "active:!bg-[rgb(var(--text-primary))]/85",
  "!shadow-sm hover:!shadow-md",
  "hover:!brightness-100",
].join(" ");

export const CheckoutPrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="primary"
      {...props}
      className={cn(NAVY_OVERRIDE, className)}
    />
  ),
);
CheckoutPrimaryButton.displayName = "CheckoutPrimaryButton";