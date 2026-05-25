# Plano — Veredicto editorial mais robusto (camada diagnóstica)

## Estado atual (já implementado)

- Contrato `editorial_verdict` no schema `ai_insights_v2` + validador (`validate-v2.ts`).
- Resolver `deriveEditorialVerdict` com guard contra contradições.
- `buildFallbackVerdict` determinístico em PT/EN.
- `EditorialIdentityCard` renderiza título, parágrafo, badge "Leitura provisória", linha "Próximo passo", duas colunas de strengths/limitations.
- Allowlist fechada de 15 rótulos em `EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST`.

## Gaps face ao brief

1. **Comprimento de parágrafo**: actual 30–75 palavras / 2 frases → brief pede **80–220 (alvo 120–180), 2–4 parágrafos curtos**.
2. **Título**: actual ≤ 7 palavras → brief pede **4–8 palavras** (mínimo 4) e proibição de números no título.
3. **Stance diagnóstico**: nenhuma regra activa que bloqueie verbos de recomendação ("publique", "teste", "aposte", "use mais", "deve...", "recomenda-se", "a prioridade é").
4. **UI prescritiva**: o cartão mostra "Próximo passo: <priority>" — contradiz o no-solution rule.
5. **Bullets de evidência**: `evidence_used` é validado e guardado mas **nunca renderizado**.
6. **Provisional cue**: o badge só dispara quando o resolver descarta a IA. O brief pede que também dispare por `warnings` (low_sample, stale_data, benchmark_missing, no_market_signals, cadence_uncertain).
7. **Atenção sem conversa**: já existe `conversation_contradiction` mas não enquadra o caso "likes saudáveis + comentários < 2" como diagnóstico positivo do tipo "atenção sem conversa".
8. **Validação no validador**: falta blocklist de verbos prescritivos, falta mínimo de palavras no parágrafo (80) e contagem actual de frases é demasiado restritiva.
9. **Compatibilidade retroactiva**: snapshots antigos sem `editorial_verdict` já caem no fallback — confirmar e cobrir com teste.

## Mudanças propostas

### A. Schema + validador (`src/lib/insights/{prompt-v2,validate-v2}.ts`)

- `paragraph.maxLength` 480 → **1400** chars (≈ 220 palavras + margem).
- Validador: mudar limites para `min=80`, `max=220` palavras; remover o cap rígido de 2 frases (passar a permitir 2–6 frases distribuídas em 1–4 parágrafos).
- Adicionar **blocklist de verbos prescritivos** (regex pt-PT, case-insensitive) sobre `paragraph`:
  ```
  /\b(deve(s|m)?|recomenda[- ]se|a\s+prioridade\s+é|publique|teste(m)?|use(m)?\s+mais|aposte(m)?|reforça(r)?\s+os?|publicar\s+mais|cria(r)?\s+mais)\b/i
  ```
  Falha → `RECOMMENDATION_VERB`; quando 1 verbo é detectado o resolver downgrade para fallback (não tentamos reescrever).
- `title`: validar mínimo de 4 palavras (`TITLE_TOO_SHORT`), manter máximo de 8. Rejeitar dígitos no título (`TITLE_HAS_NUMBER`).
- Manter `evidence_used` com `min 3, max 6` (já implementado).

### B. Prompt (`src/lib/insights/prompt-v2.ts`)

- Reescrever a secção "Veredicto editorial" para:
  - Tom **diagnóstico, não prescritivo** — instrução explícita com exemplos permitidos ("Os dados sugerem…", "O padrão observado indica…", "A leitura principal é…", "A amostra ainda não permite concluir…").
  - Lista negra de verbos prescritivos (mesma do validador) com exemplos errados.
  - Parágrafo: **120–180 palavras alvo, ≤ 220**, pode ser 2–4 parágrafos curtos OU 1 parágrafo + 2–3 bullets de evidência (no campo `evidence_used`).
  - Título: **4–8 palavras**, sem números, sem clichés ("Bom perfil", "Precisa melhorar").
  - Regra explícita "atenção sem conversa" quando likes ≥ benchmark e comentários < 2.
  - Regra explícita: amostra < 5 ou cadência inconclusiva ou benchmark em falta → `verdict_label: limited_data` + `confidence: low` + tom provisional.
  - O modelo continua a devolver `priority`, `strengths`, `limitations` (não removemos do schema para preservar snapshots antigos), mas a UI deixa de mostrar `priority`.

### C. Resolver (`src/lib/report/editorial-verdict.ts`)

- Nova contradição `prescriptive_language` quando o paragrafo contém um dos verbos da blocklist (defesa em profundidade caso o validador deixe passar).
- Nova contradição `attention_no_conversation_missed`: `avgLikes/followers ≥ benchmark*0.9` **e** `avgComments < 2` **e** corpus não contém marca diagnóstica (`/aten[çc][ãa]o\s+sem\s+conversa|sem\s+conversa|pouca\s+conversa|comentários\s+raros|silenciosa/i`) → 1 contradição → downgrade + parágrafo do fallback (que enquadra correctamente).
- Quando `metrics.postsAnalyzed < 4` **e** `ai.verdict_label ∈ {strong, promising}` → forçar fallback completo (já não cobrimos isto).

### D. Fallback (`src/lib/report/editorial-verdict-fallback.ts`)

- Nova chave `attention_no_conversation` (band `promising`) quando `engRatio ≥ 0.9 && avgComments < 2`.
- Reduzir threshold de `opportunity/limited_data` de `postsAnalyzed < 5` → `< 4` para alinhar com a regra do prompt.
- Estender parágrafos das chaves existentes para 80–180 palavras (continuam compactos mas dentro do novo range).

### E. UI (`src/components/report-redesign/v2/overview/editorial-identity-card.tsx`)

- **Remover** a linha "Próximo passo: <priority>" (no-solution rule).
- Permitir parágrafo multi-linha: render como `whitespace-pre-line` para preservar `\n` quando o modelo devolver vários parágrafos.
- Acrescentar uma lista de **2–3 evidence bullets** abaixo do parágrafo, traduzindo cada rótulo de `evidence_used` via `i18n` (`identity.evidence.<rótulo>`). Apenas mostra quando `evidence_used.length ≥ 2`.
- Mostrar o badge "Leitura provisória" também quando `resolved.warnings` inclui `low_sample`, `stale_data`, `cadence_uncertain`, `benchmark_missing` ou `no_market_signals` (não só quando o resolver fez downgrade).
- Strengths/limitations columns: manter (estão fora do "diagnóstico vs solução" — são leituras qualitativas curtas).

### F. i18n (`src/i18n/locales/{pt,en}/report.json`)

- Acrescentar `identity.evidence.<rótulo>` para os 15 rótulos da allowlist (frases curtas, ex.: `cadence.window_30d` → "Cadência dos últimos 30 dias", `benchmark.tier_delta` → "Diferença face ao escalão do tier").
- Acrescentar `identity.fallback.attention_no_conversation.{title,paragraph}` em PT-PT e EN, parágrafo 80–180 palavras.
- Expandir os parágrafos `identity.fallback.*` existentes para ≥ 80 palavras.

### G. Testes

- `validate-v2-verdict.test.ts` — actualizar:
  - parágrafo 79 palavras → rejeita `PARAGRAPH_TOO_SHORT`.
  - parágrafo 221 palavras → rejeita `PARAGRAPH_TOO_LONG`.
  - parágrafo com "deve publicar mais" → rejeita `RECOMMENDATION_VERB`.
  - título com 3 palavras → rejeita `TITLE_TOO_SHORT`.
  - título com número → rejeita `TITLE_HAS_NUMBER`.
- `editorial-verdict.test.ts` — acrescentar:
  - `postsAnalyzed=3` + IA `verdict_label=strong` → `source: "fallback"`.
  - likes saudáveis + `avgComments=0.5` + IA sem marca diagnóstica → `source: "ai_downgraded"` ou `"fallback"`.
  - parágrafo com "publique mais" mesmo com cadência fraca → `source: "fallback"` (defesa em profundidade).
  - snapshot sem `editorial_verdict` (`ai === null`) → `source: "fallback"` (cobre retro-compat).
- `editorial-verdict-fallback.test.ts` (novo): cobre todas as chaves do `pickKey` e garante parágrafos ≥ 80 palavras em PT e EN.

### H. Validações finais

- `bunx tsc --noEmit` e `bunx vitest run`.
- Capturar 3 exemplos de output (1 fixture cadência saudável + engagement baixo, 1 com atenção sem conversa, 1 com amostra insuficiente) e incluir no resumo da resposta.

## Fora de scope (não tocar)

- Apify, OpenAI provider config, cálculo de cadência, geração de report, pricing, lead magnet, secções bloqueadas, admin.
- Outros cartões dos blocos 2–6.
- `priority`/`strengths`/`limitations` ficam no schema para não invalidar snapshots antigos; só removemos `priority` da UI.

## Custo

- **Zero novas chamadas OpenAI.** Só endurecemos o schema/validador/prompt já enviado dentro de `ai_insights_v2`. Validações que falham caem para o fallback determinístico — sem retry de IA.

## Riscos

- Validador mais estrito poderá rejeitar mais respostas → mais fallbacks. Mitigado pelo prompt reforçado e por a UI já ter o badge "Leitura provisória".
- A blocklist regex pode disparar falsos positivos em casos legítimos ("deve" como impessoal). Manter blocklist conservadora e só sobre `paragraph`, não sobre `priority`/`strengths`/`limitations`.

## Checkpoint

- ☐ Schema + validador atualizados (80–220 palavras, blocklist, título 4–8)
- ☐ Prompt v2 reforçado (stance diagnóstico, sem verbos prescritivos)
- ☐ Resolver com novas contradições (prescriptive_language, attention_no_conversation, low_sample_strong_claim)
- ☐ Fallback com chave `attention_no_conversation` e parágrafos ≥ 80 palavras
- ☐ UI: parágrafo multi-linha, bullets de evidência, badge provisional por warning, sem "Próximo passo"
- ☐ i18n PT/EN actualizados (15 rótulos de evidência + parágrafos expandidos)
- ☐ Testes (validador, resolver, fallback) verdes
- ☐ 3 exemplos de output incluídos no resumo final
- ☐ Confirmação: zero novas chamadas OpenAI; snapshots antigos sem `editorial_verdict` continuam a usar fallback
