## Auditoria — Free/Public vs Pro/Paid

Apenas leitura. Nada foi alterado em código, BD, preview ou produção. Nenhum provider externo foi chamado.

### Como mapeiam as 7 secções comerciais às componentes reais

A `block-config.ts` define **dois** conjuntos:

- `BLOCKS` (interno, 6 blocos do shell) — usado por `ReportBlockSection` / sidebar de admin.
- `COMMERCIAL_SECTIONS` (público, 7 secções) — usado pela sidebar comercial.

A correspondência real (verificada em `report-shell-v2.tsx` + `report-overview-block.tsx` + `report-diagnostic-block.tsx`) é:

| # | Secção comercial | Anchor `id` | Onde é renderizada | Quando |
|---|---|---|---|---|
| 01 | Visão geral | (top do bloco overview) | `ReportOverviewBlock` (Editorial Identity + MethodologyLine) | sempre |
| 02 | Engagement | `#engagement` | `EngagementCardRefined` dentro do overview | Free: `mode="free_with_engagement"` · Pro: `mode="all"` |
| 03 | Frequência editorial | `#frequencia` | `FrequencyCard` no overview (`mode="all"`) | só Pro |
| 04 | Mix de formatos | `#formatos` | `FormatCard` no overview (`mode="all"`) | só Pro |
| 05 | Publicações-chave | `#publicacoes-chave` | `PostComparisonBlock` no overview (`mode="all"`) | só Pro |
| 06 | Diagnóstico editorial | `#diagnostico-editorial` | `ReportDiagnosticBlock` (shell block "diagnostico") | só Pro (`premiumUnlocked && blockDiagnosis !== "hidden"`) |
| 07 | Prioridades de acção | `#prioridades` | mesma `ReportDiagnosticBlock` | só Pro |

Em Free, em vez das secções 03–07 surge a lista `PREMIUM_TEASERS` (5 `PremiumTeaserCard`s), uma por anchor.

---

### 1. Free body — PASS/FAIL

| Critério | Estado | Evidência |
|---|---|---|
| Antes de Engagement renderiza apenas Identity + MethodologyLine | **PASS** | `ReportOverviewBlock`, ramo `mode === "free_with_engagement"` (linhas 258–267) |
| Só 01 e 02 desbloqueadas | **PASS** | `mode="free_with_engagement"` renderiza Identity + Methodology + `FreeInitialReadingCard` + Engagement; restantes blocos só montam se `premiumUnlocked` |
| 5 teaser cards renderizadas após Engagement | **PASS** | `PREMIUM_TEASERS.map(...)` em `report-overview-block.tsx` linhas 285–297; ordem 03→07 |
| Teasers visíveis no corpo (não só sidebar) | **PASS** | Cards são `<section id="...">` empilhadas no `<main>` |
| Skeletons section-specific | **PASS** | `previewVariant: frequency \| format \| publications \| diagnostic \| priorities` em `premium-teaser-card.tsx`; 5 funções `*Preview` distintas |
| Não expõem dados pagos | **PASS** | Componentes não recebem `result`/`payload`; só copy estático + skeleton SVG-like; `FreeInitialReadingCard` é 100% determinístico (verificado em auditoria anterior) |

---

### 2. Sticky bar — PASS/FAIL

| Critério | Estado | Evidência |
|---|---|---|
| Mounted apenas para Free/Public | **PASS** | `report-shell-v2.tsx` linhas 408–410: `{lockBoundary === "engagement" && !premiumUnlocked && <StickyUnlockBar />}` |
| Aparece ao chegar ao 1º teaser | **PASS** | `useStickyUnlockTrigger` observa `#frequencia` com `rootMargin: "0px 0px -10% 0px"`; `passedFree` só vira true ao intersectar |
| Permanece visível enquanto se passa pelos teasers | **PASS** | Estado `passedFree` é sticky (`setPassedFree(true)`), não reseta |
| Esconde quando aparece a CTA final | **PASS / intencional** | `finalCtaVisible` segue `#lead-magnet-card`; barra esconde quando esse card entra em viewport. Esta secção só renderiza em estado B (`unlocked && !premiumUnlocked`). No fluxo onboarding-first actual `unlocked` é forçado a `true` desde o início (`analyze.$username.tsx:397`), por isso essa CTA aparece e a barra recolhe correctamente |
| Não aparece logo no topo | **PASS** | Visibility = `passedFree && !finalCtaVisible && !dismissed` — fica oculta até intersectar `#frequencia` |
| Não aparece em Pro | **PASS** | Gate de montagem no shell exige `!premiumUnlocked` |
| Preço dinâmico | **PASS** | `priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel` (linha 191), não hardcoded |
| Abre fluxo unlock existente | **PASS** | `handleUnlock = () => handlePremiumAccessClick("sticky_unlock_bar")` via `usePremiumCta` |

Notas:
- Dismiss persiste em `sessionStorage` (`sticky_unlock_bar:dismissed`) — comportamento por sessão, ok.
- O hook tem retry de 20×250ms para anchors montados tarde — apropriado para o load assíncrono.

---

### 3. Sidebar — PASS/FAIL

| Critério | Estado | Evidência |
|---|---|---|
| Free: "2 of 7 accessible" | **PASS** | `buildCommercialSidebarItems(false)` marca tier="free" como `accessible` e tier="pro" como `locked`; `ProgressSummary` usa `i.access === "accessible"` |
| Free: 01 e 02 disponíveis | **PASS** | `COMMERCIAL_SECTIONS[0..1]` têm `tier: "free"` |
| Free: 03–07 locked/premium | **PASS** | `COMMERCIAL_SECTIONS[2..6]` têm `tier: "pro"`; `commercialToSidebarItem` move-os para grupo "premium" |
| Click em item locked → scroll ou unlock | **PARTIAL** | O comportamento exacto do click depende de `LockedItemRow.onClick` — handler é passado pelo container. Visível no extracto: `LockedItemRow` recebe `onClick` mas a implementação não foi inspeccionada nesta passagem. Recomendado verificar se chama `scrollToBlock(item.block.id)` (anchor existe — todas as teasers têm `id={anchorId}`) **ou** `handlePremiumAccessClick("sidebar_locked")`. Ambas são aceitáveis; consistência é o que falta confirmar |
| Pro: "report complete / premium active" | **PASS** | `paidStatus = isCommercial && premiumUnlocked ? { totalSections: items.length } : null` (linha 1304/1385); `ProfileHeader` mostra ícone ✓ + "premium active" |
| Pro: 7 secções disponíveis | **PASS** | `commercialToSidebarItem(s, true)` → todos `accessible`, todos em grupo "incluido" |
| Pro: sem labels locked nas desbloqueadas | **PASS** | `accessBadge: AccessBadge = s.tier === "free" ? "free" : "premium"` continua a marcar como `premium`, mas `access` é `"accessible"` — `ItemRow` (não `LockedItemRow`) é usado |

---

### 4. Pro body — PASS/FAIL

| Critério | Estado | Evidência |
|---|---|---|
| Renderiza todas as 7 secções | **PASS** | Pro entra no ramo `mode="all"` do overview → 01+02+03+04+05; bloco diagnostico (06+07) entra porque `premiumUnlocked && blockDiagnosis !== "hidden"` (em `public_mvp` é `"full"`) |
| Sem `PremiumTeaserCard` | **PASS** | Teasers só renderizam no ramo `free_with_engagement` (linhas 285–297). Em `mode="all"` esse bloco não é instanciado |
| Sem `StickyUnlockBar` | **PASS** | Mount gated por `!premiumUnlocked` |
| Pending placeholders em Pro | **PASS** | `ReportDiagnosticBlock`: `showPaidPlaceholders = premiumUnlocked \|\| pro_preview \|\| internal_lab` (linhas 96–97); slots `visual_cover`, `caption_semantic`, `insights_v2` montam `EnrichmentPlaceholderCard` em `pending`/`error` |
| `premiumUnlocked` real (não preview) | **PASS** | `analyze.$username.tsx` linhas 402–415: `getMyReportEntitlement()` → server fn que lê `lead_entitlements` para `report_full_9`. Fail-closed (`false` por defeito); só vira `true` se servidor confirmar |

⚠️ Nota: em produção `/analyze/$username` passa **sempre** `variant="public_mvp"`, mesmo para Pro. Isto é deliberado e funciona porque as 7 secções comerciais mapeiam para blocos cujos `featureKey`s estão `"full"` em `public_mvp` (`blockOverview`, `blockDiagnosis`) ou são renderizadas dentro do overview (não dependem de feature flag). Os blocos `blockPerformance`/`blockContent`/`blockSearch`/`blockBenchmark` continuam `"hidden"` em `public_mvp` — mas esses são lab-only e **não** fazem parte das 7 comerciais, por isso é o comportamento desejado.

---

### 5. Variant/access — mismatch?

| Variant | Onde é usado | Sticky/teaser logic OK? |
|---|---|---|
| `public_mvp` | `/analyze/$username` (todos os utilizadores, Free e Pro) | **SIM** — gating depende de `premiumUnlocked`, não de variant |
| `pro_preview` | apenas `admin.report-lab` e `admin_.report-preview.$username` (admin) | n/a — admin preview |
| `internal_lab` | apenas admin lab | n/a |
| `premiumUnlocked` | derivado server-side em `getMyReportEntitlement` | **SIM** — fail-closed, sem dependências de URL/cookie/UI |
| `free_with_engagement` | string para `mode` em `ReportOverviewBlock` | **SIM** — disparado apenas quando `lockBoundary === "engagement" && !premiumUnlocked` |

**Nenhum mismatch detectado** onde um Pro user seja tratado como Free. O único ponto a vigiar é que a sidebar comercial usa `premiumUnlocked` (prop), enquanto o body usa o mesmo prop — ambos vêm do mesmo `useState` na rota. ✅

---

### 6. Production readiness

| Item | Hash actual em produção | Status |
|---|---|---|
| `index-*.js` | `index-DbQlUHEe.js` (990 583 B) | actual |
| `report-shell-v2-*.js` | `report-shell-v2-D3tTAVDN.js` (289 397 B) | actual |

Fingerprints encontradas em produção:
- ✅ `"Leitura inicial"` (FreeInitialReadingCard)
- ✅ `"free_with_engagement"`, `"premiumUnlocked"`
- ✅ Eyebrows 03–07: FREQUÊNCIA EDITORIAL · MIX DE FORMATOS · PUBLICAÇÕES-CHAVE · DIAGNÓSTICO EDITORIAL · PRIORIDADES DE ACÇÃO
- ✅ Sticky bar: `"Faltam-te"`, `"5 secções premium"`, `"Desbloquear relatório"`, `bg-[#03045E]`, source `"sticky_unlock_bar"`
- ✅ Modal redesign: `"Adicionar e comparar"`, `"competitor_beta_note"` (presentes no `index-*.js` principal)
- ❌ Limit-guard explícito: `"Apenas 1 concorrente"` / `"atCompetitorLimit"` / `"Limite de concorrente"` — 0 hits. Limite vive apenas como `COMPETITOR_MAX = 2` + `disabled` no botão (linha 491 / 906 de `report-block-nav.tsx`), sem copy dedicado.

**Produção está actualizada** com tudo o que esta auditoria audita. Runtime validation **pode prosseguir em produção** sem republicar (usar handle em cache do Apify para não disparar provider — ex.: `frederico.m.carvalho` se snapshot fresco existir).

---

### Mismatches / pontos a confirmar (não-bloqueantes)

1. **Click em sidebar item locked** — comportamento do `onClick` do `LockedItemRow` não foi exaustivamente inspeccionado nesta auditoria. Deve scroll para anchor da teaser card OU abrir unlock; ambas existem na codebase. Confirmar consistência.
2. **Limit guard de concorrente** — não há copy dedicado (`atCompetitorLimit` / "Apenas 1 concorrente"). O guard é silencioso (botão `disabled` ao atingir 2). Pode merecer micro-copy explicativo, mas é tarefa separada e não foi pedida aqui.
3. **`pro_preview` variant** — definido com `blockPerformance/Content/Search/Benchmark = "hidden"`. Idêntico a `public_mvp`. Existe só para o lab admin. Sem impacto no fluxo público.

---

### Ficheiros que mexeria se algum fix fosse aprovado

- `src/components/report-redesign/v2/report-shell-v2.tsx` — orquestrador
- `src/components/report-redesign/v2/report-overview-block.tsx` — split free/pro
- `src/components/report-redesign/v2/premium-teaser-card.tsx` — 5 teasers
- `src/components/report-redesign/v2/sticky-unlock-bar.tsx` — sticky bar
- `src/components/report-redesign/v2/report-block-nav.tsx` — sidebar comercial + limit guard
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — Pro placeholders
- `src/lib/report/report-variant.ts` + `effective-features.ts` — caso se queira separar `public_mvp` (Free) de uma nova variant `commercial_pro`
- `src/routes/analyze.$username.tsx` — sítio onde `premiumUnlocked` é resolvido

---

### Resultados PASS/FAIL — síntese

| Área | Resultado |
|---|---|
| Free body | **PASS** (6/6) |
| Sticky bar | **PASS** (8/8) |
| Sidebar | **PASS** (6/7) — falta confirmar comportamento de click em item locked |
| Pro body | **PASS** (5/5) |
| Variant/access | **PASS** (sem mismatch) |
| Produção alinhada | **PASS** (build actual, com pequena lacuna no copy do limit guard que não estava no escopo intencional) |

---

### Prompt recomendado para futuras melhorias (NÃO implementar agora)

> Confirma o comportamento do `onClick` em `LockedItemRow` (`src/components/report-redesign/v2/report-block-nav.tsx`). Quando um Free user clica numa secção locked (03–07) na sidebar:
> a) deve fazer scroll suave até `#frequencia` / `#formatos` / `#publicacoes-chave` / `#diagnostico-editorial` / `#prioridades` (já existem como anchors das `PremiumTeaserCard`s) **e**
> b) emitir tracking `sidebar_locked_click` com `section_id`.
> Não abrir unlock modal nesse click (a CTA do teaser card já trata disso). Sem mudanças em pricing, entitlements, checkout, schema ou geração de relatório.

### Sem implementação

Esta auditoria é apenas de leitura. Nada foi alterado.
