## Objetivo

Criar uma verificação inequívoca de configuração do Apify no runtime publicado, exposta apenas a admins, sem expor valores de segredos. O painel de Diagnóstico passa a mostrar um cartão definitivo "Estado para smoke test" com 5 linhas e um veredicto único.

Não vai chamar Apify. Não muda secrets. Não toca em /report/example, PDF, email, UI pública, ou migrações.

## Ficheiros alterados

1. **`src/routes/api/admin/diagnostics.ts`** — adicionar o bloco `apify_runtime_check` à resposta GET (já protegido por `requireAdminSession`).
2. **`src/components/admin/cockpit/cockpit-types.ts`** — estender `CockpitData` com o tipo `ApifyRuntimeCheck`.
3. **`src/components/admin/cockpit/panels/diagnostics-panel.tsx`** — novo componente `SmokeTestStatusCard` colocado no topo do painel, acima do `ReadinessCard` existente.

Nada mais é tocado. Os cartões existentes (ReadinessCard, ReadinessChecklistCard, lista de segredos, allowlist) ficam exatamente como estão.

## Forma exata da resposta

Adicionado dentro do payload existente do endpoint:

```json
{
  "apify_runtime_check": {
    "apify_token_present": true,
    "apify_enabled_raw_is_true": true,
    "apify_enabled_state_label": "Ligado · chamadas reais",
    "testing_mode_active": true,
    "allowlist_count": 1,
    "allowlist_includes_test_handle": true,
    "test_handle": "frederico.m.carvalho",
    "ready_for_smoke_test": true,
    "blocking_reason": null
  }
}
```

### Regras de derivação

- `apify_token_present` = `process.env.APIFY_TOKEN` existe e tem comprimento > 0.
- `apify_enabled_raw_is_true` = `process.env.APIFY_ENABLED === "true"` (comparação literal). Este é o booleano-chave: torna inequívoco se o runtime publicado vê exatamente `"true"`.
- `apify_enabled_state_label` = `"Ligado · chamadas reais"` se acima for true, senão `"Desligado · sem chamadas"`.
- `testing_mode_active` = `isTestingModeActive()` (já existe).
- `allowlist_count` = `getAllowlist().length`.
- `allowlist_includes_test_handle` = allowlist contém `"frederico.m.carvalho"` (lowercase).
- `test_handle` = constante literal `"frederico.m.carvalho"`.
- `ready_for_smoke_test` = todos verdadeiros: token + enabled_raw_is_true + testing_mode_active + allowlist_includes_test_handle.
- `blocking_reason` = primeira razão em falta em pt-PT, ou `null`. Mensagens fixas:
  - `"APIFY_TOKEN em falta nos Secrets."`
  - `"APIFY_ENABLED não é exatamente \"true\" no runtime publicado. Republica após corrigir o valor."`
  - `"APIFY_TESTING_MODE inativo — sem allowlist, qualquer handle dispararia o provedor."`
  - `"@frederico.m.carvalho não está na APIFY_ALLOWLIST."`

### O que NÃO é exposto

- O valor do `APIFY_TOKEN` nem nenhum prefixo, comprimento ou hash.
- Os valores em texto de qualquer outro segredo.
- A allowlist não é re-exposta neste bloco (já é exposta pelo bloco `testing_mode.allowlist` existente — comportamento mantido por compatibilidade do painel).

## Cartão UI: "Estado para smoke test"

Inserido no topo do `DiagnosticsPanel`, antes do `ReadinessCard`. Layout compacto, leitura imediata.

```text
┌─ Estado para smoke test ─────────────────── [Pronto / Bloqueado] ─┐
│ Token Apify:        Configurado ✓         │
│ APIFY_ENABLED:      Ligado · chamadas reais ✓                     │
│ Modo de teste:      Allowlist ativa ✓                             │
│ Perfil de teste:    @frederico.m.carvalho permitido ✓             │
│ Estado final:       Pronto para smoke test                        │
│                                                                   │
│ [Se bloqueado: blocking_reason em destaque a amarelo]             │
└───────────────────────────────────────────────────────────────────┘
```

Cada linha usa o mesmo `KV` / ícone padrão já em uso no painel (CheckCircle2 verde / AlertTriangle amarelo). Tons via design tokens (`signal-success`, `signal-warning`), nada hardcoded.

Quando `ready_for_smoke_test === false`, o cartão mostra `blocking_reason` num bloco destacado em `signal-warning/10` com a mensagem exata do backend.

## Verificação

```bash
bunx tsc --noEmit
bun run build
```

Sem chamadas a Apify. Sem chamadas a `/api/analyze-public-v1`.

## O que /admin → Diagnóstico mostrará antes do smoke test

Cenário esperado após a republicação dos secrets corretos:

- **Token Apify:** Configurado
- **APIFY_ENABLED:** Ligado · chamadas reais
- **Modo de teste:** Allowlist ativa
- **Perfil de teste:** @frederico.m.carvalho permitido
- **Estado final:** Pronto para smoke test

Se algum destes falhar, o cartão mostra "Bloqueado" + a `blocking_reason` exata, deixando claro se o problema é o valor do secret, a falta de Publish, ou a allowlist.

## Output após implementação

- Lista de ficheiros alterados.
- Confirmação explícita: 0 chamadas Apify, 0 chamadas a `/api/analyze-public-v1`.
- Resultado de `tsc --noEmit` e `bun run build`.
- Print/descrição do que o cartão mostra com a config atual.
