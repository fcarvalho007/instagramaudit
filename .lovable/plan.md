# Ativar “Análise por período” para Pro

## Estado atual confirmado

- **Backend tem a capacidade**: `src/routes/api/admin/apify-lab.ts` já mapeia `window_kind` ∈ {baseline, 30d, 60d, 90d, 365d} para `onlyPostsNewerThan` + `resultsLimit` (12 / 100 / 200 / 300 / 1000) e dispara o actor Apify com sucesso. Foi isto que testámos antes.
- **Pipeline público NÃO usa janela**: `src/routes/api/analyze-public-v1.ts` corre sempre com `resultsLimit: PUBLIC_INSTAGRAM_POSTS_LIMIT` (baseline). Não aceita parâmetro de janela e a chave de cache não inclui janela.
- **UI Pro é stub**: em `src/components/report-redesign/v2/report-block-nav.tsx` L613–630, `onConfirmConsume` quando `intent.kind === "period"` apenas trackeia `beta_credit_intent_period`, fecha o dialog e **não consome crédito nem chama backend**. O texto que viste vem de `nav.explore.consume_dialog.period_coming_soon_*`.
- **Selector inline** (`analysis-period-selector.tsx`) renderiza sempre os chips 30/60/90/365 como *locked*, mesmo quando `premiumUnlocked = true` — nunca leu o flag.

## Objetivo

- Free: continua exatamente como está (chips bloqueados → `PremiumInterestDialog`).
- Pro (`premiumUnlocked = true` **e** `balance ≥ 1`): consegue escolher uma janela 30/60/90/365d, consome 1 crédito de forma atómica, dispara nova análise com a janela escolhida e o relatório re-renderiza com esses dados. Cache por (lead_id, handle, janela) para nunca cobrar duas vezes a mesma janela.
- Sem alterações a `/report.example`, sem alterações a `Free`, sem novas dependências.

## Plano técnico

### 1. Backend — aceitar janela em `analyze-public-v1`

Em `src/routes/api/analyze-public-v1.ts`:

- Adicionar campo opcional `window` ao schema Zod do body: `z.enum(["baseline","30d","60d","90d","365d"]).default("baseline")`.
- Importar `WINDOW_CONFIGS` de `src/routes/api/admin/apify-lab.ts` (extrair para `src/lib/analysis/window-configs.ts` para evitar acoplamento admin↔público).
- Mapear `window` → `{ resultsLimit, onlyPostsNewerThan }` e passar ao input do Apify actor; quando `window === "baseline"`, manter `PUBLIC_INSTAGRAM_POSTS_LIMIT` (comportamento atual).
- **Gate de Pro + crédito** (só quando `window !== "baseline"`):
  - exigir `lead_session` válido,
  - exigir `lead_entitlements.product_code = 'report_full_9'`,
  - reservar 1 crédito via o mesmo helper que o competitor usa (`reserveCredit` / `confirmCredit` / `releaseCredit`),
  - falhar com `PREMIUM_REQUIRED` ou `INSUFFICIENT_CREDITS` caso contrário.
- **Cache key** passa a incluir `window` (ex.: append `:w=30d`) para que (a) Pro 30d e Free baseline coexistam no mesmo lead e (b) repetir a mesma janela seja cache hit (sem novo débito).
- Logar `provider_call_logs` com `metadata.window` (já temos `purpose/mode` na lab — reutilizar).

### 2. Snapshot/cadence respeitar a janela

Em `src/lib/report/snapshot-to-report-data.ts`:

- Propagar `window` para `meta.windowLabel` (“Últimos 30 dias” / 60 / 90 / 365 / “amostra recente”).
- `computeCadence` já cobre janelas; passar `now` + amostra é suficiente — só garantir que o cálculo não force baseline.
- Ajustar `meta.viewsAvailable` e `meta.temporalLabel` para usar o label da janela.

### 3. Frontend — sidebar (paid period chips)

Em `src/components/report-redesign/v2/report-block-nav.tsx` `ExploreSection`:

- Substituir a branch stub do `onConfirmConsume` (L613–630) por uma chamada real:
  - validar `balance ≥ 1` (botão já está atrás do dialog),
  - chamar `fetchPublicAnalysis(primaryHandle, existingCompetitors, { window: '<Nd>' })` (estender a assinatura em `src/lib/analysis/client.ts`),
  - on success: `refreshBalance()`, `toast.success`, `navigate({ to: '/analyze/$username', search: { vs, w: 'Nd' }, replace: false })`,
  - on failure: mostrar `errorMessage` (mesmos códigos que o branch competitor).
- Remover o copy "coming soon" do dialog para o caso `period + hasCredit`; passa a usar título/descrição reais (`title_period`, `description_period`) que precisam ser adicionadas em `report.json` PT/EN.
- Manter o estado "saldo 0" → empty state com botão de feedback (já existe).

### 4. Frontend — chips inline (`AnalysisPeriodSelector`)

Em `src/components/report-redesign/v2/analysis-period-selector.tsx`:

- Ler `premiumUnlocked` do `usePremiumCta()`.
- Quando `premiumUnlocked === false`: comportamento atual (popover de upsell).
- Quando `premiumUnlocked === true`:
  - chip da janela atualmente ativa fica destacado (compara com `meta.window`),
  - clique num chip diferente abre o **mesmo `ConsumeCreditDialog`** (consistência com sidebar), com `intent = { kind: 'period', days }`.
- Não alterar contrato dos chips ativos da amostra baseline.

### 5. Route `analyze.$username.tsx`

- Aceitar `?w=30d|60d|90d|365d` no `search`, validar com Zod, passar ao `fetchPublicAnalysis` no loader.
- Quando `w` muda, TanStack Query reativa o loader (chave inclui `w`).
- Default = baseline (sem `w`), preservando todas as URLs atuais.

### 6. Telemetria

- Renomear `beta_credit_intent_period` para evento de pedido real e adicionar `beta_credit_used_period` no sucesso, espelhando `competitor_add`.
- Manter `premium_window_interest` para Free (não muda).

### 7. i18n

- PT/EN: adicionar `nav.explore.consume_dialog.title_period`, `description_period`, `cta_use_period`, `success_toast_period`.
- Remover/arquivar `period_coming_soon_title` + `period_coming_soon_body` (ou manter como fallback para Free zero-credit).

### 8. Testes

- `analyze-public-v1` novo teste: `window=30d` sem entitlement → 403; com entitlement + 1 crédito → consome e devolve snapshot com `meta.window === '30d'`; segunda chamada idêntica → cache hit sem débito.
- `report-block-nav` test: `kind: 'period'` confirma chama `fetchPublicAnalysis` com `{ window }` e refresca saldo.
- `cadence`: garantir que janela explícita 30d não cai em `window_90d` quando há 3+ posts dentro de 30d.

## Diagrama de fluxo (Pro)

```text
Pro clica chip "30d" (sidebar ou inline)
  └─► ConsumeCreditDialog (balance ≥ 1?)
        ├─ Não → empty state + feedback
        └─ Sim → confirmar
              └─► POST /api/analyze-public-v1 { handle, vs, window: "30d" }
                    ├─ valida entitlement report_full_9
                    ├─ reserva 1 crédito
                    ├─ Apify run (resultsLimit:100, onlyPostsNewerThan:"30 days")
                    ├─ confirma crédito + grava snapshot (cache key inclui w=30d)
                    └─ devolve snapshot
              └─► navigate({ search: { ..., w: "30d" } })
                    └─► loader re-fetch → relatório re-renderiza com a janela
```

## Fora do âmbito

- Não tocar em `/report.example`.
- Não mexer em pagamentos/EuPago/checkout.
- Não alterar schema do `report_full_9` nem regras de entitlement.
- Não alterar fluxo Free (apenas garantir que continua igual).
- Não introduzir scraping próprio nem novos provedores.

## Risco / mitigação

- **Custo Apify**: 60d/90d/365d são as configs mais caras. Mitigar mantendo `resultsLimit` igual ao lab e cobrando 1 crédito por janela distinta + cache por janela.
- **Re-render do report**: garantir que `react-query` invalida cleanly ao mudar `w` (chave inclui `w`).
- **Pedidos paralelos**: usar o mesmo guard in-flight que o competitor usa em `fetchPublicAnalysis`.

## Critério de aceitação

- Free continua a ver chips locked + popover de upsell, sem regressões.
- Pro com 1+ crédito consegue escolher 30d, vê a barra de progresso → relatório com `meta.windowLabel = "Últimos 30 dias"`, cadence e séries temporais com dados reais dessa janela.
- Saldo decrementa só na primeira vez que essa janela é pedida para esse handle/competitors; repetir é cache hit, sem débito.
- Sem chamadas Apify quando o utilizador está em Free.
