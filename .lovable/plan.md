# Plano — Block 1 + Block 2: menos métrica, mais interpretação

## 1. Auditoria — onde está a duplicação

Mapa do que o utilizador vê no preview público (lock="engagement"):

| Zona | Componente | Mostra |
|---|---|---|
| Hero | `report-hero-v2.tsx` | nome, @handle, avatar, seguidores, total posts, posts analisados, bio |
| KPI grid | `report-kpi-grid-v2.tsx` | **Envolvimento `X.XX%` vs benchmark**, **Ritmo `Y,Y` /semana**, Formato dominante + share |
| **Block 1 free** | `editorial-identity-card.tsx` | gauge 0-100, eyebrow VEREDICTO, título, parágrafo, barra de referência, **`MetricsStrip` (likes/post + comentários/post + ritmo/semana)**, 2+2 bullets fortes/limitações |

**Duplicações confirmadas:**

- `MetricsStrip.rhythm` (posts/semana) ≡ `kpi.rhythm`. **Duplicação directa.**
- `MetricsStrip.likes` + `comments` — não estão na KPI grid mas vão aparecer logo abaixo no `EngagementCardRefined` (locked) e no `PostComparisonBlock`. Sensação de repetição mecânica.
- Bullets `strengths`/`limits` padded com `fallback_active`, `fallback_history`, `fallback_diversify`, `fallback_conversation` — **violam "avoid generic praise or alarmism"**: são preenchidos sempre que não há sinal real, garantindo que o utilizador vê 4 bullets vagos em perfis com pouca evidência.

**Não-duplicações (preservar):**
- Gauge 0-100 (score composto, não está em mais lado nenhum).
- Eyebrow VEREDICTO + band badge.
- Título editorial (≤5 palavras) — já cumpre o requisito A1.
- Parágrafo 2-3 linhas — já cumpre A2.
- Barra de referência (referência visual ao benchmark).

**Block 2 (`ReportDiagnosticBlock`) — análise:**
- Só visível após unlock (no `public_mvp` está dentro do `<ReportLockGate>`).
- Já é puramente interpretativo: classifiers `classifyContentType`, `classifyFunnelStage`, `classifyAudienceResponse`, `classifyHashtags`, `classifyChannelIntegration` + `derivePriorities` (determinístico) ou `aiInsightsV2.priorities` (OpenAI).
- Cards mostram: tipo de conteúdo (distribuição), estágio de funil (stack), cap­tions, hashtags, audience (likes/comments por post — única zona onde aparece esta stat, sem duplicar Block 1), integração (bio link + menções).
- **`DiagnosticAudienceHighlight` mostra `avgLikes` e `avgComments`** — se Block 1 deixar de mostrar, deixa de haver duplicação.
- Conclusão: estrutura do Block 2 está correcta. Não há reescrita estrutural. Apenas garantimos que a remoção do `MetricsStrip` em Block 1 elimina a redundância com o Block 2.

## 2. Implementação

### A. Block 1 — `editorial-identity-card.tsx`

A.1. **Remover `MetricsStrip` por completo do render.** Mantemos a função no ficheiro durante o sprint (comentada como dead-code com `@deprecated` JSDoc) para reverter facilmente; remove-se em sprint seguinte. *Alternativa: apagar já.* Decisão: **apagar já** — menos código morto, fácil de recuperar por git.

A.2. **Novo bloco "Métrica âncora" (single, abaixo do parágrafo, acima dos bullets).**

   Selector determinístico (sem nova chamada de provider):
   - Se `keyMetrics.engagementBenchmark > 0` e `|engagementDeltaPct| ≥ 10`:
     anchor = engagement vs benchmark (`+12% acima da referência` / `‑34% abaixo da referência`)
   - Senão se `averageComments ≥ 1`:
     anchor = comentários médios por post (`4,2 comentários por post · sinal de conversa activa`)
   - Senão se `postingFrequencyWeekly ≥ 1`:
     anchor = ritmo (`3,5 publicações por semana · ritmo sustentável`)
   - Senão: omitir bloco âncora (não inventar).

   UI: 1 linha, ícone discreto, valor `tabular-nums`, mini-caption. **Sem repetir** a label da KPI grid (chama-se "ANCORA"/"ANCHOR", não "Envolvimento").

A.3. **Substituir as 2 colunas 2+2 bullets por bloco "Porque importa" (single, interpretivo).**

   - 1 eyebrow `PORQUE IMPORTA` / `WHY IT MATTERS`.
   - 1-2 frases interpretativas em texto corrido (sem bullets).
   - Selector determinístico baseado em (band, anchor source, dominantFormat):
     | Condição | Mensagem (template) |
     |---|---|
     | band=solid + delta≥10 | "O envolvimento acima da referência sugere que o conteúdo está calibrado para a tua audiência. O passo seguinte é proteger este ritmo." |
     | band=developing + delta entre ±10 | "O perfil está em zona de aprendizagem: há sinais positivos mas ainda inconsistentes. Pequenos ajustes ao formato e cadência decidem a próxima curva." |
     | band=warning + delta≤-30 | "O envolvimento está claramente abaixo da referência para perfis da mesma dimensão. A análise editorial identifica onde o conteúdo perde tracção." |
     | freq<1 (regardless of band) | "A cadência actual limita o alcance: o algoritmo precisa de frequência mínima para distribuir consistentemente." |
     | dominantFormatShare≥70 | "A concentração num único formato reduz o teste editorial. Diversificar para 60/30/10 abre novas hipóteses de tracção." |
     | fallback | "Os sinais actuais não definem uma direcção clara — a análise editorial completa o quadro com tipo de conteúdo, captions e resposta da audiência." |
   - Se `aiInsightsV2.hero.text` existir E tiver ≥ 2 frases após `splitFirstSentence`, usar a 2ª frase como "porque importa" (reaproveitar texto IA, sem nova chamada). Caso contrário, template.

A.4. **Remover** a função `deriveSignals` e respectivos `fallback_*` keys no JSON (limpar dead code).

A.5. **`ReportOverviewBlock.tsx`** — sem mudanças estruturais; a única alteração é que `EditorialIdentityCard` deixa de receber `averageLikes`/`averageComments`/`postsAnalyzed` (passamos a calcular o anchor com os 3 sinais já tipados).

### B. Block 2 — `report-diagnostic-block.tsx`

B.1. **Sem mudanças de código.** Razões:
   - Estrutura já é interpretativa (classifiers puros + AI priorities opcionais).
   - Avg likes/comments só aparece dentro de `DiagnosticAudienceHighlight` (Q05) — única instância no relatório após remoção do MetricsStrip. Não é duplicação.
   - Priorities têm fallback determinístico (`derivePriorities`) e fonte AI quando disponível — já cumpre B requirements.

B.2. **Verificação manual:** correr `bunx tsc --noEmit` + abrir um snapshot real e confirmar que nenhum card do Block 2 repete a frase "engagement rate = X%" ou "Y posts/semana" como afirmação numérica nova.

## 3. i18n

### Chaves a ADICIONAR (`report` ns, PT + EN)

```
identity.anchor.eyebrow                 "Métrica âncora" / "Anchor metric"
identity.anchor.engagement_above        "+{{delta}}% acima da referência"
identity.anchor.engagement_below        "{{delta}}% abaixo da referência" (delta já vem negativo)
identity.anchor.comments                "{{value}} comentários por post"
identity.anchor.comments_caption        "sinal de conversa activa"
identity.anchor.rhythm                  "{{value}} publicações por semana"
identity.anchor.rhythm_caption          "ritmo sustentável"

identity.why.eyebrow                    "Porque importa" / "Why it matters"
identity.why.solid_above
identity.why.developing
identity.why.warning_below
identity.why.weak_cadence
identity.why.format_concentrated
identity.why.neutral
```

### Chaves a REMOVER do uso (mas manter no JSON para evitar quebrar histórico)
- `identity.metrics.*`
- `identity.signals.fallback_*`
- `identity.columns.strengths` / `identity.columns.limits` (deixam de ser renderizadas)

*Decisão*: manter no JSON neste sprint (zero risco de chave faltante noutro consumidor); marcar `// @deprecated` no ficheiro de tradução por comentário externo (README do i18n se existir, senão skip).

## 4. Testes

- Adicionar `src/components/report-redesign/v2/overview/__tests__/editorial-anchor.test.ts`:
  - Selector de anchor: cobre os 4 ramos + nulo.
  - Selector de "porque importa": cobre os 6 ramos.
  - Confirma que `MetricsStrip` deixou de ser exportado (regression guard).
- Render smoke test (opcional, baixa prioridade): renderizar `EditorialIdentityCard` com props mínimas + props ricas; verificar que não rebenta sem `averageLikes`/`averageComments`.

## 5. Constraints respeitadas

- Sem GSAP. Sem dark mode (componente já é light-first). Sem nova provider call. Sem regenerar relatórios. Sem expor blocos locked. Mobile-first preservado (anchor + why são layouts single-column nativos). PT/EN compatível.

## 6. Validação

```bash
bunx tsc --noEmit
bunx vitest run
```

Manual:
1. Snapshot cached com `aiInsightsV2.hero.text` → título + parágrafo IA, "porque importa" = 2ª frase IA.
2. Snapshot cached **sem** AI → título + parágrafo determinísticos, "porque importa" = template.
3. Snapshot com `engagementDeltaPct = +25` → anchor mostra `+25% acima da referência`.
4. Snapshot com `engagementDeltaPct = -45` → anchor mostra `-45% abaixo`, "porque importa" = `warning_below`.
5. Snapshot small-sample (`postsAnalyzed < 5`) → `low_confidence` continua a substituir a barra de referência (sem regressão).
6. Free preview confirma: zero duplicação visível entre KPI grid (`Y,Y /semana`) e Block 1.
7. EN: switch idioma → todas as novas chaves traduzem.

## 7. Output esperado

- **Componentes alterados**: `editorial-identity-card.tsx` (remove MetricsStrip + BulletColumn render, adiciona AnchorMetric + WhyItMatters), `report-overview-block.tsx` (remove props já não passadas).
- **Componentes inalterados**: hero, kpi grid, engagement card, diagnostic block, diagnostic priorities, post comparison.
- **Dados usados (Block 1)**: `scores`, `keyMetrics.engagementRate/Benchmark/DeltaPct`, `dominantFormat/Share`, `postingFrequencyWeekly`, `followers`, `postsAnalyzed`, `averageLikes/Comments`, `aiInsightsV2.hero.text` opcional.
- **OpenAI**: **opcional** em ambos os blocos. Block 1 usa `aiInsightsV2.hero.text` quando existir; senão template determinístico completo. Block 2 usa `aiInsightsV2.priorities` quando existir; senão `derivePriorities`.

## 8. Checkpoint

☐ Remover `MetricsStrip` do render + apagar função e tipos.
☐ Implementar `AnchorMetric` (selector puro + UI single-row).
☐ Implementar `WhyItMatters` (selector puro + UI single-paragraph).
☐ Remover render de `BulletColumn` + apagar `deriveSignals`.
☐ Adicionar chaves PT+EN em `report.json` (anchor.*, why.*).
☐ Adicionar `editorial-anchor.test.ts`.
☐ `bunx tsc --noEmit` + `bunx vitest run`.
☐ QA manual: cached snapshot com e sem `aiInsightsV2`.
