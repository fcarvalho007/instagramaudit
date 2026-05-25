
# Refinamentos UX & Interacção — /analyze

Escopo restrito a UX/interacção (sem alterar lógica de dados, sem tocar em `/report.example`, sem alterar ficheiros bloqueados). Trabalho 100 % frontend, em componentes existentes.

## Problemas identificados

1. **Navegação entre blocos sem feedback claro**
   - Sidebar tem item activo mas sem progress visual de scroll dentro do bloco.
   - Em mobile, as top tabs scrolling não centram o item activo.
2. **Botão "Voltar ao topo" inexistente** em scroll longo.
3. **Acções do hero (PDF, Partilhar) sem feedback de sucesso/erro consistente** — usam apenas `pdfBusy`/`shareBusy`, sem toast confirmando.
4. **Sidebar cofre + CTA de unlock não persistem visualmente** — quando o utilizador rola muito, perde o gancho.
5. **Insight boxes** abrem/fecham sem transição e não têm "copiar insight" — utilizadores frequentemente querem partilhar uma frase.
6. **Erro/retry** (`AnalysisErrorState`) — retry sem indicação visual; se falhar de novo, fica igual.
7. **Skeleton de loading** mostra fases mas não há `aria-live` adequado nem possibilidade de cancelar.
8. **Atalhos de teclado** inexistentes (`g 1`…`g 6` para saltar entre blocos, `?` para mostrar atalhos).
9. **Deep-link a um bloco** (`/analyze/x#performance`) não faz scroll suave na primeira carga depois de pronto.
10. **Acessibilidade**: alguns botões icon-only sem `aria-label` evidente; foco visível inconsistente entre sidebar e tabs.

## O que vai ser implementado

### A · Navegação e orientação

1. **Indicador de progresso de leitura no bloco activo**
   - Adicionar barra fina (`h-0.5`) no topo da `ReportBlockSection` activa, mostrando % de scroll dentro daquele bloco. Tokens semânticos (`bg-accent-primary/60`).
2. **Top tabs mobile com auto-center**
   - Em `ReportBlockTopTabs`, no `useActiveBlock`, fazer `scrollIntoView({ inline: "center", behavior: "smooth" })` no item activo.
3. **Botão flutuante "Voltar ao topo"**
   - Aparece após scroll > 800 px, canto inferior-direito acima da bottom nav mobile (`bottom-24 lg:bottom-6`). Foco visível, `aria-label`, animação `transition-opacity`.
4. **Deep-link por hash**
   - Em `ReportShellV2`, no mount + quando `status === "ready"`, ler `location.hash` (ex. `#performance`) e chamar `scrollToBlock(id)` com offset do sticky header.

### B · Feedback de acções

5. **Toasts consistentes nas acções do hero**
   - Em `AnalyzeReady`, envolver `shareActions.exportPdf` e `shareActions.share` com `sonner` (`toast.success("PDF pronto")`, `toast.error(...)`). Mantém comportamento, só adiciona feedback.
6. **Copiar insight**
   - Em `AIInsightBox` (componente em `src/components/report/`), botão `Copy` discreto top-right que copia o texto sanitizado para clipboard + `toast.success("Insight copiado")`.

### C · Cofre e CTA

7. **CTA "Desbloquear" sticky em mobile**
   - Quando `lockBoundary === "engagement"` e `!unlocked`, mostrar barra fina sticky no fundo em mobile (`lg:hidden`) com botão a abrir `UnlockModal`. Reaproveita `onUnlockClick`.

### D · Estados de loading e erro

8. **Skeleton acessível**
   - Adicionar `role="status"` + `aria-live="polite"` no wrapper raiz do `AnalysisSkeleton`, com texto SR-only "A analisar @{handle}, fase X de 5".
9. **Erro com tentativas**
   - Em `AnalysisErrorState`, contar tentativas locais; após 2 falhas mostrar dica adicional ("O perfil pode ser privado ou inexistente. Verifica o nome.").

### E · Atalhos de teclado

10. **Atalhos globais na página**
    - `g` seguido de `1`-`6` → scroll para o bloco N (`scrollToBlock`).
    - `t` → topo. `?` → abre um pequeno `Dialog` shadcn listando os atalhos.
    - Hook `useReportKeyboardShortcuts` em `src/components/report-redesign/v2/`. Ignorar quando o foco está em `input`/`textarea`/`contenteditable`.

### F · Acessibilidade fina

11. Auditoria rápida:
    - `aria-label` em botões icon-only do hero (`Comparar`, `PDF`, `Partilhar`) — confirmar/ajustar.
    - Ring de foco unificado: `focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base` nos botões da sidebar, tabs, e novos botões.

## Fora de scope

- Alterações visuais profundas (já cobertas em Fase A/B do plano de design anterior).
- Lógica de dados, fetch, snapshot, gating, billing.
- `/report.example`, ficheiros em `LOCKED_FILES.md`.
- i18n novo (reaproveitar `report.json`/`analyze.json` existentes; adicionar apenas as 4-6 chaves novas estritamente necessárias em pt + en).

## Ficheiros a tocar

- `src/components/report-redesign/v2/report-shell-v2.tsx` — deep-link hash, integração de atalhos, sticky CTA mobile.
- `src/components/report-redesign/v2/report-block-section.tsx` — barra de progresso interna do bloco.
- `src/components/report-redesign/v2/report-block-nav.tsx` — auto-center das top tabs.
- `src/components/report-redesign/v2/` (novo) `use-report-keyboard-shortcuts.ts`, `report-shortcut-dialog.tsx`, `back-to-top-button.tsx`, `sticky-unlock-bar.tsx`.
- `src/components/report/ai-insight-box.tsx` — botão copiar.
- `src/components/product/analysis-skeleton.tsx` — `aria-live` + texto SR.
- `src/components/product/analysis-error-state.tsx` — contador de tentativas + dica.
- `src/routes/analyze.$username.tsx` — toasts nas acções share/PDF, passar contador de retry.
- `src/i18n/locales/{pt,en}/report.json` + `analyze.json` — novas chaves (atalhos, copiar, "voltar ao topo", dica de retry).

## Regras

- Apenas tokens semânticos (`content-*`, `surface-*`, `border-*`, `accent-*`, `signal-*`).
- Sem novas dependências (usar `sonner` já presente, `Dialog` shadcn existente).
- Mobile-first, testado a 375 px.
- Copy em pt-PT correcto (Acordo 1990).
- Não tocar em componentes/ficheiros listados em `LOCKED_FILES.md` sem confirmação.

## Faseamento sugerido

- **Fase 1 (rápida, alto impacto)**: A1, A2, A3, B5, D8 — navegação + feedback básico.
- **Fase 2**: A4, B6, C7, D9 — deep-link, copiar insight, CTA sticky, retry inteligente.
- **Fase 3**: E10, F11 — atalhos e polish a11y.

Posso entregar tudo de seguida ou faseado — recomendo **tudo de uma vez** dada a baixa interdependência. Aprovo?
