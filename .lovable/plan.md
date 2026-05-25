## Diagnóstico

**Bug #1 — "12 posts em 1111 dias" para `@robs.cortez`**

Os 12 posts devolvidos pelo Apify incluem **2 posts pinned** de 2023 (Maio e Setembro). O Instagram permite até 3 pinned no topo do grid, independentes da data. O cálculo de `windowDays` em `src/lib/report/snapshot-to-report-data.ts:975-993` faz `max(taken_at) − min(taken_at)` sobre **todos** os posts, ignorando o flag `is_pinned: true` (que já é capturado em `src/lib/analysis/normalize.ts:567`). Resultado: janela = 1111 dias, cadência ≈ 0,1 posts/semana. Os 10 posts reais cobrem 12 dias (~5,8 posts/semana).

**Bug #2 — Veredicto editorial cai sempre no fallback estático**

A IA gera correctamente o `sections.hero.text` (verificado no snapshot persistido: "Este perfil regista 0,46% de envolvimento médio, abaixo da referência do tier micro (1,8%). Com 0,1 posts/semana, reforçar a cadência pode ajudar a recuperar tração.").

Em `src/components/report-redesign/v2/overview/editorial-identity-card.tsx:97-112`, `deriveCopyFromAi` só promove a primeira frase da IA a título quando tem **≤ 5 palavras** — condição que NUNCA é cumprida porque o prompt exige números e contexto. Logo o título cai sempre no fallback estático ("Audiência existe, falta direção") e o card parece genérico, embora o parágrafo da IA esteja lá. Pior: enquanto o enriquecimento OpenAI não corre (janela de ~30-120 s após o fetch Apify), o card mostra título **e** parágrafo do fallback — foi o que o utilizador apanhou.

Adicionalmente, o prompt `hero` actual ("panorama global do perfil — envolvimento + tier + ritmo") está a usar `0,1 posts/semana` como facto — que vem do bug #1. Corrigir o bug #1 também corrige o input do prompt.

---

## Mudanças

### 1. Excluir pinned dos cálculos temporais

`src/lib/report/snapshot-to-report-data.ts`

- Logo após `const posts = buildPosts(...)` (linha ~947), derivar:
  ```ts
  const cadencePosts = posts.filter((p) => !p.is_pinned);
  ```
- Usar `cadencePosts` em vez de `posts` em:
  - `temporalSeries = buildTemporalSeries(cadencePosts)`
  - `postingHeatmap = buildPostingHeatmap(cadencePosts)`
  - `bestDays = buildBestDays(cadencePosts)`
  - loop `for (const p of posts)` que calcula `minTs`/`maxTs` (linhas 977-985)
  - recálculo de `postingFrequencyWeekly` (linhas 999-1003) — usar `cadencePosts.length` em vez de `keyMetrics.postsAnalyzed`
  - `sampleSize`, `windowLabel`, `kpiSubtitle`, etc. (linhas 1098-1115) — usar `cadencePosts.length`
- `topPosts`, hashtags, keywords, themes mantêm-se sobre `posts` completo (pinned são conteúdo legítimo, só desvirtuam timing).
- Edge case: se `cadencePosts.length === 0` (perfil só com pinned), cair de volta ao conjunto completo para não esconder tudo.
- Adicionar test em `src/lib/report/__tests__/` que injecta 12 posts (2 pinned 2023 + 10 recentes 2026) e valida que `windowDays = 12` e `postingFrequencyWeekly` corresponde a 10/12*7.

### 2. Veredicto editorial: deixar o título vir da IA

`src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

a. Subir o limite de palavras do título de 5 → 10 e usar a **primeira frase inteira como parágrafo + um título curto sintetizado**:

- Nova função `synthesizeTitleFromAi(firstSentence)`: extrai 2-5 palavras-chave (substantivos + verbo principal) ou cai no fallback. Implementação pragmática: se a primeira frase tem ≤ 10 palavras, usar como título; caso contrário, derivar do tom (`emphasis`) + métrica saliente:
  - `negative` → "Envolvimento abaixo do tier" (ou tema detectado)
  - `positive` → "Envolvimento acima do tier"
  - `default` → manter fallback determinístico (band-based)
  - `neutral` → "Sinal ainda parcial"

b. Sempre que `aiHeroText` está presente, o **parágrafo é o texto da IA na íntegra** (truncado a 320 chars como hoje). Nunca misturar com fallback.

c. Quando `aiHeroText` está ausente (cache miss / enriquecimento ainda a correr), mostrar um skeleton subtil em vez do fallback estático completo — para o utilizador perceber que o veredicto IA está a chegar (~30-120 s). Após 5 s sem AI, mostrar o fallback determinístico como hoje.

### 3. Reforçar prompt v2 da secção `hero`

`src/lib/insights/prompt-v2.ts` (system prompt, secção das 9 chaves)

Substituir a linha do `hero` por uma instrução mais precisa, exigindo cruzamento de pelo menos 3 sinais e abertura forte sem snake_case:

```
- "hero": leitura editorial de abertura do relatório. Combinar OBRIGATORIAMENTE
  três sinais: (1) envolvimento médio com posição face ao tier, (2) ritmo
  semanal real (estimated_posts_per_week), (3) formato dominante ou tema
  recorrente das captions. Estrutura: 1 frase com o diagnóstico (que números
  o sustentam) + 1 frase com a alavanca prioritária no infinitivo. Evitar
  abrir com "Este perfil" — preferir abertura editorial ("Audiência fiel mas
  silenciosa", "Ritmo curto, sinal forte", "Conteúdo regular sem tração").
  Máx. 240 chars. Tom: directo, não condescendente, sem alarmismo.
```

Adicionar 1 exemplo CORRECTO e 1 PROIBIDO logo a seguir, no mesmo estilo já usado para `marketSignals`.

### 4. Diagnóstico admin

Adicionar coluna `cadence_posts_count` e `pinned_posts_count` no `analysis_diagnostics` (componente que já existe no `/admin/perfis` ou cockpit). Sem migração — derivado on-the-fly a partir do payload. Útil para detectar futuros perfis com pinned a inflar a janela.

---

## Ficheiros tocados

- `src/lib/report/snapshot-to-report-data.ts` — filtrar pinned em window/cadence/series/heatmap/bestDays
- `src/lib/report/__tests__/snapshot-pinned-window.test.ts` — novo
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` — `synthesizeTitleFromAi`, skeleton em vez de fallback durante warm-up
- `src/lib/insights/prompt-v2.ts` — instrução `hero` reforçada
- (Opcional, baixa prioridade) componente de diagnóstico admin

## Fora de âmbito

- Não tocar no scraper Apify (a flag `is_pinned` já chega — basta usá-la).
- Não tocar no schema do snapshot (sem migração).
- Não tocar nos outros 8 insights v2.

## Prompt actual do hero (já em vigor) — para partilha com o utilizador

```
"hero": panorama global do perfil (envolvimento médio + tier + ritmo).
```

(via system prompt em `src/lib/insights/prompt-v2.ts:67`, dentro do
mapeamento das 9 secções)

Regras de qualidade globais já aplicadas a TODAS as secções (incluindo hero):
- 1 observação concreta com número + 1 recomendação prática (infinitivo)
- Citar pelo menos 1 valor numérico do payload
- Sem snake_case, sem caminhos com pontos, sem rótulos crus em inglês
- Máx. 240 caracteres
- pt-PT AO90, registo impessoal

## Prompt revisto do hero — que será aplicado

```
- "hero": leitura editorial de abertura do relatório. Combinar OBRIGATORIAMENTE
  três sinais: (1) envolvimento médio com posição face ao tier, (2) ritmo
  semanal real (estimated_posts_per_week), (3) formato dominante OU tema
  recorrente das captions. Estrutura: 1 frase com o diagnóstico (com os
  números que o sustentam) + 1 frase com a alavanca prioritária no infinitivo
  impessoal. Evitar abertura factual fria — preferir abertura editorial
  curta ("Audiência fiel mas silenciosa", "Ritmo curto, sinal forte",
  "Conteúdo regular sem tração"). Máx. 240 chars. Tom directo, sem
  alarmismo nem condescendência.

  CORRECTO: "Audiência fiel mas silenciosa: 0,5% de envolvimento médio,
  abaixo dos 1,8% típicos do tier micro, com 5 publicações por semana
  dominadas por Reels. Testar 2 carrosséis editoriais por semana durante
  4 semanas e medir a conversa nos comentários."

  PROIBIDO (factual, sem ângulo): "Este perfil tem 0,5% de envolvimento e
  publica 5 vezes por semana."
```

## Checkpoint

- ☐ `@robs.cortez` mostra "10 publicações em 12 dias" e cadência ≈ 5-6/semana
- ☐ Pinned posts continuam visíveis em hashtags/temas/top posts
- ☐ Teste novo cobre o cenário "pinned antigo + posts recentes"
- ☐ Veredicto editorial mostra título dinâmico (≤ 10 palavras) ou frase de abertura editorial vinda da IA
- ☐ Parágrafo do veredicto vem 100% da IA quando `aiHeroText` está presente
- ☐ Durante warm-up (~30-120 s) o card mostra skeleton, não copy estático
- ☐ Prompt v2 do `hero` exige 3 sinais cruzados e abertura editorial
- ☐ Build limpo, sem regressões nos testes existentes