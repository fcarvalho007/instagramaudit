# Report UX 09 — Final Product QA (A / B / C / C+)

Ronda de QA, não de redesign. O objectivo é provar que o relatório funciona como um produto único e cumulativo nos quatro estados comerciais, corrigindo apenas regressões, bugs e incoerências com decisões já aprovadas.

## Estado já verificado (leituras feitas antes deste plano)

- Suite `src/components/report-redesign` verde: 16 ficheiros, 144 testes, incluindo `header-consistency`, `access-gating`, `report-shell-composition`, `card-review-04-05`, `card-review-06/07`, `comment-intelligence-truth`, `pro-gate-handoff`. Nenhuma regressão de guarda estrutural.
- `report_cache_key` está no contrato de handoff (`pro-checkout-search.ts`, `checkout.report-full.tsx`, `eupago.functions.ts`) — não há indício de BLOCKER de checkout; confirma-se na execução real.
- **Duplicação de CTA no Estado A (candidato MAJOR, confirmado no código):** `src/routes/analyze.$username.tsx` monta `DeepenAnalysisCta` sem qualquer condição de estado, a seguir ao shell. No Estado A o leitor recebe três superfícies para a mesma acção: o gate `FreeDeepenTeaser` dentro do preview de Publicações-chave (superfície principal aprovada), o bloco `DeepenAnalysisCta` e a `StickyFreeCtaBar`.
- `StickyUnlockBar` (Pro) só monta com `leadCaptured && !premiumUnlocked`, dispara depois de `#conversas` e esconde-se com `#lead-magnet-card` em viewport — coerente com o §16; confirma-se visualmente.

## Execução

### Fase 1 — Auditoria (sem alterar código de produto)

Percorrer os quatro estados via `/admin/report-lab` e preview fullscreen com `state=a|b|c` (mais um snapshot com concorrente para C+), em desktop 1280 / 1440 / 1728 e mobile 320 / 375 / 390 / 430, com capturas de ecrã.

Checklist por estado, conforme os pontos 2–24 do pedido: ordem e ausências do Estado A; cumulatividade B ⊃ A e C ⊃ B; headers inline canónicos (Engagement / Frequência / Formato); Índice do perfil; Engagement; Frequência; Formatos; Publicações-chave (preview vs completo, valores protegidos entregues ou não); Conversas nos cinco casos de dados; Pro Gate e sticky; sidebar inicial vs sticky; grelha canónica do topo; numeração 01–08 entre sidebar, tabs, anchors e headers; anchors `diag-*`; paridade Lab ↔ público.

Verdade dos dados (§24) por comparação directa dos valores renderizados com o snapshot, sem tocar em fórmulas.

### Fase 2 — Correcções admissíveis

Só se a auditoria as confirmar:

1. **CTA único no Estado A** — condicionar `DeepenAnalysisCta` para não competir com o gate do preview (mantendo-o apenas onde faz sentido, p. ex. estado pós-captura/processing), deixando `StickyFreeCtaBar` como reforço da mesma decisão e não como terceira proposta.
2. Regressões de header, gates errados, conteúdo que desaparece no tier seguinte, anchors partidos, overflow/overlap, copy factualmente errada.
3. Actualizar/estender testes de guarda apenas quando a correcção o exigir.

Nada de redesign, novos cards, accordions em mobile, mudanças de fórmula/IA, nem mover a camada comparativa C+.

### Fase 3 — Validação

Typecheck e a suite completa do relatório; falhas pré-existentes não relacionadas são listadas em separado.

## Entrega

Matriz Estado × Desktop × Mobile × Resultado, seguida de listas classificadas BLOCKER / MAJOR / MINOR / UX DEBT / ANALYTICAL DEBT. A dívida analítica já nomeada (mediana do índice, benchmark duplicado do Engagement, amostra de comentários, limitations por substring, `thumbnailUrl`) é registada sem investigação nesta ronda. A posição da camada comparativa C+ é classificada `OK AS IS` ou `UX DEBT`, sem mudança.

Encerra com `REPORT UX READY FOR RELEASE` apenas se BLOCKER = 0 e MAJOR = 0.

## Notas técnicas

Ficheiro com correcção provável: `src/routes/analyze.$username.tsx` (montagem condicional do `DeepenAnalysisCta`) e, se necessário, o teste `report-shell-composition.test.ts` para fixar a regra de CTA único no Estado A. Sem alterações a `access-gating.ts`, `block-config.ts`, sanitização de snapshot, pipelines ou i18n de conteúdo analítico, salvo copy factualmente errada.
