## Avaliação dos últimos prompts

### Estado de cada tarefa

| # | Tarefa | Estado | Verificação |
|---|---|---|---|
| 1 | Auditoria de templates de email | ✅ Concluída (read-only) | Mapa endpoint→template entregue. |
| 2 | Validação `/api/public/feedback/$requestId` pós-publish | ✅ 5/5 PASS | Testes 1–5 verificados em `instagramaudit.lovable.app`. Lead Frederico transitou para `feedback_recebido` (confirmado: `commercial_status='feedback_recebido'`, 1 registo em `beta_feedback`). |
| 3 | Backfill `report_link_sent` | ✅ Executado | 1 evento inserido com `channel:backfill`. Re-query confirma `gaps_remaining = 0`. Idempotente: re-execução não duplica. |

### Timeline do lead seed (Frederico) após backfill

```
report_link_sent     × 1   (backfill, 2026-05-04)
report_viewed        × 76  ← ver "Refinamento 1"
feedback_started     × 1
feedback_submitted   × 1
lead_status_changed  × 3
```

A timeline agora abre corretamente com `report_link_sent` → ordenação cronológica reposta.

---

### Refinamentos sugeridos (não bloqueantes; fora do âmbito dos prompts)

**Refinamento 1 — `report_viewed` em excesso (76 eventos)**
- Cada abertura do relatório está a emitir 2–4 eventos quase simultâneos (ms de diferença), provavelmente por:
  - StrictMode duplo-render em dev, **ou**
  - efeito disparado em vários componentes filhos, **ou**
  - falta de debounce/dedup no endpoint que regista `report_viewed`.
- Impacto: ruído no timeline e nas métricas de "views únicos".
- Sugestão: dedup por `(lead_id, snapshot_id, hora)` no servidor, ou throttle 30s no cliente. Tarefa separada.

**Refinamento 2 — Falta `feedback_request_sent`**
- Há `feedback_started` e `feedback_submitted` mas nenhum evento que registe quando o **link de feedback** foi enviado por email.
- Se o template `renderFeedbackRequest` foi efetivamente enviado para o Frederico, o endpoint que envia o link devia emitir `feedback_request_sent`.
- Hipóteses:
  - O envio foi manual/teste e não passou pelo endpoint oficial → não há gap real.
  - O endpoint oficial não regista o evento → bug pequeno a corrigir.
- Sugestão: novo prompt curto para auditar o endpoint `send-feedback-request` (read-only) e confirmar se emite `product_events.feedback_request_sent`. Se não emitir, é um gap análogo ao que acabámos de corrigir.

**Refinamento 3 — Backfill semelhante para outros eventos lifecycle?**
- Já confirmado que **não há mais gaps** para `report_link_sent`.
- Vale a pena, em prompt separado, validar se existem gaps equivalentes para:
  - `feedback_request_sent` vs leads com `commercial_status='feedback_solicitado'`
  - `commercial_followup_sent` vs leads com `commercial_status='followup_enviado'` (ou similar)
- Não é urgente — a flow atual já regista corretamente.

---

### Conclusão

Os 3 prompts ficaram **bem feitos e fechados**. Não há ações pendentes diretas dos pedidos. Os 3 refinamentos acima são oportunidades de melhoria que recomendo tratar em prompts separados, por ordem de prioridade:

1. **Refinamento 2** (auditar `feedback_request_sent`) — prioridade média, mesmo padrão do bug que acabámos de corrigir.
2. **Refinamento 1** (dedup `report_viewed`) — prioridade média, afeta qualidade das métricas.
3. **Refinamento 3** (procurar mais gaps lifecycle) — prioridade baixa, preventivo.

Não é necessária nenhuma ação imediata neste turno.
