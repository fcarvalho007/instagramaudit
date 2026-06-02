# Unificar CTAs premium no relatório público

Implementação do plano aprovado na auditoria anterior, agora com o detalhe extra pedido (copy do popover, evento `premium_window_interest`, validações).

## 1. Novo provider partilhado

Criar `src/components/report-redesign/v2/premium-cta-context.tsx`:

- `PremiumCtaProvider` recebe `{ snapshotId, handle, variant, premiumUnlocked }` e mantém estado `{ open, source }`.
- Expõe hook `usePremiumCta()` com:
  - `handlePremiumAccessClick(source, extra?)` — dispara `premium_cta_clicked` (fire-and-forget, try/catch) com `{ source_component, handle, snapshot_id, selected_window? }` e abre o dialog. Se `premiumUnlocked === true`, faz `scrollToBlock('compare')` em vez de abrir.
  - `trackPremiumWindowInterest(windowDays)` — dispara `premium_window_interest`.
- Renderiza **um único** `<PremiumInterestDialog>` controlado, com `sourceComponent` igual ao último `source` clicado.
- `source` aceita `'sidebar' | 'analysis_period_selector' | 'lock_gate' | 'sticky_unlock_bar' | 'premium_section'`.

## 2. Wiring no shell

`src/components/report-redesign/v2/report-shell-v2.tsx`:
- Envolver o conteúdo com `<PremiumCtaProvider>` recebendo as props já existentes (`snapshotId`, `handle`/`payload.instagram_username`, `variant`, `premiumUnlocked`).
- Remover `onUnlockClick` da assinatura pública (ou mantê-lo deprecated e ignorá-lo) — todos os consumidores passam a usar o hook.

`src/routes/analyze.$username.tsx`:
- Deixar de passar `onUnlockClick={() => setUnlockOpen(true)}`. `UnlockModal` (lead-capture) **mantém-se** apenas montado para o card lead-magnet existente — não é mais alvo de CTAs premium.
- Manter `premiumUnlocked={false}` com `// TODO: ligar a estado real quando o gateway estiver ativo`.

## 3. Consumidores migrados

Todos passam a chamar `usePremiumCta().handlePremiumAccessClick(...)` e perdem o seu `PremiumInterestDialog`/`dialogOpen` local:

- `analysis-period-selector.tsx`
- `report-block-nav.tsx` (`PremiumBlockCard` → `'sidebar'`; `ContinueReadingCard` continua a fazer scroll ao lead-magnet, mas o fallback chama `handlePremiumAccessClick('sidebar')` em vez de `onUnlockClick`)
- `premium-callout.tsx` → `'premium_section'`
- `end-of-free-block.tsx` → `'lock_gate'`
- `report-post-comparison.tsx` → `'premium_section'`

## 4. Selector — copy + comportamento

`analysis-period-selector.tsx`:
- Remover prop `onUnlockClick`, remover dialog fallback local, remover estado `dialogOpen`.
- No `onOpenChange` de cada popover (quando abre), chamar `trackPremiumWindowInterest(days)` (uma vez por abertura).
- `handleCta(days)` → `handlePremiumAccessClick('analysis_period_selector', { selected_window: \`${days}d\` })`.
- Atualizar chaves i18n usadas pelo popover para a nova copy.

Chaves i18n a atualizar/criar em `src/i18n/locales/{pt,en}/report.json` (secção `selector.locked`):

PT:
- `title`: "Disponível no relatório completo"
- `body`: "Analisa mais histórico para perceber evolução, consistência e padrões de conteúdo ao longo do tempo."
- `cta`: "Desbloquear relatório completo"
- `secondary`: "Continuar com visão gratuita"

EN:
- `title`: "Available in the full report"
- `body`: "Analyze more history to understand evolution, consistency and content patterns over time."
- `cta`: "Unlock full report"
- `secondary`: "Continue with free overview"

## 5. Label unificada nos restantes CTAs

Auditar `nav.access.cta`, `premium.register_interest`, `endOfFree.cta` (e equivalentes) em PT/EN. Onde forem CTAs de "abrir pricing" devem ler **exatamente** "Desbloquear relatório completo" / "Unlock full report". Ajustar só os strings que forem CTA primário do mesmo fluxo — manter copy de apoio inalterada.

## 6. Tracking

Reutilizar `trackEvent` já existente em `report-block-nav.tsx`:
- Renomear `unlock_clicked` (sidebar) → `premium_cta_clicked` com `source_component: 'sidebar'`.
- Novo `premium_window_interest` disparado uma vez por abertura de popover do selector.
- Metadata nunca inclui email/telefone. Todas as chamadas com `.catch(() => {})` para não bloquear.

## 7. Guardas

Confirmar (revisão de código + teste) que o handler:
- não escreve em `sessionStorage`/cookies de unlock;
- não navega nem mexe em query params;
- não invoca server functions de análise;
- não consome créditos.

O selector continua puramente apresentacional: chip locked só abre popover; CTA só chama o handler.

## 8. Testes

Novos / atualizados em `src/components/report-redesign/v2/__tests__/`:

- `premium-cta-context.test.tsx` — `handlePremiumAccessClick` abre dialog, regista evento com `source_component` correto, faz no-op + scroll quando `premiumUnlocked`.
- `analysis-period-selector.test.tsx` — chip locked dispara `premium_window_interest`, CTA usa label unificada (PT e EN via i18n mock), `handlePremiumAccessClick` recebe `selected_window` correto, clique não muda estado do selector.
- Garantir que nenhum teste novo importa `UnlockModal` ou copy de onboarding.
- Atualizar snapshots existentes que dependam das chaves de i18n alteradas.

## 9. Validação final

- `bunx tsc --noEmit`
- `bunx vitest run src/components/report-redesign/v2/`
- Verificação manual via preview: sidebar CTA e selector CTA abrem **o mesmo** `PremiumInterestDialog`; `UnlockModal` não abre a partir de nenhum CTA premium; nenhum request de rede ao clicar.

## Ficheiros afetados

- novo: `src/components/report-redesign/v2/premium-cta-context.tsx`
- novo: `src/components/report-redesign/v2/__tests__/premium-cta-context.test.tsx`
- novo: `src/components/report-redesign/v2/__tests__/analysis-period-selector.test.tsx`
- `src/components/report-redesign/v2/report-shell-v2.tsx`
- `src/components/report-redesign/v2/analysis-period-selector.tsx`
- `src/components/report-redesign/v2/report-block-nav.tsx`
- `src/components/report-redesign/v2/premium-callout.tsx`
- `src/components/report-redesign/v2/end-of-free-block.tsx`
- `src/components/report-redesign/v2/report-post-comparison.tsx`
- `src/routes/analyze.$username.tsx`
- `src/i18n/locales/pt/report.json`
- `src/i18n/locales/en/report.json`

Sem tocar em: onboarding, lead session, `/api/analyze-public-v1`, créditos, Apify/OpenAI/DataForSEO, geração de janela temporal, scoring, gateway, pricing, thumbnails, emails, `UnlockModal`.

## Riscos

- Renomear `unlock_clicked` → `premium_cta_clicked` quebra dashboards existentes. Mitigação: manter um disparo extra `unlock_clicked` durante o período de transição **se** o user confirmar que há analítica a consumir. Pergunto antes se mantenho compat ou se faço corte limpo.
- `ContinueReadingCard` (sidebar com `unlocked=false`) hoje faz scroll ao lead-magnet — mantém-se igual, só muda o fallback. Verificar visualmente que continua a aterrar no card certo.
- `PremiumInterestDialog` partilhado significa um só `open` global; se houver overlap (dois CTAs em rápida sucessão) o último `source` ganha. Aceitável para tracking.
