## Objetivo

Transformar `/admin/beta-leads` num verdadeiro funil comercial em `/admin/leads`, com 5 estágios alinhados ao modelo de receita (Lead Magnet → Checkout → Report 7€ → Pack 28€ → Expirado), banner de taxas de conversão no topo e novos filtros mais accionáveis. Sem ativar pagamentos reais — preparamos o schema e a UI para os receber via webhook quando o eupago for ligado.

## A. Renomear rota (com redirect 301)

- Criar `src/routes/admin.leads.tsx` (cópia adaptada de `admin.beta-leads.tsx`).
- Substituir `admin.beta-leads.tsx` por uma rota mínima que faz `throw redirect({ to: "/admin/leads", search, statusCode: 301 })` no `beforeLoad` — preserva `?lead=` e `?view=`.
- Atualizar 5 ficheiros que linkam para `/admin/beta-leads`: `admin-sidebar`, `admin-topbar`, `admin-command-palette`, `automacoes/people-tab`, `visao-geral/priority-followups`, `admin.clientes`.
- `queryKey` passa de `["admin","beta-leads"]` para `["admin","leads"]`.

## B. Nova pipeline de 5 colunas

Substituir as 11 colunas atuais em `src/lib/admin/kanban-columns.ts` pelos 5 novos estágios — ordem da esquerda para a direita:

```text
1. lead_magnet      — Subscreveu Lead Magnet     (azul calmo  #3772E5)
2. checkout_iniciado — € Checkout iniciado        (índigo      #7664E4)
3. pago_report      — € Pagou 1 report · 7€       (verde       #1D9E75)
4. pago_pack5       — € Pagou Pack 5 · 28€        (esmeralda   #059669)
5. expirado         — Expirado / Cancelado        (cinza âmbar #BA7517)
```

Os 11 estados legados (`novo_pedido`, `em_analise`, `relatorio_gerado`, ...) deixam de ser visíveis como colunas mas continuam válidos em DB. Mapeamento de leitura (sem migração destrutiva):

| Estado antigo | Coluna nova derivada |
|---|---|
| novo_pedido, em_analise, relatorio_gerado, link_enviado, relatorio_visto, feedback_pedido, feedback_recebido, interessado | Implícito: lead com relatório mas sem lead-magnet/pagamento → não aparece em coluna; conta apenas no banner como "Reports gerados" (denominador da 1ª taxa) |
| potencial_cliente, convertido | `pago_report` (legacy) |
| arquivado | `expirado` |

O drag-and-drop entre as 5 colunas faz `UPDATE leads.commercial_status`. Quando o admin arrasta para `pago_report` ou `pago_pack5`, abre o `CommercialFollowupDialog` para confirmar (futuro: substituído por evento de webhook).

## C. Tabela `lead_payments` (preparada, ainda sem checkout)

Nova migração:

```sql
CREATE TABLE public.lead_payments (
  id uuid PK,
  lead_id uuid FK → leads(id) ON DELETE CASCADE,
  product text CHECK (product IN ('report_single','pack_5')),
  amount_cents int NOT NULL,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','expired')),
  provider text,                    -- 'eupago' | 'manual' | NULL
  provider_reference text,
  checkout_started_at timestamptz,
  paid_at timestamptz,
  expired_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at, updated_at
);
-- RLS ON; sem policies públicas (acesso só via service role / admin auth-middleware)
-- Índices: (lead_id, status), (status, created_at DESC)
```

Os 3 estágios pagos derivam de:
- `checkout_iniciado` = existe `lead_payments` com `status='pending'` mais recente
- `pago_report` = existe row `status='paid' AND product='report_single'`
- `pago_pack5` = existe row `status='paid' AND product='pack_5'`
- `expirado` = `commercial_status='arquivado'` OR última payment `status IN ('expired','failed')` há > 7 dias sem nova ação

Drag manual no Kanban: para `pago_report`/`pago_pack5` cria também um row `lead_payments` com `provider='manual'` e `paid_at=now()`. Isto deixa o histórico financeiro consistente desde o dia 1.

## D. Sinal de Lead Magnet (ambos contam)

Estender `LeadMagnetState` na resposta de `/api/admin/leads-kanban` para que um lead seja "subscritor lead-magnet" sse:
```
lead.lead_magnet?.status IN ('active','completed')  OR  lead.marketing_consent === true
```
Adicionar campo derivado `is_lead_magnet_subscriber: boolean` na resposta da API.

## E. Banner de taxas no topo (`LeadsConversionBanner`)

Novo componente `src/components/admin/v2/beta-leads/leads-conversion-banner.tsx`, sob o `AdminPageHeader` e acima das tabs.

Layout: 3 cartões inline em linha horizontal, separados por chevron "›", estética minimal Iconosquare (white card, border navy α-10, sem sombras).

```
[ 142 Reports gerados ] › 38% › [ 54 Lead Magnet ] › 22% › [ 12 Checkout iniciado ] › 75% › [ 9 Pagaram ]
```

Numerador/denominador (calculados server-side num único endpoint `/api/admin/leads-funnel`):
- Reports gerados = `COUNT(DISTINCT lead_id) FROM report_requests WHERE request_status='ready'`
- Lead Magnet = leads com `is_lead_magnet_subscriber=true`
- Checkout iniciado = leads com pelo menos 1 `lead_payments.status='pending'`
- Pagaram = leads com pelo menos 1 `lead_payments.status='paid'` (soma report + pack)

3 taxas: `LM/Reports`, `Checkout/LM`, `Pago/Checkout`. Cada taxa em Inter SemiBold tabular-nums, com micro-label "vs período anterior · +3 p.p." (placeholder a `null` enquanto não houver histórico).

Sem destaque cinematográfico — manter o tom suave/editorial pedido (eyebrow uppercase + número grande + label pequena).

## F. Filtros redesenhados

Reescrever `src/lib/admin/lead-filter-chips.ts`. Dois grupos:

**Estado (alinhado à nova pipeline)**
- Todos
- Sem pagar (Lead Magnet + Checkout iniciado)
- Pagaram (Report ou Pack)
- Expirados

**Ação necessária (substitui "atenção")**
- ⚠ Checkout abandonado · 24h — `lead_payments.status='pending' AND checkout_started_at < now()-'24h'`
- 🔥 Pagaram esta semana — celebrar e dar follow-up
- 📩 LM activo, sem ler · 3d — subscritor lead-magnet mas sem `report_views` recente
- 💰 Comprou report, candidato a Pack — pagou `report_single` há ≥ 14d sem `pack_5`
- 🆕 Novos hoje (mantém)

(Emojis aqui são apenas leitura no plano; na implementação usamos ícones Lucide com cor do token correspondente — não emoji literal.)

## G. Search e contagem

Mantém o input "Pesquisar lead…" e o contador "X contactos" sem alterações estruturais. Só passa a respeitar os novos chips.

## Detalhes técnicos

- **Migração**: 1 migração nova só para `lead_payments` + índices + RLS. Zero alterações destrutivas em `leads`.
- **API**: estender `/api/admin/leads-kanban` para devolver `payment_summary: { has_pending, paid_products: [...], last_payment_at }` por lead; novo endpoint `/api/admin/leads-funnel` para o banner (cacheado 60s).
- **Tipos**: `EnrichedLead` ganha `payment_summary` e `is_lead_magnet_subscriber`. `KANBAN_COLUMNS` reduzido para 5.
- **Componentes a atualizar**: `kanban-board.tsx`, `lead-card.tsx`, `leads-table.tsx` (nova coluna "Pago"), `lead-detail-sheet.tsx` (secção "Pagamentos"), `commercial-followup-dialog.tsx` (opção de marcar pagamento manual).
- **i18n**: copy em pt-PT, sem placeholders. "Pagou 1 report · 7€", "Pack 5 · 28€", "Expirado / Cancelado".
- **Locked files**: nenhum dos componentes do Kanban está em LOCKED_FILES.md (verificado). `admin-sidebar` foi editado recentemente sem flag de bloqueio.

## Fora de scope (não toco)

- Integração eupago real / webhook handler
- Página `/admin/clientes` (mantém os tipos antigos por agora)
- `/admin/beta-requests` (rota separada)
- Migração retroactiva de leads antigos para os novos estados — deixa-se `commercial_status` legado intacto e a API faz a derivação.

## Checkpoint

- ☐ `/admin/beta-leads` faz 301 → `/admin/leads` preservando search params
- ☐ Kanban mostra exactamente 5 colunas na ordem pedida com as cores do design system
- ☐ Tabela `lead_payments` criada com RLS, sem dados de teste
- ☐ Drag manual para colunas pagas cria registo `lead_payments` com `provider='manual'`
- ☐ Banner no topo mostra 3 taxas calculadas server-side
- ☐ Filtros antigos removidos; 4 estado + 5 ação necessária no lugar
- ☐ Todos os 5 ficheiros que linkavam para `/admin/beta-leads` atualizados
- ☐ Build limpo + `EnrichedLead` continua tipado em todos os consumidores
- ☐ Sem strings pt-BR ("activo" mantém-se como pt-PT pré-90? — usar "ativo" pós-AO90)
