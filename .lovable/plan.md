## Auditoria

- **`RESEND_FROM`**: **não configurado** (confirmado via `fetch_secrets`). `RESEND_API_KEY` está presente.
- **`src/lib/email/sender.ts`**: cai silenciosamente em `"InstaBench <onboarding@resend.dev>"` (sandbox da Resend) quando `RESEND_FROM` está vazio. **Inseguro** — em beta externa, a Resend só entrega para o owner da conta.
- **`src/lib/email/transactional-email.server.ts`** (l.286-299): o gate de fallback verifica apenas `RESEND_API_KEY`. Se faltar `RESEND_FROM`, ainda chama `sendViaResend` que usa o sender sandbox. O log emitido (`resend_fallback_email_sent`) **mente** sobre o destino real.
- Não existe flag clara de "dev mode" no projeto (o `NODE_ENV` do Vite não está usado nesta pipeline server). Decisão: **não fazer fallback para sandbox em nenhum cenário automaticamente**. Quem quiser testar local define `RESEND_FROM` explicitamente.

## Pergunta antes de implementar

`RESEND_FROM` valor sugerido: **`InstaBench <relatorios@instagramaudit.pt>`**.
Antes de chamar `add_secret`, preciso confirmar:

- O domínio `instagramaudit.pt` (ou subdomínio) está **verificado na Resend** com SPF/DKIM ok?
  - **Sim** → adicionamos `RESEND_FROM = InstaBench <relatorios@instagramaudit.pt>`.
  - **Não** → ficamos sem `RESEND_FROM` definido (Resend fica desativado, código loga `RESEND_FROM_MISSING`) até o domínio ser verificado.

Vou pedir esta confirmação via `ask_questions` antes de mexer no secret.

## Alterações de código

### 1. `src/lib/email/sender.ts` — remover fallback sandbox

```ts
export type SenderResolution =
  | { ok: true; from: string }
  | { ok: false; reason: "RESEND_FROM_MISSING" };

export function resolveSender(): SenderResolution {
  const v = process.env.RESEND_FROM?.trim();
  if (!v) return { ok: false, reason: "RESEND_FROM_MISSING" };
  return { ok: true, from: v };
}
```

Sem default. Sem sandbox. Sem branch dev — quem precisar define `RESEND_FROM` no ambiente.

### 2. `src/lib/email/transactional-email.server.ts`

- `sendViaResend` (l.170): logo após validar `RESEND_API_KEY`, validar `resolveSender()`. Se `!ok`, devolver `ProviderResult` com `reason: "RESEND_FROM_MISSING"` (sem chamar fetch).
- Linha do body: `from: sender.from` (após o guard).
- Dispatcher (l.286): mudar `hasResend` para também exigir `RESEND_FROM`:
  ```ts
  const resendApiKeyOk = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFromOk = Boolean(process.env.RESEND_FROM?.trim());
  const resendConfigured = resendApiKeyOk && resendFromOk;
  ```
  Se `!resendConfigured`, registar evento de falha do flow com:
  ```ts
  {
    brevo_reason,
    resend_reason: !resendApiKeyOk ? "RESEND_API_KEY_MISSING" : "RESEND_FROM_MISSING",
    fallback_attempted: false,
    missing_secret: !resendApiKeyOk ? "RESEND_API_KEY" : "RESEND_FROM",
  }
  ```
  e devolver `resendReason` correspondente (em vez de `null`).
- Garantir que metadata **nunca** inclui chaves API (já não inclui — só nome do secret em falta).

### 3. `src/lib/admin/system-queries.server.ts`

Adicionar `RESEND_FROM` à lista de secrets monitorizados (l.429) e considerar o "Resend OK" (l.470) como `RESEND_API_KEY && RESEND_FROM`.

### 4. Testes — `src/lib/email/__tests__/transactional-email.test.ts`

Atualizar/adicionar:

- **Brevo OK** → Resend não usado. (já existe)
- **Brevo falha + RESEND_FROM presente** → Resend fallback usado. (já existe)
- **Brevo falha + RESEND_API_KEY ausente** → falha logada, `resend_reason: "RESEND_API_KEY_MISSING"`, `missing_secret: "RESEND_API_KEY"`, sem chamada Resend. (substitui o existente para incluir os novos campos)
- **NOVO: Brevo falha + RESEND_FROM ausente (mas API key presente)** → falha logada, `resend_reason: "RESEND_FROM_MISSING"`, `missing_secret: "RESEND_FROM"`, sem chamada Resend, sem `onboarding@resend.dev` no JSON.stringify das chamadas.
- **NOVO: Asserção** que `JSON.stringify(mockRecord.mock.calls)` não contém `re_test` nem `resend.dev`.

### 5. Adicionar secret (após confirmação)

Se o domínio estiver verificado: `add_secret(["RESEND_FROM"])` com guidance para colar `InstaBench <relatorios@instagramaudit.pt>`.

## Fora de âmbito

- Não alterar copy de emails.
- Não tocar em UI pública.
- Sem mudanças de schema.
- Sem chamadas reais a Brevo/Resend (testes mockados, como já estão).
- Sem mexer no Brevo (continua primário).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/email/__tests__/transactional-email.test.ts`

## Resposta final ao briefing

- **`RESEND_FROM` configurado?** Não.
- **Comportamento quando ausente (após patch):** Resend não é tentado; evento de falha do flow é registado com `resend_reason: "RESEND_FROM_MISSING"`, `missing_secret: "RESEND_FROM"`, `fallback_attempted: false`. Nunca cai em `onboarding@resend.dev`.

## Checkpoint

- ☐ Confirmar verificação do domínio `instagramaudit.pt` na Resend
- ☐ (Se verificado) `RESEND_FROM` adicionado via `add_secret`
- ☐ `sender.ts` devolve resolução tipada sem sandbox
- ☐ `transactional-email.server.ts` gate inclui `RESEND_FROM`, metadata expõe `missing_secret`
- ☐ `system-queries.server.ts` reconhece `RESEND_FROM` como obrigatório
- ☐ Testes atualizados (5 cenários, sem leak de keys/sandbox)
- ☐ `tsc` e `vitest` verdes
