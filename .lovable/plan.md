## Estado atual
Os dois ficheiros já existem em disco (criados no turno anterior, mesma instrução, mesmas regras). Não há necessidade de reescrever.

- `public/robots.txt` — presente
- `public/sitemap.xml` — presente
- `bunx tsc --noEmit` → 0 erros
- `bunx vitest run` → 33 ficheiros · 351/351 testes verdes

## Conteúdo já no disco

**`public/robots.txt`**
```
User-agent: *
Allow: /
Allow: /privacidade
Allow: /termos
Allow: /cookies
Allow: /aviso-legal
Allow: /beta/request

Disallow: /admin
Disallow: /app
Disallow: /reports
Disallow: /analyze
Disallow: /api
Disallow: /feedback
Disallow: /login
Disallow: /signup
Disallow: /reset-password

Sitemap: https://instagramaudit.lovable.app/sitemap.xml
```

**`public/sitemap.xml`** — 5 URLs estáveis:
- `/` (weekly, 1.0)
- `/privacidade` (monthly, 0.5)
- `/termos` (monthly, 0.5)
- `/cookies` (monthly, 0.5)
- `/aviso-legal` (monthly, 0.5)

`lastmod = 2026-05-11`. Base URL: `https://instagramaudit.lovable.app` (Published URL, igual ao default em `src/lib/email/url.ts`).

Sem URLs dinâmicos (`/analyze/*`, `/reports/*`, `/app/*`, `/admin/*`, `/api/*`).

## Plano para este turno
Como os ficheiros já estão no estado pretendido e a validação passou no turno anterior:

1. Não alterar nada em disco.
2. Re-correr `bunx tsc --noEmit` e `bunx vitest run` apenas se quiseres revalidação fresca.
3. Devolver relatório final.

Se preferires um sitemap dinâmico (server route `/sitemap.xml`) em vez de ficheiro estático, diz e proponho plano alternativo — mas o pedido foi explicitamente "static files only".

## Out of scope (mantido)
Sem alterações a rotas, providers, DB, Brevo/Resend, ou lógica de reports.
