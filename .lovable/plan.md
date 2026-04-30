

# Plano · Camada de conhecimento de benchmarks Instagram

> **Modo Plano. Nenhum ficheiro será alterado.** **Importante:** parte significativa deste plano **já existe** no projecto (sessões anteriores). Este plano consolida o estado actual e foca-se apenas no que ainda falta para fechar a camada de forma robusta.

---

## 1. Entendimento do objetivo

Estabelecer no InstaBench uma **camada interna e auditável de contexto de benchmark** (Socialinsider, Buffer, Hootsuite, Databox) que sirva tanto:
- **a IA** (orquestrador de insights, para fundamentar interpretações),
- **o UI** (para microcopy e enquadramento direcional),
- **a governança** (uma única fonte de verdade, regras de hedging, anti-invenção).

As fontes aparecem **apenas como nomes**, nunca como links, nunca atribuindo análise do perfil às fontes externas.

---

## 2. Estado actual (o que já existe — não recriar)

| Artefacto | Localização | Estado |
|---|---|---|
| Política canónica humana | `KNOWLEDGE.md` (raiz) | ✓ presente, **locked** |
| Memória de projeto | `mem://features/benchmark-policy` | ✓ presente |
| Constante de dados estruturados | `src/lib/knowledge/benchmark-context.ts` (`INSTAGRAM_BENCHMARK_CONTEXT` + 3 helpers + tipos + 8 testes) | ✓ presente |
| Nota canónica injectada no prompt OpenAI | `knowledge_notes` (id `5171734b-…`, categoria `tool`) | ✓ inserida; refresh expandido em migration **pendente** (`20260430145758_update_benchmark_policy_note.sql`) |
| Microcopy "Contexto de referência" no relatório | `report-positioning-banner.tsx` | ✓ presente |
| Microcopy editorial nos 3 cartões do Bloco 01 | `report-overview-cards.tsx` | ✓ presente (engagement / ritmo / formato) |
| Tabela `knowledge_benchmarks` (referência interna por tier/formato) | Supabase | ✓ existe — alimentada por outra fonte |

**Conclusão crítica:** o pedido original deste prompt é **largamente coincidente** com o trabalho já feito. O que falta é (a) **wiring** das constantes ao UI/prompt, (b) **camada de validação/sanitização** para as regras anti-invenção, (c) **expansão futura** para indústria + autenticado.

---

## 3. Ficheiros a inspecionar antes de implementar (lacunas reais)

### 3.1 Wiring IA ↔ contexto estruturado
- `src/lib/insights/openai-insights.server.ts` — orquestrador da chamada única.
- `src/lib/insights/prompt-v2.ts` — prompt-system actual; verificar onde injectar contexto numérico compacto.
- `src/lib/knowledge/context.server.ts` — `formatKnowledgeContextForPrompt`; potencial extensão para emitir snippet de Buffer-tier + Socialinsider format-row específicos do perfil.

### 3.2 Wiring UI ↔ contexto estruturado
- `src/components/report-redesign/v2/report-overview-cards.tsx` — `EngagementRateCard` actualmente usa string inline; podia consumir `INSTAGRAM_BENCHMARK_CONTEXT.visibleCopyRulesPt.engagementExplanation`.
- `src/components/report-redesign/v2/report-positioning-banner.tsx` — idem para `sourceNote` + `benchmarkNote`.
- `src/components/report-redesign/v2/report-diagnostic-card.tsx` — Q01 Tipo/Q04 Formato podem ganhar `carouselExplanation` / `reelsExplanation` / `imageExplanation` quando aplicável.

### 3.3 Validação / guard-rails
- `src/lib/insights/validate-v2.ts`, `validate-market.ts`, `validate-editorial.ts` — actualmente validam shape; precisariam de **lista de termos banidos** (regex sobre output da IA): `payload`, `engagement_pct`, `result.data`, `keyMetrics`, "according to", "segundo a Hootsuite", "alcance" / "reach" / "saves" / "shares" sem dataset.

### 3.4 Reach / Buffer-tier
- `src/lib/report/snapshot-to-report-data.ts` — verificar se há campo `reach` no shape actual (não há). Para usar `medianReachPerPost` do Buffer no UI, é necessário primeiro adicionar `reach` ao snapshot quando provider o devolva. Hoje o campo deve **continuar interno**.

---

## 4. Política canónica · "Instagram Benchmark Context & Source Policy"

**Já existe e está locked em `KNOWLEDGE.md`.** O texto cobre: fontes aprovadas, regra de "nomes-only sem links", etiquetagem perfil/referência/interpretação, métricas proibidas de inventar, copy canónico de envolvimento, uso por fonte, uso por bloco.

**Ação proposta neste plano:**

1. **Aplicar a migration pendente** `20260430145758_update_benchmark_policy_note.sql` que sincroniza a `KnowledgeNote` na BD com a versão expandida do `KNOWLEDGE.md` (atualmente desactualizada — `body_len=1127` vs versão expandida).
2. Sem novas adições à política — está completa.

---

## 5. Modelo estruturado de dados (decisão e gaps)

**Decisão (já tomada e correcta):** ficheiro de constantes TypeScript em `src/lib/knowledge/benchmark-context.ts`. Justificação:
- Imutável, versionado em git.
- Sem schema change.
- Importável de UI e servidor.
- `as const` + `satisfies` ⇒ type-safety total.
- Helpers prontos: `getBufferTierForFollowers`, `getSocialinsiderEngagementForFormat`, `getHootsuiteBenchmarkForIndustry`.

**Gaps a adicionar nesta camada (quando aprovado):**

### 5.1 Helper de matching automático
```text
getBenchmarkContextForProfile({ followers, dominantFormat, industry? })
  → {
      bufferTier:    BufferFollowerTier | null,
      socialinsider: SocialinsiderEngagementEntry | null,
      hootsuite:     HootsuiteIndustryEntry | null,
      copyHints:     { engagement, frequency, format },
    }
```
Um único helper consumido pelo UI e pela camada de prompt — evita lógica duplicada.

### 5.2 Helper anti-invenção (validador de copy IA)
```text
sanitizeAiCopy(text: string): { ok: boolean; violations: string[] }
```
- Detecta termos técnicos: `payload|engagement_pct|result\.data|keyMetrics|API`.
- Detecta atribuição directa: `segundo a (Socialinsider|Buffer|Hootsuite|Databox)`.
- Detecta menções a métricas inexistentes no snapshot: `alcance|reach|saves|partilhas|impressões` quando a flag `hasReachData=false`.
- Retorna lista de violações para logging interno (não bloqueante na primeira fase, observabilidade apenas).

### 5.3 Constante derivada de "tier-bridge"
A tabela `knowledge_benchmarks` usa tiers `nano|micro|mid|macro`. A `INSTAGRAM_BENCHMARK_CONTEXT` (Buffer) usa `0-1K|1-5K|…`. Adicionar um mapa explícito:
```text
BUFFER_TIER_TO_INTERNAL_TIER: Record<BufferTier, BenchmarkTier>
```
para cruzamentos coerentes entre as duas fontes.

### 5.4 Adicionar campo `internalReferenceNote` no shape
Em `snapshot-to-report-data.ts`, quando `engagementBenchmark` é resolvido, adicionar um campo opcional `referenceFamily: "internal" | "socialinsider" | "buffer"` para que o UI saiba qual etiqueta mostrar ("referência interna · tier micro" vs "contexto Socialinsider").

---

## 6. Uso por bloco do relatório (mapeamento concreto)

### Bloco 01 · Overview
**Já implementado** (microcopy básica).
**Adições propostas:**
- `EngagementRateCard` consome `visibleCopyRulesPt.engagementExplanation` em vez de string inline.
- Quando `getBufferTierForFollowers(followers)` devolve tier, **adicionar uma linha mono opcional**: *"Tier seguidores: 5–10K · referência cadência: 20/mês"*. Sem reach.
- Banner já mostra `sourceNote`. Manter.

### Bloco 02 · Diagnóstico Editorial
- **Q01 Tipo de conteúdo:** quando "Educativo", anexar `carouselExplanation` como `aiSource`-style microcopy.
- **Q04 Formato dominante:** consumir `reelsExplanation`/`carouselExplanation`/`imageExplanation` consoante o formato dominante do perfil.
- **Q06 Resposta da audiência:** principal local para hedging — "sinal de consumo passivo", "engagement de superfície".
- **Não duplicar KPIs do Bloco 01.**

### Bloco 03 · Performance (futuro)
- Local primário para `BufferFollowerTier.postsPerMonth` vs cadência real do perfil.
- Comparação `getSocialinsiderEngagementForFormat(dominantFormat)` vs envolvimento real por formato (quando o snapshot expor split por formato).
- Sample-confidence pill (já no plano do Bloco 03 da sessão anterior).

### Bloco 04 · Conteúdo (quando existir)
- Princípios estratégicos do `socialinsider.strategicPrinciples` aplicados directamente.

### Tiers pagos futuros (não implementar agora)
- **Indústria seleccionada pelo utilizador** → activar `getHootsuiteBenchmarkForIndustry`.
- **Conexão autenticada Instagram** → activar Databox-style (alcance, visitas, cliques).
- **Snapshots históricos** → activar follower growth do Buffer.

---

## 7. Riscos e salvaguardas

| Risco | Mitigação |
|---|---|
| **Reach do Buffer fugir para o UI sem dataset real** | Helper `getBenchmarkContextForProfile` recebe `hasReachData: boolean` e omite reach se `false`. Validador `sanitizeAiCopy` detecta menções a `alcance/reach`. |
| **IA atribuir números do perfil a fontes externas** | `sanitizeAiCopy` detecta `segundo a X` e flag interna. Política já injectada no prompt via KB. |
| **Hootsuite indústria usado sem indústria conhecida** | Helper devolve `null` se industry null/undefined. UI nunca renderiza. |
| **Drift entre `KNOWLEDGE.md`, constante TS e nota BD** | Migration pendente sincroniza nota com KNOWLEDGE.md. CI futuro: teste que verifica que copy canónico no TS corresponde a regex do KNOWLEDGE.md. |
| **Conflito tiers Buffer (`0-1K`) vs internos (`nano`)** | Mapa explícito `BUFFER_TIER_TO_INTERNAL_TIER` + teste de cobertura. |
| **Token bloat no prompt** | Injecção condicional: só envia bufferTier+socialinsider relevantes ao perfil, não todo o dataset. |
| **Nomes das fontes repetidos demasiado** | Política: ≤2 ocorrências por relatório. UI: nomes vivem no banner; cartões usam apenas explicações temáticas. |
| **Tabela `knowledge_benchmarks` interna ficar desconectada das constantes** | `referenceFamily` no shape distingue origem. Documentação clara de qual fonte alimenta qual cartão. |

---

## 8. Critérios de aceitação (futura implementação)

- [ ] Migration `20260430145758_update_benchmark_policy_note.sql` aplicada (BD em sync com KNOWLEDGE.md).
- [ ] `getBenchmarkContextForProfile` implementado e testado.
- [ ] `sanitizeAiCopy` implementado, com testes para cada termo banido.
- [ ] `BUFFER_TIER_TO_INTERNAL_TIER` definido e testado.
- [ ] `EngagementRateCard` consome `visibleCopyRulesPt.engagementExplanation`.
- [ ] Banner consome `visibleCopyRulesPt.sourceNote` em vez de string inline.
- [ ] Cartão Q04 do Bloco 02 mostra explicação por formato vinda do dataset.
- [ ] Reach do Buffer **nunca** aparece no UI até `hasReachData=true`.
- [ ] Hootsuite **nunca** aparece sem indústria definida.
- [ ] `sanitizeAiCopy` é executado em modo "log only" sobre output da IA; violações vão para `provider_call_logs.metadata`.
- [ ] Zero links externos. Zero novas chamadas a Apify/DataForSEO/OpenAI/PDFShift.
- [ ] Zero migrations de schema (apenas a UPDATE pendente).
- [ ] Toda copy nova em pt-PT (AO90).
- [ ] `bunx tsc --noEmit` ✓ · `bunx vitest run` ✓.

---

## 9. Plano de file-locking

Tocados na futura implementação:
```text
src/lib/knowledge/benchmark-context.ts        (adicionar getBenchmarkContextForProfile, BUFFER_TIER_TO_INTERNAL_TIER)
src/lib/knowledge/sanitize-ai-copy.ts         (NOVO)
src/lib/knowledge/__tests__/*.test.ts         (testes adicionais)
src/lib/knowledge/context.server.ts           (extensão para emitir snippet condicional)
src/components/report-redesign/v2/report-overview-cards.tsx       (consumir copy canónico)
src/components/report-redesign/v2/report-positioning-banner.tsx   (consumir copy canónico)
src/components/report-redesign/v2/report-diagnostic-card.tsx      (Q01/Q04 receber explicação)
src/lib/report/snapshot-to-report-data.ts     (campo referenceFamily)
```

**Não tocar:**
- `src/integrations/supabase/*` (auto-gerados).
- Ficheiros listados em `LOCKED_FILES.md` (incluindo `KNOWLEDGE.md` e `report-methodology.tsx`).
- `src/lib/insights/prompt-v2.ts` — alterar **só** se a injeção via KB existente não chegar (verificar primeiro).

Após implementação: avaliar **lock** de `src/lib/knowledge/benchmark-context.ts` (dataset estável).

---

## 10. Prompt para a fase de implementação (quando aprovado)

```text
Implementar a camada de wiring da knowledge base de benchmarks
aprovada no plano "Camada de conhecimento de benchmarks Instagram":

1. Aplicar migration pendente:
   supabase/migrations/20260430145758_update_benchmark_policy_note.sql

2. Estender src/lib/knowledge/benchmark-context.ts:
   - export const BUFFER_TIER_TO_INTERNAL_TIER (Record com mapa).
   - export function getBenchmarkContextForProfile({ followers,
     dominantFormat, industry?, hasReachData }) com return type
     explícito (omite reach se hasReachData=false).
   - Testes: cobertura completa de tiers, formatos e omissão de reach.

3. Criar src/lib/knowledge/sanitize-ai-copy.ts:
   - export function sanitizeAiCopy(text, { hasReachData }):
     { ok, violations }.
   - Regex para termos técnicos (payload|engagement_pct|result\.data|
     keyMetrics) e atribuição directa ("segundo a (Socialinsider|
     Buffer|Hootsuite|Databox)").
   - Testes para cada categoria de violação.

4. Estender src/lib/knowledge/context.server.ts:
   - Aceitar um BenchmarkContextForProfile e serializar em texto
     compacto (≤ 30 linhas) para anexar ao prompt-system.

5. Wiring UI (consumir constantes — não duplicar copy):
   - report-positioning-banner.tsx: usar visibleCopyRulesPt.sourceNote.
   - report-overview-cards.tsx (EngagementRateCard): usar
     visibleCopyRulesPt.engagementExplanation. Se houver bufferTier
     resolvido, adicionar linha mono "Tier seguidores: X · cadência
     referência: Y/mês".
   - report-diagnostic-card.tsx (Q04): aceitar prop opcional
     formatExplanation; ReportDiagnosticBlock injecta consoante o
     formato dominante.

6. Aplicar sanitizeAiCopy em modo log-only sobre o output do orquestrador
   OpenAI; gravar violations em provider_call_logs.metadata. Sem
   bloquear render.

7. Reach do Buffer NUNCA aparece no UI até hasReachData=true. Hootsuite
   NUNCA aparece sem indústria. Databox NUNCA aparece nesta fase.

8. Validar:
   - bunx tsc --noEmit
   - bunx vitest run (todos os testes verdes)
   - Visual: relatório dark/light, mobile 375px e desktop, em
     /analyze/frederico.m.carvalho.

9. Reportar: ficheiros tocados, migration aplicada, número de testes
   adicionados, exemplos de output pré/pós wiring.

Restrições absolutas:
- Sem novas chamadas a providers externos.
- Sem alteração de schema.
- Sem alteração ao prompt-v2.ts a não ser que estritamente necessário.
- Sem links externos no UI.
- Sem tocar em ficheiros locked.
- Toda copy visível em pt-PT (AO90).
```

---

## 11. Resumo executivo

A **camada de conhecimento já está construída** (KNOWLEDGE.md + nota BD + dataset TS + microcopy básica). O próximo passo é o **wiring**: ligar essas constantes ao UI e à IA, criar o validador anti-invenção, e fechar o loop com a migration pendente. Tudo sem schema, sem providers externos, sem links.

