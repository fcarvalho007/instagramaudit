## Contexto

A simplificação anterior do bloco diagnóstico (`report-diagnostic-block.tsx`, linhas 145-170) reduziu o relatório Pro a apenas dois cards: `StrategicContextCard` + `ReportDiagnosticPriorities`. Os sete cards diagnósticos pedidos já existem como componentes (`renderContentTypeCard`, `renderFunnelCard`, `HashtagDiagnosticsCard`, `CaptionDiagnosticsCard`, `VisualCoverAnalysisCard`, `renderAudienceCard`, `renderIntegrationCard`) e continuam a ser renderizados no ramo lab. Só falta torná-los visíveis no relatório comercial Pro, dentro de uma secção 06 renomeada para "Diagnóstico editorial".

Nenhum classifier, fetch, scraper, pagamento, schema ou métrica é tocado.

## Alterações

### 1. `src/components/report-redesign/v2/block-config.ts`
- Em `COMMERCIAL_SECTIONS`, substituir a entrada 06:
  - `id: "contexto-estrategico"` → `"diagnostico-editorial"`
  - `shortLabel: "Contexto estratégico"` → `"Diagnóstico editorial"`
  - `icon: Compass` → `Stethoscope` (já importado)
  - `tier` e `number` permanecem.
- Não alterar lab `BLOCKS` (mantém variantes experimentais intactas).

### 2. `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- Substituir o ramo comercial (`if (!isLab) { … }`, linhas 145-170) por uma renderização que reaproveita exactamente os mesmos builders já usados em lab, na ordem pedida:

```text
<div id="diagnostico-editorial">
  Grupo A · Identidade editorial   → Natureza + Funil
  Grupo B · Como comunica          → Hashtags + Legendas
  Grupo E · Análise visual         → Capas
  Grupo C · Resposta do público    → Audiência
  Grupo D · Integração             → Integração entre canais
</div>
<div id="prioridades">
  ReportDiagnosticPriorities
</div>
```

- Os helpers `renderContentTypeCard`, `renderFunnelCard`, `HashtagDiagnosticsCard`, `CaptionDiagnosticsCard`, `VisualCoverAnalysisCard`, `renderAudienceCard`, `renderIntegrationCard` ficam **inalterados** — só são chamados também no ramo comercial. Reaproveita `ReportDiagnosticGroup` (letras + labels A/B/E/C/D já traduzidos via `diagnostic_groups.*`).
- Remover `StrategicContextCard` + `buildStrategicContext` do ramo comercial (já não fazem parte de 06). O import de `StrategicContextCard` e `buildStrategicContext` fica disponível apenas para lab — se deixar de ser usado em lado nenhum, remover os imports para evitar warning. (Pela leitura actual o lab não os usa, logo serão removidos junto com o ramo antigo.)
- Manter o gate `totalCards >= 4 ? … : fallback` **apenas no ramo lab**. No ramo comercial não usar esse gate — qualquer card que não tenha dados continua a devolver `null` localmente (comportamento existente: audience tem State B, content type tem ramo "Misto", hashtag/caption/visual têm os seus próprios empty-states). Não introduzir lógica nova de fallback aos cards — apenas garantir que o container `<div id="diagnostico-editorial">` é sempre renderizado, mesmo que vazio (caso extremo de payload sem qualquer sinal), com uma frase curta `diagnostic_groups.small_sample` como fallback.

### 3. `src/components/report-redesign/v2/report-overview-block.tsx`
- No array de teasers (linhas 53-60), actualizar o item 06:
  - `eyebrow: "CONTEXTO ESTRATÉGICO"` → `"DIAGNÓSTICO EDITORIAL"`
  - `title: "O que estes sinais dizem sobre o perfil?"` → algo como `"O que explica o que estás a ver?"` (alinhado com a `question` do bloco lab "Diagnóstico editorial").
  - `description`: passa a descrever a leitura editorial em 7 cards (natureza, funil, hashtags, legendas, capas, audiência, integração).
  - `anchorId: "contexto-estrategico"` → `"diagnostico-editorial"` (mantém o scroll do CTA premium consistente).

### 4. Sem alterações
- `report-shell-v2.tsx`, `report-block-nav.tsx`, `use-active-block.ts`, `premium-cta-context.tsx`, `payments/*`, `report-variant.ts`, `block02-diagnostic.ts`, `strategic-context.ts`, scraping/ingest/Apify/Supabase. Todos os classifiers e dados ficam intactos.
- Lab variant continua a renderizar a árvore completa (grupos A/B/E/C/D + Prioridades) — sem regressão.

## Riscos & salvaguardas
- A sidebar usa `s.shortLabel` directamente de `COMMERCIAL_SECTIONS`. Mudar o id de `contexto-estrategico` para `diagnostico-editorial` requer que o anchor DOM mude no mesmo PR (feito em 2 e 3). O scroll-spy passa a destacar 06 normalmente.
- O CTA premium do overview-block scrolla para `anchorId`; atualizado em 3.
- Os 7 cards já são determinísticos a partir de `result` + `payload`; reaproveitamento puro, zero novo I/O.
- Nenhum impacto em pricing, entitlement, unlock, EuPago, geração de relatório, métricas ou schema.

## Validação manual
1. Relatório Pro mostra 7 secções na sidebar: Visão geral, Engagement, Frequência editorial, Mix de formatos, Publicações-chave, **Diagnóstico editorial**, Prioridades de acção.
2. Secção 06 renderiza os 7 cards diagnósticos agrupados em A · Identidade editorial, B · Como comunica, E · Análise visual, C · Resposta do público, D · Integração.
3. Secção 07 (Prioridades de acção) aparece imediatamente a seguir.
4. Clicar em "Diagnóstico editorial" na sidebar faz scroll para `#diagnostico-editorial`; "Prioridades de acção" → `#prioridades`.
5. Relatório free continua a mostrar apenas Visão geral + Engagement desbloqueados; os teasers 03-07 listam o novo eyebrow "DIAGNÓSTICO EDITORIAL" em 06.
6. Internal lab continua a mostrar todos os blocos experimentais (performance, conteudo, procura, benchmark) — sem regressão.
7. Mobile: cards do diagnóstico empilham; sem overflow horizontal.
8. Cards sem dados continuam a usar os seus próprios empty-states (audience State B, integration "Sem sinais suficientes" devolve null silenciosamente).
9. Sem mudanças em logs, pagamentos, scraping ou schema (`git diff` confinado a 3 ficheiros).
