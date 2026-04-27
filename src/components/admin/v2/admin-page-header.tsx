/**
 * AdminPageHeader — cabeçalho de cada tab.
 *
 * Refinamentos prompt 4:
 *   - h1 36px / weight 500 / -0.02em
 *   - subtítulo 14px secondary
 *   - margem inferior 40px, padding-bottom 28px
 *   - divisora linha sólida 1px `--color-admin-border` (sem gradiente)
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
        marginBottom: 40,
        paddingBottom: 28,
        borderBottom: "1px solid var(--color-admin-border)",
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="admin-eyebrow">InstaBench · Admin</p>
          <h1
            className="m-0 text-admin-text-primary"
            style={{
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="m-0 text-admin-text-secondary"
              style={{ fontSize: 14, lineHeight: 1.4 }}
            >
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