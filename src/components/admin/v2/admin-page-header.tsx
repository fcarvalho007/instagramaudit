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
      style={{
        marginBottom: 28,
        paddingBottom: 20,
        backgroundImage:
          "linear-gradient(to right, rgba(44,44,42,0.18), transparent)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left bottom",
        backgroundSize: "100% 1px",
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="admin-eyebrow">
            InstaBench · Admin
          </p>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: 0,
            }}
            className="text-admin-text-primary"
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
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}