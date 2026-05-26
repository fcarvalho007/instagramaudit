## Diagnóstico (Bloco 1 · Card Identidade Editorial · coluna esquerda "Índice do perfil")

Ficheiro: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` → componente `IndexBlock` (linhas ~587-805).

Estrutura atual:
```
<article rounded-2xl border> (card)
  └─ <div px-6 py-7 sm:px-7 sm:py-8 flex>   ← Zona macro
       ├─ <IndexBlock> (coluna esquerda)
       │    ├─ eyebrow + número + subtítulo + microline
       │    ├─ régua vertical (min-h-[168px])
       │    └─ <details "Como foi calculado"> (mt-auto)
       └─ direita: veredicto + parágrafo
```

Problemas que correspondem à anotação da captura:
1. **Linha amarela (borda inferior):** o toggle "Como foi calculado" tem `mt-auto` mas a Zona macro envolvente tem `py-8`, criando ~32 px de espaço morto entre o toggle e a borda real do card. O toggle nunca chega à borda.
2. **Linha vermelha (régua):** a régua tem `min-h-[168px]` fixo e a coluna `IndexBlock` é `h-full`, mas a régua não usa `flex-1`. Por isso encurta e a coluna direita (com parágrafo) fica muito mais alta — a régua não "atravessa" o card.
3. **Clareza do "Como foi calculado":** label a `text-[10.5px] uppercase tracking-wide text-content-tertiary` — quase invisível. Não convida ao clique e a hierarquia desaparece.

## Mudanças (cirúrgicas, só no `IndexBlock`)

### 1. Toggle colado à borda inferior do card (linha amarela)

Transformar o `<details>` num **footer da coluna**, com:
- `border-t border-border-default` para separar visualmente da régua.
- Bleed para fora do `px-7 py-8` do pai via margens negativas: `-mx-6 sm:-mx-7 -mb-7 sm:-mb-8`.
- Padding interno próprio que recoloca o respiro: `px-6 sm:px-7 py-3.5`.
- `mt-auto` mantém-se para empurrar a secção para o fim do flex column.

Resultado: o toggle ocupa toda a largura da coluna esquerda **até à borda física do card** (linha amarela), com um separador limpo por cima.

Caveats: o pai `Zona macro` continua `flex sm:flex-row sm:items-stretch` — o footer só bleed na vertical inferior + horizontal esquerda (não toca o lado direito da coluna direita porque o footer vive dentro de `IndexBlock`, que termina na linha vertical separadora `sm:border-l` da coluna direita).

### 2. Régua mais transversal (linha vermelha)

No container da régua (`<div className="flex gap-3 min-h-[168px]" …>`):
- Substituir `min-h-[168px]` por `flex-1 min-h-[200px]`.
- Garantir que o `IndexBlock` continua `h-full` (já está). Como o `mt-auto` vive no footer, o `flex-1` da régua absorve todo o espaço entre o cabeçalho do índice e o footer.

Resultado: o bar vertical `bg-surface-muted` cresce até preencher a altura disponível, e os 4 estágios (Líder · Competitivo · Em progresso · Emergente) ficam distribuídos via `justify-around` numa amplitude maior — visualmente "transversal" como a anotação vermelha pede.

### 3. Clareza do "Como foi calculado"

Refinar o `<summary>`:
- Aumentar para `text-[13px] font-medium` em sentence-case ("Como foi calculado"), tirando o uppercase pequeno.
- Adicionar ícone `Info` (já existe no projeto, `lucide-react`) à esquerda, tamanho `h-3.5 w-3.5`.
- Layout `flex items-center justify-between` com chevron à direita (já lá está, `ml-auto` no chevron).
- `text-content-secondary` em vez de `text-content-tertiary` (mais legível).
- Hover: `hover:text-content-primary hover:bg-surface-muted/60` para indicar afordância.
- Manter chevron rotativo (`group-open:rotate-180`).

Conteúdo expandido (já existe, manter): 3 parágrafos curtos + amostra + disclaimer. Apenas trocar `text-xs` → `text-[13px]` para alinhar com o novo label e melhorar leitura.

## Validação

- Preview em `/analyze/$username` (ou `/report.example` que reusa o componente) viewport 1460 e 375.
- Confirmar que:
  - O toggle toca a borda inferior do card.
  - A régua vertical ocupa visivelmente todo o espaço entre cabeçalho e toggle.
  - "Como foi calculado" lê-se com naturalidade, com ícone + chevron.
- `bunx tsc --noEmit`.

## Fora de scope

- Não tocar na coluna direita (veredicto, parágrafo).
- Não tocar nas zonas inferiores (`MetricsStrip`, `BulletColumn` strengths/limits).
- Não tocar nas i18n keys (mesma copy).

## Checklist

☐ `IndexBlock`: régua passa a `flex-1 min-h-[200px]`
☐ `IndexBlock`: `<details>` vira footer com `border-t`, bleed `-mx/-mb`, padding próprio
☐ `<summary>`: ícone Info + label `text-[13px] font-medium` sentence-case + hover surface
☐ Corpo expandido: subir para `text-[13px]`
☐ QA visual em 1460 px e 375 px no `/report.example`
