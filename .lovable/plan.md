## Auditoria — /admin/automacoes vs mockup

Confirmado que a estrutura actual (header + KPI row + tabs + stage groups + cards de 3 zonas + timing strip) corresponde ao mockup. Existem, contudo, **regressões reais** introduzidas no último refactor que precisam de ser fechadas.

### 1. BUILD QUEBRADO (bloqueante)

`src/components/admin/v2/automacoes/metrics-tab.tsx` ainda referencia campos que foram removidos de `AutomationFlow`:

- linha 21: `f.recentFailures` → não existe; é agora `f.failuresTotal`
- linha 124: `f.completedCount` → não existe; é agora `f.completedLeads ?? f.sentEvents`
- linha 64: copy `"Falhas recentes (7d)"` → API agora usa janela 30d (`linkFailures30d`); deve ler `"Falhas recentes (30d)"` para coincidir com KPI
- linha 69: cor literal `#D85A30` → deve ser token (`rgb(var(--admin-signal-500))`)
- linha 10: import vem de `@/routes/api/admin/automation-flow` (re-export legacy) → mover para `@/lib/admin/automation-flow-types` (fonte canónica)

### 2. Meta de stage não bate certo com o mockup

O mockup mostra meta diferente por stage:

- **00 Onboarding**: `5 emails · 7 dias`
- **01 Captação**: `8 ciclos · ~6h médio`
- **02 Entrega**: `8/8 abertos · 100%`
- **03 Conversão**: `7 elegíveis · 1 convertido`

Hoje em `automation-flow-page.tsx` (linhas 260-264) só existem dois ramos (`00_onboarding` vs resto). Calcular meta por stage usando dados já disponíveis na API:

- 00: `{n} emails · {sentEvents total}`
- 01: `{ciclosCompletos} ciclos · {avgGenerationLabel}` (já temos `flow.timing.averageLabel` em `relatorio_gerado`)
- 02: `{linkEnviadoCompleted}/{eligible} entregues · {pct}%` (calculável via `link_enviado.completedLeads` + `eligibleCount`)
- 03: `{eligible} elegíveis · {convertidos}` (já temos `follow_up_comercial.completedLeads`)

A lógica fica em `FlowStages` (FE) — não exige alteração à API.

### 3. Restante UX vs mockup

Conformidade visual confirmada:

- Header eyebrow "PIPELINE · AUTOMAÇÕES" + h1 serif + subtitle ✓
- Botões Refrescar (funcional) + Ver logs (dark, desactivado, tooltip) + ⋯ (square, desactivado, tooltip) ✓
- KPI row com 4 tiles, ícone CheckCircle2/AlertTriangle/ShieldCheck conforme estado ✓
- Tabs: Fluxo · Métricas · Pessoas · Templates ✓
- Cards com 3 zonas (identificação / temporização / stats) ✓
- Pílula de tipo grande à esquerda + status pill + extra pill ("ENTREGA PRINCIPAL", "SEM EMAIL", "BLOQUEADO") ✓
- Botão "Editar" com label visível, tooltip "Disponível em breve" ✓
- TimingStrip com 4 variantes (immediate/delay/average/undefined) e chip `<TriggerCode>` ✓
- Stats (Enviados / A aguardar / Falhas) com tons por valor ✓
- Card "Bloqueado" para `relatorio_gerado` ✓
- Card "Sem trigger" + "Configurar trigger" amarelo para `follow_up_comercial` — **discrepância**: o mockup mostra um botão laranja "Configurar trigger" mas o componente actual mostra apenas "Editar" desactivado. Adicionar variante visual quando `flow.status === 'undefined'`.

### 4. Inconsistências menores

- `automation-flow.ts` linha 337: `eventName: "request_received"` no timing average de `relatorio_gerado` — esse evento não está em `FLOW_EVENTS` nem é emitido. Deveria ser `"beta_request_created"` (que é o que `pedido_recebido` regista).
- `automation-flow.ts` re-exporta `FlowStage` etc. para retrocompatibilidade (linhas 34-43) mas só `metrics-tab.tsx` ainda depende; depois da correcção (1) este re-export pode ser removido.

---

## Plano de correcção (cirúrgico, FE-only excepto onde indicado)

### Passo 1 — Desbloquear build
Editar `src/components/admin/v2/automacoes/metrics-tab.tsx`:
- Trocar import para `@/lib/admin/automation-flow-types`.
- Substituir `f.recentFailures` por `f.failuresTotal`.
- Substituir `f.completedCount` por `f.completedLeads ?? f.sentEvents`.
- Trocar copy `(7d)` → `(30d)`.
- Substituir `#D85A30` por `rgb(var(--admin-signal-500))`.

### Passo 2 — Meta de stage por stage
Em `automation-flow-page.tsx::FlowStages`, calcular `meta` por chave de stage usando `stageFlows` (e flow específico para 01/02/03 quando precisar de campos derivados). Lógica pura no FE; sem alteração à API.

### Passo 3 — Variante "Configurar trigger" para `status === 'undefined'`
Em `automation-node.tsx::EditButton`, adicionar terceiro caminho quando o flow tem `status === 'undefined'`: botão laranja com label "Configurar trigger" (estilo do mockup), igualmente desactivado com tooltip "Disponível em breve". Cores via tokens admin (`--admin-pill-warn-*` ou novo `--admin-button-warn-*` se necessário).

### Passo 4 — Corrigir evento de timing em `relatorio_gerado`
Em `automation-flow.ts` linha 337, trocar `eventName: "request_received"` → `"beta_request_created"`.

### Passo 5 — Limpeza
Remover re-export legacy em `automation-flow.ts` (linhas 33-43) depois de garantir que mais ninguém importa daí (`rg "from \"@/routes/api/admin/automation-flow\""`).

### Passo 6 — Verificação
- `tsc --noEmit` (deve passar).
- Visual: abrir `/admin/automacoes`, conferir que cada stage tem meta correcta, que o cartão de follow-up comercial mostra "Configurar trigger" laranja, e que a tab "Métricas" carrega sem erros e mostra "Falhas recentes (30d)".

---

## Checkpoints

- ☐ Passo 1 — `metrics-tab.tsx` actualizado, build verde
- ☐ Passo 2 — Meta de stage dinâmica por chave
- ☐ Passo 3 — Botão "Configurar trigger" no card sem trigger
- ☐ Passo 4 — Evento `beta_request_created` no timing average
- ☐ Passo 5 — Re-export legacy removido
- ☐ Passo 6 — Build + verificação visual ok

## Restrições

- Sem alterações de DB, providers ou envio de emails.
- Sem novos endpoints; ajuste pontual à API só para corrigir nome de evento.
- Sem mexer em `LOCKED_FILES.md`.
- Cores só via tokens em `src/styles/admin-tokens.css`.
