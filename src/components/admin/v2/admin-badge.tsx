/**
 * AdminBadge — badge inline para o admin v2.
 *
 * Pill com fundo suave (tom 50/100 da família) e texto em tom 800/900.
 * Não substitui o `<Badge>` do shadcn em outras áreas — só usado no admin novo.
 */

import { type ReactNode } from "react";
import { ACCENT_BG_50, ACCENT_TEXT, type AdminAccent } from "./admin-tokens";

interface AdminBadgeProps {
  variant?: AdminAccent;
  children: ReactNode;
  className?: string;
}

export function AdminBadge({
  variant = "neutral",
  children,
  className = "",
}: AdminBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-[3px] text-[11px] font-normal leading-none ${className}`}
      style={{
        backgroundColor: ACCENT_BG_50[variant],
        color: ACCENT_TEXT[variant],
      }}
    >
      {children}
    </span>
  );
}