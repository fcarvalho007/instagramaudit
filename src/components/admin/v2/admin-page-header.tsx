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
          <p
            style={{
              fontFamily: '"JetBrains Mono", Menlo, Consolas, monospace',
              fontSize: 11,
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#5F5E5A",
              lineHeight: 1,
              margin: 0,
            }}
          >
            InstaBench · Admin
          </p>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#2C2C2A",
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p style={{ fontSize: 13, color: "#5F5E5A", margin: 0 }}>
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