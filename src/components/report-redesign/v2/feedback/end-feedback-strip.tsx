/**
 * EndFeedbackStrip — faixa fina de feedback colocada imediatamente abaixo
 * do `ReportEndOfFreeBlock`. Variante compacta da `BlockFeedback`: uma só
 * linha, 4 emojis, sem step de comentário. Mantém o endpoint
 * `/api/public/inline-feedback` e o mesmo localStorage namespace
 * (`inline-fb:overview:<handle>:<snapshot>:end`).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "done" | "error" | "already";

interface Props {
  handle: string;
  snapshotId: string | null;
  className?: string;
}

// 4 emojis (sem neutro do meio) — o mockup mostra 4. Mapeamos para
// rating 1/2/4/5 para manter compatibilidade com a tabela de inline-feedback.
const RATINGS: Array<{ value: number; emoji: string; label: string }> = [
  { value: 1, emoji: "😔", label: "Mau" },
  { value: 2, emoji: "😐", label: "Razoável" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "😍", label: "Excelente" },
];

function storageKey(handle: string, snapshotId: string | null) {
  return `inline-fb:overview:${handle}:${snapshotId ?? "_"}:end`;
}

export function EndFeedbackStrip({ handle, snapshotId, className }: Props) {
  const { t } = useTranslation("report");
  const [status, setStatus] = useState<Status>("idle");
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const prev = window.localStorage.getItem(storageKey(handle, snapshotId));
      if (prev) {
        setStatus("already");
        setRating(Number(prev) || 0);
      }
    } catch {
      // ignore
    }
  }, [handle, snapshotId]);

  async function submit(value: number) {
    if (status === "submitting") return;
    setRating(value);
    setStatus("submitting");
    try {
      const res = await fetch("/api/public/inline-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          snapshot_id: snapshotId,
          block: "overview",
          rating: value,
          source: "end_strip",
        }),
      });
      if (!res.ok) throw new Error("submit_failed");
      try {
        window.localStorage.setItem(
          storageKey(handle, snapshotId),
          String(value),
        );
      } catch {
        // ignore
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const settled = status === "done" || status === "already";

  return (
    <section
      aria-label={t("end_feedback.question")}
      className={cn(
        "mx-auto max-w-3xl rounded-2xl",
        "bg-amber-50/50 ring-1 ring-amber-200/50",
        "px-5 py-3 sm:px-6 sm:py-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[13px] font-medium text-content-secondary">
          {settled ? t("end_feedback.thanks") : t("end_feedback.question")}
        </p>

        <div className="flex items-center gap-1.5" role="radiogroup">
          {RATINGS.map((item) => {
            const isSelected = rating === item.value;
            const dimmed = settled && !isSelected;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={item.label}
                disabled={settled || status === "submitting"}
                onClick={() => void submit(item.value)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  "text-lg transition-all duration-150",
                  "hover:bg-white hover:scale-110",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50",
                  isSelected && "bg-white ring-1 ring-accent-primary/50",
                  dimmed && "opacity-30 grayscale",
                  status === "submitting" && "cursor-wait",
                )}
              >
                <span>{item.emoji}</span>
              </button>
            );
          })}
        </div>

        <p className="text-eyebrow-sm text-content-tertiary">
          {t("end_feedback.tag")}
        </p>
      </div>

      {status === "error" ? (
        <p
          className="mt-2 text-[11px] text-signal-danger text-center"
          aria-live="polite"
        >
          {t("end_feedback.error")}
        </p>
      ) : null}
    </section>
  );
}