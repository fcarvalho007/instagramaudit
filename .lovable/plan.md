## Objectivo
Reformular o cartão do upsell "Diagnóstico de Autoridade Digital" (passo 3 do checkout) para o layout de duas zonas: **capa navy** (eyebrow + título + preço) + **corpo branco** (bullets + CTA), como na referência enviada. Apenas alterações visuais.

## Ficheiro
`src/components/checkout/human-diagnosis-upsell.tsx` (único)

## Estado actual
Cartão totalmente branco, eyebrow em chip azul claro, título serif, preço, bullets e botão empilhados sem divisão.

## Mudança proposta

Estrutura nova do cartão:

```
┌──────────────────────────────────────┐
│  [bg: content-primary navy]          │
│  ADICIONAR DIAGNÓSTICO HUMANO        │ ← eyebrow accent-luminous
│  Diagnóstico de Autoridade Digital   │ ← Fraunces, text-inverse
│  97€  149€  total · em vez de 9€     │ ← Fraunces grande + risco + meta
├──────────────────────────────────────┤
│  [bg: white]                         │
│  ✓ Relatório completo incluído       │
│  ✓ Chamada de 30 min com um humano   │
│  ✓ 3 prioridades de melhoria claras  │
│  ✓ Orientação para conteúdo …        │
│  [ Sim, quero o diagnóstico humano ] │ ← Button variant="primary"
└──────────────────────────────────────┘
   Continuar só com o relatório de 9€    ← link subtil por baixo
```

### Detalhes visuais

**Capa (navy)**
- `bg-[rgb(var(--text-primary))]` (#0F1B3D — navy do tema global, equivalente prático ao #0B1020 pedido; não há token mais escuro definido)
- Padding: `px-5 py-5 sm:px-6 sm:py-6`
- Eyebrow: `text-eyebrow-sm text-[rgb(var(--accent-luminous))]` (cyan/azul luminoso, sem chip — o fundo navy já isola)
- Título: `font-fraunces text-2xl sm:text-[28px] font-medium text-[rgb(var(--text-inverse))]`
- Preço: `font-fraunces text-5xl font-semibold text-[rgb(var(--text-inverse))] tabular-nums leading-none`
- Preço riscado: `font-fraunces text-xl text-[rgb(var(--text-inverse))]/50 line-through tabular-nums`
- Meta "total · em vez de 9€": `text-xs text-[rgb(var(--accent-luminous))]`

**Corpo (branco)**
- `bg-white px-5 py-5 sm:px-6 sm:py-6`
- Check icon: `text-accent-primary` (mantém)
- Bullets: `text-sm text-content-secondary` (mantém)
- Botão `variant="primary"` full-width (mantém)

**Container**
- `overflow-hidden rounded-2xl border border-border-default shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]`
- Remove o padding do container raiz — passa para cada zona — para a divisão chegar borda a borda.

**Saída**
- Link "Continuar só com o relatório de 9€" mantém-se como está (subtil, underline on hover).

### Copy
- "Sim, quero diagnóstico humano" → "Sim, quero o diagnóstico humano" (adiciona o artigo, mais natural em PT-PT, como na referência).
- Restante copy inalterada.

## Tokens usados (todos já existentes)
- `--text-primary` (#0F1B3D) — fundo navy da capa
- `--text-inverse` (#FAFBFC) — texto sobre navy
- `--accent-luminous` (#4F8CFF) — eyebrow e meta na capa
- `--accent-primary` (#3772E5) — checks e CTA (via Button primary)
- `--border-default`, `--content-secondary` — sem alteração

> Nota: o utilizador pediu #0B1020 (mais escuro) e cyan #00B4D8. Esses valores só existem na palette do *relatório* (`tokens-light.css`, scoped a `[data-theme="light"]`), não no tema global do checkout. Uso os equivalentes globais (`text-primary` navy + `accent-luminous`) para respeitar a regra "sem hardcode" e a identidade global. Se preferires o navy exacto da referência, abrimos um token novo `--surface-inverse-deep: 11 16 32` em `tokens.css` — diz e incluo no patch.

## Fora de âmbito
- Outros passos do checkout
- Order summary, progresso, footer
- Lógica de pagamento, preços, EuPago, schema, créditos
- Tradução / copy fora dos dois ajustes acima

## Validação manual
1. Cartão renderiza com capa navy + corpo branco, sem gradiente roxo.
2. Preço 97€ legível em branco; 149€ risca-se em opacidade reduzida.
3. Eyebrow e meta em azul luminoso, contraste suficiente sobre navy (AA).
4. Botão "Sim, quero o diagnóstico humano" mantém estilo primário azul.
5. Link "Continuar só com o relatório de 9€" continua visível e clicável.
6. Mobile 375px: capa e corpo empilhados, sem overflow do preço.
7. Nenhum hex hardcoded no componente.

## Output após build
- Ficheiros alterados: `src/components/checkout/human-diagnosis-upsell.tsx`
- Confirmação que nenhuma lógica de pagamento/preço foi tocada.