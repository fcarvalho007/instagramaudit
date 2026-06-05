# Fix duplicate footer + hydration mismatch on landing

## Diagnóstico

Confirmei dois problemas reais na home (`/`), que explicam o que vês:

### 1. Footer duplicado

`AppShell` (em `src/components/layout/app-shell.tsx`) renderiza `<DarkFooter />` quando a rota é `/`.

Ao mesmo tempo, `LandingDarkIsland` (em `src/components/landing/dark/landing-dark-island.tsx`) inclui no fim o `<MiniFooterStrip />` (logo + tagline + Preços / Privacidade / Termos / Contacto).

Resultado: aparecem dois "rodapés" um a seguir ao outro:
- MiniFooterStrip (dentro da ilha dark, com cantos arredondados)
- DarkFooter global (links institucionais + language switcher + copyright)

### 2. Hydration mismatch ("dark.transparency.audience")

O runtime error mostra o servidor a renderizar a string crua `dark.transparency.audience` e o cliente a renderizar `"Feito para consultores, social media managers, marcas e criadores."`. As chaves PT/EN existem — o problema é que o i18next não está inicializado/pronto durante SSR para esse namespace, então o servidor devolve a key e o cliente devolve a tradução. Isto é o que dispara o erro #418 em produção e o reset da árvore React. Acontece em qualquer band que use `useTranslation("landing")` — a `TransparencyBand` é só a primeira a falhar.

## Plano (apenas presentation/i18n, sem tocar em hero / checkout / EuPago / onboarding / backend / admin)

### A. Remover footer duplicado
- Em `src/components/landing/dark/landing-dark-island.tsx`: remover o `<MiniFooterStrip />` e o respectivo import. O `DarkFooter` global já cobre brand + links + language switcher.
- Manter `MiniFooterStrip.tsx` no repo (não apagar) caso seja preciso reintroduzir noutro contexto, mas deixar de o renderizar.

### B. Estancar o flash de chaves cruas (`dark.transparency.audience`)
Causa: SSR renderiza antes do bundle `landing` estar resolvido. Duas opções, escolho a menos invasiva:

1. Garantir que `landing` está em `ns` / `defaultNS` pré-carregado no `src/i18n/index.ts` (inspeccionar e, se em falta, juntar `"landing"` à lista de namespaces pré-carregados — não inventar config nova).
2. Se `react-i18next` estiver com `useSuspense: true` mas sem `<Suspense fallback>` à volta da ilha, mudar para `useSuspense: false` no init (já é a config segura para SSR + hidratação).

Aplicar a mínima das duas que resolva (provavelmente só (1)).

### C. Validação
- `bunx tsc --noEmit`
- Abrir `/` no preview em desktop 1440 e mobile 390:
  - confirmar 1 único footer (DarkFooter global)
  - confirmar que não aparece nenhuma string `dark.*` crua em nenhum band
  - confirmar consola sem erros de hydration / React #418

## Fora de scope (não tocar)

- Hero / primeira fold
- Copy, hierarquia ou padding das bands já refinados
- Checkout, EuPago, onboarding, geração de relatórios, backend, admin
- Sem novas dependências
