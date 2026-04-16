import * as React from "react";

import { cn } from "@/lib/utils";

export interface BrandMarkProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

const BrandMark = React.forwardRef<SVGSVGElement, BrandMarkProps>(
  ({ size = 32, className, ...props }, ref) => {
    const gradientId = React.useId();
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn("shrink-0", className)}
        {...props}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="4"
            y1="4"
            x2="28"
            y2="28"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgb(var(--accent-primary))" />
            <stop offset="100%" stopColor="rgb(var(--accent-luminous))" />
          </linearGradient>
        </defs>
        <circle
          cx="16"
          cy="16"
          r="12"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
        />
        <circle cx="16" cy="16" r="4" fill={`url(#${gradientId})`} />
      </svg>
    );
  },
);
BrandMark.displayName = "BrandMark";

export { BrandMark };
