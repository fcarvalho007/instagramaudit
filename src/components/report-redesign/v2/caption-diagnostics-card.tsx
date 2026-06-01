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
import { type ReactNode, useState } from "react";
import { useVariantFeatures } from "@/lib/report/report-variant";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  FileText, AlertTriangle, Type, Zap, HelpCircle,
  BookOpen, Sparkles, Mic, Repeat, ChevronDown, ChevronUp,
  ExternalLink, Download, Clock,
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

/** Accept both EnrichedPost and the looser SnapshotPost shape. */
type PostLike = {
  id?: string | null;
  format?: string | null;
  caption?: string | null;
  likes?: number | null;
  comments?: number | null;
  taken_at_iso?: string | null;
  permalink?: string | null;
  thumbnail_url?: string | null;
  thumbnail_storage_url?: string | null;
};
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const KB_SOURCES = INSTAGRAM_CAPTION_CONTEXT.sources;

type TR = TFunction<"report", undefined>;

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
  const lower = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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
  posts?: PostLike[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("pt-PT");
}

function buildDiagnosticStatement(data: CaptionIntelligence, t: TR): string {
  const { distributions, ctaPatterns } = data;
  const dominantOpening = distributions.openings[0];
  const questionEnding = distributions.endings.find((e) => e.type === "question");
  const longPct = distributions.length.find((l) => l.bucket === "long")?.pct ?? 0;

  const openingPart = dominantOpening
    ? t("caption.diag.opening_dominant", { label: dominantOpening.label.toLowerCase() })
    : t("caption.diag.opening_none");

  const lengthPart = longPct >= 60
    ? t("caption.diag.length_long")
    : longPct >= 30
      ? t("caption.diag.length_mixed")
      : t("caption.diag.length_short");

  const endPart = (questionEnding?.pct ?? 0) < 20
    ? t("caption.diag.ending_low_q")
    : t("caption.diag.ending_with_q");

  const ctaPart = ctaPatterns.hasCtaPct >= 40 ? "" : t("caption.diag.cta_low");

  return `${openingPart} ${lengthPart}${endPart}${ctaPart}`;
}

function buildWhatWorks(data: CaptionIntelligence, t: TR): string {
  if (data.editorialReading.whatWorks && data.editorialReading.whatWorks !== "—") {
    return data.editorialReading.whatWorks;
  }
  return t("caption.diag.what_works_default");
}

function buildCriticalPoint(data: CaptionIntelligence, t: TR): string {
  if (data.editorialReading.whatIsMissing && data.editorialReading.whatIsMissing !== "—") {
    return data.editorialReading.whatIsMissing;
  }
  const questionPct = data.distributions.endings.find((e) => e.type === "question")?.pct ?? 0;
  if (questionPct < 20) {
    return t("caption.diag.critical_low_q");
  }
  return t("caption.diag.critical_none");
}

function buildToWatch(data: CaptionIntelligence, t: TR): string {
  const topExpr = data.recurringExpressions.items.slice(0, 2);
  if (topExpr.length >= 2) {
    return t("caption.diag.watch_repeats", {
      a: topExpr[0].expression.toLowerCase(),
      b: topExpr[1].expression.toLowerCase(),
    });
  }
  if (data.editorialReading.recommendedImprovement) {
    return data.editorialReading.recommendedImprovement;
  }
  return t("caption.diag.watch_default");
}

// ---------------------------------------------------------------------------
// Evidence matching — pure client-side, no provider calls
// ---------------------------------------------------------------------------

interface MatchedEvidence {
  post: PostLike;
  excerpt: string;
  matchTerms: string[];
}

function matchPostsByTerms(
  posts: PostLike[],
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
  posts: PostLike[],
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
    return `"${p.format ?? ""}","${date}","${p.likes ?? 0}","${p.comments ?? 0}","${caption}","${p.permalink ?? ""}"`;
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
      "text-xs font-semibold tracking-wider rounded-md px-1.5 py-0.5 ring-1 shrink-0",
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
      {p.thumbnail_url && p.thumbnail_url.length > 0 && (
        <img
          src={p.thumbnail_url}
          alt=""
          className="w-10 h-10 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <FormatBadge format={p.format ?? "Imagens"} />
          {date && (
            <span className="text-xs text-content-tertiary flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />{date}
            </span>
          )}
          <span className="text-xs text-content-tertiary">
            {fmt(p.likes ?? 0)} gostos
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
          className="shrink-0 flex items-center gap-1 text-xs text-accent-primary hover:underline font-medium mt-0.5"
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
  t,
}: {
  hasSemantic: boolean;
  semanticThemes: Array<{ label: string; postsCount: number; evidence: string[]; confidence: "high" | "medium" | "low" }>;
  deterministicThemes: Array<{ label: string; postsCount: number; evidence: string | null; confidence: "high" | "medium" | "low" }>;
  tooShortForThemes: boolean;
  posts: PostLike[];
  semanticAnalysisCount?: number;
  t: TR;
}) {
  const [openTheme, setOpenTheme] = useState<number | null>(null);
  const themes = hasSemantic ? semanticThemes : deterministicThemes;
  const hasThemes = hasSemantic ? semanticThemes.length > 0 : !tooShortForThemes && deterministicThemes.length > 0;

  if (!hasThemes) return null;

  const CONFIDENCE_STYLE = {
    high: { label: t("caption.section_a.signal_high"), cls: "text-signal-success bg-tint-success ring-signal-success/15" },
    medium: { label: t("caption.section_a.signal_medium"), cls: "text-accent-primary bg-tint-primary ring-accent-primary/15" },
    low: { label: t("caption.section_a.signal_low"), cls: "text-content-secondary bg-surface-muted ring-border-default" },
  } as const;

  return (
    <div className="space-y-4">
      <SectionHeader
        letter={t("caption.section_a.letter").split(" · ")[0] ?? "A"}
        label={t("caption.section_a.letter").split(" · ").slice(1).join(" · ") || "SOBRE O QUE FALA"}
        badge={
          <div className="flex items-center gap-2">
            {semanticAnalysisCount != null && (
              <span className="text-xs text-content-tertiary">
                {t("caption.section_a.analyses", { count: semanticAnalysisCount })}
              </span>
            )}
            <span className="text-xs text-content-tertiary border border-border-subtle rounded-full px-2 py-0.5">
              {t("caption.section_a.themes", { count: themes.length })}
            </span>
          </div>
        }
      />

      <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-eyebrow-sm text-content-tertiary">{t("caption.section_a.card_title")}</p>
            <p className="text-xs text-content-tertiary mt-0.5">
              {hasSemantic
                ? t("caption.section_a.hint_semantic")
                : t("caption.section_a.hint_deterministic")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {themes.map((theme, i) => {
            const conf = CONFIDENCE_STYLE[theme.confidence];
            const isOpen = openTheme === i;
            const evidenceArr = hasSemantic
              ? (theme as typeof semanticThemes[number]).evidence
              : [(theme as typeof deterministicThemes[number]).evidence].filter(Boolean) as string[];
            const matched = isOpen ? matchPostsByTheme(posts, theme.label, evidenceArr) : [];

            return (
              <Collapsible
                key={`${theme.label}-${i}`}
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
                          {theme.label}
                        </p>
                        <p className="text-[12px] text-content-tertiary mt-0.5">
                          {t("caption.section_a.identified_in", { count: theme.postsCount })}
                          {i === 0 && theme.confidence === "high" ? t("caption.section_a.strongest_signal") : ""}
                          {isOpen ? t("caption.section_a.evidence_below") : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-eyebrow-sm rounded-full px-2.5 py-0.5 ring-1", conf.cls)}>
                        {conf.label}
                      </span>
                      <CollapsibleTrigger asChild>
                        <button className={cn(
                          "flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors",
                          isOpen
                            ? "bg-accent-primary text-white"
                            : "bg-surface-muted text-content-secondary hover:bg-surface-muted/80",
                        )}>
                          {isOpen ? t("caption.section_a.hide") : t("caption.section_a.show")}
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
                          <div className="flex items-center gap-3 pt-2 text-xs text-content-tertiary">
                            <button
                              onClick={() => downloadEvidenceCsv(matched, `tema-${i + 1}-evidencia.csv`)}
                              className="flex items-center gap-1 hover:text-accent-primary transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              {t("caption.section_a.see_csv", { count: matched.length })}
                            </button>
                          </div>
                        </>
                      ) : (
                        <CaptionEvidenceFallback size="normal" />
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
// Section C — Como escreve (Openings, Endings, Length)
// ---------------------------------------------------------------------------


/** Fallback when no caption evidence is available. Hidden in public_mvp. */
function CaptionEvidenceFallback({ size }: { size: "normal" | "compact" }) {
  const features = useVariantFeatures();
  if (features.debugLabels === "hidden") return null;
  const cls = size === "normal"
    ? "text-[12px] text-content-tertiary italic py-2"
    : "text-xs text-content-tertiary italic py-1";
  return <p className={cls}>Evidência detalhada em desenvolvimento.</p>;
}

function SectionWritingAndExpressions({
  data,
  hasSemantic,
  semanticExpressions,
  deterministicExpressions,
  commentEngagement,
  semanticCommentEngagement,
  posts,
}: {
  data: CaptionIntelligence;
  hasSemantic: boolean;
  semanticExpressions: Array<{ expression: string; count: number; meaning: string; risk?: string }>;
  deterministicExpressions: Array<{ expression: string; count: number; type: string }>;
  commentEngagement: { asksForCommentsPct: number; summary: string; examples: string[] };
  semanticCommentEngagement?: { asksForCommentsPct: number; strategyLabel: string; explanation: string; examples: string[] } | null;
  posts: PostLike[];
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

  const patternCount = [
    data.distributions.openings.length > 0,
    data.distributions.endings.length > 0,
    data.distributions.length.length > 0,
    hasSemanticExpr || hasDetExpr,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SectionHeader
        letter="B"
        label="COMO ESCREVE"
        badge={
          <span className="text-xs text-content-tertiary border border-border-subtle rounded-full px-2 py-0.5">
            {patternCount} {patternCount === 1 ? "padrão estrutural" : "padrões estruturais"}
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Openings */}
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5">
          <p className="text-eyebrow-sm text-content-tertiary mb-0.5">COMO COMEÇAM</p>
          <p className="text-xs text-content-tertiary mb-3">primeiras 8 palavras</p>
          <div className="space-y-2">
            {data.distributions.openings.map((it) => {
              const Icon = OPENING_ICONS[it.type];
              return (
                <div key={it.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12px] text-content-secondary">
                    {Icon && <Icon className="w-3.5 h-3.5 text-content-tertiary/70 shrink-0" />}
                    {it.label}
                  </span>
                  <span className="tabular-nums text-xs tabular-nums text-content-tertiary font-semibold">
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
          <p className="text-xs text-content-tertiary mb-3">últimas linhas da legenda</p>
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
                    "tabular-nums text-xs tabular-nums font-semibold",
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
          <p className="text-xs text-content-tertiary mb-3">
            {data.sampleSize} legendas analisadas
          </p>
          <LengthBarCompact items={data.distributions.length} />
        </div>
      </div>

      {/* Expressões recorrentes */}
      {(hasSemanticExpr || hasDetExpr) && (
        <div className="rounded-xl border border-border-subtle bg-white p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-eyebrow-sm text-content-tertiary">EXPRESSÕES RECORRENTES</p>
              <p className="text-xs text-content-tertiary mt-0.5">
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
                className="flex items-center gap-1.5 text-xs text-content-tertiary hover:text-accent-primary transition-colors"
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
                        isOpen ? "border-accent-primary/30 bg-white shadow-sm" : "border-border-subtle bg-white",
                      )}>
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-content-primary leading-snug">
                              "{it.expression}"
                            </p>
                            <span className="tabular-nums text-[12px] font-semibold tabular-nums text-accent-primary shrink-0">
                              ×{it.count}
                            </span>
                          </div>
                          <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">
                            {it.meaning}
                          </p>
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border-subtle/40">
                            {it.risk ? (
                              <p className="flex items-center gap-1 text-xs text-signal-warning">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {it.risk}
                              </p>
                            ) : (
                              <span />
                            )}
                            {posts.length > 0 && (
                              <CollapsibleTrigger asChild>
                                <button className="flex items-center gap-1 text-xs text-content-tertiary hover:text-accent-primary transition-colors font-medium shrink-0">
                                  {isOpen ? "Ocultar" : `Ver ${it.count} posts`}
                                </button>
                              </CollapsibleTrigger>
                            )}
                          </div>
                        </div>
                        <CollapsibleContent>
                          <div className="px-3.5 pb-3.5 space-y-2 border-t border-border-subtle/50 pt-2.5">
                            {matched.length > 0 ? (
                              matched.slice(0, 3).map((m, mi) => (
                                <EvidenceRow key={m.post.id ?? mi} match={m} />
                              ))
                            ) : (
                              <CaptionEvidenceFallback size="compact" />
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
                          <span className="text-xs text-content-tertiary rounded-full bg-surface-muted px-1.5 py-0.5 ring-1 ring-border-default shrink-0">
                            {TYPE_LABEL[it.type] ?? "Outro"}
                          </span>
                        </div>
                        <span className="tabular-nums text-[12px] font-semibold tabular-nums text-content-tertiary shrink-0">
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
        <p className="text-xs text-content-tertiary mb-3">
          Frequência de chamadas explícitas a comentar
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-[28px] sm:text-[32px] tabular-nums font-bold tabular-nums leading-none",
              pct >= 50 ? "text-signal-success" :
              pct >= 25 ? "text-signal-warning" :
              "text-signal-danger",
            )}>
              {pct}%
            </span>
            {ce && (
              <span className={cn(
                "text-xs font-semibold tracking-wider rounded-full px-2 py-0.5 ring-1 shrink-0",
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
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 bg-tint-primary/30 ring-accent-primary/15 text-content-secondary"
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
              "h-full flex items-center justify-center text-xs tabular-nums font-semibold text-white/80",
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
          <div key={it.bucket} className="flex items-center justify-between text-xs">
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
              "tabular-nums tabular-nums font-semibold",
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


/** Render text with **bold** markers parsed, or bold the last sentence if no markers found. */
function BoldableParagraph({ text }: { text: string }) {
  // Check for **markers**
  if (text.includes("**")) {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-semibold">{part}</strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  }
  // Fallback: render as-is
  return <span>{text}</span>;
}

// ---------------------------------------------------------------------------
// Section C — Leitura editorial (merged D + E)
// ---------------------------------------------------------------------------

function SectionEditorialReading({
  data,
  semantic,
  t,
}: {
  data: CaptionIntelligence;
  semantic?: CaptionSemanticAnalysis | null;
  t: TR;
}) {
  const hasSemantic = semantic != null;

  return (
    <div className="space-y-4">
      <SectionHeader
        letter={t("caption.section_c.letter").split(" · ")[0] ?? "C"}
        label={t("caption.section_c.letter").split(" · ").slice(1).join(" · ") || "LEITURA EDITORIAL"}
        badge={
          <span className="text-xs text-content-tertiary italic">
            {t("caption.section_c.ai_subtitle")}
          </span>
        }
      />

      <div className="rounded-xl bg-[rgb(var(--tint-primary))] ring-1 ring-accent-primary/20 p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <p className="text-eyebrow-sm text-accent-primary">{t("caption.section_c.ai_badge")}</p>
        </div>

        <p className="text-[15px] md:text-[17px] text-content-primary leading-[1.7] font-sans">
          <BoldableParagraph
            text={hasSemantic && semantic.diagnostic
              ? semantic.diagnostic.main
              : buildDiagnosticStatement(data, t)}
          />
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-accent-primary/20">
          <DiagnosticColumn
            symbol="✓"
            label={t("caption.section_c.strong")}
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.works : buildWhatWorks(data, t)}
            toneClass="text-signal-success"
          />
          <DiagnosticColumn
            symbol="✕"
            label={t("caption.section_c.risk")}
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.critical : buildCriticalPoint(data, t)}
            toneClass="text-signal-danger"
          />
          <DiagnosticColumn
            symbol="◎"
            label={t("caption.section_c.watch")}
            text={hasSemantic && semantic.diagnostic ? semantic.diagnostic.watch : buildToWatch(data, t)}
            toneClass="text-signal-warning"
          />
        </div>
      </div>

      {/* Quality cards (semantic-only) */}
      {hasSemantic && (semantic.hookQuality || semantic.brandVoice || semantic.formulaicPatterns) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {semantic.hookQuality && (
            <SemanticPill
              icon={Sparkles}
              label={t("caption.quality.hook_label")}
              rating={semantic.hookQuality.rating}
              ratingLabels={{
                strong: t("caption.quality.hook_strong"),
                moderate: t("caption.quality.hook_moderate"),
                weak: t("caption.quality.hook_weak"),
              }}
              explanation={semantic.hookQuality.explanation}
              tone={semantic.hookQuality.rating === "strong" ? "success" : semantic.hookQuality.rating === "weak" ? "danger" : "neutral"}
            />
          )}
          {semantic.brandVoice && (
            <SemanticPill
              icon={Mic}
              label={t("caption.quality.voice_label")}
              rating={semantic.brandVoice.rating}
              ratingLabels={{
                consistent: t("caption.quality.voice_consistent"),
                mixed: t("caption.quality.voice_mixed"),
                inconsistent: t("caption.quality.voice_inconsistent"),
              }}
              explanation={semantic.brandVoice.explanation}
              tone={semantic.brandVoice.rating === "consistent" ? "success" : semantic.brandVoice.rating === "inconsistent" ? "danger" : "neutral"}
            />
          )}
          {semantic.formulaicPatterns && (
            <SemanticPill
              icon={Repeat}
              label={t("caption.quality.patterns_label")}
              rating={semantic.formulaicPatterns.hasFormulas ? "alert" : "ok"}
              ratingLabels={{
                alert: t("caption.quality.patterns_alert"),
                ok: t("caption.quality.patterns_ok"),
              }}
              explanation={semantic.formulaicPatterns.explanation}
              tone={semantic.formulaicPatterns.hasFormulas ? "danger" : "success"}
              examples={semantic.formulaicPatterns.hasFormulas ? semantic.formulaicPatterns.examples : undefined}
            />
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="flex items-start gap-2 text-xs text-content-tertiary leading-relaxed">
        <span className="shrink-0 mt-px">ⓘ</span>
        <span>
          {t("caption.section_c.footer_note")}{" "}
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
  symbol,
  label,
  text,
  toneClass,
}: {
  symbol: string;
  label: string;
  text: string;
  toneClass: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className={cn("text-[13px]", toneClass)}>{symbol}</span>
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
            <li key={i} className="text-xs text-content-tertiary italic leading-relaxed">
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
  const { t } = useTranslation("report");
  const hasSemantic = semantic != null;
  const themes = data.themes.items
    .filter((theme) => !isWeakThemeLabel(theme.label))
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
          {t("caption.empty")}
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
        t={t}
      />

      {/* ── B · Como escreve ── */}
      <SectionWritingAndExpressions
        data={data}
        hasSemantic={hasSemantic}
        semanticExpressions={semanticExpressions}
        deterministicExpressions={expressions}
        commentEngagement={data.commentEngagement}
        semanticCommentEngagement={hasSemantic ? semantic.commentEngagement : null}
        posts={posts}
      />

      {/* ── C · Leitura editorial ── */}
      <SectionEditorialReading data={data} semantic={semantic} t={t} />
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
  const { t } = useTranslation("report");
  return (
    <section
      aria-label={t("caption.aria")}
      className="rounded-2xl border border-border-subtle bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden p-4 sm:p-5 md:p-7 flex flex-col gap-5 sm:gap-6 md:col-span-2"
    >
      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-content-tertiary">
            <span className="w-6 h-6 rounded-md bg-surface-muted/60 flex items-center justify-center">
              <FileText className="w-3 h-3 text-content-tertiary/70" />
            </span>
            <span className="text-xs md:text-xs tracking-[0.16em] text-content-tertiary uppercase font-sans">
              <span className="hidden sm:inline">{t("caption.header_full", { sample: sampleSize, words: fmt(totalWords) })}</span>
              <span className="sm:hidden">{t("caption.header_mobile", { sample: sampleSize, words: fmt(totalWords) })}</span>
            </span>
          </div>
          <span className="text-xs md:text-xs font-medium tracking-[0.12em] text-content-tertiary/70 border border-border-subtle/60 rounded-full px-2 py-0.5">
            {t("caption.header_badge")}
          </span>
        </div>
        <h3 className="font-display text-[1.2rem] sm:text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight mt-4 sm:mt-5 break-words">
          {t("caption.title")}
        </h3>
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-relaxed mt-2">
          {t("caption.subtitle")}
        </p>
      </header>
      {children}
    </section>
  );
}