## Admin Intelligence Cockpit — v1

Transformar `/admin` num cockpit com 6 tabs sem reescrever a camada de dados. O endpoint `/api/admin/diagnostics` já devolve quase tudo o que é preciso para as 5 novas tabs; a tab `Pedidos de relatório` continua a usar `/api/admin/report-requests`.

---

### Estrutura final das tabs

```text
/admin
├─ Diagnóstico   ← saúde técnica (secrets, Apify, snapshots, último erro)
├─ Análises      ← histórico de eventos (recent_events)
├─ Perfis        ← rollup por handle (top_profiles)
├─ Custos        ← agregados financeiros (analytics + cache savings)
├─ Alertas       ← sinais não bloqueantes (alerts)
├─ Pedidos       ← já existe, mantém-se como está
└─ [Futuro: PnL] ← placeholder visível "Sem receita registada"
```

---

### Componentes a criar

Todos em `src/components/admin/cockpit/` para isolar do código antigo:

| Ficheiro | Responsabilidade |
|---|---|
| `use-cockpit-data.ts` | hook que faz `fetch /api/admin/diagnostics` uma vez, partilha resposta entre tabs, expõe `refresh()` e `loading` |
| `cockpit-shell.tsx` | wrapper com header + `Tabs` + botão "Atualizar" global |
| `tab-diagnostico.tsx` | secrets, APIFY_ENABLED, allowlist, snapshots, último evento/provider call/erro |
| `tab-analises.tsx` | tabela de `recent_events` com filtro simples por outcome (cliente) |
| `tab-perfis.tsx` | tabela `top_profiles` ordenável por total/custo/última análise |
| `tab-custos.tsx` | cards com custo 24h/7d, projeção mensal heurística, fresh vs cache, "custo poupado pelo cache" |
| `tab-alertas.tsx` | lista `alerts` agrupada por severidade, com kind humanizado |
| `tab-pnl-placeholder.tsx` | cartão estático "Sem receita registada — billing por implementar" |
| `cockpit-formatters.ts` | `formatDate`, `formatCost`, `formatNumber`, label maps (PT-PT) — extraídos do panel antigo |
| `cockpit-badges.tsx` | `OutcomeBadge`, `DataSourceBadge`, `SeverityBadge`, `ProviderStatusBadge` (extraídos) |

**Componentes existentes reutilizados:**
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`@/components/ui/tabs`)
- `Card`, `Badge`, `Button` (já usados no panel atual)
- `Toaster` (`@/components/ui/sonner`)
- `RequestList`, `RequestDetailSheet` (tab Pedidos)
- `AdminGate` (gate de acesso)

---

### Endpoints

**Não criar nada novo agora.** O endpoint `/api/admin/diagnostics` já devolve:
- `secrets`, `apify`, `testing_mode` → tab Diagnóstico
- `snapshots`, `report_requests` (resumo) → tab Diagnóstico
- `analytics.last_24h` / `last_7d` → tab Custos + Diagnóstico
- `top_profiles.rows` → tab Perfis
- `recent_events.rows` → tab Análises
- `recent_provider_calls.rows` → tab Diagnóstico ("último provider call")
- `alerts.rows` → tab Alertas
- `alert_thresholds` → tab Alertas (mostrar limites usados)

**Ajuste mínimo opcional** (só se a tab Custos pedir mais granularidade): adicionar `analytics.cost_today` e `analytics.cost_month_to_date` ao mesmo endpoint. Calculados in-memory a partir das mesmas linhas (`created_at >= startOfDay/startOfMonth`). Sem nova query SQL.

A tab Pedidos continua a chamar `/api/admin/report-requests` (sem alteração).

---

### Ficheiros a modificar

| Ficheiro | Mudança |
|---|---|
| `src/routes/admin.tsx` | substituir o `<Tabs>` actual de 2 abas pelo novo `CockpitShell`; manter token gate, logout, `RequestDetailSheet` |
| `src/components/admin/diagnostics-panel.tsx` | **deprecar** — extrair lógica para os novos sub-componentes e apagar (ou deixar como re-export fino para retrocompatibilidade durante a transição). Não está em LOCKED_FILES |
| `src/routes/api/admin/diagnostics.ts` | só se aceitarmos o ajuste opcional acima — adicionar `cost_today` e `cost_month_to_date` ao bloco `analytics` |

Nada mais é tocado.

---

### Ficheiros a manter intactos (não alterar)

**Locked (LOCKED_FILES.md):** todos os componentes em `/components/landing/*`, `/components/report/*`, `/components/ui/{button,badge,card,input,switch}.tsx`, `/components/layout/*`, `/styles*`, `/routes/__root.tsx`, `/routes/report.example.tsx`, `/routes/privacidade.tsx`, `/routes/termos.tsx`, `/components/legal/*`.

**Não locked mas a preservar:** `/routes/index.tsx`, `/routes/analyze.$username.tsx`, `/routes/api/analyze-public-v1.ts` (camada pública intocada), `/routes/api/admin/report-requests*.ts`, `/components/admin/{request-list,request-detail-sheet,admin-gate,status-badge}.tsx` (já funcionam).

---

### Conteúdo de cada tab

**1. Diagnóstico** — apenas saúde técnica, sem analytics:
- Secrets (3 badges)
- APIFY_ENABLED + APIFY_TESTING_MODE + allowlist
- Custo/perfil e custo/post heurísticos
- Snapshots: total, último username, atualizado, estado, freshness
- Último `recent_events[0]` resumido + último `recent_provider_calls[0]` + último com `error_code != null` se existir

**2. Análises** — `recent_events.rows` (até 20):
- Colunas: `created_at` · `@handle` · `network` · outcome (badge) · data_source (badge) · `duration_ms` · `estimated_cost_usd`
- Filtro client-side por outcome (chips: todos / success / falhas / blocked)

**3. Perfis** — `top_profiles.rows` (até 10):
- Colunas: `@handle` (+ display_name) · network · followers · total · fresh · cache · falhas · custo total · última análise · último outcome
- Ordenável client-side por total / custo / data

**4. Custos** — agregados:
- Cards: "Hoje", "Últimos 7d", "Mês até agora" (USD estimado)
- Card "Calls Apify (7d)" com fresh vs cache
- Card "Poupança estimada pela cache" = `analytics.last_7d.cache × média(cost por evento fresh)`
- Card "Projeção mensal" = `cost_today × 30` (heurística simples, marcada como "estimativa")
- Pequena nota: "Custos baseados em heurística volume-based; valor real do Apify ainda não reconciliado"

**5. Alertas** — `alerts.rows`:
- Sub-secção por severidade (`critical` → `warning` → `info`)
- Cada linha: kind humanizado em PT-PT (`Perfil repetido`, `Falhas elevadas`, `Burst de IP`, `Custo diário acima do limite`, `Snapshot stale servida`) · `@handle` · valor observado vs threshold · `created_at`
- Estado vazio: "Nenhum alerta ativo. Sistema dentro dos limites configurados." + lista dos thresholds em uso (`alert_thresholds`)

**6. Pedidos** — sem alteração.

---

### Ordem de implementação (do menor para o maior)

**Passo 1 (smallest first):** criar `cockpit-formatters.ts` + `cockpit-badges.tsx` + `use-cockpit-data.ts`. Sem efeito visível ainda; só extrai puro do panel actual e adiciona o hook partilhado.

**Passo 2:** criar `cockpit-shell.tsx` com 6 tabs e migrar `/routes/admin.tsx` para o usar. As 5 novas tabs renderizam placeholders ("A migrar…"); a tab Pedidos já funciona.

**Passo 3:** implementar `tab-diagnostico.tsx` (mais simples, dados já disponíveis) e ligar.

**Passo 4:** implementar `tab-analises.tsx`, `tab-perfis.tsx`, `tab-alertas.tsx`. Reutilizam tabelas que já existem no panel actual.

**Passo 5:** implementar `tab-custos.tsx` (e, se preciso, o ajuste opcional ao endpoint para `cost_today` / `cost_month_to_date`).

**Passo 6:** apagar o `diagnostics-panel.tsx` antigo.

---

### Detalhes técnicos

- **Sem novas queries SQL.** Tudo in-memory a partir do payload já existente.
- **Sem novas tabelas / RLS.** As tabelas `social_profiles`, `analysis_events`, `provider_call_logs`, `usage_alerts` já existem com RLS server-only.
- **Sem novas dependências.** Só `react`, `lucide-react` e os componentes UI/admin já presentes.
- **Auth.** Continua via `INTERNAL_API_TOKEN` em cookie HTTP-only — gerido por `AdminGate` + `requireAdminSession`. Não introduzir Supabase Auth/RBAC nesta fase (não é necessário, admin é single-user).
- **i18n.** Toda a copy em pt-PT pós-AO90 (segue regras do workspace).
- **Tokens.** Apenas tokens semânticos do design system (`bg-surface-base`, `text-content-primary`, etc.). Sem cores hardcoded.
- **Mobile-first.** Tabs e tabelas com `overflow-x-auto`, viewport mínimo 375px.
- **Sem PnL real.** Tab "PnL" não está incluída na v1 — placeholder "Em breve" pode entrar como 7ª tab opcional ou ficar fora até billing existir. **Recomendação: ficar fora.**

---

### O que esta v1 NÃO faz

- Não toca em `/`, `/analyze/$username`, `/report.example`, `/privacidade`, `/termos`.
- Não cria endpoints novos (excepto talvez o ajuste opcional ao diagnostics).
- Não implementa email gate, payments, subscriptions, RBAC.
- Não adiciona "Reconhecer alerta" (ack) — fica para v2.
- Não adiciona export CSV — fica para v2.
- Não adiciona auto-refresh (polling) — só botão manual "Atualizar".
- Não cria cron de re-avaliação de alertas — o evaluador inline já cobre 95% dos casos.

---

Aprova para arrancar pelo Passo 1.