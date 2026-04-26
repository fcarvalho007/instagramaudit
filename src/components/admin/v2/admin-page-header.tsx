/**
 * AdminPageHeader — cabeçalho de cada tab.
 *
 * eyebrow uppercase + h1 28px + subtítulo + slot de acções.
 * Linha-gradient sutil em baixo a separar do conteúdo.
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
        paddingBottom: 20,
        marginBottom: 28,
        backgroundImage:
          "linear-gradient(to right, rgb(var(--admin-neutral-100)), transparent)",
        backgroundSize: "100% 1px",
        backgroundPosition: "bottom left",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="admin-eyebrow">InstaBench · Admin</p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "rgb(var(--admin-neutral-900))",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                fontSize: 13,
                color: "rgb(var(--admin-neutral-600))",
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}