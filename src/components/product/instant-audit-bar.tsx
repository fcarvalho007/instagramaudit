import { useEffect, useRef, useState } from "react";
import { Bookmark, Sparkles } from "lucide-react";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

/**
 * Ronda 3 — cabeçalho da "Auditoria Instantânea".
 *
 * Placeholder de conversão A: acção discreta "Guardar esta auditoria".
 * Não abre formulário nem pede email — regista o evento e mostra uma nota.
 *
 * Ronda 4: substituir `handleSave` pela abertura do fluxo de captura de
 * email/Level 2 (ponto de integração único).
 */
export function InstantAuditBar({
  handle,
  snapshotId,
}: {
  handle: string;
  snapshotId: string;
}) {
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackAnonymousEvent("save_audit_cta_viewed", {
            handle,
            snapshotId,
            dedupeKey: snapshotId,
          });
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [handle, snapshotId]);

  return (
    <div
      ref={ref}
      className="mb-4 flex flex-col gap-3 rounded-xl border border-border-default bg-surface-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="size-4 shrink-0 text-accent-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-content-primary">
            Auditoria Instantânea
          </p>
          <p className="truncate text-xs text-content-secondary">
            Leitura imediata de @{handle} com base em dados públicos.
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <button
          type="button"
          onClick={() => {
            setSaved(true);
            // Ronda 4: abrir aqui a captura de email / criação de conta.
            trackAnonymousEvent("save_audit_cta_clicked", {
              handle,
              snapshotId,
            });
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3.5 py-2 text-sm font-medium text-content-primary transition hover:bg-surface-muted"
        >
          <Bookmark className="size-4" aria-hidden="true" />
          Guardar esta auditoria
        </button>
        {saved ? (
          <p role="status" className="mt-1 text-xs text-content-tertiary">
            Disponível em breve.
          </p>
        ) : null}
      </div>
    </div>
  );
}
