
# Refinamento · Bloco 01 — Gráfico de Benchmark de Envolvimento

## Problemas identificados

1. **Gráfico demasiado pequeno** — `maxHeight: 220px` e `viewBox 400x200` comprimem as barras. A peça central do bloco merece mais espaço.
2. **Fontes sem links** — O rodapé do gráfico mostra `SOCIALINSIDER [1], BUFFER [2], HOOTSUITE [3]` mas sem links clicáveis. Os URLs existem no dataset (`benchmark-context.ts`), basta renderizá-los como `<a>`.
3. **Falta de clareza sobre o que cada fonte mede** — O utilizador não percebe que Buffer mede por escalão de seguidores e Socialinsider por formato. Não é preciso complicar, mas uma linha curta de contexto por fonte ajuda a transparência.

## Plano

### 1. Aumentar o gráfico

**Ficheiro**: `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

- Aumentar `VB_H` de `200` para `260` e `maxHeight` de `220px` para `300px`
- Ajustar `PAD_T` e `PAD_B` para dar mais espaço interno às barras
- Aumentar `GRID_LINES` de 4 para 5 para mais granularidade no eixo Y

### 2. Links clicáveis nas fontes com [n]

**Ficheiro**: `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

O rodapé já renderiza `<a>` tags com `href={ref.url}` — isto está correto. Verificar que os URLs chegam do componente pai. O `sourceReferences` já é passado com `{ name, url }` desde `report-overview-cards.tsx`. Os links já devem funcionar. Se não aparecem clicáveis, pode ser um problema de styling — vou garantir `underline` ou `hover:underline`.

### 3. Micro-contexto por fonte

**Ficheiro**: `src/components/report-redesign/v2/report-benchmark-evidence.tsx`

Adicionar uma linha discreta abaixo da linha de proveniência existente, com o papel de cada fonte:
- **Socialinsider** — envolvimento orgânico por formato
- **Buffer** — referência por dimensão da conta

Sem alterar o layout principal. Apenas uma `<p>` adicional em `text-[10.5px]` com tom `slate-400`.

### 4. Alternativa: não complicar

O utilizador disse "não quero complicar". A abordagem é minimalista: uma frase curta tipo tooltip ou sub-linha, não um bloco novo. Se a fonte já aparece com `[1]` e link, o contexto do papel é um complemento discreto — não um parágrafo.

## Ficheiros a editar

- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` — gráfico maior + styling dos links
- `src/components/report-redesign/v2/report-benchmark-evidence.tsx` — micro-contexto por fonte (opcional, 1 linha)

Nenhum ficheiro bloqueado, schema, provider ou PDF será tocado.
