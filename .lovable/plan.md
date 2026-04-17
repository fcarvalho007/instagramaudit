
Já tenho a informação no excerpt do `apify-client.ts` (constants no topo de `analyze-public-v1.ts`). Confirmo por leitura direta.

## Resposta

**1. Actor IDs em uso (reais, no código atual)**

```ts
const PROFILE_ACTOR = "apify/instagram-profile-scraper";
const POST_ACTOR    = "apify/instagram-post-scraper";
```

**2. Ficheiro onde estão definidos**

- `src/routes/api/analyze-public-v1.ts` (linhas ~38-39, constantes no topo do módulo)
- Cliente HTTP genérico que os invoca: `src/lib/analysis/apify-client.ts` (recebe `actorId` como argumento, não hardcoda IDs)

Não existem outras referências a actor IDs no código de produção.

**3. Configuração atual**

- ❌ NÃO usa `apify/instagram-scraper` (o actor unificado)
- ✅ USA `apify/instagram-profile-scraper` + `apify/instagram-post-scraper` (dois actors separados, chamados em sequência: profile batch → posts por handle em paralelo)
- ❌ Nada mais

**4. Match com o screenshot Apify**

Não tenho acesso ao screenshot — só vejo o codebase. Para confirmar match preciso que digas qual o actor que aparece no teu dashboard Apify (o nome exato, ex.: `apify/instagram-scraper` vs `apify/instagram-profile-scraper`). 

**Cenários:**

| Screenshot mostra | Match? | Implicação |
|---|---|---|
| `apify/instagram-profile-scraper` E `apify/instagram-post-scraper` (ambos) | ✅ Match total | Plano Creator deve cobrir — re-correr smoke test |
| Só `apify/instagram-scraper` (unificado) | ❌ Mismatch | Plano cobre o errado; código continua a chamar dois actors que o teu plano pode não cobrir |
| Só `apify/instagram-profile-scraper` (sem post-scraper) | ⚠️ Match parcial | Profile passa, posts falham → snapshot fica vazio |
| Outro actor (ex.: comunitário) | ❌ Mismatch total | Bloqueador continua |

**5. Plano Creator suficiente?**

Não posso responder definitivamente sem saber o que o screenshot mostra. Mas com base apenas no que está no código:

- O código depende de **DOIS actors oficiais Apify** (`instagram-profile-scraper` + `instagram-post-scraper`).
- Se o teu plano Creator cobrir ambos → ✅ desbloqueado.
- Se cobrir só um → ⚠️ falha parcial garantida (snapshot sem posts ou sem profile).
- Se cobrir o `instagram-scraper` unificado em vez destes dois → ❌ continua bloqueado, porque o código não chama esse actor.

## Próxima ação que preciso de ti

Diz-me literalmente o nome/ID do actor que aparece no screenshot do teu dashboard Apify (ex.: "apify/instagram-scraper", "apify/instagram-profile-scraper", etc.). Com isso fecho o diagnóstico em uma linha.

## Guardrails

| | |
|---|---|
| Zero código novo | ✅ |
| Zero refactor | ✅ |
| Apenas leitura + report | ✅ |
| Locked files intactos | ✅ |
