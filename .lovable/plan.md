## Avaliação de prontidão

**PASS** — ambos os perfis têm snapshots completos e o sistema está em cache_only.

### Correção importante à auditoria

Após inspecção directa ao código, a maioria dos campos listados como "não renderizados" **já estão activos no report**:

| Campo | Estado real |
|-------|-------------|
| `ai_insights_v2.sections.formats` | Renderizado (shell-v2 L196) |
| `ai_insights_v2.sections.heatmap` | Renderizado (shell-v2 L174) |
| `ai_insights_v2.sections.benchmark` | Renderizado (shell-v2 L235) |
| `ai_insights_v2.sections.daysOfWeek` | Renderizado (shell-v2 L176) |
| `ai_insights_v2.sections.marketSignals` | Renderizado (shell-v2 L225) |
| `ai_insights_v2.sections.evolutionChart` | Renderizado (shell-v2 L166) |
| `caption_semantic_analysis.hookQuality` | Renderizado (caption-diagnostics-card L697-704) |
| `caption_semantic_analysis.brandVoice` | Renderizado (caption-diagnostics-card L707-714) |
| `caption_semantic_analysis.formulaicPatterns` | Renderizado (caption-diagnostics-card L717-725) |
| `caption_semantic_analysis.dominantThemes` | Renderizado (caption-diagnostics-card L367) |
| `comment_intelligence.sampleComments` | Renderizado (TransparencyStrip L144) |
| `comment_intelligence.recommendedConversationAction` | Renderizado (CommentIntelligenceSection L421) |
| `comment_intelligence.uniqueAudienceCommentersCount` | Renderizado (AudienceVoiceBreakdown L1072) |

### Campos genuinamente não renderizados

| Campo | Componente existente | Risco |
|-------|---------------------|-------|
| `ai_insights_v2.priorities` | `report-diagnostic-priorities.tsx` existe mas **nunca é importado** | Baixo — basta ligar |
| `comment_intelligence.dominantConversationSignals` | Nenhum | Baixo — array de strings |

---

## Plano de implementação

### Prompt 1 — Ligar prioridades de ação ao diagnóstico

**Valor:** Alto — as prioridades são o bloco de maior impacto editorial, já com componente pronto mas desligado.

**Ficheiros a editar:**
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — importar `ReportDiagnosticPriorities`, mapear `ai_insights_v2.priorities` para `PriorityItem[]`, renderizar após o último grupo (D), com fallback determinístico existente.

**Ficheiros bloqueados (não tocar):**
- `report-diagnostic-priorities.tsx` (componente visual já está pronto)
- Todos os ficheiros em LOCKED_FILES.md
- Nenhum endpoint, nenhum provider, nenhum pipeline PDF

**Risco:** Mínimo — o componente já está testado visualmente; o único trabalho é a conversão de tipos `AiPriorityItem → PriorityItem` e o render condicional.

---

### Prompt 2 — Mostrar dominantConversationSignals no card Q05

**Valor:** Médio — enriquece o diagnóstico de audiência com o sinal de conversa dominante (ex.: "praise", "questions").

**Ficheiros a editar:**
- `src/components/report-redesign/v2/report-diagnostic-card.tsx` — na zona Z3 do `DiagnosticAudienceHighlight`, após o `AudienceVoiceBreakdown`, adicionar uma linha com os sinais dominantes de conversa vindos de `comment_intelligence.dominantConversationSignals`. Usar chips semelhantes aos já existentes em `buildSignalChips`.

**Ficheiros bloqueados:**
- `report-comment-intelligence.tsx` (componente standalone, não duplicar lógica)
- Todos os ficheiros em LOCKED_FILES.md

**Risco:** Baixo — campo é um `string[]` simples; fallback vazio (não renderizar quando array vazio ou ausente).

---

### Prompt 3 — Fallback states defensivos

**Valor:** Médio — protege contra snapshots incompletos futuros.

**Ficheiros a editar:**
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — garantir que a secção de prioridades (Prompt 1) tem fallback gracioso quando `priorities` é `undefined`.
- `src/components/report-redesign/v2/report-diagnostic-card.tsx` — garantir que `dominantConversationSignals` (Prompt 2) não rebenta com `undefined`.

**Nota:** Os restantes campos (hookQuality, brandVoice, etc.) **já têm fallback** — renderizam condicionalmente com `&&`.

---

## Ficheiros que NÃO devem ser tocados

- `src/lib/enrichment/run-enrichment.server.ts`
- `src/lib/insights/openai-insights.server.ts`
- `src/lib/analysis/comment-intelligence.ts`
- `src/lib/report/block02-diagnostic.ts` (salvo se necessário para mapear priorities)
- Todos os endpoints `/api/`
- Todos os ficheiros de LOCKED_FILES.md
- Pipeline PDF
- Admin / custos
- `report-shell-v2.tsx` (as 9 sections de insights V2 já estão ligadas)

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Tipo mismatch entre `AiPriorityItem` e `PriorityItem` | Criar mapper inline, verificar com tsc |
| Snapshot antigo sem `priorities` | Fallback para derivador determinístico já existente em block02 |
| Snapshot sem `dominantConversationSignals` | Render condicional — vazio = não mostrar |
| Alterar acidentalmente provider logic | Scope restrito a componentes de report-redesign/v2 |
