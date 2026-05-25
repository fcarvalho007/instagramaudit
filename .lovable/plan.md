## Objetivo

Eliminar o bloco "Acesso rápido · Testes" (atalhos para `frederico.m.carvalho` e report mockup) que aparece na homepage. Está atualmente atrás de `import.meta.env.DEV`, mas continua visível em previews e não deve fazer parte do produto.

## Alterações

1. **`src/routes/index.tsx`**
   - Remover o bloco `{import.meta.env.DEV && (<section …devShortcuts…/>)}` (linhas 74–100).
   - Remover imports que ficam sem uso após a remoção: `ExternalLink` (lucide-react) e `Link` de `@tanstack/react-router` se não for usado noutro local do ficheiro (verificar antes de apagar).

2. **`src/i18n/locales/pt/landing.json`**
   - Remover a chave `devShortcuts` (`label`, `live`, `mockup`).

3. **`src/i18n/locales/en/landing.json`**
   - Remover a chave equivalente `devShortcuts`.

## Fora de âmbito

- `src/routes/design-system.tsx` (playground interno) — manter; não é superfície pública.
- Rotas `/analyze/$username` e `/report/example` mantêm-se inalteradas.
- Nenhuma alteração a dados, providers, RLS ou i18n não relacionado.

## Validação

- `bunx tsc --noEmit`
- Confirmar visualmente que a homepage termina em `ProductPreviewSection` sem o bloco de atalhos.
- `rg -i "devShortcuts|Report mockup|Report live · frederico"` deve retornar 0 resultados em `src/`.

## Checkpoint

- ☐ Bloco removido de `src/routes/index.tsx`
- ☐ Imports órfãos limpos
- ☐ Chaves `devShortcuts` removidas em PT e EN
- ☐ `tsc --noEmit` sem erros
- ☐ Grep final limpo
