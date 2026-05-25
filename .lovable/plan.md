## Contexto

`header.tsx` e `footer.tsx` estão em `LOCKED_FILES.md`. O prompt do utilizador é permissão explícita para editar ambos no âmbito restrito de ligar `/precos`. Não há outras alterações.

## Mudanças

### 1. `src/i18n/locales/pt/header.json` + `en/header.json`
- Adicionar `nav.pricing`: "Preços" / "Pricing".

### 2. `src/i18n/locales/pt/footer.json` + `en/footer.json`
- Adicionar `links.pricing`: "Preços" / "Pricing".

### 3. `src/components/layout/header.tsx`
- Inserir `{ labelKey: "nav.pricing", href: "/precos", match: (p) => p.startsWith("/precos") }` no array `navItems`, posicionado a seguir a `examples`. Aparece automaticamente na nav desktop (pill) e no drawer mobile — o render já mapeia `navItems`. Mantém language switcher, login/account e CTA "Analisar agora" intactos.
- Usar `<a href="/precos">` igual aos restantes itens (consistência com os atuais `#como-funciona` / `#exemplos` que usam `<a>`); navegação SPA não é crítica neste contexto e mantém o padrão visual existente. Alternativa considerada: usar `<Link to="/precos">` apenas para este item — rejeitada para não introduzir branch condicional no map.

### 4. `src/components/layout/footer.tsx`
- Inserir `{ label: t("links.pricing"), href: "/precos" }` no início do array `links` (antes de `contact`), agrupando como item de produto vs. itens institucionais.

## Fora de âmbito

Admin sidebar, report sidebar, lógica de pricing, providers, checkout, páginas legais, `LOCKED_FILES.md` (não atualizar — esta é uma edição autorizada pontual, igual à nota de 2026-05-24 já existente para o header).

## Validação

- `bunx tsc --noEmit` verde.
- `bunx vitest run` verde (testes existentes não tocam estes ficheiros).
- Manual: PT mostra "Preços" no header e footer; EN mostra "Pricing"; clique navega para `/precos`; drawer mobile inclui o item sem partir layout (375px).