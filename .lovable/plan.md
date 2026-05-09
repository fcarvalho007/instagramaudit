## Avaliação: tudo já está implementado

Os 5 itens do pedido **já estão no código**. Verificação ficheiro a ficheiro:

| # | Pedido | Estado | Onde |
|---|---|---|---|
| 1 | Aviso "Sem visualização registada" no `FeedbackRequestDialog` quando `report_views === 0` | ✅ Presente | `lead-detail-sheet.tsx:1193` (`notViewed`) + bloco amber `1210–1234` com copy exato do brief |
| 2 | Botão desabilitado quando `lead.feedback` existe, tooltip "Feedback já recebido." | ✅ Presente | `lead-detail-sheet.tsx:1148` (`disabledReason = "Feedback já recebido."`) |
| 3 | Endpoint emite `feedback_requested` (não `feedback_request_sent`) | ✅ Presente | `send-feedback-request.ts:248` (`eventType: "feedback_requested"`) |
| 4 | `lead-lifecycle.ts` mapeia apenas `feedback_requested → feedback_pedido` | ✅ Presente | `lead-lifecycle.ts:114` (sem referência a `feedback_request_sent`) |
| 5 | Dialog code preview diz `feedback_requested` | ✅ Presente | `lead-detail-sheet.tsx:1248` |

`grep` global confirma **zero referências a `feedback_request_sent`** em todo o `src/`. Nada por fazer no contrato funcional.

---

## Único refinamento proposto (opcional, alinhamento com design system)

O bloco de aviso no `FeedbackRequestDialog` usa cores **hardcoded** (`rgba(234,179,8,...)` / `#D97706`), o que viola a regra de memória *"Design tokens in src/styles/tokens.css and src/styles/tokens-light.css — never hardcode colors/fonts in components"*. O sistema já expõe os tokens corretos:

- `--signal-warning: 186 117 23` (#BA7517 — amber subtil oficial)
- `--tint-warning: 250 244 232` (fundo amber para alertas)

### Mudança proposta

**Ficheiro único:** `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`

Substituir o bloco `notViewed` (linhas 1211–1233) por uma versão tokenizada:

- `backgroundColor: "rgb(var(--tint-warning))"` (em vez de `rgba(234,179,8,0.08)`)
- `borderColor: "rgb(var(--signal-warning) / 0.25)"` (em vez de `rgba(234,179,8,0.2)`)
- Texto título e ícone: `color: "rgb(var(--signal-warning))"` (em vez de `#D97706`)
- Manter ícone `AlertTriangle`, mesmo layout, mesmo copy literal

**Aplicar o mesmo tratamento ao `GenerateReportDialog`** (linhas 773–810 — mesmo padrão hardcoded amber) **só se** quisermos consistência num único passe. Caso contrário, fica fora deste plano para respeitar a regra "tocar apenas nos 3 ficheiros aprovados". **Recomendo deixar de fora** — risco zero do refactor escalar.

### Por que faz sentido

- Cumpre regra core de design tokens
- Fica alinhado com o subtle amber #BA7517 (regra de memória explícita: gold demoted to subtle amber)
- Continua "visible but not alarming" como o brief pede — `--signal-warning` é mais sóbrio que o `#D97706` atual

### Por que pode ser dispensado

- Funcionalmente idêntico
- O brief explicitamente pediu *"Use existing admin styling and semantic tokens **where possible**"* e *"Keep changes limited to the three approved files"* — fazer este refinamento mantém-se dentro dos 3 ficheiros (só toca `lead-detail-sheet.tsx`), portanto compatível
- Nenhum risco regressivo

---

## Validação prevista

- `bunx tsc --noEmit` — limpo (mudança puramente CSS via style inline)
- `bunx vitest run` — manter 156/156 (sem testes a tocar este componente)
- Smoke manual: abrir Lead Detail Sheet com lead em `link_enviado` + `report_views = 0`, confirmar aviso amber subtil; abrir lead com `feedback` presente, confirmar botão disabled + tooltip

---

## Sem mudanças necessárias

- `send-feedback-request.ts` — já correto
- `lead-lifecycle.ts` — já correto
- Schema, providers, PDF, public form, `/api/public/feedback.$requestId.ts` — não tocados

---

## Decisão pedida

Confirmas que avanço só com a tokenização do bloco amber no `FeedbackRequestDialog`? Se preferires não tocar em código (já que o pedido funcional está 100% cumprido), respondo apenas com o relatório de QA manual e fechamos.