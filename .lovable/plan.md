## Avaliação: o Step 5 ainda NÃO está resolvido

Testei o endpoint agora (`POST /api/onboarding/start`) e confirmei no log do dev-server:

```
[stderr] [onboarding/start] cookie write failed
Error: SESSION_SECRET missing or too short (need at least 16 chars).
    at POST (/dev-server/src/routes/api/onboarding/start.ts:208:11)
```

### O que está bem
- Código em `src/routes/api/onboarding/start.ts` correcto: `warnIfSecretMisconfigured()`, `GENERIC_FALLBACK_MESSAGE`, try/catch à volta de `setLeadCookie`.
- Copy de fallback em `pt/gate.json` e `en/gate.json` actualizado.
- Testes de `lead-cookie` verdes (10/10).
- `SESSION_SECRET` existe na lista de secrets do projeto.

### O que falta
A rotação do `SESSION_SECRET` para ≥16 chars (proposta na ronda anterior) **nunca chegou a ser aplicada** — o valor em runtime continua <16 chars, por isso `setLeadCookie` continua a lançar e o endpoint devolve 500 com a nova mensagem genérica. O fix de código sozinho não desbloqueia o Step 5; precisa da rotação do segredo.

### Refinamentos adicionais detectados

1. **Recomendar ≥32 chars, não só ≥16.** O mínimo no código é 16, mas para HMAC de cookies de sessão o standard é 32+ bytes de entropia. Subir o limite mínimo em `lead-cookie.server.ts` para 32 evita falsos "passou" com segredos fracos.

2. **Falha silenciosa do `getBalance`.** Se `getBalance` falhar, devolvemos `credits = 0` sem avisar o cliente. Para Step 5 não é bloqueador, mas convém um log mais visível (já existe `console.error`, está OK — só mencionar).

3. **Cookie write devia correr ANTES do `getBalance`** — se o cookie falha, gastámos uma leitura de saldo à toa. Reordenar para: upsert → grant → setCookie → getBalance. Optimização menor.

4. **Sem teste E2E do endpoint.** O `onboarding-start.test.ts` referido na ronda anterior não foi criado. Continua a ser uma lacuna útil mas não bloqueante para destrancar o Step 5.

## Plano

### 1. Rodar `SESSION_SECRET` (bloqueador)
Pedir ao utilizador uma nova string ≥32 chars via `secrets--update_secret`. Sem isto, Step 5 continua quebrado. Sugestão: gerar com `openssl rand -base64 48` ou equivalente. **Atenção:** rotação invalida cookies existentes — utilizadores em sessão precisam de fazer login outra vez (impacto baixo em pré-launch).

### 2. Subir o mínimo em `lead-cookie.server.ts` (refinamento)
Mudar a validação de `< 16` para `< 32` e actualizar a mensagem de erro. Actualizar os 2 testes correspondentes em `lead-cookie.test.ts` (caso de 15 chars vs caso de 31 chars).

### 3. Reordenar `setLeadCookie` antes de `getBalance` (refinamento)
Trocar ordem em `start.ts`. Cookie é crítico para a navegação; saldo é informativo.

### 4. (Opcional, recomendado) Criar `onboarding-start.test.ts`
Cobertura: payload válido → 200, payload inválido → 400, email duplicado → 200 com update, falha de cookie → 500 com `GENERIC_FALLBACK_MESSAGE`. Usa mocks de `supabaseAdmin`, `grantInitialCredits`, `getBalance`, `setLeadCookie`.

### Out of scope
`analyze-public-v1`, créditos, Apify/OpenAI/DataForSEO, pricing, premium gating, thumbnails, selector do report, sequência do modal, `/report.example`.

### Validação após implementação
- `stack_modern--invoke-server-function` POST `/api/onboarding/start` → esperar 200 + `Set-Cookie: lead_session=…`
- `bunx vitest run src/lib/leads src/routes/api/__tests__/onboarding-start` → verde
- `bunx tsc --noEmit` → 0 erros
- Smoke manual no preview: handle → modal → Step 5 → "Abrir resumo" → navega para `/analyze/$username` sem mensagem de erro

### Checkpoint
- ☐ `SESSION_SECRET` rodado para ≥32 chars
- ☐ Mínimo em `lead-cookie.server.ts` subido para 32
- ☐ Testes `lead-cookie.test.ts` actualizados
- ☐ Ordem `setCookie` → `getBalance` em `start.ts`
- ☐ (opcional) `onboarding-start.test.ts` criado
- ☐ Endpoint devolve 200 + cookie em teste real
