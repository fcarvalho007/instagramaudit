# Plano — Seletor de idioma no header + deteção automática

## Objetivo

Tornar a troca PT/EN acessível diretamente no topo (desktop + mobile), mantendo o seletor no footer, e refinar a deteção inicial de idioma com fallback por timezone.

## Ficheiros a alterar

1. **`src/components/layout/header.tsx`**
   - Desktop: inserir `<LanguageSwitcher variant="compact" />` no cluster da direita, entre o botão de tema (Moon) e o botão "Entrar". Visível em `sm:` para cima; em ecrãs muito estreitos fica no drawer.
   - Mobile drawer: já contém o `LanguageSwitcher variant="full"` (linha 202–207) — mantido sem alterações.

2. **`src/components/layout/language-switcher.tsx`**
   - Manter a API atual (`compact` / `full`).
   - Acrescentar bandeira emoji (🇵🇹 / 🇬🇧) antes do código no trigger `compact` e antes do nome no menu, sem aumentar significativamente a largura.
   - `aria-label` já existe (`t("aria.language")` → "Mudar idioma"/"Change language"). Confirmar foco visível (já vem do `Button ghost`).

3. **`src/hooks/use-language.ts`**
   - Refinar a lógica pós-mount (já corre só no cliente, evita hydration mismatch) com a prioridade pedida:
     1. `localStorage[LANG_STORAGE_KEY]` se válido (`pt`|`en`).
     2. `navigator.language` → começa por `pt` ⇒ `pt`; por `en` ⇒ `en`.
     3. Fallback fraco: `Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/Lisbon"` ⇒ `pt`.
     4. Default `pt` (já é o init do i18n; não força mudança).
   - Continua a NÃO chamar nenhuma API externa nem geolocalização por IP.
   - `setLanguage` mantém: `i18n.changeLanguage` + `localStorage.setItem` + `document.documentElement.lang` (já feito num `useEffect` separado).

4. **`src/i18n/locales/pt/header.json`** e **`src/i18n/locales/en/header.json`**
   - Já contêm `aria.language`, `language.label`, `language.pt`, `language.en`. Sem alterações de copy necessárias (os requisitos do prompt já estão satisfeitos: "Português"/"Inglês"/"Alterar idioma" e equivalentes EN). Nada a fazer aqui.

## Ficheiros NÃO alterados

- `src/components/layout/footer.tsx` (mantém o seletor secundário).
- `src/i18n/index.ts` (init síncrono em `pt` mantém-se — crítico para SSR/hidratação).
- Qualquer ficheiro de relatórios, pricing, backend, providers, lead magnet, emails ou schema.

## Comportamento de deteção

- SSR e primeiro render do cliente: sempre `pt` (igual ao atual → sem hydration mismatch).
- Após mount, `useLanguage` aplica a prioridade acima e chama `i18n.changeLanguage` apenas se o resultado for diferente do atual.
- Sem bloqueio de render; sem chamadas de rede.

## UI desktop (cluster direito do header)

```text
[Moon] [🇵🇹 PT ▾] [Entrar] [Analisar agora →] [≡ mobile]
```

- `compact` usa `Button ghost size="sm"`, mantém densidade do header.
- `hidden sm:inline-flex` para não competir com o hamburger em ecrãs muito estreitos (no drawer já existe).

## Validação

- `bunx tsc --noEmit`.
- `bunx vitest run` (não há testes específicos de language switcher; correr para garantir que nada quebra).
- Smoke manual: trocar idioma no header desktop, verificar persistência após reload; abrir drawer mobile e confirmar seletor; confirmar que footer continua a funcionar; verificar consola sem warnings de hidratação.

## Checkpoint

- ☐ Header desktop mostra seletor 🇵🇹 PT / 🇬🇧 EN entre tema e "Entrar"
- ☐ Drawer mobile continua a expor o seletor (sem necessidade de footer)
- ☐ Footer mantém seletor
- ☐ Prioridade de deteção: localStorage → navigator.language → timezone Europe/Lisbon → pt
- ☐ Sem IP geolocation, sem chamadas externas
- ☐ Sem hydration warnings
- ☐ `tsc` e `vitest` verdes
