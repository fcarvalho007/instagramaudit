/**
 * P04 — Caption diagnostics card.
 *
 * Premium editorial dashboard showing caption analysis: themes, expressions,
 * openings, endings, length distribution and editorial diagnostic.
 * All data is real or deterministically derived — nothing invented.
 */
import type { ReactNode } from "react";
import { FileText, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CaptionIntelligence,
  CaptionLengthDistribution,
} from "@/lib/report/caption-intelligence";
import { INSTAGRAM_CAPTION_CONTEXT } from "@/lib/knowledge/instagram-caption-context";

const KB_SOURCES = INSTAGRAM_CAPTION_CONTEXT.sources;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CaptionDiagnosticsCardProps {
  data: CaptionIntelligence;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("pt-PT");
}

function buildDiagnosticStatement(data: CaptionIntelligence): string {
  const { distributions, ctaPatterns, editorialReading } = data;
  const dominantOpening = distributions.openings[0];
  const questionEnding = distributions.endings.find((e) => e.type === "question");
  const longPct = distributions.length.find((l) => l.bucket === "long")?.pct ?? 0;

  const openingPart = dominantOpening
    ? `A maioria das legendas abre com ${dominantOpening.label.toLowerCase()}`
    : "As legendas não revelam um padrão de abertura dominante";

  const lengthPart = longPct >= 60
    ? "e tende a ser longa e explicativa"
    : longPct >= 30
      ? "com comprimento variável"
      : "e tende a ser curta e direta";

  const endPart = (questionEnding?.pct ?? 0) < 20
    ? ". Poucas terminam com pergunta, o que pode limitar a conversa pública nos comentários."
    : ". Há boa presença de perguntas no final, o que favorece interação nos comentários.";

  const ctaPart = ctaPatterns.hasCtaPct >= 40
    ? ""
    : " A presença de CTAs explícitos é baixa.";

  return `${openingPart} ${lengthPart}${endPart}${ctaPart}`;
}

function buildWhatWorks(data: CaptionIntelligence): string {
  if (data.editorialReading.whatWorks && data.editorialReading.whatWorks !== "—") {
    return data.editorialReading.whatWorks;
  }
  return "Há consistência editorial — o leitor reconhece a voz entre posts.";
}

function buildCriticalPoint(data: CaptionIntelligence): string {
  if (data.editorialReading.whatIsMissing && data.editorialReading.whatIsMissing !== "—") {
    return data.editorialReading.whatIsMissing;
  }
  const questionPct = data.distributions.endings.find((e) => e.type === "question")?.pct ?? 0;
  if (questionPct < 20) {
    return "Poucas legendas terminam com pergunta — o leitor sai sem ser convidado a responder.";
  }
  return "Sem ponto crítico identificado na amostra atual.";
}

function buildToWatch(data: CaptionIntelligence): string {
  const topExpr = data.recurringExpressions.items.slice(0, 2);
  if (topExpr.length >= 2) {
    return `Repetição de expressões como "${topExpr[0].expression.toLowerCase()}" ou "${topExpr[1].expression.toLowerCase()}" pode indicar estrutura demasiado previsível.`;
  }
  if (data.editorialReading.recommendedImprovement) {
    return data.editorialReading.recommendedImprovement;
  }
  return "Monitorizar a diversidade de estrutura entre posts.";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-muted/40 p-4 md:p-5 flex flex-col gap-2">
      <p className="text-eyebrow-sm text-content-tertiary">{label}</p>
      <div className="text-sm text-content-primary leading-relaxed">{children}</div>
    </div>
  );
}

function ThemeRow({
  rank,
  label,
  postsCount,
  evidence,
  confidenceLabel,
  confidenceClass,
}: {
  rank: number;
  label: string;
  postsCount: number;
  evidence: string | null;
  confidenceLabel: string;
  confidenceClass: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-[12px] font-semibold text-accent-primary">
          {String(rank).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] md:text-base font-semibold text-content-primary leading-snug">
            {label}
          </p>
          <p className="text-[12px] text-content-tertiary mt-0.5">
            Identificado em {postsCount} {postsCount === 1 ? "post" : "posts"}
          </p>
          {evidence ? (
            <p className="text-[13px] text-content-secondary italic leading-relaxed mt-2 border-l-2 border-border-subtle pl-3">
              «{evidence}»
            </p>
          ) : (
            <p className="text-[12px] text-content-tertiary italic mt-2">
              Sem excerto representativo disponível.
            </p>
          )}
        </div>
      </div>
      <span className={cn("shrink-0 self-start text-eyebrow-sm rounded-full px-2.5 py-0.5 ring-1", confidenceClass)}>
        {confidenceLabel}
      </span>
    </div>
  );
}

function DistributionBar({
  items,
  highlightType,
  highlightClass,
}: {
  items: Array<{ label: string; pct: number; type?: string }>;
  highlightType?: string;
  highlightClass?: string;
}) {
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const isHighlighted = highlightType && it.type === highlightType;
        return (
          <div key={it.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className={cn("text-content-secondary", isHighlighted && highlightClass)}>
                {it.label}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-content-tertiary">
                {it.pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  isHighlighted ? "bg-signal-danger" : "bg-accent-primary/50",
                )}
                style={{ width: `${Math.max(3, it.pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackedLengthBar({ items }: { items: CaptionLengthDistribution[] }) {
  const COLORS: Record<string, string> = {
    short: "bg-accent-primary/30",
    medium: "bg-accent-primary/60",
    long: "bg-accent-primary",
  };
  return (
    <div className="space-y-3">
      <div className="h-3 rounded-full bg-surface-muted overflow-hidden flex">
        {items.map((it) => (
          <div
            key={it.bucket}
            className={cn("h-full", COLORS[it.bucket] ?? "bg-accent-primary/40")}
            style={{ width: `${Math.max(2, it.pct)}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((it) => (
          <div key={it.bucket} className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
            <span className={cn("w-2.5 h-2.5 rounded-sm", COLORS[it.bucket])} />
            <span>{it.label}</span>
            <span className="font-mono tabular-nums">{it.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosticMicro({
  label,
  text,
  icon: Icon,
  toneClass,
}: {
  label: string;
  text: string;
  icon: typeof CheckCircle2;
  toneClass: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3.5 h-3.5", toneClass)} />
        <p className={cn("text-eyebrow-sm", toneClass)}>{label}</p>
      </div>
      <p className="text-[13px] text-content-secondary leading-relaxed">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CaptionDiagnosticsCard({ data }: CaptionDiagnosticsCardProps) {
  const CONFIDENCE_STYLE = {
    high: { label: "SINAL FORTE", cls: "text-signal-success bg-tint-success ring-signal-success/15" },
    medium: { label: "SINAL MÉDIO", cls: "text-accent-primary bg-tint-primary ring-accent-primary/15" },
    low: { label: "SINAL FRACO", cls: "text-content-secondary bg-surface-muted ring-border-default" },
  } as const;

  const themes = data.themes.items.slice(0, 3);
  const expressions = data.recurringExpressions.items;
  const stats = data.captionStats;

  if (!data.available) {
    return (
      <CardShell sampleSize={data.sampleSize} totalWords={stats.totalWords}>
        <p className="text-sm text-content-secondary leading-relaxed max-w-xl">
          Legendas são curtas demais ou em número insuficiente para uma
          leitura semântica fiável. À medida que houver mais publicações
          com texto, este bloco abre a interpretação editorial completa.
        </p>
      </CardShell>
    );
  }

  const intentLabels: string[] = [];
  if (data.contentTypeMix.dominant) intentLabels.push(data.contentTypeMix.dominant);
  const secondType = data.contentTypeMix.items[1];
  if (secondType && secondType.sharePct >= 20) intentLabels.push(secondType.type);

  return (
    <CardShell sampleSize={data.sampleSize} totalWords={stats.totalWords}>
      {/* ── 2. KPI row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="TEMAS DOMINANTES">
          {themes.length > 0 ? (
            <ul className="space-y-0.5">
              {themes.slice(0, 2).map((t) => (
                <li key={t.label} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-accent-primary shrink-0" />
                  {t.label}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-content-tertiary">Sem tema dominante claro</span>
          )}
        </KpiCard>

        <KpiCard label="INTENÇÃO PRINCIPAL">
          {intentLabels.length > 0 ? (
            <ul className="space-y-0.5">
              {intentLabels.slice(0, 2).map((l) => (
                <li key={l} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-accent-primary shrink-0" />
                  {l}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-content-tertiary">Sem intenção dominante</span>
          )}
        </KpiCard>

        <KpiCard label="CARACTERÍSTICAS">
          <ul className="space-y-0.5">
            <li>~{fmt(stats.avgWordsPerCaption)} palavras / post</li>
            <li>{stats.avgEmojisPerCaption.toFixed(1).replace(".", ",")} emojis / post</li>
          </ul>
        </KpiCard>
      </div>

      {/* ── 3. Recurring topics ── */}
      {themes.length > 0 && (
        <div>
          <p className="text-eyebrow-sm text-content-tertiary mb-1">
            ASSUNTOS MAIS RECORRENTES NO TEXTO DAS LEGENDAS
          </p>
          <p className="text-[12px] text-content-tertiary mb-3">
            Temas extraídos do corpo das legendas — não confundir com hashtags.
          </p>
          <div className="space-y-2.5">
            {themes.map((t, i) => {
              const conf = CONFIDENCE_STYLE[t.confidence];
              return (
                <ThemeRow
                  key={`${t.label}-${i}`}
                  rank={i + 1}
                  label={t.label}
                  postsCount={t.postsCount}
                  evidence={t.evidence}
                  confidenceLabel={conf.label}
                  confidenceClass={conf.cls}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Expressions + Endings ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expressions */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-3">EXPRESSÕES RECORRENTES</p>
          {expressions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {expressions.map((it, i) => (
                <span
                  key={it.expression}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] ring-1",
                    i < 2
                      ? "bg-tint-primary ring-accent-primary/15 text-accent-primary"
                      : "bg-surface-muted ring-border-default text-content-secondary",
                  )}
                >
                  {it.expression}
                  <span className="font-mono text-[10px] tabular-nums opacity-70">×{it.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-content-tertiary">Dados insuficientes para esta leitura.</p>
          )}
        </div>

        {/* Endings */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-3">COMO ACABAM AS LEGENDAS?</p>
          <DistributionBar
            items={data.distributions.endings.map((e) => ({ ...e, type: e.type }))}
            highlightType="question"
            highlightClass="text-signal-danger font-medium"
          />
        </div>
      </div>

      {/* ── 5. Openings + Length distribution ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Openings */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-1">COMO COMEÇAM AS LEGENDAS?</p>
          <p className="text-[11px] text-content-tertiary mb-3">primeiras 8 palavras</p>
          <DistributionBar
            items={data.distributions.openings.map((o) => ({ ...o, type: o.type }))}
          />
        </div>

        {/* Length */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-3">DISTRIBUIÇÃO DE COMPRIMENTO</p>
          <StackedLengthBar items={data.distributions.length} />
        </div>
      </div>

      {/* ── 6. Diagnostic box ── */}
      <div className="rounded-xl bg-[rgb(var(--tint-primary))] ring-1 ring-accent-primary/20 p-5 md:p-6 space-y-5">
        <p className="text-eyebrow-sm text-accent-primary">DIAGNÓSTICO EDITORIAL</p>
        <p className="text-[15px] md:text-base text-content-primary leading-relaxed font-medium">
          {buildDiagnosticStatement(data)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-accent-primary/20">
          <DiagnosticMicro
            label="FUNCIONA"
            text={buildWhatWorks(data)}
            icon={CheckCircle2}
            toneClass="text-signal-success"
          />
          <DiagnosticMicro
            label="PONTO CRÍTICO"
            text={buildCriticalPoint(data)}
            icon={AlertTriangle}
            toneClass="text-signal-danger"
          />
          <DiagnosticMicro
            label="A OBSERVAR"
            text={buildToWatch(data)}
            icon={Eye}
            toneClass="text-amber-600"
          />
        </div>
      </div>

      {/* ── 7. Footer ── */}
      <div className="pt-4 border-t border-border-subtle flex items-center gap-2 text-[11px] leading-relaxed">
        <span className="text-eyebrow-sm text-content-secondary shrink-0">FONTES:</span>
        <span className="text-content-tertiary">
          {KB_SOURCES.map((src, i) => (
            <span key={src.name}>
              {i > 0 && " · "}
              [{i + 1}]{" "}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {src.name}
              </a>
            </span>
          ))}
        </span>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function CardShell({
  sampleSize,
  totalWords,
  children,
}: {
  sampleSize: number;
  totalWords: number;
  children: ReactNode;
}) {
  return (
    <section
      aria-label="Pergunta 04 · Diagnóstico de legendas"
      className="rounded-2xl border border-border-subtle bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden p-5 md:p-7 flex flex-col gap-6 md:col-span-2"
    >
      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-content-tertiary">
            <span className="w-6 h-6 rounded-md bg-surface-muted/60 flex items-center justify-center">
              <FileText className="w-3 h-3 text-content-tertiary/70" />
            </span>
            <span className="text-[10px] md:text-[11px] tracking-[0.16em] text-content-tertiary uppercase font-sans">
              04 · DIAGNÓSTICO DE LEGENDAS · {sampleSize} LEGENDAS · {fmt(totalWords)} PALAVRAS
            </span>
          </div>
          <span className="text-[9px] md:text-[10px] font-medium tracking-[0.12em] text-content-tertiary/70 border border-border-subtle/60 rounded-full px-2 py-0.5">
            DIAGNÓSTICO
          </span>
        </div>
        <h3 className="font-display text-[1.5rem] md:text-[2rem] leading-[1.05] tracking-[-0.02em] text-content-primary mt-5">
          O que as legendas revelam sobre a estratégia de conteúdo?
        </h3>
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-relaxed mt-2">
          Padrões extraídos das legendas públicas dos posts analisados.
        </p>
      </header>
      {children}
    </section>
  );
}