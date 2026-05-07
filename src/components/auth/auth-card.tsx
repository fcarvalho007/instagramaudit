import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared card wrapper for auth pages (login, signup, reset-password).
 * Forces light appearance regardless of app theme — pale blue bg,
 * white card, subtle borders, generous spacing.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12 bg-surface-muted">
      <div
        className={cn(
          "w-full max-w-[420px]",
          "rounded-2xl border border-border-default/20 bg-white",
          "px-6 py-8 sm:px-8 sm:py-10",
          "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.1)]",
        )}
      >
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content-primary">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-content-secondary">
            {subtitle}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
