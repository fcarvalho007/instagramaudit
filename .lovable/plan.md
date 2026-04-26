## Nota importante antes de começar

O pedido pressupõe que existe um painel **Relatórios** no `/admin` e os endpoints `/api/admin/reports` e `/api/admin/reports/cleanup-expired`. Confirmei na inspeção do código atual que **nenhum desses ficheiros existe**:

- `src/components/admin/cockpit/panels/` tem 6 painéis (alerts, analyses, costs, diagnostics, profiles, requests) — sem `reports-panel.tsx`.
- `src/routes/api/admin/` tem 7 endpoints — sem `reports.ts` nem `reports.cleanup-expired.ts`.
- `src/components/admin/cockpit/cockpit-shell.tsx` declara 6 tabs e nenhuma referência a "Relatórios".
- A única rota de preview é `/admin/report-preview/$username` (por username).

O resumo de uma iteração anterior afirmou que estes ficheiros foram criados, mas na realidade não estão presentes (provável reverter ou nunca foi aplicado). Em vez de "corrigir" código inexistente, vou **criar o painel já com a lógica correta** que pediste — retenção por `updated_at` e link de preview por snapshot id. O resultado final é exatamente o estado-alvo descrito no teu pedido.

Na BD existe atualmente 1 snapshot: `frederico.m.carvalho` (id `311067c4-7de3-44e0-b0ee-d20c3a2d5004`).

## O que vai ficar feito (visível)

1. Novo separador **Relatórios** no cockpit `/admin`, ao lado dos outros 6.
2. Lista os snapshots ativos (≤ 5 dias desde `updated_at`) com badge de estado de retenção (active/expiring/expired).
3. Botão **Limpar relatórios expirados** com contagem real de expirados (mesmo que não estejam na lista), desativado quando count = 0.
4. Botão **Ver relatório** abre a pré-visualização **do snapshot exato** (por id), não a "última do username".
5. Texto explícito a separar **TTL de cache** (técnico) de **retenção** (janela admin de 5 dias).

## Detalhes técnicos

### 1. Novo endpoint `GET /api/admin/reports`
Ficheiro novo: `src/routes/api/admin/reports.ts`

- Gate: `requireAdminSession()`.
- Cliente: `supabaseAdmin` (BYPASS RLS — necessário porque `analysis_snapshots` não tem políticas RLS para o utilizador admin via JWT).
- Query principal: lista snapshots **ativos** (`updated_at >= now() - interval '5 days'`), ordenados `updated_at DESC`. Para cada linha extrai do `normalized_payload` campos seguros para a tabela: `display_name`, `followers`, `posts_analyzed`, `dominant_format`, `avg_engagement_pct` (todos com defaults seguros).
- Query auxiliar: agregação para `expired_summary` em snapshots com `updated_at < now() - interval '5 days'` — `count`, `min(updated_at)`, `max(updated_at)`.
- Para cada linha ativa calcula:
  - `retention_base_at = updated_at`
  - `retention_expires_at = updated_at + 5 dias` (em JS, ISO string)
  - `retention_status`:
    - `active` se `age_days < 4`
    - `expiring` se `4 ≤ age_days < 5`
    - `expired` se `age_days ≥ 5` (não deve aparecer na lista ativa, mas o cálculo é defensivo)
- Resposta:
  ```ts
  {
    success: true,
    reports: ReportRow[],
    expired_summary: {
      count: number,
      oldest_updated_at: string | null,
      newest_updated_at: string | null,
    },
    generated_at: string,
  }
  ```
- Sem chamadas Apify. Apenas leitura à BD.

### 2. Novo endpoint `POST /api/admin/reports/cleanup-expired`
Ficheiro novo: `src/routes/api/admin/reports.cleanup-expired.ts`

- Gate: `requireAdminSession()`.
- Cliente: `supabaseAdmin`.
- DELETE em **`analysis_snapshots` apenas**, condição `updated_at < now() - interval '5 days'`.
- Comentários explícitos no código a listar tabelas que **NÃO** podem ser tocadas: `analysis_events`, `provider_call_logs`, `usage_alerts`, `social_profiles`, `report_requests`, `leads`.
- Resposta: `{ success: true, deleted_count: number }` (usar `.select('id')` para contar exatamente quantas foram eliminadas).

### 3. Novo painel `ReportsPanel`
Ficheiro novo: `src/components/admin/cockpit/panels/reports-panel.tsx`

- Faz fetch a `/api/admin/reports` via `adminFetch` (mesmo helper que os outros painéis usam).
- Renderiza:
  - **Cabeçalho** com cópia de retenção: *"Por sustentabilidade, os relatórios ficam disponíveis durante 5 dias após a geração."* + segunda linha curta a distinguir TTL de cache (técnico, reuso interno) de retenção (janela admin).
  - **Botão "Limpar relatórios expirados (N)"** onde N vem de `expired_summary.count`. Se `count === 0`, botão desativado com tooltip/helper "Sem relatórios expirados". Confirmação via `AlertDialog` antes do POST. Após sucesso, refetch da lista.
  - **Tabela** com colunas: handle, seguidores, posts analisados, formato dominante, eng. médio, **última atualização** (`updated_at`), **expira em** (`retention_expires_at`), badge de **estado de retenção**, link **"Ver relatório"** que aponta para `/admin/report-preview/snapshot/{id}`.
  - `EmptyState` quando `reports.length === 0` mas com mensagem diferente conforme `expired_summary.count > 0` (sugerir limpar) ou não (sem snapshots).

### 4. Nova rota de preview por snapshot id
Ficheiro novo: `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`

- Estrutura espelhada da rota existente `/admin/report-preview/$username` (mesmo `AdminGate`, mesmo `ReportThemeWrapper`, mesmo `ReportPage`, mesma cópia de cobertura/limitações).
- Diferenças:
  - URL `/admin/report-preview/snapshot/$snapshotId`.
  - Faz fetch a um novo endpoint `/api/admin/snapshot-by-id/$snapshotId` (ver ponto 5).
  - Banner com link "Voltar ao cockpit" mantém-se.
- A rota antiga `/admin/report-preview/$username` **continua a existir intacta** (compatibilidade com o link no `ProfilesPanel`).

### 5. Novo endpoint `GET /api/admin/snapshot-by-id/$snapshotId`
Ficheiro novo: `src/routes/api/admin/snapshot-by-id.$snapshotId.ts`

- Gate: `requireAdminSession()`.
- Valida que `snapshotId` é UUID (regex simples) — devolve 400 se não.
- Lê `analysis_snapshots` por `id` (`maybeSingle`) e devolve a mesma forma `SnapshotResponse` que o endpoint por username já usa, para permitir reutilizar a tipagem na rota de preview.
- Não duplico `snapshot.$username.ts`; mantenho-o como está para não quebrar a rota antiga.

### 6. Wire no cockpit
Ficheiro editado: `src/components/admin/cockpit/cockpit-shell.tsx`

- Adicionar tab `"reports"` (label "Relatórios", ícone `FileText` do lucide) ao array `TABS` e ao `TabKey`.
- Adicionar `<TabsContent value="reports">` com `<ReportsPanel />`.
- Sem outras alterações ao layout/header/readiness strip.

## O que NÃO vou tocar

- `/report/example` e `report-mock-data.ts`.
- `src/components/admin/cockpit/panels/profiles-panel.tsx` (mantém o link existente para `/admin/report-preview/$username` se já lá estiver — verifico mas não altero a coluna).
- `/analyze/$username`, landing pública, fluxos PDF/email, `requests-panel.tsx`.
- Endpoints existentes (`snapshot.$username.ts`, `diagnostics.ts`, etc.).
- Schema da BD: **sem migrations**. Tudo se faz com queries de leitura e um DELETE pontual em `analysis_snapshots` no endpoint de cleanup.

## Validação

1. Abrir `/admin` → novo separador **Relatórios** aparece.
2. Lista mostra a linha do `frederico.m.carvalho` com `expira em` ≈ `updated_at + 5 dias`.
3. `expired_summary.count` é 0 (snapshot tem ~1h30 de idade) → botão de cleanup visível mas desativado.
4. Clicar **Ver relatório** → abre `/admin/report-preview/snapshot/311067c4-…` e renderiza o relatório real do snapshot exato.
5. Rota antiga `/admin/report-preview/frederico.m.carvalho` continua a funcionar.
6. `bunx tsc --noEmit` e `bun run build` passam.
7. Sem nenhuma chamada Apify, sem tocar em `analysis_events`/`provider_call_logs`/`usage_alerts`/`social_profiles`.

## Ficheiros

**Criados (5):**
- `src/routes/api/admin/reports.ts`
- `src/routes/api/admin/reports.cleanup-expired.ts`
- `src/routes/api/admin/snapshot-by-id.$snapshotId.ts`
- `src/components/admin/cockpit/panels/reports-panel.tsx`
- `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`

**Editados (1):**
- `src/components/admin/cockpit/cockpit-shell.tsx` (adicionar tab Relatórios)

**Auto-gerado pelo Vite plugin (não tocar manualmente):**
- `src/routeTree.gen.ts`

**Bloqueados (não tocar):**
- `/report/example`, `report-mock-data.ts`, componentes do relatório, fluxos PDF/email, `client.ts`/`types.ts` do Supabase, `.env`.

## Checkpoint

- ☐ Endpoint `GET /api/admin/reports` devolve `reports` + `expired_summary` baseado em `updated_at`.
- ☐ Endpoint `POST /api/admin/reports/cleanup-expired` apaga só `analysis_snapshots` por `updated_at < now() - 5 days`.
- ☐ Painel **Relatórios** aparece no cockpit com botão de cleanup ligado ao `expired_summary.count`.
- ☐ "Ver relatório" navega para `/admin/report-preview/snapshot/{id}`.
- ☐ Nova rota de preview por id renderiza o snapshot exato.
- ☐ Sem Apify, sem migrations, sem tocar em logs/eventos.
- ☐ `bunx tsc --noEmit` + `bun run build` passam.
