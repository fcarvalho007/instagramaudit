## Estado atual

A página `/admin/automacoes` **já está implementada e a funcionar**. Levantamento:

| Ficheiro | Estado | Linhas |
|---|---|---|
| `src/routes/admin.automacoes.tsx` | ✅ existe | 9 |
| `src/routes/api/admin/automation-flow.ts` | ✅ existe | 249 |
| `src/components/admin/v2/automacoes/automation-flow-page.tsx` | ✅ existe | 158 |
| `src/components/admin/v2/automacoes/automation-node.tsx` | ✅ existe | 217 |
| `src/components/admin/v2/automacoes/automation-edge.tsx` | ✅ existe | 33 |
| `src/components/admin/v2/automacoes/eligibility-summary.tsx` | ✅ existe | 45 |
| `src/components/admin/v2/admin-tabs-nav.tsx` | ✅ entrada "Automações" presente |

O endpoint devolve os 7 fluxos (pedido_recebido → follow_up_comercial), com contagens reais agregadas a partir de `leads.commercial_status` e `recentFailures` lido de `report_requests.delivery_status='failed'` (últimos 7 dias). Read-only, sem botões de execução, sem chamadas a providers, tokens admin, mobile-first.

## Lacuna face ao spec original

O spec pede que cada nó referencie eventos reais (`report_generated`, `report_link_sent`, `report_viewed`, `feedback_requested`, `feedback_submitted`). Hoje esses eventos aparecem como **label estático** no nó, mas não há leitura agregada de `product_events` — as contagens vêm só de `commercial_status`. Isto é uma simplificação razoável, mas perde-se sinal útil (ex: "5 leads viram o relatório nas últimas 24h").

## Proposta de afinação (opcional, pequena)

Se quiseres enriquecer a visualização sem mudar a estrutura, dois ajustes pequenos:

1. **Endpoint** — adicionar a cada flow:
   - `last24hCount` — `count(*) from product_events where event_type = X and created_at > now()-24h`
   - `lastEventAt` — timestamp do evento mais recente desse tipo
   Eventos mapeados: `pedido_recebido`→`beta_request_created|unlock_completed`, `relatorio_gerado`→`report_generated`, `link_enviado`→`report_link_sent`, `relatorio_visto`→`report_viewed`, `feedback_pedido`→`feedback_requested`, `feedback_recebido`→`feedback_submitted`, `follow_up_comercial`→`commercial_followup_sent`.

2. **AutomationNode** — mostrar discretamente "Última atividade: há 2h" + "24h: 3 eventos" na linha do trigger.

Sem schema novo, sem novos componentes, sem alterar contratos existentes. ~40 linhas no endpoint + ~15 no nó.

## Validação

- `bunx tsc --noEmit`
- Inspeção manual: `/admin/automacoes` carrega, contagens batem com Kanban, sem botões de envio, network mostra apenas `GET /api/admin/automation-flow`, layout legível em 375px.

## Decisão pedida

- (A) **Não fazer nada** — página já cumpre o spec funcional.
- (B) **Aplicar afinação 1+2** — enriquecer com `product_events` (last24h + lastEventAt).
- (C) Outra direção que queiras especificar.