
## Objetivo

Inverter a lógica do /admin: por defeito mostrar **dados reais** (mesmo que vazios ou parciais) e oferecer um **switcher "Modo demonstração"** global para, quando útil, sobrepor mockups e ver a página "preenchida". Os **custos (Apify · OpenAI · DataForSEO) ficam sempre reais**, nunca afetados pelo modo demo. Corrigir os bugs visíveis em /admin.

---

## Princípios

1. **Real por defeito.** Toda a tab carrega dados reais à entrada.
2. **Demo é opcional e sinalizado.** Quando ativo, cada secção que usa mock mostra um banner discreto e os números aparecem com o estilo "demo" (italic + cor neutra).
3. **Custos são sagrados.** A secção Despesa (e qualquer KPI de custo) ignora o modo demo — é sempre real, ligada a `provider_call_logs` / `cost_daily`.
4. **Vazio honesto.** Quando não há dados reais, mostrar empty state explícito ("Sem dados ainda — ativa Modo demonstração para ver layout preenchido"), em vez de mock implícito.

---

## Mudanças

### 1. Demo Mode global (novo)

**Novo ficheiro `src/lib/admin/demo-mode.ts`**
- Hook `useDemoMode()` com estado partilhado via `localStorage` (`admin.demo_mode.v1`) + custom event para sincronizar entre tabs/janelas.
- API: `{ enabled: boolean, toggle(): void, set(v: boolean): void }`.
- Default: `false` (real).

**Novo `DemoModeSwitch` em `src/components/admin/v2/demo-mode-switch.tsx`**
- Switch compacto no canto superior direito do header global do /admin (ao lado de "Terminar sessão").
- Label: "Modo demonstração" + tooltip: "Mostra dados de exemplo nas secções ainda sem integração real (subscrições, clientes, pipeline). Custos e métricas operacionais são sempre reais."
- Visual: cyan accent quando ativo, neutro quando desligado.

**Integração no `src/routes/admin.tsx`**
- Inserir `<DemoModeSwitch />` antes do botão "Terminar sessão".
- Quando ativo, adicionar classe `data-demo="on"` no `<div className="admin-v2">` para permitir hooks visuais (ex.: outline cyan ténue em secções demo).

### 2. Refactor das secções para suportarem `demoMode`

Cada secção que hoje usa `MOCK_*` recebe a flag e decide o que renderizar:

**Padrão por secção (demo-aware):**
```
const demo = useDemoMode().enabled;
const real = useQuery(...);  // sempre tenta carregar real

if (demo) return <DemoView mock={MOCK_X} />;       // mockup
if (real.isLoading) return <SectionSkeleton />;
if (real.error) return <SectionError ... />;
if (isEmpty(real.data)) return <SectionEmpty hint="Ativa Modo demonstração para ver layout preenchido" />;
return <RealView data={real.data} />;
```

Secções afetadas (todas mantêm o mock para o modo demo):
- `visao-geral/revenue-section.tsx` — adicionar query real (MRR, receita avulsa) ligada a `report_requests` + futura `subscriptions`.
- `visao-geral/funnel-section.tsx`, `kanban-section.tsx`, `intent-section.tsx` — adicionar queries a `analysis_events`, `leads`, `report_requests` para versão real; mock em demo.
- `receita/*` (5 secções) — real: vazio/zero (não há subscrições ainda) com empty state honesto; mock só em demo.
- `clientes/*` (3 secções) — real: leitura de `leads` + `social_profiles` agregados; mock em demo.
- `relatorios/*` (4 secções) — pipeline e métricas já têm dados reais possíveis (ligar a `report_requests` + `analysis_events`); mock em demo.
- `perfis/*` (4 secções) — real: já temos `social_profiles` + `analysis_events`; ligar agora; mock em demo.

**Despesa (`visao-geral/expense-section.tsx`)**: **NÃO mexer** — já é 100% real. Apenas garantir que não responde ao demo mode.

### 3. Endpoints reais a criar (server functions / API routes)

Sob `src/routes/api/admin/` (autenticados via allowlist):
- `analytics.funnel.ts` — agregação 30d de `analysis_events` (search → analyze → report_request → email_sent).
- `analytics.profiles.ts` — top perfis por nº análises, conversão a relatório, oportunidades (perfis pesquisados ≥2 sem report).
- `analytics.leads.ts` — agregação de `leads` + `report_requests` para a tab Clientes (sem subscrições ainda).
- `analytics.reports.ts` — agregações de `report_requests` (estado, latências, falhas) para tab Relatórios.

Cada um devolve JSON tipado e usa `supabaseAdmin` em `*.server.ts` helpers.

### 4. Substituir banners "Dados de exemplo" pela lógica nova

Remover `<MockDataBanner>` no topo das páginas `/admin/receita` e `/admin/clientes`.
Em vez disso:
- Quando demo mode está **off**: cada secção mostra dados reais ou empty state.
- Quando demo mode está **on**: aparece um único banner global no topo da página ("Modo demonstração ativo — algumas secções mostram dados fictícios para visualização."), e secções que renderizam mock recebem outline cyan ténue.

### 5. Bugs em /admin

**5a. Erro "No QueryClient set"**

Causa provável: o `defaultErrorComponent` em `src/router.tsx` é montado fora da árvore do `RootComponent` quando uma rota explode antes do `QueryClientProvider` envolver — em TanStack Start, error boundaries de routing renderizam ao nível do router, não do root component.

Correção:
- Mover o `QueryClientProvider` para `RootShell` (envolver `{children}` em `__root.tsx`), em vez de `RootComponent`. Assim qualquer rota — incluindo error boundaries — fica sempre dentro do provider.
- Garantir que o `queryClient` é acessível: passar via `Route.useRouteContext()` no `RootShell` ou criar instância singleton client-side (memoizada) para SSR-safety.
- Alternativa mais segura: `RootShell` cria/lê o `queryClient` do contexto e envolve `children` no provider; o `RootComponent` deixa de o fazer.

**5b. "A verificar sessão…" lento**

Já há cache (60s) + delay de spinner (180ms). Otimizações adicionais:
- Pré-carregar a sessão Supabase em paralelo com o render (sem esperar pelo `INITIAL_SESSION` event): chamar `supabase.auth.getSession()` em paralelo e usar o que chegar primeiro (event ou getSession), evitando a espera de ~300-500ms do listener inicializar.
- Reduzir `SPINNER_DELAY_MS` para `80ms` (só mostrar spinner se realmente lento).
- Cachear o resultado de `whoami` em `localStorage` (não `sessionStorage`) para sobreviver entre tabs e refrescos rápidos.
- Aumentar TTL para `5 min` (continua a ser revalidado em background no próximo onAuthStateChange).

### 6. Pequenas limpezas

- Atualizar `LOCKED_FILES.md` se necessário (a `expense-section.tsx` deve ficar marcada como sensível: "custos reais — não substituir por mock").
- Adicionar comentário no `mock-data.ts` esclarecendo que esses dados só são usados quando `demoMode.enabled === true`.

---

## Detalhes técnicos

```text
src/
├── lib/admin/
│   └── demo-mode.ts                     [NEW] hook + storage + event bus
├── components/admin/v2/
│   ├── demo-mode-switch.tsx             [NEW] switch UI no header
│   ├── mock-data-banner.tsx             [EDIT] passa a aceitar variant "global" + "section"
│   └── (todas secções com MOCK_*)       [EDIT] passam a usar useDemoMode + query real
├── routes/
│   ├── __root.tsx                        [EDIT] QueryClientProvider sobe para RootShell
│   ├── admin.tsx                         [EDIT] integra DemoModeSwitch
│   ├── admin.receita.tsx                 [EDIT] remove banner global
│   ├── admin.clientes.tsx                [EDIT] remove banner global
│   └── api/admin/
│       ├── analytics.funnel.ts           [NEW]
│       ├── analytics.profiles.ts         [NEW]
│       ├── analytics.leads.ts            [NEW]
│       └── analytics.reports.ts          [NEW]
└── router.tsx                            [EDIT] DefaultErrorComponent sem dependência de QueryClient
```

Sem novas dependências. Sem alterações de schema (lê apenas tabelas existentes: `analysis_events`, `report_requests`, `leads`, `social_profiles`, `provider_call_logs`, `cost_daily`, `app_config`).

---

## Checkpoint

☐ Demo mode global criado (hook + switch no header) com persistência localStorage
☐ Default = real; toggle visível e claro
☐ Despesa permanece 100% real, ignorando o demo mode
☐ Cada secção mock-only converte-se em real-first com fallback a empty state
☐ Endpoints reais (`analytics.*`) criados para Funil, Perfis, Clientes, Relatórios
☐ Banners "Dados de exemplo" removidos das páginas; substituídos por banner global só quando demo mode ativo
☐ Erro "No QueryClient set" deixa de ocorrer (provider movido para RootShell)
☐ "A verificar sessão…" reduzido (paralelizar getSession + onAuthStateChange, TTL maior, cache em localStorage)
☐ Sem alterações em /report.example, sem novas dependências, sem schema changes
☐ pt-PT, sem placeholders, dark-first
