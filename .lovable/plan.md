## Cleanup automático de relatórios expirados — Plano (sem implementação)

### 1. Auditoria — onde vivem os dados

| Tabela / store | Conteúdo | Dimensão hoje | Toca no negócio? |
|---|---|---|---|
| `analysis_snapshots` | payload completo do scrape + enrichments | 4 linhas, mais antiga 12d | **NÃO** — só cache. Limpar liberta MBs |
| `report_requests` | metadata do pedido (handle, status, snapshot_id, pdf_path, lead_id) | 9 linhas | **SIM** (lead/funnel/PnL). Manter sempre |
| storage `report-pdfs` | PDF gerado por snapshot | 2 ficheiros | **NÃO** após 15d (regerável) |
| `provider_call_logs` | custo + resultado de cada call Apify/OpenAI/DFS | 127 linhas | **SIM** — fonte de verdade de custos. Manter |
| `analysis_events` | 1 linha por análise (handle, outcome, snapshot_id, custo estimado) | 1 440 linhas | **SIM** — métricas agregadas / abuse detection. Manter |
| `product_events` | telemetria UX (lead_id, handle, snapshot_id) | 318 linhas | **SIM** lightweight — manter, opcional anonimizar |
| `usage_alerts`, `social_profiles`, `leads`, `beta_feedback`, `provider_billing_*`, `cost_daily` | auditoria, agregados, billing | — | **NUNCA** apagar |

Estado actual do cleanup: `/api/admin/reports/cleanup-expired` já elimina `analysis_snapshots` com `updated_at < now() − 15d` (constante centralizada). **Apenas snapshots**, manual, admin-only. Não toca em PDFs nem em `report_requests`.

### 2. Política proposta — 3 fases

**Fase A — Soft-expire (já garantida pela retenção)**
- `expires_at` em `analysis_snapshots` + `getReportExpiresAt()` para `report_requests`
- UI já distingue "Disponível", "Expira em N dias", "Expirado"
- **Sem cleanup destrutivo** — só sinalização

**Fase B — Hard-delete de artefactos pesados (após 15 dias)**
1. `analysis_snapshots`: `delete where updated_at < now() − 15d` (já existe).
2. `storage.report-pdfs`: apagar objectos cujo `report_requests.pdf_generated_at < now() − 15d`.
3. `report_requests.pdf_storage_path = NULL` + `pdf_status = 'expired'` para a mesma janela.
4. `report_requests.analysis_snapshot_id`: **manter** o UUID como histórico mesmo após o snapshot ser apagado (FK lógica órfã aceitável; UI mostra "Expirado").

**Fase C — Anonimização opcional (após 90d)**
- `product_events`: zerar `actor_hash`, `lead_id` para entradas > 90d, mantendo `event_type` + agregados.
- Não tocar em `analysis_events` / `provider_call_logs` (necessários para PnL histórico).

### 3. O que se mantém como histórico leve em `report_requests`

Sobrevive sempre, mesmo após o snapshot ser apagado:

```
id, instagram_username, competitor_usernames, created_at, updated_at,
request_status, delivery_status, pdf_status (passa a 'expired'),
analysis_snapshot_id (UUID órfão, marcador de identidade),
lead_id, user_id, request_source, request_month, is_free_request,
metadata (sem payload bruto)
```

Permite contar relatórios/mês, ligar ao lead, calcular PnL. Sem payload, custo de armazenamento desprezável.

### 4. Arquitectura de execução

**Endpoint**: estender `/api/admin/reports/cleanup-expired` (mesma rota, mesmo guard admin) para devolver:

```json
{
  "dry_run": true,
  "cutoff_at": "...",
  "snapshots": { "to_delete": 12 },
  "pdfs": { "to_delete": 8, "bucket": "report-pdfs" },
  "report_requests": { "to_mark_expired": 8 }
}
```

Adicionar parâmetro `?dry_run=1` (default) que conta sem apagar e `?dry_run=0` que executa. Mantém compatibilidade com chamada admin manual actual.

**Scheduler**: `pg_cron` diário às 03:00 UTC (baixo tráfego), via `pg_net.http_post` para a rota com header `apikey: <anon>`. Rota interna verifica via `INTERNAL_API_TOKEN` para evitar trigger externo arbitrário (já existe noutras rotas admin do projecto).

```
0 3 * * *  →  POST /api/public/hooks/cleanup-expired-reports  (dry_run=0)
```

Por que rota dedicada `/api/public/hooks/...` em vez da admin: `pg_cron` não pode passar pela sessão admin Google. A nova rota fica em `/api/public/*` mas valida `INTERNAL_API_TOKEN` no header — padrão idêntico ao usado em `refresh-profile`.

**Observabilidade**:
- log JSON estruturado por execução (counts + cutoff)
- inserir 1 linha em `analysis_events` com `data_source='cleanup'`, `outcome='success'|'failure'` (ou nova tabela `maintenance_runs` se quisermos isolar)
- alerta admin (toast/badge no `/admin/sistema`) se `error` ou se delete > N (default 100) — defesa contra runaway

### 5. Rollback / safety

- **Rollback de snapshots apagados**: impossível (payload bruto perdido). Mitigação: `report_requests` mantém `analysis_snapshot_id` + metadata; UI mostra "Expirado, gerar novo". Antes da 1ª execução produtiva, fazer `pg_dump` de `analysis_snapshots` (one-shot manual).
- **Rollback de PDFs apagados**: regeráveis a partir de `analysis_snapshots`… mas só se o snapshot ainda existir. Fora da janela, regeração via `Atualizar agora` no admin (custo Apify).
- **Kill switch**: setting em `app_config` `cleanup_enabled=false` bloqueia o cron (lido pela rota antes de qualquer delete). Default `false` até validação manual.
- **Dry-run obrigatório nas 1ªs N execuções**: cron começa com `?dry_run=1`, validamos counts ≥ 7 dias, depois flip para `dry_run=0`.

### 6. Checklist de segurança pré-execução

- ☐ `app_config.cleanup_enabled` existe e está `false`
- ☐ `pg_dump` manual de `analysis_snapshots` arquivado (one-shot)
- ☐ Política valida `created_at + 15 days < now()` (não `updated_at` para PDFs — alinha com `pdf_generated_at`)
- ☐ DELETE só em `analysis_snapshots` + `storage.report-pdfs` + UPDATE em `report_requests` (nunca DELETE em `report_requests`, `leads`, `provider_call_logs`, `analysis_events`, `usage_alerts`, `social_profiles`, billing tables)
- ☐ Rota guarda `INTERNAL_API_TOKEN`
- ☐ Limite máximo por execução (LIMIT 500) para evitar lock
- ☐ Logs persistidos
- ☐ Alerta admin se delete > threshold

### 7. Tabelas afetadas (resumo)

| Tabela | Acção | Critério |
|---|---|---|
| `analysis_snapshots` | DELETE | `updated_at < now() − 15d` |
| `storage.report-pdfs` | DELETE objecto | `pdf_generated_at < now() − 15d` |
| `report_requests` | UPDATE (`pdf_storage_path=NULL`, `pdf_status='expired'`) | mesma janela |
| `product_events` (Fase C) | UPDATE (anonimizar) | `created_at < now() − 90d` |
| Todas as restantes | **NUNCA** tocar | — |

### 8. Prompt de implementação (para usar mais tarde)

> Implementa o cleanup automático de relatórios expirados conforme `.lovable/plan.md`:
> 1. Adiciona `cleanup_enabled` em `app_config` (default `'false'`).
> 2. Cria `/api/public/hooks/cleanup-expired-reports` (POST, valida `INTERNAL_API_TOKEN`, suporta `?dry_run=0|1`, default `1`). Executa nesta ordem: (a) listar snapshots cujo `updated_at < now − CACHE_TTL_DAYS`, (b) para cada snapshot listar `report_requests.pdf_storage_path` correspondente, (c) apagar objectos do bucket `report-pdfs`, (d) UPDATE `report_requests` (`pdf_storage_path=NULL`, `pdf_status='expired'`), (e) DELETE `analysis_snapshots`. Limite 500/run. Devolve counts.
> 3. Mantém `/api/admin/reports/cleanup-expired` como wrapper manual (admin) que chama a mesma lógica.
> 4. Cria cron `pg_cron` diário 03:00 UTC com `dry_run=1` durante 7 dias; activa `dry_run=0` depois.
> 5. Logs estruturados; insere 1 linha em `analysis_events` (`data_source='cleanup'`).
> 6. Painel `/admin/sistema`: card "Última limpeza" (timestamp, counts, status).
> 7. Testes: dry-run não apaga; execução real apaga só snapshots > 15d e marca PDFs; NUNCA apaga `report_requests`, `provider_call_logs`, `analysis_events`, `leads`, billing.
> 8. Validação `bunx tsc --noEmit` + `bunx vitest run`.

### Constrangimentos respeitados

- ☐ Plan only — sem migrations, sem código, sem deletes
- ☐ Sem chamadas a providers
- ☐ Sem alterações de UI
