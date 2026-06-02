import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "warning" | "info";

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; border: string; accent: string }
> = {
  warning: {
    bg: "rgb(var(--tint-warning))",
    border: "1px solid rgb(var(--signal-warning) / 0.25)",
    accent: "rgb(var(--signal-warning))",
  },
  info: {
    bg: "rgb(var(--admin-info-50))",
    border: "1px solid rgb(var(--admin-info-500) / 0.25)",
    accent: "rgb(var(--admin-info-700))",
  },
};

type Props = {
  variant?: Variant;
  icon?: ReactNode;
  title: string;
  children: ReactNode;
};

/**
 * Banner informativo padronizado para diálogos e cards admin.
 * Usa tokens semânticos (--tint-warning / --signal-warning) — nunca hardcoded.
 */
export function AdminCallout({
  variant = "warning",
  icon,
  title,
  children,
}: Props) {
  const style = VARIANT_STYLES[variant];
  const resolvedIcon =
    icon ?? (
      variant === "info" ? (
        <Info size={15} className="shrink-0 mt-0.5" style={{ color: style.accent }} />
      ) : (
        <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: style.accent }} />
      )
    );

  return (
    <div
      className="flex items-start gap-2 rounded-lg p-3 text-[13px]"
      style={{ backgroundColor: style.bg, border: style.border }}
    >
      {resolvedIcon}
      <div>
        <p className="font-medium m-0" style={{ color: style.accent }}>
          {title}
        </p>
        <p className="mt-0.5 text-admin-text-secondary m-0">{children}</p>
      </div>
    </div>
  );
}