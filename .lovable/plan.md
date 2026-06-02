## Alvo (Option B2, autorizado)
Tornar a homepage `/` consistentemente dark, sem alterar produto/report/admin/account/modal.

Ficheiros tocados:
1. `src/components/layout/app-shell.tsx` (unlock pontual)
2. `src/components/layout/header.tsx` (unlock pontual)
3. `src/components/layout/dark-footer.tsx` **(novo)**
4. `LOCKED_FILES.md` (registar autorização)

Tudo route-aware via `pathname === "/"`. Nenhuma outra rota muda.

---

## 1) `app-shell.tsx` — route-aware

Detectar homepage e renderizar shell diferente:

```tsx
const isHome = pathname === "/";

if (hideChrome) return <>{children}</>;

if (isHome) {
  return (
    <div className="min-h-screen flex flex-col bg-[#05060f] text-white">
      <Header variant="dark" />
      <main className="flex-1">{children}</main>
      <DarkFooter />
    </div>
  );
}

return (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 pt-8 pb-24">{children}</main>
    <Footer />
  </div>
);
```

Pontos:
- Remove `pt-8 pb-24` **apenas** em `/` → elimina banda branca acima/abaixo da ilha dark.
- `bg-[#05060f]` (mesmo tom base do `.hero-dark`) cobre o `my-10` da ilha → continuidade dark.
- Todas as outras rotas mantêm o shell atual (light, com paddings, `<Footer />`).

---

## 2) `header.tsx` — adicionar prop `variant`

Assinatura:
```tsx
function Header({ variant = "light" }: { variant?: "light" | "dark" } = {})
```

Implementação:
- Light (default): zero alteração — produto/report/account ficam intactos.
- Dark: altera classes do `<header>` raiz e dos elementos contrastantes:
  - Wrapper: `bg-[#05060f]/70 border-border-default/10` (em vez de `bg-surface-base/80 border-border-subtle`).
  - Backdrop blur mantém.
  - Brand text: `text-white` (em vez de `text-content-primary`).
  - Pill nav: `border-white/10 bg-white/[0.04]`, item ativo `bg-white/10 text-white`, inativo `text-white/70 hover:text-white`.
  - Botão ghost "Entrar": forçar `text-white/80 hover:text-white hover:bg-white/5` via `className` extra.
  - CTA primary mantém (já é roxo/azul, contrasta bem).
  - Drawer mobile: mantém light (já abre num overlay próprio); o trigger `<Menu>` recebe `text-white`.

Sem mexer em i18n, navItems, autenticação, language switcher.

---

## 3) `dark-footer.tsx` — novo

Espelha conteúdo de `Footer` (mesmas keys `t()`, mesmos links, mesma estrutura BrandMark + links + copyright + LanguageSwitcher), mas:
- `bg-[#05060f]` (ou `bg-transparent` se o shell já é dark — escolho `bg-transparent` + `border-t border-white/10`).
- Texto: `text-white/70`, links hover `text-white`.
- Sem halo/glass card branco; brand chip transparente com `text-white`.
- Copyright `text-white/50`.
- Remove o `bg-gradient` cyan accent (não combina com tom dark sóbrio); substitui por hairline subtil `border-t border-white/10`.

LanguageSwitcher mantém-se como está (componente standalone, herda cor; verifico se precisa override visual — se sim, passo `className` para forçar texto branco).

---

## 4) `LOCKED_FILES.md`

Adicionar bloco:
```
> **Edição autorizada (2026-06-02):** `app-shell.tsx` e `header.tsx`
> ganham branch route-aware para `/` (homepage dark coerente).
> Novo `dark-footer.tsx` para o footer dark da homepage.
> Restantes rotas ficam intactas. Continua locked para futuras alterações.
```

---

## Validação

- `bunx tsc --noEmit`.
- Visual QA via `browser--navigate_to_sandbox`:
  - `/` 1440×900 → sem banda branca hero↔ilha, sem banda branca ilha↔footer, header dark, footer dark.
  - `/` 390×844 mobile.
  - `/analyze/frederico.m.carvalho` → continua light (não autenticado mostra modal — válido).
  - Tentativa `/login` ou outra rota light para confirmar shell light intacto.

## O que NÃO muda
- Conteúdo do hero, da ilha dark, dos bands internos.
- `<Footer />` original (continua a ser usado em todas as outras rotas).
- `header.tsx` em modo light (default) é byte-equivalente ao atual.
- Lógica de auth, i18n, navItems, language switcher.
- `/analyze`, `/admin`, `/app`, `/login`, account, modal, report — zero edição.
- Tokens em `tokens.css`/`tokens-light.css` (continuam locked, intocados).

## Risco
Médio. Mitigação: branch isolada por `isHome`, todas as alterações default-off para rotas não-home. Easy revert (reverter o `if (isHome)` e apagar `dark-footer.tsx`).
