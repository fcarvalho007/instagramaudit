## Página `/admin/automacoes` — visualização do ciclo de vida beta

Apenas leitura. Sem execução, sem emails, sem providers, sem alterações de schema.

### Fontes inspecionadas

- **Source CRM (referência UX apenas, não copiar)**
  - `src/components/crm/AutomationFlowTab.tsx` (2060 linhas) — extrair só o padrão visual: nó com tag/título/subtítulo, separadores de grupo, ligação vertical entre nós, contagem de elegíveis. Ignorar tudo o que é específico de webinar (templates SMS, day groups, drawer de envio, edge functions, mocks).

- **InstaBench (reutilizar)**
  - `src/lib/admin/lead-lifecycle.ts` — `LIFECYCLE_STATUSES`, `getLifecycleMeta`, `mapEventToSuggestedStatus`, `suggestNextLeadAction`.
  - `src/lib/admin/feedback-intent.ts` — `interpretFeedback` (alto/medio/baixo).
  - `src/routes/api/admin/beta-funnel.ts` — padrão para endpoint admin com `requireAdminSession` + `supabaseAdmin`.
  - `src/components/admin/v2/admin-card.tsx`, `admin-section-header.tsx`, `admin-page-header.tsx`, `admin-badge.tsx` — primitivos do design system.
  - `src/components/admin/v2/admin-tabs-nav.tsx` — adicionar item de navegação.

### Modelo de dados (read-only)

Endpoint novo: `GET /api/admin/automation-flow`

Devolve a definição estática dos 6 fluxos + contagens reais agregadas a partir do Supabase (sem custo, sem providers):

```ts
type AutomationFlow = {
  key: "pedido_recebido" | "relatorio_pronto" | "relatorio_visto"
     | "feedback_pedido" | "feedback_recebido" | "follow_up_comercial";
  title: string;
  description: string;
  trigger: { kind: "form" | "event" | "manual"; label: string };
  action: { kind: "email" | "manual" | "wait" | "classify"; label: string };
  fromStatus: LifecycleStatus | null;
  toStatus: LifecycleStatus | null;
  eligibleCount: number;     // leads em estado "pronto para o próximo passo"
  inFlightCount: number;     // leads já neste estado a aguardar
  completedCount: number;    // leads que já passaram este passo
};
```

Lógica de contagens (uma única query a `leads` + uso do índice ordinal de `LIFECYCLE_STATUSES`):

| Fluxo | Eligible (precisa ação) | In-flight (aguarda) | Completed (já passou) |
|---|---|---|---|
| Pedido recebido | `status = novo_pedido` | — | `status >= em_analise` |
| Relatório pronto | `status = relatorio_gerado` | `status = em_analise` | `status >= link_enviado` |
| Relatório visto | `status = link_enviado` | — | `status >= relatorio_visto` |
| Feedback pedido | `status = relatorio_visto` | `status = feedback_pedido` | `status >= feedback_recebido` |
| Feedback recebido | `status = feedback_recebido` | — | `status >= interessado` |
| Follow-up comercial | `status ∈ {interessado, potencial_cliente}` | — | `status = convertido` |

Tudo derivado de `leads.commercial_status`, comparando o índice em `LIFECYCLE_STATUSES`. Sem joins extra. `arquivado` é ignorado (não conta em nenhuma coluna).

### Ficheiros a criar

1. **`src/routes/api/admin/automation-flow.ts`**
   - `requireAdminSession` + `supabaseAdmin.from("leads").select("commercial_status")`.
   - Agrega para os 6 fluxos. Devolve `{ success, generatedAt, flows: AutomationFlow[] }`.

2. **`src/components/admin/v2/automacoes/automation-flow-page.tsx`**
   - Container. `useQuery(["admin","automation-flow"], adminFetch)`.
   - `AdminPageHeader` + `EligibilitySummary` + lista vertical de `AutomationNode` separados por `AutomationEdge`.
   - Empty state e skeleton.
   - Banner informativo: "Visualização apenas — nenhuma ação executada nesta página".

3. **`src/components/admin/v2/automacoes/automation-node.tsx`**
   - Card branco com: badge de trigger (form/event/manual), título, subtítulo, badge `getLifecycleMeta(toStatus)`, três métricas (`Elegíveis` / `Em curso` / `Concluídos`).
   - Tokens admin (`AdminCard`, `AdminBadge`, `AdminStat`).

4. **`src/components/admin/v2/automacoes/automation-edge.tsx`**
   - Conector vertical simples (linha + chevron) entre nós. Esconder no último.
   - Mobile: mantém vertical, sem overflow.

5. **`src/components/admin/v2/automacoes/eligibility-summary.tsx`**
   - Strip horizontal com KPIs: total de leads ativos, leads à espera de ação admin (soma dos `eligibleCount`), leads em curso, leads concluídos no funil.

6. **`src/routes/admin.automacoes.tsx`**
   - Route file. Renderiza `<AutomationFlowPage />` dentro do shell admin.

### Ficheiros a editar

- **`src/components/admin/v2/admin-tabs-nav.tsx`** — adicionar `{ to: "/admin/automacoes", label: "Automações" }` no grupo **Pipeline** (entre Leads e Pedidos).

### Restrições aplicadas

- Sem botões de execução, sem `mutate`, sem chamadas a edge functions de envio.
- Sem schema changes.
- Sem mock data — se `flows` vier vazio (zero leads), mostra empty state real.
- Sem Apify, sem Resend, sem AI gateway.
- Tudo em pt-PT, tokens admin, mobile-first.

### Validação

- `bunx tsc --noEmit` → 0 erros.
- `bunx vitest run` → suite atual continua a passar (163/163).
- Manual:
  - `/admin/automacoes` carrega com sessão admin.
  - Contagens batem aproximadamente com colunas do Kanban (`/admin/beta-leads`).
  - Layout legível a 375px (nós empilhados, métricas em coluna).
  - Inspeção da rede: apenas `GET /api/admin/automation-flow`, sem chamadas a providers.

### Entregáveis no fim

- Lista de ficheiros inspecionados (acima).
- Lista de ficheiros criados/editados.
- Resultado de `tsc` e `vitest`.
- Print mental da árvore de chamadas (apenas o endpoint novo).