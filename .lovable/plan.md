
## Block 02 · Diagnóstico — Refinamento

### Estado atual (verificado)

Block 02 hoje renderiza, pela ordem:
1. `ReportAiReading` (compact) — síntese editorial em 2 colunas.
2. `ReportEditorialPatterns` — até **6** cards (tendência, legenda, hashtags, menções, duração reels, alinhamento procura), em grid `1 / 2 / 3` colunas. Quando 5 estão disponíveis surge o tal "card órfão" na 2.ª linha.

Problemas identificados:
- Grid `lg:grid-cols-3` produz layout desequilibrado quando há 4–5 cards.
- A "Tendência de envolvimento" repete o que a Leitura IA e o cartão de envolvimento do Block 01 já dizem.
- Cards usam linguagem técnica (`ER médio 2.34%`, `lift +12%`, `keywords`), contra as regras pt-PT.
- `ReportAiReading` está envolvido em `ReportSectionFrame` que tem o seu próprio `max-w-7xl + px-5/6` — dentro do shell isto cria uma faixa branca a sangrar para fora do ritmo dos cards.

### Bloqueio importante a confirmar

`src/components/report-redesign/report-ai-reading.tsx` está em `LOCKED_FILES.md`. Para alinhar a largura da Leitura IA tenho duas opções:

- **A (preferida, sem mexer no ficheiro locked)**: passar a Leitura IA dentro de um wrapper local em `report-shell-v2.tsx` que neutraliza o `max-w-7xl/px-*` do `ReportSectionFrame` (ex.: `<div className="[&_.max-w-7xl]:max-w-none [&_.max-w-7xl]:px-0">`). Não toca em `report-ai-reading.tsx`.
- **B**: editar `report-ai-reading.tsx` para aceitar uma prop `bare` que omite o frame. **Requer aprovação explícita** porque o ficheiro está locked.

A plano abaixo segue **A**. Se preferires B, diz e ajusto.

### Mudanças

**1. `src/components/report-redesign/report-editorial-patterns.tsx`** (não locked)

Restruturar para devolver no máximo **4 cards**, em grid `1 / 2 / 2`, alinhado com a estética premium do Block 01.

Selecção dos 4 cards (na ordem de prioridade definida no spec), construída por uma função pura que escolhe os mais informativos disponíveis:

1. **Diferença face à referência** (engagement gap vs benchmark) — usa `result.data.benchmarkComparison` / `enriched.aiInsights` já normalizados; **substitui** o card "Tendência de engagement", que é redundante com a Leitura IA. Título: `Distância face à referência`.
2. **Procura externa pelos temas** — só aparece se `marketDemandContentFit.available` e `coverage !== null`. Título: `Há procura externa pelos temas` ou `Falta cobertura dos temas com procura`, conforme `coverage`.
3. **Concentração de formato** — usa `enriched.formatBreakdown` (já existe, alimenta o Block 01) para detectar dominância > 60 %. Título: `O conteúdo está concentrado em [formato]`.
4. **Sinais de conversa / resposta** — usa `mentionsCollabsLift` (proxy da existência de conversa/colaboração). Quando `lift < 0.9` ou `withCount` muito baixo: `Faltam sinais de conversa`. Caso contrário, fallback para o card de **comprimento de legenda** ou **hashtags sweet spot** — o que tiver `available:true` e ainda não tiver sido usado.

Regra anti-duplicação: nunca renderizar o pattern "Tendência de envolvimento" (sai do conjunto), e o card de cadência/ritmo não entra (já está no Block 01 e na Leitura IA).

Copy:
- substituir `ER médio X%` → `envolvimento médio de X %`
- substituir `lift` → `diferença`
- substituir `keywords` → `temas`
- remover `sweet spot` em favor de `faixa com melhor retorno`
- todos os títulos passam a frases humanas em pt-PT (lista no spec do utilizador)

Visual:
- card: `rounded-2xl border border-slate-200/70 bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)] flex flex-col gap-3 h-full`
- linha de cabeçalho: dot semântico (azul/âmbar/rosa/verde) + eyebrow mono + número `01 / 04` em mono pequeno
- título serif (`font-display text-[1.05rem] md:text-[1.125rem] font-semibold text-slate-900 leading-snug`)
- valor primário em display, com tom contido (rosa só quando claramente negativo)
- corpo sans curto; sem breakdown de buckets (era ruído e fonte de números técnicos)
- grid: `grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5` + `auto-rows-fr` para igualar alturas por linha

Header da secção (eyebrow + H2 + subtítulo) **removido** daqui — já é fornecido pelo `ReportBlockSection` do Block 02. Evita duplicação de "Análise editorial / Padrões que explicam os resultados".

Fallback vazio: mantém a mensagem subtil quando 0 cards estão disponíveis.

**2. `src/components/report-redesign/v2/report-shell-v2.tsx`**

No bloco 02, envolver `ReportAiReading` num wrapper que neutraliza o `max-w-7xl + padding` do `ReportSectionFrame`, para a Leitura IA partilhar a mesma largura útil que o grid de cards. Subtítulo do `block-config.ts` para Block 02 fica como está (já é pt-PT natural).

```tsx
<div className="[&>section>div]:max-w-none [&>section>div]:px-0">
  <ReportAiReading data={...} enriched={...} compact />
</div>
```

(Selector específico à estrutura interna do `ReportSectionFrame` — `<section><div class="mx-auto max-w-7xl px-5 md:px-6">…</div></section>`. Não toca no ficheiro locked.)

**3. `src/components/report-redesign/v2/block-config.ts`**

Pequeno ajuste opcional ao `subtitle` do bloco `diagnostico` para soar mais natural em pt-PT, se necessário após reler. Sem mudar `id`/`number`/`question`.

### Fora de âmbito (não tocados)

- Block 01 (hero, overview cards, overview block).
- Blocks 03–06 (componentes e secções).
- `/report/example`, `/admin`, providers, prompts OpenAI, validators, schema Supabase, PDF.
- `report-ai-reading.tsx` (locked).
- `report-tokens.ts` (sem novos tokens).

### Validação

1. `bunx tsc --noEmit`
2. `bunx vitest run`
3. Verificar manualmente sem overflow horizontal a 375 / 768 / 1366.

### Aceitação

- Block 02 com **exactamente 4 cards** (ou menos quando data insuficiente, com mensagem subtil).
- Sem 5.º card órfão, sem repetição da Leitura IA.
- Leitura IA com a mesma largura útil do grid (sem faixa branca a sangrar).
- pt-PT em todo o copy visível, sem `keyword`, `lift`, `payload`, `engagement_pct`.
- Blocks 01 e 03–06 inalterados.

### Pergunta antes de implementar

Posso prosseguir com a opção **A** (wrapper sem editar o ficheiro locked)? Se preferires que eu altere `report-ai-reading.tsx` para aceitar uma prop `bare`, confirma a quebra de lock.
