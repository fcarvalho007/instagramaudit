## Objetivo

1. Corrigir as datas das fontes de referência no bloco "Como este relatório foi feito" (mostrar a data de última actualização em vez do ano genérico "2025").
2. Remover a entrada Databox da lista visível no relatório público.
3. Aplicar uma melhoria subtil ao footer inspirada em "Clean Prism Glass 3D Shapes" (mantendo o tom Iconosquare-clean, light, minimal). A referência "3D Space Multiscreen" não se enquadra no estilo editorial do produto e fica de fora.

## 1. Datas das fontes (Lote A)

Ficheiro: `src/lib/knowledge/benchmark-context.ts`

- Adicionar um campo opcional `lastUpdatedLabel: string` em `BenchmarkSource` (string editorial pronta a render — não Date object, para evitar i18n acidental).
- Preencher para as 3 fontes activas:
  - **Socialinsider** → `"Fev 2026"` (URL: socialinsider.io/social-media-benchmarks/instagram, last updated Feb 20, 2026)
  - **Buffer** → `"Mai 2026"` (Last updated May 10, 2026)
  - **Hootsuite** → `"Abr 2026"` (April 14, 2026)
- Manter `publishedYear` (usado por testes e prompt) — apenas alinhar para `2026`.
- Databox mantém-se no data layer (testes dependem dela e o prompt LLM ignora-a por `visibility: "future"`), mas deixa de ser renderizada (ver §2).

Ficheiro: `src/components/report-redesign/report-methodology.tsx`

- Trocar `{source.publishedYear}` por `{source.lastUpdatedLabel ?? source.publishedYear}` no chip tabular ao lado do nome.

## 2. Remover Databox do relatório

Ficheiro: `src/components/report-redesign/report-methodology.tsx`

- Filtrar `INSTAGRAM_BENCHMARK_CONTEXT.sources` por `visibility === "active"` antes de iterar.
- Remover toda a ramificação `isLocked` (badge "em breve", ícone `Lock`, copy alternativa, `opacity-60`) — já não há fonte locked visível.
- Remover imports não usados (`Lock`).

Notas:
- O ficheiro `benchmark-context.ts` e a entrada Databox **não são apagados** (testes em `__tests__/benchmark-context.test.ts` esperam as 4 fontes e a invariante "Databox é future"). Continuam como contexto interno reservado a futura ligação autenticada.
- `sourceNote` já lista apenas Socialinsider/Buffer/Hootsuite — sem alteração.

## 3. Melhoria subtil do footer

Ficheiro: `src/components/layout/footer.tsx`

Inspiração aplicada: **Clean Prism Glass 3D Shapes** — apenas o vocabulário visual leve (prisma de cor difusa, vidro suave). Sem 3D real, sem WebGL, sem multiscreen.

Alterações mínimas:
- Substituir o `border-t border-border-subtle` flat por uma linha prismática subtil: divisor de 1px com `bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--accent-primary)_25%,transparent)] to-transparent`.
- Adicionar um halo glass discreto por trás do `<BrandMark />`: wrapper com `rounded-2xl bg-white/60 backdrop-blur-sm ring-1 ring-border-default/60 shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--accent-primary)_18%,transparent)] px-3 py-2`.
- Adicionar um decorativo `aria-hidden` no canto: um pequeno blob radial accent-primary @ 8% opacity, `pointer-events-none`, posicionado `absolute -top-px right-8 size-24 rounded-full blur-3xl`, dentro de um wrapper `relative overflow-hidden` no `<footer>`.

Tudo via tokens existentes (`--accent-primary`, `--border-default`). Zero novas dependências, zero alterações a tokens globais. Não toca em cor de texto, tipografia, links, copyright nem `LanguageSwitcher`.

Rejeitado: "3D Space Multiscreen" — colide com o princípio Iconosquare-clean (sem cinematic / sem dark glow / sem 3D mock).

## Validação

- `bunx tsc --noEmit`
- Inspecção visual em `/analyze/frederico.m.carvalho` (bloco metodologia + footer)
- Garantir que os testes `benchmark-context.test.ts` continuam verdes (não tocamos na shape testada — só adicionamos campo opcional).

## Checkpoint

- ☐ `lastUpdatedLabel` adicionado a Socialinsider/Buffer/Hootsuite
- ☐ Methodology renderiza a nova data e ignora fontes `future`
- ☐ Branch `isLocked` + import `Lock` removidos
- ☐ Footer com divisor prismático + halo glass na brand + blob radial decorativo
- ☐ Testes passam, tsc sem erros