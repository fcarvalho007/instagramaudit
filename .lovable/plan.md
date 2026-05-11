# /admin/automacoes — refit visual + nova etapa 00 + KPIs reais + timing API

## Objectivo

Aproximar a página do mockup: 4 KPIs no topo, etapas 00–03 com cards
re-desenhados (ícone grande + badge EM/SY, pílula tipo, faixa de
temporização, stats centrados, botão Editar dominante), e estender o
backend para devolver os dados reais + timing estruturado de cada fluxo.

Sem tocar em senders ou triggers reais.

## Inventário

Já existe:
- 7 templates no registry (`request_received`, `report_ready`,
  `feedback_request`, `personal_area_saved`, `welcome_beta`,
  `report_summary`, `commercial_followup`).
- API `GET /api/admin/automation-flow` devolve 7 flows + agregados de
  `product_events`.
- Componentes `AutomationNode`, `StageGroup`, `StageConnector`,
  `AutomationEdge`, tabs Métricas/Pessoas/Templates.

Falta:
- Etapa 00 ("Onboarding · Beta") + flow `welcome_beta` no backend.
- Flow `personal_area_saved` (etapa 02) e `report_summary` (etapa 03).
- Campo `timing` estruturado por flow.
- KPIs agregados no topo.
- Visual novo dos cards.

## 1. Backend — `src/routes/api/admin/automation-flow.ts`

### 1.1 Estender `AutomationFlow` com novos campos

```ts
type FlowStatus = "active" | "blocked" | "undefined" | "preparing";

type FlowTiming =
  | { kind: "immediate"; eventName: string; contextHint?: string }
  | { kind: "delay"; eventName: string; delayLabel: string; contextHint?: string }
  | { kind: "average"; averageLabel: string; eventName: string }
  | { kind: "undefined"; missingTrigger: string };

type FlowVisualKind = "email" | "system" | "report";
type FlowExtraTag = "primary_delivery" | "no_email" | "blocked" | null;

interface AutomationFlow {
  // ...campos actuais...
  visualKind: FlowVisualKind;            // pílula grande à esquerda
  status: FlowStatus;                    // ATIVO / BLOQUEADO / SEM TRIGGER
  extraTag: FlowExtraTag;                // ENTREGA PRINCIPAL / SEM EMAIL
  subject: string | null;                // SUBJECT visível abaixo do título
  timing: FlowTiming;                    // faixa de tempo
  templateKey: EmailTemplateKey | null;  // movido do frontend
  stage: "00_onboarding" | "01_captacao" | "02_entrega" | "03_conversao";
}
```

Nota: `inFlightCount`/`completedCount` ficam para etapas que ainda usam
`leads.commercial_status`; nas etapas novas (00 e cards baseados em
templates não-wired) essas contagens reflectem só `product_events`.

### 1.2 Adicionar 3 flows novos

- `welcome_beta` (stage 00, visualKind email, timing immediate `subscribe`,
  status `preparing` se nenhum evento `welcome_beta_sent` em
  `product_events`, senão `active`).
- `personal_area_saved` (stage 02, timing delay 5min após
  `report_ready_sent`).
- `report_summary` (stage 03, timing delay 7 dias após
  `report_ready_sent`, contextHint "quem não abriu o relatório").

`follow_up_comercial` passa a `status: "undefined"` quando o evento
`checkout_started` ainda não existe no schema (que é o caso) — devolve
`timing.kind = "undefined"`.

### 1.3 Aggregate KPIs no topo da resposta

```ts
interface AutomationKpis {
  systemActive: { activeCount: number; totalCount: number };
  sent: { last30d: number; deltaVsYesterday: number };   // soma email_*_sent events
  waiting: { eligibleTotal: number; nextEtaMinutes: number | null };
  failures: { last30d: number; deliverabilityPct: number };
}
```

Calculados de `product_events` (eventos `*_sent`) e
`report_requests.delivery_status='failed'`. `nextEtaMinutes` fica `null`
enquanto não houver fila persistida — UI mostra "—".

### 1.4 Hardening

Mantém `requireAdminSession`, mantém o try/catch existente. Adiciona
testes Vitest se já houver para esta API (verificar antes; senão skip).

## 2. Frontend — refit dos componentes

### 2.1 `automation-node.tsx` (rewrite cirúrgico)

Layout em 3 zonas verticais alinhado ao mockup:

```
┌──────────────────────────────────────────────────────────────┐
│ [50×50 ICON+EM]  [📧 EMAIL] [● ATIVO] [EXTRA]    [Editar][⋮] │
│                  Título grande                               │
│                  SUBJECT subject visível                     │
├──────────────────────────────────────────────────────────────┤
│ ⏱  Imediato após o evento [trigger_name] — contexto         │
├──────────────────────────────────────────────────────────────┤
│       ENVIADOS         A AGUARDAR         FALHAS             │
│          8                 0                 0               │
└──────────────────────────────────────────────────────────────┘
```

- Ícone 50×50 com gradiente da cor da etapa + badge sobreposto:
  - `EM` para email, `SY` para system, `RP` para report.
- Pílula tipo grande à esquerda do header (Inter Bold, uppercase).
- Status pill verde `● ATIVO`, cinzenta `BLOQUEADO`, âmbar `SEM TRIGGER`.
- Extra pill: `ENTREGA PRINCIPAL` (azul) / `SEM EMAIL` (cinzento).
- Subject (`SUBJECT subject…`) só quando `visualKind === "email"`.
- Botão **Editar** preto sólido com ícone Pencil — `disabled` com tooltip
  "Disponível em breve". Excepção: card com `status === "blocked"` mostra
  "Bloqueado" + Lock icon, fundo cinzento, `cursor-not-allowed`.
- Botão `⋮` ghost, disabled com mesmo tooltip.
- Faixa de timing: `bg-[rgb(var(--admin-info-500)/0.04)]`, ícone
  `ArrowRightLeft` (immediate) / `Clock` (delay/average) /
  `AlertTriangle` âmbar (undefined). Trigger rendered como pílula
  azul-clara em mono (admin-only — JetBrains Mono permitido).
- Stats em 3 colunas centradas com números 24px, labels uppercase 11px.

### 2.2 `stage-group.tsx` (ajustes)

- Background tints por stage: 00 lavender, 01 blue-soft, 02 green-soft,
  03 pink-soft. Border esquerda 3px na cor.
- Header: número grande 36px Fraunces na cor da stage à esquerda,
  eyebrow `STAGE_KEY · BETA` + título Fraunces 18px, contador agregado
  alinhado à direita ("5 emails · 7 dias").

### 2.3 `automation-flow-page.tsx`

- Header reformulado: eyebrow `PIPELINE · AUTOMAÇÕES`, título
  "Fluxo de ciclo de vida", subtitle "Cada bloco mostra o que faz,
  quando dispara e o estado actual.", botões à direita:
  - **Refrescar** — chama `queryClient.invalidateQueries(["admin",
    "automation-flow"])`. Funcional.
  - **Ver logs** — disabled com tooltip.
  - `⋮` — disabled com tooltip.
- 4 KPI tiles abaixo do header (Sistema operacional / Enviados /
  A aguardar / Falhas) que consomem `data.kpis`. Cada tile com border
  esquerda 3px na sua cor.
- Restante (`Tabs`, `FlowStages`) mantém-se mas usa as 4 stages novas.

### 2.4 `automation-edge.tsx`, `stage-connector.tsx`

Connector entre cards passa a seta única `↓` 16px cinzenta sem caixa,
alinhado ao mockup. Connector entre stages mantém label.

## 3. Não tocar

- `src/lib/email/templates/*` — render dos emails.
- `src/lib/email/send-*.server.ts` — senders.
- `src/lib/tracking.functions.ts` — events.
- `metrics-tab.tsx`, `people-tab.tsx`, `templates-tab.tsx`.
- LOCKED_FILES.md.

## 4. Validação

- `bunx tsc --noEmit`
- Visual a 1460×871 (rota `/admin/automacoes`) — comparar com os 3
  screenshots: header + KPIs, etapas 01/02 com novo card layout,
  etapa 03 com follow-up sem trigger.
- Verificar Refrescar (network tab mostra novo GET).
- Verificar tooltips nos botões disabled.
- `bunx vitest run` (smoke geral).

## 5. Riscos

- Os 3 flows novos (`welcome_beta`, `personal_area_saved`,
  `report_summary`) ainda não disparam. Isto fica explícito no UI via
  status `BLOQUEADO`/`SEM TRIGGER` e nos contadores a 0 — não é
  regressão, é o estado real.
- Aproximação visual a 100% requer pixel-tuning iterativo; o plano cobre
  estrutura e copy, não micro-ajustes finais.

## Checkpoint

- ☐ API estendida (3 flows novos + timing + kpis + status/extraTag)
- ☐ Cards re-desenhados com ícone+badge+timing strip+stats centrados
- ☐ Botões Editar/Bloqueado com tooltip; Refrescar funcional
- ☐ Stage groups com tints e header Fraunces
- ☐ KPI row no topo a consumir `data.kpis`
- ☐ tsc + vitest verdes; comparação visual com os 3 screenshots
