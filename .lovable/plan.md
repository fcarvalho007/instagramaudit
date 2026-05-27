# Auditoria — Actor Apify de fallback para `PROFILE_PERSONAL_NO_FEED`

Análise técnica e de custo. **Sem alterações de código.** Nenhum actor pago é chamado nesta fase — qualquer validação real fica explicitamente sujeita a aprovação prévia.

---

## 1. Actor atual e gap observado

- Primário: `apify/instagram-scraper` (em `src/lib/analysis/constants.ts:35` e `src/routes/api/analyze-public-v1.ts:95`).
- Comportamento conhecido: para perfis públicos **pessoais** (não profissionais), devolve `profile` com `postsCount > 0` mas `latestPosts = []`. Já classificado como `PROFILE_PERSONAL_NO_FEED` com cache negativa 24h.
- Caso real: `brunoremribeiro` — público, pessoal, sem feed devolvido.

---

## 2. Candidatos avaliados (oficiais Apify)

| Actor | Tipo | Devolve posts? | Devolve perfil? | Preço | Notas |
|---|---|---|---|---|---|
| `apify/instagram-post-scraper` | Oficial Apify | **Sim** (até N por username) | Não (só campos do post + owner) | **$1,00 / 1 000 posts** (pay-per-event) | README: *"any public profile"*. Aceita username, URL de perfil ou URL de post. 100% taxa de sucesso reportada. |
| `apify/instagram-profile-scraper` | Oficial Apify | Só `latestPosts` resumidos quando IG os expõe — mesmo limite estrutural do actor primário | Sim (bio, contadores, related) | $1,60 / 1 000 perfis | **Não resolve o gap**: usa a mesma API pública do feed que falha em pessoais. Útil só para enriquecer metadata. |
| `apify/instagram-scraper` (atual) | Oficial Apify | Sim para profissional, não para pessoal | Sim | já em uso | Continua como primário. |

**Recomendado: `apify/instagram-post-scraper`** — único oficial Apify que muda de estratégia de extração e tem boas hipóteses de cobrir perfis pessoais públicos. **Por confirmar empiricamente** (ver §8).

---

## 3. Input esperado (`apify/instagram-post-scraper`)

```json
{
  "username": ["brunoremribeiro"],
  "resultsLimit": 12,
  "onlyPostsNewerThan": "2024-01-01"   // opcional
}
```

- Aceita lista de usernames, URLs de perfil ou URLs de post.
- `resultsLimit` permite limitar a 12 (igual ao primário).

## 4. Mapeamento de output → contrato interno

Campo interno (`PublicAnalysisPost`) → campo do actor:

| Necessário | `instagram-post-scraper` | OK? |
|---|---|---|
| shortcode | `shortCode` | ✓ |
| permalink/url | `url` | ✓ |
| caption | `caption` | ✓ |
| timestamp | `timestamp` (ISO) | ✓ |
| likes | `likesCount` | ✓ |
| comments | `commentsCount` | ✓ |
| video views | `videoViewCount` / `videoPlayCount` | ✓ |
| format/type | `type` (`Image`/`Video`/`Sidecar`) + `productType` (`clips`/`feed`) | ✓ |
| thumbnail/display | `displayUrl` | ✓ |
| is_pinned | listado no README (📌 *Is it a pinned post?*), nome de campo a confirmar (provavelmente `isPinned`) | ⚠ confirmar |
| hashtags / mentions / taggedUsers / musicInfo | presentes | ✓ bónus |

**Profile-level metadata:** o post-scraper **não** devolve bio, followersCount, isPrivate, isVerified. → necessário **merge**: metadata do primário (`apify/instagram-scraper`, que já está disponível mesmo no caso "no feed") + posts do fallback.

## 5. Custo estimado por tentativa de fallback

- 12 posts × $1,00 / 1 000 = **$0,012 por análise** que cai no fallback.
- Cap recomendado: `maxItems: 12`, `maxTotalChargeUsd: 0.05` (margem para overheads).
- Timeout sugerido: 45 s (apifyTimeoutSecs) + 60 s polling máximo no `runActorWithMetadata`.

## 6. Riscos

1. **Não garantido** que o post-scraper consiga ler perfis pessoais que o primário falha — usa proxy/abordagem diferente mas pode partilhar bloqueios. Requer teste real numa sample (3–5 handles pessoais conhecidos, incluindo `brunoremribeiro`).
2. **Sem campo `isPrivate`/`isProfessional` nos posts** — depende-se totalmente da metadata do primário; se essa também faltar (ex.: `PROFILE_NOT_FOUND`), fallback não deve correr.
3. **Double charge**: se fallback corre sempre, dobra custo nos casos profissionais com 0 posts legítimos (raro mas possível). Mitigação: só accionar quando classificação for `PROFILE_PERSONAL_NO_FEED` (não em `PRIVATE` nem `NOT_FOUND`).
4. **Cache poisoning**: se fallback devolver lista vazia, não invalidar a cache negativa — manter os 24h.
5. **Pinned posts**: nome do campo precisa de validação no primeiro run real.
6. **Comments do post-scraper**: traz `firstComment` + `latestComments` (3 por post) — descartar para evitar inflar payload e custo cognitivo do OpenAI downstream.

## 7. Interação com cache negativa e gates

- Cache negativa actual (24h via `analysis_events` outcome=`not_found`) **continua a ser respeitada antes de qualquer chamada** ao primário ou ao fallback. Fallback **nunca** corre num hit de cache.
- Fallback corre **no máximo uma vez por handle por 24h** — mesma janela do negative cache, garantida pelo facto de só ser invocado durante o miss.
- Allowlist `APIFY_ALLOWLIST` e kill-switch `APIFY_ENABLED` aplicam-se também ao fallback (reutilizar `apify-allowlist.ts` e `apify-budget.server.ts`).
- Orçamento diário: adicionar `apify_post_scraper` ao `apify-budget` com cap próprio (sugestão: $0,50/dia em beta).

## 8. Estratégia recomendada (faseada)

```text
Fase 0  Validação manual (1 run, admin-only, custo ~$0.01)
        └── Chamar apify/instagram-post-scraper para brunoremribeiro
            via endpoint admin/perfis com flag "force_post_scraper".
            Confirmar: posts devolvidos, isPinned, ausência de bloqueios.

Fase 1  Feature flag admin-controlled (PERSONAL_NO_FEED_FALLBACK_ENABLED)
        └── Default OFF. Quando ON, accionar fallback apenas em
            PROFILE_PERSONAL_NO_FEED. Logar provider_call_logs com
            actor='apify/instagram-post-scraper'.

Fase 2  Auto-fallback em produção
        └── Após N runs bem-sucedidos e custo medido,
            mover flag para ON por defeito, manter kill-switch.
```

**Manter `PROFILE_PERSONAL_NO_FEED` como fallback final** quando:
- flag OFF;
- fallback também devolve 0 posts;
- fallback bloqueado por budget/allowlist.
A UX (copy empática + CTA "Analisar outro perfil") já está alinhada para esse desfecho.

## 9. Plano de implementação (quando aprovado)

```text
1. src/lib/analysis/constants.ts
   └── adicionar POST_SCRAPER_ACTOR = "apify/instagram-post-scraper"
       + POST_SCRAPER_MAX_ITEMS = 12 + POST_SCRAPER_MAX_USD = 0.05.

2. src/lib/analysis/post-scraper.server.ts  (novo)
   └── wrapper sobre runActorWithMetadata, normaliza output → PublicAnalysisPost[].

3. src/lib/analysis/normalize.ts
   └── helper mergePostsIntoProfile(profileFromPrimary, postsFromFallback).

4. src/routes/api/analyze-public-v1.ts
   └── no branch PERSONAL_NO_FEED (linhas ~818-838):
       - ler feature flag app_config('personal_no_feed_fallback_enabled');
       - se ON + allowlist + budget OK → chamar post-scraper;
       - se >=1 post: reclassificar para sucesso e gravar snapshot;
       - se 0 posts: manter PERSONAL_NO_FEED + cache negativa.

5. src/lib/security/apify-budget.server.ts
   └── nova chave de orçamento para o post-scraper.

6. Admin
   └── toggle em admin.sistema para a flag + indicador de custo/dia do fallback.

7. Testes (mocks, sem Apify real)
   └── unit: normalize merge; integration: branch fallback ON vs OFF;
       cost: cap maxTotalChargeUsd respeitado.

8. Docs/Memory
   └── actualizar mem://features/cost-source-of-truth com o segundo actor.
```

## 10. Resposta directa às 12 perguntas da auditoria

1. **`apify/instagram-post-scraper`** (oficial Apify).
2. Sim — aceita username, URL de perfil ou URL de post.
3. Sim — via `resultsLimit: 12`.
4. Todos cobertos excepto `isPinned` (a confirmar nome exacto no primeiro run real).
5. **Não** devolve metadata de perfil (bio/followers/isPrivate). Só posts + owner mínimo.
6. **Sim, merge obrigatório**: metadata vem sempre do primário; fallback contribui só com posts.
7. **~$0,012** por análise que cai no fallback (12 posts × $1/1000).
8. `apifyTimeoutSecs: 45`, polling 60 s, `maxItems: 12`, `maxTotalChargeUsd: 0.05`.
9. Bloqueios IG, lista vazia, double-charge em casos limítrofes, payload inchado de comments.
10. Fallback **nunca** corre em cache hit; quando corre, o seu próprio resultado (vazio ou cheio) é cacheado pelas mesmas 24h.
11. **Admin-controlled em beta** (feature flag default OFF), automático só depois de Fase 0 + Fase 1 validadas.
12. Sim — uma vez por handle por janela de 24h, garantido pelo negative cache.

## 11. Checkpoint de aprovação

- ☐ Aprovar Fase 0 (1 run manual admin, custo ~$0,01) em `brunoremribeiro`?
- ☐ Aprovar Fase 1 (flag admin-controlled, sem auto)?
- ☐ Confirmar orçamento diário do post-scraper em $0,50/dia para beta?
- ☐ Confirmar que `PROFILE_PERSONAL_NO_FEED` permanece como desfecho final quando fallback falha?
