# Enriquecer o relatório real com dados já presentes no snapshot

## Bloqueio crítico — pedido de permissão

Os componentes-alvo desta tarefa estão **todos no `LOCKED_FILES.md`** (Sprint 1, Prompt 1.10):

- `src/components/report/report-header.tsx` (avatar, bio)
- `src/components/report/report-top-posts.tsx` (permalinks, mentions)
- `src/components/report/report-competitors.tsx` (CTA empty-state)
- `src/components/report/report-benchmark-gauge.tsx` (fonte/metodologia)
- `src/components/report/report-format-breakdown.tsx` (fonte/metodologia)
- `src/components/report/report-mock-data.ts` (tipo `ReportData` — não posso adicionar `permalink`, `bio`, `avatarUrl`, `mentions`)
- `src/routes/report.example.tsx` (intocável por âmbito)

O prompt diz explicitamente: *"Respect locked files. If a locked report component must be edited, stop and explain before editing."* — é o que faço aqui.

**Sem editar locked files, a estratégia é construir tudo como _companion sections_** posicionadas em `src/routes/analyze.$username.tsx`, em volta do `<ReportPage />`, alimentadas pelo mesmo snapshot. Isto preserva 100% dos ficheiros locked e não toca em `/report/example`.

Se preferires editar diretamente os componentes locked (solução mais limpa visualmente — permalinks ficariam dentro dos cards do Top 5 em vez de numa lista companheira), preciso de **autorização explícita** para:

1. `report-header.tsx` — adicionar bio + avatar real (com fallback para gradiente).
2. `report-top-posts.tsx` — envolver os cards num `<a href={permalink} target="_blank">` quando existir.
3. `report-competitors.tsx` — substituir o parágrafo "Adicione concorrentes" por CTA visual.
4. `report-benchmark-gauge.tsx` e `report-format-breakdown.tsx` — adicionar nota de fonte.
5. `report-mock-data.ts` — alargar o tipo `ReportData` com `profile.bio?`, `profile.avatarUrl?`, `topPosts[].permalink?`, `topPosts[].mentions?`.

A versão sem autorização fica abaixo. Se aprovares editar locked files, devolvo um plano alternativo. **Não avanço com edição de nenhum locked file até resposta.**

## Plano (companion sections, sem tocar em locked files)

### Adapter — `src/lib/report/snapshot-to-report-data.ts` (não locked)

Adicionar um bloco `enriched` ao `AdapterResult` (campo opcional novo, retro-compatível):

```ts
export interface ReportEnriched {
  profile: {
    bio: string | null;
    avatarUrl: string | null;
    profileUrl: string;        // https://www.instagram.com/{username}/
  };
  topPosts: Array<{
    id: string;
    permalink: string | null;
    shortcode: string | null;
    caption: string;
    format: "Reel" | "Carousel" | "Imagem";
    likes: number;
    comments: number;
    engagementPct: number;
    date: string;              // pt-PT curto (já formatado pelo adapter)
    mentions: string[];        // únicos, ordenados, máx. 5 por post
  }>;
  mentionsSummary: Array<{ handle: string; count: number }>; // top 8
  benchmarkSource: {
    datasetVersion: string | null;
    note: string;              // copy oficial pt-PT
  };
}

export interface AdapterResult {
  data: ReportData;
  coverage: ReportCoverage;
  enriched: ReportEnriched;    // novo
}
```

A construção é determinística e pura, lendo apenas `payload.profile.{bio,avatar_url}`, `payload.posts[].{permalink,shortcode,mentions}`. Sem chamadas a Apify/DataForSEO/OpenAI.

### Componentes a criar (`src/components/report-enriched/`)

1. `report-enriched-bio.tsx` — bloco editorial fino renderizado **logo abaixo** da `BetaStrip` e antes do `<ReportPage />`. Mostra avatar real (img com fallback para gradiente da locked header), `@username`, link "Ver no Instagram" (`profileUrl`) e `bio` em parágrafo `text-content-secondary`. Esconde-se quando `bio` e `avatarUrl` são ambos nulos para evitar duplicação visual com o header.
2. `report-enriched-top-links.tsx` — renderizado **logo após** `<ReportPage />` e **antes** de `ReportMarketSignals`. Lista compacta dos 5 top posts com `↗ Abrir no Instagram` (link clicável usando `permalink`) e badge de formato. Caption truncada. Quando nenhum post tem permalink, esconde-se.
3. `report-enriched-mentions.tsx` — só renderiza se `mentionsSummary.length > 0`. Card editorial "Marcas e perfis mencionados", com chips `@handle · N menções` linkáveis para `https://www.instagram.com/{handle}/`. Subtil, máx. 8.
4. `report-enriched-benchmark-source.tsx` — pequena nota tipográfica (ícone `Info` + texto) inserida entre `<ReportPage />` e `report-enriched-top-links`. Copy:
   > "Benchmark editorial baseado em referências públicas de mercado e dataset interno versionado. A leitura deve ser interpretada como referência comparativa, não como média estatística absoluta."
   Mostra também `dataset {version}` quando disponível.
5. `report-enriched-competitors-cta.tsx` — só renderiza quando `coverage.competitors === "empty"`. Card editorial com:
   - Eyebrow: "Comparação com concorrentes"
   - Título: "Adicionar concorrentes para comparação"
   - Body: "A comparação com perfis concorrentes mostra contraste de envolvimento, formato dominante e ritmo de publicação. Adiciona até 2 concorrentes para ativar esta secção."
   - Botão visual `Adicionar concorrentes` com `href="#"` (sem submissão; placeholder estético).
   Inserido **depois** do `<ReportPage />`, perto da posição visual onde o `ReportCompetitors` mostraria a sua própria empty-state.
6. `report-enriched-copy.ts` — fonte única de verdade para os textos pt-PT (Acordo pós-90).

### Edição em `src/routes/analyze.$username.tsx` (não locked)

Ordem final dentro do `<div className="bg-surface-base min-h-screen">`:

```text
<CoverageStrip />
<TierStrip />
<BetaStrip />
<ReportEnrichedBio />               ← novo, só se bio/avatar reais
<ReportPage data={state.result.data} />
<ReportEnrichedBenchmarkSource />   ← novo, fonte/metodologia
<ReportEnrichedTopLinks />          ← novo, permalinks
<ReportEnrichedMentions />          ← novo, condicional
<ReportEnrichedCompetitorsCta />    ← novo, condicional (coverage.competitors === "empty")
<ReportMarketSignals />
<TierComparisonBlock />
<BetaFeedbackBlock />
```

Os companion components recebem `enriched` e `coverage` via props (sem context novo).

### Cruzamento Instagram × Pesquisa (item 7 do prompt)

**Fora de âmbito desta task.** O prompt original na conversa marca este item para **só ligar depois de OpenAI**, e exige chamada nova a DataForSEO (proibida nesta task). Já existe `ReportMarketSignals` que renderiza Google Trends a partir de `/api/market-signals`. O cruzamento real (correlacionar picos de IG com picos de pesquisa) fica para uma task dedicada quando OpenAI estiver ativo.

### Imagens reais dos posts

**Adiada por decisão do utilizador** ("não mexer ainda nas imagens dos posts, porque as thumbnails do Instagram podem expirar"). Mantém-se gradiente determinístico actual. Quando avançarmos, será via espelhamento para Supabase Storage.

## Fora de âmbito (intocado)

- Locked files (a menos que aprovado).
- `/report/example`, `report-page.tsx`, `report-mock-data.ts`, todos os `report-*` internos.
- `ReportPage` e `ReportDataProvider` — não ganham campos novos.
- Providers (Apify, DataForSEO, OpenAI), cache, market-signals server, ledger de custos, admin.
- PDF, email, billing, autenticação.
- Migrations e schema do Supabase.

## Validação

- `bunx tsc --noEmit`
- `bun run build`
- `/report/example` continua idêntico (zero edits a `report-mock-data.ts` ou componentes `report/*`).
- Sem chamadas a providers (apenas leitura do snapshot já em cache).
- Renderização do snapshot real em `/analyze/$username` continua a funcionar; novas secções aparecem apenas quando há dados reais para mostrar (graceful degradation).

## Checkpoint

- ☐ Confirmação: avanço com **companion sections** (sem editar locked) ou **autorizas edição direta dos locked**?
- ☐ Adapter estendido com bloco `enriched` (sem alterar `ReportData` locked)
- ☐ `report-enriched-bio.tsx` criado, condicional
- ☐ `report-enriched-benchmark-source.tsx` criado com copy oficial
- ☐ `report-enriched-top-links.tsx` criado com permalinks reais
- ☐ `report-enriched-mentions.tsx` criado, condicional
- ☐ `report-enriched-competitors-cta.tsx` criado, condicional
- ☐ `report-enriched-copy.ts` criado (pt-PT)
- ☐ `analyze.$username.tsx` integra os companions na ordem definida
- ☐ `/report/example` inalterado
- ☐ `bunx tsc --noEmit` passa
- ☐ `bun run build` passa
- ☐ Sem chamadas a Apify, DataForSEO, OpenAI, PDF ou email
