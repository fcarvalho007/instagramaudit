## Objetivo

Adicionar o secret `APIFY_ALLOWLIST` ao projeto para destrancar o primeiro smoke test do Apify.

## Ação

Adicionar **uma única variável de ambiente** via tool de secrets:

- **Nome:** `APIFY_ALLOWLIST`
- **Valor:** `frederico.m.carvalho`

Isto popula a allowlist server-side lida em `src/lib/security/apify-allowlist.ts`. Sem este passo, qualquer chamada a `/analyze/<handle>` devolve `PROFILE_NOT_ALLOWED` mesmo após subscreveres a Apify.

## Não fazer agora

- Não definir `APIFY_ENABLED=true` (esse passo é só depois de subscreveres a Apify Starter)
- Não tocar em `APIFY_TOKEN` (já presente)
- Não tocar em `APIFY_TESTING_MODE` (default ON é o desejado)
- Sem alterações de código, migrações ou endpoints

## Validação após adicionar

1. Abrir `/admin → Diagnóstico`
2. Confirmar no card **Checklist · Prontidão**:
   - ✅ "Allowlist configurada (1 handle)"
   - ✅ "Perfil de teste permitido"
3. Confirmar na secção **Modo de teste**: chip `@frederico.m.carvalho` visível

## Próximos passos (fora deste plano)

Quando subscreveres a Apify Starter, voltas e mudo apenas `APIFY_ENABLED` para `true`.
