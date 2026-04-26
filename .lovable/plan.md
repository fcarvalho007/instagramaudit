## Objetivo

Aplicar apenas as correções mínimas exigidas pela auditoria pré-Apify, para tornar o sistema seguro e fiável antes de subscrever o plano Apify Starter. Sem novas features. Sem alterações ao `/report.example`. Sem alterações ao landing público nem ao `/analyze/$username` (exceto a já existente exibição de erros).

---

## 1. Logging fiável (fire-and-forget pode perder eventos no Worker)

**Problema (auditoria):** O handler usa `void ipHashPromise.then(...).then(recordAnalysisEvent)` em todos os caminhos críticos. No runtime Cloudflare Worker, qualquer trabalho assíncrono pendente quando a `Response` é enviada pode ser cancelado — perdendo logs de `provider_disabled`, `blocked_allowlist`, `cache hit`, `fresh success` e `provider_error`. Isso quebra o cockpit e a vigilância de custos no momento exato em que o Apify estiver ativo.

**Correção (mínima e segura):**

- Em `src/routes/api/analyze-public-v1.ts`:
  - Manter a função `logEvent`, mas torná-la `async` e devolver a `Promise` da gravação (ainda concatenada com `evaluateAlertsForEvent`).
  - Antes de **cada `return`** dos caminhos críticos, fazer `await logEvent({...})`. Caminhos abrangidos:
    - `invalid_input` (JSON inválido + Zod inválido)
    - `blocked_allowlist`
    - `provider_disabled` (incluindo o ramo stale-fallback)
    - `cache hit` (sucesso `data_source: "cache"`)
    - `fresh success`
    - `not_found` (pré-stale e pós-provider)
    - `provider_error` (`UPSTREAM_UNAVAILABLE`, `UPSTREAM_FAILED`)
    - `stale` servido após falha do provedor
  - O `await` é envolvido num `try/catch` interno que só faz `console.error` — falhar a gravar **nunca** pode crashar a resposta pública.
  - `recordAnalysisEvent` e `recordProviderCall` já fazem `try/catch` interno e devolvem `null` em erro, portanto não há risco de bloqueio fatal.
  - Os segredos continuam protegidos — o helper `sanitizeErrorExcerpt` já está em uso e nada de novo é exposto.

- `src/lib/analysis/events.ts` não precisa de alterações — já é resiliente.

**Impacto na latência:** A gravação extra é uma única RPC Supabase (alguns ms). Aceitável face ao custo de perder um evento no cockpit.

---

## 2. Compatibilidade do payload do actor Apify

**Resultado da auditoria:** O actor escolhido é `apify/instagram-scraper` com payload:
```json
{
  "directUrls": ["https://www.instagram.com/<handle>/"],
  "resultsType": "details",
  "resultsLimit": 12,
  "addParentData": false
}
```

Este formato é **exatamente** o esperado pelo actor `apify/instagram-scraper` para devolver detalhes do perfil com `latestPosts[]` embebido. Cumpre os critérios:
- `actor: apify/instagram-scraper` mantido.
- `POSTS_LIMIT = 12` mantido.
- Uma chamada por handle mantida.
- Concorrentes opcionais e isolados via `Promise.allSettled`-equivalente mantidos.

**Conclusão:** Nada a mudar aqui. Documentar este facto no relatório final é suficiente. Sem edição de ficheiros.

---

## 3. Precisão do admin

**Problema (auditoria):** O painel **Diagnóstico** mostra `Kill-switch: Ativo/Desligado` mas a etiqueta é ambígua — "Ativo" pode ser lido como "kill-switch ativo = bloqueado" ou "Apify ativo = a chamar". Isso induz erro operacional na altura mais crítica (subscrição Apify).

**Correção (mínima e isolada a `src/components/admin/cockpit/panels/diagnostics-panel.tsx`):**

- Renomear o `KV` "Kill-switch" para `APIFY_ENABLED`.
- Trocar o texto do badge:
  - `data.apify.enabled === true` → badge variant `success`, texto **"Ligado · chamadas reais"**.
  - `data.apify.enabled === false` → badge variant `warning`, texto **"Desligado · sem chamadas"**.
- Adicionar um único `KV` adjacente "Modo de teste" reaproveitando `data.testing_mode.active` (badge `accent` "Allowlist ativa" / `default` "Aberto"). Já existe a secção dedicada "Modo de teste" mais abaixo, mas o operador precisa ver os dois sinais lado a lado no topo para decidir antes de subscrever o Apify.

Sem novas tabs. Sem redesenho. Sem alterações a `cockpit-shell.tsx`, `cockpit-types.ts`, ou `/api/admin/diagnostics.ts` (a API já devolve ambos os campos).

---

## 4. Restrições estritas (sem alterações)

- `/report.example` — intacto.
- Componentes de relatório, PDF, email — intactos.
- Landing pública — intacta.
- `/analyze/$username` — sem alterações de UI.
- `apify-allowlist.ts`, `apify-client.ts`, `cost.ts`, `cache.ts` — sem alterações.
- Sem migrações de DB.
- Sem novas dependências.
- Sem novas variáveis de ambiente.

---

## 5. Validação pós-implementação

1. `bunx tsc --noEmit` (TypeScript check).
2. `bun run build` se disponível.
3. Smoke test mental:
   - **`APIFY_ENABLED=false`** → `/api/analyze-public-v1` devolve `PROVIDER_DISABLED` para handles allowlistados e regista evento `provider_disabled`. Admin Diagnóstico mostra "Desligado · sem chamadas".
   - **Allowlist bloqueado** → handle fora da allowlist devolve `PROFILE_NOT_ALLOWED` e regista `blocked_allowlist`. Sem chamada ao Apify.
   - **`APIFY_ENABLED=true` + allowlist com `frederico.m.carvalho`** → primeira análise é `fresh success`, regista evento + `provider_call_logs`. Segunda análise no mesmo cache key é `cache hit`. Apify só é invocado para handles allowlistados enquanto `APIFY_TESTING_MODE !== "false"`.

---

## 6. Ficheiros a editar

1. `src/routes/api/analyze-public-v1.ts` — tornar `logEvent` aguardável e `await` antes de cada `return` crítico, dentro de um `try/catch` que apenas regista no `console.error`.
2. `src/components/admin/cockpit/panels/diagnostics-panel.tsx` — etiqueta `APIFY_ENABLED` clara + KV adjacente para modo de teste.

Sem outros ficheiros tocados.

---

## 7. Resposta final ao utilizador (após a edição)

O resumo final irá conter:
1. Lista exata de ficheiros alterados.
2. O que foi corrigido (ponto a ponto).
3. Como testar com `APIFY_ENABLED=false`.
4. Como testar a allowlist bloqueada.
5. Como testar com `APIFY_ENABLED=true`.
6. Confirmação explícita de que o Apify só é chamado para `frederico.m.carvalho` enquanto o modo de teste estiver ativo (e a allowlist contiver apenas esse handle).
