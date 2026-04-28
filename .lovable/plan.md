# Beta launch positioning + soft conversion no relatório público

Durante a fase beta, o relatório público de `/analyze/$username` deve comunicar com clareza que está em modo gratuito alargado e que algumas funcionalidades poderão integrar uma futura versão Pro — sem bloquear secções nem introduzir billing.

## O que vai ser construído

1. **Tira beta** logo abaixo da `TierStrip`, com eyebrow, título, corpo e tom editorial calmo (sem linguagem de paywall).
2. **Bloco final de feedback/conversão**, depois do `TierComparisonBlock`, com três ações e nota de fecho.
3. **Copy centralizado** num único ficheiro (pt-PT, Acordo pós-90).
4. **Sem alterações** a `/report/example`, providers, cache, custos ou admin.

## Ficheiros a criar

### `src/components/report-beta/beta-copy.ts`
Fonte única de verdade para os textos:

```ts
export const BETA_COPY = {
  strip: {
    eyebrow: "Acesso beta gratuito",
    title: "Relatório completo disponível durante a fase beta",
    body: "Durante o lançamento, este relatório mostra uma leitura alargada sem pagamento. No futuro, algumas análises avançadas — concorrentes, pesquisa, recomendações e exportação — poderão fazer parte da versão Pro.",
  },
  feedback: {
    title: "Este relatório foi útil?",
    subtitle:
      "O InstaBench está em fase beta. O teu feedback ajuda-nos a tornar a análise mais útil para marcas, criadores e equipas de marketing.",
    actions: {
      feedback: { label: "Dar feedback", href: "#" },
      pro: { label: "Quero acesso Pro", href: "#" },
      share: { label: "Partilhar no LinkedIn" },
    },
    note: "Sem compromisso. O objetivo é melhorar o produto com utilizadores reais.",
  },
} as const;
```

### `src/components/report-beta/beta-strip.tsx`
- Card editorial com `rounded-2xl border border-border-subtle/40 bg-surface-secondary/60`, padding consistente com `TierStrip`.
- Eyebrow em `font-mono` uppercase, título em `font-display`, body em `text-content-secondary`.
- Apenas tokens existentes; sem cores hardcoded.
- Mobile-first (stack natural, sem media queries específicas).

### `src/components/report-beta/beta-feedback-block.tsx`
- Recebe `reportUrl?: string` opcional. Em runtime, calcula a URL atual com `typeof window !== "undefined" ? window.location.href : ""` (componente client; `/analyze/$username` já é `ssr: false`).
- Estrutura:
  - Título `font-display` + subtítulo `text-content-secondary`.
  - Linha de 3 botões (`flex flex-col sm:flex-row gap-3`):
    1. **Dar feedback** → `<a href="#">` estilo botão primário (mesma linguagem visual do CTA do `TierComparisonBlock`: pill com `border-accent-primary/40`).
    2. **Quero acesso Pro** → `<a href="#">` estilo idêntico ao primário.
    3. **Partilhar no LinkedIn** → `<a target="_blank" rel="noopener noreferrer">` para `https://www.linkedin.com/sharing/share-offsite/?url={encodeURIComponent(reportUrl)}`. Variante secundária (border subtil).
  - Nota final em `font-mono text-[11px] uppercase tracking-[0.16em] text-content-tertiary`.
- Tom editorial; sem agressividade.

## Ficheiro a editar

### `src/routes/analyze.$username.tsx`
- Importar `BetaStrip` e `BetaFeedbackBlock`.
- Inserir `<BetaStrip />` imediatamente abaixo de `<TierStrip />`.
- Inserir `<BetaFeedbackBlock />` depois de `<TierComparisonBlock />`.
- Sem outras alterações estruturais.

## Fora de âmbito (intocado)

- `/report/example` e qualquer ficheiro `report-*` interno.
- Providers (Apify, DataForSEO, OpenAI), cache, market-signals, ledger de custos, admin.
- Geração de PDF, email, autenticação.
- Tokens de design (`tokens.css`, `tokens-light.css`).

## Validação final

- `bunx tsc --noEmit`
- `bun run build`
- Confirmar visualmente que `/report/example` continua sem strip beta nem bloco de feedback.
- Confirmar que nenhum endpoint de provider foi tocado (apenas componentes UI + 1 rota editada).

## Checkpoint

- ☐ `src/components/report-beta/beta-copy.ts` criado com copy pt-PT
- ☐ `src/components/report-beta/beta-strip.tsx` criado, usa apenas tokens
- ☐ `src/components/report-beta/beta-feedback-block.tsx` criado, share LinkedIn funcional
- ☐ `src/routes/analyze.$username.tsx` integra ambos os componentes nas posições corretas
- ☐ `/report/example` inalterado
- ☐ `bunx tsc --noEmit` passa
- ☐ `bun run build` passa
- ☐ Sem chamadas a Apify, DataForSEO, OpenAI, PDF ou email
