# Unit economics LinkedIn — auditoria de custos Apify

Pricing público verificado em apify.com em 2026-06-08. Custos OpenAI/Lovable AI estimados em separado. Sem código.

## 1. Tabela de actors verificados

| Actor | Slug / ID | Modelo | Preço público | Rating | Maintenance | MVP fit |
|---|---|---|---|---|---|---|
| harvestapi/linkedin-profile-scraper | `LpVuK3Zozwuipa5bp` | Pay-per-event | **$4 / 1k profiles** (sem email) · $10/1k com email | 4.8 (53) · 36k users · 8.6k MAU | Última modificação **11h** | **Primário — identidade** |
| apimaestro/linkedin-profile-posts | `LQQIXN9Othf8f7R5n` | Pay-per-result | **$5 / 1k posts** | 4.7 (63) · 19k users · 2k MAU | **12 dias** | **Primário — posts (reactions por tipo)** |
| harvestapi/linkedin-profile-posts | `A3cAPGpwBEG8RJwse` | Pay-per-result | **from $1.50 / 1k posts** | 4.9 (30) · 16k users · 5.1k MAU | Ativo | **Backup posts (mais barato)** |
| dev_fusion/linkedin-profile-scraper | `2SyF0bVxmgGr8IVCZ` | Pay-per-result | **$10 / 1k profiles** (com email/phone) | 3.4–4.4 (variável) · 60k users | Ativo | **Evitar MVP** — risco GDPR contact data |
| harvestapi/linkedin-profile-search | `M2FMdjRVeF1HPGFcc` | Pay-per-event | Per-event (tiered, ~$8/1k profiles encontrados — needs live check) | 4.7 (65) · 20k users | Ativo | Opcional (auto-complete) |
| apimaestro/linkedin-profile-detail | — | Pay-per-result | **needs live pricing check** (~$4–$6/1k expected) | — | — | Backup identidade |
| Company actors | — | — | Out of scope MVP | — | — | — |

**Stack recomendada MVP**: `harvestapi/linkedin-profile-scraper` + `apimaestro/linkedin-profile-posts`.
**Stack backup low-cost**: mesmo profile + `harvestapi/linkedin-profile-posts` (corta posts ~70%).

## 2. Custo por relatório (first run, sem cache)

### Stack primária (profile $0,004 + posts $0,005 cada)

| Cenário | Profiles | Posts | Apify USD | Apify EUR* |
|---|---|---|---|---|
| Profile only | 1 | 0 | $0,004 | €0,004 |
| Profile + 12 posts | 1 | 12 | $0,064 | €0,060 |
| Profile + 30 posts | 1 | 30 | $0,154 | €0,144 |
| Profile + 90 posts | 1 | 90 | $0,454 | €0,425 |
| Profile + 1 competitor · 30 posts each | 2 | 60 | $0,308 | €0,288 |
| Profile + 2 competitors · 30 posts each | 3 | 90 | $0,462 | €0,432 |

### Stack low-cost (profile $0,004 + posts $0,0015 cada)

| Cenário | Apify USD | Apify EUR* |
|---|---|---|
| Profile + 30 posts | $0,049 | €0,046 |
| Profile + 90 posts | $0,139 | €0,130 |
| Profile + 1 competitor · 30 each | $0,098 | €0,092 |
| Profile + 2 competitors · 30 each | $0,147 | €0,138 |

*USD→EUR a 0,935 (junho 2026, indicativo).

Custo Apify platform: pay-per-event/result já inclui compute/dataset; overhead desprezável (<5%).
Subscrição Apify: plano Starter $49/mês ou Creator $99/mês recomendado para concorrência razoável — amortizado fora do custo unitário.

## 3. Cache scenarios

| Cenário | Custo Apify |
|---|---|
| First run (sem snapshot) | 100% do valor da tabela §2 |
| Repeat <24h, mesma janela | **$0** (hit em `snapshots`, idêntico ao IG hoje) |
| Repeat <7d, mesma janela | **$0** se TTL 7d para profile detail e posts; refresh forçado custa 100% |
| Repeat <7d, janela diferente (30d→90d) | **delta** — só fetch dos posts novos; estimar 60% do custo full |
| Refresh manual admin | 100% |

Recomendação TTL (igual ao IG):
- Profile detail: 24h
- Posts list: 12h
- Hard refresh: admin only

## 4. Custo IA (Lovable AI Gateway, separado)

Base: modelo eficiente (Gemini 2.5 Flash / GPT-5-mini class) ~$0,15/M input + $0,60/M output.

| Modo | Tokens (in+out) | Custo USD | Custo EUR |
|---|---|---|---|
| **Determinístico apenas** | 0 | $0,000 | €0,000 |
| **1 LLM global summary** | ~3k + 500 | $0,001 | €0,001 |
| **Per-card LLM (7 cards)** | ~10k + 2k | $0,003 | €0,003 |
| **Comparison full (global + 7 cards)** | ~14k + 3k | $0,004 | €0,004 |

Cache: chave `(network, slug, window, card, snapshot_hash)`. Hit = $0.

## 5. Modelo de créditos recomendado

Alinhar com o IG paid existente:

| Ação | Créditos | Justificação |
|---|---|---|
| Audit LinkedIn (perfil + 30 posts) | **1 crédito** | Custo ≈ €0,14 marginais |
| + 1 concorrente (30 posts) | **+1 crédito** | Apify ×2 e leitura comparativa exige LLM extra |
| + 2º concorrente | **+1 crédito** | Mesmo padrão |
| Janela 30d (default) | 0 extra | Já incluído |
| Janela 90d | **+1 crédito** | Apify 3× posts + reanálise IA |
| Refresh manual <7d | **+1 crédito** | Bypassa cache |

Resultado: relatório completo (perfil + 1 concorrente + 90d) ≈ 3 créditos.

## 6. Margem bruta por preço de venda

Hipóteses por relatório:
- Apify (primária, perfil + 1 concorrente · 30 posts): **€0,29**
- IA (comparação full): **€0,004**
- Lovable Cloud / hosting / storage amortizado: **€0,02**
- **COGS total ≈ €0,32**
- VAT PT 23% incluído no preço de venda
- Payment processor (Stripe / EuPago): 3% + €0,25

| Preço (com IVA) | Net VAT | Após payments | COGS | Margem | Margem % |
|---|---|---|---|---|---|
| €9 | €7,32 | €6,85 | €0,32 | **€6,53** | 95% |
| €19 | €15,45 | €14,74 | €0,32 | **€14,42** | 98% |
| €29 | €23,58 | €22,62 | €0,32 | **€22,30** | 99% |
| €49 | €39,84 | €38,40 | €0,32 | **€38,08** | 99% |

Margem **>90% em qualquer cenário** ao nível unitário. A real questão de negócio é **CAC**, não COGS.

Cenário worst-case (perfil + 2 concorrentes · 90 posts cada, sem cache, stack premium): Apify ~€1,30 + IA €0,01 + overhead €0,02 = **€1,33 COGS** → mesmo a €9 mantém 82% margem.

## 7. Riscos de unit economics

| Risco | Impacto | Mitigação |
|---|---|---|
| Subscrição Apify $49–$99/mês overhead fixo | Médio (precisa 6–20 vendas/mês para amortizar) | Validar volume antes de subscrever Starter |
| LinkedIn muda HTML / actor parte / preço sobe 3× | Alto | 2 actors backup, cap mensal de fetches, kill-switch |
| Cache miss elevado (refresh frequente) | Baixo | TTL 24h, refresh manual só admin no MVP |
| Custo CAC > LTV | Alto | Fora do escopo unit; precisa A/B pricing & funnel |
| Reembolsos / disputas | Médio | Política clara, transparência de dados, free preview |
| Custo IA dispara com prompts maiores | Baixo | Hard token caps, fallback determinístico |
| Custo competitor inflate (3+ concorrentes) | Baixo | Limite hard MVP: 1 concorrente; 2 só em plano premium futuro |
| GDPR — dados pessoais persistidos | Médio | Não persistir email/phone; ToS claro; data retention policy |

## 8. Recomendação final

**Proceed with test first** — não passar direto para implementação completa.

Sequência recomendada (mantém §10 da auditoria anterior, agora com números):

1. **Spike técnico 2–3 dias** (custo total <€2): subscrever Apify Free ($5 credits), rodar 20 análises de teste com a stack primária para validar (a) shape real dos campos, (b) custo médio observado vs estimado, (c) tempo de execução.
2. **Decisão go/no-go** baseada em: custo médio observado dentro de ±25% do estimado, output usável em ≥85% dos perfis.
3. Se go → Fase 0–4 (3–4 semanas, conforme auditoria anterior).
4. **Não subscrever Apify Starter ($49/mês) sem teste prévio** — usar Free + trial pay-as-you-go.

**Preço sugerido para o LinkedIn paid** (alinhado com IG): **€19–€29** para audit single, **+€10** para adicionar competitor. Margens ficam confortáveis e o produto compete com Iconosquare/Hootsuite que pedem subscrição mensal de €50+.

**Não fazer** subscrição mensal LinkedIn no MVP — manter pay-per-report até haver tração suficiente.
