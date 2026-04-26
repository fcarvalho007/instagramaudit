/**
 * Pure, deterministic text helpers for the real report adapter.
 *
 * - `extractTopHashtags` aggregates `posts[].hashtags` and computes the
 *   average engagement of the posts where each hashtag appears.
 * - `extractTopKeywords` tokenises `posts[].caption`, removes a small
 *   pt-PT stop-word list, and ranks tokens by frequency.
 *
 * No I/O, no Date.now, no randomness. Same input → same output.
 */

// ---------- shared types ----------

export interface PostForText {
  caption?: string | null;
  hashtags?: string[] | null;
  /** Engagement percentage of the post, used for the per-hashtag avg. */
  engagement_pct?: number | null;
}

export interface HashtagRow {
  /** Always prefixed with `#`. */
  tag: string;
  uses: number;
  /** Average engagement_pct across posts where this hashtag appears. */
  avgEngagement: number;
}

export interface KeywordRow {
  word: string;
  count: number;
}

// ---------- pt-PT stop-words ----------
// Curated short list — function words, pronouns, common verbs/auxiliaries,
// connectors. Lowercase, accent-stripped (the tokenizer also strips accents
// before matching so both forms are filtered).
const STOP_WORDS_PT = new Set<string>([
  // articles
  "o", "a", "os", "as", "um", "uma", "uns", "umas",
  // prepositions / contractions
  "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "para", "por", "pelo", "pela", "pelos", "pelas", "com", "sem", "sob",
  "sobre", "ate", "entre", "desde", "contra", "ao", "aos", "a",
  // conjunctions
  "e", "ou", "mas", "que", "porque", "pois", "se", "como", "quando",
  "enquanto", "embora", "porem", "logo", "portanto", "tambem", "tao",
  // pronouns
  "eu", "tu", "ele", "ela", "nos", "vos", "eles", "elas", "voce", "voces",
  "me", "te", "se", "lhe", "lhes", "nos", "vos", "lo", "la", "los", "las",
  "meu", "minha", "meus", "minhas", "teu", "tua", "teus", "tuas",
  "seu", "sua", "seus", "suas", "nosso", "nossa", "nossos", "nossas",
  "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
  "isto", "isso", "aquilo", "aquele", "aquela", "aqueles", "aquelas",
  // common verbs / auxiliaries
  "ser", "sou", "es", "e", "somos", "sao", "era", "eram", "foi", "foram",
  "estar", "estou", "estas", "esta", "estamos", "estao", "estava",
  "ter", "tenho", "tens", "tem", "temos", "tens", "tinha", "tinham",
  "haver", "ha", "havia", "houve",
  "ir", "vou", "vais", "vai", "vamos", "vao", "ia",
  "fazer", "faco", "fazes", "faz", "fazemos", "fazem",
  "poder", "posso", "podes", "pode", "podemos", "podem",
  // adverbs / quantifiers
  "nao", "sim", "ja", "ainda", "muito", "muita", "muitos", "muitas",
  "pouco", "pouca", "poucos", "poucas", "mais", "menos", "todo", "toda",
  "todos", "todas", "outro", "outra", "outros", "outras", "mesmo",
  "mesma", "tudo", "nada", "algum", "alguma", "alguns", "algumas",
  "qualquer", "quaisquer", "cada", "so", "apenas", "bem", "mal",
  "aqui", "ali", "la", "agora", "depois", "antes", "hoje", "ontem",
  "amanha", "sempre", "nunca", "talvez",
  // EN noise that creeps in
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is",
  "it", "this", "that", "with", "as", "by",
]);

// ---------- helpers ----------

function stripAccents(s: string): string {
  // NFD splits accents into combining marks; the regex strips them.
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normaliseHashtag(raw: string): string | null {
  const trimmed = raw.trim().replace(/^#+/, "");
  if (trimmed.length === 0) return null;
  // Allow letters, digits, underscores; reject anything else.
  if (!/^[\p{L}\p{N}_]+$/u.test(trimmed)) return null;
  return `#${trimmed.toLowerCase()}`;
}

/**
 * Tokenise a caption into lowercase, accent-stripped word candidates.
 * Splits on anything that is not a unicode letter/digit/underscore. Strips
 * leading hashtags (`#word` is excluded — handled by the hashtag aggregator)
 * and mentions (`@user`).
 */
function tokenise(caption: string): string[] {
  // Drop hashtags and mentions before tokenising, so they never count as
  // keywords. We replace the whole token with whitespace.
  const cleaned = caption
    .replace(/[@#][\p{L}\p{N}_]+/gu, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\d_]+/g, " ");

  const stripped = stripAccents(cleaned).toLowerCase();
  // Split on any non word-char (post-strip ASCII).
  return stripped.split(/[^a-z]+/).filter((w) => w.length >= 4);
}

// ---------- public API ----------

/**
 * Aggregate hashtags across posts. Sorted by usage DESC, then by tag ASC for
 * deterministic ordering when usage ties. Returns the top `limit`.
 */
export function extractTopHashtags(
  posts: readonly PostForText[],
  limit = 5,
): HashtagRow[] {
  const usage = new Map<string, { count: number; engSum: number }>();
  for (const p of posts) {
    const hashtags = Array.isArray(p.hashtags) ? p.hashtags : [];
    const eng =
      typeof p.engagement_pct === "number" && Number.isFinite(p.engagement_pct)
        ? p.engagement_pct
        : 0;
    // Avoid double-counting the same hashtag inside one post.
    const seen = new Set<string>();
    for (const raw of hashtags) {
      const tag = normaliseHashtag(String(raw));
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      const cur = usage.get(tag) ?? { count: 0, engSum: 0 };
      cur.count += 1;
      cur.engSum += eng;
      usage.set(tag, cur);
    }
  }

  const rows: HashtagRow[] = [];
  for (const [tag, agg] of usage) {
    const avg = agg.count > 0 ? agg.engSum / agg.count : 0;
    rows.push({
      tag,
      uses: agg.count,
      avgEngagement: Number(avg.toFixed(2)),
    });
  }
  rows.sort((a, b) => (b.uses - a.uses) || a.tag.localeCompare(b.tag));
  return rows.slice(0, Math.max(0, limit));
}

/**
 * Extract top keywords from captions. Lowercased + accent-stripped. Filters
 * the pt-PT stop-word list. Sorted by count DESC, then word ASC.
 */
export function extractTopKeywords(
  posts: readonly PostForText[],
  limit = 5,
): KeywordRow[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    if (!p.caption) continue;
    for (const tok of tokenise(p.caption)) {
      if (STOP_WORDS_PT.has(tok)) continue;
      counts.set(tok, (counts.get(tok) ?? 0) + 1);
    }
  }
  const rows: KeywordRow[] = [];
  for (const [word, count] of counts) {
    rows.push({ word, count });
  }
  rows.sort((a, b) => (b.count - a.count) || a.word.localeCompare(b.word));
  return rows.slice(0, Math.max(0, limit));
}
