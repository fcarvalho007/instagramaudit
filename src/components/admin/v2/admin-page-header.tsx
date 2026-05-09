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
      className="mb-6 pb-4 sm:mb-7 sm:pb-5"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(44,44,42,0.18), transparent)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left bottom",
        backgroundSize: "100% 1px",
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="admin-eyebrow">
            InstaBench · Admin
          </p>
          <h1
            className="m-0 text-[28px] font-medium leading-[1.05] tracking-[-0.02em] text-admin-text-primary sm:text-[36px]"
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="admin-body text-admin-text-secondary">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}