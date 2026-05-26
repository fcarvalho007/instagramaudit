## Objectivo
Fechar o build vermelho deixado a meio: três componentes ainda não estão alinhados com as novas shapes (`analysis_snapshots` como fonte única + filtro `period`).

---

## 1. `ChartsSection` (`src/components/admin/v2/relatorios/charts-section.tsx`)

O endpoint `report-requests.daily` já devolve `volume = { day, analyses, with_unlock, delivered, failed }` (sem `queued`). Componente ainda lê `queued`.

- Actualizar tipo `DailyApi.volume` para `{ day, analyses, with_unlock, delivered, failed }`.
- BarChart (Volume diário): empilhar `delivered` + `failed`; adicionar duas linhas/áreas leves de contexto:
  - `analyses` como `Line` cinza fina (total de análises feitas).
  - `with_unlock` como `Bar` translúcido por trás (ou `Line` accent) — relatórios desbloqueados por email.
- Remover `Bar dataKey="queued"`. Reutilizar `ADMIN_LITERAL.chartDelivered` / `chartFailed`; usar `chartTiming` para a linha `analyses` (ou criar token novo `chartAnalyses` se já existir paleta — confirmar em `admin-tokens` antes; caso não exista, reusar um existente sem criar token novo).
- Subtítulo dinâmico: substituir "últimos 30 dias" por mapping de `period` (`7d` → "últimos 7 dias", `30d` → "30 dias", `90d` → "90 dias", `ytd` → "desde 1 Jan").
- `period` já é prop e já entra na queryKey — manter.

## 2. `ReportsTableSection` (`src/components/admin/v2/relatorios/reports-table-section.tsx`)

O endpoint `report-requests` agora devolve linhas com `kind: "snapshot" | "request"` (snapshots = análises sem unlock por email). UI ainda assume só `request`.

- Estender `ReportRow` com `kind: "snapshot" | "request"`, `request_source: string` (já tipo) e tornar `is_free_request` independente.
- Adicionar **coluna "Origem"** entre Perfil e Estado:
  - `kind === "snapshot"` → `<AdminBadge variant="info">análise pública</AdminBadge>`
  - `kind === "request"` → mostrar `request_source` formatado (`public_dashboard`, `lead_magnet`, etc.) num badge subtil + badge `grátis/pago` por baixo (manter a info actual).
  - Remover a coluna independente "Origem" que hoje só mostra `grátis/pago` — fundir as duas dimensões nesta única coluna.
- Estado para `kind: "snapshot"`: nova badge `<AdminBadge variant="muted">análise</AdminBadge>` (sem "entregue/falhou/a processar").
- Lead column: `kind: "snapshot"` mostra "—" em ambas linhas (já compatível porque `lead` vem `null`).
- Duração: para `snapshot` devolver `—`.
- Acção "Ver detalhe": esconder o botão `<Eye>` quando `kind === "snapshot"` (renderizar célula vazia). `ReportDrawer` continua a ler por `id` (que para snapshots não existe em `report_requests`).
- Filtro "in_progress" client-side: passar a usar `r.kind === "request" && deriveStatus(r) === "processing"`.
- Filter pill "Todos" inclui snapshots; considerar adicionar pill "Só com email" (filtra `kind === "request"`) — fica como nota para próximo turno se quisermos manter o âmbito enxuto. **Não implementar agora.**
- `period` já é prop e já entra na queryKey + URL — manter.

## 3. `/admin/perfis` + `profiles.list` + `profiles.metrics`

Mudar fonte de "reports por handle" de `report_requests` para `analysis_snapshots` (para uma análise contar mesmo sem email) e aceitar `period`.

### 3a. `src/routes/api/admin/profiles.metrics.ts`
- Aceitar `?period=` via `resolvePeriod` (default 30d).
- Substituir o set de handles de reports: passar a contar quantos `analysis_snapshots` distintos por handle na janela; `profiles_with_report_<period>` = perfis únicos com snapshot na janela que também têm snapshot anterior OU directo conforme regra actual.
  - Definição concreta: `profiles_with_report` = perfis em `social_profiles` cujo `lower(handle)` aparece em `analysis_snapshots` (na janela). Como `analysis_snapshots` é a fonte da unidade-produto, isto reflecte "perfis com relatório gerado na janela".
- Substituir `window_days: 30` e keys `*_30d` por keys parametrizadas (`window_days`, `unique_profiles`, `profiles_with_report`) — actualizar `MetricsSection` em conformidade.
- `unique_profiles` na janela = `count(distinct lower(instagram_username))` em `analysis_snapshots` desde `sinceISO` (mais fiável que `social_profiles.last_analyzed_at`).

### 3b. `src/routes/api/admin/profiles.list.ts`
- Aceitar `?period=`.
- Substituir o `from("report_requests").select("instagram_username, ...")` por `from("analysis_snapshots").select("instagram_username, created_at").gte("created_at", sinceISO)`.
- `reports` por handle = nº de snapshots na janela. `conversion_pct` mantém semântica (`reports/analyses`) mas com numerador vindo de snapshots na janela e denominador `analyses_total` (lifetime) — documentar em comentário que mistura escalas; alternativa: mudar denominador para também ser da janela. **Decisão**: usar **ambos** da janela para coerência (`analyses_in_window` count + `reports_in_window` count) e renomear conversão para "% perfis com snapshot na janela". Substituir `analyses` (lifetime) por `analyses_in_window` no payload. Manter `analyses_fresh/cache` lifetime apenas como contexto secundário.
- `counts` (`all/with_reports/repeated/no_conversion`) recalcular sobre a nova métrica de janela.

### 3c. `src/routes/admin.perfis.tsx`
- Passar `period` como prop a `MetricsSection`, `TopProfilesSection`, `IntentOpportunitiesSection`, `ProfilesTableSection`. **Âmbito deste turno**: ligar `period` apenas em `MetricsSection` e `ProfilesTableSection` (os dois que tocamos). `TopProfilesSection` e `IntentOpportunitiesSection` ficam fora — anotar nota inline para próximo turno.

### 3d. `src/components/admin/v2/perfis/metrics-section.tsx`
- Aceitar `period: AdminPeriod`.
- Actualizar tipo `MetricsApi` para novas keys (`unique_profiles`, `profiles_with_report`, `window_days`).
- Mapear subtítulos/eyebrows para reflectir período seleccionado (helper local `periodLabel(period)`).
- queryKey: `["admin", "profiles", "metrics", period]`; URL `?period=${period}`.

### 3e. `src/components/admin/v2/perfis/profiles-table-section.tsx`
- Aceitar `period: AdminPeriod`.
- queryKey + URL com `period`.
- Renomear coluna "Análises" para continuar a chamar-se "Análises" mas ler `analyses_in_window`. Subtítulo do header dinâmico ("X perfis com snapshot em <período>").

---

## Fora de âmbito (próximo turno)
- `TopProfilesSection`, `IntentOpportunitiesSection` — também precisam de `period` e da nova fonte; deixar comentário `// TODO(period)` onde forem invocados.
- Drawer mostrar snapshots sem `request_id`.
- Pill "Só com email" no relatórios.
- CSV export de `/admin/perfis` (continua mock).

## Checkpoint final
- ☐ Build TypeScript verde (`bun run build` corre sem erros)
- ☐ `/admin/relatorios` com seletor 7d/30d/90d/ytd:
  - Charts mostra `delivered + failed` empilhados + linha `analyses`
  - Tabela mostra coluna "Origem" com `análise pública` para `kind:"snapshot"` e sem botão "Ver detalhe" nessas linhas
- ☐ `/admin/perfis` com seletor de período:
  - KPIs reflectem snapshots na janela
  - Tabela mostra `analyses_in_window` e `reports` baseado em snapshots
- ☐ `rg "queued" src/components/admin/v2/relatorios` retorna vazio
- ☐ `rg "report_requests" src/routes/api/admin/profiles.*.ts` retorna vazio
