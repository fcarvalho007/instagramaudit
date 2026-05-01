
# Diagnóstico · Bloco 01 — Gráfico de benchmark sem expressão

## Problema identificado

O gráfico SVG em `ReportEngagementBenchmarkChart` é tecnicamente correcto (dados, barras, marcadores existem) mas **visualmente inexpressivo** por três razões:

1. **viewBox de 100×170 com fontes de 2.8px/3.2px** — o SVG é renderizado a ~100% width do card (≈800px desktop), mas os textos internos usam tamanhos absolutos do viewBox (2.8px, 3.2px), ficando microscopicamente pequenos em ecrãs reais. Invisíveis no screenshot.

2. **Barras muito estreitas** — `barW = barGap * 0.45` com 5 tiers numa viewBox de 100 unidades = cada barra ≈ 9px de largura. O marcador do perfil (rosa) usa metade disso = ≈4.5px. Quase imperceptível.

3. **Sem legenda, sem eixo Y, sem valor nas barras** — não há nenhuma anotação que permita ao leitor interpretar o gráfico sem conhecer o contexto. As únicas labels são os tier labels no eixo X (3.2px, ilegíveis) e duas anotações flutuantes (referência e perfil) igualmente pequenas.

4. **Sem contraste cromático forte** — barras inactivas em `#CBD5E1` a 40% opacity sobre fundo branco = quase invisíveis. A barra activa (#2563D9) e o marcador (#E11D48) são as únicas cores fortes, mas por serem tão estreitas, perdem-se.

## Plano de refinamento

### Ficheiro: `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

1. **Redimensionar o viewBox** para 400×200 (ou similar 4:1) para dar espaço real aos textos e barras.

2. **Aumentar fontes SVG** para 9-11px no viewBox (renderizam proporcionalmente ao container). Tier labels, referência e perfil devem ser legíveis de imediato.

3. **Alargar barras** — `barW` para ~60% do gap; barra activa ~75%. O marcador do perfil deve ser uma barra visível, não um traço.

4. **Adicionar valores sobre as barras** — cada tier mostra o seu ER% no topo. O tier activo e o perfil mostram com destaque.

5. **Aumentar opacidade das barras inactivas** de 0.4 para 0.55-0.65 — presentes mas claramente secundárias.

6. **Eixo Y implícito** — adicionar 2-3 labels discretas no lado esquerdo (0%, metade, topo) para dar escala.

7. **Manter a linha de referência tracejada** mas aumentar `strokeWidth` para 0.6 e a label para tamanho legível.

8. **Mobile** — viewBox escala naturalmente com `w-full`; verificar que labels não sobrepõem a 375px.

### Ficheiros tocados

| Ficheiro | Acção |
|----------|-------|
| `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` | Rewrite do SVG layout |

Nenhum ficheiro locked será alterado. Nenhuma lógica de dados, schema, providers, PDF ou blocos não relacionados será tocada.
