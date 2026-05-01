
# Refinamentos — Caption Intelligence (Q04, Block 02)

## Avaliação

A implementação está sólida: tipos bem definidos, separação hashtags/captions respeitada, `font-mono` apenas em números crus, `text-eyebrow-sm` nos labels, sem cores hardcoded, action bridge funcional. Identifico 6 refinamentos para elevar a consistência e polish:

---

## Refinamentos a aplicar

### 1. Duplicação do card Q05 "Linguagem" com o Caption Intelligence

O antigo `renderCaptionCard` (agora numerado "05" — "Como são as legendas?") no groupB sobrepõe-se conceptualmente ao novo `ReportCaptionIntelligence`. Ambos analisam captions, CTAs e padrões de linguagem. O card Q05 deve ser removido do groupB para eliminar redundância — a informação já está coberta (e melhor) pelo novo bloco.

### 2. Snapshot cards — usar tokens de design em vez de Tailwind raw

Os 3 snapshot cards usam `bg-slate-50/80`, `bg-blue-50/60`, `ring-slate-200/70` diretamente. Para consistência com o sistema de tokens do relatório light, substituir por classes semânticas quando o token existir (ex.: insight box variants de `tokens-light.css`), ou pelo menos uniformizar os valores de opacidade (atualmente misturam `/60`, `/70`, `/80`).

### 3. Theme cluster cards — role label isolado

O role label (ex.: "educativo", "autoridade") está numa `div` própria sem contexto visual — parece perdido. Melhorar integrando-o como chip inline ao lado do confidence badge, com prefixo "papel:" para dar significado ao leitor não técnico.

### 4. CTA block — stat value vertical alignment

O `Stat` component usa `font-mono text-[18px]` para os valores percentuais. O tamanho é inconsistente com o sistema tipográfico do resto do relatório — os mini-stats nos diagnostic cards usam `text-[1.5rem]`. Uniformizar para `text-[1.25rem]` ou `text-[1.5rem]` conforme o espaço disponível na sidebar.

### 5. Action Bridge strip — ícone rotado

O `ArrowRight` como ícone da strip de ação sugerida é genérico. Usar `Lightbulb` (para "oportunidade") ou `AlertTriangle` (para "alta") daria mais clareza semântica sem adicionar complexidade.

### 6. Footer disclaimer — border token

O `border-t border-slate-100` do disclaimer final deve usar `border-border-subtle` para respeitar o sistema de tokens e funcionar correctamente em ambos os temas.

---

## Technical details

### Ficheiros alterados
- `src/components/report-redesign/v2/report-caption-intelligence.tsx` — refinamentos 2, 3, 4, 5, 6
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — refinamento 1 (remover `renderCaptionCard` do groupB)

### Validação
- `bunx vitest run` deve passar (nenhum teste referencia renderCaptionCard directamente)
- `bunx tsc --noEmit` deve passar
- Verificar mobile 375px sem overflow horizontal
