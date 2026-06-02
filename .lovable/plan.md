## Diagnóstico

O código compacto já está no projeto (`src/components/report-redesign/v2/report-hero-v2.tsx` e `analysis-period-selector.tsx`), mas o preview mostra a versão antiga.

O console do preview reporta `[vite] server connection lost. Polling for restart...`. Isto significa que o HMR caiu e o browser está a servir o bundle antigo — não é um problema de design, é de cache do dev server.

## Passos

1. **Restart do dev server** (`code--restart_dev_server`) para forçar o Vite a reconstruir e reconectar o HMR.
2. **Verificar em mobile (411×742)** abrindo `/analyze/<username>` no browser tool — confirmar que aparece:
   - Header numa linha: avatar 32px · @handle · "X seguidores" · chevron · PDF · Share
   - Filtro de período colapsado: `📅 Últimas N publicações · D dias ⌄`
3. **Se ainda parecer grande depois do restart**, apertar mais:
   - Avatar mobile `size-7` (28px) em vez de `size-8` (32px)
   - Padding do cartão `py-1.5 px-3` em vez de `py-2 px-3`
   - Botões PDF/Share `size-7` em vez de `size-8`, ícones `size-3`
   - Esconder a métrica de seguidores em mobile e deixá-la só no painel expandido (foco máximo no handle + ações)
   - Reduzir o gap entre header e filtro (`pb-1` no hero, `pt-1` no selector)
4. **Validar** com screenshots em 411px e 768px (tablet) para garantir que desktop não regrediu.

## Fora de âmbito

- Lógica de premium/popovers
- Conteúdo do painel expandido
- Tokens, fontes, paleta
- Qualquer outro componente do relatório

## Checkpoint

- ☐ Dev server reiniciado e HMR ativo
- ☐ Header em 1 linha em 411px (≤ 56px de altura)
- ☐ Filtro colapsado em 1 linha em 411px (≤ 44px de altura)
- ☐ Desktop (≥ 768px) inalterado
