## Auditoria de marca — InstaBench → AuditProfiles

**Modo:** apenas auditoria. Nenhum ficheiro será alterado neste passo.

Pesquisa case-insensitive de `instabench`, `instagramaudit`, `instagram audit`, `insta bench`, `instagramaudit.pt`, `instagramaudit.lovable.app`, `instabench.pt`, `instabench.app`. Variantes `auditprofiles` / `audit profiles` não existem ainda em código.

**Totais:** 323 ocorrências em ~80 ficheiros (ignorando `node_modules/`, `dist/`, `.git/`). `dist/` é build artefact — regenera-se sozinho, ignorar.

Domínio canónico futuro (já está nos `project_urls`): **https://auditprofiles.com** (`www.auditprofiles.com` é alias). Os domínios antigos `instagramaudit.lovable.app` e `instabench.pt` devem ser substituídos como URL canónico, mas mantidos como alias com 301 ao nível de DNS/publicação (fora do código).

---

### Tabela de ocorrências (agrupadas por bloco)

Classificações: **A** = trocar já (visível ao utilizador); **B** = manter (histórico interno, IDs, dados em BD); **C** = passar a descritor SEO em vez de marca; **D** = trocar mas com cuidado (config, fallback, testes).

#### 1. Source of truth de marca (mudar PRIMEIRO)

| Ficheiro | Ocorrência | Contexto | Classe | Substituição | Risco |
|---|---|---|---|---|---|
| `src/lib/brand/legal.ts` | `productName: "InstaBench"`, `domain: "instabench.pt"` | Constante central de identidade legal | A | `productName: "AuditProfiles"`, `domain: "auditprofiles.com"` | Baixo se restantes ficheiros importarem daqui — mas hoje quase nenhum o faz |
| `src/lib/brand/contact.ts` | `DEFAULT_CONTACT_EMAIL = "hello@instabench.pt"`, `"Acesso profissional — InstaBench"`, copy mailto | Fallback de contacto | A | `hello@auditprofiles.com`, `Acesso profissional — AuditProfiles` | Médio (depende de DNS/Resend) |
| `src/lib/email/shared.ts` | `BRAND = "InstaBench"`, `SIGNATURE_NAME = "equipa InstaBench"` | Marca usada em todos os emails | A | `AuditProfiles`, `equipa AuditProfiles` | Médio |
| `src/lib/config/app-config.functions.ts` | `contactEmail: "hello@instabench.pt"` (default) | Fallback do `usePublicAppConfig` | A | `hello@auditprofiles.com` (+ migrar `app_config.contact_email` na BD) | Médio |
| BD `app_config.contact_email` | valor actual `hello@instabench.pt` | Live config em produção | A | UPDATE para `hello@auditprofiles.com` via migration | Médio — atinge UI imediatamente |

#### 2. Frontend público (visível)

| Caminho | Ocorrências | Tipo | Classe | Acção |
|---|---|---|---|---|
| `src/routes/__root.tsx` | 4 (title, og:title, twitter:title, author) | SEO/meta root | A | Substituir por `AuditProfiles — Análise e benchmark de perfis sociais` |
| `src/routes/index.tsx` | 2 (title, og:title) | Landing | A | `AuditProfiles · O benchmark de perfis sociais que faltava ao mercado` |
| `src/routes/precos.tsx`, `termos.tsx`, `privacidade.tsx`, `cookies.tsx`, `aviso-legal.tsx`, `unsubscribe.tsx`, `login.tsx`, `signup.tsx`, `reset-password.tsx`, `feedback.$requestId.tsx`, `beta.request.tsx`, `beta.submitted.$requestId.tsx`, `reports.$snapshotId.tsx`, `report.example.tsx`, `report.print.$snapshotId.tsx`, `design-system.tsx`, `analyze.$username.tsx` | ~40 | title/og/copy legal e meta | A | Substituir por `AuditProfiles`. Em páginas legais (`termos`, `privacidade`, `aviso-legal`, `cookies`), substituir nome do produto mas manter operador `Fomentar Sonhos, Lda.` |
| `src/components/layout/header.tsx`, `footer.tsx` | 3 (logo + copyright) | Layout público | A | `AuditProfiles` |
| `src/components/legal/legal-layout.tsx` | 1 (disclaimer Meta) | Frase de exoneração | A | `AuditProfiles não é afiliado…` |
| `src/components/feedback/feedback-form.tsx` | 1 | Copy interactivo | A | `AuditProfiles` |
| `src/components/report-beta/beta-copy.ts` | 2 (texto + `hello@instagramaudit.lovable.app` mailto) | Copy do gate beta | A | `AuditProfiles`, `hello@auditprofiles.com` |
| `src/components/report-redesign/report-hero.tsx`, `report-positioning-banner.tsx`, `report/report-ai-insights.tsx`, `report/report-footer.tsx`, `report-share/use-report-share-actions.ts` | 5 | Marca visível dentro do relatório | A | `AuditProfiles · Relatório editorial`, etc. |
| `src/components/app/app-sidebar.tsx`, `app-topbar.tsx` | 2 | App autenticada | A | `AuditProfiles` |
| `src/lib/pdf/report-document.tsx` | 7 (`FOOTER_BRAND`, `INSTABENCH` mark, title/author/creator/producer) | PDF exportado | A | `AuditProfiles` em todos os campos (título do ficheiro PDF passa a `AuditProfiles · @handle`) |

#### 3. i18n (PT + EN)

| Ficheiro | Ocorrências | Classe | Notas |
|---|---|---|---|
| `src/i18n/locales/{pt,en}/auth.json` | 5 cada | A | metaTitle/metaDescription login/signup/reset |
| `src/i18n/locales/{pt,en}/report.json` | 3 cada | A | `aria`, `lead` (`<1>InstaBench</1>`), `metaTitle` |
| `src/i18n/locales/{pt,en}/landing.json` | 1 cada | A | título principal |
| `src/i18n/locales/{pt,en}/pricing.json` | 2 cada | A | meta |
| `src/i18n/locales/{pt,en}/footer.json` | 1 cada | A | copyright |
| `src/i18n/locales/{pt,en}/analyze.json` | 1 cada | A | título dinâmico |
| `src/i18n/locales/{pt,en}/unsubscribe.json` | 1 cada | A | `page_title` |
| `src/i18n/index.ts` | `LANG_STORAGE_KEY = "instabench.lang"` | **B** | Chave de `localStorage`. Mudar invalida preferência de idioma de utilizadores existentes. Manter, ou migrar com fallback (ler antiga, escrever nova). |

#### 4. Emails

| Ficheiro | Ocorrências | Classe | Acção |
|---|---|---|---|
| `src/lib/email/shared.ts` | `BRAND`, `SIGNATURE_NAME` | A | Ver bloco 1 |
| `src/lib/email/sender.ts` | comentário JSDoc com `RESEND_FROM` exemplo | A | Actualizar exemplo para `AuditProfiles <relatorios@auditprofiles.com>` |
| `src/lib/email/url.ts`, `send-personal-area-saved.server.ts` | `DEFAULT_BASE_URL = "https://instagramaudit.lovable.app"` | A | `https://auditprofiles.com` |
| `src/lib/email/templates/welcome-beta.ts` | 2 (corpo do email beta) | A | Reescrever menção a `InstaBench` |
| `src/lib/email/report-email-template.ts` | 1 | A | Substituir |
| `src/lib/email/transactional-email.server.ts` | 1 | A | Substituir |
| `src/lib/admin/email-template-registry.ts` | preheader "relatório InstaBench" | A | `relatório AuditProfiles` |
| **Secret `RESEND_FROM` em prod** | valor actual provavelmente `InstaBench <…@instagramaudit.pt>` | A | Actualizar valor do secret em Cloud → Secrets (fora do código) |

#### 5. Admin (interno mas visível à equipa)

| Ficheiro | Ocorrência | Classe | Acção |
|---|---|---|---|
| `src/components/admin/admin-gate.tsx` | `InstaBench · Admin` | A | `AuditProfiles · Admin` |
| `src/components/admin/v2/admin-sidebar.tsx` | logo | A | `AuditProfiles` |
| `src/components/admin/v2/automacoes/template-editor/inbox-preview-card.tsx` | `senderName = "InstaBench"` default | A | `AuditProfiles` |
| `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` | `https://instabench.example/relatorio` | **B/D** | Apenas placeholder de URL para inspecção; manter ou actualizar para `auditprofiles.example` (cosmético) |
| `src/components/admin/v2/visao-geral/beta-conversion-funnel.tsx` | comentário JSDoc | B | Pode actualizar como housekeeping, sem impacto funcional |
| `src/styles/admin-tokens.css` | comentário de cabeçalho | B | Housekeeping |

#### 6. SEO/infra

| Ficheiro | Ocorrência | Classe | Acção |
|---|---|---|---|
| `public/robots.txt` | `Sitemap: https://instagramaudit.lovable.app/sitemap.xml` | A | `https://auditprofiles.com/sitemap.xml` |
| `src/routes/sitemap[.]xml.ts` | `BASE_URL = "https://instagramaudit.lovable.app"` | A | `https://auditprofiles.com` |
| `src/routes/precos.tsx` (canonical + og:url) | 2 | A | Trocar host para `auditprofiles.com` |
| `src/lib/pdf/print-url.server.ts` | 2 | A | Base URL |

#### 7. Knowledge / prompts / backend (descritivo)

| Ficheiro | Ocorrência | Classe | Acção |
|---|---|---|---|
| `src/lib/knowledge/context.server.ts`, `benchmark-context.ts`, `insights/prompt-v2.ts` | menções a `InstaBench` em prompts/contexto AI | A | Substituir nas strings de prompt. Não afecta histórico (snapshots já gerados ficam congelados). |
| `src/lib/analysis/cost.ts` | 1 menção em comentário | B | Housekeeping |
| `src/lib/brevo/sync.server.ts`, `customer-sync.server.ts` | listas/atributos Brevo | D | Verificar se string é enviada como tag/attr para Brevo. Se sim, manter para não partir segmentos existentes ou migrar com plano de tags. |

#### 8. Testes e fixtures

| Ficheiro | Ocorrência | Classe | Acção |
|---|---|---|---|
| `src/lib/email/__tests__/templates.test.ts` | 8 (URLs, `ola@instabench.pt`, sender display) | D | Actualizar fixtures **junto** com as substituições em código, no mesmo PR |
| `src/lib/email/__tests__/report-summary.test.ts`, `transactional-email.test.ts` | 2 | D | Idem |
| `src/routes/api/admin/__tests__/send-commercial-followup.test.ts` | 3 | D | Idem |

#### 9. Histórico / dados / migrações (NÃO mexer)

| Item | Classe | Razão |
|---|---|---|
| `supabase/migrations/20260429163700_*.sql` — seed `'InstaBench dataset interno'` em `knowledge_notes` | **B** | É label de fonte de conhecimento já em BD. Renomear obrigaria migration UPDATE e potencialmente invalidaria caches; cosmético. Opcional: migration UPDATE label para `AuditProfiles dataset interno` na Fase 3. |
| `supabase/migrations/20260429153000_invalidate_frederico_smoke_v3.sql` e outros `invalidate_frederico_smoke*` | **B** | Nomes de ficheiros de migração — históricos. Não tocar. |
| Event types em `product_events` (não foram encontradas strings `instabench` em event keys) | **B** | Confirmado pela busca; nada a fazer. |
| Snapshots existentes (`report_snapshots.payload`) com strings `InstaBench` renderizadas | **B** | Histórico; relatórios novos passam a `AuditProfiles`. Não reescrever payloads passados. |
| `dist/` | **B** | Build artefact, regenera. |
| `KNOWLEDGE.md`, `docs/BETA_RUNBOOK.md`, `docs/KILL_SWITCHES.md`, `mem/design/iconosquare-style.md` | A (housekeeping) | Docs internas; actualizar na Fase 3 para evitar confusão futura. |

#### 10. Casos especiais a decidir antes de codificar

| Item | Decisão a tomar |
|---|---|
| `LANG_STORAGE_KEY = "instabench.lang"` | Manter como está OU migrar com leitura dupla (ver Fase 1 nota). |
| Tagline "Instagram Audit" como descritor SEO | Brand passa a `AuditProfiles`, **subtítulo** SEO pode ser "Auditoria de perfis de Instagram" enquanto MVP é só IG. Permite futuro multi-rede sem rebrand. |
| Domínio em URLs hardcoded | Trocar para `https://auditprofiles.com` (canónico). Lovable preview URL continua a funcionar como alias. |
| `instabench.pt` / `instagramaudit.pt` em emails (`@instabench.pt`, `RESEND_FROM`) | Requer setup de DNS para `auditprofiles.com` (MX/SPF/DKIM/DMARC) **antes** de cortar emails antigos. |

---

### Plano faseado de implementação

#### Fase 1 — Public UI + i18n (visibilidade imediata, baixo risco técnico)

1. Actualizar `src/lib/brand/legal.ts` (`productName`, `domain`).
2. Substituir hardcodes em todas as routes públicas (`__root.tsx`, `index.tsx`, `precos`, `termos`, `privacidade`, `cookies`, `aviso-legal`, `unsubscribe`, `login`, `signup`, `reset-password`, `feedback.$requestId`, `beta.request`, `beta.submitted.$requestId`, `analyze.$username`, `reports.$snapshotId`, `report.example`, `report.print.$snapshotId`, `design-system`).
3. Substituir em componentes: `header`, `footer`, `legal-layout`, `feedback-form`, `report-beta/beta-copy`, `report-redesign/*`, `report/*`, `report-share/use-report-share-actions`, `app/app-sidebar`, `app/app-topbar`.
4. Substituir em PDF: `src/lib/pdf/report-document.tsx` (FOOTER_BRAND, mark, metadata).
5. Actualizar todas as i18n keys em `src/i18n/locales/{pt,en}/*.json`.
6. **Decisão `LANG_STORAGE_KEY`**: opção segura = manter `instabench.lang`. Opção limpa = mudar para `auditprofiles.lang` com migração no boot:
   ```ts
   const legacy = localStorage.getItem("instabench.lang");
   if (legacy && !localStorage.getItem("auditprofiles.lang")) {
     localStorage.setItem("auditprofiles.lang", legacy);
     localStorage.removeItem("instabench.lang");
   }
   ```
7. Build + smoke: landing, pricing, login, signup, /analyze/frederico.m.carvalho, /report.example, /reports/:id (snapshot existente).

#### Fase 2 — Emails + SEO/meta + canonical/og:url

1. `src/lib/email/shared.ts`: `BRAND`, `SIGNATURE_NAME`.
2. `src/lib/email/{url.ts, send-personal-area-saved.server.ts, sender.ts, transactional-email.server.ts, report-email-template.ts}`: actualizar `DEFAULT_BASE_URL` e copy.
3. `src/lib/email/templates/welcome-beta.ts` e `src/lib/admin/email-template-registry.ts`: actualizar texto.
4. `src/lib/brand/contact.ts`: `hello@auditprofiles.com` (fallback).
5. `src/lib/config/app-config.functions.ts`: default `hello@auditprofiles.com`.
6. Migration: `UPDATE app_config SET value = '"hello@auditprofiles.com"'::jsonb WHERE key = 'contact_email';`
7. `public/robots.txt`: novo sitemap URL.
8. `src/routes/sitemap[.]xml.ts`: `BASE_URL`.
9. `src/lib/pdf/print-url.server.ts`: base URL.
10. `src/routes/precos.tsx`: og:url + canonical para `auditprofiles.com`.
11. **Antes de aceitar Fase 2 em produção**: secret `RESEND_FROM` deve estar actualizado e DNS de `auditprofiles.com` validado em Resend (DKIM/SPF). Se ainda não estiver, deixar fallback `instabench.pt` operacional.
12. Actualizar testes em `src/lib/email/__tests__/*` e `src/routes/api/admin/__tests__/send-commercial-followup.test.ts` em sincronia com as alterações de código.

#### Fase 3 — Admin, knowledge/prompts, tests, docs, housekeeping

1. Admin UI visível: `admin-gate.tsx`, `admin-sidebar.tsx`, `inbox-preview-card.tsx` default `senderName`.
2. Prompts AI: `src/lib/knowledge/context.server.ts`, `benchmark-context.ts`, `src/lib/insights/prompt-v2.ts`. **Importante**: avaliar se mudar "InstaBench" em prompts altera meaningfully a saída do modelo (provavelmente neutro, mas refazer 1 smoke run em `/analyze/frederico.m.carvalho` e comparar verdict/parágrafos).
3. Brevo (`sync.server.ts`, `customer-sync.server.ts`): rever se há strings enviadas como tag/attr. Se for nome de conta/lista, decidir manter para não partir segmentação.
4. Migration opcional para actualizar `knowledge_notes` label `InstaBench dataset interno` → `AuditProfiles dataset interno` (apenas se quisermos consistência total na UI admin de knowledge).
5. Comentários e CSS: `src/lib/analysis/cost.ts`, `src/styles/admin-tokens.css`, `beta-conversion-funnel.tsx` (housekeeping).
6. Docs internos: `KNOWLEDGE.md`, `docs/BETA_RUNBOOK.md`, `docs/KILL_SWITCHES.md`, `mem/design/iconosquare-style.md`, `LOCKED_FILES.md` se mencionar a marca.
7. Actualizar `mem://index.md` Core (linha "Instagram Benchmark Analyzer…") para `AuditProfiles — auditoria de perfis sociais (MVP Instagram)`.

#### Fase 4 — Domínio, redirects e configurações manuais (fora do código)

1. **DNS**: confirmar que `auditprofiles.com` e `www.auditprofiles.com` apontam para Lovable (já é o caso, são custom domains activos).
2. **Resend**: verificar domínio `auditprofiles.com` (DKIM/SPF/DMARC). Adicionar sender `relatorios@auditprofiles.com` e `hello@auditprofiles.com`.
3. **Secret `RESEND_FROM`**: actualizar valor em Cloud → Secrets para `AuditProfiles <relatorios@auditprofiles.com>`.
4. **Brevo**: actualizar sender display name / from address na conta.
5. **Domínios antigos**:
   - `instagramaudit.lovable.app`: manter como alias enquanto for o publish URL Lovable; sem custo.
   - `instabench.pt`: decidir se renovar e fazer 301 → `auditprofiles.com`, ou abandonar.
6. **Google Search Console**: adicionar property `auditprofiles.com`, submeter sitemap novo, marcar change of address a partir das properties antigas (se existirem).
7. **Open Graph cache**: depois do deploy, forçar refresh nas debug tools de FB/LinkedIn/Twitter para URLs principais.

---

### Notas finais

- Nenhuma alteração a `event_type` em `product_events` é necessária (busca não encontrou strings da marca em event keys).
- Snapshots de relatório existentes (`report_snapshots.payload`) continuam a mostrar `InstaBench` no conteúdo congelado — aceitável; novos relatórios passam a `AuditProfiles`. Se for desejável reescrever payload de snapshots existentes, requer migration dedicada com SQL `jsonb_set` — fora do scope desta auditoria.
- `LOCKED_FILES.md` deve ser revisto antes da Fase 1 para confirmar que nenhum dos ficheiros listados acima está bloqueado.
- Tudo em `dist/` será regenerado automaticamente; ignorar.

Pronto para passar a Build Mode e executar pela ordem Fase 1 → 4.
