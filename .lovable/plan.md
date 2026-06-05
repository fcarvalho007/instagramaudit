
# Auditoria de Internacionalização (PT/EN)

## 1. Estado actual dos ficheiros de tradução

Comparei as 11 namespaces em `src/i18n/locales/{pt,en}`. Estrutura completa nos dois idiomas. Lacunas:

- **`report.json` (EN)** — faltam **6 chaves** que existem em PT:
  - `identity.fallback_cadence_qualifier.window_30d`
  - `identity.fallback_cadence_qualifier.window_90d`
  - `identity.fallback_cadence_qualifier.sample_span`
  - `identity.fallback_hashtags_absent`
  - `nav.eyebrow_single`
  - `nav.eyebrow_multi`
- Restantes namespaces (`analyze`, `auth`, `common`, `errors`, `footer`, `gate`, `header`, `landing`, `pricing`, `unsubscribe`): paridade de chaves PT↔EN. Não há chaves órfãs em EN.
- Strings "idênticas" PT=EN detetadas são tokens legítimos (`"365d"`, `"Reels"`, `"{{count}} posts"`, `"Email"`, nomes próprios) — **nenhuma string PT esquecida no ficheiro EN do report**.

## 2. Strings PT hardcoded em componentes (não passam por `t()`)

Este é o maior problema. Áreas com PT cravado no JSX/TSX:

### 2.1 Relatório (`/analyze/$username`)
- `report-redesign/report-hero.tsx` — eyebrows, "Relatório editorial", "Perfil público no Instagram", "Dados públicos", "{n} publicações analisadas"
- `report-redesign/report-kpi-grid.tsx` — "Engagement médio", "Publicações analisadas", "publicações por semana", "Em afinação"
- `report-redesign/report-pending-ai-notice.tsx` — todo o bloco de pendente IA
- `report-redesign/report-shell.tsx` — `aria-label`s ("Comparação com perfis pares", "Top publicações", etc.)
- `report-redesign/v2/premium-interest-dialog.tsx` — "Reservar diagnóstico" + cards
- `report-redesign/v2/sticky-unlock-bar.tsx` — defaults usados quando t() falha
- `report-redesign/v2/report-source-label.tsx` — `A11Y_FALLBACK` em PT
- `report-redesign/v2/report-shortcut-dialog.tsx` — defaultValues PT
- `report-redesign/v2/feedback/block-feedback.tsx` — escala emoji ("Péssimo"…"Excelente"), toasts, prompts
- `report-share/share-popover.tsx` + `report-share/report-final-block.tsx` — "Partilhar este relatório", toasts, "Levar este relatório"
- `report-share/share-copy.ts` e `report-tier/tier-copy.ts` e `report-beta/beta-copy.ts` e `report-enriched/report-enriched-copy.ts` — **ficheiros de copy estáticos em PT, totalmente fora de i18n**
- `report-enriched/*` — aria-labels, "menção"/"menções", "Disponível nas secções premium"
- `report-market-signals/report-market-signals.tsx` — múltiplas frases dinâmicas (insights, hints, "Sem dados nesta análise", "Evolução do interesse de pesquisa")
- `report/report-top-posts.tsx` — `"Top 5 publicações"`, `"Publicações com maior envolvimento"`, `"últimos 30 dias"`
- `report/sparkline.tsx` — `ariaLabel = "Tendência dos últimos 15 dias"`

Contagem rápida só dentro de `src/components/report-redesign`: **~379 linhas com caracteres PT** (acentos), fora de `t()`.

### 2.2 Fora do relatório
- `checkout/*` (offer-card, order-summary, qualification-form, billing-form, upsell-interest) — labels, mensagens de erro e copy do checkout EuPago
- `beta/beta-request-form.tsx` — formulário inteiro
- `app/app-sidebar.tsx`, `app/app-topbar.tsx`, `app/report-card.tsx`, `app/pro-tracking-teaser.tsx`
- `legal/legal-layout.tsx` — disclaimers
- `onboarding/onboarding-modal.tsx` — passos

### 2.3 Routes
Falta confirmar `head()` por rota: várias rotas (`admin.*`, `app.*`, `checkout.*`, legais) provavelmente têm `<title>`/`description` hardcoded em PT — auditar caso a caso.

## 3. Mecanismo de detecção de idioma

Implementado em `src/i18n/index.ts` + `src/hooks/use-language.ts`:

1. SSR e primeiro render do cliente **forçam sempre `pt`** (`lng: "pt"`, `initImmediate: false`) para evitar mismatch de hidratação.
2. Após hidratação, `useLanguage` corre `useEffect`:
   - lê `localStorage["instabench.lang"]` → se válido (`pt`|`en`), usa
   - senão lê `navigator.language` → começa com `pt` ou `en`
   - senão `Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/Lisbon"` → `pt`
3. `document.documentElement.lang` é definido conforme idioma activo (`pt-PT`/`en`).
4. `LanguageSwitcher` grava escolha em `localStorage` e dispara `i18n.changeLanguage`.

### Lacunas no mecanismo
- **Sem detecção via `Accept-Language` no servidor** — utilizador EN vê PT no primeiro paint, só muda após JS hidratar (flash de PT).
- **Sem prefixo de URL (`/en/...`)** nem domínio dedicado — Google indexa apenas a versão PT; partilhas EN voltam a PT.
- **Sem `<link rel="alternate" hreflang="...">`** no `<head>` — perde SEO bilingue.
- **Sem `og:locale`/`og:locale:alternate`** nas meta tags.
- **`head()` por rota está em PT fixo** (títulos, descriptions, `meta.title`/`meta.description` de `analyze.json` existem traduzidos, mas os route loaders não consomem o idioma activo no SSR — primeiro paint é sempre PT).
- **Sem fallback EN→PT visível**: chaves em falta (ver §1) renderizam a key crua em EN.

## 4. Seletor de idioma no mobile

Estado actual em `header.tsx`:
- Desktop/tablet (`sm:` ≥640px): pill `LanguageSwitcher` visível à direita.
- **Mobile (<640px): escondido (`hidden sm:inline-flex`)**, só acessível dentro do menu drawer.

### Avaliação da proposta do utilizador
"Mostrar seletor no topo apenas na primeira página (mobile)".

**Recomendação: mostrar sempre no topo no mobile, em todas as páginas**, não apenas na homepage. Razões:

- Coerência: o utilizador EN pode chegar via link directo a `/analyze/<user>` ou `/precos`; se só estiver na home, fica preso em PT.
- Espaço: a chip compacta (`🇵🇹 PT ▾`) ocupa ~56px — cabe entre brand e botão de menu sem comprometer o CTA (que já está escondido em `<sm`).
- Padrão Iconosquare/editoriais semelhantes: idioma sempre visível no topo.
- Custo de implementação: remover `hidden sm:inline-flex` e ajustar espaçamentos do header. Manter também dentro do drawer (variante `full`) para descoberta.

Se a preocupação for ruído visual, alternativa minimalista: **mostrar apenas a bandeira sem texto** no mobile (variante ainda mais compacta), e a versão full no drawer.

## 5. Plano de remediação proposto (sem implementar agora)

### Fase A — Hardcoded strings no Relatório (alto impacto)
1. Migrar `report-share/share-copy.ts`, `report-tier/tier-copy.ts`, `report-beta/beta-copy.ts`, `report-enriched/report-enriched-copy.ts` → chaves em `report.json` (PT+EN).
2. Substituir strings literais por `t(...)` em:
   - `report-redesign/report-hero.tsx`, `report-kpi-grid.tsx`, `report-pending-ai-notice.tsx`, `report-shell.tsx` (aria-labels)
   - `report-redesign/v2/{sticky-unlock-bar, premium-interest-dialog, report-source-label, report-shortcut-dialog, feedback/block-feedback}.tsx`
   - `report-share/{share-popover, report-final-block}.tsx`
   - `report-enriched/*`, `report-market-signals/report-market-signals.tsx`
   - `report/report-top-posts.tsx`, `report/sparkline.tsx`

### Fase B — Fora do relatório
3. `checkout/*` (orderbook + EuPago), `beta/beta-request-form.tsx`, `app/{sidebar,topbar,report-card,pro-tracking-teaser}.tsx`, `legal/legal-layout.tsx`, `onboarding/onboarding-modal.tsx`.
4. Auditar `head()` de todas as rotas: garantir uso de `t("meta.title", ...)`.

### Fase C — Mecanismo
5. Adicionar 6 chaves em falta em `en/report.json`.
6. Adicionar `Accept-Language` no SSR para escolher `lng` inicial (e re-introduzir hidratação consistente via cookie em vez de localStorage, eliminando o flash PT).
7. Adicionar `<link rel="alternate" hreflang="pt-PT|en|x-default">` no `__root.tsx`/por rota.
8. Acrescentar `og:locale` + `og:locale:alternate` às meta tags.

### Fase D — UX Mobile
9. Header: remover `hidden sm:inline-flex` do `LanguageSwitcher`; adicionar variante "flag-only" para mobile; manter no drawer.

### Fase E — Guard-rails
10. Adicionar teste de paridade de chaves PT↔EN (já existe `i18n/__tests__/*` — estender com check estrutural).
11. Adicionar regra ESLint custom (ou script `lint:i18n`) que falhe quando encontrar strings com caracteres acentuados PT fora de `locales/`.

---

**Próximo passo**: confirmar se queres que avance com Fase A (relatório completo) primeiro, ou se preferes começar pela Fase D (UX mobile do seletor) que é a alteração mais pequena e visível.
