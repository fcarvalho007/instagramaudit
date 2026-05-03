
# Fix — Restaurar gráfico completo no card de Taxa de Envolvimento

## Problema

O card de envolvimento envolve o `ReportEngagementBenchmarkChart` num `div` com `max-h-[140px] overflow-hidden`, o que corta:
- Legenda (referência do escalão / este perfil / outros escalões)
- Referências de mercado numeradas com links
- Slot PRO

Além disso, foram adicionadas referências de fonte duplicadas abaixo do chart wrapper, e o badge perdeu "SOCIALINSIDER".

## Correções

1. **Remover `max-h-[140px] overflow-hidden`** do wrapper do chart — deixar o chart renderizar completamente
2. **Remover o bloco de source references duplicado** (linhas 77-91) que foi adicionado na iteração anterior — o chart já tem as suas próprias referências integradas
3. **Restaurar o badge** de `◈ MERCADO` para `◈ MERCADO · SOCIALINSIDER`

## Ficheiro afetado

- `src/components/report-redesign/v2/report-overview-engagement.tsx` — único ficheiro a editar
