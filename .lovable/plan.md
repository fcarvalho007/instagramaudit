Plano para corrigir a biblioteca Admin “Relatórios”

Estado observado
- A tab “Relatórios” já existe.
- Já existe um snapshot ativo para `frederico.m.carvalho`.
- Esse snapshot tem `updated_at = 2026-04-26 18:34:24.984+00` e expira para a biblioteca admin em `updated_at + 5 dias = 2026-05-01 18:34:24.984+00`.
- A rota por snapshot id já existe no código atual, mas vou validar e ajustar o que for necessário para cumprir exatamente a regra pedida.
- Não há necessidade de migrações.

O que vou alterar

1. `GET /api/admin/reports`
- Garantir que a retenção usa sempre `updated_at`, não `created_at`.
- Devolver em cada linha:
  - `retention_base_at = updated_at`
  - `retention_expires_at = updated_at + 5 dias`
  - `retention_status`:
    - `active` se tiver menos de 4 dias
    - `expiring` se tiver entre 4 e 5 dias
    - `expired` se tiver 5 ou mais dias
- Manter a lista principal focada nos relatórios ainda disponíveis: `updated_at >= agora - 5 dias`.
- Adicionar/confirmar `expired_summary` calculado fora da lista principal:
  - `count`: total de snapshots com `updated_at < agora - 5 dias`
  - `oldest_updated_at`
  - `newest_updated_at`
- Melhorar a contagem para não depender de um limite artificial de 1000 linhas, se necessário.

2. `POST /api/admin/reports/cleanup-expired`
- Garantir que elimina apenas linhas de `analysis_snapshots`.
- Usar exclusivamente `updated_at < agora - 5 dias`.
- Não tocar em:
  - `analysis_events`
  - `provider_call_logs`
  - `usage_alerts`
  - `social_profiles`
  - PDF/email/report requests

3. `ReportsPanel`
- Usar `expired_summary.count` como fonte única da contagem do botão de limpeza.
- Quando `expired_summary.count === 0`, manter a ação desativada e mostrar “Sem relatórios expirados.”
- Manter a copy:
  - “Por sustentabilidade, os relatórios ficam disponíveis durante 5 dias após a geração.”
- Adicionar a nota curta pedida:
  - “A cache técnica pode expirar antes; a biblioteca admin mantém o relatório disponível durante 5 dias.”
- Garantir que “Ver relatório” usa o id exato do snapshot da linha.

4. Pré-visualização por snapshot id
- Confirmar/manter a rota admin:
  - `/admin/report-preview/snapshot/$snapshotId`
- Garantir que:
  - requer sessão admin
  - carrega exatamente `analysis_snapshots.id`
  - passa `normalized_payload` pelo `snapshotToReportData`
  - renderiza `<ReportPage data={realReportData} />`
- Manter a rota antiga por username se existir, sem a remover.

5. Validação
- Confirmar que o relatório de `frederico.m.carvalho` continua na tab “Relatórios”.
- Confirmar que a expiração visual é `updated_at + 5 dias`.
- Confirmar que a limpeza conta expirados com base em `updated_at`.
- Confirmar que o link “Ver relatório” aponta para `/admin/report-preview/snapshot/{id}`.
- Não chamar Apify.
- Não apagar eventos/logs/alertas/perfis.
- Correr:
  - `bunx tsc --noEmit`
  - `bun run build`

Ficheiros previstos
- Editar, se necessário:
  - `src/routes/api/admin/reports.ts`
  - `src/routes/api/admin/reports.cleanup-expired.ts`
  - `src/components/admin/cockpit/panels/reports-panel.tsx`
  - `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`
  - `src/routes/api/admin/snapshot-by-id.$snapshotId.ts`
- Não editar:
  - public landing
  - `/analyze/$username` UI
  - `/report/example`
  - fluxos PDF/email
  - ficheiros gerados manualmente
  - ficheiros bloqueados

Checkpoint
☐ Retenção baseada em `updated_at`
☐ `expired_summary` devolvido e usado no botão
☐ Cleanup apenas em `analysis_snapshots`
☐ Link “Ver relatório” baseado em snapshot id
☐ Sem chamadas Apify
☐ Sem migrações
☐ Typecheck e build executados