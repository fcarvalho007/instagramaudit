## Auditoria — o que está hardcoded hoje

### A. Já salvaguardado (sem ação)

| Item | Onde vive | Estado |
|---|---|---|
| Apify allowlist / kill-switch | secrets `APIFY_*` | OK |
| OpenAI / DataForSEO allowlist + caps | secrets `*_ALLOWLIST`, tabela `app_config` (`cost_cap_*`) | OK |
| Admin allowlist | secret `ADMIN_ALLOWED_EMAILS` | OK |
| Benchmarks numéricos | `benchmark_references`, `knowledge_benchmarks` | OK |
| Notas/fontes de conhecimento | `knowledge_notes`, `knowledge_sources` | OK |
| Caps de custo (Apify/DFS/OpenAI) | `app_config.cost_cap_*` | OK |
| Modo de execução (`fresh` vs `cache_only`) | `app_config.analysis_execution_mode` | OK |
| Copy editorial e UI | i18n JSON (`src/i18n/locales/{pt,en}/*`) | OK — deve mesmo viver em código versionado |
| Páginas legais (termos, privacidade, cookies, aviso) | rotas `src/routes/*.tsx` | OK — versionado via git |

### B. Risco real (queremos mover/centralizar)

1. **`FREE_MONTHLY_LIMIT = 2`** em `src/lib/quota.ts`
   - Hardcoded. Para mudar o limite mensal de relatórios grátis na fase beta é preciso deploy.
   - Já existe a tabela `app_config`. Falta ler de lá.

2. **Email de contacto `hello@instabench.pt`** repetido em 5 sítios:
   - `src/components/layout/footer.tsx`
   - `src/components/product/report-gate-modal.tsx` (3×)
   - `src/components/product/post-analysis-conversion-layer.tsx` (2×, com subject/body)
   - Risco: trocar o domínio do contacto obriga a varrer 5+ ficheiros.
   - Solução pragmática: um único módulo `src/lib/brand/contact.ts` que exporta `CONTACT_EMAIL`, `mailtoPro`, `mailtoAgency`, lendo opcionalmente de `app_config.contact_email` quando definido (com fallback estático).

3. **Etiqueta "Em breve · Julho 2026"** no botão Comparar (i18n `hero.actions.coming_soon_detail`)
   - Quando a funcionalidade lançar, é preciso editar JSON + deploy.
   - Solução: feature flag `feature_compare_competitors_enabled` em `app_config`. Quando `true`, o hero esconde a badge e ativa o botão; quando `false`, mantém badge com texto do i18n.

4. **Fallback `admin@instabench.pt`** em `src/routes/admin.report-lab.tsx:420`
   - Hardcoded mas é só um placeholder visual. Vamos remover o fallback e deixar string vazia (o painel já obriga a login admin upstream).

## Alterações desta iteração

### 1. Schema (`app_config`)

Migração: garantir que existem (idempotente) as chaves:

- `free_monthly_report_limit` — default `'2'`
- `contact_email` — default `'hello@instabench.pt'`
- `feature_compare_competitors_enabled` — default `'false'`

(Mantém o esquema atual: `key text PK, value text, updated_by text, updated_at`.)

### 2. Server function de leitura

Novo `src/lib/config/app-config.functions.ts`:

```ts
export const getPublicAppConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("key,value")
      .in("key", [
        "free_monthly_report_limit",
        "contact_email",
        "feature_compare_competitors_enabled",
      ]);
    return {
      freeMonthlyReportLimit: Number(map.free_monthly_report_limit ?? 2),
      contactEmail: map.contact_email ?? "hello@instabench.pt",
      compareEnabled: map.feature_compare_competitors_enabled === "true",
    };
  });
```

Expor via TanStack Query (`queryOptions`, key `["app-config","public"]`, `staleTime: 5 min`).

### 3. Wiring no servidor

`src/routes/api/request-full-report.ts` passa a ler `free_monthly_report_limit` de `app_config` em vez da constante.

### 4. Wiring no cliente

- `src/lib/quota.ts` mantém o export `FREE_MONTHLY_LIMIT` como **fallback** (compat), mas adiciona `useFreeMonthlyLimit()` hook que consome o `useQuery` do config.
- `ReportGateModal` passa a usar `useFreeMonthlyLimit()` e `useContactEmail()`.
- `footer.tsx` e `post-analysis-conversion-layer.tsx` passam a importar `CONTACT_EMAIL` do novo módulo (com a hook ou constante consoante seja componente client).
- `report-hero-v2.tsx`: se `compareEnabled` for `true`, esconde a badge "Em breve · Julho 2026" e abre fluxo real (placeholder por agora — só remove a badge). Por defeito (`false`), comportamento atual.

### 5. UI admin (opcional, mas barato)

Em `src/routes/admin.config.tsx` (se já existir, caso contrário adicionar à página de admin existente), expor as 3 chaves novas como inputs editáveis usando a tabela `app_config` (o admin já edita as outras chaves de cap).

## Fora de âmbito desta iteração

- Não mover copy editorial nem páginas legais para DB (versionado em código é melhor).
- Não tocar em benchmarks, knowledge, allowlists, caps — já estão em DB/secrets.
- Não introduzir nova feature flag para o botão PDF (já está ativo desde a iteração anterior).
- Não criar UI de gestão de copy do produto (a tradução deve continuar em i18n).

## Validação

- `bunx tsc --noEmit`.
- `supabase--read_query` confirma as novas chaves em `app_config`.
- QA visual: gate modal mostra "X de N relatórios" usando o limite vindo de DB; footer e CTAs Pro/Agency continuam a abrir mailto para `hello@instabench.pt`.

## Checkpoint

- ☐ Migração `app_config` inserindo as 3 chaves novas (idempotente).
- ☐ `src/lib/config/app-config.functions.ts` + `queryOptions`.
- ☐ `src/lib/brand/contact.ts` com `CONTACT_EMAIL`, `mailtoPro`, `mailtoAgency`.
- ☐ `request-full-report.ts` lê limite de DB; constante fica como fallback.
- ☐ `ReportGateModal`, `footer`, `post-analysis-conversion-layer`, `report-hero-v2` consomem os novos hooks/constantes.
- ☐ Remover fallback `admin@instabench.pt` em `admin.report-lab.tsx` (passa a `""`).
- ☐ `bunx tsc --noEmit` limpo.

## Pergunta antes de avançar

Confirma:

1. **Limite de relatórios grátis** mantém valor inicial `2` em DB (igual ao atual)?
2. **Email de contacto** fica `hello@instabench.pt` em DB?
3. **Botão Comparar concorrente** mantém-se como teaser (badge "Em breve · Julho 2026"), ou queres já transformar em feature flag editável e mudar o texto da badge para um label genérico "Em breve" (sem data fixa)?
