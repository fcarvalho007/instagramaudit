# Prompt R2 — Tab Conhecimento no /admin

Construir uma nova tab editorial `/admin/conhecimento` que arma a Knowledge Base (benchmarks, fontes, notas), com schema, auditoria e endpoint privado prontos para o R3 ligar à geração de insights do `/report`.

## Decisões necessárias (5 colisões com a base existente)

Estas decisões precisam de aprovação antes de avançar — cada uma altera o resultado final.

### 1. Cor do sublinhado da tab activa
O `AdminTabsNav` actual é **deliberadamente mono** (sublinhado `text-admin-text-primary`), com comentário no código a justificar: *"Reduz ruído visual e foco no que importa. A cor temática vive dentro da tab, na barra do AdminSectionHeader."*

O R2 pede sublinhado **azul `#185FA5`** quando a tab Conhecimento está activa. Opções:
- (a) **Manter mono na nav**, aplicar `accent="info"` (azul) apenas nas barras das 4 secções → coerente com o resto do admin.
- (b) Adicionar suporte por-tab a uma cor, e dar Conhecimento o azul → quebra a regra mono e abre porta a colorir as outras tabs depois.
- (c) Hard-code só Conhecimento com azul → exceção visual estranha.

**Recomendação: (a).** É consistente com o sistema existente sem perder a identidade azul "info" da tab.

### 2. Edge Function vs TanStack server route
O R2 fala em "Edge function `knowledge-context` privada". Este projecto **não usa Supabase Edge Functions** — toda a backend lógica vive em `src/routes/api/...` (TanStack server routes) e em `*.server.ts` (helpers). A regra do template é explícita: *"Do NOT use Supabase Edge Functions"*.

**Recomendação:** Implementar como TanStack server-only helper `src/lib/knowledge/context.server.ts` exportando `getKnowledgeContext({ tier, format, vertical? })`. Sem rota HTTP pública. Será chamado directamente pelo orquestrador de insights (`src/lib/insights/openai-insights.server.ts`) no R3. Mais seguro: zero superfície HTTP.

### 3. SQL `get_knowledge_context()` + helper TS
O R2 define ambos. Faz sentido manter os dois com responsabilidades distintas:
- **SQL function** `get_knowledge_context(p_tier, p_format, p_vertical)` (SECURITY DEFINER) → join e agregação em uma só query.
- **TS helper** `getKnowledgeContext(...)` → invoca a SQL function via `supabaseAdmin.rpc(...)`, formata para o shape do prompt, lida com fallbacks.

Isto evita lógica de join no TS e centraliza a query de leitura em SQL.

### 4. FKs para `auth.users`
O R2 propõe `created_by uuid references auth.users(id)`. A regra do projecto:
> *"NEVER use a foreign key reference to the auth.users table"*.

Além disso, o admin é identificado por email (allowlist), não por user_id. **Recomendação:** substituir `created_by uuid references auth.users(id)` por `created_by_email text` em todas as 4 tabelas que tinham essa FK (`knowledge_benchmarks`, `knowledge_notes`, `knowledge_history`, `knowledge_suggestions`). Preenchido a partir de `requireAdminSession().email`.

### 5. RLS
O R2 diz "leitura permitida a service role + emails na admin allowlist". Service role **bypassa RLS**, e o admin allowlist é verificado server-side (não em RLS). O padrão consistente com o resto do projecto é:

- `ENABLE ROW LEVEL SECURITY` em todas as 5 tabelas.
- **Sem policies** → ninguém com chave anónima ou autenticada consegue ler/escrever.
- Acesso 100% server-side via `supabaseAdmin` depois de `await requireAdminSession()`.

É o mesmo modelo já usado em `analysis_snapshots`, `provider_call_logs`, etc.

## Plano (assumindo as 5 decisões recomendadas acima)

### Fase A — Schema e dados (migration)

Uma migration única `supabase/migrations/<timestamp>_knowledge_base.sql`:

1. **Tabelas** (5):
   - `knowledge_sources` — cria primeiro (referenciado pelas outras).
   - `knowledge_benchmarks` (com FK para `knowledge_sources`).
   - `knowledge_notes` (com FK para `knowledge_sources`).
   - `knowledge_history` (entity_type + entity_id + action + diff jsonb).
   - `knowledge_suggestions` (payload jsonb + status).

   Diferenças vs spec:
   - `created_by_email text` em vez de FK `auth.users`.
   - Sem `default auth.uid()` (preenchido server-side).
   - `format` enum aceita `reels|carousels|images` (igual ao R2).
   - `tier` enum aceita `nano|micro|mid|macro`.

2. **Indexes** conforme spec.

3. **RLS**: `ENABLE ROW LEVEL SECURITY` nas 5 tabelas, **sem policies** (denyall implícito, igual ao resto).

4. **Trigger de auditoria**: função `public.knowledge_log_change()` invocada por triggers `AFTER INSERT/UPDATE/DELETE` em `knowledge_benchmarks`, `knowledge_sources`, `knowledge_notes`. O trigger insere em `knowledge_history` o diff (campos alterados em jsonb) com `entity_type`, `entity_id`, `action` derivado do `TG_OP`. `changed_by_email` lido a partir de uma `current_setting('app.current_admin_email', true)` que o helper TS define com `SET LOCAL` antes da operação.

5. **SQL function** `get_knowledge_context(p_tier text, p_format text, p_vertical text default null)` (SECURITY DEFINER, search_path public): devolve `jsonb` com a estrutura exigida (benchmarks vigentes para tier+format, notas relevantes para a categoria/vertical, metadata com last_updated e total_entries).

6. **Seed**: insert dos 12 benchmarks, 4 fontes e 6 notas conforme tabelas mock do R2 (origem `manual`, `valid_from='2026-01-01'`, `valid_to='2026-03-31'`). 1 dos benchmarks Macro Reels com `origin='system_approved'`. **3 entradas mock em `knowledge_suggestions` com `status='pending'`** para popular o KPI "Pendentes · 3".

### Fase B — Helper server-side

`src/lib/knowledge/context.server.ts`:
- `getKnowledgeContext({ tier, format, vertical? })` → chama `supabaseAdmin.rpc("get_knowledge_context", { p_tier, p_format, p_vertical })`. Devolve o JSON exigido pela spec (`benchmarks[]`, `notes[]`, `metadata{}`).
- Helpers para serializar em texto para o prompt do GPT (já preparado para o R3, mas ainda não wired).

`src/lib/knowledge/queries.server.ts`:
- `listBenchmarks({ format? })`, `listSources()`, `listNotes()`, `listSuggestions()`, `getKnowledgeOverview()` (KPIs).
- `upsertBenchmark`, `archiveBenchmark`, `createSource`, `createNote` — todos com `await setAdminEmailOnSession(adminEmail)` antes da operação para o trigger capturar o autor.
- Helpers chamados pelas server routes do passo seguinte.

### Fase C — Endpoints admin (TanStack server routes)

Novos ficheiros em `src/routes/api/admin/`, todos protegidos por `await requireAdminSession()`:

- `knowledge.overview.ts` — GET → 4 KPIs (total_entries, tier_coverage, last_updated, pending_suggestions).
- `knowledge.benchmarks.ts` — GET (lista, filtro por formato), POST (criar/atualizar).
- `knowledge.benchmarks.$id.ts` — PATCH (editar), DELETE → arquivar (set valid_to=hoje).
- `knowledge.sources.ts` — GET, POST.
- `knowledge.notes.ts` — GET, POST.
- `knowledge.notes.$id.ts` — PATCH, DELETE (archive).
- `knowledge.export.ts` — GET → JSON dump completo da KB para o botão "Exportar dataset".

Sem endpoint público — `knowledge-context` é apenas helper TS.

### Fase D — UI da tab

#### D.1 Adicionar a tab à navegação
Editar **`src/components/admin/v2/admin-tabs-nav.tsx`** (não locked) e **`src/routes/admin.tsx`** (não locked):
- Adicionar entry `{ to: "/admin/conhecimento", label: "Conhecimento" }` **entre Sistema e Visão geral** (ordem decisão: o R2 diz "entre Sistema e qualquer outra tab existente" — interpreto como **antes de Sistema**, depois de Perfis, mantendo Sistema como última).
- Sublinhado mantém mono (Decisão 1.a).

#### D.2 Rota e componentes
- `src/routes/admin.conhecimento.tsx` — página principal: `AdminPageHeader` + `<KnowledgeOverviewSection>` + `<KnowledgeBenchmarksSection>` + `<KnowledgeSourcesSection>` + `<KnowledgeNotesSection>` separadas por 56px.
- `src/components/admin/v2/conhecimento/`:
  - `overview-section.tsx` — 4 `KPICard size="lg"` com tooltips (todos `accent="info"`).
  - `benchmarks-section.tsx` — `AdminSectionHeader accent="info"` + `FilterPills` (Todos/Reels/Carrosséis/Imagens) + `AdminCard` com tabela 8 colunas. Linhas clicáveis abrem drawer.
  - `benchmark-drawer.tsx` — usa `Sheet` (mesmo padrão de `report-drawer.tsx`), 640px, edição completa de 1 benchmark + histórico colapsado.
  - `sources-section.tsx` — tabela 8 colunas + botão "+ Adicionar fonte" abre `source-create-dialog.tsx`.
  - `source-create-dialog.tsx` — modal com formulário (Nome, Tipo, URL, Data publicação, Amostra, Notas).
  - `notes-section.tsx` — lista de cartões editorial cada um com badge da categoria (cores: Tendência=expense, Formato=info, Algoritmo=danger, Vertical=leads, Ferramenta=neutral).
  - `note-create-dialog.tsx` — modal para criar nota (do botão "+ Nova entrada" no header da página, com selector "benchmark / fonte / nota" no topo).

Todos os componentes consomem dados via `fetch("/api/admin/knowledge.*")` com header `Authorization: Bearer <jwt>` (padrão já existente em `src/lib/admin/fetcher.ts`).

#### D.3 Mocks vs dados reais
A migration faz seed dos dados mock do R2. A UI consome os endpoints reais → ao clicar/editar, mexe no Supabase a sério. Sem mock-data files — única fonte de verdade é a BD.

### Fase E — Validação
- `bunx tsc --noEmit` (passa).
- `bun run build` (passa).
- Smoke: navegar para `/admin/conhecimento`, ver 4 KPIs com `47 / 4-de-4 / há X dias / 3`, ver 12 linhas de benchmarks, abrir drawer numa linha, ver 4 fontes, ver 6 notas.

## Não fazer

- Não tocar no `/report` (R3).
- Não tocar nas tabs existentes (`visao-geral`, `receita`, `clientes`, `relatorios`, `perfis`, `sistema`).
- Não tocar no cockpit legado.
- Não implementar o job automático de sugestões (só seed de 3 mock).
- Não wirar o `getKnowledgeContext` ao `openai-insights.server.ts` (R3).
- Não criar Edge Functions Supabase.

## Ficheiros tocados

```text
NOVO  supabase/migrations/<ts>_knowledge_base.sql      (5 tables + trigger + rpc + seed)
NOVO  src/lib/knowledge/context.server.ts              (helper para R3)
NOVO  src/lib/knowledge/queries.server.ts              (CRUD helpers)
NOVO  src/routes/api/admin/knowledge.overview.ts
NOVO  src/routes/api/admin/knowledge.benchmarks.ts
NOVO  src/routes/api/admin/knowledge.benchmarks.$id.ts
NOVO  src/routes/api/admin/knowledge.sources.ts
NOVO  src/routes/api/admin/knowledge.notes.ts
NOVO  src/routes/api/admin/knowledge.notes.$id.ts
NOVO  src/routes/api/admin/knowledge.export.ts
NOVO  src/routes/admin.conhecimento.tsx
NOVO  src/components/admin/v2/conhecimento/
        overview-section.tsx
        benchmarks-section.tsx
        benchmark-drawer.tsx
        sources-section.tsx
        source-create-dialog.tsx
        notes-section.tsx
        note-create-dialog.tsx
EDIT  src/components/admin/v2/admin-tabs-nav.tsx       (+ Conhecimento)
EDIT  src/routes/admin.tsx                              (sem alteração visual; só validação)
```

## ☐ Checkpoint

Antes de implementar, preciso de confirmação explícita nas 5 decisões:

- [ ] **Cor da tab**: (a) manter mono na nav e usar azul só nas barras de secção?
- [ ] **Edge Function**: aceitas substituir por TanStack server-only helper (sem rota HTTP)?
- [ ] **SQL function + helper TS**: aceitas que ambos coexistam (SQL faz join, TS chama RPC)?
- [ ] **FKs `auth.users`**: aceitas trocar por `created_by_email text` em todas as 4 tabelas?
- [ ] **RLS**: aceitas o padrão "RLS on, sem policies, acesso só via `supabaseAdmin` server-side"?

Sim a tudo → avanço com a implementação na próxima ronda.
Discordância em algum ponto → reformulo o plano antes de começar.
