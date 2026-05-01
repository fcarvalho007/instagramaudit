import { MessageSquareQuote, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  CaptionIntelligence,
  CaptionSourceKind,
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

      <p className="text-[12.5px] text-slate-500 leading-relaxed border-t border-slate-100 pt-4 mt-2">
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
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 inline-flex items-center gap-1.5">
            <Sparkles aria-hidden className="size-3 text-slate-400" />
            Pergunta 04 · Leitura das legendas
          </p>
          <h3 className="font-display text-[1.25rem] md:text-[1.5rem] font-semibold tracking-tight text-slate-900 leading-snug">
            O que as legendas revelam sobre a estratégia de conteúdo?
          </h3>
          <p className="text-[13px] text-slate-500 max-w-xl">
            Baseado na leitura das legendas dos posts analisados — não
            apenas em hashtags.
          </p>
        </div>
        <span
          className={cn(
            "self-start inline-flex items-center rounded-full px-2.5 py-1",
            "font-mono text-[10px] uppercase tracking-[0.14em] ring-1",
            "bg-slate-50 text-slate-600 ring-slate-200",
          )}
        >
          Baseado em {sampleSize} {sampleSize === 1 ? "post" : "posts"}
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
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <SourceBadge variant={variant} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-blocos
// ─────────────────────────────────────────────────────────────────────

function ThemesBlock({ data }: { data: CaptionIntelligence }) {
  const items = data.themes.items;
  return (
    <div className="flex flex-col gap-3">
      <BlockHeader label="Temas dominantes" variant={badgeVariant(data.themes.source)} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sem temas semânticos suficientes nas legendas analisadas.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-slate-100">
          {items.map((it, idx) => (
            <li
              key={`${it.label}-${idx}`}
              className="py-3 first:pt-0 last:pb-0 flex flex-col gap-1.5"
            >
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] md:text-[16px] font-semibold text-slate-900 truncate">
                  {it.label}
                </span>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                  {it.postsCount} {it.postsCount === 1 ? "post" : "posts"}
                </span>
              </div>
              {it.evidence ? (
                <p className="pl-6 text-[13px] text-slate-600 italic leading-relaxed">
                  <MessageSquareQuote
                    aria-hidden
                    className="inline size-3.5 -mt-1 mr-1 text-slate-400"
                  />
                  <span className="not-italic font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 mr-1.5">
                    excerto real
                  </span>
                  {it.evidence}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ContentTypeMixBlock({ data }: { data: CaptionIntelligence }) {
  const { items, dominant } = data.contentTypeMix;
  return (
    <div className="flex flex-col gap-3">
      <BlockHeader label="Tipo de conteúdo" variant={badgeVariant(data.contentTypeMix.source)} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sem categorias claras com base nas legendas analisadas.
        </p>
      ) : (
        <>
          {dominant ? (
            <p className="text-sm text-slate-700">
              Predomínio:{" "}
              <span className="font-semibold text-slate-900">{dominant}</span>
            </p>
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
  return (
    <div className="rounded-xl bg-slate-50/80 ring-1 ring-slate-100 p-5 flex flex-col gap-3">
      <BlockHeader label="Chamadas à ação" variant={badgeVariant(c.source)} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Com CTA" value={`${c.hasCtaPct}%`} />
        <Stat label="Com pergunta" value={`${c.hasQuestionPct}%`} />
      </div>
      <p className="text-[13px] text-slate-700">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 mr-1.5">
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
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="font-mono text-[18px] tabular-nums text-slate-900">
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
          "font-mono text-[10px] uppercase tracking-[0.14em] mr-1.5",
          labelTone,
        )}
      >
        {label}
      </span>
      {text}
    </p>
  );
}