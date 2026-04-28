# Auditoria — Prontidão para os passos 4 a 9

Objectivo: avaliar se os passos 1–3 estão suficientemente sólidos para avançar, e em que ordem fazer 4–9 sem acumular dívida.

Esta auditoria é **só leitura**. Não altera código.

---

## 1. Estado actual (o que já está entregue)

### Endpoint público de PDF — sólido
- `POST /api/public/public-report-pdf`
- TTL 600s, `cached: true|false`, `pdf_status: "ready"`
- Path determinístico: `reports/snapshots/YYYY/MM/{snapshot_id}.pdf`
- Bucket `report-pdfs` continua privado, signed URL curto
- Logging em `analysis_events` com `data_source: cache|fresh`
- Sem chamadas a Apify / DataForSEO / OpenAI
- Fluxo email-gated (`/api/generate-report-pdf`, `report_requests`) intocado

### Botão "Pedir versão PDF" — funcional, hierarquia fraca
- `ReportShareActions` recebe `snapshotId`, faz POST, abre signed URL em nova aba
- Estados `idle | loading`, toast diferenciado para `cached`
- Renderizado **duas vezes** (compact no topo + default no fundo)
- Sem indicador visual persistente de "PDF pronto" — cada clique parece igual

### Página Recommendations no PDF — sólido
- Engine determinística pura (`src/lib/pdf/recommendations.ts`)
- 4–6 recomendações em pt-PT, ordem `priority desc, id asc`
- Fallbacks `consistency_baseline` / `analytics_loop` para snapshots magros
- Renderiza condicionalmente após Top Posts

### Market Signals — entregue mas isolado
- `ReportMarketSignals` consome `/api/market-signals` no cliente
- Esconde-se silenciosamente em `disabled | blocked | error | timeout | no_keywords`
- **Não está ligado ao PDF** — o PDF não tem secção de Sinais de Mercado

### Hierarquia da página `/analyze/$username` — frágil
Auditoria anterior identificou ~23 cards sequenciais com mensagens repetidas:
`CoverageStrip → TierStrip → BetaStrip → ShareActions(compact) → EnrichedBio → ReportPage → EnrichedBenchmarkSource → EnrichedTopLinks → EnrichedMentions → CompetitorsCta? → MarketSignals → TierComparisonBlock → ShareActions(default) → BetaFeedbackBlock`

Quatro tiras de "meta" no topo, dois ShareActions, dois blocos de Tier (TierStrip + TierComparisonBlock), Beta duplicado.

---

## 2. Veredicto por passo

| Passo | Pode avançar? | Bloqueador |
|-------|---------------|-----------|
| **4. Market Signals → PDF** | Sim, com ressalva | É mecânico. Precisa só de decidir: incluir sempre ou só quando `status === ready`. PDF é cacheado por `snapshot_id`, logo se Market Signals chegar tarde, o cache fica "incompleto" para sempre. **Tem de ser invalidado por versionamento de path** (ex.: `…/{snapshot_id}.v2.pdf`) ou aceitar que o primeiro render fixa o conteúdo. |
| **5. Botão PDF "pronto/cache"** | Sim | Só requer estado local persistido (URL + expiração) e badge visual. Endpoint já devolve `cached`. |
| **6. Página pública de partilha estável** | **Adiar** | `/analyze/$username` já é a página pública. Criar `/r/{snapshot_id}` ou `/share/{slug}` só faz sentido **depois** de fechar a hierarquia (passo 7) e de ter OG image. Hoje seria duplicação. |
| **7. Animações subtis** | **Não, ainda** | Hierarquia não está fechada. Animar 23 cards repetidos amplifica o ruído. Tem de vir **depois** de uma consolidação editorial (merge de TierStrip+TierComparisonBlock, merge dos dois ShareActions, fusão dos blocos Beta). |
| **8. OpenAI para insights reais** | Sim, isolado | Já existe engine determinística em `recommendations.ts` — bom baseline. OpenAI deve ser **camada opcional** que substitui ou complementa, com fallback determinístico se a API falhar. Risco: custo por análise. Precisa kill-switch tipo `OPENAI_ENABLED`, allowlist e cache no `analysis_snapshots` para não regenerar a cada PDF. |
| **9. Free vs Pro com gating fino** | **Adiar para o fim** | Sem este gating o produto funciona; com ele introduzido cedo cria-se complexidade prematura. Já existe `TierStrip` e `plan: "free"` propagado — base suficiente para já. |

---

## 3. Dívida técnica identificada

1. **Cache do PDF não tem versionamento.** Se o conteúdo da página mudar (Market Signals adicionado, OpenAI insights ligados), os PDFs antigos em cache continuam servidos. Precisa de `pdf_version` no path ou hash do payload+features.
2. **Dois `ReportShareActions` no DOM.** Estado de "PDF pronto" teria de ser sincronizado entre eles ou movido para um contexto/store. Resolver fundindo num único bloco antes do passo 5.
3. **`TierStrip` + `TierComparisonBlock` + `BetaStrip` + `BetaFeedbackBlock`** dizem variações da mesma coisa ("isto é beta / vais ter Pro"). Quatro componentes, uma mensagem.
4. **`CoverageStrip`** e **`ReportEnrichedBenchmarkSource`** sobrepõem-se conceptualmente (ambos descrevem proveniência dos dados).
5. **`/api/market-signals`** é chamado no cliente mas o PDF (server) não tem acesso ao resultado sem chamar de novo — duplica custo DataForSEO se ligado ingenuamente.

---

## 4. Ordem recomendada (revisão à proposta)

A tua ordem (4 → 5 → 6 → 7 → 8 → 9) tem dois problemas: o passo 7 vem cedo demais e o passo 6 vem antes de fechar hierarquia. Proponho:

```text
A. Consolidação editorial da página /analyze/$username  (pré-requisito)
   - fundir TierStrip + TierComparisonBlock
   - fundir BetaStrip + BetaFeedbackBlock
   - manter UM ReportShareActions
   - decidir destino de EnrichedTopLinks / EnrichedMentions

B. Passo 5 — Botão PDF com estado "pronto / em cache"
   - mais barato e desbloqueia UX antes de mexer no PDF

C. Passo 4 — Market Signals no PDF
   - introduzir versionamento do path do PDF em simultâneo
   - reutilizar resultado já obtido no cliente (passar via POST body) ou
     refetch server-side com cache curta

D. Passo 8 — OpenAI insights
   - como camada opcional, fallback para engine determinística
   - persistir resultado no snapshot, não regenerar por PDF

E. Passo 7 — Animações subtis
   - só agora, sobre uma hierarquia consolidada

F. Passo 6 — Página pública estável /r/{slug}
   - quando há OG image dinâmica e hierarquia fechada

G. Passo 9 — Free vs Pro gating fino
   - último, com base de utilização real
```

---

## 5. Conclusão

**Podemos avançar**, mas não pela ordem proposta. O que está em produção (passos 1–3) é sólido tecnicamente; a fragilidade é editorial/UX. Recomendo intercalar uma fase **A (consolidação)** antes do passo 5, e mover o passo 7 para depois do 8.

## Checkpoint

- ☐ Aprovas a reordenação (A → 5 → 4 → 8 → 7 → 6 → 9)?
- ☐ Ou preferes manter a ordem original e aceitar que animações vão ficar sobre a hierarquia actual?
- ☐ Confirmas que podemos introduzir versionamento no path do PDF (`…/{snapshot_id}.v{n}.pdf`) quando o passo 4 entrar?
