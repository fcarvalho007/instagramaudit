# Editorial V2 — Fase G: 06 Diagnóstico editorial

Auditoria concluída. O diagnóstico Pro público pode ser renderizado a partir dos dados reais
já carregados e das saídas de diagnóstico já geradas em produção. Não é necessária nenhuma
chamada de IA, nova enrichment, novo scrape, novo loader nem qualquer dado fictício.

## Auditoria — arquitectura actual encontrada

Orquestrador: `report-diagnostic-block.tsx`. Ramo público Pro (`!isLab`) monta, por esta ordem:
veredicto → grupos A–E de cartões → placeholders de enrichment → prioridades (07, fora de âmbito).

| Elemento | Fonte real | Origem |
|---|---|---|
| Veredicto geral | `result.enriched.aiInsightsV2.sections.hero.text` | IA persistida |
| Veredicto fallback | `diagnostic.verdict_fallback` com labels de tipo de conteúdo, funil e audiência | regra determinística |
| 01 Tipo de conteúdo | `classifyContentType(posts)` | regra |
| 02 Funil | `classifyFunnelStage(posts)` | regra |
| 03 Hashtags | `classifyHashtags(topHashtags)` | regra |
| 04 Legendas | `buildCaptionIntelligence(...)` + `payload.caption_semantic_analysis` (schema 2, `source: "openai"`) | regra + IA persistida |
| 05 Resposta do público | `classifyAudienceResponse(posts)` + `commentIntelligence` (só com `features.commentIntelligence === "full"`) | regra + enrichment |
| 06 Integração de canais | `classifyChannelIntegration(bio, externalUrls, posts)` | regra |
| E Capas | `payload.visual_cover_analysis` | enrichment persistida |
| Estados pendente/erro | `getEnrichmentState(payload, "visual_cover" \| "caption_semantic" \| "insights_v2")` | metadados do snapshot |

Número de achados: **variável**. Cada cartão devolve `null` quando `available === false`;
não existe contagem fixa de três. A ordem é a do orquestrador e será preservada.

Gating de produção (reutilizado tal e qual, sem nova interpretação):
`premiumUnlocked && features.blockDiagnosis !== "hidden"` (`report-shell-v2.tsx`).
`internal_lab` mantém o seu próprio ramo e não é migrado.

## O que vai ser construído

Novos ficheiros em `src/components/report-editorial-v2/diagnosis/`:

- `diagnosis-data.ts` — adaptador puro que chama exactamente os mesmos classificadores e
  parsers de produção e devolve uma lista de "fios de diagnóstico" com: título, evidência
  factual (números reais dos classificadores), interpretação (texto já produzido em
  produção), origem (`Regra` / `IA`, só quando genuinamente conhecida) e estado de ciclo
  de vida. Sem novas fórmulas, sem novas escolhas de evidência, sem confiança inventada.
- `editorial-diagnosis.tsx` — apresentação Editorial V2: banda, intro `06 — Diagnóstico
  editorial` com título `O que os dados sugerem que merece atenção`, veredicto em
  tipografia Fraunces com semântica de Leitura, e depois cada fio no ritmo
  achado → `ObservationBlock` (facto) → `ReadingBlock` (interpretação) → metadados de
  origem discretos.

Alterações mínimas:

- `editorial-v2-shell.tsx` — montar a secção sob a mesma condição de produção; remover o
  placeholder de desenvolvimento relativo ao diagnóstico e manter um placeholder,
  claramente marcado como desenvolvimento, apenas para `07 — Prioridades de ação`.
- `section-metadata.ts` — nada renomeado; apenas uso do rótulo `06` já existente.

Nada é alterado em geração, prompts, regras, sanitização, ordenação, gating, custos, PDF,
Admin Preview ou Report Lab. Nenhum ficheiro bloqueado é tocado.

## Regras aplicadas

- Números só de dados reais do snapshot e derivações determinísticas de produção.
- Qualquer número dentro de prosa de IA cuja proveniência não seja verificável não é
  reproduzido; é reportado.
- Causalidade sempre em linguagem cautelosa; factos nunca dentro de `ReadingBlock` e
  interpretação nunca dentro de `ObservationBlock`.
- Estados verdadeiros: disponível, indisponível, enrichment pendente, enrichment falhada,
  saída parcial. Render nunca dispara geração.

## Decisão em aberto

Os fios 03 (hashtags), 04 (legendas) e E (capas) usam enrichment que também existe no
laboratório interno, mas hoje já são visíveis no Pro público. Proposta: migrar todos os
fios que o Pro público mostra hoje, para não reduzir o produto pago. Alternativa: migrar
nesta fase só os quatro fios puramente determinísticos (conteúdo, funil, audiência,
integração) e tratar os restantes numa fase seguinte.

## Validação

Testes focados de Editorial V2, testes de diagnóstico, gating/variantes e regressão de
visibilidade do laboratório, mais typecheck. QA visual real a 1440px, 820–900px e 375px
com um relatório Pro real com diagnóstico preenchido; se não existir nenhum, a aprovação
manual é interrompida e reportada em vez de simulada com fixtures.
