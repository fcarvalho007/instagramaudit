import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

/**
 * Ronda 3.5 — cabeçalho da "Auditoria Instantânea".
 *
 * O botão "Guardar esta auditoria" foi retirado da interface: em staging
 * externo não pode existir uma acção aparentemente funcional que termine
 * apenas em "disponível em breve". O ponto de integração fica em código.
 *
 * Ronda 4: reintroduzir aqui a acção "Guardar esta auditoria", ligada ao
 * fluxo de captura de email/Level 2, e emitir `save_audit_cta_clicked`.
 */
export function InstantAuditBar({
  handle,
  snapshotId,
}: {
  handle: string;
  snapshotId: string;
}) {
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
      className="mb-4 flex items-center gap-2 rounded-xl border border-border-default bg-surface-secondary px-4 py-3 sm:px-5"
    >
      <Sparkles
        className="size-4 shrink-0 text-accent-primary"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-content-primary">
          Auditoria Instantânea
        </p>
        <p className="truncate text-xs text-content-secondary">
          Leitura imediata de @{handle} com base em dados públicos.
        </p>
      </div>
    </div>
  );
}
