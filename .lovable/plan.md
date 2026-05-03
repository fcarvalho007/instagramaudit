
# Melhorar UX/UI da secção Despesa + tooltip com breakdown Apify

## Problemas atuais (visíveis no screenshot)

1. **Coluna Apify demasiado longa** — os 3 actor rows (Scraper de Perfil, Scraper de Comentários, Instagram Scraper) ocupam espaço vertical desproporcional vs. as outras 3 colunas, criando desequilíbrio visual.
2. **Tooltip do gráfico é genérico** — no hover das barras, mostra apenas "Apify: $X.XX" sem distinguir que atores contribuíram para esse valor.
3. **Actor rows sem hierarquia visual clara** — todos os atores parecem iguais, mesmo com runs zero vs. atores ativos.
4. **Sem preparação para mais atores** — o layout atual não escala se adicionares mais atores Apify.

## Plano

### 1. Reestruturar layout da coluna Apify

Mover o actor breakdown para fora das 4 colunas. As 4 colunas ficam compactas e equilibradas (Apify · OpenAI · DataForSEO · Total), todas com a mesma altura visual. O actor breakdown aparece numa zona própria abaixo da progress bar, numa faixa horizontal a toda a largura do card.

### 2. Actor breakdown como mini-tabela horizontal

Em vez de cards empilhados verticalmente, usar uma row compacta com colunas: `Ator | Custo | Runs | Resultados | Fonte | Estado`. Atores sem execuções aparecem em linha cinzenta discreta (colapsados). Isto escala melhor para 4-6 atores.

### 3. Enriquecer dados diários com breakdown por ator Apify

**Backend** (`system-queries.server.ts`):
- Alterar `aggregateCostsFromLogs` para também devolver dados diários por ator Apify (`actor` field nos logs).
- Adicionar ao `ExpenseDailyPoint` campos opcionais por ator (ex: `apify_profile`, `apify_comments`, `apify_scraper`), ou devolver um mapa `apify_actors: Record<string, number>` por dia.
- O endpoint `/api/admin/sistema/expense-30d` já devolve estes dados.

**Frontend** (`expense-section.tsx`):
- No gráfico de barras, substituir a barra única "apify" por sub-barras empilhadas por ator (cada ator com cor distinta dentro da família expense — tons de âmbar/laranja).
- Custom tooltip que lista: dia, cada ator Apify com custo, OpenAI, DataForSEO, total do dia.

### 4. Tooltip customizado rico

Criar um componente `ExpenseTooltipContent` que renderiza:
- Header: "Dia DD"
- Secção Apify com sub-linhas por ator (dot colorido + nome curto + valor)
- Linha OpenAI
- Linha DataForSEO  
- Separador + Total do dia

### 5. Cores por ator Apify

Adicionar tokens em `admin-tokens.ts`:
```
expenseChartApifyProfile: "#D4920F"   // âmbar forte
expenseChartApifyComments: "#E8A838"  // âmbar médio
expenseChartApifyScraper: "#BA7517"   // âmbar original (mantém backward compat)
```

### Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/admin/system-queries.server.ts` | `aggregateCostsFromLogs` devolve daily com breakdown ator; `ExpenseDailyPoint` ganha campos por ator |
| `src/components/admin/v2/admin-tokens.ts` | 3 novas cores para atores Apify |
| `src/components/admin/v2/visao-geral/expense-section.tsx` | Reestruturar layout (actor rows em faixa horizontal), sub-barras no gráfico, tooltip customizado |

### Sem DB changes

Não é necessária nenhuma nova tabela ou migração — os dados já existem no `provider_call_logs.actor`.
