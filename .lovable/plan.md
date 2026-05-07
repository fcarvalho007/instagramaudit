
# Auditoria de prontidão — Admin Refresh Flow

## Resultado: PASS/FAIL por critério

| # | Critério | Resultado | Evidência |
|---|----------|-----------|-----------|
| 1 | Preflight bloqueia configuração em falta | **PASS** | `refresh-profile-preflight.ts` verifica `INTERNAL_API_TOKEN`, `APIFY_ENABLED`, `APIFY_TOKEN`, allowlist e concorrência. Qualquer falha → `can_refresh: false` + `blocking_reason`. |
| 2 | `APIFY_TOKEN` presença mostrada no modal | **PASS** | Check `apify_token` (L92-103) mostra "Presente, não validado" ou "Em falta". UI renderiza via `PreflightChecklist`. |
| 3 | Comment scraper permanece desativado | **PASS** | Check `actor_comments` (L115-122) lê `COMMENT_SCRAPER_ENABLED`; secret está configurado mas o valor é verificado. Status `warn` quando inativo — não bloqueia. |
| 4 | Utilizadores públicos não podem acionar provider calls | **PASS** | `analyze-public-v1.ts` L437-481: quando `execution_mode=cache_only` (default), público nunca chega ao provider. `?refresh=1` sem `Bearer INTERNAL_API_TOKEN` é ignorado silenciosamente (L387-397). |
| 5 | Admin refresh usa token interno exclusivamente | **PASS** | `refresh-profile.ts` L180-187 exige `INTERNAL_API_TOKEN`; envia-o como `Authorization: Bearer` ao chamar `analyze-public-v1?refresh=1`. |
| 6 | Nenhum toggle global Fresh é necessário | **PASS** | `forceRefresh=true` salta o guard `cache_only` (L437). O modo global permanece `cache_only` durante e após o refresh. |
| 7 | Refresh com sucesso guarda snapshot | **PASS** | `storeSnapshot()` é chamado na L726 do path fresh. Confirmado na BD: snapshot `683e4c21…` com `analysis_status=ready`, `expires_at` renovado. |
| 8 | Refresh com falha preserva cache anterior | **PASS** | L916-940: stale-while-error serve snapshot existente (≤7 dias) se o provider falhar. Nunca apaga/sobrescreve o snapshot antes de ter dados novos. |
| 9 | Admin UI mostra erros específicos | **PASS** | `test-profiles-card.tsx` mapeia `preflight_blocked`, `provider_error_code` e `error_code` para mensagens pt-PT granulares (token inválido, actor sem dataset, parser falhou, etc.). |
| 10 | Relatório abre a partir do novo snapshot | **PASS** | Após refresh, `analysis_events` mostra `cache` hits a servir o snapshot actualizado. O relatório `/analyze/frederico.m.carvalho` usa o mesmo `lookupSnapshot`. |

**Score: 10/10 PASS**

---

## Verificações adicionais

### Toggle global "Fresh" — pode ser escondido/demovido?

**Sim, recomendado.** O `ExecutionModeCard` (execution-mode-card.tsx) expõe um switch cache_only/fresh que agora é redundante para refreshes admin. Se colocado em `fresh` acidentalmente, **todo o tráfego público faz chamadas ao provider** — risco de custo elevado.

**Recomendação:** Mover para uma secção "Avançado / Perigoso" com aviso vermelho, ou esconder completamente e deixar apenas o botão "Atualizar agora" por perfil.

### Fallback para URL publicada — só em preview/sandbox?

**Sim, com nuance.** `getAnalyzeUrls()` (refresh-profile.ts L49-61) tenta primeiro a URL publicada (`instagramaudit.lovable.app`) quando o origin não é o domínio publicado; depois faz fallback ao origin local. No ambiente publicado, usa directamente o origin (sem fallback externo).

**Risco:** Se a versão publicada estiver desatualizada face ao preview, o refresh no sandbox executa código da versão publicada, não do preview. Isto pode causar confusão durante desenvolvimento mas **não afeta produção**.

### Confusão de ambiente?

**Risco baixo em produção.** Em sandbox, o log `TypeError: fetch failed` nos primeiros 4 tentativas (visível nos logs) confirma que o self-fetch local falha e o fallback para a URL publicada funciona. O comportamento é aceitável para testing admin.

---

## Riscos residuais

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Toggle "Fresh" global exposto e pode ser activado por engano | Médio | Mover para "Avançado" ou esconder |
| `APIFY_TOKEN` validação é presença-only, não funcional | Baixo | Aceitável — validação real exigiria chamada paga |
| Sandbox refresh executa código da versão publicada | Baixo | Documentar; não afeta produção |
| Sem rate-limit no botão "Atualizar agora" além do lock de concorrência | Baixo | Lock por handle existe; considerar cooldown futuro |

---

## Veredicto

**BETA READY** — O pipeline de refresh admin está operacional e seguro. Todas as 10 verificações passam. Os riscos residuais são baixos e nenhum é bloqueante para beta. A única acção recomendada antes de expandir a utilizadores externos é demover/esconder o toggle global "Fresh".
