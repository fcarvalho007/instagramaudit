import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
    "peer w-full font-sans font-normal tracking-normal",
    "text-content-primary placeholder:text-content-tertiary",
    "transition-colors duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "focus:outline-none",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-base",
    "disabled:hover:border-border-default",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-surface-secondary border border-border-default rounded-md",
          "hover:border-border-strong",
          "focus:border-accent-primary focus:ring-[3px] focus:ring-accent-primary/20",
        ].join(" "),
        glass: [
          "bg-surface-elevated/40 backdrop-blur-md border border-border-subtle rounded-md",
          "hover:border-border-strong",
          "focus:border-accent-primary focus:ring-[3px] focus:ring-accent-primary/20",
        ].join(" "),
        ghost: [
          "bg-transparent border-0 border-b border-border-default rounded-none",
          "hover:border-border-strong",
          "focus:border-accent-primary focus:ring-0",
        ].join(" "),
      },
      inputSize: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-base",
        lg: "h-14 px-5 text-lg",
      },
    },
    compoundVariants: [
      { variant: "ghost", inputSize: "sm", class: "px-0" },
      { variant: "ghost", inputSize: "md", class: "px-0" },
      { variant: "ghost", inputSize: "lg", class: "px-0" },
    ],
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  },
);

const iconPaddingMap = {
  left: { sm: "pl-9", md: "pl-10", lg: "pl-12" },
  right: { sm: "pr-9", md: "pr-10", lg: "pr-12" },
} as const;

const iconSizeMap = {
  sm: "[&>svg]:h-3.5 [&>svg]:w-3.5",
  md: "[&>svg]:h-4 [&>svg]:w-4",
  lg: "[&>svg]:h-5 [&>svg]:w-5",
} as const;

const iconPositionMap = {
  left: { sm: "left-3", md: "left-3", lg: "left-4" },
  right: { sm: "right-3", md: "right-3", lg: "right-4" },
} as const;

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      error,
      leftIcon,
      rightIcon,
      type,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const size = inputSize ?? "md";
    const errorClasses = error
      ? "border-signal-danger hover:border-signal-danger focus:border-signal-danger focus:ring-signal-danger/20"
      : "";

    const inputEl = (
      <input
        ref={ref}
        type={type}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        className={cn(
          inputVariants({ variant, inputSize: size }),
          leftIcon && iconPaddingMap.left[size],
          rightIcon && iconPaddingMap.right[size],
          errorClasses,
          className,
        )}
        {...props}
      />
    );

    if (!leftIcon && !rightIcon) {
      return inputEl;
    }

    return (
      <div className="relative w-full">
        {leftIcon && (
          <span
            className={cn(
              "absolute inset-y-0 flex items-center pointer-events-none",
              "text-content-tertiary peer-focus:text-content-secondary",
              "transition-colors duration-[250ms]",
              iconPositionMap.left[size],
              iconSizeMap[size],
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        {inputEl}
        {rightIcon && (
          <span
            className={cn(
              "absolute inset-y-0 flex items-center pointer-events-none",
              "text-content-tertiary peer-focus:text-content-secondary",
              "transition-colors duration-[250ms]",
              iconPositionMap.right[size],
              iconSizeMap[size],
            )}
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

const InputLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block font-mono text-xs uppercase tracking-wide text-content-tertiary mb-2",
      className,
    )}
    {...props}
  />
));
InputLabel.displayName = "InputLabel";

export interface InputHelperProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: boolean;
}

const InputHelper = React.forwardRef<HTMLParagraphElement, InputHelperProps>(
  ({ className, error, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "font-sans text-sm mt-2",
        error ? "text-signal-danger" : "text-content-tertiary",
        className,
      )}
      {...props}
    />
  ),
);
InputHelper.displayName = "InputHelper";

export { Input, InputLabel, InputHelper, inputVariants };
