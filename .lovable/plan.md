

## Entendimento

**1. Arquitectura actual da landing**: SPA TanStack Start. Routes em `src/routes/` (`index.tsx`, `design-system.tsx`). Landing = `<HeroSection>` → micro-proof → `<SocialProofSection>` → `<HowItWorksSection>` → `<ProductPreviewSection>` (que envolve `<MockupDashboard>` light, com KPIs, gauge, comparação concorrentes, AI insight, fade+lock no fundo).

**2. Promessa InstaBench**: análise pública e imediata de qualquer perfil Instagram em <30s. Freemium: dashboard público sem registo → relatório completo (PDF + IA) com email → planos pagos. Tom editorial, não-técnico, decisão-ready.

**3. "Editorial Tech Noir"**: dark-first navy, cyan accent técnico, violet CTA premium, Fraunces display + Inter sans + JetBrains Mono. Linear/Stripe/Attio quality, anti-Hootsuite. Glow controlado, hierarquia editorial.

**4. Público vs Premium**: público mostra métricas agregadas + benchmark + ranking concorrentes (valor demonstrado). Premium adiciona alcance estimado, insights IA estratégicos, oportunidades, recomendações 30d, PDF detalhado por email. O `MockupDashboard` actual já encena essa divisão com fade+blur+lock label.

## Conflitos com LOCKED_FILES.md

- `hero-action-bar.tsx` (LOCKED) — precisa de wiring mínimo: state controlado para o input + `useNavigate` no submit. **Autorizado pela spec** ("Wire the landing action bar... simple client-side routing only"). Sem alterar estilo/UX.
- `mockup-dashboard.tsx`, `mockup-metric-card.tsx`, `mockup-benchmark-gauge.tsx` (LOCKED) — **NÃO modifico**. Em vez disso, **promovo para componentes reutilizáveis novos** em `src/components/product/` (estratégia "componentes-produto" baseada nos mockups, sem tocar nos originais que continuam a servir a landing).

## Estratégia: "promote, don't mutate"

Os componentes locked do `landing/` continuam exclusivos da landing (mockup decorativo). Crio gémeos limpos em `src/components/product/` que podem evoluir para dados reais sem comprometer a landing. Reutilizam tokens, primitives (`Card`, `Badge`, `Button`) e estética.

## Ficheiros a criar

| Ficheiro | Propósito |
|---|---|
| `src/routes/analyze.$username.tsx` | Rota TanStack file-based: `/analyze/$username`. Lê `username` via `Route.useParams()`. Head meta pt-PT. Renderiza `<PublicAnalysisDashboard>`. |
| `src/lib/mock-analysis.ts` | Função `getMockAnalysis(username)` retorna `AnalysisData` realista e determinística (seed por username): identidade, 4 KPIs, benchmark, 2 concorrentes, premium-locked teasers. |
| `src/components/product/analysis-header.tsx` | Top: avatar (gradient placeholder), `@handle`, nome, categoria, seguidores formatados, badge `Dados de exemplo`. |
| `src/components/product/analysis-metric-card.tsx` | KPI dark-tone (variante "produto" do mockup-metric-card, sem `tone` prop — sempre dark editorial). |
| `src/components/product/analysis-benchmark-block.tsx` | Bloco com gauge horizontal (reaproveita lógica visual do mockup-benchmark-gauge mas dark-themed) + helper text pt-PT + badge posicionamento. |
| `src/components/product/analysis-competitor-comparison.tsx` | Linhas com nome + barra + valor para perfil + 2 concorrentes; perfil próprio destacado em violet/cyan. |
| `src/components/product/premium-locked-section.tsx` | 4 cartões teaser (alcance estimado, insights IA, oportunidades, recomendações 30d) com blur + overlay gradient + CTA "Desbloquear relatório completo" + "PDF detalhado por email" microcopy. |
| `src/components/product/public-analysis-dashboard.tsx` | Composição completa: container, header, secção KPIs, benchmark, comparação, premium veil. Aceita prop `data: AnalysisData`. |

## Ficheiros a modificar

| Ficheiro | Mudança |
|---|---|
| `src/components/landing/hero-action-bar.tsx` (LOCKED — autorizado) | (a) `useState` para input value; (b) `useNavigate` do TanStack; (c) `onSubmit`: trim + valida não-vazio → strip `@`/URL → `navigate({ to: "/analyze/$username", params: { username } })`; (d) erro inline pt-PT se vazio. Zero alterações de estilo. |

## Estrutura de mock data

```ts
export interface AnalysisData {
  profile: { handle, displayName, category, followers, avatarSeed };
  metrics: { engagement, postsAnalyzed, weeklyFrequency, dominantFormat };
  benchmark: { value, reference, max, position: "above"|"on"|"below", helperText };
  competitors: Array<{ handle, engagement, isSelf }>;
  premiumTeasers: { estimatedReach, aiInsightsCount, opportunitiesCount, recommendations30d };
}
```
Determinístico por hash do username → mesmo input devolve mesmo output (UX consistente em refresh).

## Layout do dashboard `/analyze/$username`

```
[App shell — header/footer existentes]
  [Container size="lg" — padding vertical generoso]
    ┌─ AnalysisHeader ──────────────────┐
    │ avatar · @handle · cat · followers │ [badge: Dados de exemplo]
    └────────────────────────────────────┘
    
    Análise pública                     ← section label
    
    [grid 4 KPIs — AnalysisMetricCard × 4]
    
    [AnalysisBenchmarkBlock — gauge + helper]
    
    [AnalysisCompetitorComparison]
    
    ─── divisor hairline + label "Conteúdo premium" ───
    
    [PremiumLockedSection — 4 teaser cards blur + CTA central]
```

Mobile 375px: KPIs em grid 2-col, comparação stack, premium cards 1-col.

## Visual direction (operacional, não decorativo)

- Surface: dark `surface-base` (não light como o mockup landing — landing = "preview", produto = "ecrã real")
- KPIs: `surface-secondary` cards, valor em Fraunces `text-3xl`, label mono uppercase `text-content-tertiary`
- Benchmark gauge: cyan fill (assinatura técnica), benchmark marker dashed, badge violet/success
- Comparação: barra perfil próprio em violet→cyan gradient, concorrentes em `border-default`
- Premium veil: `backdrop-blur-md` sobre cards, overlay `bg-surface-base/70`, lock icon, CTA button `variant="primary"` (violet)
- Sem aurora, sem decoração de landing — apenas hairlines + labels mono + spacing generoso

## Copy pt-PT (impessoal)

- "Análise pública"
- "Dados de exemplo"
- "Posicionamento face ao benchmark"
- "Comparação com concorrentes"
- "Conteúdo disponível no relatório completo"
- "Desbloquear relatório completo"
- "PDF detalhado enviado por email"
- "Três insights estratégicos por IA"
- Erro vazio: "Inserir um username válido para continuar"

## Confirmação

✅ Mock-data only. Zero Supabase/Apify/Claude/Resend/EuPago/Stripe.
✅ Zero novas dependências. Apenas TanStack Router (já instalado), shadcn primitives existentes, lucide-react.
✅ Tokens-only (sem hardcoded colors/spacing/radii).
✅ pt-PT impessoal. Sem placeholders.
✅ Mobile-first 375px validado no plano (grids responsivos).
✅ Landing visualmente intacta (apenas wiring funcional na action bar).
✅ Locked file `hero-action-bar.tsx` autorizado pela spec; restantes locked files NÃO tocados — em vez disso promovo para `src/components/product/`.
✅ Arquitectura future-ready: `getMockAnalysis()` substituível por `loader` async com fetch real; componentes recebem `data` como prop, sem fetch interno.

## Desvios face à spec

1. **"Promote existing dashboard pieces into reusable components"** — interpreto como criar gémeos limpos em `src/components/product/` (não mutar os locked landing mockups). Os landing mockups continuam a servir a landing como "preview decorativo"; os product components vivem a sua vida e podem evoluir para dados reais. Alternativa seria desbloquear os ficheiros e refactorizar in-place — mais invasivo, com risco de partir a landing. Se preferires refactor in-place, ajusto.
2. **Avatar do perfil** — sem fetch real do IG, uso gradient determinístico (hash username → matiz). Não tento simular foto.
3. **Rota TanStack file-based**: ficheiro `analyze.$username.tsx` (dot-syntax). O routeTree.gen.ts auto-regenera; não toco nele.

