## Auditoria — o que está hardcoded ou inconsistente em `/admin/automacoes`

### A. Inconsistências de dados (API `automation-flow.ts`)

1. **KPI "Falhas — últimos 30d" usa janela de 7d.** `linkFailures7d` é calculado com `since = now - 7d` mas o tile mostra "últimos 30d". O mesmo número é também atribuído a `failuresTotal` apenas do flow `link_enviado` — todos os outros flows ficam sempre a `0` mesmo que tenham falhado.
2. **`recentFailures` e `failuresTotal` são o mesmo campo**, com nomes diferentes, populados só no `link_enviado`. `recentFailures` ainda é consumido por `metrics-tab.tsx`.
3. **`deliverabilityPct`** mistura `sentLast30d` (30d) com `failures7d` (7d) → percentagem matematicamente incoerente.
4. **`average` timing label `"~6 horas em média"`** está literal no código — devia ser calculado a partir do tempo médio real entre `report_requests.created_at` e `pdf_generated_at`.
5. **`delayLabel` ("5 minutos", "48 horas", "7 dias")** são strings soltas sem ligação a um scheduler real; risco de mentir ao admin se algum dia o intervalo mudar. Falta uma fonte única (ex.: const `FLOW_DELAYS` em minutos + `formatDelay()`).
6. **Subjects duplicados**: a string do subject está em `automation-flow.ts` E em `EMAIL_TEMPLATES` (registry). Hoje pode divergir silenciosamente.
7. **`{{handle}}` aparece literal** no UI (subject). Devia ser renderizado como placeholder `@handle` ou `<HandleVar />`.
8. **`status: "preparing"`** depende de `sentTotalFor(...) > 0`: assim que houver 1 envio o flow muda para `active`, mas continua sem trigger real (eventos `welcome_beta_sent`, `personal_area_saved_sent`, `report_summary_sent` não são emitidos hoje em lado nenhum). Confunde "tem envios" com "está operacional".
9. **`FLOW_EVENTS`** lista 4 event types que nunca são escritos (`welcome_beta_sent`, `personal_area_saved_sent`, `report_summary_sent`, `unlock_completed`) — devia estar marcado como "futuro" para não dar a ilusão de instrumentação real.
10. **`waiting.nextEtaMinutes` é sempre `null`** → tile mostra `—`. Ou se calcula a partir do scheduler, ou se remove a linha.
11. **`pedido_recebido` lista `unlock_completed`** como event type, mas esse evento pertence ao lead magnet, não ao "pedido recebido". Mistura semântica.
12. **`completedCount` para `welcome_beta`, `personal_area_saved`, `report_summary`** usa `sentTotalFor(...)` (uma contagem de eventos), enquanto os outros flows usam `countAtLeast(status)` (contagem de leads). Duas grandezas diferentes no mesmo campo.

### B. Hardcodes de cor / token (FE)

- **`automation-flow-page.tsx`**: `STAGES` define 4 cores (`#7664E4 #3772E5 #1D9E75 #D85A30`) e 4 backgrounds (`#F2F0FE #EEF4FE #EAF7F1 #FDEFEA`) inline. KPI tiles repetem estes hex + `#FFFAF0`, `#FFFFFF`, `#E4E8F0`, `#0F1B3D`.
- **`automation-node.tsx`**: `STATUS_META`, `EXTRA_META`, `TONE_COLOR`, `TimingStrip` (4 backgrounds), `TriggerCode` (`#E0EBFB`/`#185FA5`), `EditButton` (`#0F1B3D`), borda `#E4E8F0` — **20+ hex literais**.
- **`stage-group.tsx`**: usa as cores recebidas via prop, mas o `${color}26` para borda é cálculo manual de alpha em vez de usar tokens.
- **`automation-edge.tsx`**: ok.
- **Divergência com tokens existentes**: `--admin-info-500` é `#378ADD`, mas o componente usa `#3772E5` (brand blue). `--admin-leads-500` é `#4A4AB7`, mas usa-se `#7664E4`. Os tokens admin estão desalinhados com o sistema de cores principal.

### C. Hardcodes de copy / taxonomia

- **`STAGES`** (number, eyebrow, title) vive só no FE. O backend tem `FlowStage` mas não devolve metadata da stage. Resultado: se o backend acrescentar uma stage, o FE não a renderiza; se um label for renomeado, há que mudar em 2 ficheiros.
- **`VISUAL_LABEL`, `VISUAL_BADGE`** em `automation-node.tsx` — duplicação de pequenas tabelas que podiam viver no servidor.
- **`FLOW_CHIPS`** (não usados, removidos), mas resta `Onboarding · Beta` etc. duplicados entre stage `eyebrow` e título do header.

### D. Inconsistências visuais menores

- Tile "A aguardar" usa `#FFFAF0` (cor expense), mas o número é neutro (eligibleTotal). KPI muda de cor mesmo quando valor é `0`.
- "Falhas" tile pinta-se a verde quando `last30d === 0` (semântica "tudo bem"), mas o ícone está ausente — incoerente com o tile "Sistema operacional" que tem `CheckCircle2`.
- `font-mono text-[9px]` no badge "EM/SY/RP" cumpre regra (admin pode usar JetBrains Mono), mas 9px viola "minimum 12px". Admin tolerável; vale a pena assumir.
- `MoreHorizontal` desativado existe em 2 sítios (header da página e cada card) — UX redundante. O do card podia desaparecer já que `Editar` também está disabled.

---

## Plano de refinamento

### 1. Centralizar a taxonomia das stages

Criar `src/lib/admin/automacoes-stages.ts` (shared FE+BE):

```ts
export const STAGE_DEFS = [
  { key: "00_onboarding", number: "00", eyebrow: "Onboarding · Beta",
    title: "Boas-vindas e acesso à plataforma",
    tokenColor: "--admin-stage-onboarding",
    tokenBg:    "--admin-stage-onboarding-bg" },
  { key: "01_captacao",   number: "01", eyebrow: "Captação",  ... },
  { key: "02_entrega",    number: "02", eyebrow: "Entrega",   ... },
  { key: "03_conversao",  number: "03", eyebrow: "Conversão", ... },
] as const;
```

- API devolve `stages: STAGE_DEFS` (passa a ser fonte única); FE itera sobre `data.stages` em vez de constante local.
- Remove `STAGES` em `automation-flow-page.tsx`.

### 2. Tokens de cor para automações (substituir 30+ hex)

Acrescentar a `src/styles/admin-tokens.css` (sem mexer em `LOCKED_FILES`):

```css
/* Stage hues */
--admin-stage-onboarding: 118 100 228;     /* #7664E4 */
--admin-stage-onboarding-bg: 242 240 254;  /* #F2F0FE */
--admin-stage-captacao:    55 114 229;     /* #3772E5 brand blue */
--admin-stage-captacao-bg: 238 244 254;
--admin-stage-entrega:     29 158 117;     /* já = revenue-500 → alias */
--admin-stage-entrega-bg:  234 247 241;
--admin-stage-conversao:   216 90 48;      /* já = signal-500 → alias */
--admin-stage-conversao-bg: 253 239 234;

/* Status pill bg/text */
--admin-pill-active-bg: 225 244 232;  --admin-pill-active-fg: 29 158 117;
--admin-pill-blocked-bg: 237 237 234; --admin-pill-blocked-fg: 90 107 140;
--admin-pill-warn-bg: 250 238 218;    --admin-pill-warn-fg: 186 117 23;
--admin-pill-info-bg: 224 235 251;    --admin-pill-info-fg: 24 95 165;

/* Chrome */
--admin-card-shadow: 0 1px 2px rgba(44,44,42,0.04), 0 4px 16px rgba(44,44,42,0.05);
--admin-button-dark: 15 27 61;        /* #0F1B3D */
```

Refactor:
- `automation-node.tsx`: `STATUS_META`/`EXTRA_META` passam a usar `rgb(var(--admin-pill-*))`.
- `TimingStrip`: backgrounds via tokens (`--admin-pill-info-bg`, `--admin-pill-warn-bg`).
- `EditButton`: `bg-[rgb(var(--admin-button-dark))]`.
- `KpiRow`: cor + bg de cada tile vem de `STAGE_DEFS`/status tokens.
- `StageGroup`: borda alpha via `color-mix(in oklab, ... 15%, transparent)` em vez de `${color}26`.

### 3. Métricas de falhas e KPIs honestos

- Renomear `linkFailures7d` → `linkFailures30d` e ajustar `since = now - 30d`. Se o objetivo for mesmo 7d, mudar o label do tile para "últimos 7 dias".
- Adicionar query `email_failures_30d` que conte qualquer `delivery_status='failed'` em `report_requests` **+** futuros eventos `email_failed` (sem partir se a tabela ainda não os tiver). Distribuir por `flow.key` quando possível.
- Eliminar campo duplicado `recentFailures` (manter só `failuresTotal`); atualizar `metrics-tab.tsx`.
- `deliverabilityPct`: usar mesmo período (30d) em ambos os termos, ou marcar como `null` quando `sent === 0` (UI mostra `—`).

### 4. Tempos médios reais e delays declarativos

- Calcular o `average` real para `relatorio_gerado`:
  ```ts
  avg(pdf_generated_at - created_at) WHERE pdf_generated_at IS NOT NULL AND created_at >= now() - 30d
  ```
  e formatar com `formatDuration(ms)` (`< 60min ? "X min" : "Xh Ymin"`). Cair para `"sem dados"` se `n < 3`.
- Centralizar delays:
  ```ts
  export const FLOW_DELAYS_MIN = {
    personal_area_saved: 5,
    feedback_pedido: 48 * 60,
    report_summary: 7 * 24 * 60,
  } as const;
  export const formatDelay = (m:number) => m < 60 ? `${m} min` : m < 1440 ? `${m/60}h` : `${m/1440} dias`;
  ```
  Usado pela API para preencher `timing.delayLabel`.

### 5. Subjects e variáveis vêm do registry

- `EMAIL_TEMPLATES` já tem `subject`/`preheader`/`variables`. API passa a fazer:
  ```ts
  subject: templateKey ? EMAIL_TEMPLATES.find(t => t.key === templateKey)?.subject ?? null : null
  ```
  Elimina 6 strings duplicadas.
- Renderizar `{{handle}}` no UI com componente `<TemplateVar name="handle" />` (chip cinza claro) em vez de literal Liquid no meio do texto.

### 6. Status e contagens consistentes

- Definir explicitamente `FlowOperationalStatus` distinto de "tem envios":
  - `active` = trigger implementado **e** instrumentado.
  - `preparing` = trigger ainda não implementado (independente de `sentTotal`).
  - `blocked` = passo manual/sistema sem email.
  - `undefined` = trigger por implementar (ex.: `checkout_started`).
  - Determinação não depende de `sentTotal` mas de uma flag estática `wired: boolean` por flow.
- `completedCount`: introduzir dois campos distintos para evitar ambiguidade: `completedLeads` (leads que ultrapassaram o status) **e** `sentEvents` (envios). UI escolhe qual mostrar consoante o tipo de flow.

### 7. Eventos "futuro" marcados no FE

- `FLOW_EVENTS`: adicionar `instrumented: boolean` por entrada; quando `false`, o `TimingStrip` mostra um sub-rótulo `evento ainda não emitido` em vez de número falsamente neutro.
- `unlock_completed` removido de `pedido_recebido` (pertence a outro fluxo).

### 8. Limpeza UX

- Remover botão `MoreHorizontal` por card (mantém-se só no header da página).
- Tile "A aguardar" pinta-se neutro (`--admin-pill-info-bg`) quando `eligibleTotal === 0`; só fica âmbar quando há fila real.
- Tile "Falhas" passa a ter ícone `ShieldCheck` quando 0 e `AlertTriangle` quando > 0, igualando o padrão do tile "Sistema operacional".
- `nextEtaMinutes`: se continuar `null`, esconder a linha "próximo · em X min" em vez de mostrar `—`.

### 9. Tipos partilhados

- Mover `FlowStage`, `FlowStatus`, `FlowVisualKind`, `FlowExtraTag`, `FlowTiming`, `STAGE_DEFS`, `FLOW_DELAYS_MIN` e `EMAIL_FLOW_KEYS` para `src/lib/admin/automation-flow-types.ts`. API e componentes passam a importar daí (hoje os componentes importam tipos de uma rota `routes/api/...`, o que é frágil).

---

## Detalhes técnicos / ficheiros tocados

- `src/routes/api/admin/automation-flow.ts` — refactor da agregação, novas queries (avg time, failures 30d), remoção de duplicados, devolver `stages` e `wired` flags.
- `src/lib/admin/automation-flow-types.ts` — **novo**.
- `src/lib/admin/automacoes-stages.ts` — **novo** (`STAGE_DEFS`, `FLOW_DELAYS_MIN`, `formatDelay`, `formatDuration`).
- `src/styles/admin-tokens.css` — adicionar tokens de stage/pill/chrome.
- `src/components/admin/v2/automacoes/automation-flow-page.tsx` — consumir `data.stages`, KPI tiles via tokens.
- `src/components/admin/v2/automacoes/automation-node.tsx` — `STATUS_META`/`EXTRA_META`/`TimingStrip`/`EditButton` via tokens; subject vem do template registry; `<TemplateVar />`.
- `src/components/admin/v2/automacoes/stage-group.tsx` — borda via `color-mix`, fundo via token.
- `src/components/admin/v2/automacoes/metrics-tab.tsx` — usa `failuresTotal` em vez de `recentFailures`.

## Constraints

- Read-only ao DB (apenas SELECT). Sem providers, sem emails.
- Não mexer em `LOCKED_FILES.md` nem em `EMAIL_TEMPLATES` (usar como fonte).
- Nenhuma rota nova nem mudança de URL.
- Manter pt-PT pós-AO90.

## Checkpoint

- ☐ Zero hex literais em `automacoes/*.tsx` (grep `#[0-9A-F]\{6\}` devolve 0)
- ☐ `STAGE_DEFS` é a única fonte de stages (FE itera sobre `data.stages`)
- ☐ `failures.last30d` e `linkFailures` partilham janela
- ☐ `subject` em cada flow vem de `EMAIL_TEMPLATES`
- ☐ `{{handle}}` nunca aparece literal no DOM
- ☐ `recentFailures` removido; `metrics-tab.tsx` continua a compilar
- ☐ `average` para `relatorio_gerado` é tempo real médio (ou "sem dados")
- ☐ `tsc --noEmit` verde; `bunx vitest run` verde
- ☐ Visual idêntico ao mockup ao olho nu (snapshot em 1460×871)
