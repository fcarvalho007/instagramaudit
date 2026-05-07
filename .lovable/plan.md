
# Refinar o Resumo Executivo (EditorialIdentityCard) para o mockup

O componente `EditorialIdentityCard` já existe e é renderizado na secção Overview do `ReportShellV2`. O layout base está correto (editorial left + score ring right + 2 mini-cards), mas vários detalhes visuais e de dados divergem do mockup.

---

## Diferenças identificadas vs. mockup

| Aspeto | Mockup | Atual |
|---|---|---|
| Título | "Perfil com **bom potencial** de crescimento" — frase-chave em bold | `splitSentence` simples, sem destaques bold |
| Descrição | Parágrafo descritivo: "Engagement acima do benchmark do tier, cadência de publicação consistente. Maior oportunidade: **aumentar a conversa pública** e diversificar formatos além de Reels." | Apenas `supporting` (2ª frase) ou nada |
| Score ring | ~120px, número grande e legível | 88px, mais pequeno |
| Rótulo "Comentários" | "Comentários" no card de weakness | "Conversa pública" |
| Subtítulos mini-cards | "↗ 5,52% · +8% vs benchmark" e "↘ 0,8% · abaixo da média" — com setas direcionais e comparação benchmark | Subtítulos técnicos do `score-utils` (ex: "5,52% vs 5,12%") |
| Bordas laterais coloridas | Cards com borda esquerda colorida (verde/rosa) | Fundo tinted sem borda lateral |

---

## Alterações planeadas

### 1. `editorial-identity-card.tsx` — Layout e visual

- **Score ring**: Aumentar `size` de 88 para 120 (ou 110) para corresponder ao mockup
- **Título com bold highlight**: Substituir `splitSentence` por `splitHeadlineWithEmphasis` que deteta `**texto**` (markdown bold) no texto AI ou no fallback, renderizando `<strong>` inline
- **Descrição longa**: Adicionar suporte a um parágrafo descritivo completo abaixo do título (o AI insight ou fallback deve fornecer headline + descrição separados)
- **Mini-cards**: Adicionar borda esquerda colorida (border-l-3 verde/rosa) e setas direcionais (↗/↘) nos subtítulos
- **Rótulos**: Mudar `interaccao` de "Conversa pública" para "Comentários" no mapa `SCORE_LABELS`

### 2. `score-utils.ts` — Subtítulos com benchmark

- `envolvimentoSubtitle`: Reformatar para "↗ X,XX% · +Y% vs benchmark" quando acima, "↘ X,XX% · -Y% abaixo" quando abaixo
- `interaccaoSubtitle`: Reformatar para "↘ X,X% · abaixo da média" ou "↗ X,X% · acima da média"

### 3. `buildFallbackSentence` — Frases com destaques

- As frases de fallback passam a incluir markdown bold (`**keyword**`) para a keyword principal
- Exemplo: "Perfil com **bom potencial** de crescimento"
- Adicionar um segundo campo `description` com o parágrafo explicativo

### 4. Dados corretos

- Garantir que o engagement rate mostrado no mini-card corresponde ao `engagementRate` real dos `keyMetrics`
- Garantir que o "Comentários" mostra a taxa de comentários (comment-to-follower ou avg comments) com comparação à média do tier

---

## Ficheiros a alterar

1. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`
2. `src/components/report-redesign/v2/overview/score-utils.ts`
3. `src/components/report-redesign/v2/report-overview-block.tsx` (se necessário passar props adicionais)

## Ficheiros que NÃO são tocados

- Rotas públicas, report design locked, PDF pipeline, Supabase schema

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirmar visualmente que o card reproduz o mockup
- Confirmar que os valores numéricos batem com os `keyMetrics` reais
