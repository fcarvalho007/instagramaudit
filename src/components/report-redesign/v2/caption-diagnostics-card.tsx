/**
 * P04 — Caption diagnostics card (v2 redesign).
 *
 * Premium editorial dashboard showing caption analysis organized into five
 * clear visual families: A · Sobre o que fala, B · Expressões recorrentes,
 * C · Como escreve, D · Diagnóstico editorial, E · Quality cards.
 *
 * All data is real or deterministically derived — nothing invented.
 * Evidence is matched client-side from the posts array.
 */
import { type ReactNode, useState, useCallback, useMemo } from "react";
import {
  FileText, CheckCircle2, AlertTriangle, Eye, Type, Zap, HelpCircle,
  BookOpen, Sparkles, Mic, Repeat, ChevronDown, ChevronUp,
  ExternalLink, Download, XCircle, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CaptionIntelligence,
  CaptionLengthDistribution,
  CaptionOpeningType,
} from "@/lib/report/caption-intelligence";
import { INSTAGRAM_CAPTION_CONTEXT } from "@/lib/knowledge/instagram-caption-context";
import type { CaptionSemanticAnalysis } from "@/lib/report/caption-semantic-types";
import type { EnrichedPost } from "@/lib/analysis/normalize";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const KB_SOURCES = INSTAGRAM_CAPTION_CONTEXT.sources;

// ---------------------------------------------------------------------------
// Theme quality guard
// ---------------------------------------------------------------------------

const GENERIC_THEME_LABELS = new Set([
  "neste", "nesta", "dicas", "melhores", "post", "hoje",
  "semana", "conteudo", "conteúdo", "vídeo", "video", "ferramentas",
  "resultado", "resultados", "trabalho", "pessoas", "parte",
  "momento", "forma", "tempo", "sempre", "grande", "mundo",
  "importante", "preciso", "precisa", "certo", "certa",
]);

function isWeakThemeLabel(label: string): boolean {
  const words = label.trim().split(/\s+/);
  if (words.length >= 2) return false;
  const lower = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (GENERIC_THEME_LABELS.has(lower)) return true;
  if (lower.length < 6) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CaptionDiagnosticsCardProps {
  data: CaptionIntelligence;
  /** OpenAI semantic analysis — null when not available. */
  semantic?: CaptionSemanticAnalysis | null;
  /** Enriched posts for evidence matching. */
  posts?: EnrichedPost[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("pt-PT");
}

function buildDiagnosticStatement(data: CaptionIntelligence): string {
  const { distributions, ctaPatterns } = data;
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

  const ctaPart = ctaPatterns.hasCtaPct >= 40 ? "" : " A presença de CTAs explícitos é baixa.";

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
// Evidence matching — pure client-side, no provider calls
// ---------------------------------------------------------------------------

interface MatchedEvidence {
  post: EnrichedPost;
  excerpt: string;
  matchTerms: string[];
}

function matchPostsByTerms(
  posts: EnrichedPost[],
  searchTerms: string[],
): MatchedEvidence[] {
  if (!posts.length || !searchTerms.length) return [];
  const lowerTerms = searchTerms
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length > 2);
  if (!lowerTerms.length) return [];

  const matches: MatchedEvidence[] = [];
  for (const post of posts) {
    if (!post.caption) continue;
    const lower = post.caption.toLowerCase();
    const found = lowerTerms.filter((t) => lower.includes(t));
    if (found.length > 0) {
      matches.push({ post, excerpt: post.caption, matchTerms: found });
    }
  }
  return matches;
}

function matchPostsByTheme(
  posts: EnrichedPost[],
  themeLabel: string,
  evidence: string[],
): MatchedEvidence[] {
  const terms = [
    themeLabel,
    ...evidence.map((e) => {
      // Extract key phrases from evidence excerpts
      const cleaned = e.replace(/[«»"…]/g, "").trim();
      return cleaned.length > 3 ? cleaned : "";
    }).filter(Boolean),
  ];
  // Also split multi-word theme label into individual words for broader matching
  const words = themeLabel.split(/\s+/).filter((w) => w.length > 3);
  return matchPostsByTerms(posts, [...terms, ...words]);
}

/** Highlight matching terms in text with <mark> */
function HighlightedExcerpt({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const pattern = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="bg-accent-primary/15 text-accent-primary font-medium rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// CSV export — client-side only
// ---------------------------------------------------------------------------

function downloadEvidenceCsv(matches: MatchedEvidence[], filename: string) {
  const header = "Formato,Data,Gostos,Comentários,Legenda,Link\n";
  const rows = matches.map((m) => {
    const p = m.post;
    const date = p.taken_at_iso ? new Date(p.taken_at_iso).toLocaleDateString("pt-PT") : "";
    const caption = (p.caption ?? "").replace(/"/g, '""');
    return `"${p.format}","${date}","${p.likes}","${p.comments}","${caption}","${p.permalink ?? ""}"`;
  });
  const csv = header + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Format badge
// ---------------------------------------------------------------------------

const FORMAT_BADGE_STYLE: Record<string, string> = {
  Reels: "bg-red-500/10 text-red-600 ring-red-500/20",
  Carrosséis: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
  Imagens: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
};

const FORMAT_LABEL_SHORT: Record<string, string> = {
  Reels: "REEL",
  Carrosséis: "CARROSSEL",
  Imagens: "IMAGEM",
};

function FormatBadge({ format }: { format: string }) {
  return (
    <span className={cn(
      "text-[9px] font-semibold tracking-wider rounded-md px-1.5 py-0.5 ring-1 shrink-0",
      FORMAT_BADGE_STYLE[format] ?? "bg-surface-muted text-content-tertiary ring-border-default",
    )}>
      {FORMAT_LABEL_SHORT[format] ?? format.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Evidence row (used in both themes and expressions)
// ---------------------------------------------------------------------------

function EvidenceRow({ match }: { match: MatchedEvidence }) {
  const p = match.post;
  const date = p.taken_at_iso
    ? new Date(p.taken_at_iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short" }).toUpperCase()
    : null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-muted/30 p-3 flex items-start gap-3">
      {p.thumbnail_url && (
        <img
          src={p.thumbnail_url}
          alt=""
          className="w-10 h-10 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <FormatBadge format={p.format} />
          {date && (
            <span className="text-[10px] text-content-tertiary flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />{date}
            </span>
          )}
          <span className="text-[10px] text-content-tertiary">
            {fmt(p.likes)} gostos
          </span>
        </div>
        <p className="text-[12px] text-content-secondary leading-relaxed line-clamp-3">
          «<HighlightedExcerpt text={match.excerpt.slice(0, 200)} terms={match.matchTerms} />
          {match.excerpt.length > 200 ? "…" : ""}»
        </p>
      </div>
      {p.permalink && (
        <a
          href={p.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-[11px] text-accent-primary hover:underline font-medium mt-0.5"
        >
          Abrir <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function SectionHeader({
  letter,
  label,
  badge,
}: {
  letter: string;
  label: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-eyebrow text-accent-primary">
        {letter} · {label}
      </p>
      {badge}
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

// ---------------------------------------------------------------------------
// Section A — Sobre o que fala (Themes with collapsible evidence)
// ---------------------------------------------------------------------------

function SectionThemes({
  hasSemantic,
  semanticThemes,
  deterministicThemes,
  tooShortForThemes,
  posts,
  semanticAnalysisCount,
}: {
  hasSemantic: boolean;
  semanticThemes: Array<{ label: string; postsCount: number; evidence: string[]; confidence: "high" | "medium" | "low" }>;
  deterministicThemes: Array<{ label: string; postsCount: number; evidence: string | null; confidence: "high" | "medium" | "low" }>;
  tooShortForThemes: boolean;
  posts: EnrichedPost[];
  semanticAnalysisCount?: number;
}) {
  const [openTheme, setOpenTheme] = useState<number | null>(null);
  const themes = hasSemantic ? semanticThemes : deterministicThemes;
  const hasThemes = hasSemantic ? semanticThemes.length > 0 : !tooShortForThemes && deterministicThemes.length > 0;

  if (!hasThemes) return null;

  const CONFIDENCE_STYLE = {
    high: { label: "SINAL FORTE", cls: "text-signal-success bg-tint-success ring-signal-success/15" },
    medium: { label: "SINAL MÉDIO", cls: "text-accent-primary bg-tint-primary ring-accent-primary/15" },
    low: { label: "SINAL FRACO", cls: "text-content-secondary bg-surface-muted ring-border-default" },
  } as const;

  return (
    <div className="space-y-4">
      <SectionHeader
        letter="A"
        label="SOBRE O QUE FALA"
        badge={
          <div className="flex items-center gap-2">
            {semanticAnalysisCount != null && (
              <span className="text-[10px] text-content-tertiary">
                {semanticAnalysisCount} {semanticAnalysisCount === 1 ? "análise semântica" : "análises semânticas"}
              </span>
            )}
            <span className="text-[10px] text-content-tertiary border border-border-subtle rounded-full px-2 py-0.5">
              {themes.length} {themes.length === 1 ? "tema detetado" : "temas detetados"}
            </span>
          </div>
        }
      />

      <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-eyebrow-sm text-content-tertiary">ASSUNTOS MAIS RECORRENTES</p>
            <p className="text-[11px] text-content-tertiary mt-0.5">
              {hasSemantic
                ? "Temas identificados por análise semântica das legendas"
                : "Temas extraídos do corpo das legendas — não confundir com hashtags"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {themes.map((t, i) => {
            const conf = CONFIDENCE_STYLE[t.confidence];
            const isOpen = openTheme === i;
            const evidenceArr = hasSemantic
              ? (t as typeof semanticThemes[number]).evidence
              : [(t as typeof deterministicThemes[number]).evidence].filter(Boolean) as string[];
            const matched = isOpen ? matchPostsByTheme(posts, t.label, evidenceArr) : [];

            return (
              <Collapsible
                key={`${t.label}-${i}`}
                open={isOpen}
                onOpenChange={(open) => setOpenTheme(open ? i : null)}
              >
                <div className={cn(
                  "rounded-xl border bg-white transition-colors",
                  isOpen ? "border-accent-primary/30 shadow-sm" : "border-border-subtle",
                )}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-[12px] font-semibold text-accent-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-content-primary leading-snug">
                          {t.label}
                        </p>
                        <p className="text-[12px] text-content-tertiary mt-0.5">
                          Identificado em <strong>{t.postsCount}</strong> {t.postsCount === 1 ? "post" : "posts"}
                          {i === 0 && t.confidence === "high" ? " · sinal mais forte da grelha" : ""}
                          {isOpen ? " · evidência abaixo" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-eyebrow-sm rounded-full px-2.5 py-0.5 ring-1", conf.cls)}>
                        {conf.label}
                      </span>
                      <CollapsibleTrigger asChild>
                        <button className={cn(
                          "flex items-center gap-1 text-[11px] font-medium rounded-lg px-2.5 py-1.5 transition-colors",
                          isOpen
                            ? "bg-accent-primary text-white"
                            : "bg-surface-muted text-content-secondary hover:bg-surface-muted/80",
                        )}>
                          {isOpen ? "Ocultar" : "Ver evidência"}
                          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-2 border-t border-border-subtle/50 pt-3">
                      {matched.length > 0 ? (
                        <>
                          {matched.slice(0, 4).map((m, mi) => (
                            <EvidenceRow key={m.post.id ?? mi} match={m} />
                          ))}
                          <div className="flex items-center gap-3 pt-2 text-[11px] text-content-tertiary">
                            <button
                              onClick={() => downloadEvidenceCsv(matched, `tema-${i + 1}-evidencia.csv`)}
                              className="flex items-center gap-1 hover:text-accent-primary transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Ver os {matched.length} posts · descarregar CSV com excertos
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-[12px] text-content-tertiary italic py-2">
                          Evidência não disponível no payload atual.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section B — Expressões recorrentes + Comment engagement
// ---------------------------------------------------------------------------

function SectionExpressions({
  hasSemantic,
  semanticExpressions,
  deterministicExpressions,
  commentEngagement,
  semanticCommentEngagement,
  posts,
}: {
  hasSemantic: boolean;
  semanticExpressions: Array<{ expression: string; count: number; meaning: string; risk?: string }>;
  deterministicExpressions: Array<{ expression: string; count: number; type: string }>;
  commentEngagement: { asksForCommentsPct: number; summary: string; examples: string[] };
  semanticCommentEngagement?: { asksForCommentsPct: number; strategyLabel: string; explanation: string; examples: string[] } | null;
  posts: EnrichedPost[];
}) {
  const [openExpr, setOpenExpr] = useState<number | null>(null);
  const expressions = hasSemantic ? semanticExpressions : [];
  const detExpressions = deterministicExpressions;
  const hasSemanticExpr = expressions.length > 0;
  const hasDetExpr = detExpressions.length > 0;

  const ce = semanticCommentEngagement ?? null;
  const pct = ce ? ce.asksForCommentsPct : commentEngagement.asksForCommentsPct;
  const summary = ce ? ce.explanation : commentEngagement.summary;
  const examples = ce ? ce.examples : commentEngagement.examples;

  return (
    <div className="space-y-4">
      {/* Expressions */}
      {(hasSemanticExpr || hasDetExpr) && (
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-eyebrow-sm text-content-tertiary">EXPRESSÕES RECORRENTES</p>
              <p className="text-[11px] text-content-tertiary mt-0.5">
                Frases e formulações que aparecem em múltiplos posts
              </p>
            </div>
            {hasSemanticExpr && posts.length > 0 && (
              <button
                onClick={() => {
                  const allMatches: MatchedEvidence[] = [];
                  for (const ex of expressions) {
                    allMatches.push(...matchPostsByTerms(posts, [ex.expression]));
                  }
                  if (allMatches.length > 0) downloadEvidenceCsv(allMatches, "expressoes-recorrentes.csv");
                }}
                className="flex items-center gap-1.5 text-[11px] text-content-tertiary hover:text-accent-primary transition-colors"
              >
                <Download className="w-3 h-3" />
                Descarregar CSV
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {hasSemanticExpr
              ? expressions.map((it, i) => {
                  const isOpen = openExpr === i;
                  const matched = isOpen ? matchPostsByTerms(posts, [it.expression]) : [];
                  return (
                    <Collapsible
                      key={it.expression}
                      open={isOpen}
                      onOpenChange={(open) => setOpenExpr(open ? i : null)}
                    >
                      <div className={cn(
                        "rounded-xl border transition-colors",
                        isOpen ? "border-accent-primary/30 bg-white shadow-sm" : "border-border-subtle bg-tint-primary/30",
                      )}>
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-content-primary leading-snug">
                              "{it.expression}"
                            </p>
                            <span className="font-mono text-[12px] font-semibold tabular-nums text-accent-primary shrink-0">
                              ×{it.count}
                            </span>
                          </div>
                          <p className="text-[11px] text-content-secondary mt-1.5 leading-relaxed">
                            {it.meaning}
                          </p>
                          {it.risk && (
                            <p className="flex items-center gap-1 text-[10px] text-signal-warning mt-1.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {it.risk}
                            </p>
                          )}
                          {posts.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <button className="mt-2 flex items-center gap-1 text-[11px] text-content-tertiary hover:text-accent-primary transition-colors font-medium">
                                {isOpen ? "Ocultar" : "Ver posts"}
                                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                        <CollapsibleContent>
                          <div className="px-3.5 pb-3.5 space-y-2 border-t border-border-subtle/50 pt-2.5">
                            {matched.length > 0 ? (
                              matched.slice(0, 3).map((m, mi) => (
                                <EvidenceRow key={m.post.id ?? mi} match={m} />
                              ))
                            ) : (
                              <p className="text-[11px] text-content-tertiary italic py-1">
                                Evidência não disponível no payload atual.
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
              : detExpressions.map((it, i) => {
                  const TYPE_LABEL: Record<string, string> = {
                    topic: "Tema", cta: "CTA", brand: "Marca",
                    product: "Produto", community: "Comunidade", other: "Outro",
                  };
                  return (
                    <div
                      key={it.expression}
                      className={cn(
                        "rounded-xl border p-3.5",
                        i < 2 ? "border-accent-primary/20 bg-tint-primary/30" : "border-border-subtle bg-surface-muted/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className={cn(
                            "text-[13px] font-semibold leading-snug",
                            i < 2 ? "text-accent-primary" : "text-content-secondary",
                          )}>
                            "{it.expression}"
                          </p>
                          <span className="text-[9px] text-content-tertiary rounded-full bg-surface-muted px-1.5 py-0.5 ring-1 ring-border-default shrink-0">
                            {TYPE_LABEL[it.type] ?? "Outro"}
                          </span>
                        </div>
                        <span className="font-mono text-[12px] font-semibold tabular-nums text-content-tertiary shrink-0">
                          ×{it.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* Comment engagement */}
      <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
        <p className="text-eyebrow-sm text-content-tertiary mb-1">PEDE COMENTÁRIOS NOS POSTS?</p>
        <p className="text-[11px] text-content-tertiary mb-3">
          Frequência de chamadas explícitas a comentar
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-[28px] sm:text-[32px] font-mono font-bold tabular-nums leading-none",
              pct >= 50 ? "text-signal-success" :
              pct >= 25 ? "text-signal-warning" :
              "text-signal-danger",
            )}>
              {pct}%
            </span>
            {ce && (
              <span className={cn(
                "text-[10px] font-semibold tracking-wider rounded-full px-2 py-0.5 ring-1 shrink-0",
                ce.strategyLabel === "active" ? "text-signal-success bg-tint-success ring-signal-success/15" :
                ce.strategyLabel === "occasional" ? "text-signal-warning bg-tint-warning ring-signal-warning/15" :
                "text-signal-danger bg-tint-danger ring-signal-danger/15",
              )}>
                {ce.strategyLabel === "active" ? "ATIVA" : ce.strategyLabel === "occasional" ? "OCASIONAL" : "PASSIVA"}
              </span>
            )}
          </div>
          <p className="text-[13px] text-content-secondary leading-relaxed flex-1">
            {summary}
          </p>
        </div>
        {examples.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-subtle/50">
            <p className="text-eyebrow-sm text-content-tertiary mb-2">EXEMPLOS DETETADOS</p>
            <div className="flex flex-wrap gap-1.5">
              {examples.map((ex) => (
                <span
                  key={ex}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ring-1 bg-tint-primary/30 ring-accent-primary/15 text-content-secondary"
                >
                  «{ex}»
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section C — Como escreve (Openings, Endings, Length)
// ---------------------------------------------------------------------------

function SectionWritingPatterns({ data }: { data: CaptionIntelligence }) {
  const patternCount = [
    data.distributions.openings.length > 0,
    data.distributions.endings.length > 0,
    data.distributions.length.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SectionHeader
        letter="B"
        label="COMO ESCREVE"
        badge={
          <span className="text-[10px] text-content-tertiary border border-border-subtle rounded-full px-2 py-0.5">
            {patternCount} {patternCount === 1 ? "padrão estrutural" : "padrões estruturais"}
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Openings */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-0.5">COMO COMEÇAM</p>
          <p className="text-[10px] text-content-tertiary mb-3">primeiras 8 palavras</p>
          <div className="space-y-2">
            {data.distributions.openings.map((it) => {
              const Icon = OPENING_ICONS[it.type];
              return (
                <div key={it.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12px] text-content-secondary">
                    {Icon && <Icon className="w-3.5 h-3.5 text-content-tertiary/70 shrink-0" />}
                    {it.label}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-content-tertiary font-semibold">
                    {it.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Endings */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-0.5">COMO ACABAM</p>
          <p className="text-[10px] text-content-tertiary mb-3">últimas linhas da legenda</p>
          <div className="space-y-2">
            {data.distributions.endings.map((it) => {
              const isQuestionLow = it.type === "question" && it.pct < 20;
              const isQuestionOk = it.type === "question" && it.pct >= 20;
              return (
                <div
                  key={it.label}
                  className={cn(
                    "flex items-center justify-between rounded-md px-1.5 py-1 -mx-1.5",
                    isQuestionLow && "bg-tint-danger",
                  )}
                >
                  <span className={cn(
                    "text-[12px] text-content-secondary",
                    isQuestionLow && "text-signal-danger font-medium",
                    isQuestionOk && "text-signal-success font-medium",
                  )}>
                    {it.label}
                  </span>
                  <span className={cn(
                    "font-mono text-[11px] tabular-nums font-semibold",
                    isQuestionLow ? "text-signal-danger" : "text-content-tertiary",
                  )}>
                    {it.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Length distribution */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-0.5">DISTRIBUIÇÃO COMPRIMENTO</p>
          <p className="text-[10px] text-content-tertiary mb-3">
            {data.sampleSize} legendas analisadas
          </p>
          <LengthBarCompact items={data.distributions.length} />
        </div>
      </div>
    </div>
  );
}

function LengthBarCompact({ items }: { items: CaptionLengthDistribution[] }) {
  const COLORS: Record<string, string> = {
    short: "bg-accent-primary/30",
    medium: "bg-accent-primary/60",
    long: "bg-accent-primary/90",
  };
  const dominantBucket = items.reduce((a, b) => (b.pct > a.pct ? b : a), items[0])?.bucket;

  return (
    <div className="space-y-3">
      <div className="h-5 rounded-full bg-surface-muted overflow-hidden flex">
        {items.map((it) => (
          <div
            key={it.bucket}
            className={cn(
              "h-full flex items-center justify-center text-[9px] font-mono font-semibold text-white/80",
              COLORS[it.bucket] ?? "bg-accent-primary/40",
            )}
            style={{ width: `${Math.max(8, it.pct)}%` }}
          >
            {it.pct > 15 ? `${it.pct}` : ""}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.bucket} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-sm", COLORS[it.bucket])} />
              <span className={cn(
                "text-content-secondary",
                it.bucket === dominantBucket && "font-semibold text-content-primary",
              )}>
                {it.label}
              </span>
            </div>
            <span className={cn(
              "font-mono tabular-nums font-semibold",
              it.bucket === dominantBucket ? "text-content-primary" : "text-content-tertiary",
            )}>
              {it.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section D — Diagnóstico editorial
// ---------------------------------------------------------------------------

function SectionDiagnostic({
  data,
  semantic,
}: {
  data: CaptionIntelligence;
  semantic?: CaptionSemanticAnalysis | null;
}) {
  const hasSemantic = semantic != null;

  return (
    <div className="space-y-4">
      <SectionHeader
        letter="C"
        label="DIAGNÓSTICO EDITORIAL"
        badge={
          <span className="text-[10px] text-content-tertiary italic">
            síntese gerada por IA
          </span>
        }
      />

      <div className="rounded-xl bg-[rgb(var(--tint-primary))] ring-1 ring-accent-primary/20 p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <p className="text-eyebrow-sm text-accent-primary">SÍNTESE EDITORIAL · IA</p>
        </div>

        <p className="text-[15px] md:text-[17px] text-content-primary leading-relaxed font-medium font-sans">
          {hasSemantic && semantic.diagnostic
            ? semantic.diagnostic.main
            : buildDiagnosticStatement(data)}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-accent-primary/20">
          <DiagnosticColumn
            icon={CheckCircle2}
            label="FUNCIONA"
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.works : buildWhatWorks(data)}
            toneClass="text-signal-success"
          />
          <DiagnosticColumn
            icon={XCircle}
            label="PONTO CRÍTICO"
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.critical : buildCriticalPoint(data)}
            toneClass="text-signal-danger"
          />
          <DiagnosticColumn
            icon={Eye}
            label="A OBSERVAR"
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.watch : buildToWatch(data)}
            toneClass="text-signal-warning"
          />
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-2 text-[10px] text-content-tertiary leading-relaxed">
        <span className="shrink-0 mt-px">ⓘ</span>
        <span>
          Análise apenas a legendas públicas. Hashtags em P03. Boas práticas:{" "}
          {KB_SOURCES.map((src, i) => (
            <span key={src.name}>
              {i > 0 && " · "}
              [{i + 1}]{" "}
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {src.name}
              </a>
            </span>
          ))}
          .
        </span>
      </div>
    </div>
  );
}

function DiagnosticColumn({
  icon: Icon,
  label,
  text,
  toneClass,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
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
// Section E — Quality cards (Hook / Voice / Formulaic)
// ---------------------------------------------------------------------------

function SemanticPill({
  icon: Icon,
  label,
  rating,
  ratingLabels,
  explanation,
  tone,
  examples,
}: {
  icon: LucideIcon;
  label: string;
  rating: string;
  ratingLabels: Record<string, string>;
  explanation: string;
  tone: "success" | "danger" | "neutral";
  examples?: string[];
}) {
  const toneClasses =
    tone === "success"
      ? "border-signal-success/20 bg-signal-success/5"
      : tone === "danger"
        ? "border-signal-danger/20 bg-signal-danger/5"
        : "border-border-subtle bg-surface-muted/50";
  const ratingColor =
    tone === "success"
      ? "text-signal-success"
      : tone === "danger"
        ? "text-signal-danger"
        : "text-content-secondary";
  return (
    <div className={cn("rounded-xl border p-4 md:p-5 space-y-2.5", toneClasses)}>
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-content-tertiary" strokeWidth={1.5} />
        <span className="text-eyebrow-sm text-content-tertiary">{label}</span>
      </div>
      <p className={cn("text-[13px] font-semibold", ratingColor)}>
        {ratingLabels[rating] ?? rating}
      </p>
      <p className="text-[12px] text-content-secondary leading-relaxed">
        {explanation}
      </p>
      {examples && examples.length > 0 && (
        <ul className="space-y-1 pt-1">
          {examples.map((ex, i) => (
            <li key={i} className="text-[11px] text-content-tertiary italic leading-relaxed">
              «{ex}»
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CaptionDiagnosticsCard({ data, semantic, posts = [] }: CaptionDiagnosticsCardProps) {
  const hasSemantic = semantic != null;
  const themes = data.themes.items
    .filter((t) => !isWeakThemeLabel(t.label))
    .slice(0, 5);
  const semanticThemes = semantic?.dominantThemes?.slice(0, 5) ?? [];
  const expressions = data.recurringExpressions.items;
  const semanticExpressions = semantic?.recurringExpressionsInterpretation ?? [];
  const stats = data.captionStats;
  const tooShortForThemes = !hasSemantic && stats.avgWordsPerCaption < 5;

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

  return (
    <CardShell sampleSize={data.sampleSize} totalWords={stats.totalWords}>
      {/* ── A · Sobre o que fala ── */}
      <SectionThemes
        hasSemantic={hasSemantic}
        semanticThemes={semanticThemes}
        deterministicThemes={themes}
        tooShortForThemes={tooShortForThemes}
        posts={posts}
        semanticAnalysisCount={hasSemantic ? semantic.analyzedCaptions : undefined}
      />

      {/* ── B · Expressões recorrentes ── */}
      <SectionExpressions
        hasSemantic={hasSemantic}
        semanticExpressions={semanticExpressions}
        deterministicExpressions={expressions}
        commentEngagement={data.commentEngagement}
        semanticCommentEngagement={hasSemantic ? semantic.commentEngagement : null}
        posts={posts}
      />

      {/* ── C · Como escreve ── */}
      <SectionWritingPatterns data={data} />

      {/* ── D · Diagnóstico editorial ── */}
      <SectionDiagnostic data={data} semantic={semantic} />

      {/* ── E · Quality cards (semantic-only) ── */}
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
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Shell (header unchanged)
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