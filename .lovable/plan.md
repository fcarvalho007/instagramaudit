## Objetivo

Garantir que o `title` e o `body` dos insights de IA mostrados em `/analyze/$username` nunca contêm tokens técnicos (`engagement_pct`, `top_posts[0].likes`, `benchmark_value_pct`, `position below`, `difference_pct`, `content_summary.*`, etc.). O array `evidence[]` mantém-se inalterado para auditoria interna.

Sem chamadas a OpenAI, Apify ou DataForSEO.

## Ficheiros a editar (nenhum está locked)

- `src/lib/insights/prompt.ts` — endurecer `INSIGHTS_SYSTEM_PROMPT`.
- `src/lib/insights/validate.ts` — adicionar regra `TECHNICAL_LEAK` em `validateInsights`.

## Mudanças no prompt (`INSIGHTS_SYSTEM_PROMPT`)

Acrescentar uma nova secção **"Linguagem do título e do body (obrigatório)"** com:

- "evidence" é apenas para auditoria interna. NUNCA escrever no `title` nem no `body` os caminhos técnicos das evidências.
- Proibido em `title`/`body`:
  - Sufixos snake_case com `_pct`, `_count`, `_rate`, `_per_week`, `_summary`.
  - Caminhos com pontos ou colchetes: `top_posts[0]…`, `content_summary.…`, `benchmark.…`, `market_signals.…`, `competitors_summary.…`, `profile.…`.
  - Termos crus em inglês usados como rótulos: `position below`, `position above`, `position aligned`, `engagement_pct`, `benchmark_value_pct`, `profile_value_pct`, `difference_pct`, `dominant_format`.
- Traduzir sempre para linguagem natural pt-PT:
  - `engagement_pct` → "envolvimento médio" / "taxa de envolvimento".
  - `benchmark_value_pct` → "referência esperada para perfis semelhantes".
  - `profile_value_pct` → "valor actual do perfil".
  - `difference_pct` → "diferença face à referência" (em pontos percentuais).
  - `position below/above/aligned` → "abaixo da referência" / "acima da referência" / "alinhado com a referência".
  - `top_posts[0].likes` → "as publicações com melhor desempenho" / "o post mais forte".
  - `estimated_posts_per_week` → "ritmo de publicação semanal".
  - `dominant_format` → "formato dominante".
- Reforçar: números podem (e devem) aparecer em `body`, mas formatados em pt-PT (`-87,38 pp`, `4,2%`, `2 publicações por semana`), nunca como tokens crus.
- Adicionar dois exemplos curtos no prompt: um BAD ("position below e difference_pct -87.38 face a benchmark_value_pct") e um GOOD ("o envolvimento médio está muito abaixo da referência…").

## Mudanças no validador (`validate.ts`)

Adicionar nova função pura `detectTechnicalLeak(text: string): string | null` e nova razão de falha `TECHNICAL_LEAK`. Aplicada a `title` e `body` (nunca a `evidence`).

Padrões rejeitados (regex, case-insensitive quando faz sentido):

1. Sufixos snake_case técnicos: `\b\w+_(pct|count|rate|per_week|summary|likes|comments)\b`
2. Caminhos com ponto: `\b(content_summary|benchmark|market_signals|competitors_summary|profile|top_posts)\.[a-z_]+`
3. Indexação de array: `top_posts\s*\[\s*\d+\s*\]`
4. Tokens em inglês usados como rótulo: `\bposition\s+(below|above|aligned)\b`, `\bdominant_format\b`, `\bbenchmark_value_pct\b`, `\bprofile_value_pct\b`, `\bdifference_pct\b`, `\bengagement_pct\b`
5. snake_case genérico de ≥2 palavras: `\b[a-z]+_[a-z][a-z_]+\b` — devolve match exacto para o `detail`.

Integração em `validateInsights`:

```text
// dentro do for (const item of items), após BODY_TOO_LONG e antes de hasQuantitativeMarker:
const leakTitle = detectTechnicalLeak(item.title);
const leakBody = detectTechnicalLeak(item.body);
if (leakTitle || leakBody) {
  return fail("TECHNICAL_LEAK", `id=${item.id} token=${leakTitle ?? leakBody}`);
}
```

Atualizar o cabeçalho do ficheiro com a nova razão `TECHNICAL_LEAK — token técnico detectado em title/body`.

`evidence[]` continua intocado: aliases continuam a funcionar, `EVIDENCE_INVALID` continua a aplicar-se. A nova regra só toca em campos editoriais.

## Auto-teste (sem rede)

Criar `/tmp/insights-leak-check.ts` (fora do repo, descartável) que importa `detectTechnicalLeak` e corre sobre frases mock para confirmar:

- Rejeita: `"Benchmark indica position below e difference_pct -87.38 face a benchmark_value_pct."`
- Rejeita: `"top_posts[0].likes mostra baixa resposta."`
- Rejeita: `"content_summary.average_engagement_rate está fraco."`
- Aceita: `"O envolvimento médio está muito abaixo da referência esperada para perfis semelhantes. Rever o formato dominante e testar variações de criativo durante 4 semanas."`
- Aceita: `"As publicações com melhor desempenho continuam a ter poucos gostos absolutos. Testar capas mais fortes e chamadas à acção no primeiro slide."`

Validação final: `bunx tsc --noEmit`.

## Garantias

- Sem alterações em UI, PDF, `/report/example`, providers ou ficheiros locked.
- `evidence[]` persiste exactamente como hoje (auditoria interna preservada).
- Nenhuma chamada a OpenAI, Apify ou DataForSEO.
- Snapshots antigos não são tocados; a regra só se aplica a futuras gerações que passem por `validateInsights`.

## Checkpoint

- ☐ `INSIGHTS_SYSTEM_PROMPT` atualizado com regras de linguagem para `title`/`body` e exemplos BAD/GOOD.
- ☐ `validate.ts` exporta `detectTechnicalLeak` e devolve `TECHNICAL_LEAK` quando aplicável.
- ☐ `evidence[]` permanece inalterado e continua a aceitar caminhos canónicos + aliases.
- ☐ Auto-teste pontual confirma rejeição/aceitação dos exemplos do brief.
- ☐ `bunx tsc --noEmit` verde.
