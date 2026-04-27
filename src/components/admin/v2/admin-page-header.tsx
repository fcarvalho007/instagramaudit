/**
 * AdminPageHeader — cabeçalho de cada tab.
 *
 * Estrutura: eyebrow mono + h1 + subtítulo opcional + slot de acções.
 * Separador inferior em gradient subtil (linha 1px que esmorece à direita).
 */

import { type ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header
      className="mb-7 pb-5 bg-no-repeat bg-left-bottom"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgb(var(--admin-border-rgb) / 0.14), transparent)",
        backgroundSize: "100% 1px",
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="admin-eyebrow">InstaBench · Admin</p>
          <h1 className="text-[28px] font-medium tracking-tight leading-[1.1] text-admin-text-primary m-0">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[13px] text-admin-text-secondary m-0">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}