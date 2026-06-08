# Auditoria GTM — Free Instagram Report

## TL;DR
**Conversion Readiness: 71/100.** A arquitetura é sólida: onboarding é obrigatório server-side, créditos iniciais idempotentes (2), guardas de custo completas, e o caminho Free **não chama OpenAI nem DataForSEO** (zero risco de custo escondido). Os teasers premium e a sticky unlock bar existem e estão ligadas. Há **3 bloqueadores operacionais de launch** (envs Apify), **2 problemas de clareza de UX** (CTA desktop sem preço, 2 fluxos de captura coexistem) e **1 decisão de produto pendente** (`FREE_ENRICHMENT_TYPES = []` significa zero enriquecimento async no Free — intencional?).

**Recomendação:** Resolver os 3 envs e a decisão de enrichment antes de abrir tráfego público. Resto é polish pós-launch.

---

## 1. Matriz PASS/FAIL

| # | Área | Status | Evidência |
|---|---|---|---|
| 1 | Onboarding-first flow | ✅ PASS | `hero-action-bar.tsx:42` abre modal antes de navegar; server enforce em `analyze-public-v1.ts:572` (`ONBOARDING_REQUIRED 402`) |
| 2 | `lead_session` criado antes da análise | ✅ PASS | `onboarding/start.ts` → `setLeadCookie` HttpOnly assinado com `SESSION_SECRET` |
| 3 | Créditos iniciais (2, idempotentes) | ✅ PASS | `credits.server.ts:27` `INITIAL_GRANT=2`; partial unique index `uniq_credit_ledger_initial_grant` |
| 4 | Consumo na 1ª análise | ✅ PASS | `reserveCredit` em `analyze-public-v1.ts:609`; `leadOwnsReport` skip em `:585` evita duplo cobro em reload |
| 5 | Renderização do Free report | ✅ PASS | `report-shell-v2.tsx` esconde Blocks 02/03/04/06; renderiza Overview + EndOfFree |
| 6 | Premium teasers / locked cards | ✅ PASS | 5 `PremiumTeaserCard` em `report-overview-block.tsx:52-104` (frequência, formatos, publicações-chave, diagnóstico, prioridades) |
| 7 | Sticky unlock bar | 🟡 PARTIAL | Existe e funciona; **CTA desktop sem preço** (`sticky-unlock-bar.tsx:262` só diz "Desbloquear") |
| 8 | Mobile 375px | ✅ PASS | `mx-3 mb-[72px]` + `safe-area-inset-bottom`; CTA mobile mostra `"Desbloquear por 9€"`; overflow-x-clip no shell |
| 9 | Proteção de custo | 🟡 PARTIAL ENV | Guardas todas presentes (kill-switch, allowlist, IP cap, handle cap, budget). **Mas `APIFY_ENABLED` e `APIFY_TESTING_MODE` default OFF/ON respectivamente** — sem set explícito, ninguém vê relatório real |
| 10 | Emails após render | ✅ PASS | Onboarding path **não envia email**. Path legacy (`UnlockModal`) tem dedupe em `lead-magnet-sequence.server.ts:62-90` por `(lead_id, report_request_id)` |

**Cost protection extra confirmado:** `FREE_ENRICHMENT_TYPES = []` (`enrichment/types.ts:99`) → zero chamadas DataForSEO/OpenAI no Free. Custo Free = 1 corrida Apify (cached agressivamente).

## 2. Conversion Readiness Score: **71/100**

| Dimensão | Peso | Score | Pond. |
|---|---|---|---|
| Mandatory onboarding + lead capture | 15% | 95 | 14.3 |
| Credit model idempotente | 10% | 95 | 9.5 |
| Cost protection (código) | 10% | 95 | 9.5 |
| **Cost protection (env config)** | **10%** | **30** | **3.0** |
| Free report tem valor visível | 15% | 70 | 10.5 |
| Premium teasers claros | 15% | 80 | 12.0 |
| CTA de unlock clara | 10% | 60 | 6.0 |
| Mobile 375px | 5% | 90 | 4.5 |
| Email lifecycle | 10% | 80 | 8.0 |
| **Total** | **100%** | | **71** |

## 3. Respostas às perguntas-chave

| Pergunta | Resposta |
|---|---|
| Utilizador percebe o que é grátis? | **Parcialmente.** Os 5 teasers mostram títulos claros mas o bloco Overview não diz explicitamente "isto é a tua amostra gratuita". |
| Free entrega valor antes de pagar? | **Sim, mas dependente.** Editorial Identity + Engagement Section renderizam. Se `FREE_ENRICHMENT_TYPES=[]` for intencional, então market signals podem aparecer vazios. |
| Premium é visível mas não confuso? | **Sim.** 5 cards distintos com eyebrow + título + preview blur + CTA por 9€. Não há blur enganador sobre conteúdo real. |
| Há chamadas premium no Free? | **Não.** Confirmado: zero OpenAI, zero DataForSEO no caminho free. Apenas Apify (1 corrida, cached). |
| Reload evita consumo extra? | **Sim.** `leadOwnsReport(leadId, cacheKey)` em `analyze-public-v1.ts:585` faz skip do reserve antes do credit burn. |
| Emails enviados uma só vez? | **Sim.** Dedupe via `product_events` por `(lead_id, report_request_id)` em `lead-magnet-sequence.server.ts:62-90`. |
| CTA para unlock é clara? | **Parcial.** Mobile diz `"Desbloquear por 9€"` (claro). Desktop só `"Desbloquear"` (preço noutro span). |

## 4. Problemas de clareza ao utilizador

1. **CTA desktop sem preço no botão** — `sticky-unlock-bar.tsx:262`. Mobile resolve mas desktop fica fragmentado.
2. **Dois fluxos de captura coexistem** — Onboarding modal (novo) + `UnlockModal` legacy (`analyze.$username.tsx:402-406`). `unlockOpen` defaulta `false` e não há trigger visível, mas o componente continua montado. Risco analítico (funis duplicados), não funcional.
3. **`end_of_free` i18n keys** — `end-of-free-block.tsx` lê tudo de translations. Não foi possível confirmar que todas as keys do namespace `report.end_of_free.*` estão preenchidas em PT-PT. Spot-check antes de lançar.
4. **Mensagem "2 relatórios gratuitos"** só aparece no erro `INSUFFICIENT_CREDITS` (`analyze-public-v1.ts:167`). Antes da 1ª análise, o utilizador não vê "tens 2 análises gratuitas". Falta upfront framing.

## 5. Riscos de custo

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| C1 | `APIFY_ENABLED` default OFF; sem set explícito → todos os utilizadores apanham erro `PROVIDER_DISABLED` ou stale | 🚨 BLOCKER | Confirmar `APIFY_ENABLED=true` em produção |
| C2 | `APIFY_TESTING_MODE` default ON → só handles em `APIFY_ALLOWLIST` correm fresh | 🚨 BLOCKER | Set `APIFY_TESTING_MODE=false` em produção |
| C3 | `APIFY_DAILY_CAP_USD` / `APIFY_HARD_CAP_USD` | ⚠️ Verificar | Confirmar valores (existem como secrets); definir alerta no admin |
| C4 | Per-IP cap default 10/dia, per-handle 5/dia | ✅ OK | Ajustar consoante tráfego inicial |
| C5 | OpenAI / DataForSEO no Free | ✅ ZERO | `FREE_ENRICHMENT_TYPES=[]` garante; **mas se este array for expandido sem revisão, custo Free dispara** |

## 6. Bloqueadores antes do launch público

1. 🚨 **C1**: Confirmar `APIFY_ENABLED=true` em produção.
2. 🚨 **C2**: Confirmar `APIFY_TESTING_MODE=false` em produção (ou tirar allowlist).
3. ❓ **Decisão de produto**: `FREE_ENRICHMENT_TYPES=[]` é intencional? Se sim, validar que o Free report não tem secções visivelmente vazias por falta de enrichment. Se não, adicionar `visual_cover` (custo trivial) no mínimo.
4. ⚠️ Spot-check às translation keys `report.end_of_free.*` em `src/i18n/locales/pt/report.json`.

## 7. Correções recomendadas antes de launch

| Prio | Fix | Esforço | Onde |
|---|---|---|---|
| P0 | Confirmar 2 envs Apify em produção | 2 min | Settings → Secrets |
| P0 | Decidir + validar `FREE_ENRICHMENT_TYPES` | 15 min | `src/lib/enrichment/types.ts:99` |
| P0 | Spot-check translation keys `report.end_of_free.*` | 5 min | `src/i18n/locales/pt/*.json` |
| P1 | Adicionar preço ao botão desktop da sticky bar (`"Desbloquear por 9€"`) | 5 min | `sticky-unlock-bar.tsx:262` |
| P1 | Adicionar framing upfront "Tens 2 análises gratuitas" no Overview ou no header | 15 min | `report-overview-block.tsx` ou `report-shell-v2.tsx` |
| P2 | Remover `UnlockModal` legacy ou esconder explicitamente do DOM se não é usado | 10 min | `analyze.$username.tsx:402-406` |
| P2 | Adicionar pequena badge "GRÁTIS · amostra editorial" no Overview Block para reforçar enquadramento | 10 min | `report-overview-block.tsx` |

## 8. Backlog pós-MVP

- Tracking analítico unificado de funil (uma só origem: onboarding modal).
- A/B de CTA copy ("Desbloquear por 9€" vs "Ver relatório completo (9€)" vs "Continuar diagnóstico").
- Mostrar contador "1 de 2 análises grátis usadas" no header durante a sessão.
- Quando saldo = 0, transformar Overview em pre-paywall com preview persistido em vez de hard block.

## 9. Verdict final

**Lançar a beta pública após resolver os 3 P0** (2 envs Apify + decisão enrichment). Os P1 podem entrar em hotfix nas primeiras 24h após launch. A arquitetura de custo e créditos é sólida — o risco financeiro é baixo desde que as envs estejam corretas.
