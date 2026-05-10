## Avaliação do estado atual

### ✅ Concluído
- **Auditoria de consolidação Brevo/Resend** — Brevo primário, Resend fallback, contacts sync ativo
- **`RESEND_FROM` configurado** (`relatorios@instagramaudit.pt`)
- **Fix P0** no `UnlockModal` (`instagram_username` agora propagado em `analyze.$username.tsx`)
- **Smoke test real executado** com `frederico.carvalho@digitalfc.pt` no snapshot `martimsilvai`:
  - Lead `3d12d5d7-…` criado, `funnel_stage = relatorio_visto`
  - 6 eventos esperados, todos uma única vez (idempotência OK)
  - `brevo_email_sent × 2` (welcome + summary), **sem fallback Resend** (Brevo OK)
  - Brevo contact `288` na lista `16` com atributos preenchidos
- **Decisão técnica: 🟢 GO interno**

### ⚠️ Por concluir / a refinar

1. **`PUBLIC_APP_BASE_URL` aponta para `instagramaudit.lovable.app`** em vez de `instagramaudit.pt` (custom domain). Confirmado no atributo Brevo `LAST_REPORT_URL` e nos defaults dos templates. Impacto: links nos emails enviados não usam o domínio de marca.
2. **Confirmação visual do inbox** ainda não documentada (welcome-beta + report-summary recebidos, render OK, links clicáveis).
3. **Smoke test não documentado em `.lovable/plan.md`** como concluído (checklist ainda aberto).

---

## Plano de refinamentos

### Passo 1 — Alinhar domínio público
- Atualizar secret `PUBLIC_APP_BASE_URL` para `https://instagramaudit.pt` (assumindo custom domain ativo; **confirmar com o utilizador** antes via `ask_questions` se o domínio já está propagado).
- Sem deploy necessário — valor lido em runtime nas server functions de email.
- Próximo unlock vai re-sincronizar `LAST_REPORT_URL` no Brevo automaticamente.

### Passo 2 — Validação inbox (manual, do utilizador)
Pedir ao utilizador para confirmar na caixa `frederico.carvalho@digitalfc.pt`:
- ☐ Email "Welcome beta" recebido, render correto, CTA funcional
- ☐ Email "Report summary" recebido, métricas visíveis, link para report e `/app/reports` funcionais
- ☐ Sender visível: `relatorios@instagramaudit.pt` (Brevo) — não Resend
- ☐ Sem ir para spam

### Passo 3 — Fechar documentação
- Atualizar `.lovable/plan.md` com resultado do smoke test (status, lead_id, eventos, decisão GO).
- Marcar checkpoints como ✅.

### Passo 4 (opcional) — Re-teste curto pós-domínio
Se `PUBLIC_APP_BASE_URL` for alterado, fazer 1 unlock adicional com email diferente (ex: `frederico+smoke2@digitalfc.pt`) **só** para validar que o novo domínio aparece nos emails e em `LAST_REPORT_URL`. Sem isto, o fix do domínio fica não-validado em produção real.

---

## Detalhes técnicos

- `PUBLIC_APP_BASE_URL` é lido em `send-welcome-beta.server.ts`, `send-report-summary.server.ts`, `send-personal-area-saved.server.ts` com fallback hardcoded para `https://instagramaudit.lovable.app`.
- Brevo contact attributes (`LAST_REPORT_URL`) são populados em `lead-magnet-sequence` a partir do mesmo URL base.
- Não tocar em `report.example`, scrapers, providers ou em outros leads.

## Checkpoint

- ☐ Confirmar com utilizador o domínio público correto (`instagramaudit.pt` vs `lovable.app`)
- ☐ Atualizar `PUBLIC_APP_BASE_URL` se aplicável
- ☐ Utilizador valida inbox (2 emails)
- ☐ Atualizar `.lovable/plan.md` com resultado do smoke
- ☐ (Opcional) re-teste com 2º email para validar domínio
- ☐ Emitir GO final formal para beta interno
