
## Avaliação do estado atual

Depois do último pedido o toggle já funciona e propaga até 30s. Mas ao reler o código (`execution-mode-card.tsx`, `test-profiles-card.tsx`, `execution-mode.functions.ts`) identifiquei 4 refinamentos que vale a pena fazer:

### 1. Bug: o toast "Modo bloqueado" nunca aparece

Em `test-profiles-card.tsx` (linha 498-510), o botão "Atualizar agora" tem em simultâneo:
- `onClick` que verifica `isCacheOnlyMode` e mostra `toast.warning(...)`
- `disabled={refreshMutation.isPending || isCacheOnlyMode}`

Botões `disabled` no HTML não disparam `onClick` — logo a mensagem nunca é mostrada. O utilizador vê apenas um botão cinzento sem perceber porquê. A única pista é o `title` (tooltip), que **não existe em mobile**.

**Fix:** trocar `disabled` por estilo "visualmente desativado" mantendo o botão clicável apenas para mostrar o toast. Ou — preferível — manter `disabled` e adicionar um chip inline "Bloqueado pelo modo cache" visível ao lado do botão.

### 2. Falta caminho de saída de 1 clique

Hoje, se o admin está em cache_only e quer atualizar um perfil, tem de:
1. Ler o tooltip
2. Subir até ao card de modo
3. Mudar para "Buscar dados novos" (com diálogo de confirmação)
4. Voltar ao perfil
5. Clicar "Atualizar agora"

**Fix:** quando bloqueado, o tooltip/chip mostra um botão secundário **"Mudar para fresh e atualizar"** que faz o switch + abre o diálogo de preflight no mesmo clique (com confirmação única).

### 3. Indicador de modo ativo invisível no contexto do perfil

O modo só está visível no card de cima. Quando se está a olhar para a lista de perfis, não é óbvio em que modo o sistema corre.

**Fix:** adicionar uma micro-pill ao topo da `TestProfilesCard` ("Modo: dados guardados · sem custos" / "Modo: buscar novos · custos variáveis"), com a mesma cor do switch.

### 4. Brecha de segurança ainda em aberto

`getExecutionMode`, `setExecutionMode`, `getTestProfileStatuses` e `expireSnapshotForHandle` em `src/server/admin/execution-mode.functions.ts` **não têm guarda de admin** — qualquer um com o URL público das serverFn consegue ler ou mudar o modo de execução.

**Fix:** adicionar `requireAdminSession` (middleware existente no projeto, usado pelas outras serverFn de admin) aos 4 handlers. Se o middleware ainda não existir, criar a partir de `requireSupabaseAuth` + verificação de email contra a allowlist de admin.

Verifico primeiro se já existe a infra `attachSupabaseAuth` + middleware de admin no projeto antes de implementar; se não existir, faço só as 3 melhorias visuais (1-3) e deixo a 4 documentada para tarefa separada (envolve mexer em `src/start.ts` e criar middleware partilhado, fora do âmbito UI).

## Ficheiros tocados

- `src/components/admin/v2/sistema/test-profiles-card.tsx` — fix do bug do click, chip inline, botão "mudar e atualizar"
- `src/components/admin/v2/sistema/execution-mode-card.tsx` — sem alterações (ou só uma melhoria mínima de copy)
- `src/components/admin/v2/sistema/index.tsx` (ou wrapper equivalente) — micro-pill de modo na `TestProfilesCard`
- `src/server/admin/execution-mode.functions.ts` — **só se** já houver `requireAdminSession`; caso contrário fica para depois

## Fora do âmbito

- Mudanças à lógica de enforcement em `analyze-public-v1`
- Bypass do `forceRefresh` admin via `INTERNAL_API_TOKEN` (já intencional)
- RLS, pipeline, public endpoints

## Checkpoint

- ☐ Botão bloqueado mostra feedback claro em desktop **e** mobile
- ☐ Existe atalho "mudar para fresh e atualizar" no perfil
- ☐ Modo ativo visível no contexto da lista de perfis
- ☐ ServerFn de admin têm guarda (ou está documentado porque não)
