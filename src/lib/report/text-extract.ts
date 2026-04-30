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

export interface ThemeRow {
  /** Palavra-âncora (ou bigrama) já em pt-PT, com acentos preservados quando possível. */
  word: string;
  /** Total de ocorrências em todas as legendas analisadas. */
  count: number;
  /** Nº de posts distintos onde o tema apareceu. */
  postsCount: number;
  /** Excertos curtos (≤ 90 chars) extraídos da legenda original, centrados na ocorrência. Máx 2. */
  snippets: string[];
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
  // ruído editorial criativo recorrente em pt
  "conteudo", "pessoas", "coisa", "coisas", "forma", "tipo", "vida",
  "tempo", "ainda", "sempre", "nunca", "pouco", "outros", "outras",
  "novo", "nova", "novos", "novas", "primeira", "primeiro", "alguma",
  "obrigado", "obrigada",
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

// ---------- temas com evidência ----------

/**
 * Bigramas conhecidos no nicho criativo/marketing pt — quando os dois
 * tokens co-ocorrem na mesma legenda, contam como tema unificado em vez
 * de duas palavras isoladas. A chave é a forma normalizada (sem acentos).
 */
const KNOWN_BIGRAMS: ReadonlyArray<{ key: string; display: string }> = [
  { key: "marketing digital", display: "Marketing digital" },
  { key: "inteligencia artificial", display: "Inteligência artificial" },
  { key: "redes sociais", display: "Redes sociais" },
  { key: "marca pessoal", display: "Marca pessoal" },
  { key: "negocio digital", display: "Negócio digital" },
  { key: "estrategia conteudo", display: "Estratégia de conteúdo" },
  { key: "criacao conteudo", display: "Criação de conteúdo" },
];

/** Extrai um snippet curto (≤ 90 chars) centrado na ocorrência da palavra. */
function buildSnippet(caption: string, needle: string): string | null {
  const flatCap = stripAccents(caption).toLowerCase();
  const flatNeedle = stripAccents(needle).toLowerCase();
  const idx = flatCap.indexOf(flatNeedle);
  if (idx < 0) return null;
  const max = 90;
  const half = Math.floor((max - flatNeedle.length) / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(caption.length, idx + flatNeedle.length + half);
  // Snap to word boundaries when possible
  while (start > 0 && /\S/.test(caption[start - 1] ?? "")) start -= 1;
  while (end < caption.length && /\S/.test(caption[end] ?? "")) end += 1;
  let slice = caption.slice(start, end).replace(/\s+/g, " ").trim();
  // Strip leading/trailing hashtags ou pontuação solta
  slice = slice.replace(/^[#@\W_]+/, "").replace(/[#@\W_]+$/, "").trim();
  if (slice.length === 0) return null;
  if (slice.length > max) slice = slice.slice(0, max - 1).trimEnd() + "…";
  const prefix = start > 0 ? "…" : "";
  const suffix = end < caption.length ? "…" : "";
  return `${prefix}${slice}${suffix}`;
}

/**
 * Extrai temas dominantes a partir das legendas, com evidência:
 * peso, contagem de posts e até 2 excertos curtos. Inclui detecção de
 * bigramas conhecidos do nicho criativo/marketing.
 *
 * O ranking final é por nº de posts distintos (desempate: contagem total,
 * depois ordem alfabética). Privilegia temas que aparecem em vários
 * posts em vez de uma única menção repetida.
 */
export function extractTopThemes(
  posts: readonly PostForText[],
  limit = 8,
): ThemeRow[] {
  type Agg = {
    display: string;
    count: number;
    postIdx: Set<number>;
    snippets: string[];
    seenSnippetKeys: Set<string>;
  };
  const agg = new Map<string, Agg>();

  const ensure = (key: string, display: string): Agg => {
    let cur = agg.get(key);
    if (!cur) {
      cur = {
        display,
        count: 0,
        postIdx: new Set(),
        snippets: [],
        seenSnippetKeys: new Set(),
      };
      agg.set(key, cur);
    }
    return cur;
  };

  posts.forEach((p, postIndex) => {
    if (!p.caption) return;
    const caption = p.caption;
    const flat = stripAccents(caption).toLowerCase();

    // 1) Bigramas conhecidos primeiro — quando matched, os tokens
    //    individuais ainda contam (não os removemos), mas o bigrama
    //    geralmente vai ganhar pelo postsCount.
    for (const bg of KNOWN_BIGRAMS) {
      if (flat.includes(bg.key)) {
        const cur = ensure(bg.key, bg.display);
        cur.count += 1;
        cur.postIdx.add(postIndex);
        const snip = buildSnippet(caption, bg.key);
        if (snip && !cur.seenSnippetKeys.has(snip.toLowerCase())) {
          if (cur.snippets.length < 2) cur.snippets.push(snip);
          cur.seenSnippetKeys.add(snip.toLowerCase());
        }
      }
    }

    // 2) Tokens individuais
    const tokens = tokenise(caption);
    const seenInPost = new Set<string>();
    for (const tok of tokens) {
      if (STOP_WORDS_PT.has(tok)) continue;
      if (tok.length < 5) continue; // tokens muito curtos raramente são "temas"
      const cur = ensure(tok, tok);
      cur.count += 1;
      if (!seenInPost.has(tok)) {
        cur.postIdx.add(postIndex);
        seenInPost.add(tok);
        const snip = buildSnippet(caption, tok);
        if (snip && !cur.seenSnippetKeys.has(snip.toLowerCase())) {
          if (cur.snippets.length < 2) cur.snippets.push(snip);
          cur.seenSnippetKeys.add(snip.toLowerCase());
        }
      }
    }
  });

  const rows: ThemeRow[] = [];
  for (const [, v] of agg) {
    rows.push({
      word: capitaliseDisplay(v.display),
      count: v.count,
      postsCount: v.postIdx.size,
      snippets: v.snippets,
    });
  }
  rows.sort(
    (a, b) =>
      b.postsCount - a.postsCount ||
      b.count - a.count ||
      a.word.localeCompare(b.word),
  );
  return rows.slice(0, Math.max(0, limit));
}

function capitaliseDisplay(s: string): string {
  if (!s) return s;
  // Bigramas conhecidos já vêm com casing correcto
  if (s.includes(" ") || s[0] === s[0].toUpperCase()) return s;
  return s[0].toUpperCase() + s.slice(1);
}
