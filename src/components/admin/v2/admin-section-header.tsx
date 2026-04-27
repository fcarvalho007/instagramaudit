/**
 * AdminSectionHeader — header de cada secção dentro de uma tab.
 *
 * Refinamentos prompt 4:
 *   - barra vertical 4×22 (era 3×16)
 *   - h2 20px sentence case (era 13px uppercase)
 *   - subtítulo após "·" 13px tertiary
 *   - prop opcional `info` → `<AdminInfoTooltip>` à direita do h2
 */

import { type ReactNode } from "react";
import { ACCENT_500, type AdminAccent } from "./admin-tokens";
import { AdminInfoTooltip } from "./admin-info-tooltip";

interface AdminSectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  accent: AdminAccent;
  /** Texto do tooltip "i" mostrado à direita do h2. */
  info?: string;
}

export function AdminSectionHeader({
  title,
  subtitle,
  accent,
  info,
}: AdminSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 block"
        style={{
          width: 4,
          height: 22,
          borderRadius: 2,
          backgroundColor: ACCENT_500[accent],
        }}
      />
      <h2
        className="m-0 inline-flex items-center gap-2 text-admin-text-primary"
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        <span>{title}</span>
        {subtitle ? (
          <span
            className="font-normal text-admin-text-tertiary"
            style={{ fontSize: 13, letterSpacing: 0 }}
          >
            · {subtitle}
          </span>
        ) : null}
        {info ? <AdminInfoTooltip text={info} /> : null}
      </h2>
    </div>
  );
}