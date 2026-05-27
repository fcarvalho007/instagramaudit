## Causa raiz da duplicação

No estado `gated && !unlocked` o `report-shell-v2.tsx` renderiza **duas** unidades visuais com a mesma mensagem:

1. **Bloco branco no topo** — `<ReportLeadMagnetCard />` em `src/components/report-redesign/v2/report-shell-v2.tsx:235-237`.
   Card `bg-surface-secondary`, título `nav.lead_magnet.title` = *"Continua a leitura gratuita do relatório"*, CTA *"Ver relatório gratuito"*.

2. **Card azul/translúcido mais abaixo** — `<ReportLockGate />` em `src/components/product/report-lock-gate.tsx`.
   Card `bg-surface-card/95` com `backdrop-blur-xl` + halo prismático azul/secundário, título `lockGate.title` (*"Continua a leitura gratuita do relatório de @handle"*), CTA `lockGate.cta` = *"Ver relatório gratuito →"*.

Ambos chamam o mesmo `handleUnlockClick`. Resultado: duas chamadas competindo, ruído visual, e a mesma promessa repetida.

## O que muda

**Fonte única de verdade do CTA pre-lead:** `ReportLockGate` (o card azul/translúcido sobre o conteúdo blur).

### 1. `src/components/report-redesign/v2/report-shell-v2.tsx`

- Remover o bloco condicional que renderiza `<ReportLeadMagnetCard />` (linhas 231-237) e o respetivo `import` no topo (linha 46).
- Passar `id="lead-magnet-card"` ao `<ReportLockGate>` para que o anchor já existente continue a funcionar (sidebar `focusLeadMagnet`).

### 2. `src/components/product/report-lock-gate.tsx`

Subir ligeiramente o card overlay para que apareça mais cedo no fluxo de leitura, mantendo o sticky:

- `top-24 mt-24 md:mt-32` → `top-20 mt-10 md:mt-14`

Sem outras alterações ao card (badge, título, halo, CTA, footer micro-tags mantêm-se).

### 3. `src/components/report-redesign/v2/report-lead-magnet-card.tsx`

Ficheiro deixa de ter consumidores. Eliminar para evitar dead code e prevenir reintrodução.

### 4. Sidebar (`report-block-nav.tsx`)

Sem alteração de código. O `focusLeadMagnet` faz `getElementById("lead-magnet-card")` → passa a apanhar o `ReportLockGate` (mesmo id), scroll continua a funcionar. Fallback `onUnlockClick` mantém-se.

### Intocado

- Lógica do `UnlockModal`, sessionStorage `ib_unlock:${snapshotId}`, `handleUnlockClick`, `/api/public/report-unlock`.
- `ContinueReadingCard` na sidebar (variante pre-lead do card premium) — não é o CTA principal, é navegação contextual da sidebar.
- Preços, provider, emails, premium access.
- i18n keys `nav.lead_magnet.*` ficam órfãs mas mantenho-as no JSON (não são chaves locked e não afetam o build).

## Validação

- `bunx tsc --noEmit`
- Preview desktop em `/analyze/<handle>` em estado pre-lead: confirmar **apenas um** card CTA (o azul/translúcido) entre o final do Bloco 1 e o conteúdo blur.
- Preview mobile 390×844: idem, card ocupa `calc(100% - 32px)` como já hoje, sem o bloco branco acima.
- Confirmar que clicar em *"Continuar leitura gratuita"* na sidebar faz scroll até ao card azul (anchor `#lead-magnet-card` agora aponta para o `ReportLockGate`).

## Ficheiros tocados

- `src/components/report-redesign/v2/report-shell-v2.tsx` — remover render + import; adicionar `id` ao `ReportLockGate`.
- `src/components/product/report-lock-gate.tsx` — ajustar `top-*` / `mt-*` do card overlay.
- `src/components/report-redesign/v2/report-lead-magnet-card.tsx` — eliminar.
