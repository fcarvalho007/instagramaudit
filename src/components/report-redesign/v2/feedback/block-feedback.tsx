/**
 * BlockFeedback — widget de feedback rápido entre blocos do relatório.
 * 1 clique em emoji + comentário opcional. Beta-friendly.
 */
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status =
  | "idle"
  | "submitting"
  | "done"
  | "error"
  | "already"
  | "comment_sent";

interface BlockFeedbackProps {
  handle: string;
  snapshotId: string | null;
  block: "overview" | "diagnostic" | "performance" | "content";
  className?: string;
}

const RATINGS: Array<{ value: number; emoji: string; label: string }> = [
  { value: 1, emoji: "😔", label: "Péssimo" },
  { value: 2, emoji: "😕", label: "Mau" },
  { value: 3, emoji: "😐", label: "Razoável" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "😍", label: "Excelente" },
];

function storageKey(handle: string, snapshotId: string | null, block: string) {
  return `inline-fb:${block}:${handle}:${snapshotId ?? "_"}`;
}

function commentStorageKey(
  handle: string,
  snapshotId: string | null,
  block: string,
) {
  return `inline-fb:${block}:${handle}:${snapshotId ?? "_"}:c`;
}

export function BlockFeedback({
  handle,
  snapshotId,
  block,
  className,
}: BlockFeedbackProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentError, setCommentError] = useState(false);

  // Hydrate "already voted" state from localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const prevComment = window.localStorage.getItem(
        commentStorageKey(handle, snapshotId, block),
      );
      if (prevComment) {
        setStatus("comment_sent");
        return;
      }
      const prev = window.localStorage.getItem(
        storageKey(handle, snapshotId, block),
      );
      if (prev) setStatus("already");
    } catch {
      // ignore storage errors
    }
  }, [handle, snapshotId, block]);

  const display = hover || rating;
  const active = display > 0 ? RATINGS[display - 1] : null;

  async function submitRating(value: number) {
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/public/inline-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          snapshot_id: snapshotId,
          block,
          rating: value,
        }),
      });
      if (!res.ok) throw new Error("submit_failed");
      try {
        window.localStorage.setItem(
          storageKey(handle, snapshotId, block),
          String(value),
        );
      } catch {
        // ignore storage errors
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  async function submitComment(value: number, text: string) {
    if (sendingComment) return;
    setSendingComment(true);
    setCommentError(false);
    try {
      const res = await fetch("/api/public/inline-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          snapshot_id: snapshotId,
          block,
          rating: value || 3,
          comment: text.trim(),
        }),
      });
      if (!res.ok) throw new Error("submit_failed");
      try {
        window.localStorage.setItem(
          commentStorageKey(handle, snapshotId, block),
          "1",
        );
      } catch {
        // ignore storage errors
      }
      setStatus("comment_sent");
    } catch {
      setCommentError(true);
    } finally {
      setSendingComment(false);
    }
  }

  if (status === "already") {
    return (
      <section
        aria-label="Feedback registado"
        className={cn(
          "py-6 sm:py-8 text-center",
          className,
        )}
      >
        <p className="text-sm text-content-tertiary">
          Já registaste o teu feedback. Obrigado.
        </p>
      </section>
    );
  }

  if (status === "comment_sent") {
    return (
      <section
        aria-label="Mensagem registada"
        className={cn("py-8 sm:py-10 text-center space-y-3", className)}
      >
        <div className="flex justify-center">
          <CheckCircle2 className="h-8 w-8 text-signal-success" aria-hidden />
        </div>
        <p className="text-base font-semibold text-content-primary">
          Mensagem registada. Obrigado.
        </p>
        <p className="text-sm text-content-secondary max-w-md mx-auto">
          Vamos lê-la com atenção.
        </p>
      </section>
    );
  }

  if (status === "done") {
    return (
      <section
        aria-label="Obrigado pelo feedback"
        className={cn("py-8 sm:py-10 text-center space-y-4", className)}
      >
        <p className="text-base font-semibold text-content-primary">
          Obrigado. Feedback registado.
        </p>
        <p className="text-sm text-content-secondary max-w-md mx-auto">
          Queres acrescentar algo? (opcional)
        </p>
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Uma frase ajuda-nos a melhorar."
            disabled={sendingComment}
            className="w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between gap-3">
            <p
              className={cn(
                "text-xs text-signal-danger transition-opacity",
                commentError ? "opacity-100" : "opacity-0",
              )}
              aria-live="polite"
            >
              Não foi possível enviar. Tenta novamente.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!comment.trim()) return;
                void submitComment(rating, comment);
              }}
              disabled={!comment.trim() || sendingComment}
              className="text-sm font-medium text-primary hover:text-primary/80 disabled:text-content-tertiary disabled:cursor-not-allowed transition-colors"
            >
              {sendingComment ? "A enviar…" : "Enviar"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Feedback do bloco"
      className={cn(
        "py-10 sm:py-14",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-4xl bg-surface-primary border border-border-default",
          "px-6 py-10 sm:px-12 sm:py-14 text-center",
          "shadow-[0_2px_15px_rgba(15,23,42,0.03)]",
        )}
      >
        <p className="text-eyebrow-sm text-content-tertiary">
          Como foi até aqui?
        </p>

        <h3
          className={cn(
            "mt-5 font-serif italic font-normal leading-tight",
            "text-content-primary text-3xl sm:text-4xl md:text-[2.75rem]",
          )}
        >
          Uma breve pausa para te ouvirmos
        </h3>

        <div
          className="mt-10 flex items-center justify-center gap-4 sm:gap-8"
          onMouseLeave={() => setHover(0)}
        >
          {RATINGS.map((item) => {
            const isHovered = hover === item.value;
            const isSelected = rating === item.value;
            const dimmed = display > 0 && !isHovered && !isSelected;
            const highlighted = isHovered || isSelected;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setRating(item.value);
                  void submitRating(item.value);
                }}
                onMouseEnter={() => setHover(item.value)}
                onFocus={() => setHover(item.value)}
                onBlur={() => setHover(0)}
                disabled={status === "submitting"}
                aria-label={`${item.value} de 5: ${item.label}`}
                className={cn(
                  "group flex flex-col items-center gap-3 transition-all duration-200",
                  "focus:outline-none rounded-full",
                  "hover:-translate-y-1 active:translate-y-0",
                  status === "submitting" && "cursor-wait",
                )}
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full",
                    "bg-surface-muted text-2xl transition-all duration-200",
                    "ring-1 ring-transparent",
                    "group-hover:bg-accent-primary/10 group-hover:ring-accent-primary/40",
                    "group-focus-visible:ring-2 group-focus-visible:ring-accent-primary/60",
                    highlighted && "bg-accent-primary/10 ring-accent-primary/40",
                    dimmed && "opacity-40 grayscale",
                  )}
                >
                  <span className="opacity-90 group-hover:opacity-100">
                    {item.emoji}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-eyebrow-sm transition-opacity duration-200",
                    highlighted
                      ? "text-accent-primary opacity-100"
                      : "text-content-tertiary opacity-0 group-hover:opacity-100",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 mx-auto max-w-sm">
          <p
            className={cn(
              "text-sm leading-relaxed transition-colors",
              active ? "text-content-secondary" : "text-content-tertiary",
            )}
          >
            {active
              ? "Obrigado. Vais ver, ajuda mesmo."
              : "Estamos em beta. O teu clique ajuda-nos a afinar o relatório."}
          </p>
        </div>

        {status === "error" && (
          <p className="mt-3 text-xs text-signal-danger" aria-live="polite">
            Não foi possível registar. Tenta mais tarde.
          </p>
        )}
      </div>
    </section>
  );
}