# Auditoria — CTA premium sticky no mobile (pre-lead)

## Resultado

**Não é necessário alterar código.** O bug original já foi corrigido numa iteração anterior. A `StickyUnlockBar` ("3 secções premium…" + "DESBLOQUEAR") **só renderiza depois da captura do lead**.

## Evidência

`src/components/report-redesign/v2/report-shell-v2.tsx` (linhas 461–465):

```tsx
{/* Sticky premium CTA: only after lead capture (post-unlock).
    Pre-lead the lead-magnet card is the single primary CTA. */}
{unlocked && lockBoundary === "engagement" && (
  <StickyUnlockBar onClick={handleUnlockClick} />
)}
```

## Como o estado pre-lead vs post-lead é determinado

- `src/routes/analyze.$username.tsx` (linha 346): `unlocked` é estado React inicializado a partir de `sessionStorage["ib_unlock:<snapshotId>"]`.
- O flag passa a `"1"` apenas após o submit bem-sucedido do modal de lead magnet (`unlock-flow.ts` / `unlock-modal.tsx`).
- Pre-lead: `unlocked === false` → `StickyUnlockBar` **não monta**.
- Post-lead: `unlocked === true` → barra aparece com "DESBLOQUEAR" (esperado).

## Outros elementos fixos no mobile (não são CTAs premium)

- `report-block-nav.tsx` linha 625: `fixed bottom-0` é a **barra de tabs de navegação** (ícones das secções 1–6 + menu). Não menciona preço, pack, premium nem "desbloquear". É navegação interna — pode permanecer.
- Spacer inferior: `<div className="h-28 lg:hidden" />` (linha 457) garante 112 px acima da bottom-nav de 64 px, suficiente em 360/390/414.
- `BackToTopButton` — botão flutuante neutro, sem copy comercial.

## Validação a executar (apenas leitura/preview, sem edits)

1. `bunx tsc --noEmit` — confirmar baseline limpa.
2. Preview `/analyze/frederico.m.carvalho` a 360×800, 390×844, 414×896 com sessionStorage vazio:
   - confirmar que **só** o lead-magnet card azul aparece como CTA dominante;
   - confirmar ausência de "DESBLOQUEAR" e de "secções premium";
   - confirmar respiro entre o card e a bottom-nav.
3. Forçar `sessionStorage.setItem("ib_unlock:<id>", "1")` + reload → confirmar que aí sim a `StickyUnlockBar` aparece (comportamento esperado post-lead).
4. Desktop quick check em ≥ 1024 px → `lg:hidden` esconde tanto a bottom-nav como a sticky bar.

## Checkpoint

- ☐ `bunx tsc --noEmit` verde
- ☐ 360 / 390 / 414 — só lead magnet card visível pre-lead
- ☐ Nenhum "DESBLOQUEAR" / "secções premium" / preço pre-lead
- ☐ Post-lead: sticky bar reaparece normalmente
- ☐ Desktop: sem regressões

## Ficheiros que seriam alterados

Nenhum. Caso a validação visual revele que a barra ainda aparece pre-lead (não esperado dado o código atual), o fix one-liner seria já o que está em vigor — nesse caso investigaria se `unlocked` está a ser inicializado incorretamente (ex.: chave `ib_unlock_preview` legada ainda a `"1"` na sessão do utilizador).
