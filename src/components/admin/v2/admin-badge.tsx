/**
 * AdminBadge — pill inline para o admin v2.
 * Fundo suave (tom 50/100) + texto em tom 700/800.
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
      className={`inline-flex items-center rounded-lg px-2 py-[3px] text-[11px] font-normal leading-none ${className}`.trim()}
      style={{
        backgroundColor: ACCENT_BG_50[variant],
        color: ACCENT_TEXT[variant],
      }}
    >
      {children}
    </span>
  );
}