## Diagnóstico

Comparei o código actual com o HTML servido em `https://auditprofiles.com/` e em `https://instagramaudit.lovable.app/` (ambos retornam exactamente o mesmo bundle, 53 535 bytes — logo o domínio custom está bem ligado, o problema não é DNS nem cache do browser).

**O que o código tem (correcto):**
- `src/routes/index.tsx` renderiza `<HeroSection />` + `<LandingDarkIsland />` dentro de `<div class="hero-dark">` com fundo `--hero-bg-base` (dark).
- Só existe **uma** rota `/` no `routeTree.gen.ts` (sem duplicações).
- `bunx tsc --noEmit` passa sem erros.
- Links internos verificados: `/`, `/precos`, `/servicos`, `/report/example` — todos resolvem para ficheiros existentes em `src/routes/`.

**O que o site publicado serve (desactualizado):**
- 0 ocorrências de `hero-dark`, `HeroAurora`, `aurora`, `LandingDark` no HTML SSR.
- Primeira `<section>` usa `bg-surface-base` (a landing clara antiga), não a dark.
- H2 "Relatório em 3 passos simples." da versão clean ainda presente.
- Title está correcto ("AuditProfiles · O benchmark…") — o que confirma que o `head()` da rota nova foi aplicado, mas o **bundle JS/SSR do componente** é antigo.

**Conclusão:** o build/deploy publicado é uma versão anterior à mudança para a dark landing. O Update que fizeste no diálogo de publicar ou falhou silenciosamente, ou subiu um bundle antigo (provavelmente um cache de build do worker). A custom domain serve o mesmo bundle que `.lovable.app`, então não é problema de domínio.

## Acção recomendada (não requer alteração de código)

1. **Republicar o projecto.** Abrir o diálogo Publish → Update novamente. Se o botão ficar disabled (a indicar "já está actualizado"), forçar com uma alteração trivial (por exemplo gravar `src/routes/index.tsx` sem mudar nada, ou um pequeno bump em algum comentário) e republicar.
2. Após publish, validar com:
   ```
   curl -sL https://auditprofiles.com/ | grep -c "hero-dark"
   ```
   Deve passar a retornar > 0.
3. Se mesmo após republish continuar a servir a versão clara, é necessário escalar para suporte Lovable — o build da publicação está preso num snapshot antigo do worker.

## Não vou alterar código nesta passagem

- O código actual (rota `/`, componentes dark, i18n, premium-interest-dialog, /servicos, /precos, /api/public/eupago-webhook) está alinhado com o que vemos no preview.
- Não foram detectados bugs, URLs partidos, nem conflitos de rota.
- Tocar em ficheiros agora só ia mascarar o problema real, que é o estado do deploy.

## Se preferires que eu force a publicação via edit trivial

Posso, em build mode, fazer um no-op commit (ex.: actualizar um comentário em `src/routes/index.tsx`) para "destrancar" o pipeline de publish e depois pedires Update — confirma se queres essa abordagem.
