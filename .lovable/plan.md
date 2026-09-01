# Melhores e piores publicações — imagens reais não aparecem

## Causa confirmada

Os últimos snapshots gravados (por exemplo `augusttojesus`, `faithdrives`, `vivianec.araujo`, `theaisurfer`, `pingodoce`) têm 12 publicações cada, com legenda, likes, comentários e data correctos — mas **`thumbnail_url` e `thumbnail_storage_url` a `null` em 100% das publicações**. O avatar do perfil é guardado correctamente no nosso bucket, logo a persistência de imagens funciona; o que falha é a extracção do URL da imagem da publicação.

Todas as recolhas recentes vêm do endpoint `/v2/instagram/user/posts` do provider actual (confirmado nos registos de chamadas). Nesse endpoint as imagens vêm em `image_versions2.candidates[]`, uma lista de objectos `{url, width, height}`.

O adaptador lê essa lista de forma incorrecta:

```ts
// src/lib/analysis/providers/scrapecreators.server.ts (~linha 335)
displayUrl:
  str(raw.display_url) ??
  str(raw.thumbnail_url) ??
  str(asRecord(asRecord(raw.image_versions2)?.candidates)?.[0]),  // ← devolve sempre null
```

`candidates` é um array; `asRecord(...)` sobre um array seguido de `str(objecto)` devolve sempre `null`. Como este endpoint não envia `display_url` nem `thumbnail_url` ao nível do item, o resultado é sempre `null` → nenhum thumbnail chega ao snapshot → o cartão "Melhores e piores publicações" e o preview do Estado A mostram caixas cinzentas vazias.

## Correcção

1. **Extracção de imagem robusta** em `scrapecreators.server.ts`: helper dedicado que, por ordem, tenta
   - `display_url` / `thumbnail_url` / `display_src`;
   - `image_versions2.candidates[]` — o candidato de maior largura com `url` válido;
   - `image_versions2.additional_candidates.first_frame` / `.igtv_first_frame` (vídeos);
   - `carousel_media[0].image_versions2.candidates[]` (carrosséis sem imagem de capa própria);
   - `video_versions[0].url` apenas como último recurso não usado como imagem (ignorado).
   Devolve `null` quando nada existe, sem lançar.

2. **Testes unitários** com fixtures reais das três formas (imagem simples, reel, carrossel) a garantir que o URL escolhido é o de maior resolução e que payloads sem imagem continuam a devolver `null`.

3. **Snapshots já gravados**: as análises existentes ficam sem imagem porque o dado nunca foi recolhido. Não há como recuperar sem nova recolha. A cache expira sozinha; para os perfis de teste basta correr nova análise depois do fix. Não vai ser feita nenhuma reescrita retroactiva de dados.

4. **Estado vazio decente** no cartão e no preview: quando não há thumbnail, em vez de um rectângulo cinzento vazio mostra-se o ícone do formato (Reel / Carrossel / Imagem) sobre a superfície neutra. Assim a publicação continua legível mesmo quando o provider não devolve imagem.

## Verificação

- Correr uma análise nova de um perfil de teste e confirmar em base de dados que `thumbnail_url` deixa de ser `null` e que `thumbnail_storage_url` passa a ser preenchido pela persistência já existente.
- Abrir o relatório e confirmar que "Melhores e piores publicações" mostra as imagens reais nos Estados A, B e C.
- Suite de testes verde.

## Ficheiros afectados

- `src/lib/analysis/providers/scrapecreators.server.ts` — extracção da imagem.
- novo teste em `src/lib/analysis/providers/__tests__/`.
- `src/components/report-redesign/v2/report-post-comparison.tsx` — estado vazio da thumbnail.
