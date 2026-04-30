
## Contexto

Cinco frentes pequenas e cirúrgicas, todas dentro do Bloco 01 / Bloco 02 do report v2, sem mexer em providers nem no esquema de dados.

1. **Pergunta 04 · Temas** — atualmente lê-se apenas como uma headline curta + barras pequenas dentro do mesmo card visual das outras perguntas. Não fica claro que vem das *legendas* nem se vê bem *quais* temas são abordados.
2. **Prioridades de ação** — hoje são derivadas por regras determinísticas (`derivePriorities`) e podem sair só 1 ou 2 itens fracos. O utilizador quer 3 prioridades robustas, com formulação assistida por IA.
3. **Espaçamento dos cards do Bloco 02** — ar geral apertado.
4. **Tipografia (Bloco 01 + 02)** — auditar tamanho/cor de texto.
5. **Limite de 3 fontes na página** — confirmar que apenas Fraunces (display) + Inter (corpo) + JetBrains Mono (números/eyebrow) estão a ser usadas, e que os números grandes passam para mono nos sítios certos.

---

## Alterações

### 1 · Pergunta 04 “Temas” passa a caixa destacada e isolada

Em `src/components/report-redesign/v2/report-diagnostic-block.tsx`:

- Retirar `q04` (Temas) do `groupB` para que **deixe de ser um card 1/3** misturado com hashtags / linguagem / resposta.
- Renderizar a Pergunta 04 num bloco próprio **full-width** entre o veredito e o Grupo A (ou entre Grupo B e Grupo C — ver rascunho abaixo), com chrome visualmente diferente: card largo, padding generoso, eyebrow “PERGUNTA 04 · TEMAS DAS LEGENDAS”, e gráfico maior.

Criar `src/components/report-redesign/v2/report-themes-feature.tsx` (novo):
- Header com pergunta em serif + chip discreto “Baseado nas legendas analisadas” (sempre visível, não opcional).
- Headline em serif (já vem de `themes.headline`).
- **Gráfico diferenciador**: lista vertical estilo *bubble/word ranking* — cada tema com a palavra grande (Inter semibold), barra horizontal proporcional e contagem `12×` em mono à direita. Mostra até 6 temas em vez de 4, em duas colunas em desktop.
- Quando `source === "ai"`: mostra a interpretação da IA num bloco lateral à direita (split 60/40 em desktop) com label “Leitura IA · interpretação” em mono pequeno + texto em itálico.
- Quando `source === "deterministic"`: mantém só a lista (sem coluna IA).
- Footer com micro-explicação fixa: *“Estes temas resultam da análise das palavras recorrentes nas legendas. Não correspondem necessariamente às hashtags, que vivem na Pergunta 03.”*
- Empty-state explícito: *“A amostra ainda não tem palavras suficientes para identificar temas claros.”*

Robustez do código (`src/lib/report/block02-diagnostic.ts`, `inferThemesFromCaptions`):
- Aumentar de 5 → 8 itens devolvidos para a UI poder mostrar até 6 com folga.
- Adicionar campo `derivedFrom: "ai-language" | "captions-keywords"` para a UI rotular sem ambiguidade a fonte.
- Filtro determinístico extra: descartar palavras com 1–2 chars, stop-words pt e tokens só numéricos (lista curta no próprio módulo). Já existe parcial — endurecer.

### 2 · Prioridades de ação assistidas pela IA (3 robustas)

A geração já chama OpenAI via `prompt-v2.ts`. Vamos adicionar uma 10ª secção opcional dedicada a prioridades, sem partir o cache antigo:

- Em `src/lib/insights/types.ts`: adicionar opcionalmente `priorities` ao `AiInsightsV2.sections` como `Array<{ level: "alta"|"media"|"oportunidade"; title: string; body: string; resolves: string }>` com `length === 3`. Manter retrocompatibilidade — leitor tolera ausência.
- Em `src/lib/insights/prompt-v2.ts`:
  - Acrescentar instrução: *“Devolves também `priorities`: exactamente 3 itens accionáveis derivados do diagnóstico (tipo de conteúdo, funil, captions, audiência, integração, formato dominante). Cada item: `level` ∈ {alta, media, oportunidade}, `title` ≤ 60 chars no infinitivo, `body` 1 frase ≤ 180 chars com número concreto do payload, `resolves` indica que pergunta(s) (Q01–Q08) endereça.”*
  - Adicionar `priorities` ao `RESPONSE_JSON_SCHEMA_V2` com `minItems: 3, maxItems: 3`.
  - Aumentar levemente o payload do user prompt para incluir os classifiers do Block 02 já calculados (forma compacta, ver §Detalhes técnicos).
- Em `src/components/report-redesign/v2/report-diagnostic-block.tsx`:
  - `derivePriorities` continua como **fallback** quando a IA não devolver prioridades válidas (cache antigo, falha de schema, drift). Renomeá-lo internamente `derivePrioritiesFallback` para deixar a hierarquia óbvia.
  - Passar `aiPriorities = result.enriched.aiInsightsV2?.sections.priorities ?? null` para `<ReportDiagnosticPriorities>`.
- Em `src/components/report-redesign/v2/report-diagnostic-priorities.tsx`:
  - Aceitar `items` vindos da IA OU do fallback.
  - Quando vêm da IA, o cabeçalho ganha um chip mono pequeno *“Leitura IA · prioridades”* (mesmo padrão do `aiSource` dos outros cards).
  - Garantir sempre 3 cards (a IA já devolve 3; o fallback completa até 3 com itens neutros se necessário).

### 3 · Espaçamento dos cards do Bloco 02

Apertar/respirar de forma sistemática nos cards das perguntas:

- `report-diagnostic-card.tsx`:
  - `p-5 md:p-6` → `p-6 md:p-7`.
  - `gap-4` interno → `gap-5`.
  - Espaço entre `body` e o footer com `sourceType`: trocar `pt-3 border-t border-slate-100` por `pt-4 mt-2 border-t border-slate-100`.
- `report-diagnostic-grid-v2.tsx` (caso ainda usado por algum shell): mesmo padding.
- `report-diagnostic-group.tsx`: aumentar gap externo entre cards `gap-4 md:gap-5` → `gap-5 md:gap-6`.
- `report-diagnostic-block.tsx`: `space-y-8 md:space-y-10` → `space-y-10 md:space-y-12` para separar veredito → grupos → temas → prioridades → CTA.
- `report-diagnostic-priorities.tsx`: padding interno `p-5` → `p-6`.

### 4 · Tipografia — Bloco 01 + 02

Auditar e harmonizar (sem inventar tokens novos):

**Bloco 01 (`report-overview-cards.tsx`)**
- Números grandes (3rem, 2rem) → manter tamanho mas trocar `font-display` por `font-mono` com `font-medium` para ficar consistente com o admin (JetBrains Mono tabular). Hoje os “3,2 %”, “0,3” e “100%” estão em Fraunces, o que pesa demais e introduz uma 4ª intenção tipográfica face aos cabeçalhos.
- `text-slate-500` em legendas micro: subir para `text-slate-600` quando o tamanho for ≤ 11.5px (legibilidade WCAG no fundo branco).

**Bloco 02 (`report-diagnostic-card.tsx`)**
- `answer` (a “Resposta dominante”) está em `font-display` 1.125–1.25rem — manter, é onde a serifada faz sentido (continua a ser título curto).
- `primary` numérico das versões antigas (grid v2) — também passa para `font-mono` se for puramente numérico.
- `body` em `text-slate-600 text-sm` → `text-[14px] text-slate-700 leading-relaxed`.
- Eyebrow: já em mono `text-[10px]` — ok, mas uniformizar tracking para `tracking-[0.16em]` em todo o lado (hoje há 0.14, 0.16, 0.18 misturados).

### 5 · Confirmar regra de 3 fontes na página

Já só temos 3 famílias declaradas (`Fraunces`, `Inter`, `JetBrains Mono`). Riscos detectados:
- Nenhum import extra de Google Fonts a adicionar — confirmado em `tokens.css` / `styles.css`.
- Garantir que nenhum componente do report usa `font-serif` cru ou `font-sans` fora dos tokens. Fazer pesquisa final e remover ocorrências inconsistentes (apenas `font-display`, `font-sans` (Inter via base), `font-mono`).

---

## Detalhes técnicos

**`AiInsightsV2.sections.priorities` no payload do user prompt**
Em `prompt-v2.ts`, ao construir o user payload, incluir um bloco compacto:
```json
{
  "block02_diagnostic": {
    "content_type": { "label": "...", "share_pct": 42, "sample_size": 24 },
    "funnel": { "label": "...", "share_pct": 35 },
    "caption": { "label": "...", "avg_length": 187, "cta_share_pct": 22, "question_share_pct": 14 },
    "audience": { "label": "...", "comments_to_likes_pct": 1.6 },
    "integration": { "label": "...", "bio_link": true, "cta_share_pct": 22 },
    "dominant_format": { "label": "Reels", "share_pct": 72 }
  }
}
```
Calculado por uma helper nova `buildBlock02Snapshot(result, payload)` em `src/lib/insights/build-context.ts` reutilizando os classifiers já existentes — sem nova chamada a providers.

**Cache-bust**
Bumpar `BENCHMARK_DATASET_VERSION` para `2026-05-08` (campo `priorities` muda o schema esperado).

**Validação**
- `src/lib/insights/validate-v2.ts`: aceitar `priorities` opcional; quando presente validar `length === 3` e `level` no enum.
- Atualizar/adicionar testes:
  - `src/lib/insights/__tests__/validate-v2.test.ts` (novo se não existir) — cobrir presença/ausência de `priorities`.
  - `src/lib/report/__tests__/block02-themes.test.ts` — testar `inferThemesFromCaptions` com stop-words, tokens curtos e cap a 8.
  - `src/components/report-redesign/v2/__tests__/report-diagnostic-priorities.test.tsx` — cobrir fallback determinístico vs origem IA.

**Rollback seguro**
Tudo aditivo: se a IA não devolver `priorities`, cai para `derivePrioritiesFallback`. Se o snapshot antigo não tiver `themes` AI, o `report-themes-feature` mostra a versão determinística.

---

## Ficheiros tocados

Novos:
- `src/components/report-redesign/v2/report-themes-feature.tsx`
- `src/lib/report/__tests__/block02-themes.test.ts`
- `src/components/report-redesign/v2/__tests__/report-diagnostic-priorities.test.tsx`

Editados:
- `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- `src/components/report-redesign/v2/report-diagnostic-card.tsx`
- `src/components/report-redesign/v2/report-diagnostic-group.tsx`
- `src/components/report-redesign/v2/report-diagnostic-priorities.tsx`
- `src/components/report-redesign/v2/report-overview-cards.tsx`
- `src/lib/report/block02-diagnostic.ts` (themes hardening + export do builder de snapshot)
- `src/lib/insights/prompt-v2.ts` (instrução + schema `priorities`)
- `src/lib/insights/types.ts` (campo `priorities` opcional)
- `src/lib/insights/validate-v2.ts`
- `src/lib/insights/build-context.ts` (helper `buildBlock02Snapshot`)
- `src/lib/knowledge/benchmark-context.ts` (bump dataset version)

---

## Validação final

- `bunx tsc --noEmit`
- `bunx vitest run`
- Verificar visualmente em `/admin/report-preview/...` que:
  - Pergunta 04 aparece como bloco isolado, full-width, com gráfico próprio.
  - Aparecem 3 prioridades; chip “Leitura IA · prioridades” quando vêm da IA.
  - Cards do Bloco 02 respiram mais; números grandes em mono em ambos os blocos.
  - Continuam só 3 famílias tipográficas em uso.

## Checkpoint

- ☐ Pergunta 04 isolada num bloco próprio com gráfico diferenciador e fonte “legendas” explícita
- ☐ `inferThemesFromCaptions` mais robusto (stop-words, comprimento, cap 8)
- ☐ OpenAI passa a devolver 3 prioridades; fallback determinístico mantém-se
- ☐ Espaçamento dos cards do Bloco 02 aumentado de forma consistente
- ☐ Números grandes do Bloco 01 e 02 migrados para JetBrains Mono
- ☐ Confirmadas apenas 3 famílias tipográficas em uso
- ☐ tsc + vitest verdes
