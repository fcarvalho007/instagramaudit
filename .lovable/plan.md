
## Assessment

The `/app/plan` page already has the correct 3-tier cards with the right copy, badges, and "Preparado para uma fase futura" labels. Two additions are needed:

### 1. Add manifesto card to `/app/plan`

**File:** `src/routes/app.plan.tsx`

Replace the closing `<p>` with an info card:

```
<div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-5">
  <div className="flex gap-3">
    <Info icon />
    <div>
      <p>Sobre o tracking diário</p>
      <p>O tracking diário será uma funcionalidade PRO futura. Por agora, a tua conta guarda
         os relatórios solicitados e prepara a evolução para histórico contínuo. Não existem
         cobranças nem funcionalidades ativas dos planos Pro e Agency neste momento.</p>
    </div>
  </div>
</div>
```

### 2. Enhance empty state in `/app/reports` with PRO teaser

**File:** `src/routes/app.reports.tsx`

After the existing empty state card, add a subtle upsell card:

- Icon: Sparkles
- Title: "Tracking contínuo — disponível em breve"
- Body: "Os planos Pro e Agency vão incluir tracking diário, evolução temporal e alertas de crescimento. A tua conta está preparada para quando ativares."
- Link to `/app/plan`: "Ver planos"
- Style: dashed border, muted colors, no fake CTA

### Files changed
- `src/routes/app.plan.tsx` — add manifesto info card, import `Info` icon
- `src/routes/app.reports.tsx` — add PRO teaser below empty state, import `Sparkles` and `Link`

No backend, no cron, no new tables, no costs.
