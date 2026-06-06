## Plan: Sincronizar admin preview com produção (sticky bar + lock teasers)

### Causa raiz

A barra sticky e o teaser inline de "boundary" do plano free são renderizados pelo `ReportShellV2` apenas quando recebe a prop `lockBoundary="engagement"`:

- `src/components/report-redesign/v2/report-shell-v2.tsx:233` — inline teaser
- `src/components/report-redesign/v2/report-shell-v2.tsx:408` — `<StickyUnlockBar />`

A rota pública `/analyze/$username` passa `lockBoundary="engagement"` (linha 445). A rota admin `/admin/report-preview/$username` (`src/routes/admin_.report-preview.$username.tsx`) **NÃO** passa essa prop, por isso o preview em ecrã completo do admin não mostra a sticky bar mesmo com `variant=public_mvp`.

### Alteração

**Ficheiro:** `src/routes/admin_.report-preview.$username.tsx`

No `<ReportShellV2 ... />` (linhas 197–208), passar `lockBoundary` derivado da variante, de modo a espelhar exactamente o gating de produção:

```tsx
lockBoundary={variant === "public_mvp" ? "engagement" : null}
```

Mantém:
- `premiumUnlocked={variant !== "public_mvp"}` (já correcto)
- `unlocked={variant !== "public_mvp"}` (já correcto)
- Toda a lógica de fetch, gate admin, exit pill, lab banner — intocada.

A condição de mount da sticky bar dentro do shell (`lockBoundary === "engagement" && !premiumUnlocked`) passa a ser verdadeira em `public_mvp`, igual a produção. Em `pro_preview` e `internal_lab` continua escondida (como já é).

### Fora de scope

- `src/routes/admin_.report-preview.snapshot.$snapshotId.tsx` — esta rota é hard-coded a `variant="internal_lab"` + `premiumUnlocked`/`unlocked` → não devia mostrar sticky bar. Não mexer.
- Sem alterações a `ReportShellV2`, à `StickyUnlockBar`, a payloads, a entitlements ou a qualquer lógica de pagamento/gate.
- Sem alterações de copy.

### Validação manual

1. Abrir `/admin/report-preview/frederico.m.carvalho?variant=public_mvp&draft=false` → ao passar do Engagement para o teaser `#frequencia`, a sticky bar aparece (igual a produção `/analyze/frederico.m.carvalho`).
2. Abrir mesma URL com `variant=pro_preview` → sticky bar NÃO aparece.
3. Abrir mesma URL com `variant=internal_lab` → sticky bar NÃO aparece; banner amarelo do Lab continua.
4. `/admin/report-preview/snapshot/<id>` continua sem sticky bar (intencional, full Lab).
5. Sem regressões em `/analyze/$username`.

### Output esperado

- Ficheiros alterados: `src/routes/admin_.report-preview.$username.tsx` (1 linha adicionada na prop list).
- Confirmação de que nenhuma lógica de gating, entitlements, fetch ou pagamento foi tocada.