
# Reorganização da Pergunta 04 — Caption Intelligence

## Problema

A Q04 tem 8 sub-blocos (snapshot row + source legend + temas + expressões + tipo de conteúdo + leitura editorial + CTAs + ação recomendada + disclaimer + premium teaser). Isso cria sobrecarga de informação e redundância:

1. **"Tipo de conteúdo" dentro da Q04 repete Q01** — Q01 já classifica o tipo de conteúdo editorial com distribuição por barras. A `ContentTypeMixBlock` na Q04 faz essencialmente o mesmo mas com labels ligeiramente diferentes (Convite/CTA, Educativo, Institucional, Opinião). Redundância clara.
2. **Demasiados sub-blocos** para uma única pergunta — o olho não sabe onde pousar.
3. **Source Legend** (linha "Origens: Dados extraídos / Leitura automática / Leitura IA") ocupa espaço sem acrescentar valor — cada secção já tem a sua badge individual.

## Alterações propostas

### 1. Remover ContentTypeMixBlock
A distribuição por tipo de conteúdo já vive na Q01. Eliminar da Q04 para evitar redundância.

### 2. Remover SourceLegend
Cada sub-secção já mostra a sua source badge. A legenda agregada no topo é redundante.

### 3. Fundir Expressões Recorrentes com Temas
Em vez de dois blocos separados (Temas + Expressões), criar uma secção unificada "Temas e expressões":
- Temas dominantes no topo (como está)
- Expressões recorrentes logo abaixo como tags complementares, com um separador subtil

### 4. Promover layout vertical
Com a remoção do ContentTypeMix e a fusão de expressões, a coluna esquerda fica mais leve. Reorganizar para:
- **Linha 1**: Snapshot row (3 cards) — como está
- **Linha 2**: Temas + Expressões (fusão, full-width ou left) | Leitura Editorial (right)
- **Linha 3**: CTAs (left) | Ação recomendada (right)
- **Footer**: Disclaimer + Premium teaser

### 5. Reduzir temas a máx. 4
Se houver 5+ temas, mostrar apenas 4 — menos ruído visual.

## Ficheiros a editar

- `src/components/report-redesign/v2/report-caption-intelligence.tsx` — todas as alterações de layout

## Ficheiros NÃO tocados

- Nenhum ficheiro locked, schema, providers, PDF ou admin
- `src/lib/report/caption-intelligence.ts` — dados permanecem iguais, só a apresentação muda
