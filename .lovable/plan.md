

## Entendimento

**1. Landing flow**: Hero (action bar com username + validação regex) → submit → `useNavigate` para `/analyze/$username`. Landing dark editorial.

**2. `/analyze/$username`**: dashboard público dark com mock determinístico (header com displayName + handle, métricas, benchmark, comparação concorrentes) → `<PremiumLockedSection>` com CTA "Desbloquear relatório completo" que abre o gate modal.

**3. Gate modal já implementado** (`report-gate-modal.tsx`): form (Nome, Email, Empresa opcional, RGPD) com validação pt-PT → submit persiste em `report_requests` no Lovable Cloud + delay mínimo 600ms → success state. Tem state machine `idle | submitting | success` e `handleOpenChange` com reset síncrono.

**4. Regra de negócio**: 2 relatórios gratuitos/mês por email. 3º bloqueia free e mostra paywall (compra pontual 3€ ou Pro 10€/mês — visual-only por agora).

---

## Plano

### Ficheiros tocados

| Ficheiro | Mudança | Locked? |
|---|---|---|
| `src/lib/quota.ts` (novo) | Helper localStorage: `getQuotaUsage`, `incrementQuota`, `getMonthKey`, `normalizeEmail` | Não |
| `src/components/product/report-gate-modal.tsx` | Adicionar states `success-last` e `paywall`; check quota antes de insert; incrementar após sucesso | Não |

**Zero ficheiros locked tocados.** Zero novas dependências.

---

### A. Estrutura localStorage

```ts
// Key: `instabench:quota:{normalizedEmail}:{YYYY-MM}`
// Value: number (count of submissions this month)
// Auto-reset: muda chave quando muda o mês
```

API interna (`src/lib/quota.ts`):
```ts
export const FREE_MONTHLY_LIMIT = 2;
export function normalizeEmail(email: string): string  // trim + lowercase
export function getMonthKey(date = new Date()): string  // "2026-04"
export function getQuotaUsage(email: string): number    // 0..N
export function incrementQuota(email: string): number   // returns new count
```

Tudo encapsulado — UI nunca toca em `localStorage` directamente. Try/catch defensivo (SSR safety + storage disabled).

---

### B. State machine actualizada do modal

```
idle → submitting → ┬→ success           (1ª submissão deste mês)
                    ├→ success-last      (2ª — última gratuita)
                    └→ paywall           (3ª+ — bloqueada antes do insert)
```

**Lógica no `handleSubmit`:**
1. Validar form
2. Normalizar email
3. `usage = getQuotaUsage(email)`
4. Se `usage >= 2` → `setState('paywall')` (sem insert no Cloud)
5. Senão, fazer insert em `report_requests` (mantém persistência actual)
6. `newCount = incrementQuota(email)`
7. Se `newCount === 1` → `success`
8. Se `newCount === 2` → `success-last`

**Nota:** O insert no Cloud continua para os 2 primeiros — leads ficam captados. Paywall não cria insert (não é uma submissão válida).

---

### C. Três novos estados visuais

**`success` (1ª)** — já existe, adicionar linha discreta:
> "1 de 2 relatórios utilizados este mês"
Em mono, `text-content-tertiary`, abaixo do texto de confirmação actual.

**`success-last` (2ª)** — variante do success com tom calmo:
- Título: "Pedido recebido"
- Subtítulo: "O relatório será enviado para [email] nos próximos minutos."
- Bloco de aviso editorial (border `border-accent-gold/30`, bg `accent-gold/5`):
  > "Este foi o segundo e último relatório gratuito deste mês."
  > "Para mais relatórios: compra pontual ou acesso Pro."
- Mono footer: "2 de 2 relatórios utilizados este mês"
- CTA primário: "Continuar"
- CTA secundário discreto: "Ver opções de upgrade" → muda para state `paywall`

**`paywall` (3ª+)** — bloco productizado:
- Eyebrow mono: "Limite mensal atingido"
- Título Fraunces: "2 relatórios gratuitos já utilizados este mês"
- Descrição: "Continuar com compra pontual ou acesso Pro."
- 2 cards lado-a-lado (stack em mobile):
  - **Card A — Compra pontual**: "1 relatório · 3€" + CTA "Desbloquear novo relatório" (disabled visual / `disabled` prop)
  - **Card B — Pro** (badge "Recomendado" gold): "Relatórios ilimitados · 10€/mês" + CTA "Ver plano Pro" (disabled)
- Footer mono: "Quota reinicia no início do próximo mês"
- CTA close: "Fechar"

Ambos CTAs com `disabled` + tooltip "Disponível em breve" (sem wiring real, conforme guardrail).

---

### D. UX details

- Transições entre states: já usa Radix Dialog — sem animações extra, troca limpa.
- Reset (`resetForm`) deve resetar para `idle` independentemente do state actual.
- Mensagens de quota mono `text-[0.625rem] uppercase tracking-[0.16em] text-content-tertiary` — consistente com o eyebrow já existente.
- Mobile 375px: cards do paywall stack vertical com `flex-col md:flex-row`.
- Tokens-only: `accent-gold`, `accent-violet`, `signal-*`, `surface-*`, `border-*`, `content-*` — todos já existentes.

---

### E. Future-ready

- `quota.ts` exporta API limpa que pode ser substituída por chamadas Supabase RPC sem alterar o modal.
- Insert em `report_requests` mantém-se — quando backend tiver quota real, basta trocar `getQuotaUsage` por query à tabela.
- Estados visuais são reutilizáveis para o paywall pós-Stripe/EuPago.

---

### Confirmação dos guardrails

✅ Frontend-only (localStorage)
✅ Zero Supabase auth/quota, zero Resend, zero EuPago wiring
✅ Zero novas dependências
✅ Tokens-only
✅ pt-PT impessoal
✅ Zero locked files
✅ Mobile 375px planeado
✅ Future-ready (API encapsulada)

