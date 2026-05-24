# Header da aplicação — Entrar + Seletor PT/EN + i18n

## Contexto e descobertas

- `src/components/layout/header.tsx` está em **LOCKED_FILES.md** (Sprint 0, Prompt 3). Precisa de desbloqueio explícito para esta alteração — o pedido atual serve como autorização.
- Routes de auth já existem: `/login`, `/signup`, `/app/*`. O header **não** lê sessão.
- **Não existe** qualquer biblioteca i18n no projeto. Toda a UI (landing, relatório, unlock, modais, admin, emails) está em pt-PT hardcoded em ~112 ficheiros `.tsx` públicos.
- O botão "tema" atual (Moon icon) é decorativo — não tem handler. Vou mantê-lo intacto neste prompt (fora de âmbito).

## ⚠️ Decisão de âmbito importante

Escolheste "i18n a sério em toda a app". Isto é um **projeto multi-prompt** (não cabe num único turno). O plano abaixo separa a entrega em duas fases:

- **Fase 1 (este prompt)** — header funcional + infraestrutura i18n pronta + traduções do header e landing.
- **Fase 2 (prompts seguintes)** — traduzir relatório, unlock modal, /app, legais, emails.

Sem isto, ficaria com strings PT misturadas com EN quando o utilizador trocasse o idioma — pior do que não ter EN. Confirma se aceitas esta divisão antes de aprovar.

## Fase 1 — Entregáveis

### 1. Infraestrutura i18n

- Adicionar dependências: `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- Criar `src/i18n/index.ts` (configuração) com:
  - Idiomas: `pt` (default, fallback), `en`.
  - Detecção: localStorage (`instabench.lang`) → `navigator.language` → `pt`.
  - Namespaces iniciais: `common`, `header`, `landing`.
- Criar `src/i18n/locales/{pt,en}/{common,header,landing}.json`.
- Inicializar i18n em `src/start.ts` (client-side) — usar `Suspense` boundary no `__root.tsx` para evitar flash SSR.
- Hook utilitário `useLanguage()` que devolve `{ lang, setLang }` e persiste em localStorage + atualiza `<html lang="…">`.

> **SSR nota:** Como a app usa TanStack Start com SSR, o idioma inicial vai sempre como `pt` no HTML server-rendered. A hidratação cliente troca para EN se o utilizador tiver escolhido. Aceitável para Fase 1; um cookie-based detector pode vir depois se houver problemas SEO.

### 2. Auth state leve no router context

- `__root.tsx` está locked, mas o contexto auth precisa de ser exposto. Em vez de tocar nele, criar um **hook standalone** `useAuthSession()` (em `src/hooks/use-auth-session.ts`) que:
  - chama `supabase.auth.getSession()` no mount,
  - escuta `onAuthStateChange`,
  - devolve `{ session, user, loading }`.
- O Header consome este hook (sem `beforeLoad`, porque só precisamos do estado para UI, não para gate). Gates reais já existem em `/app/*`.

### 3. Header atualizado (`src/components/layout/header.tsx` — LOCKED, desbloqueio para este prompt)

Layout desktop (esquerda → direita):

```text
[BrandMark] InstaBench │ INSTAGRAM BENCHMARK    [Analisar]    [PT▾]  [🌙]  [Entrar]  [Analisar agora →]
```

Mudanças:

- Trocar todas as strings hardcoded por `t('header:…')`.
- **LanguageSwitcher** (novo, `src/components/layout/language-switcher.tsx`): dropdown compacto `PT / EN` usando `DropdownMenu` do shadcn. Mostra código de 2 letras + chevron. Trocar idioma chama `i18n.changeLanguage()` + persiste.
- **Botão Entrar**:
  - Se `!session`: link discreto "Entrar" (variant ghost) → `/login`.
  - Se `session`: substitui por "A minha conta" → `/app`.
  - Loading state: skeleton de 60px para evitar flash.
- Drawer mobile: adicionar seletor de idioma + link Entrar/A minha conta no fundo, acima do CTA.

### 4. Traduções Fase 1

- **`header.json`** — brand subtitle, nav items, "Entrar", "A minha conta", "Analisar agora", labels mobile drawer, aria-labels.
- **`landing.json`** — strings da página inicial (hero, social proof, how-it-works, product preview, CTA final). Strings dentro de componentes locked **não vão ser editadas** — vou tocar apenas em componentes não-locked e usar default text como fallback EN para os locked (que ficam PT em ambos os idiomas até Fase 2).

### 5. Atualizar `<html lang>`

- `src/routes/__root.tsx` já define `lang="pt-PT"` estático. Mudança mínima: hook no Header (ou novo componente em `__root` se desbloqueado) que faz `document.documentElement.lang = lang` no cliente.

## Fora de âmbito (Fase 2 / prompts futuros)

- Tradução de: relatório (`report-redesign/*`), unlock modal, `/app/*`, páginas legais (`/aviso-legal`, `/cookies`), emails Brevo, admin (admin fica sempre PT por política do projeto).
- Tornar o toggle de tema funcional (continua decorativo).
- SEO meta tags traduzidas por route (precisa `head()` dinâmico em cada route).
- Componentes locked da landing (`hero-section`, `social-proof-section`, etc.) — ficam com texto PT hardcoded até serem desbloqueados num prompt dedicado.

## Ficheiros tocados (Fase 1)

| Ficheiro | Ação |
|---|---|
| `package.json` | + i18next, react-i18next, i18next-browser-languagedetector |
| `src/i18n/index.ts` | novo |
| `src/i18n/locales/pt/{common,header,landing}.json` | novo |
| `src/i18n/locales/en/{common,header,landing}.json` | novo |
| `src/hooks/use-auth-session.ts` | novo |
| `src/components/layout/language-switcher.tsx` | novo |
| `src/components/layout/header.tsx` | **editar (LOCKED — autorizado)** |
| `src/start.ts` | + import `./i18n` |
| `LOCKED_FILES.md` | manter; adicionar nota da edição autorizada de header |

## Checkpoint ☐

- [ ] Header mostra: brand · Analisar · seletor PT/EN · toggle tema (intacto) · Entrar/A minha conta · Analisar agora
- [ ] Trocar para EN traduz brand subtitle, nav, botões e drawer mobile
- [ ] Sessão ativa → "Entrar" substituído por "A minha conta" → /app
- [ ] Idioma persiste após refresh (localStorage)
- [ ] `<html lang>` atualiza no cliente
- [ ] Landing pages não-locked traduzidas; locked permanecem PT (documentado)
- [ ] Sem regressões de SSR (Fraunces/Inter renderizam, sem flash)

Confirma a divisão Fase 1 / Fase 2 e aprovo para começar.
