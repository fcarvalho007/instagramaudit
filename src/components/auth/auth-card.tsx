import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared card wrapper for auth pages (login, signup, reset-password).
 * Light-first Iconosquare-inspired style: pale blue bg, white card,
 * subtle borders, generous spacing.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <div
        className={cn(
          "w-full max-w-[420px]",
          "rounded-2xl border border-border-default bg-surface-secondary",
          "px-6 py-8 sm:px-8 sm:py-10",
          "shadow-card",
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
