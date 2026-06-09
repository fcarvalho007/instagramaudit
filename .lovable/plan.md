# Auditoria GTM — Paid Profile vs Competitor Report

## TL;DR
**Verdict: 🟡 GO BETA com avisos.** Visual & data architecture maduros (cards Pro respeitam paleta Ocean Breeze, missing-states honestos no Format/Weekday, hero editorial). Mas **3 blockers** antes do launch público pago:
- **B1** Avatares + thumbnails de concorrentes vêm direto da CDN do Instagram (expira 24-48h) → relatório fica visualmente partido em 2 dias.
- **B2** Concorrentes **não estão gated por `report_full_9`** — qualquer lead free com 1 crédito dispara Apify para 2 perfis extra (custo + abuso).
- **B3** Cards `CompetitorEngagementCompare` e `CompetitorCadenceCompare` fazem `return null` silencioso → utilizador vê espaço vazio sem perceber porquê.

Score visual: **78/100**. Score data-completeness: **65/100**.

---

## 1. PASS/FAIL por card

| # | Card | Ficheiro | Status | Nota |
|---|---|---|---|---|
| 1 | Comparison Hero | `overview/comparison-hero.tsx:70-250` | ✅ PASS | grid `1fr/auto/1fr`, mobile colapsa, verdict editorial determinístico |
| 2 | Engagement Compare + Benchmark rail | `competitor-engagement-compare.tsx:34` | 🟡 PARTIAL | `return null` se ER≤0 — fica frame vazio sem mensagem |
| 3 | Cadence Compare | `competitor-cadence-compare.tsx` | 🟡 PARTIAL | `return null` se freq=0; depende de thumbs CDN (B1) |
| 4 | Mix de Formatos | `competitor-format-compare.tsx:57-115` | ✅ PASS | `MissingSide` com "Sem dados de formatos" — honesto |
| 5 | Weekday Compare | `competitor-weekday-compare.tsx` | ✅ PASS | Mensagem "Sem dados suficientes do concorrente" quando flag false |
| 6 | Bio / Conversion path | `competitor-bio-compare.tsx:24` | ✅ PASS estrutural | TODO: multi-competitor — hoje só `competitorBreakdown[0]` |
| 7 | Top post compare | `competitor-top-post-compare.tsx` | ⚠️ FAIL pós-48h | depende 100% de thumb CDN (B1) |
| 8 | Legacy bar chart | `report-competitors.tsx` | ✅ PASS | empty-state "Adicione concorrentes…" |

## 2. Data completeness por concorrente

| Campo | Onde é computado | Persistido em | Pode falhar? |
|---|---|---|---|
| `profile.{username, fullName, followers, verified}` | `analyze-public-v1.ts:1148` | `normalized_payload.competitors[i].profile` | Não (sempre vem do Apify) |
| `avatarUrl` | Apify response direto | inline (CDN URL) | 🚨 **Expira 24-48h** |
| `post[].thumbnailUrl` | Apify response direto | inline (CDN URL) | 🚨 **Expira 24-48h** |
| `format_stats` | `enrichPosts` `1188` | `competitors[i].format_stats` | Sim → flag `hasFormatStats` |
| `weekday_counts` | `enrichPosts` `1157-1163` | `competitors[i].weekday_counts` | Sim → flag `hasWeekdayData` |
| `engagement_rate` | `content_summary` | `competitors[i].content_summary` | Pode ser 0 (perfil sem posts recentes) |
| `topHashtags` | `enrichPosts` | `competitors[i].top_hashtags` | Pode ser `[]` |

**Cobertura típica esperada:** ~90% no dia 0, **~40% após 48h** (thumbs/avatares partidos).

## 3. Análise das perguntas-chave

| Pergunta | Resposta |
|---|---|
| Sente-se como feature pago? | 🟡 Sim no dia 0 (hero editorial, dual donut, benchmark rail). Não após 48h. |
| Missing data states honestos? | 🟡 Format/Weekday sim. Engagement/Cadence **silenciosamente nulos**. |
| Zeros enganadores? | ⚠️ `hasFormatStats === undefined` cai em `true` por defeito → snapshot legado pode mostrar donut a 0/0/0. |
| Imagens sobrevivem à CDN? | 🚨 **Não.** Nenhum re-host para `post-thumbnails`. `avatar_storage_url` está sempre `null` (`normalize.ts:125`). |
| Suporte vê concorrentes? | ✅ Sim. `report-drawer.tsx:191-431` lista handles; reports table `:44,214` mostra count. |
| Concorrente dispara provider inesperado? | 🟡 Apenas **dentro** do crédito reservado. Sem entitlement gate → free user dispara 2x Apify por 1 crédito. |
| MVP suficiente? | ✅ Para beta privado. ❌ Para pagamento público sem fix de B1+B2. |

## 4. Blockers antes de launch pago público

### 🚨 B1 — Persistência de avatares/thumbs de concorrentes
- **Problema:** `avatar_storage_url=null` sempre; competitor `thumbnail_storage_url` excluído (`analyze-public-v1.ts:1148`). Após 24-48h o relatório pago fica visualmente partido.
- **Fix:** Pipeline async pós-snapshot que faz upload dos N avatares + top-K thumbs (primary+competitors) para `post-thumbnails`, atualiza `avatar_storage_url`/`thumbnail_storage_url` no `normalized_payload`. Render lê storage URL com fallback CDN.

### 🚨 B2 — Sem entitlement gate em `competitor_usernames`
- **Problema:** `analyze-public-v1.ts:587-598` só faz `hasEntitlement(report_full_9)` para wide window (30d/90d). Free user pode passar `?vs=a,b` e queimar 2 chamadas Apify extra por 1 crédito.
- **Fix:** Antes de `reserveCredit`, se `competitors.length > 0` e `!isPro` → `return failure("COMPETITORS_REQUIRE_PRO")`. Alternativa: aceitar e cobrar +1 crédito por concorrente (mas obriga UI a avisar).

### 🚨 B3 — Cards silenciosamente nulos
- **Problema:** `CompetitorEngagementCompare` e `CompetitorCadenceCompare` fazem `return null` quando dados <=0. Frame editorial fica espaçamento morto.
- **Fix:** Substituir `return null` por `<MissingSide reason="…" />` reutilizando o padrão já existente no Format card.

## 5. Limitações aceitáveis para beta

- **L1** Sem UI in-page para "adicionar concorrente" — flow é só `?vs=` na URL. Aceitável beta; pós-beta criar input.
- **L2** Bio compare só renderiza `competitorBreakdown[0]` (multi-comp adiado).
- **L3** Concorrentes partilham TTL do primário — re-fetch desnecessário em alguns casos. Custo controlado pelo cache key.
- **L4** Sem `competitor` reason code dedicado no ledger (1 crédito = primário + concorrentes bundled). Operacionalmente OK enquanto MAX_COMPETITORS=2.
- **L5** Sem 375px breakpoint explícito — confiança nos defaults `sm:`/`md:` Tailwind. Visual OK no spot-check, mas falta QA real.

## 6. Fixes finais exatos (ordem recomendada)

| # | Fix | Ficheiro | Esforço |
|---|---|---|---|
| F1 | Adicionar gate `report_full_9` antes de aceitar `competitor_usernames` | `src/routes/api/analyze-public-v1.ts` ~ linha 587 | 30min |
| F2 | Substituir `return null` por `<MissingSide />` nos 2 cards silenciosos | `competitor-engagement-compare.tsx:34`, `competitor-cadence-compare.tsx` | 1h |
| F3 | Forçar `hasFormatStats` boolean explícito ao ler snapshot (nunca `undefined → true`) | adapter `snapshot-to-report-data.ts` | 30min |
| F4 | Pipeline async de re-host avatares + top thumbs para `post-thumbnails` bucket; render usa `avatar_storage_url \|\| avatarUrl` | nova fn `persist-competitor-media.server.ts` + alteração no enriquecimento | 4-6h |
| F5 | QA mobile real a 375px com 1 e 2 concorrentes (screenshots) | preview manual | 30min |
| F6 | Admin: na drawer mostrar idade do snapshot ("thumbs expiram em Xh") até F4 entrar | `report-drawer.tsx` | 1h |

## 7. Verdict de launch

- **🟢 GO BETA privado** já (com B1 documentado a clientes como "imagens podem expirar — recarregar relatório").
- **🟡 GO PÚBLICO pago** condicional a **F1 + F2 + F3 + F4** entrarem em produção. F5/F6 são polish.
- **🔴 NO-GO** abrir competitors a Free tier sem F1 (risco de custo Apify descontrolado).
