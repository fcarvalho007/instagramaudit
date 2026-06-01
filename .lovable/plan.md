## Objectivo

Mostrar no relatório público gratuito um seletor de "Período analisado" visível mas bloqueado (teaser premium), e corrigir a contradição actual no header — o grátis é uma **amostra de 12 publicações**; os "X dias" são uma **consequência observada**, não uma janela escolhida.

Sem alterações a dados, scoring, Apify, OpenAI, DataForSEO, cache, pricing, PDF, e-mail ou onboarding.

---

## 1. Corrigir o header (`report-hero-v2.tsx`)

Hoje `MetricLine` mostra `10,1 mil seguidores · 2,6 mil publicações · 12 posts em 30 dias`. Vamos passar a mostrar apenas:

`10,1 mil seguidores · 2,6 mil publicações · 12 publicações analisadas`

- Remover o uso de `hero.metric_analyzed_window*` no header (ficam só na methodology line / outros sítios que já os usem — confirmar que `methodology-line.test.ts` continua verde; é noutro componente).
- Usar sempre `hero.metric_analyzed` / `hero.metric_analyzed_one`, com cópia revista:
  - PT: `publicações analisadas` / `publicação analisada`
  - EN: `posts analyzed` / `post analyzed`
- Os "X dias" passam para o **seletor**, como label metodológico (`período observado: X dias`), calculado a partir de `result.coverage.windowDays` (já existe; é `ceil(newest − oldest)`).

Não tocar no `MethodologyLine` nem em outros componentes que já mostrem `windowDays` corretamente — só remover a duplicação do header.

---

## 2. Novo componente `analysis-period-selector.tsx`

Ficheiro: `src/components/report-redesign/v2/analysis-period-selector.tsx`.

Props:
- `observedDays: number` (de `result.coverage.windowDays`)
- `onUnlockClick?: () => void` (reutiliza o handler já existente; fallback: abrir `PremiumInterestDialog` localmente — mesmo padrão usado noutros teasers)

Layout (mobile-first, tokens existentes, sem cores hardcoded):

```text
┌──────────────────────────────────────────────────────────────┐
│ 📅 PERÍODO ANALISADO          Amostra grátis · período       │
│                               observado: 30 dias             │
│                                                              │
│ [✓ Últimas 12 publicações] [30 dias 🔒] [60 dias 🔒]          │
│ [90 dias 🔒] [365 dias 🔒]                                    │
│                                                              │
│ A versão gratuita usa uma amostra recente. Janelas maiores   │
│ ficam disponíveis no relatório premium.                      │
└──────────────────────────────────────────────────────────────┘
```

- Card branco, borda `border-default`, radius alinhado com `report-hero-v2`.
- Eyebrow Inter uppercase (`text-eyebrow-sm`), conforme regra do projeto.
- Chip activo: sólido `bg-content-primary text-white`, com check.
- Chips bloqueados: `bg-surface-muted`, `text-content-tertiary`, ícone `Lock` (lucide), `cursor-pointer`, `aria-disabled="true"`.
- Mobile (<640px): chips em scroll horizontal (`flex overflow-x-auto`, sem barra visível), eyebrow e badge "período observado" empilham.
- Toda a copy via i18n; nada hardcoded.

Interação dos chips bloqueados:
- Hover/click abre `Popover` (shadcn já no projeto) com:
  - Title: `selector.locked.title`
  - Body: `selector.locked.body`
  - CTA primário "Ver opções de acesso" → chama `onUnlockClick` (que abre o fluxo premium existente). Se `onUnlockClick` não estiver disponível (rota `/reports/:snapshotId`), abre `PremiumInterestDialog` local — mesma cópia, mesmo `pricing-interest-modal`.
  - Secundário "Continuar com visão gratuita" → fecha o popover.
- **Não muta nada**: sem `navigate`, sem alterar query params, sem fetch, sem snapshot diff, sem tracking de window change. Só emite `pricing_option_clicked` / equivalente se o handler partilhado já o fizer.

Acessibilidade:
- Cada chip bloqueado é `<button type="button" aria-disabled="true" aria-label="30 dias — disponível no premium">`.
- Popover com `role="dialog"` e foco devolvido ao chip ao fechar.

---

## 3. Mount no `report-shell-v2.tsx`

Inserir o seletor **entre o `ReportHeroV2` e o `ReportBlockTopTabs`** (linha ~182), dentro de um `section className="bg-surface-base"` e do mesmo container `max-w-[1520px] px-5 md:px-6` para alinhar com o hero. Passar `onUnlockClick={handleUnlockClick}` (já existe, default no-op).

`observedDays = result.coverage.windowDays ?? 0`. Se for 0, esconder o badge "período observado" mas manter o seletor.

---

## 4. i18n

Adicionar em `src/i18n/locales/{pt,en}/report.json` sob nova chave `selector`:

PT:
```json
"selector": {
  "eyebrow": "Período analisado",
  "observed_badge": "Amostra grátis · período observado: {{days}} dias",
  "observed_badge_one": "Amostra grátis · período observado: {{days}} dia",
  "active_sample": "Últimas {{count}} publicações",
  "premium_30": "30 dias",
  "premium_60": "60 dias",
  "premium_90": "90 dias",
  "premium_365": "365 dias",
  "footnote": "A versão gratuita usa uma amostra recente. Janelas maiores ficam disponíveis no relatório premium.",
  "locked": {
    "title": "Disponível no relatório premium",
    "body": "Analisa mais histórico para perceber evolução, consistência e padrões de conteúdo ao longo do tempo.",
    "cta": "Ver opções de acesso",
    "secondary": "Continuar com visão gratuita",
    "aria": "{{window}} — disponível no premium"
  }
}
```

EN: equivalente, mantendo as mesmas chaves; "days" / "day", "Latest {{count}} posts", "Available in the premium report", "Analyze more history…", "View access options", "Continue with free overview".

Ajustar também `hero.metric_analyzed` → "publicações analisadas" / "posts analyzed" (já é o fallback usado quando `windowDays === 0`; passa a ser o valor sempre usado no header).

---

## 5. Consistência sidebar

Confirmar que a sidebar diz "5 secções premium por desbloquear" (ou número actual baseado em `features`) e que o seletor mostra **4 janelas premium** (30/60/90/365) — são contagens semanticamente distintas (secções vs janelas temporais), não há ligação. Se for preciso desambiguar, refinar a cópia da sidebar para `"5 secções por desbloquear"` em vez de `"5 por desbloquear"` — só se já estiver ambíguo; não inventar copy nova fora deste plano.

---

## 6. Validação

- `bunx tsc --noEmit`.
- Visual desktop (1460px) e mobile (375px) na rota `/report/example` (mock) e `/reports/:snapshotId` (real).
- Confirmar:
  - Header mostra "X publicações analisadas" sem "em N dias".
  - Seletor visível entre header e Bloco 01.
  - Chip activo: "Últimas 12 publicações".
  - 4 chips bloqueados com cadeado abrem popover; CTA chama o mesmo handler premium dos outros teasers.
  - "período observado: X dias" usa valor real de `coverage.windowDays`.
  - Zero chamadas de rede ao clicar.
  - `methodology-line.test.ts` e restantes testes continuam verdes.

---

## Ficheiros afectados

- `src/components/report-redesign/v2/analysis-period-selector.tsx` (novo)
- `src/components/report-redesign/v2/report-hero-v2.tsx` (simplificar MetricLine)
- `src/components/report-redesign/v2/report-shell-v2.tsx` (mount)
- `src/i18n/locales/pt/report.json`, `src/i18n/locales/en/report.json`

## Fora de âmbito

Geração real de janelas 30/60/90/365, mudanças em `analyze-public-v1`, scoring, cache, pricing, checkout, PDF, e-mail, onboarding, Apify, OpenAI, DataForSEO.

## Riscos / follow-up

- Quando as janelas premium reais forem activadas, o seletor passa a ter estados activos verdadeiros — precisará de `onSelectWindow` + nova query param e snapshots por janela. Não nesta fase.
- Confirmar com o utilizador se quer que o `MethodologyLine` (outro componente) continue a referir "N dias" — não é tocado neste plano.
