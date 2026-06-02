# Auditoria — CTAs premium em `/analyze/$username`

Apenas auditoria. Sem alterações de código nesta fase.

## 1. Mapa atual de CTAs

| # | Origem | Componente | Label visível (PT) | Handler atual | Modal que abre |
|---|---|---|---|---|---|
| A | Sidebar (lead já capturado, `unlocked=true`) | `report-block-nav.tsx` → `PremiumBlockCard` → `openDialog()` | "Desbloquear relatório completo" (`nav.access.cta`) | Estado **local** `dialogOpen` dentro de `SidebarList` | `PremiumInterestDialog` (modal de pricing/acesso) ✅ |
| B | Sidebar (lead ainda **não** capturado, `unlocked=false`) | `report-block-nav.tsx` → `ContinueReadingCard` → `focusLeadMagnet()` | "Continuar a ler" / variante grátis | Faz scroll para `#lead-magnet-card`; se não existir, chama `onUnlockClick?.()` | `UnlockModal` (5-step lead-capture) — não é pricing |
| C | Selector de período → popover de cada janela bloqueada (30/60/90/365) | `analysis-period-selector.tsx` → `handleCta()` | "Ver opções de acesso" (`selector.locked.cta`) | Delega em `onUnlockClick` (prop vinda de `ReportShellV2` → rota) | `UnlockModal` (lead-capture) ❌ — devia ser `PremiumInterestDialog` |
| D | Selector (fallback quando `onUnlockClick` não é passado, ex.: snapshot público) | mesmo componente | "Ver opções de acesso" | Estado local `dialogOpen` | `PremiumInterestDialog` ✅ (mas caminho morto na rota autenticada) |
| E | `PremiumCallout` em vários blocos | `premium-callout.tsx` | "Registar interesse" (`premium.register_interest`) | Estado local | `PremiumInterestDialog` ✅ |

Em `src/routes/analyze.$username.tsx:431-432`:
```
premiumUnlocked={false}
onUnlockClick={() => setUnlockOpen(true)}   // ← abre UnlockModal
```
`UnlockModal` (`src/components/product/unlock-modal.tsx`) é o formulário de 5 passos de captura de lead, não o modal de pricing.

## 2. Causa raiz

- A prop `onUnlockClick` na rota está cablada **exclusivamente** ao `UnlockModal` (lead-capture).
- O `AnalysisPeriodSelector` foi desenhado para "delegar quando possível, senão usar `PremiumInterestDialog` local". Como a rota fornece sempre `onUnlockClick`, o branch correto (dialog premium local) nunca corre — passa sempre pelo lead-capture.
- A sidebar, por acaso, contorna o bug porque tem o seu **próprio** `PremiumInterestDialog` interno (CTA A) e só cai em `onUnlockClick` no ramo `unlocked=false` (CTA B, fallback do `focusLeadMagnet`).
- Resultado: dois "tipos" de modal a sair de CTAs premium conforme o ponto de entrada, e o selector apanha o pior caminho.

## 3. Respostas diretas

1. Sidebar "Desbloquear relatório completo": `ReportBlockSidebar` → `SidebarList` → `PremiumBlockCard` em `src/components/report-redesign/v2/report-block-nav.tsx` (linhas 407–517).
2. Selector "Ver opções de acesso": `AnalysisPeriodSelector` em `src/components/report-redesign/v2/analysis-period-selector.tsx` (linhas 35–204).
3. **Handlers diferentes.** Sidebar usa estado local `dialogOpen` para abrir o pricing. Selector delega em `onUnlockClick` da rota, que aponta para o lead-capture.
4. Sidebar (`unlocked=true`) → `PremiumInterestDialog`. Selector → `UnlockModal`. Sidebar (`unlocked=false` ramo "Continuar") → scroll para lead-magnet ou `UnlockModal`.
5. **Sim** — o selector tem um `PremiumInterestDialog` local declarado como "fallback" (linhas 195–202), mas nunca é o que abre na rota autenticada porque `onUnlockClick` está sempre presente e ganha prioridade no `handleCta`.
6. O shell `ReportShellV2` recebe `unlocked` (estado de lead capturado) mas **não** sabe se houve compra premium. `premiumUnlocked` está hard-coded a `false` na rota (linha 431).
7. `lead_session` está disponível indiretamente: a rota persiste `ib_unlock:{snapshotId}` e `ib_unlock_lead:{snapshotId}` em `sessionStorage` (linhas 455–458), e o cookie `lead_session` é definido pelo servidor após `UnlockModal.onUnlock`. Não há leitura desta info no handler de CTA premium.
8. **Não.** Não existe verificação de "já comprou premium". `premiumUnlocked` é literal `false` em todos os renders.
9. `premiumUnlocked` só aparece em `report-shell-v2.tsx` (prop com default `false`) e em `analyze.$username.tsx:431` (sempre `false`). Não há nenhum sítio que o defina a `true`.
10. Tracking: `trackEvent({ eventType: "unlock_clicked", metadata: { source_component } })` é disparado em `report-block-nav.tsx` (`openDialog`, `focusLeadMagnet`) com `source_component: "sidebar_access"` / `"sidebar_continue_free"`. **O selector não dispara nada** quando o CTA é clicado.

## 4. Fonte única de verdade recomendada

Criar um único hook/contexto no shell (ex.: `useReportPremiumCta()`) com:
- Estado: `{ premiumUnlocked, leadUnlocked, paymentEnabled }`.
- Acção única: `openPremiumAccess(source: string)` que:
  1. Dispara `trackEvent('premium_cta_clicked', { source_component, snapshotId, handle })`.
  2. Se `premiumUnlocked === true` → não faz nada (CTA não devia estar visível; fallback: scroll ao primeiro bloco premium).
  3. Caso contrário → abre **sempre** o `PremiumInterestDialog` (que já cobre os modos "pagamento ativo" e "interesse" via `pending_note`).
- Toda a árvore (`AnalysisPeriodSelector`, `ReportBlockSidebar`, `PremiumCallout`, `EndOfFreeBlock`, `ReportPostComparison`) consome esse hook e deixa de instanciar `PremiumInterestDialog` ou `dialogOpen` locais.
- A rota deixa de cablar `onUnlockClick` ao `UnlockModal`. O `UnlockModal` passa a ser invocado apenas pelo lead-magnet card e pelo onboarding existente, nunca a partir de um CTA premium.
- Label unificada: `nav.access.cta` ("Desbloquear relatório completo" / "Unlock full report"). Eliminar `selector.locked.cta` ("Ver opções de acesso") e substituir pela mesma chave (ou aliasar).

## 5. Plano mínimo de implementação (a executar noutro turno)

1. Adicionar `PremiumCtaProvider` em `report-shell-v2.tsx` (estado + handler único + render único de `PremiumInterestDialog`).
2. Expor `usePremiumCta()` e substituir, num único commit por componente:
   - `analysis-period-selector.tsx`: remover `onUnlockClick`, remover `PremiumInterestDialog` local; `handleCta` chama `openPremiumAccess('analysis_period_selector')`.
   - `report-block-nav.tsx`: remover `dialogOpen` local e `PremiumInterestDialog` interno; `PremiumBlockCard` e `ContinueReadingCard` chamam `openPremiumAccess('sidebar_access' | 'sidebar_continue')`.
   - `premium-callout.tsx`, `end-of-free-block.tsx`, `report-post-comparison.tsx`: idem.
3. Em `analyze.$username.tsx`: remover `onUnlockClick={() => setUnlockOpen(true)}`. Manter `UnlockModal` apenas para o lead-magnet (mantém o uso atual via card dedicado).
4. Unificar string PT/EN para "Desbloquear relatório completo" / "Unlock full report" e atualizar `selector.locked.cta`.
5. Adicionar evento `premium_cta_clicked` único; remover/aliasar os `unlock_clicked` antigos.

## 6. Ficheiros provavelmente afetados

- `src/routes/analyze.$username.tsx`
- `src/components/report-redesign/v2/report-shell-v2.tsx`
- `src/components/report-redesign/v2/analysis-period-selector.tsx`
- `src/components/report-redesign/v2/report-block-nav.tsx`
- `src/components/report-redesign/v2/premium-callout.tsx`
- `src/components/report-redesign/v2/end-of-free-block.tsx`
- `src/components/report-redesign/v2/report-post-comparison.tsx`
- `src/i18n/locales/{pt,en}/report.json`
- Novo: `src/components/report-redesign/v2/premium-cta-context.tsx` (provider + hook)
- Testes: snapshots de `analysis-period-selector` e `report-block-nav`

Sem tocar em: onboarding-modal, `/api/onboarding/start`, `/api/analyze-public-v1`, lógica de créditos, Apify/OpenAI/DataForSEO, scoring, thumbnails, dados do período, pricing, gateway de pagamento, emails.

## 7. Riscos

- **Regressão de tracking**: se mantivermos `unlock_clicked` e adicionarmos `premium_cta_clicked`, métricas duplicam; decidir antes se renomear é breaking.
- **Lead-magnet card**: o ramo `ContinueReadingCard` faz scroll a `#lead-magnet-card`; se o card desaparecer noutra iteração, o fallback tem de continuar a abrir o premium e não o `UnlockModal`.
- **Snapshot público** (sem rota autenticada): garantir que o provider funciona sem `lead_session` e que `PremiumInterestDialog` continua a aceitar `snapshotId`/`handle` opcionais.
- **`premiumUnlocked` sempre false**: enquanto não houver gateway, o handler deve resolver-se sempre como "abrir pricing/interesse". Quando ligarem pagamentos, o flag passa a vir de leitura real (cookie/endpoint) — desenhar o provider com essa porta já prevista.
- **Tab key / a11y**: ao remover dialogs locais, garantir que o foco volta ao botão de origem (gerir `triggerRef` no provider).
