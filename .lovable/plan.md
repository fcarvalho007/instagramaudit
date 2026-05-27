
# Auditoria + hardening de `PROFILE_PERSONAL_NO_FEED`

## Estado atual (já implementado)

A maioria do trabalho já está em produção. Esta auditoria valida o que existe, corrige o que falta e adiciona testes — sem mexer no Apify nem na schema.

| Requisito | Estado | Localização |
|---|---|---|
| Code existe em `PublicAnalysisErrorCode` | OK | `src/lib/analysis/types.ts:117` |
| HTTP 422 | OK | `analyze-public-v1.ts:142` |
| Distinto de `PROFILE_PRIVATE` / `PROFILE_NOT_FOUND` / `CACHE_ONLY_NO_DATA` | OK | enum + handler |
| `POSTS_UNAVAILABLE` apenas em `CompetitorErrorCode` (não conflita) | OK | `types.ts:54` |
| Heurística (não-privado + não-profissional + `posts_count>0` + `latestPosts.length===0`) | OK | `analyze-public-v1.ts:818-838` |
| Cache negativo 24h via `analysis_events` | OK | `analyze-public-v1.ts:569-623` |
| `AnalysisErrorState` esconde "Tentar novamente" | OK | `analysis-error-state.tsx:42,85` |
| i18n PT/EN | Existe mas precisa de afinação (ver §2) | `i18n/locales/{pt,en}/errors.json` |
| Testes dedicados | A FAZER | `src/routes/api/__tests__/` |

## §1 Heurística — confirmação textual

Em `analyze-public-v1.ts:818-838`:

```ts
const looksPersonalNoFeed =
  !isPrivateFlag && !isProfessional && profilePostsCount > 0;
const errorCode = looksPersonalNoFeed
  ? "PROFILE_PERSONAL_NO_FEED"
  : "PROFILE_PRIVATE";
```

Condições cumpridas: perfil existe (já passou em `PROFILE_NOT_FOUND`), `is_private/private` ambos falsos, `is_business` falso/ausente, `posts_count > 0`, `latestPosts.length === 0`. Os campos `is_business`, `posts_count` são lidos via `normalizeProfile` com fallback seguro (opcionais no tipo). Linguagem cautelosa já aplicada nos comentários ("almost certainly", "may happen").

## §2 Ajustes mínimos a aplicar

### 2.1 UX copy — mensagem mais empática e neutra

Substituir a mensagem atual (que diz "pede ao dono para mudar") por uma versão menos acusatória, conforme pedido. O título passa a ter chave própria em `analyze.json` para não reutilizar o título genérico.

**`src/i18n/locales/pt/errors.json`** — substituir entrada `PROFILE_PERSONAL_NO_FEED`:
> "O perfil parece estar público, mas não conseguimos obter publicações recentes através da nossa fonte de dados. Isto pode acontecer com alguns perfis pessoais ou contas sem feed acessível para análise. A ferramenta funciona melhor com perfis públicos Creator ou Empresa."

**`src/i18n/locales/en/errors.json`** — equivalente EN.

**`src/i18n/locales/pt/analyze.json`** + `en/analyze.json` — acrescentar bloco:
```json
"personalNoFeed": {
  "title": "Não foi possível analisar este perfil",
  "cta": "Analisar outro perfil"
}
```

**`analyze-public-v1.ts:121`** — alinhar `ERROR_MESSAGES.PROFILE_PERSONAL_NO_FEED` à nova copy PT (a mensagem da API é o que o frontend recebe via `message`).

### 2.2 `AnalysisErrorState` — usar título/CTA específicos

Em `analysis-error-state.tsx`:
- quando `isPersonalNoFeed`, renderizar `t("error.personalNoFeed.title")` em vez do título genérico;
- alterar o label do botão "back" para `t("error.personalNoFeed.cta")` neste caso ("Analisar outro perfil");
- mantém `<Link to="/">` (já é o destino correcto para nova análise).

### 2.3 (Opcional, NÃO implementar agora) `data_source = "negative_cache"`

O hit do cache negativo regista hoje `dataSource: "cache"` + `outcome: "not_found"`. O tipo `AnalysisDataSource` não inclui `"negative_cache"` e adicioná-lo implica migração + alterar CHECK constraints (se houver). Documentar como follow-up — o `error_code` já permite distinguir em admin (filtro `error_code = 'PROFILE_PERSONAL_NO_FEED' AND data_source = 'cache'`). **Sem alteração nesta entrega.**

## §3 Observabilidade — confirmação

Já registado por `logEvent` em todos os ramos:
- 1ª chamada: `data_source=fresh`, `outcome=not_found`, `error_code=PROFILE_PERSONAL_NO_FEED`, `provider_call_log_id` ligado, `estimated_cost_usd` ≈ custo Apify real.
- 2ª chamada dentro de 24h: `data_source=cache`, `outcome=not_found`, `error_code=PROFILE_PERSONAL_NO_FEED`, `estimated_cost_usd=0`, **sem** `provider_call_log_id` (porque não há chamada Apify).

Cockpit admin já mostra estes eventos em `recent_events` (cockpit-types.ts → `RecentEventRow`).

## §4 Testes a adicionar

Ficheiro novo: **`src/routes/api/__tests__/analyze-public-v1-personal-no-feed.test.ts`**

Vitest puro, sem importar a rota (que arrasta deps Worker). Testa a heurística reproduzindo-a localmente E faz testes de contrato em torno do código de erro:

1. **`heuristic › classifica como PERSONAL_NO_FEED`** — `is_private=false`, `is_business=false`, `posts_count>0`, `latestPosts=[]` → resultado esperado `PROFILE_PERSONAL_NO_FEED`.
2. **`heuristic › classifica como PRIVATE` (fallback)** — `is_private=true` ou `posts_count=0` → `PROFILE_PRIVATE`.
3. **`heuristic › conta profissional vazia` (fallback)** — `is_business=true`, `latestPosts=[]` → `PROFILE_PRIVATE`.
4. **`contract › HTTP_STATUS mapping`** — `HTTP_STATUS.PROFILE_PERSONAL_NO_FEED === 422`, distinto de PRIVATE (404) e NOT_FOUND (404).
5. **`contract › error_code distinto`** — code está em `PublicAnalysisErrorCode` e não colide com `CompetitorErrorCode`.

Ficheiro novo: **`src/routes/api/__tests__/analyze-public-v1-negative-cache.test.ts`**

Mock de `supabaseAdmin.from("analysis_events").select(...)` com `vi.mock`. Testa a função de lookup isolada (extraída ou reproduzida inline) — não chama o handler completo. Asserções:

6. **lookup encontra evento `PROFILE_PERSONAL_NO_FEED` < 24h** → devolve o code; handler simulado devolveria `failure(code)` sem chamar `runActorWithMetadata`.
7. **lookup com evento > 24h** → devolve `null` → handler prosseguiria para Apify.
8. **lookup com evento `PROFILE_PRIVATE`** → também faz short-circuit (mesmo comportamento).
9. **lookup falha (erro Supabase)** → devolve `null` (best-effort, não bloqueia).

Ficheiro novo: **`src/components/product/__tests__/analysis-error-state.test.tsx`** (`@testing-library/react` já no projecto):

10. **`PROFILE_PERSONAL_NO_FEED` esconde botão "Tentar novamente"** e mostra "Analisar outro perfil".
11. **`PROFILE_PRIVATE` mostra botão de retry** (controlo).
12. **`CACHE_ONLY_NO_DATA` esconde retry e mostra "Voltar"** (controlo já existente).

Ficheiro novo: **`src/i18n/__tests__/personal-no-feed-copy.test.ts`**:

13. **PT/EN têm `PROFILE_PERSONAL_NO_FEED`** em `errors.json`.
14. **PT/EN têm `error.personalNoFeed.title` e `error.personalNoFeed.cta`** em `analyze.json`.
15. **Copy PT não tem brasileirismos** (`telemóvel|ecrã|utilizador` — sanity: ausência de `usuário|tela|você`).

## §5 Validação final

```
bunx tsc --noEmit
bunx vitest run
```

Relatório final no chat com:
- mapeamento código→ficheiro de cada requisito do pedido;
- output de `vitest` (passados/falhados);
- copy PT/EN final renderizada;
- nota sobre o follow-up `data_source=negative_cache` (não feito).

## Ficheiros tocados

- `src/i18n/locales/pt/errors.json` (alterar mensagem)
- `src/i18n/locales/en/errors.json` (alterar mensagem)
- `src/i18n/locales/pt/analyze.json` (novo bloco `personalNoFeed`)
- `src/i18n/locales/en/analyze.json` (novo bloco `personalNoFeed`)
- `src/routes/api/analyze-public-v1.ts` (alinhar `ERROR_MESSAGES`, comentário)
- `src/components/product/analysis-error-state.tsx` (título + CTA específicos)
- `src/routes/api/__tests__/analyze-public-v1-personal-no-feed.test.ts` (novo)
- `src/routes/api/__tests__/analyze-public-v1-negative-cache.test.ts` (novo)
- `src/components/product/__tests__/analysis-error-state.test.tsx` (novo)
- `src/i18n/__tests__/personal-no-feed-copy.test.ts` (novo)

## Não tocado (constraints respeitadas)

- ❌ Nenhuma migração de BD, nenhuma alteração de schema, nenhuma nova tabela.
- ❌ Nenhuma alteração ao actor Apify, parâmetros, custos, allowlist.
- ❌ Nenhuma alteração a pricing, gates, emails, CRM admin, prompts OpenAI.
- ❌ Nenhuma chamada Apify real nos testes — fixtures/mocks apenas.

## Checkpoint

- ☐ Mensagens PT/EN actualizadas com copy empática
- ☐ `personalNoFeed.title` + `cta` em `analyze.json` (PT/EN)
- ☐ `AnalysisErrorState` usa título/CTA específicos quando `PROFILE_PERSONAL_NO_FEED`
- ☐ 4 ficheiros de teste novos (heurística, cache negativo, UI, i18n)
- ☐ `bunx tsc --noEmit` passa
- ☐ `bunx vitest run` passa
- ☐ Relatório final com mapeamento requisito→código
