## Refinamentos propostos à camada de Knowledge Base

Após inspeção do código atual (`benchmark-context.ts`, `sanitize-ai-copy.ts`, `context.server.ts`, `prompt-v2.ts`, `validate-v2.ts`) identifiquei **4 refinamentos úteis** — todos pequenos, todos em ficheiros que **eu próprio escrevi nas iterações anteriores** (nenhum ficheiro locked é tocado).

Foco: corrigir uma **contradição activa de política**, fechar um **gap de cobertura** (perfis 1M+), reforçar o validador anti-invenção e ligar finalmente o `sanitizeAiCopy` ao orquestrador (modo log-only, sem schema novo).

---

### R1 — Corrigir contradição de política em `context.server.ts` ⚠️

**Problema**: O bloco final injectado no prompt do GPT diz literalmente *"Cite fonte quando relevante"*. Isto contradiz directamente a política aprovada em `mem://features/benchmark-policy.md` e em `KNOWLEDGE.md`, que proíbem atribuição directa do tipo "segundo a Socialinsider…". O `sanitizeAiCopy` chega a marcar essa frase como violação `source_attribution` — ou seja, a IA está a ser instruída a fazer exactamente o que depois é apanhado como erro.

**Correcção**: Reescrever as duas linhas finais de `formatKnowledgeContextForPrompt` para:
- Pedir interpretação fundamentada **sem** citar marcas externas
- Reforçar linguagem de hedge ("referência direcional", "indica", "sugere")
- Proibir explicitamente menção a alcance/saves/partilhas se `hasReachData=false` (hint passado pelo orquestrador)

---

### R2 — Cobrir perfis ≥1M no `getBenchmarkContextForProfile`

**Problema**: `getBufferTierForFollowers(1_500_000)` devolve `null` silenciosamente. O helper de perfil propaga isso e o relatório fica sem qualquer copy de tier para macro-influencers e marcas grandes.

**Correcção**:
- Adicionar fallback `bufferTier=null → internalTier="macro"` (em vez de `null`)
- Acrescentar `copyHints.tierNote` curto em pt-PT: *"Conta com ≥1M seguidores: a referência Buffer 500K–1M é a mais próxima disponível; leitura puramente direcional."*
- 2 testes novos: `followers=1_200_000` e `followers=0`

---

### R3 — Reforçar `sanitize-ai-copy.ts` com termos técnicos em falta

**Problema**: A IA pode escapar termos como `engagement_rate`, `er_pct`, `followers_count`, `mediaType`, `playCount`, `videoViewCount` — todos snake/camel-case que aparecem regularmente em respostas brutas de scrapers Instagram. O `validate-v2.ts` já tem o `detectTechnicalLeak` mas não cobre estes específicos do domínio Apify/Instagram.

**Correcção**:
- Adicionar 6 padrões à lista `TECHNICAL_TERMS`
- Adicionar padrão para detectar índices crus tipo `posts[0]`, `data.items[3]`
- 2 testes novos a cobrir os novos padrões

---

### R4 — Ligar `sanitizeAiCopy` ao orquestrador v2 (modo log-only)

**Problema**: O helper está implementado e testado, mas nunca é invocado. Sem ligação, a política existe só no papel.

**Correcção mínima e segura** (não toca em schema, não persiste):
- Em `src/lib/insights/openai-insights.server.ts`, dentro de `generateInsightsV2`, depois da resposta validada por `validate-v2`, percorrer os `sections` e correr `sanitizeAiCopy(item.text, { hasReachData })` em cada texto.
- Se `ok=false`, fazer `console.warn("[knowledge.sanitize]", { section, kind, match })` por violação. **Não bloqueia render** — apenas observa, conforme a política definida.
- `hasReachData` deriva-se do snapshot já disponível no contexto da função (sem queries novas).

**Não-objectivos**:
- ❌ Não mexer em `provider_call_logs` nem criar coluna `metadata` (fica para prompt dedicado)
- ❌ Não bloquear/descartar texto em produção (para já só telemetria via console)
- ❌ Não tocar em `prompt-v2.ts` para além de R1 (a serialização é feita por `formatKnowledgeContextForPrompt`)

---

### Ficheiros tocados

```text
src/lib/knowledge/context.server.ts                          (R1)
src/lib/knowledge/benchmark-context.ts                       (R2)
src/lib/knowledge/sanitize-ai-copy.ts                        (R3)
src/lib/knowledge/__tests__/benchmark-context.test.ts        (R2 +2 testes)
src/lib/knowledge/__tests__/sanitize-ai-copy.test.ts         (R3 +2 testes)
src/lib/insights/openai-insights.server.ts                   (R4 — bloco curto, post-validate)
```

Nenhum ficheiro locked. Sem migrations. Sem novas dependências. Sem mudanças de schema.

### Validação final
- `tsc --noEmit` deve continuar verde
- `vitest run` deve passar 33 + 4 = **37 testes**
- Smoke manual: gerar insights v2 para o perfil de teste e confirmar que (a) prompt não pede atribuição e (b) console regista zero ou poucas violações

---

### Checkpoint

- ☐ R1 — Corrigir copy do prompt em `context.server.ts`
- ☐ R2 — Fallback macro + `tierNote` em `benchmark-context.ts` (+2 testes)
- ☐ R3 — Termos técnicos extra em `sanitize-ai-copy.ts` (+2 testes)
- ☐ R4 — Ligar `sanitizeAiCopy` no `generateInsightsV2` (log-only)
- ☐ `tsc` e `vitest` verdes (37 testes)