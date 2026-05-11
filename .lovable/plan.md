## Refinamentos das duas últimas tasks

### A. SEO — `public/robots.txt`
- Adicionar newline final (POSIX-compliant).

### B. SEO — `public/sitemap.xml` → server route
Substituir o ficheiro estático por `src/routes/sitemap[.]xml.ts` (server route GET) que devolve XML com:
- mesmas 5 URLs (`/`, `/privacidade`, `/termos`, `/cookies`, `/aviso-legal`)
- `<lastmod>` = data atual em formato `YYYY-MM-DD` (calculado em runtime)
- `Cache-Control: public, max-age=3600`
- Apagar `public/sitemap.xml` (estático) — evita ficheiro estático shadow do server route.
- `robots.txt` mantém-se estático e continua a apontar para `https://instagramaudit.lovable.app/sitemap.xml` (não muda).

> Confirma se preferes manter o estático em vez de migrar — se sim, salto B e fica só a alteração do `<lastmod>` para a data de hoje.

### C. Account — `src/routes/app.account.tsx`
1. Mover a `<section>` "Comunicações" para FORA do `<div>` que contém o botão "Terminar sessão" (passa a ser um bloco irmão entre o card de perfil e o botão de logout).
2. Trocar o spinner do toggle: em vez de absolute `-right-6` (corta no mobile), substituir o ícone do switch por `Loader2` quando `consentSaving` (mantendo a largura, sem absolute).
3. Esconder o bloco "Email associado (lead)" quando `account.leadEmail === account.email` (evita duplicação).

### Fora de scope
- Refactor das cores hardcoded (`bg-blue-*`, `text-red-*`) — pre-existing, requer task própria.
- Mudanças à server function `updateMarketingConsent` (já segura).

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run` (espera-se 351/351)
- Manual:
  - `/sitemap.xml` resolve com XML válido e `<lastmod>` = data de hoje
  - `/robots.txt` resolve sem alterações funcionais
  - `/app/account` toggle visualmente correto em mobile (375px)
  - "Email associado (lead)" não aparece quando igual ao email da conta

### Devolver no fim
- ficheiros alterados/criados/apagados
- comportamento do novo `/sitemap.xml`
- resultado da validação
