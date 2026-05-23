## Objetivo

Tornar a secção `/admin` → **Sistema** legível e usável em mobile (375px). O screenshot mostra três problemas concretos:

1. **Modo de execução** — o switch "Usar dados guardados / Buscar dados novos" excede a largura do ecrã; o segundo botão fica cortado (`Buscar dados nc…`).
2. **Cabeçalho "Perfis de teste"** — o título, o resumo (`0 prontos · todas as caches expiradas`) e o botão `+ Adicionar perfil` partilham a mesma linha; o resumo parte palavras (`PERFIS DE / TESTE`) e o botão também (`Adicionar / perfil`).
3. **Linha de perfil** — avatar + meta-informação + dois botões (`Atualizar agora`, `Abrir relatório`) estão todos numa única `flex-row`. Em mobile os botões sobrepõem o texto (`Atualizado 11/05, 15:56`, `há 12 d`, `Pronto para atualizar`, `expirou 14/05, 17:27` colidem visualmente).

Sem alteração de lógica, dados, endpoints, snapshots ou flow. Apenas layout e tipografia responsiva.

## Ficheiros a tocar

- `src/components/admin/v2/sistema/execution-mode-card.tsx`
- `src/components/admin/v2/sistema/test-profiles-card.tsx`

Nenhum outro ficheiro é alterado. Sem mudanças a `server/admin/execution-mode.functions`, rotas, queries, ou tokens.

## Alterações por componente

### 1. `ExecutionModeCard`

- O contentor das duas opções passa de `flex items-stretch gap-4 flex-wrap` para layout responsivo:
  - mobile (`<sm`): `flex-col`, switch e painel de estado empilhados.
  - desktop (`sm+`): mantém-se `flex-row` lado a lado.
- O switch deixa de ser `inline-flex` com largura intrínseca:
  - mobile: `w-full grid grid-cols-2` (cada botão `w-full`, padding lateral reduzido para `px-3`, ícone `size={14}`, texto principal `text-[12px]`, sublinha `text-[10px]`).
  - desktop: comportamento atual (`px-5`, pílula com largura natural).
- Painel de estado (`Modo ativo: …`) ganha `w-full` em mobile e o badge de custo cai numa segunda linha quando a largura é insuficiente — já usa `flex-wrap`, basta garantir `min-w-0` no contentor de texto.

### 2. `TestProfilesCard` — cabeçalho

- O `flex items-center justify-between` actual quebra mal em 375px. Passa para:
  - mobile: `flex-col items-start gap-2`, título em linha própria; segunda linha contém o resumo (`0 prontos…`) e o botão `+ Adicionar perfil` num `flex items-center justify-between w-full`.
  - desktop (`sm+`): volta a `flex-row items-center justify-between` como hoje.
- O botão `Adicionar perfil` recebe `whitespace-nowrap` para evitar a partição em duas linhas.
- O texto de resumo recebe `leading-snug` e mantém `text-[12px]`.

### 3. `TestProfilesCard` — `ProfileRow`

A "Row 1" (avatar + info + ações) é a fonte principal das colisões. Passa de uma única linha para layout em duas faixas em mobile:

```text
Mobile (<sm)                          Desktop (sm+)
┌───────────────────────────┐         ┌───────────────────────────────────────┐
│ [Avatar] @handle  [badge] │         │ [Avatar] @handle [badge]  meta  [btns]│
│          meta linhas      │         └───────────────────────────────────────┘
├───────────────────────────┤
│ [Atualizar]  [Abrir rel.] │
└───────────────────────────┘
```

Implementação:
- Contentor da Row 1: `flex flex-col sm:flex-row sm:items-center gap-3`.
- Bloco esquerdo (avatar + info) envolto num `flex items-start sm:items-center gap-3 min-w-0 flex-1` — `items-start` evita que o avatar fique desalinhado quando o texto quebra.
- A lista de metadados (`p.latestFreshCostTotal`, `Atualizado…`, `Expira em…`, badge de readiness) mantém `flex-wrap` mas o contentor recebe `gap-x-3 gap-y-1.5` (já existe, OK) — o problema desaparece quando deixa de competir horizontalmente com os botões.
- Bloco de ações (`Atualizar agora` + `Abrir relatório`):
  - mobile: `grid grid-cols-2 gap-2 w-full` (botões com `w-full justify-center`).
  - desktop: mantém `flex items-center gap-2 shrink-0` actual.
- Padding do card `p-4` mantido; em mobile `p-4` é suficiente.

### 4. Row 2 (chips "Em cache")

- O `pl-[54px]` actual (compensação do avatar) é inadequado em mobile porque alinha mal com o conteúdo agora empilhado. Passa a:
  - mobile: `pl-0` (chips começam da margem do card).
  - desktop (`sm+`): `sm:pl-[54px]` como hoje.
- A linha de "Última tentativa" (`w-full mb-1`) mantém-se.
- O texto "EM CACHE:" pode quebrar antes dos chips em ecrãs pequenos — já está bem coberto pelo `flex-wrap`.

## Tokens, tipografia e regras do projeto

- Tudo dentro de `/admin` permanece com a paleta admin existente (`admin-text-*`, `#E5E3D9`, `#F3F2EE`, badges verdes/âmbar). Sem introdução de cores novas.
- `font-mono` mantém-se permitido aqui (admin/internal — regra de memória).
- Sem `slate-*`. Sem cores hardcoded novas — só ajustes de classes Tailwind utilitárias.
- Mantém todas as labels pt-PT actuais.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Verificação visual manual em 375 px (`/admin` → tab Sistema):
  1. Os dois botões "Usar dados guardados" e "Buscar dados novos" ficam visíveis na totalidade, lado a lado em duas colunas iguais.
  2. O cabeçalho "Perfis de teste" e o botão "+ Adicionar perfil" deixam de partir palavras.
  3. Cada linha de perfil mostra: avatar + handle + badges em cima, metadados em baixo, e os dois botões em grelha de 2 colunas no final do card — sem sobreposição.
  4. Em desktop (≥640 px) o layout actual é preservado pixel-a-pixel.

## Constraints respeitadas

- Apenas dois ficheiros UI no `/admin/sistema`.
- Sem mudanças a backend, mutations, queries, tokens globais, ou a outros separadores do admin.
- Sem alteração de copy nem semântica de botões.
- Sem alteração ao `EditorialIdentityCard` ou ao relatório público.
