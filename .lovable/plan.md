# Redesenho — Tabela de Contactos (`/admin/leads?view=tabela`)

Transformar a tabela actual de "lista de leads" em "fila de trabalho": ordenada por quem precisa de ação, com créditos visíveis, QA escondido por defeito e botão de acção sugerida por linha.

**Âmbito:** só a vista Tabela em `/admin/leads` (e suporte mínimo no backend `/api/admin/leads-kanban` + nova classificação partilhada). Kanban, ficha de detalhe, `/admin/visao-geral` e `/report.example` ficam intactos.

---

## ☐ Checklist

- ☐ Backend: enriquecer `EnrichedLead` com créditos e flag QA
- ☐ Lib partilhada: `lead-classification.ts` (hot / QA / acção sugerida)
- ☐ Tabela: substituir coluna Lead-magnet por Créditos
- ☐ Tabela: toggle "Ocultar QA" + linha colapsada de QA no fim
- ☐ Tabela: ordenação por prioridade (quentes no topo, fundo de aviso)
- ☐ Tabela: nova coluna "Acção" contextual
- ☐ Header: chips reescritos (Todos, Quentes, Crédito esgotado, Sem feedback, Novos hoje) + KPI "Precisam de acção"
- ☐ Testes puros para `lead-classification`
- ☐ `bunx tsc --noEmit` + `bunx vitest run`

---

## 1. Definições partilhadas (fonte única)

Novo ficheiro `src/lib/admin/lead-classification.ts` — usado pela tabela hoje e amanhã por `priority-followups` e KPIs da Visão Geral.

- **`isQaLead(lead)`** — `true` se:
  - `source === 'qa'` ou começa por `qa_`
  - email em allowlist explícita (`QA_EMAILS`, configurável no ficheiro)
  - `name` contém `"QA"` (case-insensitive, palavra inteira)
- **`isHotLead(lead, now)`** — `true` se (reutiliza regras do `/api/admin/follow-ups`):
  - viu o relatório (`report_views > 0`) **e**
  - não tem feedback recebido **e**
  - última interacção há ≥ 48h
- **`suggestedAction(lead)`** — devolve `{ key, label, intent }`:
  - `credits_remaining === 0 && credits_granted > 0` → `oferecer_pack` ("Oferecer pack")
  - `isHotLead(lead)` → `pedir_feedback` ("Pedir feedback")
  - caso contrário → `ver` ("Ver")
- **`priorityScore(lead)`** — número para ordenação descendente: crédito esgotado (3) > hot (2) > recente (1) > resto (0). Empate desempata por `last_interaction` desc.

## 2. Backend — `/api/admin/leads-kanban`

Apenas adicionar campos no payload de cada lead (sem mudar contrato existente):

- `credits_granted: number` — `SUM(delta>0)` em `credit_ledger`
- `credits_used: number` — `SUM(-delta WHERE delta<0)`
- `credits_remaining: number` — `SUM(delta)`

Implementação: um único `SELECT lead_id, SUM(...) FROM credit_ledger GROUP BY lead_id` agregado num `Map` e fundido à lista (LEFT JOIN em memória). Leads sem registos ficam a `{0,0,0}`.

Estender `EnrichedLead` em `src/lib/admin/kanban-columns.ts` com os 3 campos.

## 3. UI — `LeadsTable`

### 3.1 Toolbar (substitui chips actuais)

- Chips: `Todos`, `Quentes`, `Crédito esgotado`, `Sem feedback`, `Novos hoje`.
  Atualizar `FILTER_CHIPS` em `lead-filter-chips.ts` reutilizando `isHotLead`, `credits_remaining`, `feedback`, `created_at`.
- À direita: toggle `Ocultar QA` (default ON, `localStorage` `admin.leads.hideQa`) + Pesquisar + contador.
- Botão `Exportar` mantém o comportamento existente (CSV dos visíveis).

### 3.2 KPI strip (novo, acima da tabela)

4 mini-cards estilo Visão Geral:
1. **Contactos reais** — `N` (`+M em QA ocultos` se aplicável)
2. **Report → Conta** — % calculado da janela actual
3. **Conta → Pago** — % da janela
4. **Precisam de acção** — count de `isHotLead || credits_remaining===0` (destaque `signal`)

Estes KPIs lêem só da lista filtrada (excluindo QA quando escondido) — não criar endpoint novo.

### 3.3 Colunas (nova ordem)

| Coluna | Conteúdo |
|---|---|
| Contacto | Nome + email (linha 2 muted) |
| Perfil | `@handle` |
| Estado | `StatusPill` (já existe) com label curta (Report visto / Crédito esgotado / etc.) |
| **Créditos** | `1/2`, `2/2`. A `2/2` ganha cor `expense` + sublinha "crédito esgotado" |
| Visto há | `formatAge(last_interaction)` — reutiliza `formatAge` já no `priority-followups` |
| Acção | Botão sólido com `suggestedAction(lead).label`. `pedir_feedback`/`oferecer_pack` em alto contraste; `ver` discreto |

Coluna "Lead-magnet" **removida**. Coluna "Email" e "Criado em" colapsadas para sublinhas / removidas (estão acessíveis na ficha).

### 3.4 Ordenação e destaque

- Default sort = `priorityScore desc, last_interaction desc` (em vez de "Mais recentes"). Manter `Select` para outras ordens.
- Linhas `isHotLead || credits_remaining===0` recebem fundo `bg-[rgb(var(--admin-signal-50))]` e borda esquerda 2px `signal-500`.
- Click na linha continua a abrir o `LeadDetailSheet`. Botão "Acção" pára propagação e, para já, abre o sheet com `?tab=email` (reutiliza UX existente; sem novas mutations).

### 3.5 QA escondido

- Quando `hideQa === true`:
  - filtrar `leads` por `!isQaLead`
  - render uma linha colapsada no fim: `N contactos de QA ocultos · mostrar` (botão que faz toggle)
- Contador da toolbar e KPI passam a contar apenas reais.

---

## 4. Detalhes técnicos

- Nenhuma mudança no Kanban — `LeadsTable` recebe o mesmo `leads: EnrichedLead[]` com os 3 campos extra disponíveis.
- A definição de "lead quente" fica **só** em `lead-classification.ts`. `priority-followups` e futuros KPIs passarão a importá-la (não faz parte deste âmbito mudá-los, mas a função fica pronta).
- Tokens: nenhum `text-white`/cores hardcoded; tudo via `var(--admin-*)` existentes.
- A11y: `aria-sort` na coluna ordenada; linhas hot com `aria-label` que inclui motivo.

## 5. Testes

`src/lib/admin/__tests__/lead-classification.test.ts`:
- `isQaLead` reconhece source, allowlist e nome
- `isHotLead` exige report visto + sem feedback + ≥48h
- `suggestedAction` prioriza crédito esgotado sobre hot
- `priorityScore` ordena correctamente em empates

## 6. Ficheiros tocados

- `src/lib/admin/lead-classification.ts` (novo)
- `src/lib/admin/__tests__/lead-classification.test.ts` (novo)
- `src/lib/admin/kanban-columns.ts` (3 campos no `EnrichedLead`)
- `src/lib/admin/lead-filter-chips.ts` (chips reescritos)
- `src/routes/api/admin/leads-kanban.ts` (JOIN com `credit_ledger`)
- `src/components/admin/v2/beta-leads/leads-table.tsx` (redesenho)

## 7. Fora de âmbito

- Kanban / `LeadDetailSheet` / `LeadsConversionBanner`
- `/admin/visao-geral`, `/admin/receita`, `/report.example`
- Novas mutations (oferecer pack, enviar email) — só sugestão visual
- Marcar leads como QA manualmente (usa regras automáticas; allowlist editável no ficheiro)

## 8. Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/admin/__tests__/lead-classification.test.ts`
- Verificação visual em `/admin/leads?view=tabela`: KPI strip, chips, ordenação, fundo signal nos hot, linha QA colapsada, botões de acção contextuais.
