# Card Review 02 — Conversas (Comment Intelligence)

Reescrita de apresentação da secção Conversas para (1) nunca afirmar o que não é medido e (2) entregar recompensa imediata após o email. Sem tocar em aquisição, providers, agregação, custos, gates ou lógica A/B/C.

## Âmbito

Apenas `src/components/report-redesign/v2/report-comment-intelligence.tsx` (secção, indisponível e subcomponentes locais), chaves i18n de `comments.*` em `src/i18n/locales/{pt,en}/report.json`, e novos testes.

## Correcções de verdade metodológica

1. **Amostra sem denominador fixo.** `TransparencyStrip` deixa de mostrar `samplePosts / 12`; passa a mostrar apenas valores observados ("5 publicações analisadas", "20 comentários públicos analisados"). Nenhum `/12` nem `/5` no código.
2. **Replies não mensuráveis.** Quando `repliesMeasurable === false`, remover da UI `ownerRepliesCount`, `ownerReplyRatePct`, `postsWithOwnerReplyPct` e o `topConversationPost` (depende de owner replies). Em vez de zeros, uma linha neutra: "Respostas da marca — não mensurável nesta amostra".
3. **`classifyBrandReply`.** Passa a receber `repliesMeasurable` primeiro e devolve novo estado `not_measurable` (tom neutro, sem veredicto sobre comportamento da marca). `absent`/`minimal`/`occasional` só existem com replies mensuráveis.
4. **`lowConfidence`.** Nota discreta "Amostra limitada" com copy curta, tom neutro (sem vermelho), sem esconder resultados nem mexer em thresholds.
5. **Copy.** Rever `comments.*` para não falar de threads/conversas completas/resposta da marca quando só há comentários top-level.

## Nova hierarquia

```text
CONVERSAS  ·  O que revelam as conversas?
1. Veredicto / sinal principal (InsightCallout reutilizado)
2. Voz da audiência (excertos reais)
3. Sinais observados (signalChips, só counts > 0)
4. Próxima acção (recommendedConversationAction)
5. Métricas de suporte (apenas mensuráveis)
6. Amostra e metodologia (TransparencyStrip + limitações, secundária)
```

Cabeçalho ganha autonomia: eyebrow `CONVERSAS`, título "O que revelam as conversas?", apoio de uma linha, reutilizando `ReportCardSectionHeader` (sem nova linguagem visual). Sem repetir "Grátis com email".

## Estado indisponível

`CommentIntelligenceUnavailable` no `public_mvp` perde o tratamento dourado/Pro. Três estados neutros:
- processing: spinner + "Estamos a analisar as conversas…";
- sem comentários suficientes: mensagem neutra;
- falha temporária: "não foi possível concluir esta parte da análise neste momento".

Sem menções a Pro, 9 €, dourado ou detalhe técnico de provider. `internal_lab` mantém o detalhe actual.

## Densidade e mobile

Grelha de métricas adapta-se ao número de células válidas (2 colunas em mobile, sem células vazias). Excertos em coluna única a 375/390. Metodologia comprimida no fim.

## Testes

Novo `src/components/report-redesign/v2/__tests__/comment-intelligence-truth.test.ts(x)`:
- replies mensuráveis → métricas de resposta aparecem;
- `repliesMeasurable=false` → sem "0%", sem owner replies, sem classificação absent/minimal, com nota neutra;
- `lowConfidence` → aviso de amostra limitada;
- ausência de `/12` no ficheiro-fonte;
- estado indisponível público sem "Pro"/"9 €"/dourado;
- B e C renderizam a mesma composição.

## Entrega

Screenshots antes/depois em desktop e 390 px, mais cenários `repliesMeasurable=false`, `repliesMeasurable=true`, `lowConfidence` e processing/unavailable; lista da ordem dos sub-blocos antes/depois e das métricas ocultadas.

## Card review later

- `sampleComments` mistura top-level e replies no mesmo total — merece separação de conceito na agregação (fora de âmbito).
- `limitations` filtradas por substring de copy em português — frágil, deveria vir com códigos estáveis.
- Chips de intenção de compra usam `accent-primary` por falta de token próprio.
