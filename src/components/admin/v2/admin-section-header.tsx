/**
 * AdminSectionHeader — header de cada secção dentro de uma tab.
 *
 * Barra vertical 3×16px à esquerda com cor temática + h2 13px uppercase
 * + subtítulo opcional após "·".
 */

import { type ReactNode } from "react";
import { ACCENT_500, type AdminAccent } from "./admin-tokens";

interface AdminSectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  accent: AdminAccent;
}

export function AdminSectionHeader({
  title,
  subtitle,
  accent,
}: AdminSectionHeaderProps) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ marginBottom: 14 }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 3,
          height: 16,
          backgroundColor: ACCENT_500[accent],
          borderRadius: 1.5,
          flexShrink: 0,
        }}
      />
      <h2
        style={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgb(var(--admin-neutral-900))",
          margin: 0,
        }}
      >
        {title}
        {subtitle ? (
          <span
            style={{
              marginLeft: 8,
              fontWeight: 400,
              letterSpacing: 0,
              textTransform: "none",
              color: "rgb(var(--admin-neutral-400))",
            }}
          >
            · {subtitle}
          </span>
        ) : null}
      </h2>
    </div>
  );
}