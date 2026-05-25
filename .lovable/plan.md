# Plano — Auditoria de valores hardcoded e centralização P0/P1

## 1. Estado actual

Já existe infra-estrutura para configuração dinâmica:

- **Supabase `app_config`** (8 chaves):
  `analysis_execution_mode`, `cleanup_enabled`, `contact_email`,
  `cost_cap_apify_usd`, `cost_cap_dataforseo_usd`, `cost_cap_openai_usd`,
  `feature_compare_competitors_enabled`, `free_monthly_report_limit`.
- **Helpers**: `src/lib/config/app-config.server.ts` (read + parse),
  `app-config.functions.ts` (server fn pública), `use-app-config.ts` (hook +
  defaults). Defaults resilientes mantidos no código.
- **Constantes técnicas centralizadas**: `src/lib/report/retention.ts`
  (`REPORT_RETENTION_DAYS=15`, `CACHE_TTL_DAYS`), `src/lib/brand/contact.ts`
  (`DEFAULT_CONTACT_EMAIL`).
- **Segredos via env**: chaves de provider, caps de teste, sender identities
  (`RESEND_FROM`, `BREVO_FROM_EMAIL/_NAME`), `INTERNAL_API_TOKEN`, etc.
- **i18n**: `src/i18n/locales/{pt,en}/*.json` — copy do unlock modal, gate,
  report, etc. já lá vivem.

## 2. Tabela de auditoria

Legenda destino: **app_config** | **env** | **i18n** | **code-const** | **brand-const**.
Acção: **NOW** (P0/P1, neste plano) · **LATER** (P2, fora deste plano).

| # | Valor | Ficheiro actual | Uso | Destino | Prio | Acção |
|---|---|---|---|---|---|---|
| 1 | `"Fomentar Sonhos, Lda."` | `routes/privacidade.tsx` (×6), `termos.tsx`, `aviso-legal.tsx`, `cookies.tsx`, `i18n/{pt,en}/gate.json` | Razão social legal | **brand-const** | P0 | NOW |
| 2 | `"Rua da Carvalha n.º 570 · 2400-441 Leiria · Portugal"` | `privacidade.tsx` ×2, `termos.tsx` ×2, `aviso-legal.tsx` | Sede legal | **brand-const** | P0 | NOW |
| 3 | `"frederico.carvalho@digitalfc.pt"` | `privacidade.tsx` ×3, `termos.tsx` ×3, `aviso-legal.tsx` ×2, `cookies.tsx` | Email de privacidade/DPO | **brand-const** | P0 | NOW |
| 4 | `"Leiria, Portugal"` (operator city) | `i18n/{pt,en}/gate.json` | Mostrado no unlock modal | **brand-const** (lido pelo i18n via interpolação `{{city}}`) | P1 | NOW (referência única) |
| 5 | `"hello@instabench.pt"` (default contact) | `src/lib/brand/contact.ts`, `app-config.functions.ts` defaults | Fallback do `contact_email` | já centralizado | — | mantém |
| 6 | `"instabench.pt"` (domínio) | `privacidade.tsx`, `cost.ts` (salt), `i18n` | Texto legal + IP salt | **brand-const** (texto) + `env` (`IP_HASH_SALT`) | P1 | NOW |
| 7 | `REPORT_RETENTION_DAYS=15` | `src/lib/report/retention.ts` | TTL relatórios + cache | **app_config** (`report_retention_days`) com fallback para 15 | P1 | NOW |
| 8 | `CACHE_TTL_DAYS = REPORT_RETENTION_DAYS` | idem | TTL snapshot | mantém **code-const** (deriva de 7) | — | mantém |
| 9 | Caps Apify/OpenAI/DFS (`cost_cap_*_usd`) | `app_config` + `process.env.APIFY_*_USD` | Budget guards | já em `app_config`+env | — | mantém |
| 10 | `APIFY_TESTING_MODE`, `APIFY_ALLOWLIST`, `*_ENABLED` | env | Kill-switches / allowlists | **env** (correcto) | — | mantém |
| 11 | `analysis_execution_mode` (`cache_only`/`fresh`) | `app_config` | Modo de execução pública | já em `app_config` | — | mantém |
| 12 | Pricing labels `€9,90` `€29,90` `€49,90` `€29` `€3` | `beta-request-form.tsx`, `revenue-section.tsx`, `report-block-nav.tsx` (cofre) | UI pública/admin | **i18n** (display) + **app_config** (`price_*_eur`) se forem aparecer no checkout real | P2 | LATER (sem checkout, mexer agora gera ruído) |
| 13 | Operator subject/body de mailto (`mailtoPro/mailtoAgency`) | `src/lib/brand/contact.ts` | CTA email | **i18n** (assunto/corpo) | P2 | LATER |
| 14 | `UNIFIED_ACTOR = "apify/instagram-scraper"` | `routes/api/analyze-public-v1.ts` | Actor ID Apify | **code-const** (correcto) | — | mantém |
| 15 | `LANG_STORAGE_KEY = "instabench.lang"` | `src/i18n/index.ts` | localStorage key | **code-const** (correcto) | — | mantém |
| 16 | `RESEND_FROM`, `BREVO_FROM_EMAIL/_NAME` | env | Sender identities | **env** (correcto) | — | mantém |
| 17 | `"https://instabench.example/relatorio"` placeholder | `lead-detail-sheet.tsx:1187` | Preview/demo | **code-const** (placeholder ok) | P2 | LATER |
| 18 | Beta capacity / launch flags | _não existem ainda_ | — | **app_config** quando aparecerem | — | — |
| 19 | Strings PT/EN visíveis dispersas em componentes (`PRINT`, `OBRIG.`, "A verificar…") | múltiplos | i18n parcial | **i18n** (à medida) | P2 | LATER (refactor grande) |
| 20 | `"InstaBench"` (nome do produto) | múltiplos componentes/seo | nome marca | **brand-const** opcional (baixo valor — nunca muda) | P2 | LATER |

## 3. Mudanças propostas neste plano (apenas P0 + P1 seguros)

### 3.1 Brand/legal config central
Criar `src/lib/brand/legal.ts` (puro código, sem secrets, sem env):

```ts
export const LEGAL = {
  companyName: "Fomentar Sonhos, Lda.",
  address: {
    street: "Rua da Carvalha n.º 570",
    postalCode: "2400-441",
    city: "Leiria",
    country: "Portugal",
    full: "Rua da Carvalha n.º 570 · 2400-441 Leiria · Portugal",
  },
  privacyEmail: "frederico.carvalho@digitalfc.pt",
  domain: "instabench.pt",
  operatorCity: "Leiria, Portugal",
  productName: "InstaBench",
} as const;
```

Adicionar `src/lib/brand/__tests__/legal.test.ts` com snapshot mínimo + asserção de formato do email/postal code.

### 3.2 Refactor de páginas legais
Substituir literais em `routes/privacidade.tsx`, `termos.tsx`, `aviso-legal.tsx`, `cookies.tsx` por `LEGAL.companyName`, `LEGAL.address.full`, `LEGAL.privacyEmail`. **Não alterar a estrutura ou copy** — apenas extracção.

### 3.3 Unlock modal operator block (i18n)
`i18n/{pt,en}/gate.json` → `unlock.operator.name/city`: manter as strings (i18n continua a ser fonte do *display*), mas adicionar nota no topo de `legal.ts` a indicar que o i18n duplica `LEGAL.companyName` e `LEGAL.operatorCity` e referenciar onde manter ambos em sincronia.

Decisão: **não** ler `LEGAL` dentro do i18n (i18n é canónico para visible text). Apenas adicionar:
- script de teste (`legal.test.ts`) que valida que `gate.json` operator.name === `LEGAL.companyName` (PT+EN) para detectar drift.

### 3.4 `report_retention_days` em `app_config`
- Migration: `INSERT INTO app_config(key,value) VALUES ('report_retention_days','15') ON CONFLICT DO NOTHING;` — preserva fallback de código (15) caso a leitura falhe.
- `src/lib/report/retention.ts`: manter constantes síncronas (são usadas em testes e em paths sem await). Adicionar `getReportRetentionDays()` async que lê de `app_config` com fallback 15, **mas não a ligar ainda** — apenas exportada para uso futuro em server functions que escolham config dinâmica. Evita refactor amplo.
- Documentar em comentário que 15 fica como SoT até a leitura dinâmica ser adoptada.
- Decisão alternativa (preferida pelo user?): adiar 7→retention dinâmica e manter só constante. **Pergunta abaixo.**

### 3.5 Domínio `instabench.pt`
- Substituir literal em `routes/privacidade.tsx` por `LEGAL.domain`.
- Em `src/lib/analysis/cost.ts`, o salt `"instabench-default-salt"` é apenas fallback de dev — **manter** (segurança: salt produtivo vive em `IP_HASH_SALT` env, que deve continuar; verificar se está set).

## 4. Fora deste plano (P2, intencional)

- Pricing labels (€9.90/€49.90/€29.90/€29/€3) — esperar checkout.
- Migração de copy ad-hoc para i18n (>50 strings; refactor à parte).
- Reorganização do `mailtoPro/Agency` para i18n.
- Beta launch flags / capacity (ainda não existem).

## 5. Validação

```bash
bunx tsc --noEmit
bunx vitest run src/lib/brand src/lib/report src/lib/config
```

E reportar no fim: lista de valores hardcoded **intencionalmente** deixados (toda a linha "LATER" + sender identities env-based + UNIFIED_ACTOR + LANG_STORAGE_KEY + `IP_HASH_SALT` fallback).

## 6. Constraints respeitadas

- Sem mover secrets para Supabase.
- Sem mover schema/algorithm constants para Supabase.
- Sem alterar provider logic.
- Defaults de código mantidos como fallback (resiliência).
- i18n permanece canónico para visible text.

## 7. Checkpoint

☐ Criar `src/lib/brand/legal.ts` + teste de drift contra `gate.json`.
☐ Refactor 4 páginas legais para usar `LEGAL.*`.
☐ Migration: `INSERT report_retention_days=15` em `app_config`.
☐ Adicionar `getReportRetentionDays()` (não ligar consumidores agora).
☐ `bunx tsc --noEmit` + `bunx vitest run` (escopo afectado).
☐ Reportar tabela final de hardcoded values deixados intencionalmente.

## 8. Pergunta antes de Build Mode

**Q1 — Retention dinâmica**: queres que (a) só adicione a chave `report_retention_days` em `app_config` + helper async sem ligar consumidores (mais seguro, zero risco), ou (b) que ligue também o `cache-status-badge` e o `persist-report-snapshot` a lerem dinamicamente (precisa de passar `expiresAt` calculado do server, mais mudanças)? **Recomendo (a)**.

**Q2 — Drift test gate.json↔LEGAL**: ok adicionar um teste vitest que falha se `gate.json/unlock.operator.name` divergir de `LEGAL.companyName`? Sem este teste, o duplicado fica silencioso. **Recomendo sim**.
