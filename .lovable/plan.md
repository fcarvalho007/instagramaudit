# Unit economics TikTok — auditoria de custos Apify

Pricing público verificado em apify.com em 2026-06-08. Custos IA estimados em separado. Sem código.

## 1. Tabela de actors verificados

| Actor | Slug / ID | Modelo | Preço público | Rating | Users / MAU | Maintenance | Owner |
|---|---|---|---|---|---|---|---|
| TikTok Profile Scraper | `clockworks/tiktok-profile-scraper` · `0FXVyOXXEmdGcV88a` | Pay-per-result | **from $2,50 / 1k results** (profile + N vídeos = N+1 results) | 4.7 (44) | 27k · 3.3k | Ativo | **Apify** (Clockworks) |
| TikTok Scraper (broad) | `clockworks/tiktok-scraper` · `GdWCkxBtKWOsKjdch` | Pay-per-result | from **$1,70 / 1k results** | 4.8 (305) | 193k · 14k | **2h** atrás | **Apify** (Clockworks) |
| TikTok Data Extractor (legacy) | `clockworks/free-tiktok-scraper` · `OtzYfK1ndEGdwWFKQ` | Pay-per-result | from **$2,00 / 1k results** | 4.8 (63) | 49k · 3.2k | **18min** atrás | **Apify** (Clockworks) |
| Tiktok Scraper (Pay Per Result) | `apidojo/tiktok-scraper` · `5K30i8aFccKNF5ICs` | Pay-per-post | **$0,30 / 1k posts** | 4.9 (24) | — | Ativo | **Community** (API Dojo) |
| TikTok Comments Scraper | `clockworks/tiktok-comments-scraper` · `BDec00yAmCm1QbMEI` | Pay-per-comment | **from $0,50 / 1k comments** | 4.8 (73) | — | Ativo | **Apify** (Clockworks) |
| TikTok Hashtag Scraper | `clockworks/tiktok-hashtag-scraper` · `f1ZeP0K58iwlqG2pY` | Pay-per-video | from **$2,00 / 1k videos** | 4.8 (22) | 13k · 1.3k | Ativo | **Apify** (Clockworks) |

Correção ao brief: `GdWCkxBtKWOsKjdch` é o **broad scraper**, não o hashtag scraper.

**Stack recomendada MVP**: `clockworks/tiktok-profile-scraper` (primário, Apify-maintained) + `clockworks/tiktok-comments-scraper` (add-on).
**Stack low-cost** (validar no spike): `apidojo/tiktok-scraper` — 8× mais barato, community.

## 2. Custo por relatório (first run, sem cache)

### Stack primária Apify-maintained ($2,50 / 1k results)

| Cenário | Results | USD | EUR* |
|---|---|---|---|
| Profile only | 1 | $0,003 | €0,002 |
| Profile + 12 vídeos | 13 | $0,033 | €0,031 |
| Profile + 30 vídeos | 31 | $0,078 | €0,073 |
| Profile + 90 vídeos | 91 | $0,228 | €0,213 |
| Profile + 1 comp · 30 vídeos | 62 | $0,155 | €0,145 |
| Profile + 2 comp · 30 vídeos | 93 | $0,233 | €0,218 |

### Stack low-cost ($0,30 / 1k posts)

| Cenário | USD | EUR* |
|---|---|---|
| Profile + 30 vídeos | $0,009 | €0,008 |
| Profile + 90 vídeos | $0,027 | €0,025 |
| Profile + 1 comp · 30 | $0,019 | €0,017 |
| Profile + 2 comp · 30 | $0,028 | €0,026 |

### Comments enrichment ($0,50 / 1k comments)

| Cenário | Comments estimados | USD | EUR |
|---|---|---|---|
| Top 3 vídeos × 100 comments | 300 | $0,00015 | €0,0001 |
| Top 3 vídeos × 500 comments | 1.500 | $0,00075 | €0,0007 |
| Top 10 vídeos × 100 comments | 1.000 | $0,0005 | €0,0005 |
| Top 10 vídeos × 500 comments | 5.000 | $0,0025 | €0,002 |
| Top 10 × 2.000 (vídeos virais) | 20.000 | $0,010 | €0,009 |

Mesmo no pior caso, comments são **<5%** do custo total.

*USD→EUR 0,935.

## 3. Cache scenarios

| Cenário | Custo Apify |
|---|---|
| First run | 100% tabela §2 |
| Repeat <24h, mesma janela | **$0** (snapshot hit) |
| Repeat <7d, mesma janela | $0 com TTL 7d; refresh manual = 100% |
| Baseline (sem janela) → janela 30d | 100% (primeira recolha de série temporal) |
| 30d → 90d | **delta** — só fetch dos vídeos antigos novos. Estimar 60–70% do custo full 90d (cerca de **€0,15** stack primária) |
| Refresh manual admin | 100% |

TTL recomendado: profile 24h, video list 12h, comments 24h. Cache key inclui `(network, handle, window, snapshot_hash)`.

## 4. Custo IA (Lovable AI Gateway / Gemini 2.5 Flash class)

Base: ~$0,15 / M input + $0,60 / M output.

| Modo | Tokens (in+out) | USD | EUR |
|---|---|---|---|
| Determinístico apenas | 0 | $0 | €0 |
| 1 LLM global summary | 3k + 500 | $0,001 | €0,001 |
| Per-card (7 cards) | 10k + 2k | $0,003 | €0,003 |
| Top-video interpretation only (5 vídeos × 200 toks) | 1k + 500 | $0,0005 | €0,0005 |
| Comments interpretation top 3 vídeos (200 comments amostra) | 4k + 800 | $0,0011 | €0,001 |
| Comparison full (global + per-card) | 14k + 3k | $0,004 | €0,004 |
| **Worst-case (per-card + top-video + comments)** | ~20k + 4k | **$0,005** | **€0,005** |

Cache IA: chave `(network, handle, window, card, snapshot_hash)`. Hit = $0.

## 5. Modelo de créditos recomendado

Alinhado com IG paid existente e proposta LinkedIn:

| Ação | Créditos | Custo COGS marginal | Justificação |
|---|---|---|---|
| **TikTok Free analysis** | 0 (gated, sem créditos) | €0,03 | Profile + 6 vídeos sample; absorvido em CAC |
| **TikTok Paid (perfil + 30 vídeos)** | **1 crédito** | €0,08 | Custo principal |
| + 1 concorrente (30 vídeos) | **+1 crédito** | +€0,07 | Apify ×2 + comparação IA |
| + 2.º concorrente | **+1 crédito** | +€0,07 | Linear |
| Janela 30d (default) | 0 extra | — | Incluído |
| Janela 90d | **+1 crédito** | +€0,14 | Apify 3× vídeos + reanálise IA |
| **Comments enrichment** (top 10 vídeos) | **+1 crédito** | +€0,002 | Custo Apify desprezável, mas valor percebido alto + IA extra |
| Refresh manual <7d | **+1 crédito** | até €0,15 | Bypassa cache |

Relatório completo (perfil + 1 concorrente + 90d + comments) ≈ **4 créditos**, COGS ≈ **€0,32**.

## 6. Margem bruta por preço de venda

Hipóteses por relatório paid+competitor (default 30d, stack primária):
- Apify: **€0,15**
- IA (per-card + comparison): **€0,005**
- Comments enrichment (se incluído): **€0,002**
- Lovable Cloud / storage / thumbnails persistidos: **€0,03**
- **COGS total ≈ €0,19**
- IVA PT 23%, payment processor 3% + €0,25

| Preço c/ IVA | Net VAT | -Payments | COGS | Margem | % |
|---|---|---|---|---|---|
| €9 | €7,32 | €6,85 | €0,19 | **€6,66** | **97%** |
| €19 | €15,45 | €14,74 | €0,19 | **€14,55** | **99%** |
| €29 | €23,58 | €22,62 | €0,19 | **€22,43** | **99%** |
| €49 | €39,84 | €38,40 | €0,19 | **€38,21** | **99%** |

**Worst-case** (perfil + 2 comp × 90 vídeos, comments top 10 × 500, sem cache):
- Apify: €0,65 + €0,01 = €0,66
- IA: €0,01
- Storage: €0,05
- **COGS €0,72** → mesmo a €9 mantém **89%** margem.

**Best-case** (single audit 30d, stack low-cost apidojo): COGS **€0,04** → margens >99% em qualquer preço.

Conclusão: a economia unitária é **muito favorável** — TikTok é a rede mais barata das três (IG, LinkedIn, TikTok) com larga margem. O bottleneck do negócio é **CAC e LTV**, não COGS.

## 7. Recomendação final

### Stacks
- **MVP primário**: `clockworks/tiktok-profile-scraper` (0FXVyOXXEmdGcV88a) — Apify-maintained, estável, $2,50/1k.
- **Backup low-cost**: `apidojo/tiktok-scraper` (5K30i8aFccKNF5ICs) — 8× mais barato, validar no spike.
- **Add-on opcional**: `clockworks/tiktok-comments-scraper` (BDec00yAmCm1QbMEI) — só ativar se feature de comments for monetizada.
- **Fora MVP**: hashtag scraper, free-tiktok-scraper (legacy sem vantagem).

### Pricing sugerido
Manter alinhamento com IG/LinkedIn:
- **Paid single TikTok**: **€19**
- **Paid + 1 competitor**: **€29** (≈ +€10 pelo competitor, mesmo que custe só +€0,07 — valor percebido)
- **Janela 90d**: opcional **+€5**
- **Comments deep-dive**: opcional **+€5–€10**

### Riscos de unit economics

| Risco | Severidade | Mitigação |
|---|---|---|
| Subscrição Apify fixa ($49–$99/mês) | Baixo–médio | Volume break-even ~4 paid TikTok/mês a €19 — trivial |
| TikTok muda HTML / actor breakage | **Alto** | 3 actors alternativos validados; kill-switch; monitor success rate |
| **Media URLs expiram em horas** | **Alto** | Persistir thumbnails em Cloud Storage no snapshot; embed oficial para player |
| Refresh manual abusivo | Baixo | Refresh = +1 crédito; cap diário admin |
| Cache miss elevado | Baixo | TTL 24h; refresh só admin no MVP |
| Comments inflam custo IA (não Apify) | Baixo | Hard cap 200 comments amostra/vídeo no LLM |
| Compliance TikTok ToS | Médio | Apenas dados públicos, sem login, takedown SLA |
| Sem watch-time / completion | Médio estrutural | Comunicar limite; usar saves como proxy de retenção |
| CAC > LTV | **Alto** (fora COGS) | Fora deste âmbito; precisa A/B funnel |

### Decisão: **Proceed with test first**

Apify TikTok é **a rede com melhor economia das três avaliadas**:
- Custo ~50% mais baixo que LinkedIn por relatório completo
- Sem cookies/login (vs LinkedIn que tem fragilidade legal)
- Dados mais ricos por vídeo (views, sound, saves)

Sequência recomendada:

1. **Spike técnico 2–3 dias** (custo total <€1,50): conta Apify Free ($5 credits), rodar 20 análises de teste com `clockworks/tiktok-profile-scraper`. Validar: (a) cobertura de campos, (b) custo médio observado vs estimado (±25%), (c) tempo de execução, (d) durabilidade dos thumbnails.
2. **Decisão go/no-go** após spike.
3. Se go → roadmap de 3–4 semanas (igual ao LinkedIn; pode correr em paralelo).

**Não fazer**: subscrever Apify Starter antes do spike. Não monetizar comments como funcionalidade própria no MVP — incluir como add-on opcional só na v2.

### Comparação rápida das 3 redes (resumo)

| Métrica | Instagram (atual) | LinkedIn (proposto) | TikTok (proposto) |
|---|---|---|---|
| COGS paid + competitor | €0,15–€0,25 | €0,32 | **€0,19** |
| Margem a €19 | ~98% | 98% | **99%** |
| Cookies / login | Sem | Sem (harvestapi) | **Sem** |
| Stack maintenance | Apify | Community | **Apify-maintained** |
| Media URL volatility | Médio | Baixo (profile pics duráveis) | **Alto** |
| Dados nativos ricos | Médio | Médio | **Alto** (views, sound, saves) |
| Volume potencial PT/BR | Alto | Médio | **Alto** |

TikTok é o **melhor candidato a segunda rede** se a decisão for puramente unit economics + simplicidade técnica. LinkedIn é melhor se o target ICP for B2B / consultores.
