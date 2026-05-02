import { AlertTriangle, Crown, Cpu, Lightbulb, Lock, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  CaptionIntelligence,
  CaptionSourceKind,
  CtaStrength,
  ThemeConfidence,
} from "@/lib/report/caption-intelligence";

import { SourceBadge, type SourceBadgeVariant } from "./source-badge";

interface Props {
  data: CaptionIntelligence;
}

function badgeVariant(s: CaptionSourceKind): SourceBadgeVariant {
  return s;
}

/**
 * Pergunta 04 · Leitura das legendas — Caption Intelligence.
 */
export function ReportCaptionIntelligence({ data }: Props) {
  if (!data.available) {
    return (
      <Shell sampleSize={data.sampleSize}>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
          Captions são curtas demais ou em número insuficiente para uma
          leitura semântica fiável. À medida que houver mais publicações
          com texto, este bloco abre a interpretação editorial completa.
        </p>
        <PremiumTeaserStrip />
      </Shell>
    );
  }

  return (
    <Shell sampleSize={data.sampleSize}>
      <SnapshotRow data={data} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Left column: Evidence */}
        <div className="flex flex-col gap-7">
          <ThemesAndExpressionsBlock data={data} />
          <CtaBlock data={data} />
        </div>

        {/* Right column: Interpretation */}
        <div className="flex flex-col gap-6">
          <EditorialReadingBlock data={data} />
          <ActionBridgeStrip data={data} />
        </div>
      </div>

      <footer className="space-y-3 pt-2 border-t border-slate-100">
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Esta análise considera apenas legendas públicas. Não inclui áudio,
          vídeo, texto dentro de imagens ou transcrição de Reels. As hashtags
          são analisadas separadamente.
        </p>
        <PremiumTeaserStrip />
      </footer>
    </Shell>
  );
}

function Shell({ sampleSize, children }: { sampleSize: number; children: React.ReactNode }) {
  return (
    <section
      aria-label="Pergunta 04 · Leitura das legendas"
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white",
        "p-6 md:p-9",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]",
        "flex flex-col gap-6",
      )}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2 min-w-0">
          <p className="text-eyebrow-sm text-slate-500 inline-flex items-center gap-1.5">
            <Sparkles aria-hidden className="size-3 text-slate-400" />
            Pergunta 04 · Leitura das legendas
          </p>
          <h3 className="font-display text-[1.25rem] md:text-[1.5rem] font-semibold tracking-tight text-slate-900 leading-snug">
            O que as legendas revelam sobre a estratégia de conteúdo?
          </h3>
          <p className="text-[13px] text-slate-500 max-w-xl leading-relaxed">
            Análise ao texto das legendas públicas dos posts analisados
            — sem incluir áudio, vídeo ou transcrição de Reels.
          </p>
        </div>
        <span
          className={cn(
            "self-start inline-flex items-center rounded-full px-2.5 py-1",
            "text-eyebrow-sm ring-1",
            "bg-slate-50 text-slate-600 ring-slate-200",
          )}
        >
          Baseado em {sampleSize} {sampleSize === 1 ? "legenda" : "legendas"}
        </span>
      </header>
      {children}
    </section>
  );
}

function SectionHeader({ label, badge }: { label: string; badge?: SourceBadgeVariant }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-eyebrow-sm text-slate-500">{label}</p>
      {badge ? <SourceBadge variant={badge} /> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-blocos
// ─────────────────────────────────────────────────────────────────────

function SnapshotRow({ data }: { data: CaptionIntelligence }) {
  const s = data.snapshot;
  const isAiOpp = data.editorialReading.source === "ai";
  const cards: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: "Tema dominante", value: s.dominantTheme },
    { label: "Intenção principal", value: s.mainIntent },
    { label: "Oportunidade principal", value: s.mainOpportunity, highlight: isAiOpp },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            "rounded-xl ring-1 px-4 py-3.5 flex flex-col gap-1.5",
            c.highlight ? "bg-blue-50/50 ring-blue-100" : "bg-slate-50/60 ring-slate-200/60",
          )}
        >
          <span className="text-eyebrow-sm text-slate-500">{c.label}</span>
          <p className="text-[15px] md:text-[1.05rem] font-semibold tracking-tight text-slate-900 leading-snug">
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ThemesAndExpressionsBlock({ data }: { data: CaptionIntelligence }) {
  const items = data.themes.items.slice(0, 4);
  const expressions = data.recurringExpressions.items;
  const ROLE_LABELS: Record<string, string> = {
    educativo: "educativo",
    autoridade: "autoridade",
    conversão: "conversão",
    comunidade: "comunidade",
    opinião: "opinião",
    promocional: "promocional",
    outro: "outro",
  };
  const CONFIDENCE_STYLE: Record<ThemeConfidence, { label: string; color: string }> = {
    high: { label: "sinal forte", color: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
    medium: { label: "sinal médio", color: "text-blue-700 bg-blue-50 ring-blue-100" },
    low: { label: "sinal fraco", color: "text-slate-600 bg-slate-50 ring-slate-200" },
  };
  return (
    <div className="flex flex-col gap-3">
      <SectionHeader label="Temas dominantes" badge={badgeVariant(data.themes.source)} />
      <p className="text-[12px] text-slate-500 -mt-1">
        Assuntos mais recorrentes no texto das legendas — não confundir com hashtags.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sem temas semânticos suficientes nas legendas analisadas.
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {items.map((it, idx) => {
            const conf = CONFIDENCE_STYLE[it.confidence];
            return (
            <li
              key={`${it.label}-${idx}`}
              className="rounded-lg ring-1 ring-slate-200/50 bg-white px-3.5 py-2.5 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <span className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-[14px] font-semibold text-slate-900">
                  {it.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                  {it.postsCount} {it.postsCount === 1 ? "post" : "posts"}
                </span>
                <span className="inline-flex items-center gap-2 shrink-0">
                  <span className={cn("text-eyebrow-sm rounded-full px-2 py-0.5 ring-1", conf.color)}>
                    {conf.label}
                  </span>
                  <span className="text-eyebrow-sm text-slate-400">
                    {ROLE_LABELS[it.role] ?? it.role}
                  </span>
                </span>
              </div>
              {it.evidence ? (
                <p className="text-[13px] text-slate-500 italic leading-relaxed line-clamp-2 pl-7">
                  <span className="not-italic text-slate-400 mr-1">«</span>
                  {it.evidence}
                  <span className="not-italic text-slate-400 ml-0.5">»</span>
                </p>
              ) : null}
            </li>
            );
          })}
        </ol>
      )}

      {/* Expressões recorrentes — fundidas no mesmo bloco */}
      {expressions.length > 0 && (
        <div className="pt-3 mt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-eyebrow-sm text-slate-400">Expressões recorrentes</p>
            <SourceBadge variant={badgeVariant(data.recurringExpressions.source)} />
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {expressions.map((it) => (
              <li
                key={it.expression}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
                  "ring-1 ring-slate-200 bg-slate-50",
                  "text-[12px] text-slate-600",
                )}
              >
                <span>{it.expression}</span>
                <span className="font-mono text-[10px] tabular-nums text-slate-400">
                  ×{it.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CtaBlock({ data }: { data: CaptionIntelligence }) {
  const c = data.ctaPatterns;
  const STRENGTH_STYLE: Record<CtaStrength, { label: string; cls: string }> = {
    strong: { label: "Forte", cls: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
    moderate: { label: "Moderado", cls: "text-blue-700 bg-blue-50 ring-blue-100" },
    weak: { label: "Fraco", cls: "text-amber-700 bg-amber-50 ring-amber-200" },
  };
  const strength = STRENGTH_STYLE[c.ctaStrength];
  return (
    <div className="rounded-xl bg-slate-50/80 ring-1 ring-slate-100 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionHeader label="Chamadas à ação" badge={badgeVariant(c.source)} />
        <span className={cn("text-eyebrow-sm rounded-full px-2 py-0.5 ring-1 shrink-0", strength.cls)}>
          CTA {strength.label.toLowerCase()}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Stat label="Com CTA" value={`${c.hasCtaPct}%`} />
        <Stat label="Com pergunta" value={`${c.hasQuestionPct}%`} />
      </div>
      <p className="text-[13px] text-slate-700">
        <span className="text-eyebrow-sm text-slate-500 mr-1.5">CTA dominante</span>
        <span className="font-medium text-slate-900">{c.dominantCtaLabel}</span>
      </p>
      <p className="text-[13px] text-slate-600 leading-relaxed">{c.summary}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-eyebrow-sm text-slate-500">
        {label}
      </span>
      <span className="font-mono text-[1.25rem] tabular-nums text-slate-900">
        {value}
      </span>
    </div>
  );
}

function EditorialReadingBlock({ data }: { data: CaptionIntelligence }) {
  const r = data.editorialReading;
  const hasMissing = Boolean(r.whatIsMissing && r.whatIsMissing !== "—");
  const isAi = r.source === "ai";
  return (
    <div
      className={cn(
        "rounded-xl ring-1 overflow-hidden",
        isAi ? "bg-blue-50/50 ring-blue-100" : "bg-slate-50/80 ring-slate-100",
      )}
    >
      <div className={cn(isAi && "border-l-[3px] border-blue-400/60")}>
        <div className="p-5 md:p-6 flex flex-col gap-4 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {isAi ? (
                <Sparkles aria-hidden className="size-4 text-blue-500" />
              ) : (
                <Cpu aria-hidden className="size-3.5 text-slate-400" />
              )}
              <p className="text-eyebrow-sm text-slate-600 font-medium">Leitura editorial</p>
            </div>
            <SourceBadge variant={badgeVariant(r.source)} />
          </div>

          <p className={cn(
            "text-[14px] md:text-[15px] text-slate-700 leading-[1.7]",
            isAi && "italic",
          )}>
            {r.whatItCommunicates}
          </p>

          {r.whatWorks && r.whatWorks !== "—" ? (
            <ReadingLine label="O que está a funcionar" text={r.whatWorks} tone="slate" />
          ) : null}
          {hasMissing ? (
            <ReadingLine label="O que está em falta" text={r.whatIsMissing} tone="amber" />
          ) : null}
          {r.recommendedImprovement ? (
            <ReadingLine label="Próxima melhoria" text={r.recommendedImprovement} tone={isAi ? "blue" : "slate"} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReadingLine({
  label,
  text,
  tone = "slate",
}: {
  label: string;
  text: string;
  tone?: "slate" | "amber" | "blue";
}) {
  const labelTone =
    tone === "amber"
      ? "text-amber-700"
      : tone === "blue"
        ? "text-blue-700"
        : "text-slate-500";
  return (
    <p className="text-[13px] text-slate-700 leading-relaxed">
      <span
        className={cn(
          "text-eyebrow-sm mr-1.5",
          labelTone,
        )}
      >
        {label}
      </span>
      {text}
    </p>
  );
}

function PremiumTeaserStrip() {
  return (
    <div
      className={cn(
        "rounded-lg ring-1 px-4 py-3 flex items-start gap-3",
        "bg-amber-50/30 ring-amber-200/50",
      )}
    >
      <Lock aria-hidden className="size-3.5 mt-0.5 shrink-0 text-amber-600/60" />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ring-1",
            "text-eyebrow-sm bg-amber-100/60 text-amber-700 ring-amber-300/50",
          )}
        >
          <Crown aria-hidden className="size-2.5" />
          PRO
        </span>
        <p className="text-[13px] text-slate-600 font-medium mt-1">
          Análise completa de Reels e vídeo
        </p>
        <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
          Inclui transcrição de Reels/vídeos, hooks falados e comparação
          entre o que é dito e o que é escrito na legenda.
        </p>
      </div>
    </div>
  );
}

function ActionBridgeStrip({ data }: { data: CaptionIntelligence }) {
  const ab = data.actionBridge;
  if (!ab.body || ab.body.length < 5) return null;
  const Icon = ab.priorityType === "alta" ? AlertTriangle : Lightbulb;
  return (
    <div
      className={cn(
        "rounded-xl ring-1 px-4 py-3.5 flex items-start gap-3",
        ab.priorityType === "alta"
          ? "bg-rose-50/60 ring-rose-200"
          : "bg-blue-50/50 ring-blue-100",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 mt-0.5 shrink-0",
          ab.priorityType === "alta" ? "text-rose-600" : "text-blue-600",
        )}
      />
      <div className="min-w-0">
        <p className="text-eyebrow-sm text-slate-600 mb-0.5">Próximo passo recomendado</p>
        <p className="text-[13px] text-slate-800 leading-relaxed">{ab.body}</p>
      </div>
    </div>
  );
}
