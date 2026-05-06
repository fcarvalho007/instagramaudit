
# Redesign da secção "Custos da plataforma" em /admin/receita

Substituição completa da `ExpenseSection` e fusão com a `ReconciliationSection` existente, seguindo pixel-a-pixel os 3 mockups fornecidos.

---

## Estrutura visual (de cima para baixo)

### Header da secção
- Eyebrow: `SISTEMA · DESPESA`
- Titulo: "Custos da plataforma"
- Subtitulo: "Custos internos atribuídos · faturação externa importada · reconciliação"
- Ações à direita: 3 botões (30 dias / Mês / Custom) + Exportar CSV

### Banner de fiabilidade (zona 0 — condicional)
- Full-width, fundo âmbar subtil, ícone de aviso
- Texto: "Fiabilidade do histórico ainda baixa · **37,4%**" + detalhe "62 chamadas (de 99) ainda não estão associadas a uma análise."
- CTA: "Ver chamadas órfãs →"
- Visível apenas quando `linkageRatePct < 80%`

### Zona 1 — `⊙ CUSTO INTERNO ATRIBUÍDO · ÚLTIMOS 30 DIAS`
- 4 cards em grid:
  - **Apify** — valor grande, percentagem do cap, cap absoluto, nota "scrapers de Instagram", progress bar
  - **OpenAI** — idem, nota "insights · visão · legendas", soft cap
  - **DataForSEO** — idem, nota "N chamadas SERP", saldo
  - **TOTAL ATRIBUÍDO** — card premium com fundo escuro/gradiente, "30 DIAS", mini-barra empilhada (58% / 30% / 12%)
- Nota informativa em rodapé: "Estes valores refletem chamadas internas atribuídas a análises. A faturação real dos fornecedores aparece abaixo na zona de reconciliação."

### Zona 2 — `⌗ CUSTO POR ANÁLISE`
- 3 cards:
  - **Médio histórico** — custo/análise, N análises geradas, inclui testes e cache
  - **Estimativa fresh** — badge FRESH, custo/análise, N análises fresh, "em validação"
  - **Fiabilidade dos custos** — valor grande percentual (rosa se baixo), badge BAIXA/MÉDIA/ALTA, breakdown por provider inline (OpenAI 16/45 · Apify 20/42 · DFS 1/12)

### Zona 3 — `⇆ RECONCILIAÇÃO · INTERNO ESTIMADO vs FATURAÇÃO REAL`
- Nota à direita: "faturação importada manualmente"
- Tabela 5 colunas: Fornecedor | Interno atribuído | Faturado real | Diferença | Estado
  - Apify: valores reais, diferença com %, badge REVER (rosa)
  - OpenAI: interno, "— por importar", "—", badge PENDENTE
  - DataForSEO: idem PENDENTE
- Nota: "N fornecedores com faturação por importar. Importa para calcular o custo real total."
- CTA: "+ Importar faturação" (abre o form existente de billing-import)

### Zona 4 — `⊙ APIFY · DETALHE POR ACTOR`
- Tabela com colunas: Actor · nome amigável | Eventos | €/Evento | Calculado | Real Apify | Origem
- Actor com nome amigável ("Scraper Instagram · perfil + posts") e detalhe técnico em mono pequeno
- Badge ORIGEM: REAL (verde), ESTIM. + REAL (âmbar)

### Zona 5 — `⊙ OPENAI · DETALHE POR OPERAÇÃO`
- Tabela: Operação · modelo | Chamadas | Custo | Tokens (P+C) | $/Chamada | Falhas
- Linha com `mostlyFailed` ganha fundo amarelo subtil + badge "TESTE FALHADO"
- Badge IMG para visual-cover-analysis
- Falhas coloridas (rosa quando criticas)

### Zona 6 — `⟨ EVOLUÇÃO DIÁRIA · ÚLTIMOS 30 DIAS`
- Texto explicativo: "Custos internos atribuídos por dia. Linha horizontal mostra o limite diário equivalente ($0,97) calculado a partir do total mensal de $29."
- Legenda visual: 3 swatches (Apify âmbar, OpenAI azul, DataForSEO indigo) + linha tracejada "Limite diário $0,97"
- Gráfico BarChart (stacked) — mantém lógica actual mas com legenda acima
- Tooltip preto premium com breakdown por provider

### Rodapé metodológico
- Linha discreta: "Custos internos atribuídos provêm de provider_call_logs ligados a análises. Faturação real importada manualmente do dashboard de cada fornecedor. Última importação: Apify · 06 mai 18h12."

---

## Implementação

### Ficheiro principal
**Reescrever `src/components/admin/v2/visao-geral/expense-section.tsx`** — o ficheiro actual (998 linhas) será substituído por uma versão reestruturada com as 6 zonas + banner + rodapé. Componentes internos (ExpenseColumn, tooltips, table rows) mantêm-se mas adaptados ao novo layout.

### Fusão com reconciliação
A `ReconciliationSection` separada é absorvida na nova `ExpenseSection` como Zona 3. O import form existente (`billing-import-form.tsx`) mantém-se e é invocado pelo CTA "+ Importar faturação".

### Dados necessários (sem novas APIs)
Tudo o que os mockups mostram já está disponível nos endpoints existentes:
- `/api/admin/sistema/expense-30d` — custos internos, actors, linkage, confidence
- `/api/admin/sistema/caps` — caps por provider
- `/api/admin/billing-reconciliation` — dados externos, batches

A `ExpenseSection` fará 3 queries (expense, caps, reconciliation).

### Alteração em `admin.receita.tsx`
Remover o `<ReconciliationSection>` separado — fica tudo dentro de `<ExpenseSection>`.

### Card "Total" premium
- Fundo escuro (utilizar token `--admin-surface-elevated` ou inline gradient)
- Texto branco, mini stacked bar, "30 DIAS" em badge

### Badges de estado na reconciliação
- REVER: `bg-admin-danger-500/15 text-admin-danger-700`
- PENDENTE: `bg-admin-neutral-400/15 text-admin-text-tertiary`
- OK: `bg-admin-success/15 text-admin-success`

### Tooltip do gráfico
- Fundo escuro (`bg-gray-900 text-white`) em vez do actual branco
- Swatches coloridos por provider com valor

---

## O que NÃO muda
- Nenhum endpoint de API modificado
- Nenhum provider chamado
- Nenhum snapshot alterado
- Report UI intacto
- `provider_call_logs` intacto
- `billing-import-form.tsx` mantém-se (apenas invocado de local diferente)
- `billing-reconciliation.server.ts` mantém-se

## Ficheiros alterados
1. `src/components/admin/v2/visao-geral/expense-section.tsx` — reescrita completa
2. `src/routes/admin.receita.tsx` — remover ReconciliationSection, passar period ao ExpenseSection

## Validação
- tsc --noEmit passa
- vitest passa
- Todos os dados pré-existentes continuam visíveis
- Banner de fiabilidade aparece quando linkage < 80%
- Tabela de reconciliação mostra Apify com dados reais e OpenAI/DFS como "pendente"
- Card total premium com fundo escuro
- Gráfico com legenda explícita e tooltip preto
