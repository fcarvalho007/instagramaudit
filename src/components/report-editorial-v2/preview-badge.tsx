/**
 * TODO (Editorial V2): remover antes do lançamento público.
 *
 * Selo de diagnóstico que torna inequívoco qual a variante de apresentação
 * está montada. Só existe dentro do `EditorialV2Shell` (logo, só com
 * `?report_design=editorial_v2`) e apenas fora de produção.
 *
 * Não lê, deriva nem altera qualquer dado do relatório.
 */

/** Dev, previews Lovable e localhost. Nunca no domínio público publicado. */
function isPreviewEnvironment(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith("-dev.lovable.app") ||
    host.startsWith("id-preview--")
  );
}

export function EditorialV2PreviewBadge() {
  if (!isPreviewEnvironment()) return null;

  return (
    <div
      data-ev2-preview-badge=""
      aria-hidden="true"
      className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-full border border-[var(--ev2-hair-2)] bg-[var(--ev2-paper)]/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ev2-ink-3)] shadow-sm backdrop-blur"
    >
      Editorial V2 · Preview
    </div>
  );
}
