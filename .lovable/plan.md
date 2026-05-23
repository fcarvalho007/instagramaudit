## Diagnóstico

O report usa `max-w-[1380px]` em três pontos (`report-shell-v2.tsx` ×2 e `report-hero-v2.tsx`). No viewport atual (1460px CSS) sobram ~80px de cada lado, e em ecrãs maiores (1536/1920) a sensação de "moldura cinzenta larga" intensifica-se — daí o handle `@frederico.m.car…` aparecer truncado no print: o card respira pouco para a coluna direita de ações ocupar 320px.

## Proposta

Alargar o container para acompanhar o padrão Iconosquare/dashboards modernos, mantendo respiração lateral em ecrãs muito grandes.

| Local | Antes | Depois |
|---|---|---|
| `report-hero-v2.tsx` (linha 53) | `max-w-[1380px]` | `max-w-[1520px]` |
| `report-shell-v2.tsx` (linha 156, topbar) | `max-w-[1380px] px-5 md:px-6` | `max-w-[1520px] px-5 md:px-6 lg:px-8` |
| `report-shell-v2.tsx` (linha 468, conteúdo) | `max-w-[1380px] px-5 md:px-6` | `max-w-[1520px] px-5 md:px-6 lg:px-8` |

Ganhos:
- +140px úteis → o handle deixa de truncar e a `MetricLine` (seguidores · publicações · posts) fica numa só linha confortável a 1440px+.
- `lg:px-8` (32px) em vez de 24px mantém um "ar" editorial nos bordos sem voltar a parecer apertado.
- Abaixo de `lg` nada muda — mobile/tablet ficam idênticos.

## Fora do âmbito

- Não mexer no `report-hero-v2` para além da largura do wrapper.
- Não tocar em cards internos, grids do bloco 1, nem na coluna de ações (320px continua adequada com mais espaço lateral).
- Sem alterações de tokens, tipografia ou cores.

## Checkpoint

- ☐ Trocar `1380px` → `1520px` nos 3 locais
- ☐ Adicionar `lg:px-8` nos dois containers do shell
- ☐ Verificar no preview (1460px) que o handle do hero deixa de ser cortado
