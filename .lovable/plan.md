## Auditoria honesta dos 5 pontos

### 1) Duplicação Bloco 1 ↔ Bloco 2 — o que fica e o que sai

**Bloco 1 · Overview** (3 cartões + Leitura IA):
- Taxa de envolvimento (ER vs. referência)
- Ritmo de publicação (posts/semana)
- **Formato mais regular** (% do formato dominante + barra empilhada)
- Leitura IA (texto curto v2)

**Bloco 2 · Diagnóstico** (8 perguntas + veredito + prioridades):
- Veredito IA (texto v2 reaproveitado do mesmo `aiInsightsV2.sections.hero`)
- Q01 Tipo de conteúdo · Q02 Funil · **Q03 Formato dominante** · Q04 Temas · Q05 Captions · Q06 Resposta · Q07 Integração · Q08 Objetivo
- Prioridades de ação

**Sobreposições reais (a corrigir):**

| Item | Bloco 1 | Bloco 2 | Decisão |
|---|---|---|---|
| **Leitura IA / Veredito** | `aiInsightsV2.sections.hero` (Bloco 1, "Leitura IA") | mesmo texto reutilizado em `buildVerdictText` quando `aiHero.length > 30` (Bloco 2, "Veredito editorial · IA") | **Sai do Bloco 1.** O Bloco 2 é o sítio do diagnóstico — o veredito IA pertence-lhe. O Bloco 1 fica só com os 3 cartões + watermark. |
| **Formato dominante** | "Formato mais regular" (% + breakdown empilhado) | Q03 "Que formato domina a presença?" (% + barra distribuída) | **Sai do Bloco 2 (Q03).** O formato é uma métrica de overview, não uma pergunta editorial. Manter no Bloco 1, retirar Q03 da grelha do Bloco 2. Os grupos passam a A(2) · B(3: temas/captions/resposta) · C(2: integração/objetivo). |
| **Ritmo, ER** | Bloco 1 | não duplicado no Bloco 2 | OK, manter |

### 2) Aspas tipográficas `"…"` 

Encontradas em apenas 1 sítio: `src/components/report-redesign/v2/report-diagnostic-card.tsx:96` — a pergunta de cada cartão é envolvida em `"{question}"`.

**Decisão:** retirar as aspas. A pergunta passa a ser apenas o `<h3>` em serif, sem aspas.

### 3) Verificação de dados reais vs. inventados

Auditei classifier por classifier. Estado:

| Card | Fonte | Real? |
|---|---|---|
| Q01 Tipo de conteúdo | `posts[].caption` + `hashtags` matched contra termos PT (`CT_TERMS`) | ✅ determinístico real |
| Q02 Funil | mesma lógica de termos sobre captions | ✅ real (mas heurística) |
| Q03 Formato | `keyMetrics.dominantFormat`/`formatBreakdown` — APIs Apify | ✅ real (vai sair na decisão 1) |
| Q04 Temas | `topHashtags` / `topKeywords` | ✅ real |
| Q05 Captions | `caption_length`, CTA terms, **`?` real** após strip de hashtags | ✅ real (já corrigido) |
| Q06 Resposta | `likes`, `comments` | ✅ real |
| **Q07 Integração** | bio + captions + **falta `external_urls`** | ❌ **bug real** — ver ponto 5 |
| Q08 Objetivo | composição dos anteriores | ✅ derivado real |
| Veredito | `aiHero` v2 quando ≥ 30 chars; senão deterministic concat | ✅ real |
| Prioridades | derivadas dos anteriores | ✅ real |

### 4) "Nenhuma natureza domina claramente" vs. "42% educativo"

Reli o código (`report-diagnostic-block.tsx:235-289`):

- A frase `"Nenhuma natureza domina claramente — a comunicação alterna entre vários registos sem foco editorial visível."` **só é mostrada quando `r.label === "Misto / pouco claro"`** (linha 237-264).
- Quando há um label dominante (ex.: "Educativo" 42%), o body é gerado com `Cerca de ${r.sharePct} % das ${r.sampleSize} publicações analisadas têm uma assinatura ${r.label.toLowerCase()}…` (linha 276).

**Não foi gerado por OpenAI** — é texto determinístico do classifier. Mas o utilizador descreveu ver as duas coisas em simultâneo: "42% educativo" + "Nenhuma natureza domina claramente". Isso só é possível se:

- Hipótese A: o classifier devolveu `"Misto / pouco claro"` com `sharePct = 42` no breakdown (ou seja, 42% Educativo é o **maior**, mas não passou no critério `share >= 35% AND topCount >= secondCount * 1.5`).
- Hipótese B: a UI está a mostrar a distribuição com o topo "Educativo 42%" mas o texto vem do branch "misto".

Olhando o código, **A é a explicação correta**: se a relação top/second não é ≥ 1.5×, classifica como "Misto" mesmo com 42% no top. O texto é honesto ("nenhuma domina claramente"), mas a UX é confusa porque a barra mostra o top em destaque.

**Decisão:** quando `label === "Misto / pouco claro"` mas existe um top ≥ 35%, ajustar o body para refletir o que o utilizador vê: `"Há um sinal mais forte em ${top} (${pct} %), mas sem distância clara para os restantes registos — ainda não chega para falar em foco editorial."`. Dados reais, copy fiel ao gráfico.

### 5) Pergunta 07 — "Link na bio = ausente" mas ele existe

**Bug real e confirmado.** Consultei o snapshot do `frederico.m.carvalho`:

```json
"profile": {
  "bio": "🚀 Marketing Digital + SEO + IA…\n🔗 Acede aos meus conteúdos ↓",
  "external_urls": ["http://fredericocarvalho.pt/saber-mais//"]
}
```

`classifyChannelIntegration` em `block02-diagnostic.ts:590-647` recebe **só `bio: string | null`** e procura URL com `URL_RE` **dentro do texto da bio**. Mas o link real do Instagram vive no campo separado **`external_urls`** que nunca é passado ao classifier. Resultado: marca "Link na bio = ausente" mesmo quando existe.

**Causa raiz:** `ReportDiagnosticBlock` extrai `bio = result.enriched.profile.bio` (linha 58) e passa só esse string. O `enriched.profile` nem sequer carrega `external_urls` — perde-se na transformação `snapshot-to-report-data.ts:1016-1021`.

**Correção (3 camadas):**
1. `snapshot-to-report-data.ts` → adicionar `externalUrls: string[]` ao `enriched.profile`, lido de `payload.profile.external_urls` (já existe no payload).
2. Tipo `ReportEnriched["profile"]` → adicionar `externalUrls: string[]`.
3. `classifyChannelIntegration(bio, externalUrls, posts)` → receber a lista de URLs externas, validá-la e contar como `bioLink.detected = true` quando houver pelo menos uma URL bem-formada. O texto continua a usar o `URL_RE` na bio como fallback.
4. `report-diagnostic-block.tsx` → passar `result.enriched.profile.externalUrls` ao classifier.

## Alterações a implementar

### Ficheiro 1 · `src/lib/report/snapshot-to-report-data.ts`
- Acrescentar `externalUrls?: string[]` ao tipo `SnapshotProfile` (já lá deve existir como entrada — confirmar e adicionar `external_urls?: string[] | null` se faltar).
- No bloco `enrichedProfile…` (linhas 941-953): extrair e normalizar `payload.profile?.external_urls` (filtrar strings com URL válida via `URL_RE`).
- Adicionar campo `externalUrls: string[]` ao objeto `enriched.profile`.
- Atualizar tipo `ReportEnriched["profile"]` para incluir `externalUrls: string[]`.

### Ficheiro 2 · `src/lib/report/block02-diagnostic.ts`
- Mudar assinatura: `classifyChannelIntegration(bio: string | null, externalUrls: string[], posts: SnapshotPost[])`.
- Calcular `bioHasUrl = externalUrls.length > 0 || URL_RE.test(safeBio)`.
- `bioLinkValue` preferir o primeiro `externalUrls[0]`, fallback para o match no texto.
- Manter restante lógica intacta.

### Ficheiro 3 · `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- Linha 58: ler `const externalUrls = result.enriched.profile.externalUrls ?? [];`.
- Linha 65: passar `externalUrls` a `classifyChannelIntegration(bio, externalUrls, posts)`.
- Q01 (linhas 235-289): quando `label === "Misto / pouco claro"` e existe top com `sharePct >= 35`, body passa a `"Há um sinal mais forte em <top> (<pct> %), mas sem distância clara para os restantes registos — ainda não chega para falar em foco editorial."` (continua determinístico).
- **Remover Q03 (Formato)**: eliminar `renderFormatCard(km, formatBreakdown)` da composição do `groupB`. Fica `groupB = [themes, caption, audience]` (3 cartões).

### Ficheiro 4 · `src/components/report-redesign/v2/report-diagnostic-card.tsx`
- Linha 96: substituir `"{question}"` por `{question}` (sem aspas tipográficas).

### Ficheiro 5 · `src/components/report-redesign/v2/report-overview-block.tsx`
- Remover o bloco `<aside>` "Leitura IA" (linhas 78-105) — passa a viver só no Bloco 2 como veredito.
- Eliminar `Bot` e o estado `heroInsight`/`insightText` agora não usados.
- Manter watermark + `ReportOverviewCards` intactos.

## Não tocar

- Bloco 03–06, PDF, admin, `/report/example`, providers (Apify/DFS), schema, AI prompts, validators, payments, locked files.
- Veredito do Bloco 2 mantém-se exatamente como está (continua a usar `aiHero` v2).
- Distribuição/visualização dos cards (gráficos) intacta.

## Validação

1. `bunx tsc --noEmit`
2. `bunx vitest run`

Sem QA browser, sem chamadas a providers externos.

## Entregáveis a reportar

1. Ficheiros tocados (5).
2. Confirmação de que `external_urls` passou a alimentar Q07 e o link real do Frederico é detetado.
3. Confirmação de que aspas `"…"` foram removidas dos cartões.
4. Confirmação de que Q03 (Formato) saiu do Bloco 2 e Leitura IA saiu do Bloco 1 — sem duplicação.
5. Confirmação de que o body de Q01 quando "Misto" reflete o top real visível na barra.
6. Auditoria por card de fonte de dados (já feita acima).
7. Resultado TypeScript + Vitest.
