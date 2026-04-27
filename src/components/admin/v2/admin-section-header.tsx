/**
 * AdminSectionHeader — header de cada secção dentro de uma tab.
 *
 * Barra vertical 3×16px com cor temática + h2 uppercase + subtítulo opcional.
 * Esta barra é o único portador da cor temática agora que as tabs são mono.
 */

import { type ReactNode } from "react";
import { ACCENT_500, type AdminAccent } from "./admin-tokens";
import { AdminInfoTooltip } from "./admin-info-tooltip";

interface AdminSectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  accent: AdminAccent;
  /** Texto explicativo opcional, exposto via tooltip "i" ao lado do título. */
  info?: string;
}

export function AdminSectionHeader({
  title,
  subtitle,
  accent,
  info,
}: AdminSectionHeaderProps) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="block w-[3px] h-4 rounded-sm shrink-0"
        style={{ backgroundColor: ACCENT_500[accent] }}
      />
      <h2 className="m-0 text-[13px] font-medium uppercase tracking-[0.06em] text-admin-text-primary">
        {title}
        {subtitle ? (
          <span className="ml-2 font-normal normal-case tracking-normal text-admin-text-tertiary">
            · {subtitle}
          </span>
        ) : null}
      </h2>
      {info ? <AdminInfoTooltip label={info} /> : null}
    </div>
  );
}