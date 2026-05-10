## Fase 2 — Lock visual do relatório público (UI only)

### Objetivo

Aplicar overlay frosted no relatório público a partir do card de engagement, com CTA central e modal de Passo 1 (email). Sem backend, sem persistência, sem rede. Estado de unlock vive em `useState` local + `sessionStorage` (chave `ib_unlock_preview`) só para conveniência durante teste manual.

### Boundary confirmado

A barreira começa **antes do `<ReportBenchmarkGauge>`** (componente "Posicionamento face ao benchmark", que renderiza a Taxa de Engagement vs benchmark). Permanecem 100% visíveis: `ReportHeader`, `ReportKeyMetrics` (já mostra o KPI "Envolvimento médio"), `AIInsightBox` hero, `ReportTemporalChart`, `AIInsightBox` temporal e `AIInsightBox` market signals.

### Ficheiros novos

1. **`src/components/product/report-lock-gate.tsx`**
   - Wrapper que recebe `children` e `unlocked: boolean`.
   - Quando bloqueado: envolve `children` num `<div aria-hidden="true">` com `filter: blur(10px) saturate(0.85)`, `pointer-events: none`, `user-select: none`, altura mínima preservada (sem colapsar). Por cima, gradiente vertical `from-transparent via-surface-base/70 to-surface-base` que vai escurecendo o conteúdo bloqueado para cima do gauge.
   - Sobreposto: card flutuante centrado (`sticky top-24` em desktop, `fixed bottom-4 inset-x-4` em mobile? — não, mantemos absolute centered acima do conteúdo blurred via `relative + absolute`) com:
     - Eyebrow Inter uppercase: "Análise completa"
     - H2 Fraunces: "Desbloquear análise completa"
     - Parágrafo Inter: "Já preparámos o resto do relatório. Indica o email e responde a algumas perguntas rápidas para aceder à análise completa."
     - 3 bullets de benefício com `Lock`/`Sparkles`/`BarChart3` (lucide): "Comparação com benchmark do teu escalão", "Análise por formato e melhores horários", "Insights AI personalizados".
     - Botão primário (token `--primary`, full-width em mobile): "Desbloquear relatório gratuito".
     - Microcopy `text-xs text-content-tertiary`: "Acesso gratuito durante a beta · demora cerca de 1 minuto".
   - Quando desbloqueado: renderiza `children` puro sem wrapper.

2. **`src/components/product/unlock-modal.tsx`**
   - Usa `Dialog` (shadcn) em desktop, comportamento responsivo.
   - Header com `DialogTitle` "Passo 1 de 5 · O teu email" e `DialogDescription` "Vamos guardar o teu relatório para acesso futuro.".
   - Form com `<Input type="email" required>` (label "Email", placeholder "ana@empresa.pt"), validação inline mínima (HTML5 `type=email` + zod opcional).
   - Botão "Continuar" full-width.
   - Reassurance footer: ícone `ShieldCheck` + "Usamos o teu email só para enviar o relatório e aceder à área pessoal. Sem spam.".
   - `onSubmit`: NÃO faz fetch. Chama `onUnlock()` prop (placeholder dos passos 2-5 fica como TODO comentado) e fecha. No body do form um aviso visual discreto "Pré-visualização — passos 2 a 5 chegam na próxima fase." só visível em dev (`import.meta.env.DEV`).

### Ficheiros tocados

3. **`src/components/report/report-page.tsx`**
   - Aceitar nova prop opcional `lockBoundary?: "benchmark" | null` (default `null` mantém comportamento atual; o `/report.example` e `/admin/report-preview` ficam intactos).
   - Aceitar `unlocked?: boolean` e `onUnlockClick?: () => void`.
   - Quando `lockBoundary === "benchmark"`, agrupa tudo a partir de `<ReportBenchmarkGauge>` dentro de `<ReportLockGate unlocked={unlocked} onUnlockClick={...}>...</ReportLockGate>`.

4. **`src/routes/analyze.$username.tsx`**
   - Importar `useState`, `useEffect`, `UnlockModal`.
   - `const [unlocked, setUnlocked] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("ib_unlock_preview") === "1");`
   - `const [modalOpen, setModalOpen] = useState(false);`
   - Passar `lockBoundary="benchmark"`, `unlocked`, `onUnlockClick={() => setModalOpen(true)}` ao `<ReportPage>`.
   - Render `<UnlockModal open={modalOpen} onOpenChange={setModalOpen} onUnlock={() => { sessionStorage.setItem("ib_unlock_preview","1"); setUnlocked(true); setModalOpen(false); }} />`.

### Detalhes de design (tokens, sem hardcode)

- Blur: `backdrop-filter` no overlay degradê + `filter: blur(10px)` nos `children`. Usar classes utilitárias Tailwind (`blur-[10px]`) só se ficar legível; senão `style={{ filter: "blur(10px) saturate(0.85)" }}`.
- Card CTA: `bg-surface-card`, `border border-border-default`, `rounded-2xl`, `shadow-card-hover`, `p-6 md:p-8`, `max-w-md`, centrado horizontalmente, posicionado a uns 120-160px do topo da zona bloqueada (sticky no scroll dentro do bloco).
- Tipografia: H2 com `font-fraunces text-2xl md:text-3xl` (única ocorrência editorial). Restante Inter.
- Cores: `text-content-primary`, `text-content-secondary`, `text-content-tertiary`. Botão usa variante `default` do shadcn que já mapeia para `--primary`.
- Bullets: ícones `text-primary`, fundos `bg-surface-muted` em mini-pills.
- Mobile: card ocupa `calc(100% - 32px)` com 16px de margem; botão `w-full`; bullets em coluna.

### Estado local de unlock

- Sem cookies, sem rede, sem Supabase.
- `sessionStorage.ib_unlock_preview = "1"` permite testar a remoção do blur e sobrevive a reload na mesma aba (útil para QA), mas não persiste entre sessões.
- Botão dev-only no `<ReportLockGate>` (visível só em `import.meta.env.DEV`): "Reset preview unlock" no canto inferior direito a chamar `sessionStorage.removeItem("ib_unlock_preview"); location.reload();`. Facilita teste, não chega a produção.

### Acessibilidade

- Conteúdo bloqueado tem `aria-hidden="true"` e `inert` (atributo) para screen readers e tab focus saltarem o blur.
- Card CTA é `role="region" aria-label="Desbloquear relatório completo"`.
- Modal: foco automático no input email, `Escape` fecha.

### Não tocar

- `/report.example` (mockup intocável).
- `/admin/report-preview/*` (passa `lockBoundary={null}` implicitamente — não muda nada).
- `report-gate-modal.tsx` antigo (será deprecado mais tarde).
- Cálculo, dados, providers, schema, PDF.

### Validação

- `bunx tsc --noEmit` — 0 erros.
- `bunx vitest run` — todos os testes passam (não adiciono testes nesta fase, mas não quebro existentes).
- Manual em viewport 411×742:
  - `/analyze/frederico.m.carvalho` carrega.
  - Header + 5 KPIs + chart temporal + 2 insights visíveis e nítidos.
  - Gauge de benchmark e tudo abaixo aparece com blur.
  - Card central "Desbloquear análise completa" sobreposto, sem overflow horizontal.
  - Clique no botão abre modal Passo 1.
  - Submeter email no modal: blur desaparece, conteúdo aparece nítido.
  - Reload mantém desbloqueado (sessionStorage).
  - Botão dev "Reset preview unlock" devolve ao estado bloqueado.

### Riscos

- Performance do `filter: blur` em sequências grandes pode arrastar GPU em mobile antigo. Mitigação: aplicar blur só uma vez no wrapper externo (não por bloco).
- Sticky positioning do CTA pode conflitar com header sticky existente. Mitigação: usar `position: relative` + `sticky top-24` dentro do gate; testar overlap.
- Conteúdo bloqueado continua a fazer fetch/cálculo (snapshot já vem inteiro). Aceitável nesta fase; futuro: lazy-mount.

### Checkpoint

- ☐ Confirmar boundary: gate começa antes do `ReportBenchmarkGauge` (mesmo da fase 0)
- ☐ Confirmar uso de `sessionStorage` (não `localStorage`) para preview unlock
- ☐ Confirmar que o modal só mostra o passo 1 e não simula passos 2-5
- ☐ Confirmar título H2 em Fraunces (única editorial neste card)