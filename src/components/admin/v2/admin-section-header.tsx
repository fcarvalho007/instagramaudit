/**
 * AdminSectionHeader — header de cada secção dentro de uma tab.
 *
 * Barra vertical 3×16px com cor temática + h2 uppercase + subtítulo opcional.
 * Esta barra é o único portador da cor temática agora que as tabs são mono.
 */

import { type ReactNode } from "react";
import { type AdminAccent } from "./admin-tokens";
import { AdminInfoTooltip } from "./admin-info-tooltip";

interface AdminSectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  accent: AdminAccent;
  /** Texto explicativo opcional, exposto via tooltip "i" ao lado do título. */
  info?: string;
}

/** Hex literais — duplicam ACCENT_500 sem depender de var(--admin-*). */
const ACCENT_HEX: Record<AdminAccent, string> = {
  revenue: "#1D9E75",
  "revenue-alt": "#97C459",
  leads: "#534AB7",
  expense: "#BA7517",
  signal: "#D85A30",
  danger: "#E24B4A",
  info: "#378ADD",
  neutral: "#888780",
};

export function AdminSectionHeader({
  title,
  subtitle,
  accent,
  info,
}: AdminSectionHeaderProps) {
  return (
    <div
      className="flex items-center"
      style={{ marginBottom: 14, gap: 12 }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "block",
          width: 3,
          height: 16,
          borderRadius: 2,
          flexShrink: 0,
          backgroundColor: ACCENT_HEX[accent],
        }}
      />
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#2C2C2A",
        }}
      >
        {title}
        {subtitle ? (
          <span
            style={{
              marginLeft: 8,
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: "normal",
              color: "#888780",
            }}
          >
            · {subtitle}
          </span>
        ) : null}
      </h2>
      {info ? <AdminInfoTooltip label={info} /> : null}
    </div>
  );
}