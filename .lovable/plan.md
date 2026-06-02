## Block 1: empilhar verticalmente Frequência + Formato

### Ficheiros
- `src/components/report-redesign/v2/report-overview-block.tsx` (não locked)

### Alteração
Na Zona D, substituir o grid 2-colunas por um stack vertical:

```diff
- <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
+ <div className="space-y-6 md:space-y-8">
    <FrequencyCard ... />
    <FormatCard ... />
  </div>
```

### Resultado
- Desktop/tablet/mobile: 1 cartão por linha, full content width
- Ordem: Frequência primeiro, Formato segundo (já é a ordem atual no JSX)
- Espaçamento vertical consistente com o restante Block 1 (`space-y-8 md:space-y-10` do wrapper)
- Sem alteração a dados, fórmulas, lógica de cadência, lógica de formatos, thumbnails, gating, backend

### Sem refinamentos internos nos cards
Os componentes `FrequencyCard` e `FormatCard` já são responsivos a 100% width. Não toco no interior — o ganho de largura permite naturalmente que o calendário e a grelha de thumbnails respirem. Se o owner depois quiser reduzir densidade do grid de thumbnails, é um prompt à parte.

### Validação
- `bunx tsc --noEmit`
- Screenshots desktop 1440, tablet, mobile