## Problema

Um utilizador já registado (login direto via `/auth` ou Google OAuth, sem passar pelo modal de onboarding) **não consegue usar os seus créditos** quando abre uma nova análise. Sintomas:

1. Em `/analyze/$username` aparece o paywall mesmo que o lead tenha pack de créditos.
2. O botão "Usar 1 dos teus relatórios Pro" nunca aparece (`packBalance = 0`).
3. O `report_request` é criado em background com `is_free_request: true`, gera PDF + email, mas o report fica **bloqueado** no UI público porque `premiumUnlocked = false`.

## Causa raiz

`getMyReportEntitlement` (em `src/lib/payments/entitlements.functions.ts`) e `consumeReportUnlockForSnapshot` resolvem o lead **apenas pelo cookie `lead_session`**:

```ts
const leadId = getLeadFromCookie();
if (!leadId) return { hasLead: false, packBalance: 0, premiumUnlocked: false };
```

O cookie `lead_session` só é emitido por:
- `/api/onboarding/start` (modal de onboarding)
- `/api/onboarding/claim-existing`
- `/api/public/verify-email`

Quem fizer login em `/auth` (password ou Google) **sem passar pelo modal** nunca recebe o cookie. Consequência: o entitlement responde como "anónimo" apesar de o utilizador estar autenticado e ter `profiles.lead_id` preenchido.

Para `enqueueReportForCurrentSnapshot` e `getUserReports` isto não acontece porque essas server fns usam `requireSupabaseAuth` + `profiles.lead_id` — por isso o report é criado e aparece em `/app/reports`, mas continua "locked" na visualização pública.

## Refinamentos propostos

### A. Fallback auth-user → lead no entitlement (núcleo do fix)

`src/lib/payments/entitlements.functions.ts` — `getMyReportEntitlement` e `consumeReportUnlockForSnapshot`:

1. Primeiro tentar `getLeadFromCookie()` (rápido, sem DB).
2. Se não houver cookie, ler o bearer Supabase do request:
   - `await supabase.auth.getUser()` com o token (mesmo padrão já usado em `requireSupabaseAuth`).
   - `SELECT lead_id FROM profiles WHERE id = user.id`.
3. Usar esse `leadId` para `hasEntitlement`, `getReportUnlocksBalance`, `hasUnlockForCacheKey` e `consumeReportUnlock`.
4. (Opcional, recomendado) Quando o fallback acerta, emitir o cookie `lead_session` para o lead resolvido — evita o lookup em pedidos seguintes e alinha o resto do produto (checkout, eupago) com a sessão autenticada.

Resultado: utilizador logado vê `packBalance` real, `premiumUnlocked = true` quando aplica, e pode consumir créditos.

### B. Cookie automático na entrada (defesa em profundidade)

Após login/OAuth callback, garantir que se `profiles.lead_id` existir e o cookie `lead_session` estiver ausente, este é emitido. Local mais limpo: numa nova server fn `ensureLeadCookieFromAuth` chamada pelo `_authenticated/route.tsx` (1× por sessão) ou pelo loader de `/app/reports` e `/analyze/$username`. Idempotente.

Isto torna a Solução A redundante para chamadas subsequentes, mas A continua a ser necessária para a *primeira* chamada de entitlement após login (corrida com a emissão do cookie).

### C. Consumo automático de crédito no novo report (decisão de produto)

Hoje o fluxo é:
- Novo snapshot → `enqueueReportForCurrentSnapshot` cria report com `is_free_request: true`.
- Utilizador tem de **clicar manualmente** em "Usar 1 dos teus relatórios Pro" para `premiumUnlocked` ficar `true`.

Duas opções — preciso de decisão:

- **C1 (manual, recomendado)**: manter como está. O crédito só é consumido quando o utilizador confirma. Mais transparente, evita débitos acidentais. Só preciso de garantir que A+B funcionam para o botão aparecer.
- **C2 (automático)**: quando o utilizador autenticado com `packBalance > 0` abre um snapshot novo sem unlock, consumir 1 crédito automaticamente em `enqueueReportForCurrentSnapshot`. Mais simples mas menos reversível.

### D. Verificação de fluxo "nova conta"

Para signup novo (modal de onboarding): o fluxo já funciona — `/api/onboarding/start` cria lead, emite cookie, grant inicial de créditos, enfileira primeiro report como `is_free_request: true`. **Sem alterações necessárias** desde que A+B sejam aplicados (para os reports *seguintes* ao primeiro).

## Validação

Após implementar:
1. Login direto via Google numa sessão limpa → abrir `/analyze/<novo-handle>` → confirmar `packBalance` correto e botão "Usar 1 Pro" visível se aplicável.
2. Consumir crédito → confirmar `premiumUnlocked = true`, blocos Pro desbloqueados, saldo decrementado.
3. Refresh da página → estado mantém-se (unlock persistido em `lead_report_unlocks`).
4. `/app/reports` → novo report aparece com PDF + email entregue.

## Out of scope

- `/report.example` (locked).
- Schema de `lead_report_unlocks` / `credit_ledger`.
- Pipeline PDF.
- Modal de onboarding e fluxo de signup (já funcional para nova conta).

## Pergunta para o utilizador

Para a alínea **C**: queres consumo **manual** (utilizador confirma) ou **automático** quando há saldo? A minha recomendação é manual (C1) — mais transparente e alinhado com o UI actual.