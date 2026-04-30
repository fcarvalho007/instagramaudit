# Consolidação · Knowledge Base de benchmark e credibilidade de fontes

Passagem cirúrgica para alinhar política de citação, helpers e prompt da IA. Sem provedores, sem schema, sem PDF, sem admin, sem `/report/example`.

## Ficheiros bloqueados — pedido de permissão

Duas alterações tocam ficheiros listados em `LOCKED_FILES.md`. Antes de avançar preciso de confirmação explícita:

1. **`KNOWLEDGE.md`** (locked · "Knowledge Base Policy") — Tarefa 5 exige separar fontes activas (Socialinsider, Buffer, Hootsuite) de fonte futura (Databox) e clarificar a regra de citação. Sem editar este ficheiro a política canónica fica incoerente com o código.
2. **`src/components/report-redesign/report-methodology.tsx`** (locked · "Report Redesign — stable foundation") — actualmente cita Databox como fonte visível activa e a copy interna refere "quatro fontes". Tarefa 3 pede para Databox ser interno/futuro, não visível como fonte activa.

Se preferires manter ambos intactos, faço uma variante reduzida do plano que documenta as divergências mas não as resolve no UI/política.

Assumo a partir daqui que **autorizas** ambas as edições (mínimas e cirúrgicas). Se não, dizes "manter locked" e ajusto.

## O que está hoje

- `INSTAGRAM_BENCHMARK_CONTEXT.sources` lista as 4 fontes com `uiDisplayAllowed: true` para todas → Databox aparece visível em metodologia e na `sourceNote` ("Contexto de referência: Socialinsider, Buffer, Hootsuite e Databox.").
- `report-positioning-banner.tsx` mostra essa `sourceNote` directamente → Databox visível no Bloco 01.
- `report-benchmark-evidence.tsx` mostra apenas nomes (sem URLs) — já em conformidade com a política.
- Não existem marcadores compactos `[1][2][3]` em lado nenhum — não há nada a desactivar; basta documentar como opção futura permitida.
- `getBenchmarkContextForProfile` já trata 1M+ correctamente: `bufferTier=null`, `internalTier="macro"`, `tierNote` preenchido com `macroTierNote`. Os testes já cobrem 1.2M. Falta apenas o caso fronteira **999 999** e **1 000 000** explícitos.
- `formatKnowledgeContextForPrompt` (`context.server.ts`) já proíbe atribuir benchmarks a fontes externas e proíbe URLs. **Não tem** wording "cite source when relevant" — não existe contradição directa. Apenas reforçar a regra no início do bloco para deixar claro que as fontes são contexto silencioso.
- `prompt-v2.ts` linha 44 diz: *"Quando relevante, citar benchmarks da Knowledge Base"*. Refere citar **valores** de benchmark, não fontes — e logo a seguir (linhas 51-52) proíbe nomes de empresas. Pequena clarificação textual recomendada para eliminar ambiguidade.
- `sanitizeAiCopy` está **já wired** em `openai-insights.server.ts:658`. Tarefa 6 reduz-se a actualizar comentário/doc.

## Mudanças propostas

### 1 · `src/lib/knowledge/benchmark-context.ts`

- Mudar `Databox.uiDisplayAllowed` de `true` para `false`. Adicionar comentário JSDoc `internalOnly: true` (campo opcional novo no tipo).
- Estender `BenchmarkSource` com:
  - `visibility: "active" | "future"` (`Socialinsider`/`Buffer`/`Hootsuite` = `active`; `Databox` = `future`).
- Actualizar `visibleCopyRulesPt.sourceNote` para:
  - `"Fontes de enquadramento: Socialinsider, Buffer e Hootsuite."`
- Adicionar `visibleCopyRulesPt.aboveBufferRangeHint`:
  - `"Perfil acima dos escalões públicos de referência usados nesta leitura."`
- `copyHints.tierNote` para perfis ≥1M passa a usar `aboveBufferRangeHint` (mais discreto e directo) em vez do `macroTierNote` actual. Manter `macroTierNote` como compatibilidade interna (prompt continua a recebê-lo).
- Bump `BENCHMARK_DATASET_VERSION` para `"2026-05-02"`.

### 2 · `src/lib/knowledge/context.server.ts`

Não há contradição activa, mas reforço explícito:

- Adicionar primeira linha ao bloco "Regras editoriais": *"As fontes editoriais (Socialinsider, Buffer, Hootsuite, Databox) são apenas contexto silencioso de mercado. NÃO atribuir o perfil analisado a estas fontes — elas não analisaram este perfil."*
- A regra existente sobre URLs e marcas mantém-se.

### 3 · `src/lib/insights/prompt-v2.ts`

Linha 44 — substituir:
- antes: *"Quando relevante, citar benchmarks da Knowledge Base (ex.: 'vs 4,2% médios para o tier'). Não inventar benchmarks que não venham da KB nem do payload."*
- depois: *"Quando relevante, citar **valores** de benchmark da Knowledge Base de forma anónima (ex.: 'vs 4,2% médios para o tier'). Nunca atribuir o perfil ou os benchmarks a fontes externas. Não inventar benchmarks que não venham da KB nem do payload."*

### 4 · `src/components/report-redesign/v2/report-benchmark-evidence.tsx`

- Tipar `sourceNames` com restrição literal a `"Socialinsider" | "Buffer" | "Hootsuite"` (Databox fica fora do UI activo).
- Adicionar prop opcional `aboveBufferRangeHint?: string` que, quando presente, renderiza uma segunda linha mono pequena com o aviso para perfis ≥1M.

### 5 · `src/components/report-redesign/v2/report-overview-cards.tsx`

- Quando `followers >= 1_000_000`, passar `aboveBufferRangeHint={...}` ao `ReportBenchmarkEvidence` e omitir `followerTier` (em vez de mostrar tier errado).
- `sourceNames={["Socialinsider", "Buffer"]}` mantém-se (já correcto).

### 6 · `src/components/report-redesign/v2/report-positioning-banner.tsx`

- Continua a usar `visibleCopyRulesPt.sourceNote` — sem alterações (a copy actualizada em 1 já remove Databox).

### 7 · `src/components/report-redesign/report-methodology.tsx` *(LOCKED)*

- Substituir o filtro `uiDisplayAllowed` por `s.visibility === "active"` na lista "Fontes de referência" → Databox sai automaticamente.
- Actualizar subtítulo: "Quatro fontes complementam-se…" → "Três fontes públicas complementam a leitura — recolha pública, referência de mercado e leitura editorial."
- Adicionar uma linha discreta em itálico no fim da secção "Fontes de referência":
  *"Databox fica reservado para futura ligação autenticada — métricas privadas como alcance, visitas e cliques."*

### 8 · `KNOWLEDGE.md` *(LOCKED)*

Reorganizar o §1 "Fontes editoriais aprovadas":

```text
## 1. Fontes editoriais

### 1.1 Activas no relatório público
- Socialinsider · contexto orgânico e por formato
- Buffer · contexto por escalão de seguidores
- Hootsuite · contexto de indústria

### 1.2 Reservada para futuro autenticado
- Databox · métricas privadas (alcance, visitas, cliques, saves)
  Não citar no relatório actual nem na linha de fontes visível.
```

Actualizar exemplo visível para:
> "Fontes de enquadramento: Socialinsider, Buffer e Hootsuite."

Acrescentar nota sobre marcadores `[1][2][3]`: permitidos quando claramente apresentados como referências externas, sempre com `target="_blank" rel="noopener noreferrer"` — actualmente não usados, opção futura.

### 9 · `src/lib/knowledge/sanitize-ai-copy.ts`

- Actualizar JSDoc do topo: trocar a nota "Implemented but not yet wired" para "Wired no orquestrador OpenAI v2 em `openai-insights.server.ts` (post-validation step)."

### 10 · Testes

`src/lib/knowledge/__tests__/benchmark-context.test.ts`:

- Ajustar teste "Databox baixa" → também verificar `visibility === "future"`.
- Ajustar teste "tem as quatro fontes aprovadas" → manter os 4 nomes mas separar:
  - `sources.filter(s => s.visibility === "active").map(...)` deve dar `["Buffer", "Hootsuite", "Socialinsider"]`.
- Acrescentar `it("Socialinsider/Buffer/Hootsuite são activas; Databox futura")`.
- Acrescentar `it("999 999 seguidores → tier 500K-1M")` → `expect(getBufferTierForFollowers(999_999)?.tier).toBe("500K-1M")`.
- Manter `1_000_000 → null` (já existe). Acrescentar `it("1M+ marca aboveBufferRangeHint em copyHints")` chamando `getBenchmarkContextForProfile({ followers: 1_000_000, ... })` e verificando `copyHints.tierNote` contém "acima dos escalões".
- Acrescentar `it("sourceNote visível não contém Databox")` → `expect(visibleCopyRulesPt.sourceNote).not.toContain("Databox")`.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`

## Relatório final entregará

- Ficheiros editados (incluindo confirmação dos dois locked).
- Confirmação de que `context.server.ts` não tinha "cite source when relevant" e qual foi o reforço aplicado.
- Wording final da linha de fontes visível.
- Comportamento 1M+ (tier null + hint).
- Estado Databox (interno/futuro).
- Resultado `tsc` e `vitest`.
