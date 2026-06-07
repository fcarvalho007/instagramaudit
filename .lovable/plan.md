## Auditoria — primeiro cartão de visão geral / veredicto editorial

Esta auditoria é apenas leitura — nenhum ficheiro é alterado.

---

### 1. Ficheiros inspeccionados

| Ficheiro | Papel |
|---|---|
| `src/components/report-redesign/v2/overview/free-initial-reading-card.tsx` | Componente Free (determinístico, AI-free). |
| `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` | Componente Pro (veredicto editorial, IA + guard). |
| `src/components/report-redesign/v2/report-overview-block.tsx` | Roteia `mode="free_with_engagement"` vs `mode="all"`; alimenta props. |
| `src/components/report-redesign/v2/report-shell-v2.tsx` (ll. 230-253) | Decide `free_with_engagement` quando `lockBoundary === "engagement" && !premiumUnlocked`. |
| `src/lib/report/sanitize-snapshot.ts` | Remove `ai_insights_v2`, `visual_cover_analysis`, `caption_semantic_analysis`, `comment_intelligence`, `market_signals_*` para callers Free. |
| `src/lib/report/snapshot-to-report-data.ts` (`buildKeyMetrics` 641-681; sample-override 1158-1260) | Constrói `result.data.keyMetrics` a partir de `content_summary` + sample Block 1. |
| `src/lib/report/editorial-verdict-fallback.ts` | Fallback determinístico do Pro card (também serve para downgrades parciais). |
| `src/lib/report/editorial-verdict.ts` | Guard que valida veredicto IA contra métricas reais. |
| `src/lib/report/cadence.ts` (cabeçalho) | Define `enriched.cadence.weekly/sufficient/reliability/method/windowDays`. |
| `src/lib/report/cadence-label.ts` | `buildCadenceLabelPt`, `classifyHashtagsState`, `pickHashtagsForVerdict`. |
| `src/lib/report/block01-sample.ts` + `src/lib/report/post-aggregates.ts` | Sample canónico para likes/comments médios. |

---

### 2. Tabela de dependência de dados (elemento visível → fonte)

#### A. `FreeInitialReadingCard` (público Free, `mode="free_with_engagement"`)

| Elemento visível | Prop | Fonte real | Apify-derivado? | AI? | Sobrevive à sanitização Free? |
|---|---|---|---|---|---|
| Eyebrow "VISÃO GERAL" + título "Leitura inicial do perfil" | — | Literal no componente | — | Não | Sim (literal). |
| Verdict (linha 1: "Perfil consistente…" / "Cadência forte, sinal fraco" / …) | derivado de `cadenceDefined`, `engagementDefined`, `cadenceOk`, `engagementOk` | `keyMetrics.engagementRate`, `keyMetrics.engagementBenchmark`, `keyMetrics.postingFrequencyWeekly`, `enriched.cadence.sufficient` | Apify (likes/comments/posts) → `engagementRate`; `engagementBenchmark` é DataForSEO/tiers; cadence calculada localmente sobre Apify | Não | Sim — todos vivem em `content_summary` / sample, fora do conjunto strip. |
| Parágrafo explicativo (template "Este perfil publica X vezes/sem, taxa Y, acima/abaixo do benchmark Z. Formato dominante…") | mesmas variáveis acima + `dominantFormat`, `dominantFormatShare` | `keyMetrics.dominantFormat` e `dominantFormatShare` (de `content_summary.dominant_format` + `format_stats[k].share_pct`) | Apify (tipos de post) | Não | Sim. |
| Métrica "Cadência" (`X / sem`) | `postingFrequencyWeekly`, `cadenceSufficient` | `keyMetrics.postingFrequencyWeekly` (override pelo módulo `cadence` no adapter, l. 1260) | Apify timestamps | Não | Sim. |
| Métrica "Envolvimento" (`X%` + hint "Benchmark Y%") | `engagementRate`, `engagementBenchmark` | `keyMetrics.engagementRate` (override do sample, l. 1170) + benchmark de `benchmark.positioning` (DataForSEO/tiers) | Eng. = Apify; benchmark = referência externa | Não | Sim (`benchmark` é resolvido server-side e injectado no `result`, não vive nos campos paid). |
| Métrica "Formato dominante" (`Reels / Carousels / Imagens` + hint "X% dos posts") | `dominantFormat`, `dominantFormatShare` | `keyMetrics.dominantFormat[Share]` (sample-override quando posts disponíveis) | Apify | Não | Sim. |
| "O que funciona" (bullets) | `cadenceOk`, `engagementOk`, `formatDiversified`, `hasRecurringHashtags` | iguais acima + `result.data.topHashtags` (uses ≥ 2) | Apify | Não | Sim (`top_hashtags` é extraído no adapter a partir de posts). |
| "O que limita" (bullets) | `cadenceDefined && !cadenceOk`, `engagementDefined && !engagementOk`, `formatOverdependent`, `!hasRecurringHashtags` | iguais | Apify | Não | Sim. |

#### B. `EditorialIdentityCard` (Pro, `mode="all"`)

Mesma base, mais:

| Elemento adicional | Prop | Fonte | Apify/AI |
|---|---|---|---|
| Gauge `overall` + banda | `scores` → `computeOverall` (Envolvimento 60% + Frequência 40%) | `score-utils` puros | Determinístico. |
| Título + parágrafo do veredicto editorial | `aiVerdict = enriched.aiInsightsV2?.editorialVerdict` resolvido por `deriveEditorialVerdict` com `buildFallbackVerdict` | `ai_insights_v2.editorial_verdict` se válido; senão fallback determinístico (`identity.fallback.*` keys i18n) | **IA com guard**; fallback determinístico. |
| Strengths/Limitations (3 frases curtas) | IA quando `resolution.source !== "fallback"`; senão `deriveSignals(...)` | Mesma origem | IA ou determinístico. |
| Bloco de "Sinais usados nesta leitura" | só renderiza se `resolved.evidence_used.length >= 2` (vem da IA) | `ai_insights_v2.editorial_verdict.evidence_used` | Só IA. |
| Avisos (`low_sample`, `stale_data`, …) | `resolved.warnings` (IA) ou `postsAnalyzed < 5` | IA / determinístico | Misto. |
| Strip de métricas (likes/comments/freq) | `averageLikes`, `averageComments`, `postingFrequencyWeekly` | `postAverages` (sample Block 1) + cadence | Apify, determinístico. |

---

### 3. Tabela de regras determinísticas

#### Free card (`free-initial-reading-card.tsx`)

| Regra | Condição |
|---|---|
| `benchmarkAvailable` | `engagementBenchmark > 0`. |
| `engagementDefined` | `engagementRate > 0 && benchmarkAvailable`. |
| `cadenceDefined` | `cadenceSufficient === true && postingFrequencyWeekly > 0`. |
| `formatDefined` | `dominantFormat` string não vazia e `dominantFormatShare > 0`. |
| `engagementOk` | `engagementDefined && engagementRate >= engagementBenchmark`. |
| `cadenceOk` | `cadenceDefined && postingFrequencyWeekly >= 3`. |
| `formatOverdependent` | `dominantFormatShare >= 70`. |
| `formatDiversified` | `dominantFormatShare > 0 && dominantFormatShare < 60`. |
| Verdict | só atribuído quando `cadenceDefined && engagementDefined`; 4 combinações; caso contrário "Leitura preliminar do perfil". |
| Positives | inclui hashtags recorrentes se ≥1 hashtag com `uses ≥ 2`. |
| Limits | "Sem hashtags recorrentes identificáveis" se `hasRecurringHashtags === false` (mesmo quando a amostra é pequena — ver §6). |
| Fallbacks | `cadenceDefined === false` → texto "cadência ainda pouco clara"; sem benchmark → mostra só a taxa de envolvimento sem comparação; positives e limits podem ficar vazios → exibe `emptyLabel`. |

#### Pro card fallback (`editorial-verdict-fallback.ts`)

| Chave | Condição (ordem de avaliação) | Banda |
|---|---|---|
| `opportunity` (band `limited_data`) | `postsAnalyzed < 4`. | limited_data |
| `attention_no_conversation` | `engRatio >= 0.9 && avgComments < 2`. | promising |
| `solid_consistent` | `engRatio >= 1 && ppw >= 2.5`. | strong |
| `irregular_reach` | `engRatio >= 1 && ppw < 1`. | promising |
| `cadence_no_signal` | `ppw >= 2.5 && engRatio < 0.7`. | needs_work |
| `no_direction` | `engRatio < 0.7 && avgComments < 2`. | needs_work |
| `opportunity` | default. | promising |

Qualifiers determinísticos anexados ao parágrafo:
- Cadence label PT (frase humana) ou sufixo por método (`window_30d`, …).
- Hashtags: `recurring` → cita até 2 tags; `weak`/`absent` → frases neutras.

#### Pro card guard (`editorial-verdict.ts`)

- Cadência saudável + IA "publicar mais" → `cadence_contradiction`.
- Cadência não fiável (`reliability === "low"` ou `cadenceSufficient === false`) + IA fala em "ritmo consistente" → `cadence_contradiction`.
- Eng acima do benchmark + IA "ninguém reage" → `engagement_contradiction` (e vice-versa).
- Menção a concorrentes com `competitorsCount === 0` → `phantom_competitors`.
- Verbos prescritivos no parágrafo → `prescriptive_language`.
- `postsAnalyzed < 4` + claim forte → `low_sample_strong_claim`.
- 0 contradições → IA passa; 1 → preserva estrutura mas substitui parágrafo pelo fallback e força `confidence: "low"`; ≥ 2 → descarta IA e devolve fallback.

---

### 4. Verdict de dependência de IA

| Cartão | Acede a IA? | Como? |
|---|---|---|
| `FreeInitialReadingCard` | **Não.** | Não importa `aiInsightsV2`, `visual_cover`, `caption_semantic`, `comment_intelligence`, `market_signals_*`. Só consome `keyMetrics`, `enriched.cadence`, `result.data.topHashtags`. |
| `EditorialIdentityCard` | **Sim, opcional.** | Lê `enriched.aiInsightsV2?.editorialVerdict`. Passa por `deriveEditorialVerdict` (guard) — pode reduzir para `ai_downgraded` (parágrafo IA → fallback) ou descartar (`fallback`). Quando `ai_insights_v2` está ausente (Free, ou IA falhou), cai 100% no determinístico. |

**Conclusão crítica**: a sanitização (`sanitizeSnapshotForAccessLevel`) garante que para `accessLevel === "free"` o campo `ai_insights_v2` é eliminado antes do payload sair do servidor. Isto significa que:
1. Em `mode="free_with_engagement"`, o componente renderizado nem sequer é o `EditorialIdentityCard` — o cartão Free fica isolado por construção do componente.
2. Mesmo no caso teórico em que algum caller use `mode="free"` (que renderiza `EditorialIdentityCard`), o `aiVerdict` chega como `null` e o componente cai no fallback determinístico.

→ **Free card é AI-free com dupla salvaguarda (componente + sanitização).**

---

### 5. Diferenças Free vs Pro

| Eixo | Free (`FreeInitialReadingCard`) | Pro (`EditorialIdentityCard`) |
|---|---|---|
| Veredicto | 1 de 5 frases pré-definidas, baseado em 2 regras booleanas. | Frase IA (validada) ou 1 de 7 chaves de fallback (`solid_consistent`, `attention_no_conversation`, …). |
| Parágrafo | Template determinístico ("Este perfil publica X/sem com Y%, acima/abaixo do benchmark Z%."). | Frase i18n do fallback + qualifiers (cadence label PT, hashtags state) **ou** parágrafo IA com guard. |
| Métricas visíveis | 3: Cadência, Envolvimento, Formato dominante. | 3: Likes médios, Comentários médios, Frequência semanal (linha separada). Sem benchmark visível inline. |
| Sinais "O que funciona" / "O que limita" | 2 listas dinâmicas de 0-4 itens determinísticos. | 2 listas de exatamente 2 itens (preenchidas até 2 com fallback). |
| Evidence chips | — | "Sinais usados nesta leitura" só quando IA passou e devolveu ≥ 2 evidências. |
| Warnings | Nenhum. | `low_sample`, `stale_data`, `cadence_uncertain`, `no_market_signals`, `no_benchmark`. |
| Gauge / overall index | — | Sim, com banda visual. |
| Bandas / cores | Apenas accent neutro + amber para "limita". | Banda completa (warning / developing / solid). |
| Ler hashtags | Apenas `hasRecurringHashtags` (booleano). | `hashtagsState` (`recurring`/`weak`/`absent`) + `topHashtags` (cita tags). |

---

### 6. Análise de risco de copy (foco Free, depois Pro)

#### Free — afirmações totalmente suportadas pelos dados

- "Este perfil publica em média X vezes por semana" — `keyMetrics.postingFrequencyWeekly` é cálculo directo de `cadence.weekly` (l. 1260 do adapter).
- "Taxa de envolvimento de X%, acima/abaixo do benchmark de Y%" — direto, com gate `engagementBenchmark > 0`.
- "Formato dominante é X (Y%)" — vem de `format_stats`.
- Métricas individuais na grelha (com hifen "—" quando indefinido). ✅

#### Free — afirmações inferidas (suportadas, mas com nuances)

- **"Perfil consistente, envolvimento alinhado"** / **"Cadência forte, sinal fraco"** / **"Boa resposta, ritmo irregular"** / **"Perfil pouco activo, envolvimento baixo"** — são juízos qualitativos baseados em **dois cortes binários** (`postingFrequencyWeekly >= 3`, `engagementRate >= engagementBenchmark`). Riscos:
  - `>= 3 / sem` é um corte arbitrário para "consistente" — um perfil B2B em 1×/sem pode ser saudável.
  - "Envolvimento alinhado" usa estritamente `>=` benchmark — um perfil 1pp abaixo é classificado como "fraco" / "limita".
- **"Sem hashtags recorrentes identificáveis"** quando `hasRecurringHashtags === false` — pode soar negativo num perfil onde simplesmente não há sinal suficiente. O Pro distingue `weak` vs `absent`; o Free agrupa tudo num único negativo.
- **"Ritmo irregular ou pouco frequente"** — quando `cadenceSufficient === true && postingFrequencyWeekly < 3`, é apenas "abaixo de 3/sem", não necessariamente "irregular".
- **"Dependência excessiva de um formato"** — corte `≥ 70%`; razoável mas absoluto.

#### Free — afirmações que merecem **softening**

| Frase atual | Problema | Sugestão (sem implementar) |
|---|---|---|
| "Ritmo irregular ou pouco frequente" | mistura dois conceitos (cadência + frequência) num único bullet quando `cadenceDefined && !cadenceOk`. | "Frequência abaixo do habitual nesta amostra (< 3/sem)". |
| "Sem hashtags recorrentes identificáveis" | implica problema quando pode ser falta de sinal. | "Sem assinatura de hashtags clara nesta amostra" — alinhado com `hashtags_state = "weak"/"absent"` do Pro. |
| "Mistura equilibrada de formatos" como positivo | corte `< 60%` é low-bar; sem comparação com a categoria. | Adicionar "para o tamanho da amostra" ou só mostrar quando a amostra ≥ 8 posts. |
| Verdict "Perfil pouco activo, envolvimento baixo" | duplo-negativo categórico. | "Cadência e envolvimento abaixo do esperado nesta amostra" — diagnóstico, não rótulo. |
| Parágrafo "acima/abaixo do benchmark" | binário; ignora magnitude. | Quando `|delta| < 10%` dizer "em linha com" em vez de "acima/abaixo". |

#### Frases que **só deveriam aparecer no Pro** (não aplicável — o Free já evita todas)

- Veredictos com nuance editorial (e.g. "atenção sem conversa"): só no Pro via fallback `attention_no_conversation`. ✅
- Comparação com concorrentes: nenhuma menciona — guard `phantom_competitors` impede a IA. ✅
- Citação literal de hashtags: só Pro (qualifier `hashtagsState === "recurring"`). ✅
- Evidence chips, warnings tipo `stale_data`: só Pro. ✅

#### Pro — riscos residuais

- Guard depende de regex pt-PT — uma IA que use sinónimos não cobertos pode escapar (e.g. "publicar com maior regularidade" passa o `RE_CADENCE_WEAK`? — a regex cobre "publicar mais"/"publicar com mais frequência", o que cobre essa variante; outras pode não cobrir).
- `pickHashtagsForVerdict` (limite 2) — citar `#vida` e `#diadia` pode parecer fraco editorialmente; faltaria filtro de "qualidade".
- Sample-override no adapter (l. 1170) muda `engagementRate` depois do `buildKeyMetrics` — é correto, mas significa que o `engagementDeltaPct` recalculado pode divergir 1-2pp do que estava em `content_summary` legado.

---

### 7. Refinamentos recomendados (não implementar nesta task)

**Free card (ordem de impacto):**
1. Tornar o verdict tri-estado em vez de bi-binário: introduzir banda "em linha" quando `|engagementRate − benchmark| / benchmark < 10%`. Evita rotular "alinhado" / "fraco" por 0,1pp.
2. Substituir "Sem hashtags recorrentes identificáveis" por "Sem assinatura de hashtags clara nesta amostra" — alinhado com `hashtags_state` do Pro e menos acusatório.
3. Encurtar limit "Ritmo irregular ou pouco frequente" para "Frequência abaixo de 3 posts/sem".
4. Suprimir o bullet "Mistura equilibrada de formatos" quando `postsAnalyzed < 8` (amostra pequena → corte arbitrário).
5. Mostrar "Leitura preliminar do perfil" (verdict atual de fallback) sempre que `postsAnalyzed < 4`, mesmo que `cadenceDefined && engagementDefined` — o Pro tem este guard via `pickKey` (chave `opportunity`), o Free não.
6. Adicionar `postsAnalyzed`/`windowDays` como prop para poder mostrar microcopy "com base em N publicações dos últimos D dias" em rodapé do cartão (transparência), como o Pro tem na `MethodologyLine` adjacente.

**Pro card:**
7. Adicionar regex de cadência fraca em sinónimos ("postar com maior regularidade", "manter constância").
8. Filtro de qualidade em `pickHashtagsForVerdict` (excluir hashtags genéricas curtas, e.g. `#vida`).

**Cross-cutting:**
9. Documentar em comentário no `free-initial-reading-card.tsx` a lista exacta de campos lidos (`keyMetrics.*`, `enriched.cadence.*`, `result.data.topHashtags`) para enforçar a regra AI-free em revisões futuras.

---

### 8. Sem implementação

Esta auditoria é puramente exploratória. Nenhuma alteração de código é proposta dentro deste plano — todas as recomendações ficam para tasks separadas, sob aprovação explícita.
