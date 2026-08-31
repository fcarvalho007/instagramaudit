# Auditoria de corte Free / Email / Pro — resultado read-only

Nada foi alterado. Abaixo: composição actual, alteração mínima e riscos.

## A. Árvore actual do Overview

`ReportOverviewBlock` tem 4 modos (`all`, `free`, `free_with_engagement`, `locked`). O percurso público usa `free_with_engagement` (rota passa `lockBoundary="engagement"`).

```text
free_with_engagement (Estado A e B hoje)
├─ MethodologyLine
├─ EditorialIdentityCard
├─ #engagement → EngagementCardRefined
└─ showPremiumTeasers
   ├─ true  → 5 × PremiumTeaserCard (03 frequencia, 04 formatos,
   │           05 publicacoes-chave, 06 diagnostico-editorial, 07 prioridades)
   └─ false → FreeDeepenTeaser (CTA email)

all | locked (Estado C / admin)
├─ [ComparisonHero + LeituraIa]        (só com concorrente)
├─ EditorialIdentityCard + MethodologyLine (só sem concorrente)
├─ CompetitorBioCompare                (só com concorrente)
├─ #engagement → CompetitorEngagementCompare | EngagementCardRefined
├─ div space-y
│  ├─ #frequencia → CompetitorCadence+Weekday | FrequencyCard
│  └─ #formatos   → CompetitorFormatCompare  | FormatCard
├─ #publicacoes-chave → PostComparisonBlock (+ LeituraIaBox)
├─ CompetitorTopPostCompare
└─ CompetitorEditorialDiagnostic
```

Shell (`report-shell-v2.tsx`): Overview → `#conversas` (só `leadCaptured && !premiumUnlocked`) → blocos 02–06 (só `premiumUnlocked`) → `#lead-magnet-card` (só estado B).

## B. Árvore pretendida

```text
A  Identidade → Engagement → Frequência → PostComparison (preview) → CTA email  [fim]
B  A completo + PostComparison completo + Formato + Conversas → CTA Pro 9€
C  B completo + Diagnóstico Editorial + Prioridades (+ camada de concorrentes)
```

## C. Alteração mínima necessária

| Ficheiro | Mudança | Risco |
|---|---|---|
| `report-overview-block.tsx` | Em `free_with_engagement`, render real de `FrequencyCard` a seguir ao Engagement; `PostComparisonBlock` completo ou `PostComparisonPreview` conforme estado; `FormatCard` só quando `leadCaptured`; remover os 5 teasers do estado A | MEDIUM — é o ficheiro com mais ramos |
| `report-overview-block.tsx` (props) | Substituir `showPremiumTeasers: boolean` por `access: "anon" | "lead" | "pro"` (3 valores, sem modelo genérico) | LOW |
| `report-post-comparison.tsx` | Exportar `PostComparisonPreview` no mesmo ficheiro, reutilizando os mesmos props e helpers; zero cálculo novo | LOW |
| `report-shell-v2.tsx` | `leadCaptured && !premiumUnlocked` → `leadCaptured || premiumUnlocked` na secção `#conversas`; teasers Pro só em B | LOW, corrige bug |
| `block-config.ts` | Renumerar `COMMERCIAL_SECTIONS` para a nova ordem (frequência antes de publicações, formato depois) | LOW, anchors mantêm-se |
| `analysis-snapshot.$username.ts` | Passar a devolver `comment_intelligence` quando o lead está identificado (nível `lead`), não só em `pro` | MEDIUM — toca sanitização |

Reordenar Frequência → PostComparison → Formato é **puro rearranjo de composição**: os três recebem props independentes (`FrequencyCard` ← cadence/timeline, `FormatCard` ← `formatEntries`, `PostComparisonBlock` ← `enriched.topPosts/bottomPosts/scatter`), não partilham grid obrigatório (a `div` que envolve frequência+formatos é só `space-y`), não dependem de `mode` internamente e cada um já tem a sua âncora própria.

## D. Matriz do preview Melhor/Pior

| Campo | Estado A | Estado B/C |
|---|---|---|
| Título e subtítulo da secção | visível | visível |
| Thumbnails melhor/pior | visíveis (1+1) | visíveis (2+2) |
| Etiqueta “melhor” / “pior” | visível | visível |
| Formato e data | visível | visível |
| Legenda do post | truncada a 1 linha | completa |
| Engagement % e multiplicador | oculto | visível |
| Likes / comentários | oculto | visível |
| Scatter de distribuição | miniatura sem eixos nem valores | completo |
| Leitura IA / diagnóstico | oculto | visível |
| Comparação com concorrente | oculto | Pro |
| Recomendações | oculto | visível |

## E. Comment Intelligence

Não aparece no Estado C por a condição no shell ser `leadCaptured && !premiumUnlocked`; quem paga perde a secção. Correcção mínima: `leadCaptured || premiumUnlocked`. Segundo ponto: `sanitize-snapshot.ts` remove `comment_intelligence` para todo o `accessLevel === "free"`, o que inclui o lead do Estado B — é preciso um terceiro nível `lead` para o campo ser entregue. Os estados `pending/available/error` e o polling existentes mantêm-se; posição segura: imediatamente depois do Formato, antes do CTA Pro. Componente reutilizado, sem duplicação.

## F. Pro readiness

| Secção | Classificação | Motivo |
|---|---|---|
| Diagnóstico Editorial | PRO READY | `tier: "pro"`, renderiza no Pro real com dados do snapshot |
| Prioridades | PRO READY | Usado no Pro, copy final |
| Desempenho 03 | LAB ONLY | `tier: "lab"` e depende de `features.blockPerformance === "full"` |
| Conteúdo 04 | LAB ONLY | `tier: "lab"` |
| Procura 05 | LAB ONLY | `tier: "lab"`, depende de DataForSEO |
| Comparação 06 | NEEDS REVIEW | `tier: "lab"`, mas a camada de concorrentes já aparece no Pro por outra via |

## G. Riscos

- **Exposição de dados Premium**: `sanitize-snapshot.ts` não remove `posts`, pelo que likes/comentários por publicação já estão no browser no Estado A. Um preview só-CSS não é paywall. Recomendação: o `PostComparisonPreview` renderiza apenas o subconjunto seguro e, se se quiser paywall real, os campos analíticos por post passam a ser removidos no servidor para o nível anónimo.
- **Anchors**: `#frequencia`, `#formatos`, `#publicacoes-chave`, `#conversas` mantêm-se; só muda a ordem e a numeração — deep-links antigos continuam a funcionar.
- **Concorrentes**: o ramo `firstCompetitor` vive apenas em `all`/`locked`; a reordenação em `free_with_engagement` não lhe toca.
- **Regressões no Pro**: os testes `access-gating.test.ts` e `report-shell-composition.test.ts` fixam a matriz A/B/C e a numeração 01–08; ambos terão de ser actualizados em conjunto com a renumeração.

READY FOR REPORT REORDER IMPLEMENTATION
