# Ações de partilha do relatório público

Adicionar um grupo compacto de ações de partilha em `/analyze/$username`, presente no topo (logo abaixo da `BetaStrip`) e no fim (junto ao `BetaFeedbackBlock`). Sem billing, sem PDF real, sem providers.

## Nota sobre ficheiros locked

`__root.tsx` e `app-shell.tsx` estão **locked**, portanto o `<Toaster />` da Sonner **não pode ser montado globalmente**. Solução: montar o `<Toaster />` localmente dentro de `/analyze/$username` (rota não locked). Os toasts ficam disponíveis apenas nesta rota — exatamente onde precisamos.

## Ficheiros a criar

### `src/components/report-share/share-copy.ts`
Copy pt-PT centralizado:

```ts
export const SHARE_COPY = {
  eyebrow: "Partilhar relatório",
  actions: {
    copy: { label: "Copiar link", labelDone: "Link copiado" },
    linkedin: { label: "Partilhar no LinkedIn" },
    pdf: { label: "Pedir versão PDF", note: "Em breve" },
  },
  toast: {
    success: "Link copiado para a área de transferência.",
    error: "Não foi possível copiar o link. Copia manualmente da barra do navegador.",
  },
} as const;
```

### `src/components/report-share/report-share-actions.tsx`
Componente reutilizável com três botões em linha (mobile-first stack vertical em `<sm`):

- **Copiar link** — chama `navigator.clipboard.writeText(url)`. Em sucesso, mostra `toast.success(SHARE_COPY.toast.success)` + flip temporário do label para "Link copiado" durante 2s. Em falha (HTTPS/permissão), `toast.error(...)`.
- **Partilhar no LinkedIn** — `<a target="_blank" rel="noopener noreferrer">` para `https://www.linkedin.com/sharing/share-offsite/?url={encoded}`.
- **Pedir versão PDF** — `<button disabled>` com badge "Em breve" e cursor `not-allowed`. Não chama nada.

Props: `{ variant?: "compact" | "default" }` para permitir versão mais densa no topo (sem eyebrow visível ou só com texto inline) e completa no fim. URL resolvida em runtime via `window.location.href` (rota é `ssr: false`).

Visual: pills com `border-border-subtle/60` para o secundário, `border-accent-primary/40 text-accent-primary` para o primário (Copiar). Tokens existentes apenas. Ícones `lucide-react` (`Link2`, `Linkedin`, `FileDown`, `Check`).

## Ficheiro a editar

### `src/routes/analyze.$username.tsx`
- Importar `Toaster` de `@/components/ui/sonner` e montá-lo dentro do `<ReportThemeWrapper>` (uma só vez, no fundo da árvore para não interferir com layout).
- Importar `ReportShareActions` e inserir:
  - **Topo**: imediatamente após `<BetaStrip />` e antes do `<ReportEnrichedBio />`, variant `compact`.
  - **Fim**: imediatamente após `<TierComparisonBlock />` e antes do `<BetaFeedbackBlock />`, variant `default`.

## Fora de âmbito (intocado)

- `/report/example` e todos os componentes locked.
- `__root.tsx`, `app-shell.tsx` (Toaster montado localmente).
- `BetaFeedbackBlock` mantém o seu próprio botão LinkedIn — não duplico nem removo. As novas ações são uma camada paralela, mais explícita.
- Providers (Apify, DataForSEO, OpenAI), cache, custos, admin.
- PDF real, email, billing.

## Decisão sobre PDF (para a próxima task)

Concordo com a tua sugestão: **versão própria para A4** (`@react-pdf/renderer` ou similar via edge function), não exportação do layout web. O layout actual usa charts SVG, gradientes, sticky headers e larguras fluídas que não traduzem bem para A4 portrait. Quando avançarmos com PDF, proponho:

- Documento A4 em 3-4 páginas: capa (perfil + KPIs), benchmark + format breakdown, top posts + heatmap, recomendações.
- Tipografia Fraunces/Inter embebida.
- Sem charts interativos — gráficos renderizados como SVG estático.
- Cache no Storage por `snapshotId` (igual à lógica do market-signals).

## Validação

- `bunx tsc --noEmit`
- `bun run build`
- "Copiar link" copia e dispara toast.
- "Partilhar no LinkedIn" abre o share intent correto numa nova janela.
- `/report/example` continua intocado.
- Sem chamadas a Apify, DataForSEO, OpenAI, PDF ou email.

## Checkpoint

- ☐ `src/components/report-share/share-copy.ts` criado (pt-PT)
- ☐ `src/components/report-share/report-share-actions.tsx` criado, copy + LinkedIn + PDF disabled
- ☐ `<Toaster />` montado localmente em `analyze.$username.tsx`
- ☐ `ReportShareActions` inserido no topo (compact) e no fim (default)
- ☐ `bunx tsc --noEmit` passa
- ☐ `bun run build` passa
- ☐ `/report/example` inalterado
- ☐ Sem chamadas a providers
