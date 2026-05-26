## Auditoria — Emails enviados vs. editor de Automações

### Conclusão executiva
Há **3 desalinhamentos reais** entre o que o editor `/admin/automacoes/templates` mostra/edita e o que de facto sai para os subscritores. Nada está "mockado" no envio, mas o editor está a comunicar estado errado em 1 template e o sistema tem duas fontes de cópia paralelas que podem divergir silenciosamente.

---

### 1. Inventário (7 templates no editor)

| Key | Editor diz | Envio real | Caller | Provider |
|---|---|---|---|---|
| `request_received` | wired | **enviado** | `src/lib/beta.functions.ts` (submissão beta) | **Resend direto** ⚠️ |
| `report_ready` | wired | enviado | `routes/api/admin/send-report-link.ts` (manual admin) | Brevo→Resend |
| `feedback_request` | wired | enviado | `routes/api/admin/send-feedback-request.ts` (manual admin) | Brevo→Resend |
| `personal_area_saved` | wired | **NÃO enviado** ❌ | nenhum caller — `sendPersonalAreaSavedEmail` é função morta | — |
| `welcome_beta` | wired | enviado | `lead-magnet-sequence.server.ts` (primeiro unlock) | Brevo→Resend |
| `report_summary` | wired | enviado | `lead-magnet-sequence.server.ts` (após unlock) | Brevo→Resend |
| `commercial_followup` | orphan (correcto) | manual via admin | `routes/api/admin/send-commercial-followup.ts` | Brevo→Resend |

Verificação em DB (`product_events`, 30d): 1 `beta_welcome_email_sent`, 1 `report_summary_email_sent`, 2 `brevo_email_sent`. Coerente com a tabela acima.

---

### 2. Problemas encontrados

**P1 — `personal_area_saved` está falsamente marcado como "wired".**
`sendPersonalAreaSavedEmail` existe em `src/lib/email/send-personal-area-saved.server.ts` mas **não tem nenhum caller no projecto** (verificado com ripgrep em todo `src/`, excluindo testes). O lead que cria conta e tem reports associados nunca recebe este email, apesar de o editor afirmar que está ligado.

**P2 — `request_received` faz `fetch` directo à Resend.**
`src/lib/beta.functions.ts` (l.210-224) chama `https://api.resend.com/emails` directamente em vez de passar por `sendTransactionalEmail` (que faz Brevo-first com fallback Resend). Consequências:
- nunca tenta Brevo, embora o resto do sistema priorize Brevo;
- não emite os eventos uniformes `brevo_email_sent`/`brevo_email_failed`;
- duplica a lógica de timeout/abort.

**P3 — Duas fontes de cópia paralelas para o mesmo template.**
- `src/lib/email/templates/*.ts` (`renderXxx`) — o que **realmente sai** quando não há override em DB.
- `src/lib/admin/email-template-registry.ts` → `DEFAULTS` (`defaultParts`) — o que **aparece no editor** como ponto de partida.

Estado actual em DB: `SELECT * FROM email_template_overrides` → **0 linhas**. Ou seja: nenhum admin nunca guardou um template, logo tudo o que sai é o fallback hardcoded — não é o conteúdo do editor. Se o admin editar `welcome_beta` no editor e fechar sem guardar (ou se o subject no `DEFAULTS` divergir do `renderWelcomeBeta`), o que ele vê no preview não corresponde ao que o subscritor recebe.

Comparação rápida: `DEFAULTS.welcome_beta.subject = "Bem-vindo à beta do InstaBench"` vs. `renderWelcomeBeta` (ficheiro `welcome-beta.ts`) tem um `SUBJECT` próprio que pode divergir. Mesmo padrão para os outros 6.

---

### 3. Recomendações (ordem proposta, uma por prompt)

1. **Corrigir P1** — em `email-template-registry.ts`, marcar `personal_area_saved` como `wired: false` com `wiredNote: "Função existe mas sem trigger automático; reservado para evolução."` Decisão de produto a seguir: ou ligar o caller no fluxo de criação de conta (`handle_new_user` / `link_user_to_existing_reports`) ou remover o template do editor.

2. **Corrigir P2** — substituir o `fetch` directo em `beta.functions.ts` por `sendTransactionalEmail({ flowType: "request-received", ... })`, eliminando ~30 linhas duplicadas e uniformizando provider/eventos.

3. **Corrigir P3 (estrutural)** — escolher **uma** fonte de verdade:
   - **Opção A (recomendada)**: o editor passa a derivar `defaultParts` a partir do mesmo `renderXxx` (extraindo subject/body), garantindo paridade automática. Reduz código e elimina divergência.
   - **Opção B**: manter `DEFAULTS` mas adicionar um teste de paridade (`expect(DEFAULTS[key].subject).toBe(renderXxx.subject)`) que falha o build se desalinhar.

4. **Validação manual** — em `/admin/automacoes/templates/<key>`, gravar pelo menos `welcome_beta` e `report_summary` com o conteúdo actual, para que o caminho com override em DB seja efectivamente exercitado em produção.

---

### Fora de âmbito
- Mudar provider (Brevo/Resend).
- Refazer o editor visualmente.
- Tocar em `commercial_followup` (orphan declarado, comportamento correcto).

### Checkpoint
- ☐ Aprovar relatório
- ☐ Decidir ordem dos fixes (P1 → P2 → P3 sugerido)
- ☐ Decidir opção A ou B para P3