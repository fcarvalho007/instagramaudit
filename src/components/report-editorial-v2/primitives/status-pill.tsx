import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

/**
 * Sinal de estado. A cor nunca é o único portador de significado: cada
 * variante tem ícone e texto próprios.
 */
export type StatusTone = "neutral" | "success" | "warning" | "danger";

const TONE_STYLE: Record<
  StatusTone,
  { fg: string; bg: string; bd: string; Icon: typeof Info }
> = {
  neutral: {
    fg: "var(--ev2-blue)",
    bg: "var(--ev2-blue-4)",
    bd: "var(--ev2-blue-3)",
    Icon: Info,
  },
  success: {
    fg: "var(--ev2-success)",
    bg: "var(--ev2-success-bg)",
    bd: "var(--ev2-success-bd)",
    Icon: CheckCircle2,
  },
  warning: {
    fg: "var(--ev2-warning)",
    bg: "var(--ev2-warning-bg)",
    bd: "var(--ev2-warning-bd)",
    Icon: AlertTriangle,
  },
  danger: {
    fg: "var(--ev2-danger)",
    bg: "var(--ev2-danger-bg)",
    bd: "var(--ev2-danger-bd)",
    Icon: XCircle,
  },
};

export function StatusPill({
  tone = "neutral",
  label,
}: {
  tone?: StatusTone;
  label: string;
}) {
  const { fg, bg, bd, Icon } = TONE_STYLE[tone];

  return (
    <span
      className="inline-flex items-center gap-[6px] rounded-full border px-[10px] py-[4px] text-[12px] font-medium"
      style={{ color: fg, background: bg, borderColor: bd }}
    >
      <Icon aria-hidden="true" className="size-[13px] shrink-0" />
      {label}
    </span>
  );
}
