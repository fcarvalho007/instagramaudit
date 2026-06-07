## Auditoria de produção — `auditprofiles.com`

Apenas leitura. Nenhuma chamada a Apify, OpenAI, DataForSEO ou EuPago.

### 1. Estado da publicação

| Item | Valor |
|---|---|
| `is_published` | `true` |
| `effective_publish_visibility` | `public` |
| URLs servidas | `https://auditprofiles.com`, `https://www.auditprofiles.com`, `https://instagramaudit.lovable.app` |
| Bundle principal SSR | `/assets/index-CYdz7OrC.js` (≈ 990 KB) |
| Bundle do shell do report | `/assets/report-shell-v2-CAzVQNtD.js` (≈ 289 KB) |

> Nota: tanto `instagramaudit.lovable.app` como o preview `id-preview--*.lovable.app` responderam com corpo vazio a `curl`. É comportamento normal — ambos exigem cookie de sessão Lovable. A produção pública (`auditprofiles.com`) responde com HTML SSR, e foi essa que foi auditada.

### 2. Método

1. `publish_settings--get_publish_settings` + `project_urls--get_urls` para confirmar publicação.
2. SSR HTML da raiz e de `/report.example` puxado por `curl` (200 OK, 61 KB e 14 KB respectivamente — sem chamadas a APIs externas).
3. Os bundles lazy do report (`report-shell-v2`, `report-full`, `snapshot-to-report-data`, `unlock-flow`) descobertos por preload-hint no JS principal e descarregados como ficheiros estáticos.
4. Pesquisa por strings literais (i18n PT/EN, identificadores não-mangled como nomes de campos JSON / props expostas) nos bundles. **Não foi feita navegação no produto.**

### 3. Estado de build em produção: **`outdated`**

A produção contém as funcionalidades do PR de readiness Free (gate, sanitização, FreeInitialReadingCard, teasers premium, sticky bar) — mas **não** contém o redesign mais recente do modal "Adicionar concorrente" nem o limit guard introduzido na sessão anterior.

### 4. Features confirmadas em produção

| Feature | Fingerprint | Hits | Onde |
|---|---|---|---|
| Free enrichment gate com `skipped_free` | string `"skipped_free"` | 1 | bundle do report |
| Free initial reading card (deterministic) | string `"Leitura inicial"` | 1 | `report-shell-v2` |
| Roteamento Free vs Pro via `free_with_engagement` | string `"free_with_engagement"` | 2 | `report-shell-v2` |
| Public snapshot sanitisation (campos paid-only strip) | string `"ai_insights_v2"` | 1 | `snapshot-to-report-data` (campo lido = sinal de que sanitização e shape estão deployados) |
| Refined premium teaser skeletons (5 secções) | títulos PT: `"Com que ritmo publica"`, `"Que formatos dominam"`, `"Que posts puxam"`, `"O que explica estes resultados"`, `"O que testar, corrigir ou repetir"`, label `"5 secções premium"` | 1-3 cada | `report-shell-v2` |
| Sticky unlock bar (versão escura, navy) | classe utilitária `bg-[#03045E]` + `"Desbloquear relatório"` | 1 + 2 | `report-shell-v2` |
| Gating Pro pendente por `premiumUnlocked` | identificador `premiumUnlocked` preservado (prop não-mangled) + `report_full_9` | 2 + 3 | `report-shell-v2` |

### 5. Features ausentes ou parciais em produção

| Feature | Fingerprint esperado | Hits | Diagnóstico |
|---|---|---|---|
| Redesign do modal "Adicionar concorrente" | `"Adicionar e comparar"`, `"competitor_beta_note"`, `"credit_use_label"`, `"free_in_beta_badge"` | **0 cada** | Não deployado. |
| Label antigo do modal (sanity check) | `"Usar 1 crédito e adicionar"` | **1** | Confirmado: produção serve **ainda o modal antigo**. |
| Add Competitor limit guard | `"atCompetitorLimit"`, `"Apenas 1 concorrente"`, `"Limite de concorrente"` | **0 cada** | Não há evidência da prop/limit. Como o redesign do modal também não está, é altamente provável que o guard também não esteja, mas só uma run controlada confirma 100%. |

### 6. Pode-se proceder a runtime validation?

**Parcialmente sim, com cuidado.**

- **PR 1 (Backend Free gate / `skipped_free` / sanitização) — pode ser validado em produção.** Todas as fingerprints estão presentes. Validação possível **sem disparar Apify**: chamar o endpoint público com um handle já em cache (`frederico.m.carvalho` é o test profile do projecto). Apify só corre em cache-miss; um hit confirma o caminho `skipped_free` e a sanitização sem custo.
- **PR 2 (FreeInitialReadingCard / teasers / sticky bar / gating premiumUnlocked) — pode ser validado em produção.** Visualmente, navegando em modo anónimo para o report do handle em cache.
- **PR 3 (modal Adicionar concorrente + limit guard) — NÃO pode ser validado em produção.** Não está publicado. Tem de ser validado no preview (`id-preview--…lovable.app`), e só depois publicado.

### 7. Recomendações operacionais (sem implementar)

1. **Antes de testar PR 3**: publicar a versão actual do preview (clique "Update" no Publish dialog). Sem isso, qualquer QA em `auditprofiles.com` para o modal redesign será inválido por falta de deploy.
2. **Para o teste do PR 1/PR 2 sem custos**: usar exclusivamente handles cuja `analysis_snapshots` tenha entrada fresca dentro da janela de cache configurada para Free (verificar antes via `SELECT generated_at FROM analysis_snapshots WHERE username = 'frederico.m.carvalho' ORDER BY generated_at DESC LIMIT 1;`).
3. **Para o teste do PR 3 (modal/limit)**: validar no preview com o mesmo handle em cache; só publicar depois de confirmar Add Competitor end-to-end.

### 8. Sem implementação

Esta auditoria é só de leitura. Nada foi alterado em código, no preview, em produção, nem na base de dados. Nenhum provider externo (Apify / OpenAI / DataForSEO / EuPago) foi chamado.
