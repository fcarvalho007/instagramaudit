# Admin Intelligence Cockpit — v1

Implementar os 5 painéis novos (Diagnóstico, Análises, Perfis, Custos, Alertas) e ligar a tab Pedidos no `CockpitShell` já existente. Toda a leitura usa o endpoint `GET /api/admin/diagnostics` que já agrega tudo o que precisamos — **não é necessário criar novos endpoints, novas migrations, nem tocar em segredos**.

## Princípios
- Read-only. Sem mutações, sem ack de alertas (fica para depois).
- Reutilizar `useCockpitData`, `cockpit-formatters.ts`, `cockpit-badges.tsx` e o componente `Card`/`Badge` já existentes.
- Nunca expor valores de segredos — apenas `Configurado` / `Em falta`.
- Labels em pt-PT. Mobile-first (cards empilham em viewport pequena).
- Não tocar em `/report.example`, componentes de relatório, fluxos PDF/email, UI pública.

## Arquitetura dos painéis

```text
src/components/admin/cockpit/
├── cockpit-shell.tsx           (já existe — substituir placeholders)
├── use-cockpit-data.ts         (já existe)
├── cockpit-types.ts            (já existe)
├── cockpit-formatters.ts       (já existe)
├── cockpit-badges.tsx          (já existe)
├── panels/
│   ├── diagnostics-panel.tsx   NOVO
│   ├── analyses-panel.tsx      NOVO
│   ├── profiles-panel.tsx      NOVO
│   ├── costs-panel.tsx         NOVO
│   ├── alerts-panel.tsx        NOVO
│   └── requests-panel.tsx      NOVO (wrapper fino do RequestList + Sheet)
└── parts/
    ├── stat-card.tsx           NOVO  (label + valor grande + sublabel)
    ├── data-table.tsx          NOVO  (tabela responsiva minimalista)
    └── empty-state.tsx         NOVO
```

## Conteúdo de cada tab

### 1. Diagnóstico
Saúde técnica e configuração. Consome `secrets`, `apify`, `testing_mode`, `snapshots`, `report_requests`, `recent_provider_calls`.
- Grid de `PresenceBadge` para `APIFY_TOKEN`, `RESEND_API_KEY`, `INTERNAL_API_TOKEN`.
- Estado Apify: `enabled` (kill-switch), `cost_per_profile_usd`, `cost_per_post_usd`.
- Modo de teste: `active` + lista de handles na allowlist (chips).
- Última snapshot: handle, fonte (`fresh`/`cache`/`stale`), provider, `updated_at`.
- Últimos 15 provider calls: actor, handle, status (badge), HTTP, duração, posts, custo.

### 2. Análises
Histórico de eventos. Consome `recent_events` + janela 24h/7d.
- Header: 4 stat cards — Eventos 24h · Eventos 7d · Perfis únicos 7d · Custo estimado 24h.
- Tabela dos últimos 20 eventos: data, handle, outcome (badge), fonte (badge), duração, custo, error_code.
- Empty state se não houver eventos ainda.

### 3. Perfis
Rollup por handle. Consome `top_profiles`.
- Tabela com top 10: handle, seguidores (compacto), total análises, fresh, cache, falhas, custo total, última análise, última fonte.
- Coluna "Repetições" destaca handles com `analyses_total >= ALERT_REPEATED_PROFILE_PER_HOUR` (warning visual, não bloqueante).
- Empty state se vazio.

### 4. Custos
Agregados financeiros. Consome `analytics` + `apify`.
- Stat cards: Custo 24h · Custo 7d · Cache hits 7d · **Custo poupado pela cache 7d** (estimativa = `cache_count_7d * (cost_per_profile + cost_per_post * postsAssumed)`; usar `cost_per_profile + cost_per_post * 12` como estimativa conservadora — explicado em copy "estimativa baseada em ~12 posts/análise").
- Mini-tabela: rácios fresh vs cache 24h e 7d, taxa de falhas.
- Nota explicativa em pt-PT sobre a metodologia de custo (estimativa, não fatura real do Apify).

### 5. Alertas
Sinais não bloqueantes. Consome `alerts` + `alert_thresholds`.
- Header: stat card com nº de alertas não reconhecidos.
- Tabela: data, severidade (badge), tipo (badge), handle, métrica, valor, limite.
- Bloco "Limites configurados" lista os 5 thresholds em pt-PT.
- Empty state "Sem alertas ativos." quando vazio.
- Banner pequeno: "Os alertas são informativos. Nenhum utilizador é bloqueado nesta versão."

### 6. Pedidos de relatório
Migrar para `requests-panel.tsx` que envolve o `RequestList` + `RequestDetailSheet` já existentes (mantém comportamento atual; tira o estado da `cockpit-shell.tsx` para o painel).

## Detalhes técnicos

- `cockpit-shell.tsx`: substituir os 5 `PlaceholderPanel` pelos novos painéis; passar `data`, `loading`, `error` por props (cada painel recebe a fatia que precisa). Manter o botão global "Atualizar" que já existe.
- Novos painéis são funções puras `({ data }: { data: CockpitData | null }) => JSX`. Skeleton simples quando `data === null` e `loading`. Erro inline quando o bloco respetivo trouxer `error`.
- `stat-card.tsx`: usa tokens `surface-elevated`, `border-subtle`, `font-display` para o número, `font-mono uppercase tracking` para o label — alinhado com o resto do admin.
- `data-table.tsx`: tabela `<table>` semântica com classes Tailwind, scroll horizontal em mobile (`overflow-x-auto`), zebra subtil via `divide-y divide-border-subtle`.
- Custo poupado: cálculo client-side a partir de `cache` (count) × `(cost_per_profile_usd + cost_per_post_usd * 12)`. Constante `ASSUMED_POSTS_PER_CACHE_HIT = 12` definida no painel com comentário a explicar a heurística.
- Sem novos imports do Supabase no client. Tudo passa pelo `fetch('/api/admin/diagnostics')` que já está protegido por `requireAdminSession`.
- `diagnostics-panel.tsx` antigo (838 linhas) fica órfão — eliminar para evitar duplicação.

## Ficheiros a alterar

**Criar (9)**
- `src/components/admin/cockpit/parts/stat-card.tsx`
- `src/components/admin/cockpit/parts/data-table.tsx`
- `src/components/admin/cockpit/parts/empty-state.tsx`
- `src/components/admin/cockpit/panels/diagnostics-panel.tsx`
- `src/components/admin/cockpit/panels/analyses-panel.tsx`
- `src/components/admin/cockpit/panels/profiles-panel.tsx`
- `src/components/admin/cockpit/panels/costs-panel.tsx`
- `src/components/admin/cockpit/panels/alerts-panel.tsx`
- `src/components/admin/cockpit/panels/requests-panel.tsx`

**Editar (1)**
- `src/components/admin/cockpit/cockpit-shell.tsx` — substituir placeholders pelos painéis.

**Eliminar (1)**
- `src/components/admin/diagnostics-panel.tsx` — substituído pelo novo painel modular.

**Não tocar**
- `src/routes/api/admin/diagnostics.ts` (já devolve tudo).
- Schema Supabase (sem migrations).
- `/src/routes/report.example.tsx`, `/src/components/report/*`, `routeTree.gen.ts`.
- Auth admin, fluxos PDF/email, UI pública.

## Como validar depois de uma análise
1. Login em `/admin` com o token.
2. Correr uma análise em `/analyze/frederico.m.carvalho`.
3. Em `/admin`:
   - **Diagnóstico**: última snapshot mostra o handle e fonte `fresh`. Provider calls lista o run Apify.
   - **Análises**: aparece 1 evento novo no topo, 24h conta `1`, custo > 0.
   - **Perfis**: o handle aparece na tabela com `analyses_total = 1`, `analyses_fresh = 1`.
   - **Custos**: custo 24h reflete o valor do evento; cache hits = 0 inicialmente.
4. Repetir a mesma análise: deve subir `analyses_cache` e o "custo poupado" no painel Custos.

## O que fica para depois
- Pagamentos (one-off + subscrições).
- Email gate público.
- PnL com receita real (atualmente só temos custos estimados).
- Reconhecer / arquivar alertas (botão de ack + cron de reavaliação).
- Filtros e paginação nos painéis Análises/Perfis quando o volume crescer.
- Custo real do Apify (vs estimado) quando ligarmos a billing API deles.

☐ Painéis criados e renderizam dados reais
☐ `cockpit-shell.tsx` sem placeholders
☐ `diagnostics-panel.tsx` antigo removido
☐ pt-PT em toda a copy, sem segredos expostos
☐ Mobile (375px) testado: tabelas com scroll horizontal, stat cards empilham
