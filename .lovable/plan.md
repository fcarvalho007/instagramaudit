
## Problema

O card "Taxa de envolvimento" ocupa demasiado espaço vertical, o gráfico SVG é desproporcionadamente alto, as labels mono têm espaçamento estranho, e o perfil marker a 0,08% fica esmagado no fundo do gráfico. Falta elegância e leitura clara.

## Solução — Redesign compacto com barras verticais proporcionais

Reescrever o card e o gráfico com foco em legibilidade e proporção.

### 1. Card wrapper (`report-overview-engagement.tsx`)

- Hero number maior: `text-[2.5rem]` font-display (não mono)
- Referência e gap pill na mesma linha, com mais breathing
- Remover ícone Activity header — substituir por eyebrow "TAXA DE ENVOLVIMENTO" + source badge à direita
- Fundo do card limpo, sem gradients

### 2. Gráfico (`report-engagement-benchmark-chart.tsx`) — Redesign completo

**Abordagem: barras verticais compactas com HTML/CSS em vez de SVG puro**

- Substituir o SVG complexo por um layout flex/grid com divs para as barras — mais controlo sobre tipografia, responsividade e alinhamento
- Cada barra: `div` com `height` proporcional ao valor, `border-radius` no topo, transição suave
- Barra ativa: azul com gradient sutil, barras inactivas: slate-200 opaco
- Label do valor acima de cada barra em `text-[13px] font-display tabular-nums`
- Label do escalão abaixo em `text-[12px] font-sans`
- Escalão ativo: bold + underline accent azul
- Altura máxima do gráfico: `max-h-[200px]` — compacto mas legível

**Profile marker:**
- Linha horizontal tracejada vermelha a atravessar as barras na posição proporcional
- Label "Este perfil: 0,08%" à direita da linha, fora das barras, em `text-[13px] font-semibold text-rose-600`
- Se o valor é muito baixo, o marker fica visível no fundo com padding mínimo

**Reference line:**
- Linha tracejada azul a marcar a referência do escalão
- Label "Ref. escalão: 4,20%" posicionada à esquerda

**Tooltip:** ao hover/tap de uma barra, mostrar card flutuante com detalhes (mantém lógica actual simplificada)

### 3. Legend e sources

- Legend horizontal mais compacta: 3 dots + labels em `text-[12px]`
- Sources numa linha final discreta

### 4. Dimensões

- Card com `max-w` que respeita o layout do overview block
- Gráfico compacto: ~180-200px de altura para as barras
- Padding interno: `p-6 md:p-8`

## Ficheiros a editar

| Ficheiro | Alteração |
|---|---|
| `report-engagement-benchmark-chart.tsx` | Reescrever de SVG para HTML/CSS bars layout |
| `report-overview-engagement.tsx` | Refinar header, hero numbers e espaçamento |

## Notas técnicas

- A interface `BenchmarkChartProps` mantém-se inalterada (backward compatible)
- `getConsolidatedBenchmarkSeries()` e `getActiveTierIndex()` continuam a alimentar os dados
- Nenhum ficheiro locked é tocado
- O gráfico em HTML/CSS resolve os problemas de font-mono spacing e dá controlo total sobre responsive
