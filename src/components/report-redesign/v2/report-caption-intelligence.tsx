import { AlertTriangle, Lightbulb, MessageSquareQuote, Sparkles } from "lucide-react";
import { Crown, Lock } from "lucide-react";

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
 *
 * Substitui o antigo `ReportThemesFeature`. Mostra 5 sub-blocos com
 * badges explícitas de origem (Dados extraídos / Leitura automática /
 * Leitura IA) para tornar credível que as captions foram efectivamente
 * lidas e interpretadas — não apenas tokenizadas.
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
      </Shell>
    );
  }

  return (
    <Shell sampleSize={data.sampleSize}>
        <SnapshotRow data={data} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
        {/* Coluna esquerda: temas + tipo de conteúdo + expressões */}
        <div className="md:col-span-3 flex flex-col gap-7">
          <ThemesBlock data={data} />
          <ContentTypeMixBlock data={data} />
          <RecurringExpressionsBlock data={data} />
        </div>

        {/* Coluna direita: CTA + leitura editorial */}
        <aside className="md:col-span-2 flex flex-col gap-6">
          <CtaBlock data={data} />
          <EditorialReadingBlock data={data} />
        </aside>
      </div>

      <ActionBridgeStrip data={data} />

      <p className="text-[12.5px] text-slate-500 leading-relaxed border-t border-slate-200/40 pt-4 mt-2">
        As hashtags são analisadas separadamente. Esta leitura considera o
        texto das legendas, CTAs, temas recorrentes e padrões editoriais
        dos posts analisados.
      </p>
    </Shell>
  );
}

function Shell({
  sampleSize,
  children,
}: {
  sampleSize: number;
  children: React.ReactNode;
}) {
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
          <p className="text-[13px] text-slate-500 max-w-xl">
            Baseado na leitura das legendas públicas dos posts analisados
            — não inclui transcrição do que é dito em vídeo.
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

function BlockHeader({
  label,
  variant,
}: {
  label: string;
  variant: SourceBadgeVariant;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-eyebrow-sm text-slate-500">
        {label}
      </p>
      <SourceBadge variant={variant} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-blocos
// ─────────────────────────────────────────────────────────────────────

function SnapshotRow({ data }: { data: CaptionIntelligence }) {
  const s = data.snapshot;
  const cards: Array<{ label: string; value: string; variant: SourceBadgeVariant }> = [
    { label: "Tema dominante", value: s.dominantTheme, variant: "auto" },
    { label: "Intenção principal", value: s.mainIntent, variant: "auto" },
    {
      label: "Oportunidade principal",
      value: s.mainOpportunity,
      variant: data.editorialReading.source === "ai" ? "ai" : "auto",
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            "rounded-xl ring-1 px-4 py-3.5 flex flex-col gap-2 transition-shadow",
            c.variant === "ai"
              ? "bg-blue-50/50 ring-blue-100"
              : "bg-slate-50/60 ring-slate-200/60",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-eyebrow-sm text-slate-500">{c.label}</span>
            <SourceBadge variant={c.variant} />
          </div>
          <p className="font-display text-[1.05rem] md:text-[1.125rem] font-semibold tracking-tight text-slate-900 leading-snug">
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ThemesBlock({ data }: { data: CaptionIntelligence }) {
  const items = data.themes.items;
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
      <BlockHeader label="Temas dominantes" variant={badgeVariant(data.themes.source)} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sem temas semânticos suficientes nas legendas analisadas.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((it, idx) => {
            const conf = CONFIDENCE_STYLE[it.confidence];
            return (
            <li
              key={`${it.label}-${idx}`}
              className="rounded-lg ring-1 ring-slate-200/70 bg-white p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <span className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] md:text-[16px] font-semibold text-slate-900">
                  {it.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                  {it.postsCount} {it.postsCount === 1 ? "post" : "posts"}
                </span>
                <span className={cn("text-eyebrow-sm rounded-full px-2 py-0.5 ring-1 shrink-0", conf.color)}>
                  {conf.label}
                </span>
                <span className="text-eyebrow-sm text-slate-400 shrink-0">
                  papel: {ROLE_LABELS[it.role] ?? it.role}
                </span>
              </div>
              {it.evidence ? (
                <p className="text-[13px] text-slate-600 italic leading-relaxed">
                  <MessageSquareQuote
                    aria-hidden
                    className="inline size-3.5 -mt-1 mr-1 text-slate-400"
                  />
                  <span className="text-eyebrow-sm not-italic text-slate-400 mr-1.5">
                    excerto real
                  </span>
                  {it.evidence}
                </p>
              ) : null}
            </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ContentTypeMixBlock({ data }: { data: CaptionIntelligence }) {
  const { items, dominant } = data.contentTypeMix;
  const dominantItem = items.find((it) => it.type === dominant);
  return (
    <div className="flex flex-col gap-3">
      <BlockHeader label="Tipo de conteúdo" variant={badgeVariant(data.contentTypeMix.source)} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sem categorias claras com base nas legendas analisadas.
        </p>
      ) : (
        <>
          {dominant && dominantItem ? (
            <div className="rounded-lg bg-blue-50/60 ring-1 ring-blue-100 px-3.5 py-2.5 space-y-1">
              <p className="text-eyebrow-sm text-blue-700">Função dominante</p>
              <p className="font-display text-[1.05rem] font-semibold tracking-tight text-slate-900">
                {dominant}
              </p>
              <p className="text-[13px] text-slate-600">
                {dominantItem.count} de {data.sampleSize} legendas com sinais de {dominant.toLowerCase()}.
              </p>
            </div>
          ) : null}
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <li key={it.type} className="flex items-center gap-3">
                <span className="text-[13px] text-slate-700 w-44 shrink-0 truncate">
                  {it.type}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, Math.max(4, it.sharePct))}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 w-10 text-right shrink-0">
                  {it.sharePct}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RecurringExpressionsBlock({ data }: { data: CaptionIntelligence }) {
  const items = data.recurringExpressions.items;
  return (
    <div className="flex flex-col gap-3">
      <BlockHeader label="Expressões recorrentes" variant={badgeVariant(data.recurringExpressions.source)} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sem expressões com peso suficiente nas legendas analisadas.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((it) => (
            <li
              key={it.expression}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1",
                "ring-1 ring-slate-200 bg-slate-50",
                "text-[13px] text-slate-700",
              )}
            >
              <span>{it.expression}</span>
              <span className="font-mono text-[10px] tabular-nums text-slate-500">
                ×{it.count}
              </span>
            </li>
          ))}
        </ul>
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
    <div className="rounded-xl bg-slate-50/80 ring-1 ring-slate-100 p-5 flex flex-col gap-3">
      <BlockHeader label="Chamadas à ação" variant={badgeVariant(c.source)} />
      <div className="flex items-center gap-2">
        <span className="text-eyebrow-sm text-slate-500">Força CTA</span>
        <span className={cn("text-eyebrow-sm rounded-full px-2 py-0.5 ring-1", strength.cls)}>
          {strength.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Com CTA" value={`${c.hasCtaPct}%`} />
        <Stat label="Com pergunta" value={`${c.hasQuestionPct}%`} />
      </div>
      <p className="text-[13px] text-slate-700">
        <span className="text-eyebrow-sm text-slate-500 mr-1.5">
          CTA dominante
        </span>
        <span className="font-semibold text-slate-900">{c.dominantCtaLabel}</span>
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
  const hasMissing = r.whatIsMissing && r.whatIsMissing !== "—";
  return (
    <div
      className={cn(
        "rounded-xl p-5 ring-1 flex flex-col gap-3",
        r.source === "ai"
          ? "bg-blue-50/60 ring-blue-100"
          : "bg-slate-50/80 ring-slate-100",
      )}
    >
      <BlockHeader label="Leitura editorial" variant={badgeVariant(r.source)} />
      <p className="text-[14px] text-slate-700 leading-relaxed">
        {r.whatItCommunicates}
      </p>
      {r.whatWorks && r.whatWorks !== "—" ? (
        <ReadingLine label="O que está a funcionar" text={r.whatWorks} />
      ) : null}
      {hasMissing ? (
        <ReadingLine
          label="O que está em falta"
          text={r.whatIsMissing}
          tone="amber"
        />
      ) : null}
      {r.recommendedImprovement ? (
        <ReadingLine
          label="Próxima melhoria"
          text={r.recommendedImprovement}
          tone={r.source === "ai" ? "blue" : "slate"}
        />
      ) : null}
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

function ActionBridgeStrip({ data }: { data: CaptionIntelligence }) {
  const ab = data.actionBridge;
  if (!ab.body || ab.body.length < 5) return null;
  const Icon = ab.priorityType === "alta" ? AlertTriangle : Lightbulb;
  return (
    <div
      className={cn(
        "rounded-xl ring-1 px-5 py-4 flex items-start gap-3",
        ab.priorityType === "alta"
          ? "bg-amber-50/60 ring-amber-200"
          : "bg-blue-50/50 ring-blue-100",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 mt-0.5 shrink-0",
          ab.priorityType === "alta" ? "text-amber-600" : "text-blue-600",
        )}
      />
      <div className="min-w-0">
        <p className="text-eyebrow-sm text-slate-600 mb-1">{ab.title}</p>
        <p className="text-[14px] text-slate-800 leading-relaxed">{ab.body}</p>
      </div>
    </div>
  );
}