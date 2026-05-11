## Goal
Criar ficheiros estáticos de SEO (`robots.txt` e `sitemap.xml`) para controlar o que é indexado antes do teste público do MVP.

## Files to create

### 1. `public/robots.txt`
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

Notas:
- `/beta/request` mantida em Allow (rota pública existente em `src/routes/beta.request.tsx`).
- `/report/example` não é listado nem em Allow nem em Disallow — fica na regra default (`Allow: /`). Não é mencionado pelo utilizador, e a memória de auditoria registou-o como "polish item" para depois.
- Sem entradas específicas por user-agent (Googlebot, etc.), conforme pedido.

### 2. `public/sitemap.xml`
URLs incluídos (apenas páginas estáveis públicas):
- `https://instagramaudit.lovable.app/`
- `https://instagramaudit.lovable.app/privacidade`
- `https://instagramaudit.lovable.app/termos`
- `https://instagramaudit.lovable.app/cookies`
- `https://instagramaudit.lovable.app/aviso-legal`

`<lastmod>` = data de hoje (2026-05-11). `<changefreq>` = `monthly` para legais, `weekly` para `/`. `<priority>` = `1.0` para `/`, `0.5` para legais.

URLs explicitamente excluídos: `/analyze/*`, `/reports/*`, `/app/*`, `/admin/*`, `/api/*`, `/beta/request`, `/feedback/*`, `/login`, `/signup`, `/reset-password`, `/report/example`, `/design-system`, `/dev-loading-preview`.

## Domain
Uso de `https://instagramaudit.lovable.app` (Published URL confirmado em project_urls; é também o default em `src/lib/email/url.ts`). `PUBLIC_APP_BASE_URL` em runtime apenas afeta backend — ficheiros estáticos têm de conter URL absoluto literal.

## Out of scope
- Sem alteração de rotas, sem server route `/sitemap.xml` dinâmico (pedido foi explícito: "Static files only").
- Sem mudanças em `__root.tsx` meta tags.
- Sem providers, sem DB, sem Brevo/Resend, sem report logic.

## Validation
1. `bunx tsc --noEmit` (sanity, embora ficheiros estáticos não afetem TS).
2. `bunx vitest run` (confirmar que 351/351 continuam verdes).
3. Manual: confirmar que `/robots.txt` e `/sitemap.xml` resolvem em preview e que nenhum URL dinâmico (`/analyze/...`, `/reports/...`, `/admin`, `/app`) aparece no sitemap.

## Final report
- Ficheiros criados (caminhos)
- Conteúdo de robots (allow/disallow)
- URLs do sitemap
- Resultado tsc + vitest + checks manuais
