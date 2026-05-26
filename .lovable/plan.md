## Auditoria Final do Rebrand — GO / NO-GO

### Veredicto: **GO** (condicional a 3 ações manuais)

A migração `InstaBench → AuditProfiles` está limpa em todas as superfícies user-facing. Zero ocorrências em frontend público, app autenticada, emails e admin. As únicas referências remanescentes são intencionais e classificadas abaixo.

---

### 1. Frontend Público — ✅ LIMPO
- Landing, header/footer, pricing, analyze, report, gates/modals, legal — **0 ocorrências** "InstaBench".
- SEO/meta/OG em `__root.tsx` e routes leaf usa "AuditProfiles" consistentemente.
- `public/robots.txt` aponta para `https://auditprofiles.com/sitemap.xml` ✅
- Sitemap `BASE_URL = "https://auditprofiles.com"` ✅

### 2. App Autenticada — ✅ LIMPO
- Reports, account, login/signup/reset-password, app sidebar/topbar — 0 ocorrências.

### 3. Emails — ✅ LIMPO
- Todos os 8 templates (`request-received`, `report-ready`, `feedback-request`, `welcome-beta`, `report-summary`, `commercial-followup`, `personal-area-saved`, `default-parts`) — 0 ocorrências.
- `shared.ts` → `BRAND = "AuditProfiles"`, `SIGNATURE_NAME = "equipa AuditProfiles"`.
- `email-template-registry.ts` (lab/preview) — 0 ocorrências.
- Subjects/preheaders/assinatura — todos consistentes.

### 4. Admin — ✅ LIMPO
- Sidebar/topbar, automações, diagnósticos, knowledge base, pricing/admin, report drawers — 0 ocorrências.

### 5. Backend/Config — ✅ LIMPO
- `src/lib/brand/legal.ts` → `productName: "AuditProfiles"`, `companyName: "Fomentar Sonhos, Lda."`, `domain: "auditprofiles.com"` ✅
- `app_config` em produção → 0 chaves com "instabench".
- Sender fallback no código → `"AuditProfiles"` (BREVO_FROM_NAME).
- Tests/fixtures atualizados.

### Operador Legal — ✅ MANTIDO
`Fomentar Sonhos, Lda.` presente em `termos.tsx`, `privacidade.tsx`, `legal.ts`, `gate.json` (PT+EN) — consistente.

### i18n PT/EN — ✅ CONSISTENTE
- `brand.platformName: "AuditProfiles"` em ambos
- `brand.productName: "Instagram Profile Audit" / "Auditoria de Perfil Instagram"`
- `brand.startingWith` traduzido em ambos.

---

### Ocorrências Remanescentes (3 — todas aceitáveis)

| # | Localização | Tipo | Classificação |
|---|---|---|---|
| 1 | `supabase/migrations/20260429163700_*.sql:290` — `'InstaBench dataset interno'` | Seed admin histórico | **Histórico/internal aceitável** — migration imutável, label de dataset interno só visível no admin |
| 2 | `src/i18n/index.ts:30` — `LANG_STORAGE_KEY = "instabench.lang"` | Chave de localStorage | **Histórico aceitável** — mudar invalida preferência de idioma de utilizadores existentes |
| 3 | `src/lib/analysis/cost.ts:66` — `IP_HASH_SALT` fallback `"instabench-default-salt"` | Salt determinístico | **Histórico aceitável** — mudar quebra dedup de hashes históricos; `IP_HASH_SALT` real está em secret |

Nenhuma destas é user-facing. Nenhuma bloqueia o switch para `auditprofiles.com`.

---

### Ações Manuais Necessárias Antes de Ligar `auditprofiles.com`

1. **Verificar 3 secrets em Connectors/Secrets** (não tenho visibilidade dos valores):
   - `BREVO_FROM_NAME` → deve ser `AuditProfiles`
   - `BREVO_FROM_EMAIL` → deve apontar para `@auditprofiles.com` (domínio verificado)
   - `RESEND_FROM` → deve ser `AuditProfiles <relatorios@auditprofiles.com>`

2. **Domínio AuditProfiles.com** (operações fora do código):
   - Configurar custom domain Lovable para `www.auditprofiles.com` + apex
   - Verificar DNS DKIM/SPF do remetente em Brevo e Resend
   - 301 redirects do `instagramaudit.lovable.app` (publicado atual) → `auditprofiles.com`

3. **SEO pós-switch**:
   - Submeter nova propriedade ao Google Search Console
   - Submeter `https://auditprofiles.com/sitemap.xml`
   - Pedir re-fetch de OG cache (Facebook Debugger, Twitter Card Validator, LinkedIn Post Inspector)

---

### Validação Técnica

- `bunx tsc --noEmit` → ✅ **0 erros**
- `bunx vitest run` → **560 passados / 9 falhados / 569 total**
  - **Nenhuma falha relacionada com rebrand.** Falhas pré-existentes:
    - `registry-parity.test.ts` (4): bug de substituição de `{{instagramHandle}}` em subjects default.
    - `send-commercial-followup.test.ts` (5): mock supabase desatualizado vs nova tabela `email_template_overrides`.
  - Não bloqueiam a migração de marca.

### Outras Verificações
- ✅ Routes intactas (file-based routing preservado).
- ✅ Sem alterações a providers (Apify, OpenAI, DataForSEO, Brevo, Resend, PDFShift).
- ✅ Sem renomeação de event keys em `product_events`.
- ✅ Sem alterações ao wiring de `personal_area_saved`.

---

## Checklist Final Antes de Ligar AuditProfiles.com

- [ ] Confirmar `BREVO_FROM_NAME` = `AuditProfiles`
- [ ] Confirmar `BREVO_FROM_EMAIL` em domínio AuditProfiles verificado
- [ ] Confirmar `RESEND_FROM` em formato e domínio novos
- [ ] Configurar custom domain Lovable para `auditprofiles.com`
- [ ] Verificar DKIM/SPF DNS para Brevo + Resend no novo domínio
- [ ] Configurar redirects 301 do publish URL antigo
- [ ] Submeter sitemap.xml ao GSC com nova propriedade
- [ ] Refrescar OG cache (FB/Twitter/LinkedIn)
- [ ] Opcional: corrigir 9 testes pré-existentes (não bloqueante)

**Auditoria é só leitura — nenhum ficheiro foi alterado.** Aprovar para confirmar que aceitam o relatório (ou pedir ações específicas).