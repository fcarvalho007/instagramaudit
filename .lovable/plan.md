
## Root cause (confirmed)

Em `src/routes/api/analyze-public-v1.ts:259-293`, o input do actor `apify/instagram-scraper` muda de forma incompatível quando há janela:

```ts
resultsType: cfg.onlyPostsNewerThan ? "posts" : "details",
...
maxItems: 1,
```

Comportamento real do actor:

- **`resultsType:"details"`** → cada item devolvido é um **profile object** (`username`, `followersCount`, `latestPosts[]` embebido, …). `normalizeProfile(row)` encontra `username` + `followersCount` → OK.
- **`resultsType:"posts"`** → cada item devolvido é um **post object** (`type`, `caption`, `ownerUsername`, `timestamp`, … sem `username` nem `followersCount` no shape esperado). Combinado com `maxItems: 1`, o run devolve **no máximo 1 post** (ou 0 se nenhum post cair no `onlyPostsNewerThan`).
  - 0 posts → `result.items[0] = undefined` → `primaryRow = null` → `normalizeProfile(null)` → null.
  - 1 post → `normalizeProfile` falha porque `pickString(raw.username)` é null (o post tem `ownerUsername`, não `username`) → return null.

Em ambos os casos o pipeline cai no `if (!primaryProfile)` na linha 1004 e devolve `PROFILE_NOT_FOUND`, apesar do Apify ter respondido 200 com sucesso (o que explica o `provider_call_logs` PASS, `posts_returned=0`, e crédito reservado/libertado correctamente).

Não é um bug do normalizer, do cache, dos créditos ou do gate Pro. É o `actorInput` que muda de modo sem o resto do pipeline acompanhar.

## Comparação das duas hipóteses

### A. Manter `resultsType:"details"` também em 30d/90d
- O actor em modo `details` devolve o **profile** com `latestPosts[]` (até ~12 posts recentes, independentemente de `resultsLimit`).
- Aplicar o filtro de janela **client-side** em `primaryPosts` (filtrar por `postTimestampMs > now - N days`).
- `onlyPostsNewerThan` em `details` é, na prática, ignorado pelo actor — o limite efectivo de posts é o que vier embebido (~12).

**Prós:** 1 só call por handle, profile garantido, sem PROFILE_NOT_FOUND falsos, custo idêntico ao baseline, mesmo path de normalização.
**Contras:** Para perfis muito activos, 30d/90d pode ficar limitado a ~12 posts (vs. 100/300 prometidos pelo `resultsLimit`). Janelas mais largas perdem profundidade. Em perfis com cadência baixa, 12 posts já cobrem 30d/90d e a perda é zero.

### B. Manter `resultsType:"posts"` e fazer um segundo call em `details`
- Call 1 (`details`, `maxItems:1`) → profile shell + latestPosts baseline.
- Call 2 (`posts`, `maxItems: resultsLimit`, `onlyPostsNewerThan`) → posts dentro da janela.
- Merge no pipeline: profile vem do call 1, `primaryPosts` vem do call 2.

**Prós:** Honra `resultsLimit:100/300` real, dá profundidade total na janela, profile sempre presente.
**Contras:** **Custo ~2× por análise Pro** (dois runs Apify por handle), mais latência (2 timeouts a somar), mais código em pipeline + logging (`provider_call_logs` duplicados), mais superfície de erro parcial (call 1 OK / call 2 falha), mais complexidade no cache_key.

## Recomendação MVP

**Opção A** — manter `resultsType:"details"` sempre, remover o ternário, e filtrar `primaryPosts` por data no servidor antes de `computeContentSummary`. Trade-off aceitável para PR1 porque:

1. Fiabilidade total: zero PROFILE_NOT_FOUND falsos.
2. Custo Apify igual a baseline (não duplica).
3. Permite validar A/B/C/D já no próximo turno sem novo gasto incremental.
4. Mantém o gate Pro (`report_full_9`) e o consumo de 1 crédito como diferenciadores — o valor Pro fica em "janela analítica + insights pagos" e não em "número bruto de posts".
5. Se mais tarde se confirmar via dados que o limite de ~12 posts é insuficiente para Pro, evolui-se para Opção B num PR posterior, com o pipeline já estável.

## Comportamento esperado após o fix

| Cenário | Resposta esperada |
|---|---|
| Profile encontrado, posts ≥ 1 dentro da janela | `success:true`, posts filtrados por data, `data_source:"fresh"` ou `cache` |
| Profile encontrado, 0 posts dentro da janela (mas tem posts mais antigos) | `success:true`, `primaryPosts=[]`, `content_summary` baseado em 0 posts, métricas de profile normais. **NÃO** devolver `PROFILE_PERSONAL_NO_FEED` neste caso — o feed existe, só não tem posts recentes. Precisa de novo error code ou de devolver sucesso com summary vazio (ver "Decisão pendente"). |
| Profile encontrado, 0 posts em absoluto + business → personal/private | mantém `PROFILE_PERSONAL_NO_FEED` / `PROFILE_PRIVATE` (lógica linhas 1043-1064 não muda) |
| Profile realmente inexistente (404 Apify) | `PROFILE_NOT_FOUND` (caminho legítimo, via `ApifyUpstreamError.status===404`) |

## Decisão pendente (antes de implementar)

A lógica actual em `linhas 1043-1064` interpreta `primaryPosts.length === 0` como "perfil sem feed" (private / personal). Com janelas, 0 posts em 30d pode ser apenas "esteve em pausa", não "sem feed". Duas vias:

- **B1** Aplicar a classificação private/personal **só** quando `window === "baseline"`. Para 30d/90d, devolver `success:true` com summary vazio + flag `no_posts_in_window`.
- **B2** Aplicar sempre a classificação actual — mais simples, mas mostra "perfil privado" para utilizadores Pro que só estiveram inactivos 30 dias. UX errada.

Recomendação: **B1**.

## Ficheiros a editar

1. `src/routes/api/analyze-public-v1.ts`
   - `fetchProfileWithPosts` (≈259-298): remover o ternário; `resultsType:"details"` fixo; `resultsLimit` continua a vir do config (afecta latestPosts embebido).
   - Bloco `try { … }` (≈1029-1064): aplicar filtro `onlyPostsNewerThan` (ms) sobre `primaryPosts` quando `primaryWindowCfg !== baseline`; ajustar a classificação private/personal para correr apenas em baseline (decisão B1).

2. (Opcional) `src/lib/analysis/window-configs.ts`: actualizar o comentário em `resultsLimit` para reflectir que em modo `details` o cap real é o do actor (~12), não 100/300. Não altera comportamento.

Nada toca em: créditos, EuPago, checkout, preços, schema, UI, `normalize.ts`, cache layer, gate Pro, snapshot persistence.

## Prompt exacto para o próximo turno (build mode)

> Em build mode, aplica o fix MVP A em `src/routes/api/analyze-public-v1.ts`:
>
> 1. Em `fetchProfileWithPosts`, substituir `resultsType: cfg.onlyPostsNewerThan ? "posts" : "details"` por `resultsType: "details"` fixo. Manter `resultsLimit`, `addParentData:false`, `maxItems:1`, `maxTotalChargeUsd`, e continuar a passar `onlyPostsNewerThan` no `actorInput` quando definido (o actor ignora-o em details, mas mantém-se por consistência e diagnóstico futuro).
> 2. No bloco que extrai `primaryPosts` (≈linhas 1029-1037), aplicar filtro client-side quando `primaryWindowCfg.onlyPostsNewerThan` está definido: parsear "30 days" / "90 days" → ms, e filtrar `primaryPosts` por `postTimestampMs(post) >= Date.now() - windowMs`. Usar `postTimestampMs` já exportado de `src/lib/analysis/normalize.ts`.
> 3. Ajustar o bloco `if (primaryPosts.length === 0)` (≈linhas 1043-1064): só correr a classificação `PROFILE_PERSONAL_NO_FEED` / `PROFILE_PRIVATE` quando `window === "baseline"`. Para 30d/90d, prosseguir o fluxo normal com `primaryPosts: []` e deixar `computeContentSummary` produzir summary vazio.
> 4. Não tocar em créditos, EuPago, checkout, preços, schema, UI, normalize, snapshot ou cache.
> 5. Após o edit, voltar ao Chat Mode e dar luz verde para o utilizador correr B/C/D no browser. Não executar 90d. Não usar INTERNAL_API_TOKEN.
