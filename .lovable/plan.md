# Veredito MVP — Relatório Instagram Profile vs Competitor

## TL;DR
**MVP-ready com 1 bloqueador trivial.** Publicar assim que `/report/example` for sanitizado ou gated. Os 9 cards principais funcionam, têm empty states robustos e não dependem de AI nem de URLs do IG CDN para renderizar.

**Recomendação: PUBLICAR após checklist abaixo.** AI fica para v2. LinkedIn/TikTok ficam em research, fora do MVP.

---

## 1. Cards MVP-ready (publicar como estão)

| Card | Razão |
|---|---|
| **Comparison Hero** | Dados determinísticos, fallback de avatar com iniciais, sem mock |
| **Top Posts** | `aiInsightText` opcional, subtitle dinâmico evita falsa janela "30 dias" |
| **Caption Diagnostics** | AI opcional, extração de temas determinística |
| **Bio Conversion Path** | Qualitativo, sem risco de crash |

## 2. Cards aceitáveis com limitações conhecidas

| Card | Limitação | Mitigação atual |
|---|---|---|
| **Engagement Benchmark** | Strings PT hardcoded; sem benchmark → render `null` | OK para PT-only MVP |
| **Cadence Evidence Strip** | Só 1º concorrente; thumbnails antigas podem 403 | Mensagem explícita "CDN expirado"; persist-thumbnails ativo para snapshots novos |
| **Weekday Comparison** | Snapshots pre-Fase 2 sem `weekday_counts` | `hasWeekdayData === false` mostra aside neutro |
| **Format Mix Donut** | Idem (snapshots antigos) | `MissingSide` graceful |
| **Competitor Breakdown** | Apenas 1 concorrente exposto, restos silenciosamente ignorados | Não crasha; factualmente incompleto |

## 3. Cards a esconder se data missing
Já está implementado — todos retornam `null` ou renderizam empty state neutro:
- Engagement benchmark (`benchmarkSeries.length === 0`)
- Cadence (frequência ≤ 0 ambos os lados)
- Weekday (zero data ambos)
- Format mix (sem stats ambos)
- AI callouts (`?? null`)

## 4. Refinamentos a adiar (post-MVP backlog)
- Layout multi-competitor (Fase 1.5) — TODOs em 5 cards
- i18n das strings PT no engagement chart
- AI editorialVerdict pipeline (schema pronto)
- Backfill `weekday_counts` / `format_stats` em snapshots antigos
- Re-run de persist-thumbnails em snapshots cacheados antigos
- Null guard adicional no `competitor-bio-compare`

## 5. Bloqueadores antes de publicar

### 🚨 Único bloqueador real
**`/report/example` expõe `AI_INSIGHTS_MOCK` com copy hardcoded sobre `@frederico.marketing`.**
- 8 `AIInsightBox` com texto específico ("Pico em 22 Abr (1200+)", "55% abaixo do benchmark"…)
- Rota é `noindex,nofollow` mas o URL é partilhável e parece análise real
- **Fix (10 min)**: gate atrás de auth de admin OU substituir copy por placeholder genérico ("Exemplo ilustrativo — perfil fictício")

### Não-bloqueadores (avisar mas publicar)
- Multi-competitor: silenciosamente mostra só o 1º. Comunicar no copy do produto que MVP suporta **1 concorrente visível**.
- Snapshots antigos sem thumbnails persistidas: fallback funciona, mensagem honesta.

## 6. AI interpretation → **adiar para v2**
Todos os cards funcionam sem AI. Schema (`aiInsightsV2.editorialVerdict`, `sections.*`) já existe e tolera `null` em todo o lado. Ligar OpenAI pipeline é uma melhoria de profundidade narrativa, não um requisito de leitura.

## 7. LinkedIn / TikTok → **manter separados**
Os planos já entregues (`.lovable/plan.md`) são research/economics, não código. MVP é Instagram. Não misturar.

---

## Checklist final pré-publish

- [ ] **BLOQUEADOR**: gate `/report/example` atrás de admin OU substituir `AI_INSIGHTS_MOCK` por copy genérica ("Exemplo ilustrativo")
- [ ] Smoke test em 3 perfis (1 com competitor válido, 1 sem competitor, 1 com snapshot antigo sem `weekday_counts`)
- [ ] Confirmar no preview que cards vazios não aparecem (ou aparecem com empty state explícito)
- [ ] Confirmar que avatar do concorrente carrega de Storage (snapshot novo) e que fallback de iniciais funciona (snapshot velho)
- [ ] Confirmar mensagem "miniaturas CDN expiradas" em snapshot antigo
- [ ] Verificar que `/report.example` continua `noindex,nofollow` no `<head>`
- [ ] Comunicar no copy/onboarding: **"MVP suporta 1 concorrente visível por relatório"**
- [ ] Anunciar honestamente que AI insights chegam em v2

## Post-MVP backlog (priorizado)
1. Multi-competitor layout (Fase 1.5) — desbloqueia 5 cards
2. AI insights pipeline (OpenAI → `aiInsightsV2.editorialVerdict`)
3. Backfill job para snapshots antigos (weekday_counts, format_stats, thumbnail_storage_url)
4. i18n EN para landing + report
5. Refinamento de `competitor-bio-compare` quando ambos os bios estão vazios
6. Centralizar limite de concorrentes em módulo partilhado
