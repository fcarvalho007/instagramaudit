# Lote G — Turn 2: Localização dos blocos editoriais grandes

## Objetivo

Concluir a tradução PT/EN do report v2, cobrindo os ficheiros com copy editorial extensa que ficaram fora do Turn 1 (que tratou veredicto, prioridades, CTA, cards de síntese, premium callout/dialog).

## Âmbito (6 ficheiros)

1. `report-diagnostic-block.tsx` (530 linhas) — perguntas verbatim, blocos editoriais grandes
2. `caption-diagnostics-card.tsx` (1171 linhas) — diagnóstico de legendas
3. `hashtag-diagnostics-card.tsx` (307 linhas) — diagnóstico de hashtags
4. `report-themes-feature.tsx` (218 linhas) — temas dominantes
5. `visual-cover-analysis-card.tsx` (477 linhas) — análise de capas
6. `report-comment-intelligence.tsx` (531 linhas) — inteligência de comentários

## Abordagem

Para cada ficheiro:
- Importar `useTranslation` do `react-i18next` com namespace `report`.
- Substituir strings hardcoded (títulos, eyebrows, perguntas-guia, labels, fallbacks, tooltips, botões, vazios) por chamadas `t("caption.title")`, `t("hashtag.empty")`, etc.
- Manter o `key` namespacing por componente: `caption.*`, `hashtag.*`, `themes.*`, `cover.*`, `comments.*`, `diagnostic.questions.*`.
- Preservar interpolações com `{{var}}` (handle, contagens, percentagens). Para singular/plural usar a sintaxe `count` do i18next.
- Strings derivadas de dados (ex.: nomes de temas vindos do payload) **não** se traduzem; apenas a moldura editorial.

## Chaves adicionadas em `src/i18n/locales/{pt,en}/report.json`

```text
diagnostic.questions.*    — perguntas-guia e copy editorial de report-diagnostic-block
caption.*                 — eyebrow, título, perguntas, métricas, vazios, tooltips
hashtag.*                 — eyebrow, título, métricas, labels, vazios
themes.*                  — eyebrow, título, descrição, labels, vazios
cover.*                   — eyebrow, título, métricas, perguntas, vazios
comments.*                — eyebrow, título, segmentos, perguntas, vazios
```

PT em pt-PT (Acordo Ortográfico pós-1990, sem pt-BR). EN em inglês neutro.

## Não está no âmbito

- Não alteramos lógica, dados, layout, design tokens ou tamanhos.
- Não tocamos em `report-overview-block` nem nos componentes já localizados no Turn 1.
- Não geramos novas chaves de gateway/auth/footer.

## Checkpoint

☐ Os 6 ficheiros usam `useTranslation("report")` e não têm strings PT hardcoded visíveis ao utilizador.
☐ `report.json` PT e EN têm as mesmas chaves (paridade).
☐ Build limpo; preview do report renderiza em PT por defeito e troca para EN via switcher do footer.
☐ Interpolações (handle, números) formatadas corretamente em ambos os idiomas.
