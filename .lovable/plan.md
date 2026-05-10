## Auditoria — Funil de conversão pública (`/admin/visao-geral`)

Modo: leitura. Sem alterações. Fontes auditadas:
`src/routes/api/admin/beta-funnel.ts`, `src/components/admin/v2/visao-geral/beta-conversion-funnel.tsx`,
`src/lib/tracking.functions.ts`, `src/lib/tracking.server.ts`, `src/lib/unlock.server.ts`,
`src/routes/api/public/feedback.$requestId.ts`, `src/routes/analyze.$username.tsx`,
`src/components/report-redesign/v2/premium-callout.tsx`, `src/components/report-redesign/v2/report-block-nav.tsx`.

---

### 1. Mapa etapa→fonte (estado atual)

| # | Label UI | Evento/tabela | Unidade contada (código atual) | Pretendido |
|---|---|---|---|---|
| 1 | Report público visto | `product_events.report_viewed` | `Set<"handle|actor_hash ?? lead_id ?? '?'">` | Visitas únicas anónimas por handle |
| 2 | Unlock iniciado | `unlock_clicked` ∪ `unlock_email_submitted` | `Set<actor_hash ?? lead_id>` (descarta se ambos null) | Actores anónimos que iniciaram unlock |
| 3 | Unlock concluído | `unlock_completed` | `Set<lead_id>` | Leads únicas |
| 4 | Report guardado | `report_saved_to_account` | `Set<lead_id>` | Leads que guardaram na conta |
| 5 | Feedback recebido | `feedback_submitted` ∪ `beta_feedback` (último por lead) | `Set<lead_id>` | Leads com feedback |
| 6 | Intenção média/alta | `interpretFeedback` ∨ `commercial_status ∈ {interessado, potencial_cliente, convertido}` | `Set<lead_id>` | Leads com sinal forte |
| 7 | Convertido | `leads.commercial_status='convertido'` | `Set<lead_id>` | Leads convertidas |

---

### 2. Problemas de contagem confirmados

**P1 — `actor_hash` nunca é escrito para eventos de cliente** (crítico).
`recordProductEvent` aceita `actorHash`, mas `trackEvent` em `tracking.functions.ts` não o envia.
Os únicos sítios que populam `actor_hash` são os fluxos server `beta.functions.ts`/`unlock.server.ts` (e mesmo aí, raramente). Logo `report_viewed` e `unlock_clicked` chegam com `actor_hash = null`.
Consequência:

- **Etapa 1**: a chave passa a `"<handle>|<lead_id ?? '?'>"`. Para tráfego verdadeiramente anónimo (sem lead), todos os visitantes do mesmo handle colapsam na mesma chave `handle|?` → **1 view por handle**, independentemente de quantos visitantes reais. Quando a lead é criada, o servidor resolve `lead_id` a partir de `analysis_snapshot_id` (ver `tracking.functions.ts:71-85`), por isso views posteriores do mesmo snapshot ficam atribuídas à lead original — distorce o número anónimo e o ratio com a etapa 3.
- **Etapa 2**: `unlock_clicked` chega sem `actor_hash` e sem `lead_id` → o ramo `if (id) unlockStartedKeys.add(id)` descarta-o. Só `unlock_email_submitted` (já com lead) contribui → **etapa 2 ≈ etapa 3** quase sempre, eliminando o sinal de "abandono no formulário".

**P2 — Texto do tooltip mente sobre a métrica.**
`info=...Etapas 1-2 medem visitantes anónimos (actor_hash)…` — falso enquanto P1 não for resolvido.

**P3 — `report_saved_to_account` não representa "guardar".**
É emitido automaticamente quando o INSERT do `report_requests` é primeiro para o par (lead, snapshot), em `unlock.server.ts:371-380`. Para leads novas, **etapa 4 = etapa 3 por construção**. Não há acção do utilizador que distinga "guardado" de "concluído".

**P4 — Resolução server-side de `lead_id` em `report_viewed` infla o sinal "lead reviu".**
`tracking.functions.ts:71-85` faz lookup pelo `analysis_snapshot_id` e atribui a lead que originou o pedido. Qualquer visitante anónimo que aceda ao link partilhado gera um `report_viewed` com `lead_id` da lead original → contagens 1 e 3 ficam emaranhadas.

**P5 — Dedup defensivo só cobre 5 s.**
Protege StrictMode/duplo-clique, não sessões repetidas. Como as etapas 3-7 usam `Set<lead_id>`, o impacto é nulo aí; em etapa 1 a contagem por (handle, lead_id) já dedupa por outro motivo. Não é bug, mas é importante saber: o "view repetido" não é detectado, só é colapsado.

**P6 — Comparação 2→3 mistura unidades.**
Mesmo se P1 for corrigido, etapas 1-2 (actor_hash) vs 3-7 (lead_id) não permitem `pctVsPrev` literal — um actor pode iniciar 2 unlocks (2 emails) e gerar 1 lead; ou abandonar e voltar com outro email. O ratio é informativo, não causal.

**P7 — `dropFromPrev` pode parecer 0 em casos legítimos** (etapa 3=4=5 com baixa amostra), mas o output não distingue "ainda sem sinal" de "perfeito 100% conversão". Em pré-beta isto vai dar leitura enganosa.

**P8 — Empty state apenas para `total===0`.**
Se etapa 1 = 0 mas houver leads via fluxos não-públicos, o painel mostra "ainda sem visualizações públicas" e esconde dados reais (3-7).

**P9 — Etapa 5 inclui união com `beta_feedback`** sem limitar a leads que passaram pela 4. Defensável (recupera backfills antigos), mas pode tornar `count(5) > count(4)` em dados antigos — o cálculo `dropFromPrev` faz `max(prev-count, 0)` e mascara isto, mas `pctVsPrev` fica > 100%.

**P10 — Sem filtro temporal.** O funil é histórico total. Tendências semanais/mensais não são visíveis. Para beta, é aceitável; documentar.

---

### 3. Labels pt-PT

| Atual | Avaliação | Sugestão |
|---|---|---|
| Report público visto | OK | manter |
| Unlock iniciado | enganoso (mede submissão de email) | "Email de unlock submetido" ou corrigir a métrica |
| Unlock concluído | OK | manter |
| Report guardado | enganoso (é automático no 1.º unlock) | "Pedido criado na conta" — ou remover etapa até existir acção explícita |
| Feedback recebido | OK | manter |
| Intenção média/alta | OK | manter |
| Convertido | OK | manter |

---

### 4. Recomendações priorizadas

**Antes do beta externo (mínimo):**

- R1. Corrigir o tooltip para reflectir a realidade: substituir "actor_hash" por "lead_id (etapas 3-7); etapas 1-2 são aproximadas enquanto não houver actor_hash anónimo".
- R2. Renomear "Unlock iniciado" → "Email submetido" e "Report guardado" → "Pedido criado".
- R3. Empty state separado: mostrar "ainda sem leads" quando etapa 3 = 0, mesmo que etapa 1 > 0; e mostrar dados parciais quando etapa 1 = 0 mas etapa 3 > 0.
- R4. Limitar `pctVsPrev` a `min(1, count/prev)` na UI ou anotar quando > 100% (caso P9).

**Para reforçar fidedignidade do funil (próximo sprint):**

- R5. Propagar `actor_hash` do cliente — gerar/persistir um id anónimo (cookie httpOnly, ou localStorage hash) e passar em `trackEvent`. Inserir como `actor_hash` em `report_viewed`/`unlock_clicked`. Sem isto, etapas 1-2 são essencialmente decorativas.
- R6. Não atribuir `lead_id` a `report_viewed` por lookup de snapshot; só atribuir se o utilizador autenticado for dono daquela lead (ou nunca). Caso contrário a etapa 1 confunde anónimos com leads.
- R7. Adicionar acção explícita de "Guardar" (botão pós-unlock) e mover `report_saved_to_account` para essa acção; manter `report_request_created` como evento separado.
- R8. Adicionar filtro temporal (últimos 7/30 dias / total) ao funil.

**Optimização opcional:**

- R9. Expor "lead recorrente" como contagem separada ou nota — actualmente uma lead que volta gera novos `unlock_completed` (deduped a 5 s) e outras inserções, mas o `Set<lead_id>` já trata bem disto.
- R10. Mostrar `pctVsPrev` apenas entre etapas comparáveis (3→4, 4→5, 5→6, 6→7); para 1→2 e 2→3 mostrar como "indicativo".

---

### 5. Prompt de implementação (futuro, não executar agora)

```
Use Plan Mode.

Goal: corrigir o funil público de conversão em /admin/visao-geral.

Mudanças mínimas (UI-only, sem schema):
1. src/routes/api/admin/beta-funnel.ts
   - clamp pctVsPrev a [0,1] e adicionar campo `comparable: boolean` por etapa
     (false para 1→2 e 2→3; true para 3→4 em diante).
   - renomear labels: "Unlock iniciado"→"Email submetido",
     "Report guardado"→"Pedido criado".
2. src/components/admin/v2/visao-geral/beta-conversion-funnel.tsx
   - tooltip honesto (remover claim sobre actor_hash anónimo).
   - empty state condicional: distinguir "sem leads" (etapa 3=0) de
     "sem visualizações" (etapa 1=0).
   - quando comparable=false, mostrar "indicativo" em vez de "% conversão".

Mudanças estruturais (sprint dedicado, não nesta task):
- propagar actor_hash anónimo via trackEvent.
- não atribuir lead_id a report_viewed por snapshot lookup.
- separar "guardado" (acção) de "pedido criado" (sistema).
- filtro temporal 7d/30d/total.

Restrições: pt-PT, tokens admin, sem alterar schema, sem mexer no fluxo de unlock.
Checklist:
☐ labels actualizados
☐ pctVsPrev clamp + flag comparable
☐ empty state condicional
☐ tooltip honesto
☐ tipos TS coerentes
```
