
# Refine Report Lab Variant Selector UX

Single file: `src/routes/admin.report-lab.tsx`

## Changes

### 1. Rename selector label
`"Variante a pré-visualizar"` → `"Versão do relatório a pré-visualizar"`

### 2. Update variant options with new titles and descriptions

| Variant | Title | Description |
|---------|-------|-------------|
| public_mvp | Público geral | Versão que qualquer utilizador vê. Mostra apenas os blocos 01 e 02. |
| internal_lab | Laboratório interno | Versão completa para trabalho/admin. Mostra todos os blocos e módulos internos. |
| pro_preview | Pré-visualização Pro | Simulação de uma versão avançada/paga, com blocos completos ou teasers comerciais. |

### 3. Replace the current single-variant block badges with a cross-variant comparison table

Table with columns: **Bloco | Público | Interno | Pro Preview**

Rows for all 6 blocks. Cells use coloured badges:
- Green `Visível` when `full` / `lightweight`
- Grey `Oculto` when `hidden`
- Amber/purple `Teaser` when `teaser`

The active variant column gets a subtle highlight.

### 4. Add info note below the table
> "Esta pré-visualização não altera dados nem gera novas análises. Apenas muda a visibilidade dos blocos."

### Not changed
- No data/scoring/provider changes
- No report shell or block visibility logic changes (already done)
- No PDF pipeline changes
