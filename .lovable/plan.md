## Objetivo

Adicionar inglês como segundo idioma do front-end público, alternável em runtime via `LanguageSwitcher` (já existente no header). pt-PT continua a ser o default e a versão canónica; EN é opção paralela que o utilizador escolhe a qualquer momento e fica persistida em `localStorage`.

## Princípio chave

**Nada é removido em pt-PT.** Cada string passa a viver em `locales/pt/*.json` (cópia 1:1 do que está hoje hardcoded) e ganha equivalente em `locales/en/*.json`. O componente lê via `t("chave")`. Trocar idioma re-renderiza sem reload.

## Âmbito

**Traduzido (PT + EN):**
- Landing (`routes/index.tsx` + `components/landing/*`)
- Header, Footer, AppShell
- Auth: `/login`, `/signup`, `/reset-password`, `auth-card`
- App autenticada: `/app`, `/app/account`, `/app/plan`, `/app/reports`, `/app/reports/$id`, sidebar, topbar, report-card, pro-tracking-teaser
- Fluxo `/analyze/$username`: skeleton, error, dashboard, conversion-layer, unlock modal, gate, lock-gate, pricing-feedback
- Report: `report/*`, `report-redesign/*`, `report-enriched/*`, `report-market-signals/*`, `report-share/*`, `report-tier/*`, `report-beta/*`, `/report/example`
- Beta: `beta-request-form`, `beta-step-indicator`, `feedback-form`, `/beta/request`, `/beta/submitted`, `/feedback/$requestId`
- Legais: `/privacidade`, `/termos`, `/cookies`, `/aviso-legal`
- Meta tags SEO (`head()`)
- Toasts e mensagens de erro visíveis

**Mantém-se só em pt-PT:**
- Admin (`/admin/*`, `components/admin/*`) — por design
- Emails Brevo — fase separada
- Insights gerados por IA — prompt OpenAI é pt-PT; em modo EN mostra-se aviso discreto "AI insights are generated in Portuguese"
- Comentários de código, logs internos, erros de servidor

## Arquitetura i18n

### Namespaces (`src/i18n/locales/{pt,en}/`)

```
common.json       já existe — botões/ações/toasts globais
header.json       já existe
footer.json       novo
landing.json      já existe — substituir placeholder
auth.json         novo — login, signup, reset
app.json          novo — sidebar, topbar, account, plan, reports
analyze.json      novo — fluxo /analyze
report.json       novo — todos os blocos do report
report-share.json novo — substitui share-copy.ts
unlock.json       novo — unlock modal + gate
beta.json         novo — beta + feedback
legal.json        novo — páginas legais
seo.json          novo — titles + descriptions por route
```

Atualizar `src/i18n/index.ts` para registar todos os namespaces (continua síncrono — bundle estimado &lt; 80KB para ambos os idiomas).

### Helpers de formatação

Criar `src/lib/i18n/format.ts`:
- `formatDate(date, language)` → `Intl.DateTimeFormat`
- `formatNumber(n, language)` → `Intl.NumberFormat`
- `formatRelativeTime(date, language)` → `Intl.RelativeTimeFormat`

Substituir formatações hardcoded pt-PT pelos helpers que recebem `language` do `useLanguage()`.

### Ficheiros `*-copy.ts`

Converter cada um (`share-copy.ts`, `beta-copy.ts`, `tier-copy.ts`, `report-enriched-copy.ts`, `market-signals-copy.ts`, `share-message.ts`) numa função `getCopy(t)` que devolve o mesmo shape lendo do namespace correspondente. Componentes consumidores recebem o objeto via hook.

## Plano de execução por lotes

Volume estimado: ~112 ficheiros. Lotes sequenciais com verificação de build entre cada. Se o budget de tokens apertar, parto em 2 prompts (A–D, depois E–G) — aviso antes.

**Lote A — Infra (10 ficheiros)**
Expandir `i18n/index.ts`; criar 22 ficheiros JSON (11 namespaces × 2 idiomas); criar `lib/i18n/format.ts`; Footer + AppShell.

**Lote B — Auth + App (15 ficheiros)**
`/login`, `/signup`, `/reset-password`, `auth-card`, `/app/*`, sidebar, topbar, report-card, pro-tracking-teaser.

**Lote C — Landing (10 ficheiros)**
`index.tsx` + todos os `landing/*`.

**Lote D — Analyze + Unlock (12 ficheiros)**
`/analyze/$username`, skeleton, error-state, public-analysis-dashboard, post-analysis-conversion-layer, unlock-modal, report-gate-modal, report-lock-gate, premium-locked-section, pricing-feedback-sheet.

**Lote E — Report (35+ ficheiros)**
Todos os subdirs `report*`. Converter `*-copy.ts`. Inclui `/report/example`.

**Lote F — Beta + Feedback (6 ficheiros)**
`beta-request-form`, `beta-step-indicator`, `feedback-form`, `/beta/request`, `/beta/submitted`, `/feedback/$requestId`.

**Lote G — Legal + SEO (8 ficheiros)**
4 páginas legais com conteúdo EN + nota "Portuguese version prevails for legal purposes"; todos os `head()` a ler de `seo.json`.

## Regras de tradução

- Termos técnicos de marketing (engagement, reach, benchmark, follower) mantidos em inglês nos dois idiomas — já é convenção.
- Tom editorial preservado: traduzir intenção, não palavra-a-palavra.
- Interpolação: `{{ username }}`, `{{ count }}` — sintaxe i18next.
- Pluralização: chaves `_one` / `_other`.
- Rich text com `<strong>`/links → componente `<Trans>`.
- Nenhum fallback hardcoded; chave em falta é bug detetável.

## SSR e `lang` attribute

- HTML inicial sai como `lang="pt-PT"` (default no servidor); cliente faz swap para EN se o utilizador tiver escolhido — `useLanguage` já trata.
- Sem flash perceptível porque o JS hidrata antes do primeiro paint significativo do conteúdo i18n.

## Ficheiros bloqueados (`LOCKED_FILES.md`)

Vários componentes em escopo estão protegidos (landing components, report-redesign, etc.). Autorizar este prompt como exceção, logar cada alteração no `LOCKED_FILES.md` no fim, sem alterar layout/estilo — apenas substituir texto por `t()`.

## Riscos

1. **Volume de tokens**: posso ter de quebrar em 2 prompts a meio do Lote E. Aviso antes de cortar.
2. **Insights IA continuam em pt-PT** — banner discreto em EN explicando.
3. **Páginas legais EN**: tradução de conveniência com disclaimer; versão pt-PT é a vinculativa.

## Checkpoint

☐ 11 namespaces criados em pt + en
☐ `lib/i18n/format.ts` em uso para datas/números
☐ Footer + AppShell traduzidos
☐ Auth + App autenticada traduzidos
☐ Landing 100% traduzida
☐ Analyze + Unlock traduzidos
☐ Report (todos subdirs + example) traduzido
☐ Beta + Feedback traduzidos
☐ Legais com versão EN + disclaimer
☐ Meta tags SEO localizadas
☐ Banner "AI insights in Portuguese" em modo EN
☐ `LOCKED_FILES.md` atualizado com exceções
☐ Build limpo, sem chaves i18n em falta
☐ Toggle PT↔EN testado em: landing, /app, /analyze/[user], /report/example, /login, /privacidade

## Confirmações pedidas

1. **Quebra em 2 prompts** se o volume apertar (A–D agora, E–G depois) — ok?
2. **Insights IA ficam pt-PT** nesta fase com banner em modo EN — ok?
3. **Páginas legais EN** com disclaimer "Portuguese version prevails" — ok ou preferes manter legais só em pt-PT?
