## Diagnóstico

Os dois cartões usam **a mesma fonte (posts analisados)**, mas calculam e formatam de forma diferente:

**Bloco 1 — Identidade Editorial (`overview/editorial-identity-card.tsx`)**
- Consome `payload.content_summary.average_comments`.
- Esse valor já vem **arredondado para inteiro** em `src/lib/analysis/normalize.ts:264`: `average_comments: Math.round(averageComments)`.
- Depois ainda volta a fazer `Math.round(averageComments)` em `editorial-identity-card.tsx:724`.
- Resultado: 0,4 → `0 por post`.

**Bloco 2 — Resposta do público (`report-diagnostic-card.tsx` Z2, alimentado por `block02-diagnostic.ts`)**
- Recalcula `avgComments = totalComments / postsWithData` directamente a partir dos posts.
- Formata com `formatAvg()` (1 casa decimal).
- Resultado: 0,4 `por post` / `0,4 coment./post`.

Não há divergência de fonte; há divergência de precisão e dupla redução em `normalize.ts`.

## Objectivo

Mostrar **o mesmo número** (com a mesma precisão) em ambos os blocos, sem alterar Apify, DFS, IA, gates ou perfis não relacionados.

## Alterações propostas

### 1. `src/lib/analysis/normalize.ts`
- Deixar de arredondar `average_comments` (e por consistência também `average_likes`) — guardar valor decimal cru no `content_summary`.
- Garantir que `engagement_pct` continua a ser calculado com os valores não arredondados (já era).
- Impacto: o valor passa a ser idêntico ao usado pelo Bloco 2.

### 2. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`
- Remover o `Math.round(averageComments)` no `value:` do KPI.
- Formatar com helper consistente com o Bloco 2:
  - `avg === 0` → `"0"`
  - `0 < avg < 0,1` → `"<0,1"`
  - `avg < 10` → 1 casa decimal (`"0,4"`, `"2,3"`)
  - `avg >= 10` → inteiro arredondado
- Aplicar a mesma regra ao card de `averageLikes` para evitar regressões cosméticas (28,2 → "28").

### 3. Verificação
- Snapshot `robs.cortez` (`3cd9340c-...`) — confirmar via `read_query` que:
  - `content_summary.average_comments` deixa de ser inteiro arredondado;
  - `engagement_pct` permanece igual;
  - o Bloco 1 e o Bloco 2 renderizam o mesmo valor (`0,4 por post` / `0,4 coment./post`).
- Correr os testes existentes (`block02-diagnostic`, `editorial-verdict`) — nenhum depende do arredondamento de `average_comments`.

## Ficheiros tocados

- `src/lib/analysis/normalize.ts`
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

## Fora de scope

- Não tocar em `report-diagnostic-card.tsx`, `block02-diagnostic.ts`, validador, prompt v2, Apify, DFS, Brevo, Resend, gates, leads, report_requests, pricing, UI de outras secções.
- Não regenerar snapshots — a leitura do `content_summary` é só para validação visual; snapshots antigos com `average_comments: 0` continuam a renderizar, mas novos cálculos passam a ter precisão decimal. Para o `robs.cortez` específico, basta recarregar o relatório (o `content_summary` é recalculado a partir do payload normalizado em runtime? — **a confirmar antes da implementação**: se for persistido, pode ser preciso forçar uma re-normalização leve do snapshot).

## Checkpoint

- ☐ Confirmar onde `content_summary.average_comments` é persistido vs. recalculado no `robs.cortez`.
- ☐ Editar `normalize.ts` (sem `Math.round`).
- ☐ Editar `editorial-identity-card.tsx` (helper de formatação partilhado).
- ☐ Validar visualmente no preview: Bloco 1 e Bloco 2 mostram o mesmo número.
- ☐ Correr `bunx vitest run` (testes do bloco 2 e overview).
