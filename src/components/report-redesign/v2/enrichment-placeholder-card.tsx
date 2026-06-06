import { AlertTriangle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface Props {
  variant: "pending" | "error";
  title: string;
  body: string;
  className?: string;
}

/**
 * Calm, editorial placeholder shown in place of a Pro card while the
 * underlying AI enrichment job is still running, or when it errored.
 *
 * Pure presentation — no data, no spinner, no polling.
 */
export function EnrichmentPlaceholderCard({
  variant,
  title,
  body,
  className,
}: Props) {
  const { t } = useTranslation("report");
  const isError = variant === "error";
  const Icon = isError ? AlertTriangle : Sparkles;
  const eyebrow = isError
    ? t("pending.eyebrow_error")
    : t("pending.eyebrow_pending");

  return (
    <article
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-4 rounded-2xl border border-border-default bg-surface-secondary",
        "p-5 md:p-6 shadow-card",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
          isError
            ? "bg-surface-muted text-content-tertiary ring-border-default"
            : "bg-surface-muted text-accent-primary ring-border-default",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className="text-eyebrow-sm text-content-tertiary">{eyebrow}</p>
        <h3 className="text-base md:text-[17px] font-semibold text-content-primary leading-snug">
          {title}
        </h3>
        <p className="text-sm text-content-secondary leading-relaxed">{body}</p>
      </div>
    </article>
  );
}