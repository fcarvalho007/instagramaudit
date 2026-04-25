# Auditoria — Apify Readiness (sem alterações de código)

Esta é uma **auditoria diagnóstica**. Não toca em código, UI, `/report.example`, PDF ou email. Aprovação serve apenas para registar a leitura — nenhuma alteração será aplicada com base só nesta aprovação.

---

## 1. Rota do resultado real — `/analyze/$username`

**OK.** É a rota correta para a análise real:
- Aceita `?vs=competitor1,competitor2` (cap a 2).
- SSR desativado intencionalmente (`ssr: false`) para manter Apify do lado servidor.
- `head()` define `<title>` e `og:*` por handle.
- Faz `POST` para `/api/analyze-public-v1` via `fetchPublicAnalysis`.

**Pequenos riscos** (não bloqueantes):
- Não há `errorComponent` / `notFoundComponent` específicos da rota (tratado em estado interno via `AnalysisErrorState`).
- `meta robots` não está definida — qualquer URL `/analyze/<handle>` é indexável. Antes de Apify ativo, recomenda-se `noindex` para evitar o Google a varrer perfis e gerar custo.

---

## 2. Isolamento de `/report.example`

**OK, está isolado.**
- Renderiza apenas `<ReportPage />` com `report-mock-data.ts`.
- Não importa nada de `analysis-*`, nem chama `/api/analyze-public-v1`.
- Listada como locked em `LOCKED_FILES.md` e `.lovable/memory/constraints/locked-files.md` (incluindo todos os `report-*` e `report-theme-wrapper`).
- Tem `noindex, nofollow`.

Conclusão: pode ficar como mockup editorial. Nenhum risco de fuga para fluxo real.

---

## 3. Estados de UI no resultado

| Estado | Suportado | Notas |
|---|---|---|
| Loading | Sim — `AnalysisSkeleton` | Adequado |
| Erro upstream | Sim — `AnalysisErrorState` com retry | pt-PT, calmo |
| Perfil não encontrado | Sim — `PROFILE_NOT_FOUND` mapeado | Mensagem específica |
| Username inválido | Sim — `INVALID_USERNAME` | Validado em cliente + servidor |
| Falha de rede | Sim — `NETWORK_ERROR` | Mapeado em `client.ts` |
| Cache fresca | Sim — `data_source: "cache"` | Sem badge visível ao utilizador |
| Stale (>24h, ≤7d, após erro upstream) | Sim — `data_source: "stale"` + `staleAgeLabel` ("há 2 dias") no dashboard | Bom |
| Falha parcial de concorrente | Sim — `competitorFailure(...)` com 3 sub-códigos | O concorrente entra como `success: false` no payload |

**Lacunas menores:**
- Não existe estado "no posts" explícito (`posts_analyzed === 0`): o dashboard mostra zeros sem aviso. Aceitável para perfis novos, mas merece uma badge tipo "Sem publicações recentes".
- Não há indicação visível ao utilizador final quando `data_source === "cache"` (apenas `"stale"` sinaliza). Pode ser intencional.

---

## 4. Admin / backoffice

**Estado:** Útil para `report_requests`, **insuficiente para diagnosticar Apify**.

O que existe (`/admin`):
- Gate por `INTERNAL_API_TOKEN`.
- Lista `report_requests` com filtros (status, pdf, delivery).
- Detalhe por `id` + ações de recovery (`regenerate-pdf`, `resend-email`).

O que **falta** para uma operação Apify segura:
- Sem listagem nem inspeção de `analysis_snapshots` (cache hits, expirados, payloads, freshness, erros).
- Sem contador/histórico de chamadas Apify (sucesso, 404, timeout, custo estimado).
- Sem allowlist editável (handles permitidos durante smoke test).
- Sem botão "purgar cache" / "forçar refresh" controlado (apenas `?refresh=1` server-side, não exposto na UI).

---

## 5. Endpoint Apify — pronto para smoke test?

`/api/analyze-public-v1` (`apify/instagram-scraper`):

**Fortes:**
- Token via header `Authorization: Bearer …`, nunca em querystring.
- Validação Zod estrita (regex `^[A-Za-z0-9._]{1,30}$`).
- `runActor` com timeout (60s) + memória (1024MB) controlados.
- Dedupe de concorrentes + cap a 2.
- Falha de concorrente isolada via `Promise.allSettled`-equivalente — não derruba primário.
- Cache 24h por `cache_key` determinístico (primário + concorrentes ordenados).
- Stale-while-error até 7 dias.
- Errors mapeados em códigos enumerados, payload upstream nunca exposto.

**Fracos / bloqueantes para Apify pago:**
- **Sem rate limiting** (nem por IP, nem por handle, nem global).
- **Sem allowlist** — qualquer handle válido é aceite.
- **Sem CAPTCHA** ou prova-de-humano no frontend.
- `?refresh=1` está **público** (qualquer utilizador pode anexar à URL e bypassar a cache).
- `POSTS_LIMIT = 12` (OK, baixo) — mas não é configurável por env, está hardcoded.
- Sem métrica/log estruturado de custo (apenas `console.error`).
- Sem kill-switch (env var para devolver `UPSTREAM_UNAVAILABLE` sem chamar Apify).

---

## 6. Proteção de custo — checklist

| Mecanismo | Estado | Comentário |
|---|---|---|
| Cache 24h | ✅ Sim | `analysis_snapshots` + `cache_key` versionado |
| Stale fallback 7d | ✅ Sim | Reduz custo em incidente upstream |
| Limite de posts/perfil | ⚠️ Hardcoded (12) | Bom valor, mas não reconfigurável sem deploy |
| Limite de concorrentes | ✅ 2 | OK |
| Rate limiting (IP/global) | ❌ Não | **Bloqueante** |
| Allowlist temporária | ❌ Não | **Bloqueante para smoke test** |
| Refresh público desativado | ❌ `?refresh=1` aberto | **Bloqueante** |
| Kill-switch (`APIFY_ENABLED=false`) | ❌ Não | Recomendado |
| CAPTCHA / Turnstile | ❌ Não | Recomendado quando público |
| Logging de custo | ❌ Não | Difícil estimar gasto real |

---

## 7. O que preparar **antes** de subscrever Apify Starter

Por ordem (cada um é uma futura prompt isolada):

1. **Kill-switch + allowlist + bloqueio de `?refresh` público** (uma prompt).
   - Env `APIFY_ENABLED=false` por default → devolve `UPSTREAM_UNAVAILABLE`.
   - Env `APIFY_ALLOWLIST="frederico.m.carvalho,..."` (comma-separated). Fora da lista → `INVALID_USERNAME` ou nova mensagem "perfil não disponível para análise".
   - `?refresh=1` só funciona se `Authorization: Bearer ${INTERNAL_API_TOKEN}` estiver presente.
2. **Rate limiting básico no edge** (uma prompt).
   - Limite por IP (ex.: 5 análises / hora) usando uma tabela `rate_events` no Supabase com `inserted_at` e janela deslizante. Sem dependência externa.
3. **Painel admin de snapshots + chamadas Apify** (uma prompt).
   - Lista `analysis_snapshots` (handle, criado, expira, fresh/stale, tamanho do payload).
   - Botões "purgar cache" e "forçar refresh" autenticados.
   - Contador de chamadas Apify por dia (tabela `apify_call_log` com `actor`, `status`, `duration_ms`, `created_at`).
4. **Smoke test controlado** com Frederico como único handle permitido.
5. **`noindex` em `/analyze/$username`** até decidir SEO público.
6. **Subscrição Apify Starter + ativação de `APIFY_ENABLED=true`**.

---

## 8. Ficheiros que mudariam (referência, sem editar agora)

Para os 3 primeiros passos acima:
- `src/routes/api/analyze-public-v1.ts` (kill-switch, allowlist, gate em `?refresh`).
- `src/lib/analysis/apify-client.ts` (eventual hook para `apify_call_log`).
- Nova migração SQL: tabelas `rate_events` e `apify_call_log` (RLS service-role only).
- Novo `src/lib/security/rate-limit.ts`.
- Novos endpoints admin: `src/routes/api/admin/snapshots.ts`, `src/routes/api/admin/snapshots.$id.ts`, `src/routes/api/admin/apify-stats.ts`.
- Novos componentes admin: `src/components/admin/snapshot-list.tsx`, `src/components/admin/apify-stats-panel.tsx`.
- `src/routes/admin.tsx` (adicionar tabs/secção).
- `src/routes/analyze.$username.tsx` (apenas para `meta robots: noindex` — não toca UI).

---

## 9. Ficheiros **bloqueados** (a não tocar sem permissão explícita)

Conforme `LOCKED_FILES.md`:
- `/src/styles/tokens.css`, `/src/styles/tokens-light.css`, `/src/styles.css` (`@theme inline`).
- `/src/routes/__root.tsx`.
- `/src/routes/report.example.tsx` e **todos** os `/src/components/report/*`.
- Toda a landing (`hero-*`, `how-it-works-*`, `mockup-*`, `product-preview-*`, `social-proof-*`, micro-componentes, `instagram-glyph`).
- `/src/components/layout/*` (header, footer, container, app-shell, brand-mark).
- `/src/components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `switch.tsx`.
- `/src/components/legal/*`, `/src/routes/privacidade.tsx`, `/src/routes/termos.tsx`.
- Auto-gerados: `/src/routeTree.gen.ts`, `/src/integrations/supabase/client.ts`, `/src/integrations/supabase/types.ts`, `/.env`.

Os ficheiros do dashboard real (`/src/components/product/*`) **não estão bloqueados**, mas nenhum precisa de mudar para a fase Apify-readiness.

---

## 10. Menor passo seguro a implementar a seguir

**Prompt único, escopo mínimo, zero risco UI:**

> "Adicionar kill-switch + allowlist + proteção de `?refresh=1` em `/api/analyze-public-v1`."
>
> Implementação:
> - Ler `APIFY_ENABLED` (default `false`) → se off, devolver `UPSTREAM_UNAVAILABLE` sem chamar Apify nem cache.
> - Ler `APIFY_ALLOWLIST` (CSV, lowercase) → se primário não estiver na lista, devolver `PROFILE_NOT_FOUND` com mensagem "Análise indisponível para este perfil durante o período de testes." (concorrentes fora da lista são silenciosamente removidos).
> - `?refresh=1` só é honrado se `request.headers.get("authorization") === "Bearer ${INTERNAL_API_TOKEN}"`; caso contrário ignorado.
> - Sem alterações no frontend, sem alterações em UI, sem schema migration, sem tocar PDF/email.

Esta é a fatia mais pequena que torna seguro ligar a chave `APIFY_TOKEN` a uma conta Apify paga.

---

## Resumo executivo

A app está **arquiteturalmente pronta** para Apify (token server-side, cache, normalização, stale fallback, admin de relatórios). Falta a **camada de proteção de custo** antes de ativar a subscrição: kill-switch, allowlist, bloqueio de refresh público e rate limiting são pré-requisitos. O passo 1 (kill-switch + allowlist + refresh-gate) é a fatia mínima viável.