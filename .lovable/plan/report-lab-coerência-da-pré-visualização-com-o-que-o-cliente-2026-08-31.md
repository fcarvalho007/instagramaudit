# Report Lab — coerência da pré-visualização com o que o cliente vê

Objectivo: garantir que "Pré-visualização condensada · public_mvp" e a versão em ecrã completo mostram exactamente a nova arquitectura comercial (Estado A / B / C). Sem alterar métricas, dados, providers, preços ou o relatório público.

## Estado actual verificado

- `src/routes/admin.report-lab.tsx` (linhas 456-465) monta `ReportShellV2` **sem** `lockBoundary`. Em `public_mvp` isso cai no ramo `else` do shell (linha 277), que renderiza `ReportOverviewBlock` sem `mode` nem `access` — ou seja, com o valor por omissão `access="pro"`. A pré-visualização condensada mostra hoje **tudo desbloqueado**, mesmo em `public_mvp`.
- `src/routes/admin_.report-preview.$username.tsx` (linha 207) passa `lockBoundary="engagement"` correctamente, por isso o ecrã completo já mostra o Estado A com a nova ordem (Visão geral → Engagement → Cadência → preview Melhor vs pior → teasers).
- Nenhuma das duas superfícies passa `leadCaptured`. O shell assume `false` (linha 118), logo **o Estado B (email capturado) não é pré-visualizável em lado nenhum** do admin. As variantes disponíveis são apenas `public_mvp`, `internal_lab`, `pro_preview`.
- A sidebar/TOC já é coerente: lê `COMMERCIAL_SECTIONS`, partilhada com o relatório público.

## Alterações propostas

### 1. Pré-visualização condensada passa a espelhar o público

Em `admin.report-lab.tsx`, acrescentar ao `ReportShellV2` embebido:

- `lockBoundary={variant === "public_mvp" ? "engagement" : null}`
- `isAdminPreview` para manter o comportamento de admin (sem eventos de funil nem CTAs a disparar compras).

Resultado: a pré-visualização condensada em `public_mvp` deixa de mostrar secções pagas.

### 2. Novo seletor de estado comercial (A / B / C)

Um único controlo no Report Lab, ao lado do seletor de variante, com três opções:

| Estado | Rótulo no admin | Props enviadas |
|---|---|---|
| A | Auditoria Instantânea (anónimo) | `leadCaptured=false`, `premiumUnlocked=false`, `lockBoundary="engagement"` |
| B | Análise Aprofundada (email dado) | `leadCaptured=true`, `premiumUnlocked=false`, `lockBoundary="engagement"` |
| C | Pro (pago) | `leadCaptured=true`, `premiumUnlocked=true`, `lockBoundary=null` |

- O seletor só está activo quando a variante é `public_mvp`; em `internal_lab` e `pro_preview` fica fixo em C, como hoje.
- O texto de apoio passa a indicar o estado escolhido: "Para validar como o cliente vê no estado B — Análise Aprofundada, abre em ecrã completo."

### 3. Ecrã completo recebe o mesmo estado

- `admin_.report-preview.$username.tsx` ganha um search param `state` (`a` | `b` | `c`, fallback `a`) validado com Zod, mapeado para as mesmas três combinações de props.
- O botão "Abrir em ecrã completo" do lab propaga `?variant=…&state=…`, para o que se vê embebido ser exactamente o que abre em separador novo.
- O pill "Sair da pré-visualização" mostra o estado a par da variante (ex.: `PÚBLICO · B`).

### 4. Nota de coerência sobre dados

No estado B o Comment Intelligence só aparece se o snapshot em causa já tiver `comment_intelligence`. Quando não tiver, mantém-se o `CommentIntelligenceUnavailable` já existente — o admin não vai forçar dados sintéticos.

## Validação

- Screenshots de `/admin/report-lab` em `public_mvp` nos estados A, B e C, confirmando: A sem secções pagas e com Cadência completa; B com Melhor vs pior, Formatos e Conversas; C com Diagnóstico e Prioridades.
- Confirmar que a pré-visualização condensada e o ecrã completo mostram a mesma sequência de secções para o mesmo estado.
- `bunx tsgo --noEmit` e as suites de `src/components/report-redesign`.

## Detalhe técnico

Ficheiros tocados: `src/routes/admin.report-lab.tsx`, `src/routes/admin_.report-preview.$username.tsx`. Nenhuma alteração a `report-shell-v2.tsx`, `report-overview-block.tsx`, `block-config.ts`, ao sanitizador ou a rotas públicas — o admin passa apenas a usar props que já existem.

## Riscos

- Baixo: mudanças confinadas a rotas de admin com `noindex`. O único risco real é a pré-visualização condensada passar a parecer "mais pobre" em `public_mvp` — o que é precisamente o comportamento correcto.
