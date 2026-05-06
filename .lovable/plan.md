
## Objetivo

Dar ao bloco "Custos da plataforma" em `/admin/receita` uma identidade visual mais clara — cada zona com fundo/caixa diferenciada — e remover permanentemente o formulário de importação manual de faturação.

## Alterações

### 1. Wrapper visual para toda a secção de custos

Envolver a `<section>` da `ExpenseSection` num contentor com fundo ligeiramente diferente do fundo da página (ex.: `#FAFAF6` vs `#FFFFFF`), borda subtil e `border-radius: 20px`, para isolar visualmente o bloco de custos do resto do admin.

### 2. Zona 1 (Provider cards) — accent-left

Aplicar `variant="accent-left"` aos 3 ProviderCards com o accent da família respetiva (`expense` para Apify, `info` para OpenAI, `signal` para DataForSEO). A borda lateral colorida cria hierarquia visual imediata.

### 3. Zona 2 (Custo por análise) — fundo levemente tintado

Adicionar fundo subtil ao grupo de Zona 2 (caixa ligeiramente amarelada/neutral) para separar do resto.

### 4. Zona 3 (Reconciliação) — accent-left expense

Usar `variant="accent-left" accent="expense"` no AdminCard da reconciliação para o distinguir das tabelas normais.

### 5. Zonas 4/5 (Apify/OpenAI detalhe) — accent-left por fornecedor

Cada tabela recebe `accent-left` com a cor do fornecedor correspondente.

### 6. Zona 6 (Gráfico diário) — sem mudança (já está distinto pelo gráfico)

### 7. Remover formulário de importação manual

- Remover o botão "+ Importar faturação" e o toggle `showImportForm` da `expense-section.tsx`
- Remover a referência ao `BillingImportForm` da `reconciliation-section.tsx`
- Remover o import e o state `showImportForm` de ambos os ficheiros
- Manter o ficheiro `billing-import-form.tsx` no disco (não apagar, apenas desligar) — caso futuro
- Ajustar o texto do rodapé da reconciliação: remover "Importa para calcular o custo real total" e substituir por nota informativa

### 8. Refinamentos de copy

- Rodapé da Zona 3: "X fornecedor(es) sem faturação externa. Dados baseados em estimativas internas." em vez do CTA para importar
- Subtítulo do SectionHeader: "Custos internos atribuídos · reconciliação automática" (sem mencionar importação manual)

## Ficheiros alterados

- `src/components/admin/v2/visao-geral/expense-section.tsx` — wrapper visual, accent-left nos cards, remover import form
- `src/components/admin/v2/receita/reconciliation-section.tsx` — remover import form reference

## Não alterado

- `src/components/admin/v2/receita/billing-import-form.tsx` — mantém-se no disco, não é apagado
- Nenhum ficheiro locked
- Nenhuma lógica de backend
- Nenhum token CSS novo necessário (usa accent-left existente)
