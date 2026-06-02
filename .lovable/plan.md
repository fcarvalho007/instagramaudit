## Contexto

No último submit do onboarding, o cliente vê apenas "Dados inválidos. Verificar os campos." e o servidor devolve 400 sem indicar qual o campo. Pelos network logs deste preview, o body enviado **não inclui `gdpr_consent`**, embora `buildStartPayload` o injecte sempre como `true`. O servidor exige `z.literal(true)` desde a Fase 3 → rejeição imediata, sem detalhe, sem log estruturado.

Dois problemas para resolver:
1. **UX**: mensagem genérica não diz o que falhou nem como recuperar.
2. **Back office**: não há prova do que chegou (apenas `onboarding_error` com `error_code:"INVALID_PAYLOAD"`, sem campos).

## Causa raiz do 400 actual

`buildStartPayload` devolve `gdpr_consent: true` literal, mas o body real que chega ao servidor não o tem. Hipótese mais provável: bundle do preview desactualizado vs. ficheiro local após a migração GDPR (Fase 3). Antes de mudar contratos, **confirmar** lendo o bundle servido (forçar reload) e/ou adicionar um log temporário em `handleOnboardingStart` que faça `console.warn` do `safeParse` `issues` para identificar o campo que falha hoje.

Se for stale bundle: basta rebuild/reload, mas mesmo assim deixamos o servidor preparado para falhas futuras (que serão diferentes), porque a mensagem genérica é o verdadeiro defeito.

## O que vai mudar

### 1. Servidor — devolver detalhe estruturado + logar

`src/routes/api/onboarding/start.ts`:
- Quando `safeParse` falha, devolver no body:
  ```json
  {
    "ok": false,
    "error_code": "INVALID_PAYLOAD",
    "message": "<mensagem PT-PT humana e específica>",
    "issues": [{ "field": "gdpr_consent", "code": "missing" }, ...]
  }
  ```
- Tipo `FailBody` ganha `issues?: { field: string; code: string }[]`.
- Mapear `ZodIssue` → `{ field, code }` (sem expor mensagens internas Zod).
- A mensagem principal (`message`) passa a ser derivada do primeiro issue via um pequeno dicionário PT-PT (ex.: `gdpr_consent` → "Falta aceitar os termos de tratamento de dados."; `email` → "O email parece inválido."; fallback → "Verifica os campos assinalados.").
- `console.warn("[onboarding/start] invalid payload", { issues, hasFields })` — `hasFields` lista só os nomes dos campos presentes (nunca valores), para não logar PII.
- Logar também `INVALID_TIMING` (caso `_t` <2s) com o mesmo formato.

### 2. Servidor — persistir o erro em `product_events`

Em vez de só responder 400, gravar uma linha em `product_events`:
- `event_type: "onboarding_error"`
- `metadata: { error_code, issues: [{field, code}], step: 3, source: "server" }`
- `handle` se vier no body (extender opcionalmente o schema com `handle?: string` apenas para tracking; não persiste em `leads`).

Assim o back-office vê o que chegou (campos em falta, timing), distinguindo erros client-side (`source:"client"`, já emitidos pelo modal) de server-side (`source:"server"`).

### 3. Cliente — mostrar mensagem e destacar campos

`src/components/onboarding/onboarding-modal.tsx`:
- Quando `data.error_code === "INVALID_PAYLOAD"` e `data.issues` existir, em vez de `setServerError(data.message)`:
  - Mapear cada `issue.field` para o campo correspondente no `react-hook-form` (`form.setError(field, { type:"server", message: <i18n> })`).
  - Mostrar a `data.message` como banner principal (`<Alert>`).
  - Focar o primeiro input com erro (`form.setFocus(firstField)`).
- Para `gdpr_consent`: já existe `consentError` no JSX — passa a aparecer também quando vem do servidor. Adicionar visual de destaque (border vermelha já existente).
- Para `email`: se issue vier do servidor, mostrar inline em vez de só banner.

Copy PT-PT (e EN equivalente) em `gate.json` `onboarding.errors.fields.*`:
- `gdpr_consent`: "É preciso aceitar o tratamento de dados para receber o relatório."
- `email`: "Confirma o teu email."
- `name`: "Indica o teu nome."
- `phone`: "Número de telefone inválido."
- `purpose` / `profile_ownership`: "Volta ao passo anterior e escolhe uma opção."
- fallback: "Algum campo precisa de revisão."

### 4. Tracking client-side mantém-se

`trackOnboardingEvent({ event_type:"onboarding_error", error_code })` continua a disparar, agora com `error_code` mais específico quando o servidor o devolver (ex.: `INVALID_PAYLOAD_GDPR`). O log server-side serve de prova canónica; o evento client-side é o sinal de funil.

### 5. Investigação do gdpr_consent em falta (sem alterar contrato)

Antes de declarar "fixed":
1. Ler bundle servido pelo preview (DevTools → Sources `onboarding-modal.*.js`) para confirmar que `buildStartPayload` está actualizado.
2. Se estiver stale: rebuild/reload resolve o erro actual; as mudanças acima protegem contra futuros campos faltantes.
3. Se estiver actualizado e ainda assim falhar: investigar serialização (ex.: filtro `JSON.stringify` replacer? — não há nenhum visível).

## Out of scope

- Não mudar regras de negócio (`gdpr_consent` continua obrigatório).
- Não tocar em `/analyze/$username`, créditos, providers, report.
- Não mudar schema de `product_events` (já tem `metadata jsonb`).
- Não adicionar tabela de erros dedicada — `product_events` chega.

## Ficheiros

- `src/routes/api/onboarding/start.ts` (devolver issues, logar, persistir product_events)
- `src/components/onboarding/onboarding-modal.tsx` (consumir issues, setError, focus)
- `src/i18n/locales/pt/gate.json` + `src/i18n/locales/en/gate.json` (mensagens por campo)
- `src/routes/api/onboarding/__tests__/start.test.ts` (asserts: issues retornados, gdpr ausente → field=gdpr_consent code=missing)
- (opcional) `src/lib/leads/__tests__/build-start-payload.test.ts` — já cobre `gdpr_consent: true`; manter

## Validação

- `bunx vitest run src/routes/api/onboarding src/lib/leads`
- `bunx tsc --noEmit`
- Manual: submeter sem aceitar GDPR → ver mensagem específica + destaque do checkbox; ver linha em `product_events` com `error_code:"INVALID_PAYLOAD"` e `issues:[{field:"gdpr_consent"}]`.
- Manual: tentar fluxo completo aceitando tudo → 200 OK.

## Riscos

- Expor nomes de campos no body é aceitável (não-PII).
- Persistir um event por cada submit inválido pode encher `product_events` se houver loop de submit; mitigado por rate-limit já existente do tracking + dedup natural (cada submit é um clique humano).
