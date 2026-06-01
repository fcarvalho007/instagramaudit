# Redesign: zona de diagnóstico em /admin/receita

## Contexto

A `ExpenseSection` (importada em `/admin/receita`) tem hoje 6 zonas densas com tabelas de 6 colunas. O screenshot propõe uma versão consolidada — **uma secção "Diagnóstico de custos"** com 4 blocos, hierarquia clara e falhas como sinal primário.

Esta é uma intervenção **só visual**. Não muda queries, não muda cost math, não toca em `provider_call_logs`, não cria endpoints.

## Ficheiro alvo

`src/components/admin/v2/visao-geral/expense-section.tsx` (linhas 226–576) — substituir o JSX da `return` da secção. Subcomponentes existentes (`ProviderCard`, `ReliabilityCard`, helpers de reconciliação) mantêm-se ou são refactorados para a nova grelha.

O ficheiro continua a viver em `visao-geral/` (já é importado por `/admin/receita.tsx`). Não muda o sítio do ficheiro nem o import — só o conteúdo renderizado.

As Zonas 1 e 2 atuais (Custo interno atribuído + Custo por análise) **permanecem intactas** — pertencem ao topo decisional da página de receita. A redesign aplica-se às Zonas 3–6.

## Nova estrutura (Zonas 3–6 → 1 secção "Diagnóstico")

Cabeçalho da secção:
```
🩺 Diagnóstico de custos
Detalhe por fornecedor, reconciliação e evolução — para investigar, não para decidir.
```

### Bloco A — OpenAI · por operação (FIRST, com alerta)

Card branco com header "🟦 OpenAI · por operação" e badge âmbar `⚠ N falhas` à direita (soma de `actor.failures`).

Por linha (em vez de tabela de 6 colunas):
- **Lado esquerdo**: nome amigável (`Insights`, `Análise visual`, `Legendas`) + sublinha muted `modelo · N chamadas · P+C tokens`
- **Lado direito**: custo `$0,25` em tabular-nums + chip `N falhas` (âmbar se >0, neutro/oculto se 0)

Callout âmbar no fundo do card **só se** existir alguma operação com `failures >= calls`:
```
⚠ {N} falhas em {M} chamadas de {nome} é anormal — estás a pagar retries.
   Investigar antes de escalar.
```
Texto derivado das contagens reais. Sem hardcode.

### Bloco B — Apify · por actor

Mesmo padrão: nome amigável + `N eventos · $X/evento` em sublinha; custo total à direita + chip `cost_source` (`REAL` / `ESTIM.` / `ESTIM.+REAL`).

### Bloco C — Reconciliação (grelha 2 colunas com C+D)

Lista compacta dos 3 fornecedores: ponto colorido · nome · `$internal` · pill `pendente` / `OK` / `rever` / `arred.`.

Nota honesta por baixo (só se `pendingCount === reconRows.length`):
```
{pendingCount} fornecedores sem faturação externa ligada. Valores baseados em estimativas internas.
```

### Bloco D — Evolução diária

Mesmo `BarChart` empilhado (Apify+OpenAI+DFS) + `ReferenceLine` no `DAILY_COST_LIMIT`. Header com legenda compacta inline (chips à direita) e `limite $X/dia` em texto secundário. Altura reduz para `h-44`.

Mobile: Bloco C empilha por cima de D.

## Tokens & estilo

- Sem hardcode de cores além dos já usados via `ADMIN_LITERAL.expenseChart*`
- Cards: `AdminCard` com `variant="accent-left"` quando faz sentido (Apify=expense, OpenAI=info)
- Badges de falha: chip âmbar (`bg-amber-500/15 text-amber-700`) já em uso no ficheiro
- Tipografia: respeitar regra "JetBrains Mono só em admin" — manter `font-mono` para números e ids
- Eyebrows com `.text-eyebrow-sm` / `uppercase tracking-wider` — sem `font-mono`

## Honestidade dos números

- Tudo lido de `Expense30d` (`apify_actors`, `openai_actors`, `daily`) e `ReconciliationData.byProvider` — já carregados na secção, sem novos endpoints
- O texto do callout de OpenAI é derivado da operação com pior `failures/calls`
- Estados "pendente" mantêm-se quando não há `external > 0` (sem inventar)
- `DAILY_COST_LIMIT` continua a vir de `@/lib/admin/mock-data`

## Fora de âmbito

- /admin/visao-geral (não tocar)
- Backend / cost math / queries
- Tabelas Zona 1 e 2 (continuam como estão)
- Endpoint novos

## Validação

- `bunx tsc --noEmit`
- Mobile 375px: blocos empilham sem overflow
- Conferir que todos os totais batem com os atuais (mesmo dataset)

## Checkpoint

- ☐ Substituir JSX das Zonas 3–6 na `ExpenseSection`
- ☐ Bloco OpenAI primeiro com badge de falhas no header
- ☐ Bloco Apify simplificado (sem tabela 6 colunas)
- ☐ Bloco Reconciliação com pills `pendente` honestas
- ☐ Bloco Evolução diária com legenda compacta e limit line
- ☐ Callout de retries derivado de dados reais
- ☐ `tsc --noEmit` limpo
- ☐ Mobile 375px sem overflow
