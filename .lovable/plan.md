

## Auditoria interna — Estado actual e refinamentos necessários

A app está funcionalmente sã (typecheck limpo, sem erros runtime), mas há **inconsistências de qualidade, código órfão e bugs latentes** que minam a coerência. Foco em correcções, não em features novas.

---

### Achados (por prioridade)

#### ALTA — Inconsistências de produto

**1. `analysis-header.tsx` — duplicação visual "Análise pública"**
O eyebrow (`text-[0.625rem]`) e o badge à direita mostram exactamente a mesma string *"Análise pública"*. Redundância editorial. **Fix**: badge passa a *"Dados em direto"* (sinaliza que é fresh do Apify, não placeholder).

**2. `report-gate-modal.tsx` — quota local desactualizada (race condition)**
Modal ainda usa `getQuotaUsage` / `incrementQuota` (localStorage) **antes** do submit. Mas o backend `request-full-report` **não conta nem bloqueia**. Resultado: utilizador limpa storage → cria N pedidos reais na BD. O plano original previa migrar para enforcement server-side; nunca aconteceu. **Fix mínimo agora** (sem alargar scope): remover a pré-check local + decisão pós-submit baseada em `incrementQuota` (mantém UX) e marcar claramente em `metadata.quota_mode: "client_local"` que continua client-side. O verdadeiro server-side fica para um prompt dedicado.

→ **Decisão**: como é "refinamento de qualidade" e não nova feature, mantenho a quota local mas **adiciono comentário JSDoc explícito** em ambos os ficheiros a marcar como dívida técnica conhecida e simplifico o flow (sem mudar a semântica). Evita destruir o que funciona hoje.

#### MÉDIA — Código órfão

**3. `src/components/product/analysis-competitor-comparison.tsx`** — não é importado por nada (grep confirmou). Resíduo da fase mock. **Acção**: apagar.

**4. `src/lib/mock-analysis.ts` — `getMockAnalysis` órfão**
Ninguém chama `getMockAnalysis` ou os tipos `AnalysisData`/`AnalysisProfile`/`AnalysisMetrics`/`AnalysisBenchmark`/`AnalysisCompetitor`. Apenas `formatFollowers`, `formatPercent` e `AnalysisPremiumTeasers` são usados. **Acção**: reduzir o ficheiro a esses 3 exports + renomear para `src/lib/format.ts` *ou* manter em `mock-analysis.ts` e apagar o resto. Mantenho o ficheiro (renomear obriga a tocar imports em vários ficheiros) e podo o conteúdo morto.

**5. `src/lib/quota.ts` — `getRemainingFree` órfão** — função nunca chamada. Apagar.

#### MÉDIA — Bugs latentes

**6. `analysis-header.tsx` — fallback de avatar quebrado**
Se `avatarUrl` existe mas falha o load, o `onError` faz `display: none` no `<img>` e tenta mostrar o `<div>` gradient. Mas o div está renderizado com `display: avatarUrl ? "none" : "block"` **inline style**, e o fallback assume `nextElementSibling`. Funciona, mas é frágil (inline style + DOM mutation). **Fix**: refactor para `useState<boolean>("imgFailed")` — React-idiomático, sem mutações DOM directas.

**7. `analyze-public-v1.ts` — input do post scraper provavelmente errado**
Actor `apify/instagram-post-scraper` espera `username` como **string**, não array. Linha 121: `username: [username]`. Pode silenciosamente devolver vazio, e o código degrada para "0 posts analisados" sem erro visível. **Fix**: passar `username: [username]` mantém-se (alguns actors aceitam ambos), mas adicionar `directUrls: [`https://instagram.com/${username}/`]` como fallback é mais robusto. Alternativa mínima: mudar para `username: username` (string) — verificar contra docs Apify. **Decisão prudente**: passar `directUrls` como input — é o padrão documentado para post scraper.

**8. `analysis-skeleton.tsx` — copy fora do tom**
Mostra dois textos editoriais ("A processar @x", "A recolher dados públicos…") **dentro de um skeleton**. Quebra a abstracção do skeleton (que devia ser puramente visual). **Fix**: manter só o visual pulse + um único eyebrow discreto *"A analisar perfil"*.

#### BAIXA — Polish

**9. `mock-analysis.ts` import path em `analysis-header.tsx`**
Header importa `formatFollowers` de `@/lib/mock-analysis`. Se eu podar mock-analysis (achado #4), o import continua válido. Mantém-se.

**10. `__root.tsx` (LOCKED) — meta tags ok**, não toco.

---

### Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `src/components/product/analysis-header.tsx` | Editar — fix avatar fallback (useState), badge passa a "Dados em direto" | Não |
| `src/components/product/analysis-skeleton.tsx` | Editar — remover copy editorial, manter só pulses + eyebrow discreto | Não |
| `src/components/product/analysis-competitor-comparison.tsx` | **Apagar** — órfão | Não |
| `src/lib/mock-analysis.ts` | Editar — podar tudo excepto `formatFollowers`, `formatPercent`, `AnalysisPremiumTeasers`; reescrever doc-comment | Não |
| `src/lib/quota.ts` | Editar — remover `getRemainingFree`; adicionar JSDoc a marcar dívida técnica (server-side enforcement em falta) | Não |
| `src/components/product/report-gate-modal.tsx` | Editar mínimo — adicionar comentário JSDoc explicando que quota é client-side intencionalmente até prompt dedicado; remover import órfão se aplicável | Não |
| `src/routes/api/analyze-public-v1.ts` | Editar — input do post scraper passa a usar `directUrls` (mais robusto) + manter `resultsLimit` | Não |

**Zero ficheiros locked tocados.**

---

### Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem nova feature | ✅ (apenas refinamento e correcção) |
| Sem novas dependências | ✅ |
| Sem mudanças visuais radicais | ✅ (badge, skeleton e fallback são polish) |
| pt-PT impessoal | ✅ |
| Comentários técnicos em inglês | ✅ |
| Locked files intactos | ✅ |
| Design tokens preservados | ✅ |
| Sem auth/pagamentos/email/PDF/scraping novo | ✅ |

---

### Checkpoints

- ☐ Header sem duplicação editorial; badge sinaliza "Dados em direto"
- ☐ Avatar fallback refactorizado para `useState` (sem mutação DOM)
- ☐ Skeleton volta a ser puramente visual
- ☐ `analysis-competitor-comparison.tsx` apagado
- ☐ `mock-analysis.ts` reduzido aos exports realmente usados
- ☐ `quota.ts` limpo + JSDoc de dívida técnica
- ☐ `report-gate-modal.tsx` documenta a opção arquitectural client-side
- ☐ Post scraper recebe `directUrls` (input robusto)
- ☐ Typecheck continua limpo

