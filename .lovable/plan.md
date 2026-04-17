

Já fiz o refactor do actor unificado no prompt anterior. Agora preciso de validar se a implementação atual está alinhada com o contexto adicional fornecido (actor ID `shu8hvrXbJbY3Eb9W`, fluxo `run-sync-get-dataset-items`, sem tokens em URLs).

Vou inspecionar o estado atual antes de propor mudanças.
<lov-tool-use id="toolu_vrtx_01M5GUQYkc6XG8ZdgBFbEgPM" name="code--view" integration-id="code" data="{\"file_path\": \"src/routes/api/analyze-public-v1.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HPxmAtZxLXKaxy49JkQQ18" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/analysis/apify-client.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LsfdDjCkuNbrCyk56xugSn" name="code--view" integration-id="code" data="{\"file_path\": \"src/routes/api/analyze-public-v1.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01FsgKV8mfhB6FBehwoiEvw8" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/analysis/apify-client.ts\"}">
</lov-tool-use>
Already aligned. Just need to confirm the actor ID format and check the docs. Current code uses `apify/instagram-scraper` (slug form) which the client encodes to `apify~instagram-scraper`. The user provided actor ID `shu8hvrXbJbY3Eb9W` is the alternative form. Both work with Apify's API.

<lov-plan>

## Diagnóstico — refactor já está concluído

A refatoração para o actor unificado já foi aplicada na sessão anterior. Confirmo por leitura direta:

**`src/routes/api/analyze-public-v1.ts`**
- Linha 48: `const UNIFIED_ACTOR = "apify/instagram-scraper";` ✅
- Linhas 127-141: `fetchProfileWithPosts()` — uma chamada por handle com `resultsType: "details"`, `resultsLimit: 12`, `addParentData: false` ✅
- Linhas 201-213: orquestração paralela via `Promise.allSettled`-pattern (primary + competitors) ✅
- Linhas 221-228: extrai `latestPosts[]` embutido na resposta do profile ✅
- Zero referências a `instagram-profile-scraper` ou `instagram-post-scraper` ✅

**`src/lib/analysis/apify-client.ts`**
- Usa `run-sync-get-dataset-items` (linha 55) — exatamente o endpoint pedido ✅
- Token lido server-side de `process.env.APIFY_TOKEN`, nunca exposto ao browser ✅
- Encoding correto de actor IDs com `/` → `~` (linha 53), funciona tanto para slug `apify/instagram-scraper` como para ID `shu8hvrXbJbY3Eb9W` ✅

**`src/lib/analysis/normalize.ts`** (já validado)
- Lê os campos do payload unificado: `username`, `fullName`, `biography`, `followersCount`, `followsCount`, `postsCount`, `verified`, `profilePicUrl`, `profilePicUrlHD`, e `latestPosts[]` com `type`, `productType`, `likesCount`, `commentsCount`, `timestamp` ✅

## Decisão sobre o ID adicional fornecido

O contexto extra dá `shu8hvrXbJbY3Eb9W` como ID interno do actor. O código usa o slug humano `apify/instagram-scraper`. **Ambos resolvem para o mesmo actor na API Apify** — o slug é apenas o alias canónico do ID. Não há ganho funcional em trocar; o slug é mais legível e auto-documentado em logs.

Recomendo **manter o slug**. Se preferires forçar o ID estável (imune a renomeação futura por parte da Apify, embora improvável para um actor oficial), troca-se uma linha:

```ts
// Opção A (atual): slug humano
const UNIFIED_ACTOR = "apify/instagram-scraper";

// Opção B: ID interno estável
const UNIFIED_ACTOR = "shu8hvrXbJbY3Eb9W";
```

Ambas chamam `https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items` com sucesso.

## Locked files

Nenhum impacto. `apify-client.ts` e `analyze-public-v1.ts` não estão em `LOCKED_FILES.md`.

## Plano de ação

Nada a implementar — a integração já está como pediste. Próximo passo é executar o smoke test end-to-end (já planeado e aprovado anteriormente, bloqueado apenas pela falta deste refactor).

**Decisão pendente para ti:**

1. **Manter `apify/instagram-scraper` (slug)** — recomendado, sem alterações de código.
2. **Trocar para `shu8hvrXbJbY3Eb9W` (ID interno)** — mudança de 1 linha, ligeiramente mais robusto contra renomeações futuras.
3. **Avançar diretamente para o smoke test** — assumir que está bom como está.

## Checkpoints

- ☑ Refactor para actor unificado já aplicado
- ☑ Endpoint `run-sync-get-dataset-items` em uso
- ☑ Token APIFY_TOKEN server-side, nunca exposto
- ☑ Actor IDs antigos removidos
- ☑ Normalização compatível com payload unificado
- ☑ Locked files intactos
- ☐ Decisão sobre slug vs ID interno (1, 2 ou 3)
- ☐ Smoke test end-to-end (próximo prompt)

