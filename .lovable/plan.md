## Problema

O widget de feedback (`BlockFeedback` — "Como foi até aqui?" + 5 emojis) aparece sempre depois do Bloco 1 (Visão Geral), mesmo quando o relatório ainda está gated. O pedido anterior era esconder os emojis até o utilizador subscrever o lead magnet (unlock).

## Causa

`src/components/report-redesign/v2/report-shell-v2.tsx` linhas 215-223 renderizam `<BlockFeedback>` com guard apenas em `features.blockOverview !== "hidden"`, sem verificar o estado `gated`/`unlocked`.

## Correção

Adicionar `!gated` ao guard:

```tsx
{features.blockOverview !== "hidden" && !gated && (
  <div className="mt-6 md:mt-8 mb-2">
    <BlockFeedback ... />
  </div>
)}
```

Semântica de `gated` (linha 125): `lockBoundary === "engagement" && !unlocked` — ou seja, `!gated` cobre os dois casos legítimos para mostrar feedback:
1. Não há gate (ex.: `/report.example`)
2. Há gate mas o utilizador já fez unlock (subscreveu lead magnet)

## Escopo

1 ficheiro, 1 linha. Sem mudanças de lógica de unlock, sem mudanças no `BlockFeedback`, sem mudanças no servidor.

## Validação

- Visual: relatório gated não mostra emojis; relatório unlocked mostra emojis.
- `bunx tsc --noEmit`