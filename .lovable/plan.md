## Readiness Final — AuditProfiles (Beta)

### Veredicto: **GO para beta** com sender `frederico.carvalho@digitalfc.pt` (display name `AuditProfiles`). Sem alterações de código necessárias.

---

### 1. Sender de email — coerência

Código actual (verificado):
- `src/lib/email/transactional-email.server.ts:141` → `fromName = BREVO_FROM_NAME || "AuditProfiles"` ✅
- `src/lib/email/transactional-email.server.ts:131` → `fromEmail = BREVO_FROM_EMAIL` (sem fallback, erro `BREVO_FROM_EMAIL_MISSING` se faltar) ✅
- `src/lib/email/sender.ts` → Resend lê `RESEND_FROM` sem fallback ✅
- `src/lib/email/shared.ts` → `BRAND = "AuditProfiles"`, `SIGNATURE_NAME = "equipa AuditProfiles"` ✅
- Templates assinam `— equipa AuditProfiles` independentemente do endereço SMTP.

**Conclusão:** Usar `frederico.carvalho@digitalfc.pt` como `from` mantém a copy coerente — o utilizador vê `AuditProfiles <frederico.carvalho@digitalfc.pt>`. Nada no código assume que o endereço tem de ser `@auditprofiles.com`. Os comentários em `sender.ts` e `transactional-email.test.ts` referem `@auditprofiles.com` como exemplo, não como validação.

**Setup temporário recomendado:**
- `BREVO_FROM_NAME` = `AuditProfiles`
- `BREVO_FROM_EMAIL` = `frederico.carvalho@digitalfc.pt`
- `RESEND_FROM` = `AuditProfiles <frederico.carvalho@digitalfc.pt>` *(requer domínio `digitalfc.pt` verificado em Resend; se não estiver, deixar `RESEND_FROM` em branco e Resend fica desactivado — Brevo continua a funcionar)*
- `Reply-To` = `frederico.carvalho@digitalfc.pt` (igual ao from; não há campo separado configurado, OK)

---

### 2. Domínio — referências em código

`auditprofiles.com` está hardcoded como **fallback** nestes ficheiros (todos com override via `PUBLIC_APP_BASE_URL`):
- `src/routes/sitemap[.]xml.ts` (BASE_URL fixo)
- `src/routes/precos.tsx` (og:url + canonical fixos)
- `src/lib/email/url.ts`, `send-personal-area-saved.server.ts`, `pdf/print-url.server.ts`
- `src/lib/brevo/sync.server.ts`, `customer-sync.server.ts`
- `src/routes/api/admin/refresh-profile.ts` (whitelist de origin)
- `public/robots.txt` (Sitemap directive)
- `src/lib/brand/legal.ts` (`domain`), `contact.ts` (`hello@auditprofiles.com`)

**Dependentes de env/config:** `PUBLIC_APP_BASE_URL` (com fallback `auditprofiles.com`), `app_config.contact_email`.

Para beta privada com tráfego maioritariamente vindo de `instagramaudit.lovable.app`: estes URLs continuam a funcionar (custom domain já está activo em https://auditprofiles.com e https://www.auditprofiles.com). Nenhuma acção bloqueante.

---

### 3. Secrets a confirmar (sem alterar agora)

| Secret | Valor recomendado para beta | Crítico? |
|---|---|---|
| `BREVO_FROM_NAME` | `AuditProfiles` | sim |
| `BREVO_FROM_EMAIL` | `frederico.carvalho@digitalfc.pt` | sim (sem ele Brevo falha) |
| `RESEND_FROM` | `AuditProfiles <frederico.carvalho@digitalfc.pt>` se `digitalfc.pt` estiver verificado em Resend; caso contrário deixar em branco | não (Brevo é primário) |
| `PUBLIC_APP_BASE_URL` | `https://auditprofiles.com` | opcional (fallback já correcto) |
| `CONTACT_EMAIL` | não existe como secret — vem de `app_config.contact_email` | n/a |
| `app_config.contact_email` | `hello@auditprofiles.com` (já actualizado em migration `20260526170909`) | já feito |

---

### 4. Referências legacy

| Referência | Onde | Classificação |
|---|---|---|
| `instagramaudit.lovable.app` | Project URL publicado (Lovable) | **preview-only**, sem ocorrências em código |
| `instabench` | `i18n/index.ts:30` (LANG_STORAGE_KEY), `cost.ts:66` (salt fallback), migration `20260429163700` | **aceitável interno** — manter |
| `instagramaudit` | nenhuma ocorrência em código | n/a |
| URLs preview antigos | nenhuma ocorrência | n/a |

**Redirect 301 manual** de `instagramaudit.lovable.app` → `auditprofiles.com` recomendado mas não bloqueante para beta privada.

---

### 5. Testes — 9 falhas pré-existentes

Sem mudanças desde a auditoria anterior. Classificação face a launch:

| Suite | Risco para launch | Recomendação |
|---|---|---|
| `registry-parity.test.ts` (4) — `{{instagramHandle}}` não substituído em subjects default | **Não afecta envio real** — só preview no admin. Templates em produção (`request-received`, etc.) injectam o handle correctamente | Não bloqueante. Corrigir depois da beta |
| `send-commercial-followup.test.ts` (5) — mock supabase desactualizado vs `email_template_overrides` | **Não afecta envio** — handler real funciona; só o mock de teste está stale | Não bloqueante. Corrigir depois da beta |

Nem o envio transaccional nem o follow-up comercial em produção dependem destes mocks. Não bloqueiam beta.

---

### 6. Histórico — manter sem alterar

- `supabase/migrations/20260429163700_*.sql:290` — `'InstaBench dataset interno'` ✅ manter (migration imutável, label admin)
- `src/i18n/index.ts:30` — `LANG_STORAGE_KEY = "instabench.lang"` ✅ manter (mudar invalida preferência de idioma)
- `src/lib/analysis/cost.ts:66` — fallback salt `"instabench-default-salt"` ✅ manter (mudar quebra dedup histórico; salt real vem de secret `IP_HASH_SALT`)

---

## Resumo executivo

- **Status migração:** completa em código, user-facing 100% AuditProfiles
- **Sender beta recomendado:** `AuditProfiles <frederico.carvalho@digitalfc.pt>` via Brevo
- **A confirmar manualmente:** `BREVO_FROM_NAME`, `BREVO_FROM_EMAIL`, `RESEND_FROM`
- **Pode esperar:** verificação DNS `auditprofiles.com` em Brevo/Resend, redirect 301 do URL antigo, fix dos 9 testes
- **Bloqueante para partilha pública:** nada — GO
- **3 ocorrências históricas:** manter inalteradas

**Decisão final: GO para beta com sender DigitalFC.** Migração para `@auditprofiles.com` pode ser feita depois sem mudanças de código (só secrets).
