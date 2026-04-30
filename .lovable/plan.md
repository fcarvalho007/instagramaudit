## Refinamento do Hero v2 (Bloco 01 · primeiro fold)

Alvo único: `src/components/report-redesign/v2/report-hero-v2.tsx`. Sem alterações ao `report-shell-v2.tsx`, ao `report-overview-block.tsx` ou aos blocos 02–06. Sem novas libs. `report-positioning-banner.tsx` mantém-se como está (não é renderizado pelo shell v2). Pequeno ajuste aditivo em `report-tokens.ts` se necessário para o divider entre stats IG e meta da análise.

### Alterações de conteúdo

1. **Badge cluster** — manter apenas `Dados públicos`. Remover renderização de `IA editorial`, `Benchmark` e `Pesquisa`.
2. **Stats IG sob a bio** — manter os 3 stats (`publicações`, `seguidores`, `a seguir`) já presentes; reforçar a hierarquia visual com peso semibold no valor e label mono pequena, tal como no Instagram.
3. **Meta da análise** — manter abaixo dos stats, mais pequena, em mono uppercase, separada por um divider hairline subtil (`border-t border-slate-200/60 pt-2`) em vez de simples margem, para sinalizar claramente "esta linha é metadata do relatório, não do perfil".
4. **Sem duplicação** — o `ReportOverviewBlock` (Bloco 01 abaixo da fold) já não repete seguidores/publicações/seguir, está focado em envolvimento, ritmo e formato. Confirmado por inspeção anterior.
5. **Sem follower growth, sem placeholder de histórico futuro.**

### Alterações visuais

- Reduzir padding vertical da banda: `pt-7 md:pt-9 pb-7 md:pb-9` → `pt-6 md:pt-8 pb-6 md:pb-7` para um fold mais compacto.
- Avatar mantém-se com ring duplo, sem alterações.
- Botões de ação no desktop: tornar o `Exportar PDF` ligeiramente mais discreto (`bg-blue-600` mantido mas remover `-translate-y-0.5` no hover para reduzir presença) e manter `ShareReportPopover` em variant ghost — fica claro que são secundários ao identity block.
- Mobile: ações ficam abaixo da identidade, como já estão; sem grandes alterações.

### Tipografia

- Handle: continua `font-display` (serif) via `h1HeroV2Compact`.
- Nome, bio, labels: `Inter`/sans (já é o default).
- Stats IG: valor em `font-display semibold`, label em `font-mono text-[10px] uppercase`.
- Meta da análise: `font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500`.

### Copy (pt-PT)

Mantém-se o vocabulário já implementado: `publicações`, `seguidores`, `a seguir`, `publicações analisadas`, `dias analisados`, `analisado em`. Sem alterações.

### Acessibilidade e responsivo

- Mantém `aria-label="Cabeçalho do relatório"`, `aria-busy` no botão PDF, `aria-label` no avatar verificado.
- Sem horizontal overflow: contêineres com `min-w-0` e `flex-wrap` já presentes nas zonas críticas; verificar a 375 / 768 / 1366 mentalmente — o grid de stats `grid-cols-3 gap-3 max-w-md` cabe a 375.

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Reportar apenas ficheiros alterados e resultado dos testes (sem QA visual em browser, conforme instrução).

### Ficheiros a alterar

- `src/components/report-redesign/v2/report-hero-v2.tsx` — única edição funcional.
- `src/components/report-redesign/report-tokens.ts` — opcional, apenas se for necessário um token novo para o divider/meta (provavelmente desnecessário; usar utilities Tailwind inline).

### Critérios de aceitação confirmados

- Apenas `Dados públicos` no cluster de badges.
- Stats IG integrados sob a bio.
- Meta da análise presente, secundária, separada por divider hairline.
- Hero mais compacto verticalmente.
- Sem duplicação de stats com o overview abaixo.
- Blocos 02–06 intactos; sem chamadas a providers; sem schema/edge function.
