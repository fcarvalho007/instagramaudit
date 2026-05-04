
## Criar 4 KPI summary cards no topo do Bloco 2

### Contexto

Os 4 cards compactos mostrados no screenshot **não existem no código atual**. O ficheiro `report-diagnostic-grid-v2.tsx` contém um grid de 6 cards com estilo semelhante, mas é dead code (não importado em nenhum local). O `ReportDiagnosticBlock` renderiza: veredicto → grupos A-D de Q cards detalhados → prioridades → CTA — sem summary row.

A tarefa é criar um **novo componente de 4 summary cards** que se posiciona entre o veredicto e os grupos, mostrando os 4 sinais-chave de forma compacta e acessível.

### Ficheiros a editar
- **Criar**: `src/components/report-redesign/v2/report-diagnostic-summary-cards.tsx` (novo componente)
- **Editar**: `src/components/report-redesign/v2/report-diagnostic-block.tsx` (inserir o componente após o veredicto)

### Ficheiros que NÃO serão tocados
Block 2 title/subtitle, groups A-D, Q cards (P01-P07), verdict, priorities, backend, adapters, admin, PDF, global tokens, locked files.

---

### Novo componente: `ReportDiagnosticSummaryCards`

Recebe os 4 classificadores já calculados (`contentType`, `funnel`, `audience`, `objective`) e renderiza 4 cards compactos em grid `grid-cols-2 sm:grid-cols-4`.

Cada card:
- Ícone pastel em círculo colorido (mesmos ícones do screenshot: Sparkles, Layers, MessageCircle, Compass)
- Label pequena (eyebrow-sm)
- Headline serif (`font-display`, semibold) — texto humano e auto-explicativo
- Subtítulo técnico preciso

**Sem** badge "∿ AUTO". Sem `ReportSourceLabel`.

#### Copy proposta (derivada dos dados dos classificadores):

| # | Label | Headline | Subtítulo | Fonte do dado |
|---|-------|----------|-----------|---------------|
| 1 | Tipo de conteúdo | *Dinâmico*: "Conteúdo variado" (se misto) ou label do classificador | `"{topCategory} lidera, mas só com {share}%"` ou `"{share}% {label}"` | `contentType.label`, `contentType.distribution[0]` |
| 2 | Papel do conteúdo | *Dinâmico*: "Atrai mais do que converte" (se topo) / adaptado por fase | `"{share}% dos posts geram {ação}"` | `funnel.label`, `funnel.breakdown` |
| 3 | Resposta do público | *Dinâmico*: "Quase sem comentários" (se silenciosa) / "Audiência ativa" | `"{n} comentários médios por post"` | `audience.label`, `audience.avgComments` |
| 4 | Objetivo deste perfil | *Dinâmico*: label do objetivo | `"{context} · {confidence}%"` | `objective.label`, `objective.confidence` |

A copy é **derivada dos dados dos classificadores**, não hardcoded. Cada headline tem uma versão humanizada via lookup, com fallback para o label original.

#### Lookup de headlines humanizadas:

```
contentType:
  "Misto / pouco claro" → "Conteúdo variado"
  default → label original

funnel:
  "Topo do funil" → "Atrai mais do que converte"
  "Meio do funil" → "Educa antes de vender"
  "Fundo do funil" → "Foco na conversão"
  "Pós-venda / fidelização" → "Relação com a comunidade"
  "Comunicação dispersa" → "Sem direção clara"

audience:
  "Audiência silenciosa" → "Quase sem comentários"
  "Audiência ativa" → "Conversa ativa"
  default → label original

objective:
  label original mantido (já é claro: "Notoriedade", "Vendas", etc.)
```

#### Tokens visuais:
- Card: `rounded-2xl border border-border-default bg-surface-secondary shadow-card p-5`
- Icon wrap: pastel ring circles (`bg-blue-50 ring-blue-100 text-blue-600`, etc.) — mesmos tons do screenshot
- Label: `text-eyebrow-sm text-content-secondary`
- Headline: `font-display text-base font-semibold text-content-primary tracking-tight`
- Subtitle: `text-xs text-content-secondary` (com valores signal-success/danger quando aplicável)

### Integração no `report-diagnostic-block.tsx`

Inserir entre o veredicto (linha 140) e o bloco condicional `totalCards >= 4` (linha 142):

```tsx
<ReportDiagnosticSummaryCards
  contentType={contentType}
  funnel={funnel}
  audience={audience}
  objective={objective}
/>
```

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Screenshot desktop + 375px mobile
