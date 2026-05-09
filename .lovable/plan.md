Os três pedidos já estão aplicados em `src/routes/admin.tsx` na ronda anterior:

1. **Padding responsivo** — o `<main>` usa `px-3 py-4 sm:px-5 sm:py-5 md:px-7 md:py-7` em vez do padding inline fixo de `1.75rem`.
2. **Sem scroll horizontal global** — wrapper `admin-v2` ganhou `overflow-x-hidden` para conter qualquer transbordo das sub-páginas.
3. **Topo em wrap** — barra de execução · demo · terminar sessão passou de `flex justify-end` para `flex flex-wrap items-center justify-end gap-2`, permitindo quebrar de linha em ecrãs estreitos.

## Verificação proposta

Sem alterações de ficheiros. Só validar visualmente:
- Browser tool (ou preview manual) a 375 px e 414 px em `/admin/visao-geral`: confirmar que os três botões do topo embrulham, não cortam, e que a página não tem scroll horizontal.
- Sanity check a 1280 px: layout desktop inalterado (max-width 1280, padding 28 px).

Se a verificação falhar nalgum ponto (ex.: alguma sub-secção interna empurra largura > viewport), proponho um segundo plano focado nessa secção. Caso contrário, o pedido está cumprido — confirma se queres avançar para outras tabs ou se há algo específico ainda visível.