

# Auditoria + Plano · Contexto de benchmark editorial no relatório

> **Modo Plano. Nenhum ficheiro foi alterado. Nenhum provider foi chamado.**

## 1. Entendimento do objetivo

Aumentar a credibilidade interpretativa do relatório, **enquadrando** as métricas reais do perfil (envolvimento, ritmo, formato, resposta) com contexto direcional vindo de fontes reconhecidas do mercado (**Socialinsider, Buffer, Hootsuite, Databox**), sem:

- copiar números dessas fontes,
- chamá-las por API,
- criar links externos,
- inventar comparações que não existam no dataset interno.

As fontes aparecem **apenas como nome de referência editorial** (texto), nunca como hyperlink. O dataset real de comparação continua a ser o `knowledge_benchmarks` interno.

A **Knowledge Base** ganha uma secção formal de **política de fontes** que governa o que pode aparecer no UI, com regras de hedging e separação clara entre "dado do perfil" / "benchmark de referência" / "interpretação editorial".

Esta tarefa é de **planeamento + KB**, não envolve mudanças de código nesta passagem.

---

## 2. Ficheiros a inspecionar antes de qualquer implementação futura

### 2.1 Render do relatório
- `src/components/report-redesign/v2/report-shell-v2.tsx` — orquestrador dos 6 blocos.
- `src/components/report-redesign/v2/block-config.ts` — perguntas e subtítulos por bloco.
- `src/components/report-redesign/v2/report-positioning-banner.tsx` — banner editorial entre hero e Bloco 01 (candidato natural a "contexto de referência").
- `src/components/report-redesign/report-methodology.tsx` — secção "Metodologia" no fim do relatório (já fala em "Referência de mercado" sem nomear fontes).

### 2.2 Bloco 01 · Overview
- `src/components/report-redesign/v2/report-overview-block.tsx` — composição.
- `src/components/report-redesign/v2/report-overview-cards.tsx` — Engagement / Ritmo / Formato (3 cartões).
- `src/components/report-redesign/v2/report-kpi-grid-v2.tsx` — KPI alternativo (mostra "vs X% de referência").

### 2.3 Bloco 02 · Diagnóstico
- `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- `src/components/report-redesign/v2/report-diagnostic-card.tsx`
- `src/components/report-redesign/v2/report-diagnostic-verdict.tsx`
- `src/components/report-redesign/v2/ai-badge.tsx` — padrão visual já estabelecido para sinalizar IA.
- `src/lib/report/block02-diagnostic.ts` — classificadores deterministas.

### 2.4 Bloco 03 · Performance (futuro)
- `src/components/report/report-temporal-chart.tsx`
- `src/components/report/report-posting-heatmap.tsx`
- `src/components/report/report-best-days.tsx`

### 2.5 Benchmark interno (lógica + tipos)
- `src/lib/report/benchmark-input.server.ts`
- `src/lib/report/tiers.ts`
- `src/lib/report/snapshot-to-report-data.ts` — `engagementBenchmark`, `engagementDeltaPct`, `benchmarkSource.note`.

### 2.6 Knowledge Base
- `src/lib/knowledge/types.ts` — `KnowledgeNote.category` aceita `"trend" | "format" | "algorithm" | "vertical" | "tool"` (não há "policy" ainda).
- `src/lib/knowledge/context.server.ts` — serializa KB para o prompt da OpenAI.
- `src/lib/knowledge/queries.server.ts` — leitura admin.
- `src/routes/api/admin/knowledge.notes.ts` — CRUD de notas.
- `LOCKED_FILES.md` — verificar antes de tocar em qualquer ficheiro.

### 2.7 Documentação do projecto
- `LOCKED_FILES.md` — lista atual de protegidos.
- `.workspace/AGENTS.md` — regras do agente.
- **Não existe** ficheiro `KNOWLEDGE.md` ou similar no repositório. A KB é uma combinação de:
  - tabelas Supabase (`knowledge_benchmarks`, `knowledge_notes`, `knowledge_sources`),
  - regras editoriais codificadas em `prompt-v2.ts`,
  - convenções escritas em comentários de cabeçalho dos ficheiros relevantes.

---

## 3. Knowledge Base · texto proposto

### 3.1 Onde guardar

Duas localizações complementares (ambas necessárias):

**A) Como `KnowledgeNote` na BD** com `category="tool"` (categoria existente que melhor enquadra "policy editorial") — fica visível no admin, versionada, auditável, e injectada no prompt da OpenAI via `formatKnowledgeContextForPrompt`. Uma única nota com `title="Política de fontes de benchmark"` e o texto abaixo no `body`.

> **Decisão pendente:** se preferirmos uma categoria semântica nova `"policy"`, requer migration ao enum `note_category`. Recomendado **adiar** essa migration e usar `"tool"` por agora — sem schema change.

**B) Como ficheiro `KNOWLEDGE.md` no root do repo** para servir de fonte canónica para humanos (designers, editores, futuros agentes Lovable) sem dependerem do admin.

### 3.2 Texto canónico — "Instagram Benchmark Context & Source Policy"

```text
# Instagram Benchmark Context & Source Policy

## Fontes aprovadas (apenas para referência editorial)
- Socialinsider
- Buffer
- Hootsuite
- Databox

Estas fontes podem ser nomeadas no relatório como contexto de mercado.
Nunca renderizar URLs nem links clicáveis para nenhuma destas fontes.
Nunca afirmar que estas fontes analisaram o perfil em causa.

## Tipos de informação (etiquetagem obrigatória)
1. Dado do perfil — métricas calculadas a partir das publicações recolhidas.
   Linguagem: "Este perfil regista…", "Na amostra recolhida…".
2. Benchmark de referência — valor vindo da nossa tabela interna
   `knowledge_benchmarks`. Linguagem: "A referência interna para este
   tier é…", "Comparado com perfis pares…".
3. Interpretação editorial — leitura analítica derivada dos dois
   anteriores. Obrigatório usar hedging: "sugere", "indica", "aponta
   para", "com a amostra atual", "sinais de".

## Regras de uso
- Os benchmarks são contexto direcional, não promessa precisa.
- Nunca inventar crescimento de seguidores, alcance, partilhas, saves
  ou rankings de indústria que não existam no dataset interno.
- Nunca dizer "segundo a Socialinsider, este perfil está em X" — apenas
  "Contexto de referência: Socialinsider, Buffer, Hootsuite, Databox.".
- Quando o benchmark interno cobre o tier/formato, mostrar o número
  com etiqueta clara (ex.: "referência tier micro · Reels").
- Quando não cobre, omitir comparação e usar apenas leitura editorial
  com hedging.

## Língua e estilo
- Português europeu (AO90).
- Evitar nomes técnicos no UI: `payload`, `engagement_pct`, `result.data`,
  `keyMetrics`, `benchmark.positioning` — traduzir sempre.
- Frases curtas. Tom analítico, calmo. Sem alarmes vermelhos
  desproporcionais.
- Cada cartão pode mencionar fontes uma vez por bloco, no máximo;
  evitar repetir o nome das fontes em todos os cartões.

## Posicionamento estratégico de formatos (linguagem permitida)
- Reels: úteis para alcance e descoberta. Não automaticamente
  superiores; dependem da intenção.
- Carrosséis: úteis para conteúdo educativo, save-worthy,
  multi-camada e profundidade narrativa.
- Imagens estáticas: continuam válidas para presença de marca,
  produto, eventos e identidade visual.
- Nunca afirmar superioridade absoluta de um formato sem evidência
  no perfil analisado.
```

---

## 4. Refinamentos de UI/copy propostos (mapa)

### 4.1 Banner de posicionamento (uma única linha de origem)
- Adicionar microcopy discreta, **uma vez por relatório**, no
  `report-positioning-banner.tsx` ou no fim da `ReportMethodology`:
  > *"Contexto de referência editorial: Socialinsider, Buffer, Hootsuite, Databox. Comparações apresentadas neste relatório usam o nosso dataset interno; as fontes acima servem apenas como enquadramento."*
- Texto pequeno, mono, neutro. Sem links.

### 4.2 Bloco 01 · Engagement
- No cartão `EngagementRateCard` (overview-cards), adicionar **nota explicativa colapsável ou em texto secundário** (≤ 1 linha):
  > *"A taxa de envolvimento varia consoante a fonte, o tamanho da conta e o método de cálculo. Aqui é apresentada como referência direcional."*
- Onde já existe `vs X% de referência`, manter; complementar com etiqueta `referência interna · tier {tier}` para distinguir do dataset interno.

### 4.3 Bloco 01 · Ritmo
- Microcopy de uma linha:
  > *"Volume não garante desempenho — é o equilíbrio entre cadência e qualidade que sustenta envolvimento."*
- Sem comparação numérica externa.

### 4.4 Bloco 01 · Formato dominante
- Body curto, condicional ao formato dominante (linguagem da política, secção 3.2).
  - **Reels:** "Útil para alcance e descoberta; não automaticamente superior."
  - **Carrosséis:** "Útil para conteúdo educativo e save-worthy."
  - **Imagens:** "Sustentam presença de marca, produto e identidade visual."

### 4.5 Bloco 02 · Onde encaixa
- **Q01 Tipo de conteúdo:** quando o resultado é "Educativo", reforçar com "consistente com práticas que valorizam profundidade narrativa" (sem citar fonte).
- **Q06 Resposta da audiência:** reforçar a distinção "visibilidade (gostos) vs conversa pública (comentários)" — já está parcialmente no body, dignificar.
- **Não criar cartão novo.** Não duplicar leituras do Bloco 01. A política aplica-se à linguagem, não a novos componentes.

### 4.6 Bloco 03 · Futuro
- O lugar correto para benchmarking comparativo de **timing** e **cadência** é o Bloco 03 (já diagnosticado em sessão anterior). Quando se enriquecer esse bloco, aplicar as mesmas regras: número do perfil + número de referência interna + leitura com hedging.

### 4.7 Não fazer
- Não acrescentar "fontes" como secção visual nova em cada bloco.
- Não repetir os 4 nomes em mais de 2 sítios do relatório.
- Não criar logos das fontes.
- Não criar tooltip que parece atribuir números do perfil às fontes.

---

## 5. Riscos & salvaguardas

| Risco | Mitigação |
|---|---|
| **Overclaim externo** — leitor pensar que Socialinsider analisou o perfil | Microcopy fixa: "Contexto de referência editorial". Banimento de "segundo X, este perfil…". |
| **Confusão dado-perfil vs benchmark** | Etiquetagem obrigatória dos 3 tipos (perfil / referência / interpretação). |
| **Duplicação Bloco 01 ↔ Bloco 02** | Política: cada métrica é mostrada em um sítio; o segundo bloco interpreta, não repete. |
| **Sobrepeso editorial** | ≤ 1 linha de microcopy por cartão; nomes das fontes ≤ 2 ocorrências por relatório. |
| **Aspecto "blog de benchmarking"** | Banir dropdowns "saber mais", listas extensas e citações longas. Estilo continua editorial-tech-noir. |
| **Drift sem governance** | Texto da política vive na KB (BD + KNOWLEDGE.md). Qualquer alteração futura passa por uma única nota versionada. |
| **Pollution do prompt OpenAI** | A nota é injectada via `formatKnowledgeContextForPrompt`; mantém-se curta para não empurrar tokens. |
| **PT-BR ou termos técnicos vazarem** | Auditoria de copy contra vocabulário banido (`engagement_pct`, `payload`, `tela`, etc.). |

---

## 6. Critérios de aceitação (para a futura implementação)

- [ ] As 4 fontes só aparecem por **nome**; zero `<a href>` no UI.
- [ ] Nenhuma chamada nova a Apify, DataForSEO, OpenAI, PDFShift ou Supabase write.
- [ ] Nenhuma alteração de schema; nenhuma migration.
- [ ] Prompt OpenAI **não** muda nesta fase (a nota injecta-se pelo mecanismo existente da KB; o prompt-v2 não é editado).
- [ ] Bloco 02 mantém lógica determinista intacta.
- [ ] PDF intacto.
- [ ] Toda a cópia visível em pt-PT (AO90).
- [ ] Microcopy nova ≤ 1 linha por cartão.
- [ ] Política existe simultaneamente como `KnowledgeNote` (visível no admin) e como `KNOWLEDGE.md` no root.
- [ ] `bunx tsc --noEmit` ✓ e `bunx vitest run` ✓ após implementação.
- [ ] Nenhum ficheiro de `LOCKED_FILES.md` é tocado sem aprovação explícita.

---

## 7. Plano de file-locking proposto

A implementação tocaria estes ficheiros (não estão atualmente em `LOCKED_FILES.md`):

```text
src/components/report-redesign/v2/report-positioning-banner.tsx     (microcopy de fontes)
src/components/report-redesign/v2/report-overview-cards.tsx          (microcopy engagement/ritmo/formato)
src/components/report-redesign/report-methodology.tsx                (linha "fontes de referência")
KNOWLEDGE.md                                                          (novo — política canónica)
```

Mais (sem alteração de código, só dados):
```text
knowledge_notes (BD)  — INSERT de uma nota com a política
```

**Proposta:** após implementação aprovada, **adicionar `KNOWLEDGE.md` ao `LOCKED_FILES.md`** para evitar deriva editorial não-intencional. Os 3 componentes UI permanecem editáveis para iteração visual.

---

## 8. Prompt para a fase de implementação (quando aprovado)

```text
Implementar a política "Instagram Benchmark Context & Source Policy"
aprovada no plano anterior:

1. Criar /KNOWLEDGE.md no root com o texto canónico da política
   (secção 3.2 do plano).

2. Inserir uma KnowledgeNote em produção via admin (ou via SQL
   migration apenas-INSERT) com category="tool",
   title="Política de fontes de benchmark", body=texto da política.

3. Adicionar microcopy:
   - report-positioning-banner.tsx: linha única "Contexto de
     referência editorial: Socialinsider, Buffer, Hootsuite, Databox."
   - report-overview-cards.tsx: 1 linha por cartão (engagement,
     ritmo, formato) conforme secções 4.2-4.4 do plano.
   - report-methodology.tsx: linha de origem editorial no fim.

4. Sem links. Sem logos. Sem alteração ao prompt-v2.ts. Sem
   alteração ao schema. Sem chamada a providers.

5. Validar:
   - bunx tsc --noEmit
   - bunx vitest run
   - Visual: relatório dark/light, mobile 375px e desktop.

6. Acrescentar /KNOWLEDGE.md a LOCKED_FILES.md.

Reportar: ficheiros tocados, INSERT executado (sim/não), zero
chamadas externas, resultados tsc + vitest.
```
