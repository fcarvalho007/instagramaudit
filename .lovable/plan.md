## Redesenhar a ficha de cliente como modal central

Substituir o `Sheet` lateral (`LeadDetailSheet`) por um **modal centrado** com foco numa sessão de trabalho do lead. Manter API pública (`open`, `onOpenChange`, `lead`, `onUpdate`, `onRefresh`) e ponto de entrada (`/admin/leads` via `?lead=`), para não tocar nas tabelas/kanban que já o consomem.

### 1. Posição & contentor

- Trocar `Sheet/SheetContent` por `Dialog/DialogContent` (shadcn) — modal central sobre `bg-black/60` (`DialogOverlay`).
- Largura: `max-w-[640px]`, altura máxima `min(88vh, 880px)`, scroll interno.
- Cantos `rounded-2xl`, sombra de elevação, header sticky com fecho `×`.
- Manter foco do teclado e fechar com `Esc` (já é o default do `Dialog`).
- Sem alteração ao `admin.leads.tsx`: continua a abrir via `setActiveLeadId`.

### 2. Cabeçalho (identidade + estado)

```
[Avatar JP]  João Pereira                                    [Novo pedido ▾chip]
             smoketest+pt@auditprofiles.test
```

- Avatar com iniciais (já existe `getInitials`).
- Chip de estado comercial à direita usa cor do `COMMERCIAL_STATUS_OPTIONS` (apenas leitura aqui, é editável abaixo).

### 3. KPI strip — 4 métricas accionáveis

Substituir Views/Custo/Idade por:

| Label | Valor | Fonte |
|---|---|---|
| RELATÓRIOS | `report_request_id ? 1 : 0` (placeholder até existir contador real) | `lead.report_request_id` |
| CRÉDITOS | `credits_remaining / credits_granted` (ex.: `1 / 2`) | já existe |
| GASTO | `€{(total_paid_cents/100).toFixed(0)}` | `lead.payment_summary.total_paid_cents` |
| INSCRITO HÁ | `{daysSince(created_at)}d` | já existe |

Cartões iguais em grelha 4×1, com label uppercase pequeno (`text-eyebrow-sm`) + valor em Inter SemiBold tabular-nums. Sem cor de destaque excepto se `credits_remaining === 0 && credits_granted > 0` → label "CRÉDITOS" a vermelho admin (sinal de esgotado).

> ⚠️ Os números reais (relatórios, gasto) dependem de `report_request_id` e `payment_summary`. Se faltarem, mostrar `—` (nunca `0` enganador).

### 4. Tabs (4, não 5)

`Resumo · Relatórios · Feedback · Histórico` — fundir "Comunicação" dentro de "Histórico" (passa a render `LeadCommunicationTimeline` + product_events na mesma timeline ordenada). Tabs em `TabsList` com underline (estilo da imagem).

### 5. Tab "Resumo" — conteúdo central

**(a) Próximo passo — callout com botão accionável**

```
💡 PRÓXIMO PASSO
   Aprovar pedido e gerar relatório            [Gerar →]
```

- Texto vem de `suggestNextLeadAction(lead)` (já existe em `lead-lifecycle`).
- Botão CTA muda consoante a sugestão (Gerar relatório / Pedir feedback / Enviar email / Oferecer pack). Se a sugestão for "ver" sem acção, esconder o botão.
- Cor do callout: `bg-info-50` com `border-info-200`.

**(b) Contexto do lead — grelha 2×2 com tradução humana**

```
👤 Relação            🎯 Objetivo
   É o perfil dele       Melhorar conteúdo

🔀 Origem             🔥 Intenção
   Modal de onboarding   Baixa — sem relatório visto
```

- Criar mapas de tradução (PT, sentence case) num ficheiro novo `src/lib/admin/lead-context-labels.ts`:
  - `PROFILE_OWNERSHIP_LABELS`: `own_profile → "É o perfil dele"`, `competitor → "É um concorrente"`, `client → "É de um cliente"`, etc. (cobrir todos os valores que aparecem em `leads.profile_ownership`).
  - `PURPOSE_LABELS`: `improve_content → "Melhorar conteúdo"`, `understand_competition → "Estudar concorrência"`, `sell_to_client → "Vender a cliente"`, etc.
  - `SOURCE_LABELS`: `onboarding_modal → "Modal de onboarding"`, `beta_form → "Formulário beta"`, `qa → "QA interno"`, etc.
- Intenção usa `deriveIntentSignal` (já existe) e força sentence case.
- Cada campo: ícone Lucide pequeno + label `text-eyebrow-sm` + valor Inter regular.
- Fallback `—` quando o campo é null.

**(c) Estado comercial — Select agrupado (corrigir o pior problema)**

Reorganizar `COMMERCIAL_STATUS_OPTIONS` em dois grupos visíveis dentro do `SelectContent`:

- **Decisão comercial** (editável à mão, ordem por etapa do funil):
  `lead_magnet`, `interessado`, `potencial_cliente`, `checkout_iniciado`, `pago_report`, `pago_pack5`, `convertido`, `arquivado`, `expirado`.
- **Automático — só leitura** (renderizados como `SelectItem disabled`, com cinzento e tooltip "Atualizado pelo sistema"):
  `novo_pedido`, `em_analise`, `relatorio_gerado`, `link_enviado`, `relatorio_visto`, `feedback_pedido`, `feedback_recebido`.

Implementação:
- Adicionar campo `kind: "manual" | "auto"` a `COMMERCIAL_STATUS_OPTIONS` em `src/lib/admin/kanban-columns.ts` (sem remover `group` para não partir consumidores existentes).
- Render via `SelectGroup` + `SelectLabel` ("Decisão comercial" / "Automático").
- Se o lead estiver actualmente num estado "auto", mostrar no trigger normalmente (chip), mas no dropdown ele aparece desactivado para não ser re-selecionado à mão.

**(d) Notas internas** — `Textarea` igual ao actual, com contador.

**(e) Acções rápidas** — grelha 3+1:

```
[✉ Email]  [💬 WhatsApp]  [✓ Contactado]
[         🗄 Arquivar                    ]
```

- Email/WhatsApp/Contactado reaproveitam handlers existentes.
- Arquivar abre `ConfirmDialog` (já existe), faz `onUpdate(id, { commercial_status: "arquivado" })`.

### 6. Tabs "Relatórios", "Feedback", "Histórico"

- **Relatórios**: mover bloco "Relatório" actual (request status + pdf + actions) para esta tab. Quando houver mais que um relatório por lead no futuro, esta tab passa a lista.
- **Feedback**: bloco actual de `interpretFeedback` + `PRICING_PREFERENCE_LABELS` / `PURCHASE_INTENT_LABELS`.
- **Histórico**: timeline unificada — eventos de produto (`product_events` via `useQuery` já existente) + `LeadCommunicationTimeline`, ordenados por `created_at` desc.

### 7. Limpeza

- Apagar `SectionDivider`, `STATUS_ACCENT` não usado, e cabeçalhos do drawer antigo que deixam de existir.
- Não tocar em: `LeadsTable`, `KanbanBoard`, `LeadCard`, `admin.leads.tsx` (a invocação continua igual).
- `COMMERCIAL_STATUS_OPTIONS` ganha campo `kind` mas mantém `group/key/label/color` — consumidores actuais continuam a funcionar.

### Ficheiros tocados

- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — reescrita estrutural (Sheet → Dialog, novas secções).
- `src/lib/admin/kanban-columns.ts` — adicionar `kind: "manual" | "auto"` a cada opção.
- `src/lib/admin/lead-context-labels.ts` — **novo** ficheiro com os 3 mapas de tradução.
- `src/components/admin/v2/beta-leads/__tests__/` — actualizar/adicionar teste de smoke que confirme: (1) render como `role="dialog"`, (2) tradução de `own_profile` aparece como "É o perfil dele", (3) opções "auto" estão `disabled` no select.

### Notas honestas (do briefing do user)

- **KPIs reais**: "Relatórios" e "Gasto" usam dados existentes mas podem ficar a `—` quando não há `report_request_id` ou `payment_summary.total_paid_cents=0`. Não inflacionar.
- **Sugestão de próximo passo**: já existe `suggestNextLeadAction`. Confirmar que cobre os 4 estados ("gerar", "pedir feedback", "oferecer pack", "ver"). Se faltar mapeamento para o CTA do botão, completar nesse helper (sem duplicar lógica em UI).
- **Renomear ficheiro**: não renomear `lead-detail-sheet.tsx` para evitar churn de imports — fica como nome legado, o componente passa a ser modal.