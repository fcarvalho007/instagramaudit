
## Parte 1 — Auditoria: como é gerado o card "Índice do perfil"

O card é o **EditorialIdentityCard** (`src/components/report-redesign/v2/overview/editorial-identity-card.tsx`) e tem **três camadas de conteúdo**, cada uma com origem diferente:

### A. Score "31 / 100" e a régua
**100% determinístico, sem IA.** Calculado em `computeOverall` → `computeGlobalScore` (`score-utils.ts`) com pesos fixos:
- Envolvimento 45% · Ritmo 25% · Conversa 30%

Inputs vêm dos `scores` derivados do snapshot Apify (likes, comentários, posts, frequência semanal). A régua mostra a posição vs. mediana do escalão (tier Nano/Micro/Mid/Macro), também determinística a partir do benchmark da Knowledge Base.

### B. Título ("Cadência forte, sinal fraco") + parágrafo
**Gerado pela OpenAI** (com fallback determinístico).

Pipeline:
1. **Snapshot Apify** → `build-context.ts` constrói o `InsightsContext` (perfil, content_summary, cadence, top_posts, benchmark, market_signals, editorial_patterns, top_hashtags, caption_intelligence, visual_cover).
2. **Prompt** em `src/lib/insights/prompt-v2.ts` → `SYSTEM_PROMPT_BASE` (linhas 34–134). A secção que produz este card é **`editorial_verdict`** (linhas 100–134).
3. **Chamada OpenAI** em `src/lib/insights/openai-insights.server.ts`. Modelo default: **`gpt-5.4-mini`** (`cost.ts:13`, `DEFAULT_OPENAI_MODEL`). URL `https://api.openai.com/v1/chat/completions`. Protegido por kill-switch `isOpenAiEnabled()` + allowlist `isOpenAiAllowed(handle)`.
4. **Validação** em `src/lib/insights/validate-v2.ts`. Rejeita o output se:
   - parágrafo fora de 90–140 palavras ou >4 frases
   - contém `N%` ou `N,N%`
   - menciona métricas privadas (alcance, reach, saves…)
   - usa verbos prescritivos ("publicar", "testar", "aumente"…)
   - não cita hashtag ou frase de ausência de hashtags
   - menciona capas/visual sem `visual_cover.*` em evidence
5. **Resolução IA vs determinístico** em `src/lib/report/editorial-verdict.ts` → `deriveEditorialVerdict`. Se IA falhar/contradizer (ex.: afirma "ritmo forte" quando `cadence.reliability === "low"`, ou cita concorrentes inexistentes), o paragraph é substituído pelo `buildFallbackVerdict` (`editorial-verdict-fallback.ts`), que lê templates de `i18n/locales/pt/report.json` → `identity.fallback.<key>.paragraph`.

### Regras-chave do prompt (resumo, linhas 100–134 do `prompt-v2.ts`)
- `verdict_label`: strong | promising | needs_work | limited_data
- `title`: 4–8 palavras, sem dígitos, sem ponto final
- `paragraph`: 90–140 palavras, 4 frases máx., **DIAGNÓSTICO não solução**
- Deve cobrir nesta ordem: actividade → cadência (com `cadence_label_pt` verbatim) → envolvimento (sem imprimir %) → likes vs comentários → hashtags (estado `recurring`/`weak`/`absent`)
- `evidence_used`: allowlist fechada (`EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST` em `types.ts:395`)

### C. "Sinais usados", "Pontos fortes", "Limitações", "Warnings"
Vêm do mesmo JSON da IA (`strengths`, `limitations`, `evidence_used`, `warnings`). `warnings` é preenchido pelo backend, não pela IA.

### Custo
`gpt-5.4-mini` a $0,25/M tokens input · $2,0/M output (registado em `provider_call_logs`).

---

## Parte 2 — Fix do texto desalinhado no card

**Causa:** em `editorial-identity-card.tsx:428`, o `<p>` do parágrafo tem `max-w-3xl` (≈768px) enquanto o card ocupa ≈1040px no desktop. O título (`h2`) também tem `max-w-3xl`. Isso cria a zona vazia à direita visível na captura.

**Mesma situação** afecta:
- `h2` do título (linha 424)
- container "Sinais usados nesta leitura" (linha 433)
- `p` de warnings (linha 459)

### Mudança proposta (mínima, escopo: este card apenas)

1. **Remover `max-w-3xl`** das 4 ocorrências (linhas 424, 428, 433, 459) → o texto passa a usar toda a largura do container interior (`px-6/sm:px-7` já dá respiração horizontal natural).
2. **Adicionar `text-pretty`** ao `h2` e `<p>` para melhor quebra de linhas (evita órfãs).
3. **Manter** `whitespace-pre-line` no parágrafo (preserva quebras `\n` da IA).
4. **Não tocar** em prompt, validador, fallback, lógica de score ou régua.

### Ficheiros tocados
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (4 linhas)

### Validação
- `bunx tsc --noEmit`
- Preview em 1460×905 (desktop) e 411×742 (mobile) para confirmar que o parágrafo enche o card no desktop e que mobile não fica afectado.

### Fora de escopo
- Bloco 2+, sidebar, hero, lead-magnet, `/report.example`, prompts da IA, validador, fallback, modelo, custo, knowledge base.

---

## ☐ Checkpoint
- [ ] Remover `max-w-3xl` das 4 ocorrências no `editorial-identity-card.tsx`
- [ ] Adicionar `text-pretty` ao `h2` e `<p>`
- [ ] `bunx tsc --noEmit` passa
- [ ] Screenshot desktop confirma texto a usar largura completa
- [ ] Screenshot mobile confirma que nada partiu
