# Fix · Conflito do header público em `/admin`

## Diagnóstico

Screenshot de `/admin` mostra o header público de marketing (logo InstaBench + Analisar / Como funciona / Preços / Recursos + botão "Analisar agora") por cima da área admin, que tem o seu próprio chrome (`AdminSidebar` lateral + topbar com `ExecutionModeBadge`).

**Causa**: `src/routes/__root.tsx` envolve **todas** as rotas em `<AppShell>`, e `AppShell` (em `src/components/layout/app-shell.tsx`) renderiza incondicionalmente:

```tsx
<Header />
<main>{children}</main>
<Footer />
```

`/admin/*` (definido em `src/routes/admin.tsx`) então recebe:
- Header público (errado — duplica nav, cria ruído visual, ocupa espaço)
- AdminAuthShell + AdminSidebar (correto)
- Footer público (errado — admin é app interna, sem footer institucional)

## Fix proposto (mínimo, cirúrgico)

Tornar Header/Footer **condicionais** ao path. Routes admin (e por consistência, qualquer route que tenha layout próprio full-screen) ignoram-nos.

### Mudança 1 — `src/components/layout/app-shell.tsx`

Detectar pathname via `useRouterState({ select: s => s.location.pathname })` e suprimir Header/Footer quando começa por `/admin`. Manter `<main>` simples (sem padding) nesses casos para o admin controlar o seu próprio layout.

```tsx
import { useRouterState } from "@tanstack/react-router";

const PUBLIC_CHROME_DISABLED_PREFIXES = ["/admin"];

function AppShell({ children }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideChrome = PUBLIC_CHROME_DISABLED_PREFIXES.some(p => pathname.startsWith(p));

  if (hideChrome) {
    return <>{children}</>;  // admin controla todo o layout
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-8 pb-24">{children}</main>
      <Footer />
    </div>
  );
}
```

### Não muda

- `__root.tsx` (locked-ish, sem motivo para tocar)
- `src/routes/admin.tsx` (já tem o seu próprio layout completo)
- `Header`/`Footer` (intactos)
- Outras rotas públicas (`/`, `/analyze/*`, `/report/example`, `/auth`, etc.) — mantêm chrome público

## Validação

- `bunx tsc --noEmit`
- Browser: abrir `/admin` → só vê o admin chrome (sidebar + topbar), sem header marketing nem footer
- Browser: abrir `/` → marketing header + footer normais, intactos
- Browser: abrir `/admin/automacoes`, `/admin/beta-leads` → idem (sem chrome público)
- Browser: abrir `/analyze/<handle>` → marketing header + footer intactos

## Out of scope

- Não tocar em rotas admin individuais
- Não mexer em `Header`/`Footer`
- Não mexer em `__root.tsx`

## ☐ Checklist
- ☐ Editar `app-shell.tsx` com detecção de prefixo `/admin`
- ☐ Verificar `/admin`, `/admin/automacoes`, `/`, `/analyze/<x>` no browser
- ☐ `tsc --noEmit` verde