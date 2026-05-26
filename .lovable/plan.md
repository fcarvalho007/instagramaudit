## Contexto

`app_config.free_monthly_report_limit` passou de **2 → 3** (já atualizado no backend, em `FREE_MONTHLY_LIMIT` e em `PUBLIC_APP_CONFIG_DEFAULTS.freeMonthlyReportLimit`). Mensagem de erro do `/api/request-full-report` já interpola `${limit}` dinâmico, logo está correta.

Falta atualizar o único sítio público que ainda mostra **2**: a nota manuscrita no hero da homepage. Outras peças (pricing, footer, FAQ, lock-gate, termos, privacidade) não referem número de relatórios grátis — não tocar.

## Auditoria (o que NÃO muda)

- `pricing.json` — fala de 1 relatório / pack 5 (preço pago). Sem referência ao gratuito mensal.
- `report-lock-gate.tsx` / `gate.json` — fala em "leitura gratuita", sem número.
- `errors.json` `BUDGET_EXCEEDED` — genérico, sem número.
- `termos.tsx` / `privacidade.tsx` — falam de "quota mensal gratuita" sem fixar valor.
- `request-full-report.ts` — já usa `${limit}` interpolado dinâmico.
- Admin (`mock-data.ts`, `intent-section.tsx`, etc.) — números não relacionados (perfis com ≥2 análises, etc.). Não tocar.

## Mudança única

**`src/components/landing/handwritten-note.tsx`** (linha 48)

Atualmente:
```tsx
<AnimatedCounter to={2} delayMs={2100} durationMs={600} />
```

Passa a ler do `usePublicAppConfig()` (já existente, usado no footer e no report-hero), evitando novo hardcode:
```tsx
const { freeMonthlyReportLimit } = usePublicAppConfig();
…
<AnimatedCounter to={freeMonthlyReportLimit} delayMs={2100} durationMs={600} />
```

Vantagens:
- Renderiza **3** automaticamente (valor atual do `app_config`).
- Qualquer alteração futura na BD reflete-se na homepage sem mexer em código.
- Mantém o fallback de defaults (`PUBLIC_APP_CONFIG_DEFAULTS.freeMonthlyReportLimit = 3`) para SSR/loader sem rede.

Plural: o sufixo "relatórios grátis" funciona com 3 (e com 2). Para 1, ficaria "1 relatórios grátis" — caso futuro hipotético, fora de scope.

## Validação

- Abrir `/` no preview e confirmar que o contador anima até **3**.
- `bunx tsc --noEmit` (mudança de tipos é nula — `freeMonthlyReportLimit: number`).

## Checklist

☐ `handwritten-note.tsx`: importar `usePublicAppConfig` e substituir `to={2}` por `to={freeMonthlyReportLimit}`
☐ Verificar visualmente em `/` (viewport 1460 e 375)
