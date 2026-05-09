## Diagnóstico do mockup vs. relatório real

Confirmado por leitura do código (`report-block-nav.tsx`, `report-hero-v2.tsx`, `premium-interest-dialog.tsx`):

1. **Avatar vazio** — o sidebar (`ProfileHeader`, linhas 106-112) usa `profile.avatarUrl` **bruto**. O Instagram bloqueia hotlinking, então a imagem nunca renderiza e cai no fallback de inicial. O hero (`report-hero-v2.tsx:363`) usa `/api/public/ig-thumb?url=...` como proxy e por isso **funciona lá**. **Causa raiz identificada.**

2. **Botão "DESBLOQUEAR" inerte** — `CofreCard` (linha 314-320) não tem `onClick`, não abre o `PremiumInterestDialog`, e não dispara `unlock_clicked`. O `PremiumCallout` no gráfico de engagement já faz isto corretamente. Inconsistência.

3. **Tiles de pricing inertes** — as duas cards "Uma vez" / "Bundle 5" são `<div>`s, não disparam `pricing_option_clicked`. Perde-se sinal comercial vindo do sidebar (que está sempre visível, ao contrário do callout enterrado no relatório).

Tudo o resto bate certinho com o mockup (estrutura, cores, badges, tipografia, progresso, eyebrows).

---

## Refinamentos a aplicar

### 1. Avatar real via proxy `ig-thumb` (a correção principal)

Em `ProfileHeader` (`report-block-nav.tsx`):
- Quando `profile.avatarUrl` existe, usar `src={`/api/public/ig-thumb?url=${encodeURIComponent(profile.avatarUrl)}`}` em vez do URL direto.
- Adicionar `onError` que esconde o `<img>` (mesmo padrão do hero).
- Quando o proxy falha ou não há `avatarUrl`, manter o fallback atual (círculo azul com inicial).
- Manter `loading="eager"` (above-the-fold no desktop sidebar) e `decoding="async"`.

### 2. Botão "DESBLOQUEAR" abre o `PremiumInterestDialog`

Refactor de `CofreCard`:
- Converter para componente com estado local `dialogOpen` (igual ao `PremiumCallout`).
- Usar `useReportTracking()` para obter `snapshotId`, `handle`, `variant` (já existe contexto, basta consumir).
- `onClick` do botão DESBLOQUEAR:
  - Disparar `trackEvent({ eventType: "unlock_clicked", metadata: { variant, source_component: "sidebar_cofre" } })`
  - Abrir o dialog
- Renderizar `<PremiumInterestDialog open={dialogOpen} onOpenChange={setDialogOpen} sourceComponent="sidebar_cofre" snapshotId handle variant />`

### 3. Tiles de pricing disparam `pricing_option_clicked`

Os dois tiles (`Uma vez` e `Bundle 5`) ficam `<button type="button">` em vez de `<div>`, com:
- `onClick` que dispara `pricing_option_clicked` com `pricing_option: "single_3_eur"` ou `"bundle_13_eur"`, `source_component: "sidebar_cofre"`, e abre o dialog (idempotente — segundo clique não duplica, igual ao dialog).
- Estado visual `aria-pressed`/checkmark quando registado (mesmo padrão do dialog interno: `Set<PricingOption>`).
- Tap target ≥ 44px no mobile (já garantido pelo `p-2.5`).

### 4. Polimento ligeiro pt-PT / acessibilidade

- `alt={`Avatar de ${handle}`}` no `<img>` do sidebar (atualmente `alt=""`), para coerência com o hero.
- Adicionar `aria-label="Abrir opções de desbloqueio"` ao botão DESBLOQUEAR.

---

## Detalhes técnicos

- **Ficheiros tocados** (apenas frontend, conforme regra de "UI change → frontend only"):
  - `src/components/report-redesign/v2/report-block-nav.tsx` — `ProfileHeader` (avatar) + `CofreCard` (refactor para dialog/tracking)

- **Sem migrações.** Sem alterações de API. O endpoint `/api/public/ig-thumb` já existe e é usado pelo hero. Eventos `unlock_clicked` e `pricing_option_clicked` já estão na allowlist (`tracking.functions.ts`).

- **Sem dependências novas.** Reutiliza `PremiumInterestDialog`, `useReportTracking`, `trackEvent`.

- **Sem alterações no `/report.example`** (mockup intacto, conforme regra do projeto).

- **Sem alterações ao `report-hero-v2.tsx`** (já está correto e está em `LOCKED_FILES.md`? — verificar antes de qualquer edição lateral; este plano não o toca).

---

## Validação

- `bunx tsc --noEmit` limpo
- `bunx vitest run` (não há testes específicos do sidebar; cobertura de `tracking.functions` e `feedback-intent` mantém-se verde)
- Visual: abrir `/analyze/<handle-com-avatar>` no preview, confirmar:
  - Sidebar mostra a foto real do perfil (mesma que aparece no hero)
  - Click em "DESBLOQUEAR" abre o dialog com 4 opções
  - Click em tile "€3" ou "€13" no sidebar regista evento e marca como selecionado
  - Em `product_events`: aparecem `unlock_clicked` e `pricing_option_clicked` com `metadata.source_component = "sidebar_cofre"`
- Mobile (375px): o sidebar não aparece (é `hidden lg:block`), por isso a alteração não afeta o `ReportBlockTopTabs`

---

## Não fazer

- Não tocar pipeline PDF
- Não tocar geração de relatório
- Não chamar providers
- Não alterar `/report.example`
- Não introduzir cores/fontes/radii hardcoded — usar tokens existentes (`bg-content-primary`, `text-amber-300`, etc., já em uso no ficheiro)

---

## Checkpoint

- ☐ Avatar do sidebar usa proxy `/api/public/ig-thumb` com `onError` fallback
- ☐ Alt text pt-PT correto
- ☐ Botão DESBLOQUEAR abre `PremiumInterestDialog`
- ☐ Botão DESBLOQUEAR dispara `unlock_clicked` com `source_component: "sidebar_cofre"`
- ☐ Tiles de pricing disparam `pricing_option_clicked` (single_3_eur / bundle_13_eur) idempotente
- ☐ `tsc --noEmit` limpo
- ☐ `vitest run` verde
- ☐ Avatar real visível em `/analyze/<handle>` no preview