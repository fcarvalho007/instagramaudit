## Resumo

Bloquear chamadas Apify/OpenAI até o utilizador passar por um modal de onboarding que cria um lead e consome 1 crédito (de 2 grátis). O fluxo da homepage e a rota `/analyze/$username` passam a respeitar este gate.

## 1 · Mapa do fluxo actual (auditoria)

```text
homepage (HeroActionBar)
  └─ submit handle → navigate /analyze/$username
       └─ analyze.$username mount
            └─ useEffect → fetchPublicAnalysis()
                 └─ POST /api/analyze-public-v1   ◀── PÚBLICO, sem auth, sem créditos
                      ├─ rate-limit por IP
                      ├─ Apify (perfil + posts)   ◀── CUSTO REAL
                      ├─ normalize + benchmark
                      ├─ storeSnapshot (cache 24h)
                      └─ OpenAI insights (background/server)  ◀── CUSTO REAL
            └─ fetch /api/public/analysis-snapshot/:handle → renderiza relatório
            └─ UnlockModal só aparece DEPOIS do relatório, como gate premium
```

**Resposta às perguntas-chave do brief:**
- Apify é chamado em `src/routes/api/analyze-public-v1.ts` (via `runActorWithMetadata`), antes de qualquer captura de lead.
- OpenAI/enriquecimento é disparado pelo mesmo endpoint / jobs ligados ao snapshot.
- Sim, custo provider acontece antes do submit do formulário.
- A cache pode ser consultada sem chamar provider (`lookupSnapshot` em `src/lib/analysis/cache.ts`).

**Modelo actual de identidade:**
- `leads` (email, name, user_type, purpose, profile_ownership, marketing/beta consent) — captura de lead já existe e a `UnlockModal` já recolhe estes campos.
- `profiles` (Supabase auth, opcional `lead_id`) — usado para área autenticada, não para gerar relatórios.
- `report_requests` liga `lead_id` → `analysis_snapshot_id`.
- Decisão confirmada: **manter só lead** nesta task (sem conta Supabase / magic link).

**Modelo actual de créditos:** não existe. Nenhuma migration de `user_credits` foi aplicada.

## 2 · Política aprovada (esta task)

- Cada **lead novo** começa com 2 créditos grátis (one-shot, sem grant mensal).
- Submeter o modal de onboarding **NÃO** consome crédito (só cria o lead).
- 1 crédito é consumido quando o backend aceita um pedido de geração de relatório (cache miss ou refresh forçado).
- Ver snapshot em cache para um handle já analisado pelo mesmo lead: **não consome** crédito extra.
- Se preflight bloqueia (handle inválido, provider disabled, budget exceeded, allowlist): **não consome**.
- Se Apify falha antes de criar snapshot utilizável: **refund automático** via ledger entry de compensação.
- Ledger é auditável (uma linha por evento; saldo derivado, nunca mutado in-place).

## 3 · Modelo de dados (migration nova)

```sql
-- Saldo derivado: SUM(delta) por lead
CREATE TABLE public.credit_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL,                  -- FK lógica para leads.id
  delta           integer NOT NULL,               -- +grant, -consume, +refund
  reason          text NOT NULL,                  -- 'signup_grant'|'analysis_request'|'refund_provider_failure'|'admin_adjust'
  analysis_event_id uuid,                         -- liga ao evento provider
  analysis_snapshot_id uuid,                      -- snapshot resultante
  handle          text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_ledger_lead ON public.credit_ledger(lead_id, created_at DESC);
CREATE INDEX idx_credit_ledger_event ON public.credit_ledger(analysis_event_id);

-- Sem RLS (servidor usa supabaseAdmin); GRANTs:
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL    ON public.credit_ledger TO service_role;

-- Função de saldo (SECURITY DEFINER, search_path = public):
CREATE FUNCTION public.credit_balance(p_lead_id uuid) RETURNS integer ...
  → SELECT COALESCE(SUM(delta),0) FROM credit_ledger WHERE lead_id = p_lead_id;
```

Sem alteração às tabelas existentes. O lead continua a ser criado em `leads`; o crédito de signup é inserido na mesma transacção do `upsert` em `unlock.server.ts`.

## 4 · Fluxo novo

```text
homepage submit handle
  └─ valida formato (zod já existe)
  └─ NÃO chama API; abre OnboardingModal (cliente-side)
       ├─ contexto: @handle, "Grátis", "1 crédito de 2"
       ├─ 4 perguntas (user_type, purpose, profile_ownership, email+name)
       ├─ caixa "O que recebes grátis" + nota premium
       └─ CTA "Começar"
  └─ submit modal
       └─ POST /api/onboarding/start    ◀── NOVO server route
            ├─ valida zod
            ├─ rate-limit IP/email
            ├─ upsert lead (reutiliza unlock.server.ts)
            ├─ se lead novo → INSERT credit_ledger (+2, signup_grant)
            ├─ guarda cookie httpOnly de sessão lead (assinado, 30d)
            └─ retorna { lead_id, credits_remaining }
  └─ navigate /analyze/$username?onboarded=1
       └─ analyze.$username
            └─ chama /api/analyze-public-v1 (agora exige cookie lead)
                 ├─ verifica cookie lead → 401 se ausente
                 ├─ lookupSnapshot (sem provider)
                 │    └─ se fresh (<24h) → devolve cache, NÃO consome crédito
                 ├─ credit_balance(lead) <= 0 → 402 NO_CREDITS
                 ├─ INSERT credit_ledger (-1, 'analysis_request', pendente)
                 ├─ corre Apify + OpenAI
                 ├─ se falha antes de snapshot → INSERT compensação (+1, refund_provider_failure)
                 └─ devolve snapshot
       └─ "A preparar a análise do perfil…" durante loading
```

## 5 · Mudanças backend

- **Novo** `src/routes/api/onboarding/start.ts` (server route POST). Reaproveita `upsertLeadFromForm` de `unlock.server.ts`. Devolve `Set-Cookie: ib_lead=<signed>; HttpOnly; SameSite=Lax; Max-Age=2592000`.
- **Novo** `src/lib/credits/credits.server.ts`: `getBalance(leadId)`, `consume(leadId, ctx)`, `refund(eventId, reason)`, `grantSignup(leadId)`.
- **Novo** `src/lib/leads/lead-cookie.server.ts`: assina/verifica cookie com `INTERNAL_API_TOKEN` (HMAC).
- **Modificar** `src/routes/api/analyze-public-v1.ts`:
  - Início: ler cookie lead. Se ausente → `403 NOT_ONBOARDED`.
  - Após `lookupSnapshot`: se cache fresh → devolve sem consumir; caso contrário, `consume(leadId)` antes de chamar Apify. Se saldo 0 → `402 NO_CREDITS`.
  - Em `catch` (após consume, antes de snapshot ok) → refund.
  - Anexar `lead_id` ao `recordAnalysisEvent`.

## 6 · Mudanças UI

- **Novo** `src/components/onboarding/onboarding-modal.tsx`: variante do `UnlockModal` mas focada em pré-análise (visual idêntico ao screenshot — header "Cria a tua conta e abre o relatório", chip @handle, badge Grátis, caixa "O que recebes grátis", CTA "Começar", trust row "~1 min · RGPD · sem spam", nota secundária sobre Creator/Empresa). Reutiliza `unlockFormSchema` (mesmas 4 perguntas).
- **Modificar** `src/components/landing/hero-action-bar.tsx`: em vez de `navigate(...)`, abre o `OnboardingModal`. Só navega após `onboarding/start` ok.
- **Modificar** `src/routes/analyze.$username.tsx`:
  - Guard de entrada: se sem cookie lead → redirect home com `?onboard=<handle>` (homepage detecta e reabre modal). Evita atalho via URL directo.
  - Loading copy: "A preparar a análise do perfil…".
  - Mapear novos códigos de erro (`NO_CREDITS`, `NOT_ONBOARDED`).
- **Modificar** `src/lib/analysis/client.ts`: tipa as novas respostas (`NO_CREDITS`, `NOT_ONBOARDED`).
- i18n: chaves novas em `pt`/`en` para todas as strings do modal e dos estados de erro.

## 7 · Protecção contra abuso

- Rate-limit por IP em `/api/onboarding/start` (reaproveitar `assertWithinPublicRateLimit`).
- Rate-limit por email normalizado (max 1 onboarding/h/email).
- Bloquear domínios disposable (lista mínima inicial: mailinator, tempmail, 10minutemail, guerrillamail, yopmail).
- Cookie HMAC: impossível forjar `lead_id` sem `INTERNAL_API_TOKEN`.
- Saldo em DB (não em cookie) → não há como "renovar" créditos a trocar email no mesmo cookie.
- Mantém os limites Apify (`APIFY_DAILY_CAP_USD`, allowlist em testing mode).

## 8 · Estados de erro (UX)

| Código | Copy PT |
|---|---|
| `NOT_ONBOARDED` | Redirect silencioso para homepage com modal aberto |
| `NO_CREDITS` | "Sem créditos disponíveis. Já usaste os 2 créditos gratuitos." |
| `INSUFFICIENT_DATA` | "Este perfil pode não devolver publicações suficientes para análise." |
| `PRIVATE_PROFILE` | "Perfil privado — não é possível analisar." |
| `BUDGET_EXCEEDED` | "Sistema temporariamente em pausa. Tenta novamente mais tarde." (sem consumir crédito) |
| `UPSTREAM_FAILED` | "Não foi possível gerar a análise agora. O crédito foi devolvido." |
| `INVALID_HANDLE` | "Handle inválido." |

## 9 · Ficheiros prováveis

**Novos**
- `supabase/migrations/<ts>_credit_ledger.sql`
- `src/lib/credits/credits.server.ts`
- `src/lib/credits/__tests__/credits.test.ts`
- `src/lib/leads/lead-cookie.server.ts`
- `src/routes/api/onboarding/start.ts`
- `src/routes/api/__tests__/onboarding-start.test.ts`
- `src/components/onboarding/onboarding-modal.tsx`
- `src/components/onboarding/__tests__/onboarding-modal.test.tsx`

**Modificados**
- `src/routes/api/analyze-public-v1.ts` (cookie + créditos + refund)
- `src/components/landing/hero-action-bar.tsx` (abre modal em vez de navegar)
- `src/routes/index.tsx` (suporte a `?onboard=<handle>` para reabrir modal após redirect)
- `src/routes/analyze.$username.tsx` (guard cookie, loading copy, novos erros)
- `src/lib/analysis/client.ts` (novos códigos)
- `src/i18n/locales/{pt,en}/landing.json` e `gate.json` (strings novas)

**Intocados** (constraints do brief): report rendering, Block 1, premium gating, pricing, Apify actor settings, OpenAI prompts, thumbnails, emails.

## 10 · Riscos

- **Bookmark de `/analyze/<handle>`** por utilizadores que nunca passaram no modal → mitigado pelo guard de cookie + redirect com `?onboard=`.
- **Race condition** consume/refund se Apify falhar entre o INSERT e a snapshot → mitigado por refund explícito no `catch`, e por janela onde balance pode aparecer 1 abaixo durante segundos.
- **Cookie perdido** (browser limpa cookies) → utilizador refaz onboarding; se mesmo email, lead é reutilizado, credit_ledger preserva saldo.
- **Falsificação de email** com domínios diferentes → custo limitado por rate-limit IP + cap diário Apify.
- Migration: garantir `GRANT` + função `credit_balance` no mesmo file.

## 11 · Plano de testes

Automatizados (vitest):
- `credits.test.ts`: grant +2, consume -1, refund +1, saldo correcto, idempotência de signup_grant.
- `onboarding-start.test.ts`: lead novo → +2 créditos; lead existente → não duplica grant; rate-limit; disposable email bloqueado.
- `analyze-public-v1` (extensão dos testes existentes): sem cookie → 403; cache fresh → não consome; cache miss + saldo 0 → 402; Apify falha → refund visível no ledger.

Manual:
- Submit handle homepage → modal abre, Apify não dispara (verificar logs).
- Submit modal → lead criado + 2 créditos + redirect.
- Primeiro relatório consome 1 (saldo 1).
- Refresh imediato (cache <24h) não consome.
- Mobile 375px: modal scroll ok.

Validação final:
- `bunx tsc --noEmit`
- `bunx vitest run`

## 12 · Checkpoint para aprovação

☐ Política créditos: 2 one-shot ao criar lead — confirmado
☐ Identidade: só lead (sem Supabase auth) — confirmado
☐ Cache: só verificada depois do submit do modal — confirmado
☐ Migration `credit_ledger` + função `credit_balance` + GRANTs
☐ Cookie HMAC para identificar lead em chamadas subsequentes
☐ `analyze-public-v1` passa a exigir cookie e a consumir crédito
☐ `OnboardingModal` novo, com copy exacto do brief, sem alterar `UnlockModal` premium
☐ Sem alterações em report rendering, pricing, prompts OpenAI, actor Apify
☐ Testes vitest + tsc verdes

Aprovar para passar a Build Mode?
