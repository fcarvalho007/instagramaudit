# Alinhar acesso, cópia e gating para o modelo Free → Pro

## Resumo

A maior parte da infra (gates server-side 30d/90d/competitor, cache-aware modal Caso A/B/C, per-(lead, handle, window) cap, `pro_window_90d_enabled` seedado, admin observability com `fresh_forced`) já está pronta dos turnos anteriores. Esta passagem é maioritariamente **cópia e remoção do enquadramento "beta privada"**, mais 2 ajustes finos na UI.

## 1. Cópia pt-PT / en (i18n)

### Substituições em `src/i18n/locales/pt/report.json` e `en/report.json`

| Chave | Atual | Nova |
|---|---|---|
| `nav.explore.consume_dialog.soon_note` | "está em fase beta — vais ser notificado quando a nova análise estiver pronta." | **remover chave + uso** (já não temos "novidade em preparação") |
| `competitor_beta_note` | "Na fase beta, comparas 1 concorrente de cada vez. Em breve poderás comparar vários…" | "Podes comparar **1 concorrente de cada vez**." |
| `free_in_beta_badge` | "grátis na beta" | **remover** (ou substituir por "incluído") |
| `balance_hint*` | "Tens X crédito **beta** disponível." | "Tens X crédito disponível." |
| `credit_use_label` | "Usa 1 crédito **beta**" | "Usa 1 crédito Pro" |
| `period_coming_soon_title/body` | "Janela personalizada em preparação… ainda não está disponível nesta versão beta" | **remover** (chaves e qualquer fallback) — 30d/90d são Pro reais |
| `period_action_body` | "pode consumir 1 crédito **se ainda não existir em cache**…" | "Esta ação consome 1 crédito Pro." |
| `nav.tabs.coming_soon` + `coming_soon_detail` + `coming_soon_tooltip` | "Em breve · Julho 2026" | manter **apenas** para outras redes (TikTok/LinkedIn). Renomear chave-mãe para `nav.tabs.other_networks_soon` e garantir que **nenhuma** tab de 30d/90d/competitor a usa. |
| `comparison.roadmap_*` (Em breve: outras redes) | manter | **manter** — refere-se a outras redes, não a 30d/90d |
| `cache.expiring` ("A expirar em breve") | manter | manter — é estado real de cache, não roadmap |

### Em `pricing.json` (pt) / `gate.json` (pt)

- `pricing_pending_note` "Pagamento brevemente disponível" → revisão fora de scope (não toca checkout); manter.
- `tellUsBriefly` (formulário) → manter (não é tier).

### Componentes que precisam de ajuste pontual

- `src/components/report-redesign/v2/consume-credit-dialog.tsx` (linha ~282): remover `competitor_beta_note` se ficar redundante após reescrita; rever `soon_note`.
- `src/components/report-tier/tier-copy.ts` linha 12: "Relatório gratuito durante a fase beta" → "Relatório gratuito".
- `src/components/report-share/share-copy.ts` linha 4: remover "durante a fase beta".
- `src/components/report-redesign/report-shell.tsx` linha 195 (aria-label "Feedback durante a fase beta") + linha 47 (comentário): aria-label → "Feedback do relatório". Comentário interno pode ficar.
- `src/components/report-redesign/report-pending-ai-notice.tsx`: substituir "em preparação" por "a gerar" / "a calcular".
- `src/components/report-redesign/v2/cache-status-badge.tsx` (`expiring_soon`): manter (refere-se a expirar da cache).
- `src/components/beta/beta-request-form.tsx` (linhas 371/383): rota sem links internos (vestigial). **Não tocar** — fora de scope (não é caminho ativo no produto).
- `src/components/report-beta/beta-copy.ts` linha 13: revisão pendente. Se o componente é renderizado, substituir; se órfão, deixar.

### Emails (templates ativos)

Auditar `src/lib/email/templates/*.ts`:
- `payment-confirmed.ts` (linhas 132 e 171): "créditos extra por esta **fase beta**" → "créditos extra de **lançamento**". Atualizar teste em `__tests__/payment-confirmed.test.ts` ("2 créditos extra de lançamento").
- `report-ready.ts` linha 51: "Esta é uma versão beta:" → remover linha ou neutralizar para "Notas sobre esta análise:".
- `request-received.ts` linha 44: rephrase removendo "em fase beta", manter mensagem sobre utilidade.
- `welcome-beta.ts`: template de signup beta (sem trigger ativo no produto). **Não tocar** — fora de scope.
- Teste `src/lib/email/__tests__/templates.test.ts` linha 22 (`expect(...).toContain("fase beta")`): ajustar à nova cópia.

### Páginas legais (manter)

- `routes/termos.tsx` linhas 78, 160 e `routes/privacidade.tsx` linha 119: descrições legais de estado do serviço, não tier de acesso. **Manter inalteradas** — remover daria leitura jurídica errada.

## 2. Gates server-side (verificar — sem alteração esperada)

Já confirmado em turnos anteriores em `src/routes/api/analyze-public-v1.ts`:

- Free + 30d/90d → `WINDOW_REQUIRES_PRO` (linha ~661).
- Free + competitor → `COMPETITORS_REQUIRE_PRO` (linha ~620).
- 90d kill-switch lê `pro_window_90d_enabled` (linha ~644), default "true" e seedado em `app_config`.
- Per-(lead, handle, window) cap via `assertProWindowProfileDailyBudgetAvailable` corre antes de reservar crédito; só conta `confirm` no ledger (R1 aplicado hoje).
- 90d global cap via `assertApify90dDailyBudgetAvailable`.

Plano: **só re-correr os testes de contrato existentes** após edição de cópia; nenhum gate é alterado.

## 3. Visibilidade frontend

Verificar dois pontos:

- **`report-block-nav.tsx`**: chips de 30d e 90d devem aparecer para Pro sem o rótulo "Em breve". Já usam `usePublicAppConfig().pro_window_90d_enabled` para o gate. Confirmar que o estado "locked" para Free mostra texto "Disponível no Pro" (já existe via `gate.json`), e não "Em preparação".
- **`overview/comparison-header.tsx`**: o slot "roadmap_aria/title/card_badge" refere-se a **outras redes** (TikTok/LinkedIn) — manter mas confirmar pela leitura do componente que não está a marcar competitor IG como "em breve".

## 4. Cache vs fresh UX

Já implementado no turno anterior (`consume-credit-dialog.tsx` Casos A/B/C + `period_cache_body_*`). Apenas verificar:

- `period_cache_body_minutes/hours` correspondem ao copy pedido pelo utilizador (linhas 669–670 — já estão alinhadas).
- Botões "Abrir análise recente" / "Gerar nova análise · 1 crédito" / "Sem créditos disponíveis" estão presentes.

## 5. Admin observability (verificar)

Já implementado (`dataSourceLabel` com `fresh_forced`, `analysis_window`, `lead_entitlements` na drawer). Plano: rever rótulo de status de lead em `beta-leads/lead-detail-sheet.tsx` para usar "Free" / "Pro" em vez de qualquer "beta user" ou similar (se existir).

## 6. Validação

- Typecheck: `bunx tsc --noEmit` (executado pelo harness).
- Testes: `bunx vitest run --reporter=basic` focado em `apify-budget-pro-window`, `analyze-public-v1-force-refresh`, `payment-confirmed`, `templates`.
- Reler i18n: `rg -ni "beta privada|em preparação|coming soon|janela personalizada" src/i18n` → deve devolver vazio (excepto outras-redes).

## Fora de scope (explícito)

- Checkout / EuPago webhook.
- Preço.
- Schema DB.
- Prompts IA.
- Landing público (apenas correções de cópia se ainda tiverem "beta privada" como tier).
- Rota `/beta/request` e `welcome-beta.ts` (vestigiais, sem trigger ativo).
- Pesquisa LinkedIn/TikTok (continua roadmap legítimo).
