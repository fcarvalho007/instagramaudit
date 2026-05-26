## Objetivo

Refinar o veredicto editorial do Bloco 1 para que use evidência concreta (cadência legível + hashtags reais) e remeta o envolvimento para a leitura inferior do relatório, sem nunca imprimir a % de envolvimento no parágrafo. Mudança cirúrgica em prompt, contexto, validador, fallback determinístico e cartão.

## Ficheiros a alterar

1. `src/lib/insights/types.ts`
   - Adicionar a `InsightsContext`:
     - `top_hashtags?: Array<{ tag: string; uses: number }>` (máx. 2)
     - `hashtags_state?: "recurring" | "weak" | "absent"`
     - `cadence_label_pt?: string` (frase pré-pronta, pt-PT)
   - Adicionar `"caption_intelligence.hashtags"` à `EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST`.

2. `src/lib/insights/build-context.ts`
   - Calcular `top_hashtags` via `extractTopHashtags(posts, 2)` (já existe em `text-extract.ts`).
   - Derivar `hashtags_state`:
     - `absent` quando `top_hashtags` vazio.
     - `recurring` quando ≥ 1 tag aparece em ≥ 2 posts.
     - `weak` quando existem tags mas todas com `uses === 1` (ruído, sem repetição).
   - Derivar `cadence_label_pt`:
     - `cadence.sufficient === false` → "a amostra ainda não permite avaliar a cadência com segurança"
     - weekly ≥ 5 → "cerca de 1 post por dia"
     - weekly entre 2 e 4 → "cerca de 1 post a cada 2–3 dias"
     - weekly entre 1 e 2 → "cerca de 1 a 2 posts por semana"
     - weekly < 1 → "menos de 1 post por semana"

3. `src/lib/insights/prompt-v2.ts`
   - Reescrever a secção `editorial_verdict` do `SYSTEM_PROMPT_BASE` com o novo contrato (ver "Contrato editorial" abaixo).
   - Acrescentar ao bloco de exposição do payload (em `prompt.ts` via `buildInsightsUserPayload` ou no system) os novos campos: `cadence_label_pt`, `top_hashtags`, `hashtags_state`.

4. `src/lib/insights/prompt.ts`
   - Expor `top_hashtags`, `hashtags_state` e `cadence_label_pt` na serialização que o modelo recebe (campo `cadence` e novo bloco `hashtags`).

5. `src/lib/insights/validate-v2.ts`
   - `paragraph`: 90–140 palavras (era 80–220).
   - Máx. 4 frases (split por `[.!?]`); falha `TOO_MANY_SENTENCES` se > 4.
   - Proibir percentagem numérica no parágrafo: rejeitar regex `/\d[.,]?\d*\s*%/`. Falha `ENGAGEMENT_PERCENT_LEAK`.
   - Proibir métricas privadas: regex `/\b(alcance|reach|impress(ões|oes)|saves?|partilhas|visitas\s+ao\s+perfil|visualizações\s+de\s+stories)\b/i`. Falha `PRIVATE_METRIC_LEAK`.
   - Regra de hashtags: se `paragraph` contém `#\w+` → ok. Caso contrário, exigir frase de ausência: `/\bhashtags?\b/i` presente E uma de `/n(ão|ao)\s+há|n(ão|ao)\s+criam|n(ão|ao)\s+s(ão|ao)\s+suficientes|ainda\s+não\s+criam|sem\s+assinatura\s+temática/i`. Falha `HASHTAGS_NOT_HANDLED` se nada disto se aplicar.
   - Manter listas existentes (PT-BR, leak técnico, verbos prescritivos).

6. `src/lib/insights/openai-insights.server.ts`
   - `finalizeEditorialVerdict`: inalterado, excepto `evidence_used` — se `verdict_label === "limited_data"` e `evidence_used` < 3, manter o que vier.
   - Sem novas chamadas a provider.

7. `src/lib/report/editorial-verdict-fallback.ts`
   - Estender `buildFallbackVerdict` para receber `cadenceLabelPt: string | null` e `topHashtags: string[]` (máx. 2). O parágrafo (i18n key) passa a usar templating com `{cadenceLabel}` e bloco condicional `{hashtagSentence}`.
   - Templates novos (pt + en) em `public/locales/<lng>/report.json`:
     - `identity.fallback.paragraph_with_hashtags`
     - `identity.fallback.paragraph_without_hashtags`
     - `identity.fallback.cadence_phrase_*`
   - Removem-se as 6 variantes antigas por chave + colocam-se 2 templates principais com 1 frase condicional por band — mantém a coerência editorial mas garante 90–140 palavras e zero %.

8. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`
   - Aceitar novas props: `cadenceLabelPt?: string | null`, `topHashtags?: string[]`.
   - Passá-las a `buildFallbackVerdict`.
   - Continuar a usar `aiVerdict?.paragraph` quando válido (sem injetar `sections.hero.text`).

9. `src/lib/report/snapshot-to-report-data.ts`
   - Já existe `topHashtags` em `ReportData`. Passar `topHashtags.slice(0,2).map(h => h.tag)` e `cadence_label_pt` (mesma derivação determinística) para o cartão via o caminho actual de render. Adicionar derivador puro `buildCadenceLabelPt(cadence)`.

10. Testes
    - Update `src/lib/insights/__tests__/validate-v2-verdict.test.ts`:
      - aceita parágrafo 110 palavras com 2 hashtags `#a #b` mas sem `%`
      - rejeita parágrafo com `1,2%` → `ENGAGEMENT_PERCENT_LEAK`
      - rejeita parágrafo com "alcance" → `PRIVATE_METRIC_LEAK`
      - rejeita parágrafo sem hashtags e sem frase de ausência → `HASHTAGS_NOT_HANDLED`
      - aceita parágrafo sem hashtags mas com "não há hashtags suficientemente claras"
      - rejeita > 4 frases → `TOO_MANY_SENTENCES`
      - rejeita 145 palavras → `PARAGRAPH_TOO_LONG`; 80 → `PARAGRAPH_TOO_SHORT`
    - Novo `src/lib/insights/__tests__/build-context-hashtags.test.ts`:
      - hashtags repetidas → `hashtags_state="recurring"`, top_hashtags ordenado por usos
      - hashtags todas únicas → `weak`
      - sem hashtags → `absent`
      - cadência: weekly=7 → "cerca de 1 post por dia"; weekly=0.5 → "menos de 1 post por semana"; insufficient → frase de amostra
    - Novo `src/lib/report/__tests__/editorial-verdict-fallback.test.ts`:
      - cadência alta + hashtags `#marketing #ia` → parágrafo inclui ambos e a cadence label
      - cadência alta + sem hashtags → parágrafo inclui frase de ausência explícita
      - amostra < 4 → `limited_data`, confidence `low`, cadence label de insuficiente
    - `src/lib/insights/__tests__/editorial-verdict-warnings.test.ts`: manter; assegurar que continua a passar.
    - Snapshot legacy: já coberto por `extractPersistedEditorialVerdict` devolvendo `null` → cartão cai no fallback. Acrescentar 1 expect em `snapshot-to-report-data.test.ts` (se existir) ou novo teste mínimo.

## Contrato editorial final (texto que entra no system prompt)

```
Veredicto editorial (campo "editorial_verdict") — DIAGNÓSTICO, não solução:
- "verdict_label": strong | promising | needs_work | limited_data.
- "title": 4–8 palavras, ≤ 60 chars, sem dígitos, sem ponto final.
- "paragraph": 90–140 palavras, máximo 4 frases curtas. Compreensível por leigo, útil para marketer.
  DEVE cobrir, por esta ordem editorial (não tem de ser listada):
    1) presença/actividade do perfil,
    2) cadência fiável usando "cadence_label_pt" tal como vem no payload (não inventar variantes),
    3) que o envolvimento se lê contra o benchmark do escalão e remeter para a comparação mais abaixo no relatório,
    4) se a audiência responde (comentários) ou consome (gostos),
    5) hashtags: usar até 2 de "top_hashtags" como "#tag1 e #tag2" quando "hashtags_state=recurring"; se "weak" descrever como "as hashtags aparecem mas ainda não criam uma assinatura temática"; se "absent" dizer explicitamente que não há hashtags suficientemente claras ou recorrentes.
  Pode usar 1 metáfora simples ("montra", "vitrina") se ajudar à clareza.
  PROIBIDO no parágrafo:
    - imprimir percentagens (qualquer "N%"), incluindo a taxa de envolvimento;
    - inventar métricas privadas (alcance, impressões, saves, partilhas, visitas ao perfil, visualizações de stories);
    - verbos prescritivos (deve, recomenda-se, publique, teste, use mais, aposte, publicar mais);
    - repetir KPIs do strip sem interpretação;
    - inventar hashtags fora de "top_hashtags".
  Permitido: "O envolvimento deve ser lido contra o benchmark do escalão", "A comparação aparece mais abaixo no relatório".
- "evidence_used": 3 a 6 da allowlist. Quando hashtags são citadas no parágrafo, incluir "caption_intelligence.hashtags".
- Demais campos (priority, strengths×2, limitations×2, confidence): inalterados.
```

## Como cadência se converte em frase

`buildCadenceLabelPt(cadence)` puro:
- `sufficient=false` → "a amostra ainda não permite avaliar a cadência com segurança"
- `weekly >= 5` → "cerca de 1 post por dia"
- `weekly >= 2` → "cerca de 1 post a cada 2–3 dias"
- `weekly >= 1` → "cerca de 1 a 2 posts por semana"
- restante → "menos de 1 post por semana"

## Comportamento de hashtags

- Presentes e recorrentes: até 2 mencionadas no parágrafo (`#tag1 e #tag2`).
- Presentes mas todas com 1 uso: frase explícita de "ainda não criam assinatura temática".
- Ausentes: frase explícita "não há hashtags suficientemente claras ou recorrentes".
- O validador exige uma destas três condições — se a IA omitir, falha `HASHTAGS_NOT_HANDLED` e cai no fallback.

## Confirmação sobre %

O validador rejeita qualquer `\d+[.,]?\d*\s*%` no `paragraph`. Test cobre 1,2%, 12%, 0.5 %.

## Fallback para snapshots antigos

`extractPersistedEditorialVerdict` continua a devolver `null` para snapshots sem `editorial_verdict`. O cartão recebe esse `null`, `deriveEditorialVerdict` cai em `buildFallbackVerdict(metrics, t, { cadenceLabelPt, topHashtags })`, que produz parágrafo determinístico com cadência legível e tratamento de hashtags. Sem regeneração, sem chamadas a OpenAI.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Zero chamadas Apify/OpenAI/DataForSEO.

## Fora de scope

Pricing, gates, modais, sidebar, admin, blocos 3–6, alterações em `/report.example`, novos campos no Apify/DFS, refactor profundo do cartão (mantém-se a estrutura de zonas e props existentes).
