import { Sparkles } from "lucide-react";

import { ReportSectionFrame } from "./report-section-frame";
import { REDESIGN_TOKENS } from "./report-tokens";
import { cn } from "@/lib/utils";

interface Props {
  /** ISO timestamp do `meta.generated_at` do snapshot. */
  generatedAtIso: string | null;
}

const RECENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Aviso editorial subtil que indica ao leitor que a leitura estratégica
 * gerada por IA ainda está em preparação. Aparece apenas quando o
 * snapshot é recente (< 5 min) e não traz `ai_insights_v1`. Para
 * snapshots antigos sem IA, fica oculto — preserva o comportamento
 * actual de degradação silenciosa.
 */
export function ReportPendingAiNotice({ generatedAtIso }: Props) {
  if (!generatedAtIso) return null;
  const generated = new Date(generatedAtIso).getTime();
  if (!Number.isFinite(generated)) return null;
  if (Date.now() - generated > RECENT_WINDOW_MS) return null;

  return (
    <ReportSectionFrame
      eyebrow="Leitura estratégica · IA editorial"
      title="A preparar a leitura estratégica"
      tone="white"
      ariaLabel="Leitura estratégica em preparação"
    >
      <div
        className={cn(
          REDESIGN_TOKENS.card,
          "flex items-start gap-4 p-5 md:p-6",
        )}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100"
        >
          <Sparkles className="size-4" />
        </span>
        <p className="text-sm md:text-[15px] text-slate-600 leading-relaxed">
          A leitura editorial deste perfil está a ser preparada. Volta
          em alguns minutos para a versão completa — os dados, o
          benchmark e os concorrentes já estão disponíveis abaixo.
        </p>
      </div>
    </ReportSectionFrame>
  );
}