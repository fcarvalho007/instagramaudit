## Diagnóstico

A secção **Produto** mostra dados parcialmente falsos porque mistura dois conceitos:

- `analysis_snapshots` (7 linhas) — toda a análise que tu ou um visitante corre.
- `report_requests` (3 linhas) — apenas quando alguém preenche o gate de email e desbloqueia o PDF.

Hoje **/admin/relatorios lê só `report_requests`**, por isso as análises recentes (`100xengineers`, `martimsilvai`, `karmel`, etc.) **não aparecem** na lista, no pipeline, nem nas métricas. /admin/perfis lista os 22 perfis (correto), mas a coluna "reports" e a taxa de conversão também derivam só de `report_requests`, dando a impressão de que quase nada converte.

Adicionalmente, o `PeriodSelect` (7d / 30d / 90d / YTD) está renderizado mas **não é enviado para nenhum endpoint** — está tudo hard-coded a 30 dias.

### Dados reais agora

| Fonte                | Linhas | Notas                                                  |
|----------------------|--------|--------------------------------------------------------|
| `analysis_snapshots` | 7      | lg_portugal, 100xengineers, robs.cortez, martimsilvai, karmel_loja_, karmel, frederico.m.carvalho |
| `report_snapshots`   | 3      | só os 3 unlocked com email                             |
| `report_requests`    | 3      | só `request_source = public_unlock`                    |
| `social_profiles`    | 22     | inclui handles testados sem unlock                     |

## Plano

### 1. Redefinir "Relatórios" como `analysis_snapshots ⟕ report_requests`

A unidade verdadeira de produto é a análise. O envio de PDF por email é apenas uma fase opcional.

- **`/api/admin/report-requests`** (lista): passar a fazer LEFT JOIN `analysis_snapshots → report_requests`, devolvendo uma linha por análise. Quando existe `report_request`, mostramos email/PDF/lead; quando não existe, mostramos estado "análise pública (sem email)".
- **`/api/admin/report-requests/pipeline`**: ampliar o pipeline para 5 fases reais:
  1. Análise gerada (snapshot pronto, sem email)
  2. Email submetido (lead criado, unlock iniciado)
  3. PDF gerado
  4. Email entregue
  5. Falhado (qualquer fase)
- **`/api/admin/report-requests/metrics`**: KPIs passam a contar análises totais, % com unlock (conversão lead→email), % com PDF entregue, custo médio por análise.
- **`/api/admin/report-requests/daily`**: barras empilhadas por análise/dia, com segmento "com unlock" vs "sem unlock".

### 2. Corrigir /admin/perfis

- A coluna `reports` em `profiles.list` passa a contar `analysis_snapshots` por handle (não `report_requests`). A "conversão" passa a ser % de análises que tiveram unlock — mais coerente com o pipeline acima.
- `profiles.metrics` aplica a mesma lógica: `unique_profiles_30d` cruzado com `analysis_snapshots`, não `social_profiles.last_analyzed_at` (que conta também cache hits).

### 3. Ligar o PeriodSelect aos endpoints

Cada um dos 6 endpoints acima aceita `?period=7d|30d|90d|ytd` e calcula `since` a partir disso. Os componentes passam o estado `period` no `queryKey` e na URL. Default mantém-se 30d.

### 4. Etiquetas na UI

- /admin/relatorios → subtítulo passa a "Análises geradas, com ou sem envio de PDF por email"
- Tabela ganha uma coluna "Origem" com chip (análise pública / unlock email / beta form / market study).
- /admin/perfis → tooltip explícito a dizer que "Reports = análises realizadas; Unlock = pediram PDF por email".

### Out of scope

- Não mexer em `/report.example`.
- Não criar nova rota; só refactor dos endpoints existentes + leitura.
- Sem alterações ao gate público nem aos formulários.

### Ficheiros tocados

Backend (6 endpoints):
- `src/routes/api/admin/report-requests.ts`
- `src/routes/api/admin/report-requests.pipeline.ts`
- `src/routes/api/admin/report-requests.metrics.ts`
- `src/routes/api/admin/report-requests.daily.ts`
- `src/routes/api/admin/profiles.list.ts`
- `src/routes/api/admin/profiles.metrics.ts`

Frontend (8 componentes — passar `period` e re-tipar):
- `src/routes/admin.relatorios.tsx`, `src/routes/admin.perfis.tsx`
- `src/components/admin/v2/relatorios/{pipeline,metrics,charts,reports-table}-section.tsx`
- `src/components/admin/v2/perfis/{metrics,top-profiles,profiles-table,intent-opportunities}-section.tsx`

### Checkpoint

☐ Endpoints devolvem 7 análises (não 3) em /admin/relatorios  
☐ Pipeline mostra 5 fases (não 4) com contagens reais  
☐ /admin/perfis mostra `reports = analyses_total` por handle  
☐ PeriodSelect altera os números visíveis  
☐ Tabela de relatórios ganha coluna "Origem"