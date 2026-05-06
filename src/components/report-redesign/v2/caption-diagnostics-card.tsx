/**
 * P04 — Caption diagnostics card.
 *
 * Premium editorial dashboard showing caption analysis: themes, expressions,
 * openings, endings, length distribution and editorial diagnostic.
 * All data is real or deterministically derived — nothing invented.
 */
import type { ReactNode } from "react";
import { FileText, CheckCircle2, AlertTriangle, Eye, Type, Zap, HelpCircle, BookOpen, Sparkles, Mic, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CaptionIntelligence,
  CaptionLengthDistribution,
  CaptionOpeningType,
} from "@/lib/report/caption-intelligence";
import { INSTAGRAM_CAPTION_CONTEXT } from "@/lib/knowledge/instagram-caption-context";
import type { CaptionSemanticAnalysis } from "@/lib/report/caption-semantic-types";

const KB_SOURCES = INSTAGRAM_CAPTION_CONTEXT.sources;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CaptionDiagnosticsCardProps {
  data: CaptionIntelligence;
  /** OpenAI semantic analysis — null when not available. */
  semantic?: CaptionSemanticAnalysis | null;
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
    <div className="rounded-2xl border border-border-subtle bg-surface-muted/40 p-4 md:p-5 flex flex-col gap-2.5">
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

// ---------------------------------------------------------------------------
// Opening icon map
// ---------------------------------------------------------------------------

const OPENING_ICONS: Record<CaptionOpeningType, LucideIcon> = {
  bold_statement: Type,
  news_or_update: Zap,
  question: HelpCircle,
  story: BookOpen,
};

function OpeningsDistribution({ items }: { items: Array<{ type: CaptionOpeningType; label: string; pct: number }> }) {
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const Icon = OPENING_ICONS[it.type];
        return (
          <div key={it.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="flex items-center gap-1.5 text-content-secondary">
                {Icon && <Icon className="w-3.5 h-3.5 text-content-tertiary/70 shrink-0" />}
                {it.label}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-content-tertiary">
                {it.pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-primary/50"
                style={{ width: `${Math.max(3, it.pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EndingsDistribution({ items }: { items: Array<{ type: string; label: string; pct: number }> }) {
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const isQuestionLow = it.type === "question" && it.pct < 20;
        const isQuestionOk = it.type === "question" && it.pct >= 20;
        return (
          <div key={it.label} className={cn("rounded-lg px-2 py-1.5 -mx-2", isQuestionLow && "bg-rose-50")}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className={cn(
                "text-content-secondary",
                isQuestionLow && "text-rose-600 font-medium",
                isQuestionOk && "text-signal-success font-medium",
              )}>
                {it.label}
              </span>
              <span className={cn(
                "font-mono text-[11px] tabular-nums text-content-tertiary",
                isQuestionLow && "text-rose-500",
              )}>
                {it.pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  isQuestionLow ? "bg-rose-400" : "bg-accent-primary/50",
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

function StackedLengthBar({ items, dominantBucket }: { items: CaptionLengthDistribution[]; dominantBucket?: string }) {
  const COLORS: Record<string, string> = {
    short: "bg-accent-primary/30",
    medium: "bg-accent-primary/60",
    long: "bg-accent-primary",
  };
  return (
    <div className="space-y-3">
      <div className="h-4 rounded-full bg-surface-muted overflow-hidden flex items-end">
        {items.map((it) => (
          <div
            key={it.bucket}
            className={cn(
              COLORS[it.bucket] ?? "bg-accent-primary/40",
              it.bucket === dominantBucket ? "h-full" : "h-2.5",
            )}
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

export function CaptionDiagnosticsCard({ data, semantic }: CaptionDiagnosticsCardProps) {
  const CONFIDENCE_STYLE = {
    high: { label: "SINAL FORTE", cls: "text-signal-success bg-tint-success ring-signal-success/15" },
    medium: { label: "SINAL MÉDIO", cls: "text-accent-primary bg-tint-primary ring-accent-primary/15" },
    low: { label: "SINAL FRACO", cls: "text-content-secondary bg-surface-muted ring-border-default" },
  } as const;

  const hasSemantic = semantic != null;
  const themes = data.themes.items.slice(0, 3);
  const semanticThemes = semantic?.dominantThemes?.slice(0, 3) ?? [];
  const expressions = data.recurringExpressions.items;
  const semanticExpressions = semantic?.recurringExpressionsInterpretation ?? [];
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
          {hasSemantic && semanticThemes.length > 0 ? (
            <ul className="space-y-0.5">
              {semanticThemes.slice(0, 2).map((t) => (
                <li key={t.label} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-accent-primary shrink-0" />
                  {t.label}
                </li>
              ))}
            </ul>
          ) : themes.length > 0 ? (
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
          {hasSemantic && semantic.contentIntent ? (
            <ul className="space-y-0.5">
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent-primary shrink-0" />
                {semantic.contentIntent.primary}
              </li>
              {semantic.contentIntent.secondary && (
                <li className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-accent-primary shrink-0" />
                  {semantic.contentIntent.secondary}
                </li>
              )}
            </ul>
          ) : intentLabels.length > 0 ? (
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
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[12px] text-content-tertiary mb-0.5">Média de palavras por legenda</p>
              <span className="text-[22px] font-mono font-semibold tabular-nums text-content-primary leading-none">
                ~{fmt(stats.avgWordsPerCaption)}
              </span>
            </div>
            <div>
              <p className="text-[12px] text-content-tertiary mb-0.5">Média de emojis por post</p>
              <span className="text-[22px] font-mono font-semibold tabular-nums text-content-primary leading-none">
                {stats.avgEmojisPerCaption.toFixed(1).replace(".", ",")}
              </span>
            </div>
          </div>
        </KpiCard>
      </div>

      {/* ── 3. Recurring topics ── */}
      {(hasSemantic ? semanticThemes.length > 0 : themes.length > 0) && (
        <div>
          <p className="text-eyebrow-sm text-content-tertiary mb-1">
            ASSUNTOS MAIS RECORRENTES NO TEXTO DAS LEGENDAS
          </p>
          <p className="text-[12px] text-content-tertiary mb-3">
            {hasSemantic
              ? "Temas identificados por análise semântica das legendas."
              : "Temas extraídos do corpo das legendas — não confundir com hashtags."}
          </p>
          <div className="space-y-2.5">
            {hasSemantic
              ? semanticThemes.map((t, i) => {
                  const conf = CONFIDENCE_STYLE[t.confidence];
                  return (
                    <ThemeRow
                      key={`${t.label}-${i}`}
                      rank={i + 1}
                      label={t.label}
                      postsCount={t.postsCount}
                      evidence={t.evidence[0] ?? null}
                      confidenceLabel={conf.label}
                      confidenceClass={conf.cls}
                    />
                  );
                })
              : themes.map((t, i) => {
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
          {hasSemantic && semanticExpressions.length > 0 ? (
            <div className="space-y-1.5">
              {semanticExpressions.map((it, i) => (
                <div
                  key={it.expression}
                  className={cn(
                    "rounded-lg px-3 py-2 ring-1",
                    i < 2
                      ? "bg-tint-primary ring-accent-primary/15"
                      : "bg-surface-muted ring-border-default",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[13px] font-medium",
                      i < 2 ? "text-accent-primary" : "text-content-secondary",
                    )}>
                      {it.expression}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-content-tertiary shrink-0 ml-2">
                      ×{it.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-content-tertiary mt-1 leading-relaxed">{it.meaning}</p>
                  {it.risk && (
                    <p className="text-[10px] text-signal-danger mt-0.5">⚠ {it.risk}</p>
                  )}
                </div>
              ))}
            </div>
          ) : expressions.length > 0 ? (
            <div className="space-y-1.5">
              {expressions.map((it, i) => {
                const TYPE_LABEL: Record<string, string> = {
                  topic: "Tema",
                  cta: "CTA",
                  brand: "Marca",
                  product: "Produto",
                  community: "Comunidade",
                  other: "Outro",
                };
                return (
                  <div
                    key={it.expression}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 ring-1",
                      i < 2
                        ? "bg-tint-primary ring-accent-primary/15"
                        : "bg-surface-muted ring-border-default",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "text-[13px] font-medium",
                        i < 2 ? "text-accent-primary" : "text-content-secondary",
                      )}>
                        {it.expression}
                      </span>
                      <span className="text-[10px] text-content-tertiary rounded-full bg-surface-muted px-1.5 py-0.5 ring-1 ring-border-default">
                        {TYPE_LABEL[it.type] ?? "Outro"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-content-tertiary shrink-0 ml-2">
                      ×{it.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-content-tertiary">Dados insuficientes para esta leitura.</p>
          )}
        </div>

        {/* Endings */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-3">COMO ACABAM AS LEGENDAS?</p>
          <EndingsDistribution items={data.distributions.endings} />
        </div>
      </div>

      {/* ── 4b. Comment engagement ── */}
      <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
        <p className="text-eyebrow-sm text-content-tertiary mb-2">PEDE COMENTÁRIOS NOS POSTS?</p>
        {(() => {
          const ce = hasSemantic && semantic.commentEngagement ? semantic.commentEngagement : null;
          const pct = ce ? ce.asksForCommentsPct : data.commentEngagement.asksForCommentsPct;
          const summary = ce ? ce.explanation : data.commentEngagement.summary;
          const examples = ce ? ce.examples : data.commentEngagement.examples;
          const strategyBadge = ce ? (
            <span className={cn(
              "text-[10px] font-medium rounded-full px-2 py-0.5 ring-1 shrink-0",
              ce.strategyLabel === "active" ? "text-signal-success bg-tint-success ring-signal-success/15" :
              ce.strategyLabel === "occasional" ? "text-signal-warning bg-amber-50 ring-signal-warning/15" :
              "text-signal-danger bg-rose-50 ring-signal-danger/15",
            )}>
              {ce.strategyLabel === "active" ? "ATIVA" : ce.strategyLabel === "occasional" ? "OCASIONAL" : "PASSIVA"}
            </span>
          ) : null;
          return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "text-[22px] sm:text-[28px] font-mono font-bold tabular-nums leading-none",
                  pct >= 50 ? "text-signal-success" :
                  pct >= 25 ? "text-signal-warning" :
                  "text-signal-danger",
                )}>
                  {pct}%
                </span>
                {strategyBadge}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-content-secondary leading-relaxed">
                  {summary}
                </p>
                {examples.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {examples.map((ex) => (
                      <span
                        key={ex}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 bg-surface-muted ring-border-default text-content-secondary"
                      >
                        «{ex}»
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── 5. Openings + Length distribution ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Openings */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-1">COMO COMEÇAM AS LEGENDAS?</p>
          <p className="text-[11px] text-content-tertiary mb-3">primeiras 8 palavras</p>
          <OpeningsDistribution items={data.distributions.openings} />
        </div>

        {/* Length */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-3">DISTRIBUIÇÃO DE COMPRIMENTO</p>
          <StackedLengthBar items={data.distributions.length} dominantBucket={data.distributions.length.reduce((a, b) => b.pct > a.pct ? b : a, data.distributions.length[0])?.bucket} />
        </div>
      </div>

      {/* ── 6. Diagnostic box ── */}
      <div className="rounded-xl bg-[rgb(var(--tint-primary))] ring-1 ring-accent-primary/20 p-5 md:p-6 space-y-5">
        <p className="text-eyebrow-sm text-accent-primary">DIAGNÓSTICO EDITORIAL</p>
        <p className="text-[15px] md:text-base text-content-primary leading-relaxed font-medium font-sans">
          {hasSemantic && semantic.diagnostic ? semantic.diagnostic.main : buildDiagnosticStatement(data)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-accent-primary/20">
          <DiagnosticMicro
            label="FUNCIONA"
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.works : buildWhatWorks(data)}
            icon={CheckCircle2}
            toneClass="text-signal-success"
          />
          <DiagnosticMicro
            label="PONTO CRÍTICO"
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.critical : buildCriticalPoint(data)}
            icon={AlertTriangle}
            toneClass="text-signal-danger"
          />
          <DiagnosticMicro
            label="A OBSERVAR"
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.watch : buildToWatch(data)}
            icon={Eye}
            toneClass="text-amber-600"
          />
        </div>
      </div>

      {/* ── 7. Footer ── */}
      {/* ── 7. Hook / Voice / Formulaic (semantic-only) ── */}
      {hasSemantic && (semantic.hookQuality || semantic.brandVoice || semantic.formulaicPatterns) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {semantic.hookQuality && (
            <SemanticPill
              icon={Sparkles}
              label="Qualidade do hook"
              rating={semantic.hookQuality.rating}
              ratingLabels={{ strong: "Forte", moderate: "Moderado", weak: "Fraco" }}
              explanation={semantic.hookQuality.explanation}
              tone={semantic.hookQuality.rating === "strong" ? "success" : semantic.hookQuality.rating === "weak" ? "danger" : "neutral"}
            />
          )}
          {semantic.brandVoice && (
            <SemanticPill
              icon={Mic}
              label="Voz da marca"
              rating={semantic.brandVoice.rating}
              ratingLabels={{ consistent: "Consistente", mixed: "Mista", inconsistent: "Inconsistente" }}
              explanation={semantic.brandVoice.explanation}
              tone={semantic.brandVoice.rating === "consistent" ? "success" : semantic.brandVoice.rating === "inconsistent" ? "danger" : "neutral"}
            />
          )}
          {semantic.formulaicPatterns && (
            <SemanticPill
              icon={Repeat}
              label="Padrões repetitivos"
              rating={semantic.formulaicPatterns.hasFormulas ? "alert" : "ok"}
              ratingLabels={{ alert: "Detetados", ok: "Sem repetição" }}
              explanation={semantic.formulaicPatterns.explanation}
              tone={semantic.formulaicPatterns.hasFormulas ? "danger" : "success"}
              examples={semantic.formulaicPatterns.hasFormulas ? semantic.formulaicPatterns.examples : undefined}
            />
          )}
        </div>
      )}

      {/* ── 8. Footer ── */}
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
      className="rounded-2xl border border-border-subtle bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden p-4 sm:p-5 md:p-7 flex flex-col gap-5 sm:gap-6 md:col-span-2"
    >
      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-content-tertiary">
            <span className="w-6 h-6 rounded-md bg-surface-muted/60 flex items-center justify-center">
              <FileText className="w-3 h-3 text-content-tertiary/70" />
            </span>
            <span className="text-[10px] md:text-[11px] tracking-[0.16em] text-content-tertiary uppercase font-sans">
              <span className="hidden sm:inline">04 · DIAGNÓSTICO DE LEGENDAS · {sampleSize} LEGENDAS · {fmt(totalWords)} PALAVRAS</span>
              <span className="sm:hidden">04 · LEGENDAS · {sampleSize} · {fmt(totalWords)} PAL.</span>
            </span>
          </div>
          <span className="text-[9px] md:text-[10px] font-medium tracking-[0.12em] text-content-tertiary/70 border border-border-subtle/60 rounded-full px-2 py-0.5">
            DIAGNÓSTICO
          </span>
        </div>
        <h3 className="font-display text-[1.2rem] sm:text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight mt-4 sm:mt-5 break-words">
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