# Corrigir /admin preso em "A verificar sessão…"

## Causa-raiz

Em `src/routes/admin.tsx`, o sentinela de deduplicação `lastEvaluatedTokenRef` é inicializado a `null`. Quando o utilizador chega ao `/admin` sem sessão activa (ou antes de o storage estar restaurado), o primeiro evento `onAuthStateChange` (`INITIAL_SESSION`) e o primeiro `getSession()` chamam ambos `evaluate(null)`. Como `lastEvaluatedTokenRef.current === null` e `token === null`, o early-return dispara **na primeira chamada** e `setAuthState(...)` nunca é executado — o estado fica em `"checking"` para sempre.

Sintoma: ecrã "A verificar sessão…" sem nunca avançar para `signed_out`, `denied` ou `in`. Sem requests para `/api/admin/whoami` no separador de Network e sem erros na consola — o handler simplesmente nunca corre.

## Correção

Trocar o sentinela `null` por um valor distinguível de "ainda não avaliado" (ex.: `Symbol` ou string sentinela `"__unset__"`). Assim `evaluate(null)` corre na primeira vez e `setAuthState("signed_out")` executa.

## Mudanças

**`src/routes/admin.tsx`** (única alteração):

- Substituir `useRef<string | null>(null)` por `useRef<string | null | typeof UNSET>(UNSET)` com `const UNSET = Symbol("unset")` declarado no módulo.
- Atualizar os dois `lastEvaluatedTokenRef.current = null` (em `handleLogout` e no botão "Entrar com outra conta") para `= UNSET`, garantindo que após logout uma nova avaliação corre mesmo se o token continuar `null`.

Não toca em mais nada: nenhuma alteração de UI, nenhuma migração, nenhum secret, nenhum endpoint, nenhuma chamada Apify.

## Verificação

1. `bunx tsc --noEmit`
2. `bun run build`
3. Abrir `/admin` em sessão limpa (sem JWT): deve mostrar imediatamente o ecrã `AdminGate` (botão "Entrar com Google").
4. Abrir `/admin` autenticado com email da allowlist: deve mostrar o cockpit (`CockpitShell`).
5. Abrir `/admin` autenticado com email fora da allowlist: deve mostrar "Acesso restrito" e terminar a sessão.
6. Clicar em "Terminar sessão" e voltar a entrar — sem ficar preso em "A verificar sessão…".

## Restrições respeitadas

- Sem chamadas a Apify.
- Sem alterações em `/api/analyze-public-v1`, `/report/example`, PDF ou email.
- Sem migrações.
- Sem alterações de secrets.
- Sem alteração de UI pública.