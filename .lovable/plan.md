## Bloco 02 · Diagnóstico Editorial — separar Hashtags de Temas + transparência de fonte

### O problema

Hoje o cartão "Pergunta 04 · Temas" usa `inferThemes(topHashtags, topKeywords)` e mostra hashtags como se fossem temas. As duas coisas não são iguais: hashtags são **etiquetas** que o autor escolhe; temas são **assuntos** abordados nas legendas.

Acresce que o utilizador não tem como distinguir, em cada cartão, o que é dado extraído, leitura determinística do sistema, ou texto produzido pela IA. O cartão das captions já tem `aiSource`/`AiBadge`, mas os outros cartões não têm rótulo de fonte explícito.

### O que vai ser feito

#### 1. `block02-diagnostic.ts` — dividir o classificador em dois

Substituir `inferThemes` (que usa hashtags **ou** keywords) por **duas funções independentes**:

```ts
// HASHTAGS (factual, dados extraídos)
export interface HashtagsResult {
  available: boolean;
  items: Array<{ text: string; weight: number }>;
  sampleSize: number;
}
export function classifyHashtags(topHashtags): HashtagsResult
// Disponível só com ≥ 2 hashtags. Sem hashtags → available=false.

// TEMAS (interpretação a partir de legendas)
export type ThemesSource = "ai" | "deterministic";
export interface ThemesResult {
  available: boolean;
  source: ThemesSource | null;
  /** Texto curto pronto para a "Resposta dominante". */
  headline: string;
  /** Itens determinísticos (palavras + peso) — opcional, só quando source="deterministic". */
  items: Array<{ text: string; weight: number }>;
  /** Texto da IA — opcional, só quando source="ai". */
  aiText: string | null;
  sampleSize: number;
}
export function inferThemesFromCaptions(args: {
  topKeywords: ReportData["topKeywords"];
  posts: SnapshotPost[];
  aiSections?: Partial<Record<AiInsightV2Section, AiInsightV2Item>> | null;
}): ThemesResult
```

Prioridade no `inferThemesFromCaptions`:
1. `aiSections?.language?.text` se existir e tiver ≥ 30 chars → `source="ai"`, `headline` = título curto extraído ("Foco em IA, marketing e produtividade" ou primeira frase truncada).
2. Caso contrário, derivar de `topKeywords` (que já vem de captions, não hashtags) → `source="deterministic"`. Mínimo 2 palavras.
3. Sem nada utilizável → `available=false`.

A `headline` do source determinístico mantém a heurística actual (`Foco em <tema>`, casos especiais IA/marketing).

A função antiga `inferThemes` é removida; ninguém mais a importa fora deste ficheiro depois da refactoração.

**Manter o tipo `ThemesSource` exportado mas com novos valores** (`"ai" | "deterministic"`). É um tipo interno só usado pelo `report-diagnostic-block.tsx`; o `ai-badge` e o `aiSource` do cartão ficam intactos.

#### 2. `report-diagnostic-card.tsx` — novo prop `sourceLabel`

Adicionar prop opcional (não-breaking):

```ts
sourceLabel?: {
  kind: "extracted" | "auto" | "ai";
  text: string;       // pt-PT, curto
}
```

Render: pequeno chip no header, à esquerda do `aiSource` quando ambos existem (mas na prática nunca coexistem — `kind: "ai"` substitui o badge IA). Estilo:
- `extracted` → ícone `Database` lucide, texto cinza (`text-slate-500`), `bg-slate-50 ring-slate-200`
- `auto` → ícone `Cpu` lucide, texto cinza
- `ai` → reusa `AiBadge` (não duplicar ícone Bot)

Chip vai logo abaixo do eyebrow `Pergunta NN · Label`, alinhado à direita junto do `AiBadge`. Para os 9 cartões aplica-se um chip — esta é a "transparência de fonte" pedida.

#### 3. `report-diagnostic-block.tsx` — composição

- Substituir `themes` por **dois** resultados: `hashtags` e `themes` (do novo classifier).
- Renderizar **dois cartões separados** no grupo B:
  - `q04` Hashtags (azul, `sourceLabel: { kind: "extracted", text: "Baseado nas hashtags públicas das publicações analisadas." }`)
  - `q05` Temas (azul, `sourceLabel` muda conforme `source`):
    - `ai` → `text: "Leitura IA gerada a partir da amostra de publicações."` + reusa o `aiSource` existente (badge IA já mostrado)
    - `deterministic` → `kind: "auto"`, `text: "Leitura automática das legendas analisadas."`
- Renumerar:
  - Group A: 01 Tipo de conteúdo · 02 Funil
  - Group B: 03 Formato (já existe? **não existe ainda no Bloco 02** — confirmar abaixo)

**Nota crítica de inspecção**: o ficheiro actual tem `q01..q08` (sem cartão "Formato"). O briefing pede 09 cartões com Formato no nº 03. Vou **confirmar isto** abaixo antes de inventar um novo cartão.

<exploration-required>
Antes de implementar, preciso de **confirmar uma decisão de escopo** com o utilizador (ver secção "Pergunta a clarificar" abaixo).
</exploration-required>

#### 4. Source labels para os 7 cartões existentes

| # | Cartão | `kind` | Texto |
|---|---|---|---|
| 01 | Tipo de conteúdo | `auto` | "Leitura automática de legendas e hashtags." |
| 02 | Funil | `auto` | "Leitura automática das legendas analisadas." |
| 04 | Hashtags (novo) | `extracted` | "Baseado nas hashtags públicas das publicações analisadas." |
| 05 | Temas (novo) | `ai` ou `auto` | (ver acima) |
| 06 | Legendas | `auto` (+ `aiSource` existente quando há) | "Leitura automática das legendas analisadas." |
| 07 | Resposta | `extracted` | "Baseado em gostos e comentários públicos." |
| 08 | Integração | `auto` | "Leitura automática da bio e legendas." |
| 09 | Objetivo | `auto` | "Hipótese derivada dos sinais editoriais detectados." |

(Numeração depende da decisão de escopo — ver pergunta abaixo.)

#### 5. `report-diagnostic-group.tsx` — grid sem órfãos

Já trata o caso `questionsCount === 1` (col-span-2). Estender:
- Quando `questionsCount` é ímpar e ≥ 3, o **último filho** ganha `md:col-span-2` para evitar coluna vazia.
- Mobile (`grid-cols-1`) não muda.

Implementação: clone do último child com className extra via `Children.map` + index check. Toque mínimo.

#### 6. Copy do verdict / texto do bloco vazio

`buildVerdictText` e o parágrafo "À medida que houver mais atividade, este bloco passa a abrir oito perguntas" precisam ser actualizados para "nove perguntas" se passarmos para 9 cartões; ou manter "oito" se ficarmos em 8 (depende da decisão de escopo).

### Pergunta a clarificar (antes de codificar)

O briefing pede **9 cartões** com "03 · Formato" como cartão novo no grupo B. Mas o `report-diagnostic-block.tsx` actual **não tem cartão de Formato** — apenas `q01..q08` mapeando para Tipo de conteúdo, Funil, ?, Temas, Linguagem, Resposta, Integração, Objetivo.

Há duas leituras possíveis:

**Opção A — só split (recomendado)**: Manter os 7 cartões actuais + dividir Temas em Hashtags + Temas = **8 cartões**. Numeração: 01 Tipo · 02 Funil · 03 Hashtags · 04 Temas · 05 Legendas · 06 Resposta · 07 Integração · 08 Objetivo. Grupo B fica com 4 cartões (par, sem órfão). Mais conservador, foca-se exactamente no que o briefing identifica como problema.

**Opção B — split + criar cartão "Formato" novo**: Fica com 9 cartões com a numeração proposta no briefing, mas exige criar um cartão totalmente novo (provavelmente baseado em `result.data.keyMetrics.dominantFormat`/`dominantFormatShare` que já existe). Mais alinhado à letra do briefing, mas adiciona scope que não estava no diagnóstico do problema.

Vou perguntar ao utilizador qual prefere antes de implementar — a numeração e a regra de orphan-card dependem disto.

### Não-objectivos
- Não tocar em providers, OpenAI, Supabase writes, schema, PDF, admin, /report/example, validators, prompts, ou ficheiros locked.
- Não criar testes novos (não existem testes do Bloco 02 hoje; manter o âmbito mínimo).
- Não animar nada.
- Não introduzir dependências.

### Ficheiros tocados (estimativa)
```text
src/lib/report/block02-diagnostic.ts                              (split inferThemes)
src/components/report-redesign/v2/report-diagnostic-card.tsx      (+ sourceLabel prop + chip)
src/components/report-redesign/v2/report-diagnostic-block.tsx     (renumeração, novo cartão hashtags, sourceLabel em todos)
src/components/report-redesign/v2/report-diagnostic-group.tsx     (orphan card → md:col-span-2)
```

### Validação
- `bunx tsc --noEmit` verde
- `bunx vitest run` verde (sem testes novos a adicionar)
- Smoke visual: confirmar que os 8 (ou 9) cartões aparecem com chips de fonte correctos no perfil de teste

### Checkpoint
- ☐ Decidir entre Opção A (8 cartões) ou Opção B (9 cartões com novo cartão Formato)
- ☐ Refactor `inferThemes` → `classifyHashtags` + `inferThemesFromCaptions`
- ☐ Adicionar prop `sourceLabel` ao `ReportDiagnosticCard` + chip visual
- ☐ Recompor `ReportDiagnosticBlock` com numeração nova e source labels
- ☐ `ReportDiagnosticGroup` resolve órfão em ímpar ≥ 3
- ☐ `tsc` + `vitest` verdes