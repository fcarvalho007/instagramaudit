
## Âmbito

Apenas o dropdown "Estado comercial" no painel Resumo da ficha de cliente (`lead-detail-sheet.tsx`). As três tabs Relatórios / Feedback / Histórico **já têm conteúdo** (lista de pedidos, FeedbackBetaSection, LeadCommunicationTimeline + product_events) — não estão vazias. Confirmar no fim se queres iterar essas tabs noutro prompt.

## O que muda

Substituir o `Select` actual (2 grupos plano: Decisão comercial / Automático) por um dropdown com **3 secções visuais** e comportamento misto (linhas informativas vs. linhas clicáveis), tal como o mockup.

```
ESTADO COMERCIAL
┌─ [● Novo pedido                                 ▾] ─┐
│                                                     │
│  ⚡ AUTOMÁTICO · O SISTEMA ATUALIZA                 │
│     ✓ Subscreveu lead magnet              01/06    │  ← cinza claro
│     ✓ Relatório gerado                    01/06    │  ← cinza claro
│     ○ Link enviado                                  │  ← desactivado
│     ○ Relatório visto                               │  ← desactivado
│     ○ Checkout iniciado                             │  ← desactivado
│  ─────────────────────────────────────────────      │
│  💳 PAGAMENTO                                       │
│     ○ Pagou 1 relatório                       7€   │
│     ○ Pagou pack de 5                        28€   │
│  ─────────────────────────────────────────────      │
│  ✋ A TUA DECISÃO                                   │
│     ● Novo pedido                              ✓   │  ← realçado azul
│     ○ Em análise por mim                            │
│     ○ Interessado                                   │
│     ○ Potencial cliente                             │
│     ○ Convertido                                    │
│     🗄 Arquivar / Expirado                          │
└─────────────────────────────────────────────────────┘
```

### Mapeamento de estados (17 → 3 grupos)

| Grupo | Estado actual (DB) | Label novo | Clicável? |
|---|---|---|---|
| Automático | `lead_magnet` | Subscreveu lead magnet | não |
| Automático | `relatorio_gerado` | Relatório gerado | não |
| Automático | `link_enviado` | Link enviado | não |
| Automático | `relatorio_visto` | Relatório visto | não |
| Automático | `checkout_iniciado` | Checkout iniciado | não |
| Pagamento | `pago_report` | Pagou 1 relatório · 7€ | sim |
| Pagamento | `pago_pack5` | Pagou pack de 5 · 28€ | sim |
| Decisão | `novo_pedido` | Novo pedido | sim |
| Decisão | `em_analise` | Em análise por mim | sim |
| Decisão | `interessado` | Interessado | sim |
| Decisão | `potencial_cliente` | Potencial cliente | sim |
| Decisão | `convertido` | Convertido | sim |
| Decisão | `arquivado` / `expirado` | Arquivar / Expirado | sim (vai para `arquivado`) |
| Removidos do dropdown | `feedback_pedido`, `feedback_recebido` | — | passam para tab Feedback |

`pago_report` e `pago_pack5` ficam clicáveis (a entrar manualmente um pagamento confirmado é cenário raro mas legítimo de correcção). Posso desactivá-los se preferires; diz só.

### Timestamps e marcadores nas linhas "Automático"

Cada linha mostra ✓ + data quando o evento já aconteceu, senão ○ a cinzento:

- Subscreveu lead magnet → `lead.lead_magnet.last_event_at` (ou `beta_consent_at`)
- Relatório gerado → primeiro evento `report.generated` no `timeline`, ou fallback: `report_status` ∈ ready/generated
- Link enviado → `lastReportLinkSentAt` (já existe no componente)
- Relatório visto → `report_views > 0` (data do 1º view do timeline, se disponível)
- Checkout iniciado → `payment_summary.pending_checkout_started_at` ou `last_payment_at`

Quando não houver data, mostra só ✓ sem timestamp; quando o evento ainda não aconteceu, círculo vazio cinzento.

### Marcadores nas linhas "Pagamento"

Mostrar ✓ azul quando `payment_summary.paid_products.includes("report_single" / "pack_5")`. Valor à direita em Inter SemiBold tabular-nums.

### Marcador na linha actual (qualquer grupo)

`● Estado · ✓` em azul (`--admin-info-500`), bg `--admin-info-50`, igual ao mockup.

## Ficheiros tocados

1. **`src/lib/admin/kanban-columns.ts`**
   - Alargar `COMMERCIAL_STATUS_OPTIONS[].kind` para `"manual" | "auto" | "payment"`.
   - Reetiquetar `em_analise` → "Em análise por mim", `pago_report` → "Pagou 1 relatório", `pago_pack5` → "Pagou pack de 5".
   - Adicionar campo opcional `amount_eur?: number` para os dois `payment`.
   - Remover `feedback_pedido` / `feedback_recebido` do array (ou marcá-los `hidden: true` para não partir leads legados — preferência: `hidden`).

2. **`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`**
   - Substituir o bloco do `Select` (linhas 652–691) por um novo componente local `CommercialStatusSelect` que renderiza os 3 grupos com a hierarquia visual acima.
   - Receber `lead` (para timestamps), `value`, `onChange`.
   - Continua a usar `shadcn/ui` Select por baixo, com `SelectGroup` + `SelectSeparator` + `SelectLabel` (eyebrow com ícone). Linhas "auto" usam `disabled` + classe cinzenta + sufixo de data; linhas "payment" mostram `€` alinhado à direita; linhas "decisão" são clicáveis a cor plena.
   - Adicionar um pequeno helper `getAutoStateTimestamp(lead, key, timeline)` colocado dentro do mesmo ficheiro (não justifica módulo novo).

3. **`src/components/admin/v2/beta-leads/__tests__/`**
   - Novo `commercial-status-select.test.tsx`: render dos 3 grupos, linhas auto desactivadas, datas presentes/ausentes, selecção de "Arquivar" emite `arquivado`.
   - Actualizar testes existentes que façam snapshot do select antigo (se algum partir).

## Notas honestas

- **Sem migração de DB.** Os 17 valores em `commercial_status` continuam válidos; só muda o agrupamento visual e os labels.
- **`em_analise`** é actualmente classificado como `auto` em `kanban-columns.ts` (linha 60). Vais reclassificá-lo como **manual** porque é uma decisão tua, não do sistema. Verifico que nenhuma rotina de servidor (`lead-events.server.ts`, `automation-flow.ts`) escreve `em_analise` automaticamente — se escrever, deixo o auto-write a funcionar mas o UI mostra-o sempre no grupo "A tua decisão".
- **Tabs Relatórios / Feedback / Histórico já têm conteúdo real** (não são "só nomes"). Se quiseres iterá-las (ex.: timeline de feedback com pedidos enviados, ou unificar Relatórios+Histórico) abre um prompt separado — não as toco aqui.
- **"Arquivar / Expirado"** colapsa dois estados num só item da UI. Internamente continuo a escrever `arquivado`; `expirado` continua a poder vir do servidor (kill switch de créditos) e é mostrado correctamente porque o select aceita ambos como current value.

## Checkpoint

- ☐ `kanban-columns.ts` actualizado (kinds, labels, amount_eur, hidden em feedback_*)
- ☐ `CommercialStatusSelect` renderiza 3 grupos com hierarquia visual do mockup
- ☐ Linhas auto mostram ✓ + data quando o evento aconteceu, ○ cinzento quando não
- ☐ Linhas pagamento mostram valor € à direita e ✓ quando pago
- ☐ Linha actual realçada a azul com ✓
- ☐ Testes passam (`bunx vitest run lead-detail-sheet commercial-status-select`)
