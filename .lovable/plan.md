## Diagnóstico

Audit rápido: apenas `header.tsx`, `footer.tsx` e `language-switcher.tsx` consomem i18n. Tudo o resto (~100+ ficheiros públicos) tem copy hardcoded em pt-PT. O toggle EN no header existe mas, na prática, só muda o header e footer. A landing, auth, app, analyze, report, beta e páginas legais permanecem em pt-PT mesmo com EN selecionado.

**Veredito:** o "switch para EN" está partido na perceção do utilizador. Precisamos completar os lotes B–G.

## Estratégia revista

O volume é incompatível com um único prompt. Proponho **dividir em 3 prompts sequenciais** com critério claro de sucesso em cada um:

### Prompt atual (este) — Lotes B + C + D

Cobre as superfícies mais visíveis no primeiro contacto:
- **B — Auth + App autenticada (15 ficheiros):** `/login`, `/signup`, `/reset-password`, `auth-card`, `/app/*` (account, plan, reports, reports/$id), `app-sidebar`, `app-topbar`, `report-card`, `pro-tracking-teaser`
- **C — Landing (10 ficheiros):** `index.tsx`, `hero-section`, `hero-action-bar`, `social-proof-section`, `how-it-works-section`, `how-it-works-step`, `product-preview-section`, `handwritten-note`, `mockup-*`, `scroll-indicator`
- **D — Analyze + Unlock (12 ficheiros):** `/analyze/$username`, `analysis-skeleton`, `analysis-error-state`, `analysis-header`, `public-analysis-dashboard`, `post-analysis-conversion-layer`, `unlock-modal`, `report-gate-modal`, `report-lock-gate`, `premium-locked-section`, `pricing-feedback-sheet`, `analysis-benchmark-block`, `analysis-competitor-comparison`, `analysis-metric-card`

Cria namespaces `auth.json`, `app.json`, `landing.json` (substitui placeholder), `analyze.json`, `unlock.json` em PT + EN.

### Próximo prompt — Lote E (Report)

35+ ficheiros do report (`report/*`, `report-redesign/*`, `report-enriched/*`, `report-market-signals/*`, `report-share/*`, `report-tier/*`, `report-beta/*`, `/report/example`, `/reports/$snapshotId`). Converte os `*-copy.ts` para `getCopy(t)`.

### Prompt final — Lotes F + G

- **F — Beta + Feedback (6 ficheiros)**
- **G — Legais (4 páginas) + SEO meta tags (todos os `head()`)**
- Banner "AI insights in Portuguese" em modo EN
- `LOCKED_FILES.md` atualizado com lista de exceções
- Verificação final: rg para detetar qualquer string PT residual em superfícies públicas

## Trabalho deste prompt em detalhe

### Namespaces a criar (PT + EN)

```
auth.json     login/signup/reset/auth-card
app.json      sidebar, topbar, account, plan, reports list, report detail
landing.json  hero, social-proof, how-it-works, product-preview (substitui placeholder)
analyze.json  loading, error, header, dashboard, conversion layer
unlock.json   unlock modal, gate modal, lock gate, premium locked, pricing feedback
```

### Padrão aplicado em cada ficheiro

1. `import { useTranslation } from "react-i18next"`
2. `const { t } = useTranslation("<ns>")` no topo do componente
3. Cada string visível substituída por `t("chave")`
4. Datas/números formatados com `formatDate`/`formatNumber` do `lib/i18n/format.ts` (criado no Lote A), recebendo `language` de `useLanguage()`
5. Mensagens de toast: `t("toast.success")`, etc.
6. Para strings com rich text (`<strong>`, links): componente `<Trans>`

### Regras de tradução EN

- Tom editorial preservado, não literal
- Termos de marketing em inglês (engagement, reach, benchmark, followers) — já era convenção
- "Análise" → "Analysis", "Relatório" → "Report", "Publicação" → "Post"
- "Entrar" → "Sign in", "Registar" → "Sign up", "A minha conta" → "My account"
- Datas relativas via `Intl.RelativeTimeFormat`

### Ficheiros bloqueados

Vários componentes em escopo estão no `LOCKED_FILES.md` (landing components, report-redesign). Autorizar exceção para substituir texto por `t()` **sem alterar layout/estilo/animações**. Logar no final.

## Riscos

1. **Volume**: 37 ficheiros neste prompt. Se o budget apertar a meio do Lote D, paro depois do C e devolvo, sem deixar nada partido.
2. **Strings dinâmicas com lógica condicional** (ex: pluralização "1 post" vs "5 posts"): usar `count` e chaves `_one`/`_other`.
3. **Componentes com props de copy** (ex: `tier-copy.ts`): só converto os que não dependem do Lote E. Os shared copies do report ficam para o próximo prompt.

## Checkpoint deste prompt

☐ 5 namespaces criados em pt + en e registados em `i18n/index.ts`
☐ Lote B: auth + app traduzidos (15 ficheiros)
☐ Lote C: landing traduzida (10 ficheiros)
☐ Lote D: analyze + unlock traduzidos (12 ficheiros)
☐ Build limpo
☐ Toggle PT↔EN testado em `/`, `/login`, `/app`, `/analyze/frederico.m.carvalho`
☐ Mensagem final indica próximos prompts (E, depois F+G)

## Pergunta

Avanço com este plano? Ou preferes que comece pelo **Lote E (Report)** primeiro, dado que é a superfície mais valiosa do produto?
