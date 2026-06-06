# Plano — Barra sticky de conversão (free report)

## Estado actual

- `StickyUnlockBar` (`src/components/report-redesign/v2/sticky-unlock-bar.tsx`) já existe mas é **mobile-only**, **navy escuro** (`bg-content-primary`), pinned a `bottom-[64px]` (acima da bottom nav), e está gated por `!unlocked` — ou seja, hoje só aparece a visitantes sem lead capturado. No fluxo onboarding-first essa condição quase nunca é verdadeira.
- Wiring em `report-shell-v2.tsx` (linha 449): `{lockBoundary === "engagement" && !premiumUnlocked && !unlocked && <StickyUnlockBar />}`.
- CTA usa `usePremiumCta().handlePremiumAccessClick("sticky_unlock_bar")` — fluxo de checkout/unlock partilhado.
- Preço dinâmico disponível em `PUBLIC_PRODUCTS.report_full_9.priceLabel` (já usado em `end-of-free-block.tsx` e no novo `PremiumTeaserCard`).
- Existe um CTA final em `ReportEndOfFreeBlock` envolvido pela `<section id="lead-magnet-card">`.

## Mudanças

### 1. Redesenhar `StickyUnlockBar`
Ficheiro: `src/components/report-redesign/v2/sticky-unlock-bar.tsx` (reescrita)

- **Variantes responsive:** desktop (`hidden md:flex`) e mobile (`md:hidden`).
- **Superfície:** branca/off-white (`bg-surface-base`), borda topo subtil (`border-t border-border-default`), shadow suave para cima (`shadow-[0_-8px_24px_-12px_rgba(3,4,94,0.10)]`).
- **Position:** `fixed inset-x-0 bottom-0 z-30`, com `pb-[env(safe-area-inset-bottom)]` para iOS. Mobile sobe acima da bottom nav (`bottom-[64px]`); desktop fica colado ao fundo.

**Desktop layout:**
```
[🔒]  Faltam-te 5 secções premium                 9€ único   [Desbloquear]
      frequência, formatos, publicações-chave e prioridades
```
- Esquerda: ícone Lock em chip (`bg-surface-muted`), título Inter SemiBold + subcopy Inter Regular `text-content-secondary`.
- Meio: `priceLabel` (Inter SemiBold, tabular-nums) + "único" em `text-content-tertiary`.
- Direita: pill `bg-accent-primary text-white` "Desbloquear".
- Botão close `×` (opcional, à direita extrema) — dismiss por sessão.

**Mobile layout (uma linha compacta):**
```
[🔒] 5 secções por desbloquear        [Ver tudo]
     9€ · pagamento único
```
- Altura ~56px, sem bordas redondas pesadas, sem uppercase, sentence case.

### 2. Trigger de visibilidade
Substituir o gating `!unlocked` por **observação de scroll**.

- Hook interno usando `IntersectionObserver`:
  - **Mostrar** quando o `#engagement` deixa de estar visível por cima (i.e. user já passou da última secção free).
  - **Esconder** quando `#lead-magnet-card` (ReportEndOfFreeBlock) entra no viewport — o CTA principal está visível, sticky torna-se redundante.
- Implementação: novo hook `useStickyUnlockTrigger()` em `sticky-unlock-bar.tsx`:
  - Observa `#engagement` (rootMargin top negativo) → set `passedFree=true` quando `boundingClientRect.bottom < 0`.
  - Observa `#lead-magnet-card` → set `finalCtaVisible=true` enquanto `isIntersecting`.
  - `visible = passedFree && !finalCtaVisible && !dismissed`.
- Animação: fade + translate-y 8px → 0 em 180ms. Sem bounce.

### 3. Dismissal
- Botão `×` (aria-label "Fechar barra"). Set `dismissed` em React state (sessão actual, sem cookies/localStorage — alinha com "current session unless safe preference pattern existe", e não existe).
- Após dismiss, não reaparece nesta sessão.

### 4. Gating no shell
Ficheiro: `src/components/report-redesign/v2/report-shell-v2.tsx`

Alterar a condição (~linha 449):
```diff
- {lockBoundary === "engagement" && !premiumUnlocked && !unlocked && (
-   <StickyUnlockBar />
- )}
+ {lockBoundary === "engagement" && !premiumUnlocked && (
+   <StickyUnlockBar />
+ )}
```
- `lockBoundary === "engagement"` garante só fluxo público.
- `!premiumUnlocked` garante esconder em PRO/internal_lab.
- Variant `internal_lab` nunca define `lockBoundary="engagement"` (continua sem sticky).

### 5. Preço dinâmico
- Importar `PUBLIC_PRODUCTS` e ler `priceLabel` — texto "9€ único" / "9€ · pagamento único" é montado a partir do label, não hardcoded.

### 6. Padding inferior
Hoje o shell já tem `<div className="h-28 lg:hidden">` no fim. Adicionar variante desktop `lg:block lg:h-20` apenas quando a sticky bar estiver renderizada, para evitar tapar o footer.

## Ficheiros a editar

- `src/components/report-redesign/v2/sticky-unlock-bar.tsx` (reescrita: desktop+mobile, trigger scroll, dismiss, preço dinâmico)
- `src/components/report-redesign/v2/report-shell-v2.tsx` (uma linha — remover `!unlocked` da condição; adicionar spacer desktop)

## Fora do âmbito (não tocar)

- Pricing, checkout, EuPago, entitlements, créditos, unlock flow
- Geração de relatório, cálculos, scraping
- Schema / DB / migrations
- `report-variant.ts`, `premium-cta-context.tsx` (já tem `sticky_unlock_bar` no union)
- Lab/PRO views

## Riscos e salvaguardas

- **Risco:** sticky tapa o CTA final → mitigado por hide-when-`lead-magnet-card`-visible.
- **Risco:** preço hardcoded → usar `PUBLIC_PRODUCTS.report_full_9.priceLabel`.
- **Risco:** overflow horizontal mobile → `min-w-0`, `truncate` nas linhas de texto.
- **Risco:** safe-area iOS → `pb-[env(safe-area-inset-bottom)]`.
- **Risco:** aparecer em pro_preview/internal_lab → gating já o impede via `lockBoundary` + `!premiumUnlocked`.
- **Risco:** quebrar teste existente `premium-cta-unification.test.ts` que verifica `lockBoundary === "engagement" && !premiumUnlocked && <StickyUnlockBar`. A nova condição mantém esses dois operandos (apenas remove `!unlocked`), então o regex `[\s\S]*?` continua a match. Validar com `bunx vitest run premium-cta-unification`.

## Checklist de validação manual

Desktop + mobile, `/analyze/$username` em estado free pós-lead:
1. Sticky bar **não aparece** ao topo antes do Engagement.
2. Aparece com fade após o user passar do Engagement / entrar nos teaser cards.
3. Mantém-se visível enquanto faz scroll pelos 5 teasers.
4. Desaparece (ou faz fade out) quando o CTA final `lead-magnet-card` entra em viewport.
5. Botão "Desbloquear" / "Ver tudo" abre o mesmo `PremiumCtaProvider` (sem novo checkout).
6. Botão `×` esconde durante a sessão; não reaparece até reload.
7. Mobile: sem overflow horizontal, respeita safe-area, altura compacta (~56px).
8. Preço mostrado vem de `PUBLIC_PRODUCTS.report_full_9.priceLabel`.
9. Em `pro_preview` (premium unlocked) e `internal_lab`: sticky **não aparece**.
10. Em variante anónima sem lead: continua a funcionar (já era esse o caso, e o teste de unificação continua verde).

## Aprovação

Posso avançar com a implementação?
