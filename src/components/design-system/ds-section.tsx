import * as React from "react";

import { cn } from "@/lib/utils";

export interface DSSectionProps extends React.HTMLAttributes<HTMLElement> {
  id: string;
  label: string;
  title: string;
  description?: string;
}

const DSSection = React.forwardRef<HTMLElement, DSSectionProps>(
  ({ id, label, title, description, className, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        id={id}
        className={cn("scroll-mt-24 mb-24", className)}
        {...props}
      >
        <header className="mb-10">
          <p className="text-eyebrow text-content-tertiary mb-3">
            {label}
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-content-primary mb-3">
            {title}
          </h2>
          {description && (
            <p className="font-sans text-base text-content-secondary leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </header>
        <div className="space-y-12">{children}</div>
      </section>
    );
  },
);
DSSection.displayName = "DSSection";

export interface DSExampleProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
}

const DSExample = React.forwardRef<HTMLDivElement, DSExampleProps>(
  ({ label, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        <p className="text-eyebrow text-content-tertiary mb-4">
          {label}
        </p>
        <div className="rounded-lg border border-border-subtle bg-surface-secondary/40 p-6">
          {children}
        </div>
      </div>
    );
  },
);
DSExample.displayName = "DSExample";

export { DSSection, DSExample };
