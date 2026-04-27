/**
 * AdminActionButton — botão genérico do admin v2.
 *
 * Usado em headers (Exportar, Enviar email, Oferecer upgrade), filtros
 * pill (Todos · Subscritores · ...) e paginação (← →).
 * Variantes:
 *   - default → fundo branco, borda admin, texto primary
 *   - active  → mesmo, mas borda mais forte (filtro pill seleccionado)
 */

import { type ButtonHTMLAttributes, forwardRef } from "react";

type AdminActionButtonSize = "sm" | "md";
type AdminActionButtonVariant = "default" | "active";

interface AdminActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: AdminActionButtonSize;
  variant?: AdminActionButtonVariant;
}

const SIZE_CLS: Record<AdminActionButtonSize, string> = {
  sm: "h-[26px] px-2 text-[11px]",
  md: "h-8 px-3 text-[12px]",
};

export const AdminActionButton = forwardRef<
  HTMLButtonElement,
  AdminActionButtonProps
>(function AdminActionButton(
  { size = "md", variant = "default", className = "", children, type, ...rest },
  ref,
) {
  const variantCls =
    variant === "active"
      ? "border-admin-text-primary text-admin-text-primary bg-admin-surface"
      : "border-admin-border text-admin-text-secondary bg-admin-surface hover:text-admin-text-primary hover:border-admin-border-strong";

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-leads-500 ${SIZE_CLS[size]} ${variantCls} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
});