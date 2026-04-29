## Estado actual do R2

**Feito (Fases A + B)**
- BD: 5 tabelas `knowledge_*`, trigger de auditoria, RPC `get_knowledge_context`, RPC `set_admin_email_session`.
- `src/lib/knowledge/`: `types.ts`, `queries.server.ts` (overview, list/upsert/archive de benchmarks/sources/notes, history, exportDataset), `context.server.ts` (consumido pelo R3).

**Por fazer** — Fases C (endpoints) + D (UI) + E (smoke).

---

## Fase C — 7 endpoints `/api/admin/knowledge.*`

Padrão idêntico a `sistema.caps.ts`: `requireAdminSession()` → Zod → chama helper de `queries.server.ts`. Todos em `src/routes/api/admin/`:

| Ficheiro | Métodos | Helper |
|---|---|---|
| `knowledge.overview.ts` | GET | `getOverview()` |
| `knowledge.benchmarks.ts` | GET, POST (upsert) | `listBenchmarks()`, `upsertBenchmark()` |
| `knowledge.benchmarks.$id.ts` | DELETE (arquiva via `valid_to`) | `archiveBenchmark()` |
| `knowledge.sources.ts` | GET, POST | `listSources()`, `createSource()` |
| `knowledge.notes.ts` | GET, POST (upsert) | `listNotes()`, `upsertNote()` |
| `knowledge.notes.$id.ts` | DELETE (archived=true) | `archiveNote()` |
| `knowledge.export.ts` | GET (devolve JSON com `Content-Disposition: attachment`) | `exportDataset()` |

Schemas Zod: `tier ∈ {nano,micro,mid,macro}`, `format ∈ {reels,carousels,images}`, `engagement_pct ≥ 0`, `sample_size ≥ 1`, datas ISO `YYYY-MM-DD`, `category ∈ {trend,format,algorithm,vertical,tool}`.

---

## Fase D — UI tab "Conhecimento"

**1. Adicionar tab à nav** — `src/components/admin/v2/admin-tabs-nav.tsx`: incluir `{ to: "/admin/conhecimento", label: "Conhecimento" }` na lista (entre "Perfis" e "Sistema").

**2. Rota** — `src/routes/admin.conhecimento.tsx`: shell com `AdminPageHeader` ("Knowledge Base · contexto editorial da IA") + 4 secções verticais. Botão de acção no header: "Exportar dataset" (link para `/api/admin/knowledge/export`).

**3. Componentes** em `src/components/admin/v2/conhecimento/`:

| Ficheiro | Função |
|---|---|
| `overview-section.tsx` | 4 KPIs: total entradas, manual/sistema, cobertura tiers (`X de 4`), última actualização (relativa + autor), sugestões pendentes. Usa `KPICard` existente. |
| `benchmarks-section.tsx` | Tabela com 12 linhas (4 tiers × 3 formatos). Colunas: Tier, Formato, Engagement %, n=, Fonte, Origem (badge), Última actualização. Linhas vazias mostram CTA "Adicionar". Click → `BenchmarkDrawer`. Filtro por formato no topo. |
| `benchmark-drawer.tsx` | Drawer lateral com formulário (engagement_pct, sample_size, source_id select, notes, valid_from, valid_to) + lista do histórico (`getEntityHistory`). Reusa `Sheet` do shadcn. |
| `sources-section.tsx` | Tabela de fontes (Nome, Tipo, URL, Publicado em, n amostra, Citações). Botão "+ Nova fonte". |
| `source-create-dialog.tsx` | Dialog simples para criar fonte. |
| `notes-section.tsx` | Grid de cartões (3 col desktop, 1 col mobile). Cada cartão: badge categoria, título, body truncado, fonte, validade. Botão "+ Nova nota". |
| `note-create-dialog.tsx` | Dialog com category/vertical/title/body/source. |

Padrão de styling: `AdminCard`, `AdminBadge`, `AdminSectionHeader`, tokens `admin-text-*`, `admin-border`. Mono na nav (acento azul só na barra do `AdminSectionHeader`).

**Data fetching**: `useQuery` com `queryKey: ["admin","knowledge","overview"|"benchmarks"|...]` e `adminFetch()`. Mutations com `useMutation` + `qc.invalidateQueries`.

**Estados**: loading (skeleton via `SectionState`), erro (mensagem + retry), vazio (CTA "Adicionar primeiro benchmark").

---

## Fase E — Smoke test

1. Abrir `/admin/conhecimento` autenticado; confirmar 4 KPIs (`0 / 0-de-4 / —— / 0` em projecto vazio, ou seed real se já existir).
2. Adicionar 1 benchmark via drawer → ver linha preenchida + entrada em `knowledge_history` via `select * from knowledge_history`.
3. Criar 1 fonte e 1 nota; confirmar que aparece e é citada na contagem.
4. GET `/api/admin/knowledge/export` devolve JSON com 3 arrays.
5. Verificar `select * from knowledge_history order by changed_at desc limit 5` — auditoria a registar autor.

---

## Notas técnicas

- `adminFetch` injecta `Authorization: Bearer <jwt>` automaticamente (já usado em todas as outras secções).
- O drawer usa `Sheet` do shadcn já presente no projecto (sem deps novas).
- Sem alteração a `LOCKED_FILES.md`, `src/styles.css`, `routeTree.gen.ts` (auto-gerado), nem a `src/lib/knowledge/*` (Fase B já validada).
- Cores: tab "Conhecimento" usa o mesmo padrão mono das outras 6; o acento cyan aparece apenas na barra do `AdminSectionHeader` de cada secção (igual a Sistema).

---

## Checkpoint final

- [ ] 7 endpoints criados e a responder 200/401 conforme sessão admin
- [ ] Tab "Conhecimento" visível em `AdminTabsNav` (7 tabs no total)
- [ ] `/admin/conhecimento` renderiza 4 secções (overview, benchmarks, fontes, notas)
- [ ] Drawer de benchmark abre, grava e mostra histórico
- [ ] Export devolve JSON com benchmarks/sources/notes
- [ ] `knowledge_history` regista autor em cada update
