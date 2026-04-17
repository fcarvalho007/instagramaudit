

## Auditoria — Bugs e refinamentos do email v1

Revisão focada em `src/routes/api/send-report-email.ts` + template + integração com a cadeia PDF→email.

---

### 🐛 Bugs reais

**1. Race em re-send concorrente — perda de tracking**
Cenário: dois POSTs ao mesmo `report_request_id` em paralelo (admin clica 2x, retry de cliente). Ambos passam o check `pdf_status='ready'`, ambos marcam `delivery_status='sending'`, ambos enviam, ambos escrevem `email_sent_at` + `email_message_id`. **Resultado**: o lead recebe 2 emails, e o `email_message_id` que fica gravado é não-determinístico (último wins, mas pode ser o do primeiro envio se chegar mais tarde). 
**Fix**: optimistic locking — antes de gerar signed URL, fazer `UPDATE ... SET delivery_status='sending' WHERE id=$1 AND delivery_status != 'sending'` e abortar se `rowCount=0` com `error_code: "DELIVERY_IN_PROGRESS"`.

**2. `name.split(" ")[0]` rebenta em strings vazias ou só whitespace**
Se `lead.name === ""` (string vazia mas truthy em JS? — `""` é falsy, ok) **mas** se `lead.name === "   "` → `split(" ")[0]` devolve `""` → `Olá ,` no email. 
**Fix**: `const first = lead.name?.trim().split(/\s+/)[0]; greeting = first ? \`Olá ${first},\` : "Olá,"`.

**3. Timezone do `email_sent_at` no template — não exposto, mas inconsistência com PDF**
O PDF usa `pdf_generated_at` UTC; o email não mostra data. Não é bug visível, mas se um dia mostrarmos "Enviado em ..." num admin, vamos ter 2 ISO strings UTC e nenhuma normalização pt-PT. Anotar para v2.

**4. Sender hardcoded — vai falhar silenciosamente se Resend mudar política sandbox**
`onboarding@resend.dev` só envia para o **email do owner da conta Resend** em sandbox. Se o lead não for esse email, Resend devolve `403` ou `422`. O route trata como `RESEND_FAILED` genérico, mas o admin futuro não vai perceber **porquê**. 
**Fix**: capturar e expor `error_code: "RESEND_SANDBOX_RECIPIENT_BLOCKED"` quando o body do erro contém `you can only send testing emails to your own email`.

---

### ⚠️ Refinamentos importantes

**5. Falta `email_send_count` ou auditoria de re-sends**
Plano original mencionou possível adição numa fase posterior. Como o re-send é livre, perde-se o histórico de quantas vezes foi enviado. Útil para suporte ("o cliente diz que não recebeu — já reenviámos 4x?"). 
**Fix mínimo**: coluna `email_send_count integer not null default 0`, incrementar atomicamente no sucesso.

**6. `slice(0, 500)` em `email_error_message` quebra UTF-8 multi-byte**
Em Cloudflare Workers, `String.prototype.slice` corta por code units, não por bytes. Se a mensagem do Resend tiver emojis ou caracteres acentuados perto do limite, fica mojibake. Não crítico (texto interno) mas feio. 
**Fix**: aceitar como está (texto interno admin), ou usar `[...str].slice(0, 500).join("")`.

**7. Sem validação de email do lead**
Se `lead.email` foi gravado mal-formado (regex passou no insert mas tem espaço no fim), Resend rejeita. 
**Fix**: trim + regex básica antes de enviar; mensagem `LEAD_EMAIL_INVALID` distinta de `LEAD_EMAIL_MISSING`.

**8. Sem timeout no `fetch` ao Resend**
Cloudflare Workers têm CPU time limit (50ms-30s). Se Resend pendurar, a route fica suspensa até timeout do Worker (genérico). 
**Fix**: `AbortController` com timeout 10s.

**9. CTA do email aponta directamente ao signed URL do storage**
Boa para v1, mas: (a) URL é longo e feio, (b) se o storage path mudar no futuro o link parte. Numa próxima iteração, expor `/r/:token` no nosso domínio que faz redirect para signed URL gerado on-demand — mais bonito, rastreável (clicks), e permite expirar/regenerar sem novo email. **Não bloqueante para v1.**

---

### 🧹 Cosmética / pt-PT

**10. "Em alternativa, copiar o seguinte endereço:"** — tom impessoal correto, mas pesado. Mais natural: **"Em alternativa, abrir o seguinte endereço:"** (copiar pressupõe acção que já não cabe no tom impessoal — abrir é mais directo).

**11. Footer "Relatórios premium para Instagram"** — "premium" é anglicismo aceite, mas a frase fica nominal. Sugerir: **"Análise e relatórios para perfis de Instagram"** — mais editorial, menos hype. Alinha com tom non-hype do project knowledge.

**12. `Olá ${nome},` é levemente pessoal**
Project knowledge prefere construções impessoais. Em emails transaccionais o cumprimento é universal, mas podemos cortar para tom mais editorial: omitir greeting e abrir com **"O relatório de @username está disponível."** Decisão estilística — propor opção, deixar utilizador escolher.

---

### 🔒 Segurança / robustez

**13. `bodyText.slice(0, 300)` é gravado em DB mas não sanitizado**
Resend pode devolver HTML em erros raros. Se um dia expusermos `email_error_message` num admin sem escape, é XSS. Marcar para escapar no display, não na escrita.

**14. Sem rate limit no endpoint**
Qualquer um que descubra `/api/send-report-email` pode fazer flood com UUIDs aleatórios. Maior parte falha em `REQUEST_NOT_FOUND`, mas custa DB lookups + pode espalhar emails se acertar UUIDs válidos. 
**Fix**: rate limit por IP (10 req/min) ou (preferível) tornar route privado server-to-server com header `X-Internal-Token` validado contra secret. **Importante para produção.**

---

### 📋 Resumo priorizado

| # | Severidade | Item | Esforço |
|---|---|---|---|
| 1 | 🔴 Alto | Race em re-send concorrente (optimistic lock) | S |
| 14 | 🔴 Alto | Endpoint sem auth/rate limit (público) | M |
| 4 | 🟡 Médio | Erros sandbox Resend mascarados | S |
| 8 | 🟡 Médio | Sem timeout no fetch Resend | XS |
| 7 | 🟡 Médio | Sem validação de email do lead | XS |
| 2 | 🟡 Médio | `split(" ")[0]` em nome whitespace | XS |
| 5 | 🟢 Baixo | `email_send_count` para auditoria | S |
| 10-12 | 🟢 Baixo | Refinamentos copy pt-PT | XS |
| 6, 13 | ⚪ Cosmético | Slice UTF-8 + escape em display | XS |

---

### Recomendação

Implementar em **2 prompts separados** (regra "uma feature por prompt"):

**Prompt A — Hardening crítico**: itens 1, 4, 7, 8 + auth interna do endpoint (item 14 via secret `INTERNAL_API_TOKEN` no header).

**Prompt B — Refinamentos opcionais**: itens 2, 5, 10, 11 + decisão sobre greeting (item 12).

Itens 3, 6, 9, 13 ficam para v2 — não bloqueantes.

