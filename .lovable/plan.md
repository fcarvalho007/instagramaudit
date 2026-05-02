
## Problema identificado

O cartão Q07 ("Que objetivo estratégico parece estar por trás?") repete a mesma informação duas vezes:

1. **Answer box** do `ReportDiagnosticCard` — mostra "Notoriedade · marca pessoal" em texto grande azul (1.5rem)
2. **Primary hypothesis** dentro do `DiagnosticObjectiveSynthesis` (children) — repete exatamente o mesmo texto num pill azul

A screenshot mostra claramente esta duplicação. O body text ("Síntese provável com base no tipo de conteúdo, funil, bio e ligação entre canais.") também é genérico e pouco informativo.

## Plano de refinamento

### 1. Eliminar a duplicação

Remover a caixa "Primary hypothesis" do `DiagnosticObjectiveSynthesis`, já que o answer box do card pai já mostra o objetivo principal. O componente fica apenas com: objetivo secundário, sinais de suporte, confiança e disclaimer.

### 2. Redesign visual do cartão Q07

Transformar o Q07 num cartão `span="full"` com layout horizontal mais apelativo:

- **Esquerda**: pergunta + answer box com o objetivo principal (já existe)
- **Direita**: substituir o layout actual por uma visualização tipo "radar" simplificado ou **barra de scoring horizontal** mostrando os 3-4 objetivos do ranking com as suas pontuações relativas — dá contexto visual imediato de porque o objetivo X foi escolhido vs os outros

### 3. Melhorar o body text

Substituir o body genérico por texto dinâmico que mencione os sinais concretos que levaram à conclusão. Ex: "Predominância de conteúdo educativo e posição de topo de funil sugerem foco em notoriedade."

### 4. Slot para leitura IA (aiSource)

Adicionar suporte ao `aiSource` prop neste cartão — quando `aiInsightsV2.sections.objective` existir, mostrar a interpretação IA abaixo do body, dando uma leitura editorial mais rica sobre o posicionamento estratégico.

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | Refactor `DiagnosticObjectiveSynthesis`: remover primary hypothesis duplicado, manter secondary + sinais + confiança + disclaimer. Adicionar visualização de ranking com barras horizontais. |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Alterar Q07 para `span="full"`, gerar body dinâmico baseado nos sinais, passar ranking items e aiSource. |

## Sem alterações a

- Lógica/classificadores em `block02-diagnostic.ts`
- Dados, cálculos, fontes, AI prompts
- Outros cartões do Bloco 02
- Layout desktop dos restantes componentes
