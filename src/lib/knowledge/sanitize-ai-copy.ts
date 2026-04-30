/**
 * Validador anti-invenção para texto produzido por IA antes de ser
 * exibido no relatório.
 *
 * Implementa a política definida em `KNOWLEDGE.md` e na nota
 * "Política de fontes de benchmark" da Knowledge Base. Não bloqueia
 * render — apenas devolve violações para serem registadas em log.
 *
 * **Wiring actual:** ligado ao orquestrador OpenAI v2 em
 * `src/lib/insights/openai-insights.server.ts` (passo de pós-validação
 * após o JSON estrito do modelo) — modo log-only, sem rejeitar a
 * resposta. Ver `sanitizeAiCopy(text, { hasReachData })` no orquestrador.
 *
 * Categorias de violação:
 *  - `technical_term`     — vocabulário técnico que nunca deve aparecer
 *                           no UI (`payload`, `engagement_pct`, etc).
 *  - `source_attribution` — atribuição directa do perfil às fontes
 *                           externas ("segundo a Socialinsider…").
 *  - `invented_metric`    — menção a métricas que requerem acesso
 *                           autenticado (alcance, saves, partilhas,
 *                           visitas, cliques) quando `hasReachData=false`.
 *  - `external_link`      — qualquer URL ou domínio das fontes
 *                           editoriais aprovadas.
 */
export type SanitizeViolationKind =
  | "technical_term"
  | "source_attribution"
  | "invented_metric"
  | "external_link";

export interface SanitizeViolation {
  kind: SanitizeViolationKind;
  match: string;
  /** Índice de início no texto original (útil para highlight em logs). */
  index: number;
}

export interface SanitizeAiCopyOptions {
  /**
   * Quando `true`, o validador permite menções a alcance/reach/saves/
   * partilhas/visitas/cliques (assume-se que o snapshot tem esses dados).
   * Padrão: `false` — a maioria dos perfis públicos não tem.
   */
  hasReachData?: boolean;
}

export interface SanitizeAiCopyResult {
  ok: boolean;
  violations: SanitizeViolation[];
}

const TECHNICAL_TERMS = [
  /\bpayload\b/gi,
  /\bengagement_pct\b/gi,
  /\bresult\.data\b/gi,
  /\bkeyMetrics\b/gi,
  /\bAPI response\b/gi,
  /\bscraper output\b/gi,
  // Domínio Apify / Instagram raw fields que podem escapar para o copy.
  /\bengagement_rate\b/gi,
  /\ber_pct\b/gi,
  /\bfollowers_count\b/gi,
  /\bmediaType\b/g,
  /\bplayCount\b/g,
  /\bvideoViewCount\b/g,
  // Acessos crus a estruturas de dados — sinal claro de leak técnico.
  /\b(?:posts|items|data|results)\[\d+\]/gi,
] as const;

// Atribuições directas em PT/EN (singular e plural, com / sem artigo).
const SOURCE_ATTRIBUTION = [
  /\bsegundo (?:a|o) (?:Socialinsider|Buffer|Hootsuite|Databox)\b/gi,
  /\bde acordo com (?:a|o) (?:Socialinsider|Buffer|Hootsuite|Databox)\b/gi,
  /\baccording to (?:Socialinsider|Buffer|Hootsuite|Databox)\b/gi,
] as const;

// Métricas que requerem acesso autenticado / dados que não vêm de
// scraping público. Listamos formas PT-PT.
const RESTRICTED_METRICS = [
  /\balcance\b/gi,
  /\breach\b/gi,
  /\bsaves\b/gi,
  /\bpartilhas\b/gi,
  /\bimpress(?:ões|ao)\b/gi,
  /\bvisitas ao perfil\b/gi,
  /\bcliques no website\b/gi,
] as const;

const EXTERNAL_LINKS = [
  /\bhttps?:\/\/[^\s)]+/gi,
  /\b(?:socialinsider|buffer|hootsuite|databox)\.com\b/gi,
] as const;

function collect(
  text: string,
  patterns: ReadonlyArray<RegExp>,
  kind: SanitizeViolationKind,
  out: SanitizeViolation[],
): void {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      out.push({ kind, match: m[0], index: m.index });
      if (m[0].length === 0) pattern.lastIndex++;
    }
  }
}

/**
 * Avalia um bloco de texto produzido por IA. Devolve `ok=false` se
 * existir qualquer violação. O chamador decide se descarta o texto,
 * apenas regista, ou ambos.
 */
export function sanitizeAiCopy(
  text: string,
  options: SanitizeAiCopyOptions = {},
): SanitizeAiCopyResult {
  const violations: SanitizeViolation[] = [];
  if (!text || typeof text !== "string") {
    return { ok: true, violations };
  }

  collect(text, TECHNICAL_TERMS, "technical_term", violations);
  collect(text, SOURCE_ATTRIBUTION, "source_attribution", violations);
  collect(text, EXTERNAL_LINKS, "external_link", violations);

  if (!options.hasReachData) {
    collect(text, RESTRICTED_METRICS, "invented_metric", violations);
  }

  // Ordena por posição no texto para tornar o output estável.
  violations.sort((a, b) => a.index - b.index);

  return { ok: violations.length === 0, violations };
}
