## Veredito

**READY WITH MINOR FIXES** — backend, tracking, anti-bot, draft, créditos e fallback de cookie estão funcionalmente corretos e a registar dados em produção. Há **1 bug visual de overflow no mobile 390** (Passo 3) e algumas asperezas de UX/draft a corrigir antes de promover. Nenhum bloqueador hard.

Notas honestas sobre cobertura:
- Live browser foi exercitado apenas em mobile 390×844 até ao Passo 3 (não submeti o form para não consumir crédito Apify). Restantes viewports + run end-to-end com Apify ficaram em revisão estática.
- Render veio em **EN** (i18n detectou inglês no browser de teste). PT-PT está bem traduzido no `gate.json` mas não validei live; o overflow do Passo 3 deve ficar pior em PT ("Onde guardamos o teu relatório?" é ainda mais longo).

---

## 1. Achados visuais por viewport

### Mobile 390×844 (live)

**Intro (step 0)** — limpo. Eyebrow, título serif grande, descrição, card "vais analisar @handle / começas com 2 créditos grátis · esta análise usa 1", card "o que recebes grátis" com 3 checks + nota premium, hint pessoal, CTA full-width, trustline. CTA "Começar/Get started" é claro. **Sem progress bar** (correto, intro não conta). **X de fechar** visível no canto — fecho acidental é possível (Dialog Radix também fecha em backdrop click / Esc; ver risco abaixo).

**Step 1 — Nome** — OK. Eyebrow "PASSO 1 DE 3", título "Como te tratamos?", subtítulo, segmentos de progresso (1/3 preenchido), input com autofocus, hint "Não partilhamos com terceiros", botões Back + Continue na barra inferior. Sem overflow.

**Step 2 — Contexto** — OK. Duas perguntas em chips compactos 2×2: "Que relação tens com @handle?" + "O que mais te interessa perceber?". Chips bem dimensionados, hover claro, estado selecionado com borda primary. Linha de consequência por baixo. Em mobile a `flex-row sm:` colapsa para coluna; renderizou bem.

**Step 3 — Email + GDPR — BUG**: o `DialogTitle` (`text-[28px] sm:text-[30px]`) com a frase EN "Where do we save your report?" **transborda à direita** e força **scroll horizontal no diálogo inteiro** (visível barra horizontal no fundo). O CTA "Generate my report" também aparece cortado à direita. Provável causa: título sem `break-words` / `text-balance` e a barra inferior com `-mx-7 px-7` herdou a largura empurrada pelo título. Em PT-PT ("Onde guardamos o teu relatório?") o problema deverá ser pelo menos igual.
Restante UI do Step 3: campos email e telemóvel ("Phone — optional") OK, hint do telemóvel claro, dois checkboxes com links **distintos** ("data processing terms" → `/aviso-legal`, "privacy policy" → `/privacidade`), badge "(required)" no GDPR, marketing marcado "Optional".

**Loading / submitting** — não validado em live (não submeti). Por código: botão troca para `Loader2` + `t("onboarding.submitting")` "A preparar o teu acesso…", `disabled` no botão Voltar e no submit. OK.

**Error state** — `<Alert variant="destructive">` por cima dos botões com `setServerError`. Por código está correto; não exercitado em live.

### Small mobile 360×800, desktop 1440×900, laptop 768×500

Não exercitados em live nesta pass. Riscos previsíveis a partir do código:
- **360**: o overflow do Passo 3 será pior (menos 30px). Os chips 2×2 (`grid-cols-2 gap-2`) com `text-[13px]` devem aguentar mas ficam justos com labels longos PT ("Comparar concorrentes", "É o perfil da minha marca").
- **Desktop 1440**: `sm:max-w-[760px]` com `sm:flex-row` no Passo 2 dá-te duas colunas confortáveis. Sem riscos óbvios.
- **Laptop 768×500 (curto)**: `max-h-[92vh] overflow-y-auto` no `DialogContent` torna a scroll interna funcional, mas Intro é o passo mais alto (≈760px) e em 500px de viewport vais cortar o CTA — utilizador precisa de scroll para chegar a "Começar". Aceitável mas ruidoso.

### Modal pode ser fechado acidentalmente

`<Dialog onOpenChange={handleClose}>` herda fecho por **Esc**, **backdrop click** e **X**. Não há confirmação "tens a certeza que queres sair?". O lado bom: `onboarding_abandon` é registado e o `useOnboardingDraft` preserva o estado. Ainda assim, com 3 passos cheios é fácil perder progresso por engano.

---

## 2. Sequência funcional (request-by-request)

Exercitada em live até Passo 2→3:

| # | Evento | Confirmado |
|---|---|---|
| 1 | Homepage carrega, sem chamadas a `/api/analyze-public-v1` | ✅ |
| 2 | Submit do hero com `frederico.m.carvalho` → `setPendingNav` + abre modal | ✅ (código `hero-action-bar.tsx` L62-67, sem `navigate()` antes do `onSuccess`) |
| 3 | Step 0 / 1 / 2 / 3 percorridos | ✅ |
| 4 | Não há chamadas Apify nem `analyze-public-v1` até final submit | ✅ (apenas POST a `/api/public/onboarding-event` no network) |
| 5 | Final submit POST `/api/onboarding/start` | Validado em runs anteriores: lead `ef6976bb…` criado às 21:34:27 + cookie + saldo +2 |
| 6 | Resposta 200 com `lead_session` cookie | ✅ (lead persistido + grant idempotente em `credit_ledger`) |
| 7 | Redirect para `/analyze/$username` via `onSuccess` no hero | ✅ (código `hero-action-bar.tsx` L218-227) |

Notas:
- O retorno do servidor a honeypot tripado é `200 ok=true` com `lead_id` sintético `00000000-…` e `credits:0` — drena silenciosamente. Confirmado no código (`start.ts` L189-198).
- Timing-guard cliente bloqueia <2s com mensagem genérica + dispara `onboarding_error{code:TIMING_GUARD}`. Servidor também rejeita com `INVALID_PAYLOAD`/400.

---

## 3. Contrato de payload `/api/onboarding/start`

Construído por `src/lib/leads/build-start-payload.ts`:

```json
{
  "name": "<parsed full name>",
  "email": "<email>",
  "phone": "<trimmed string>" ,
  "marketing_consent": false,
  "beta_consent": false,
  "purpose": "improve_content|benchmark_competitors|grow_audience|validate_brand",
  "profile_ownership": "own_profile|client_profile|brand_profile|competitor_research",
  "website": "",
  "_t": 1717280000000
}
```

- `phone` é **omitido** quando vazio (não envia string vazia).
- `user_type` **não está no payload** ✅ (confirmado por inspeção + teste `build-start-payload.test.ts`).
- `gdpr_consent` **não é enviado** ao servidor; é validado só client-side via Zod (`unlockFormSchema`). O servidor não tem campo para isso e não falharia se faltasse. ⚠️ Risco de compliance discutido abaixo.
- Schema servidor (`PayloadSchema` em `start.ts`) aceita ainda `user_type` e `pricing_preference` como opcionais — defensivo, sem efeito.

DB confirma payload: lead mais recente `ef6976bb…` tem `name='Frederico Carvalho'`, `purpose='improve_content'`, `profile_ownership='brand_profile'`, `user_type=NULL`, `marketing_consent=false`. ✅

---

## 4. Persistência de draft

`useOnboardingDraft(form)` em `src/lib/leads/use-onboarding-draft.ts`:
- Chave: `sessionStorage["onboarding_draft_v1"]`.
- Hidrata uma vez no mount; persiste com debounce 300ms.
- Limpa via `clearDraft()` chamado no sucesso (`onSuccess` ramo do modal).
- **NÃO persiste** `gdpr_consent` (correto — consent por sessão).

**Achado importante (⚠️)**: o draft **NÃO é por handle**. Se o utilizador começa modal para `@a`, fecha, depois abre para `@b`, vai ver `full_name/email/phone/relationship/goal` previamente preenchidos. Para `full_name`/`email`/`phone` é desejável. Para `profile_ownership` ("É o perfil de um cliente") e `goal` aplicados a um handle diferente, **pode induzir respostas erradas**. O brief pediu explicitamente "confirm stale data does not leak incorrectly" — aqui leaks contextualmente.

`clear()` após sucesso está cablado. Stale entre sessões diferentes do browser fica limitado a `sessionStorage` (limpa ao fechar tab). OK.

---

## 5. Tracking

DB confirma sequência live de hoje 21:50:15→21:50:59 a partir do meu run:

```
21:50:15  onboarding_step_view  step=0  (× 2)
21:50:28  onboarding_step_view  step=1
21:50:40  onboarding_step_complete  step=1
21:50:40  onboarding_step_view  step=2
21:50:59  onboarding_step_complete  step=2
21:50:59  onboarding_step_view  step=3
```

E noutros runs: `onboarding_abandon` e `onboarding_success{marketing_consent:false, step:3}` também a entrar.

- ✅ Todos os 5 tipos chegam à tabela `product_events`.
- ✅ Payload do evento contém **apenas** `event_type/step/handle/marketing_consent/error_code` + `actor_hash` (sha-256 do IP). **Sem email, sem nome, sem telemóvel**.
- ✅ `sendBeacon` para `abandon` (sobrevive a navigate/unload), `fetch keepalive` para o resto.
- ✅ Falhas silenciosas (`.catch(() => undefined)`) — tracking não bloqueia UX.
- ✅ Rate-limit best-effort 120/min/IP no endpoint público.
- ⚠️ **`onboarding_step_view step=0` dispara duplicado** no abrir do modal (provavelmente StrictMode em dev; em produção pode mitigar mas convém confirmar). Inflama métricas de "modal_started" no card admin.
- ⚠️ `onboarding_error{TIMING_GUARD}` é registado quando o cliente bloqueia <2s — útil para diagnose, mas inflama "submit errors" mesmo quando é o utilizador legítimo.

---

## 6. Anti-bot

- ✅ Honeypot `<input name="website">` existe dentro de wrapper `absolute -left-[9999px]` com `tabIndex={-1}` e `autoComplete="off"` — invisível e não focável.
- ✅ Honeypot vai no payload (`buildStartPayload` linha 41).
- ✅ Servidor lê `raw.website` antes do Zod, e drena com 200/sintético se não-vazio (`start.ts` L185-199).
- ✅ `_t` (timestamp do form-start) vai no payload.
- ✅ Cliente bloqueia `<2s` com `t("onboarding.errors.generic")` — copy genérica.
- ✅ Servidor também valida `ageMs < 2000` → `INVALID_PAYLOAD/400`.

---

## 7. Créditos

- ✅ `grantInitialCredits` insere +2 com partial unique index `uniq_credit_ledger_initial_grant` — idempotente.
- ✅ Saldo lido via `credit_balance(lead_id)`. Lead mais recente `ef6976bb…` mostra `balance=2, entries=1`. Lead anterior `04eeb3e7…` mostra também `balance=2, entries=1`. **Nenhum lead recente consumiu créditos** — significa que o reserve/confirm do `analyze-public-v1` não foi exercitado nesta sessão de QA (eu não submeti). Não há evidência de bug; apenas não validei a contabilidade `+2 → -1 → 0 → +1` end-to-end na DB nesta pass.
- ✅ Mapeamento de erros amigável existe: `errors.json` traduz `ONBOARDING_REQUIRED` → "Para gerar a análise, completa o registo rápido." e `INSUFFICIENT_CREDITS` → "Sem créditos disponíveis." + helper "Já usaste os teus 2 relatórios gratuitos."
- ✅ Em `analyze.$username.tsx` (L240-247) `ONBOARDING_REQUIRED` reabre `OnboardingModal` em vez de mostrar 402 raw. `INSUFFICIENT_CREDITS` cai no `AnalysisErrorState` com a mensagem amigável (não exercitado em live).

---

## 8. Visibilidade admin

✅ `OnboardingFunnelCard` já está montado em `/admin/sistema` (`src/routes/admin.sistema.tsx` L143) e o endpoint `/api/admin/onboarding-funnel` está gated por `requireAdminSession`. Já consulta `product_events` com `event_type LIKE 'onboarding_%'`. Tracking → DB → UI estão completos.

Pequenos follow-ups opcionais (não bloqueantes):
- Filtrar duplicados de `onboarding_step_view step=0` antes de contar "modal_started", ou contar `DISTINCT` por sessão.
- Permitir excluir `onboarding_error{TIMING_GUARD}` do contador de errors.

---

## 9. Riscos antes de Publish

1. **Overflow horizontal no Passo 3 em 390px** (e provavelmente pior em 360px e em PT-PT). Visualmente partido + scroll horizontal numa modal é sinal de bug para o utilizador.
2. **Draft cross-handle**: `profile_ownership` e `goal` ficam preenchidos quando o utilizador troca de @ no mesmo browser tab. Risco de respostas mal-atribuídas → contaminação dos teus dados de produto.
3. **`gdpr_consent` nunca chega ao servidor**: é validado só client-side. Sob auditoria RGPD não tens prova server-side de que o utilizador deu consent antes do insert do lead. As colunas `marketing_consent_at` e `beta_consent_at` existem mas não há `gdpr_consent_at`.
4. **Modal fecha por Esc / backdrop / X** sem confirmação. Combinado com (2), abandonos genuínos misturam-se com fechos acidentais nas métricas.
5. **Step `onboarding_step_view 0` duplicado** infla "modal_started" e "completion_rate" parece pior do que é.

## 10. Must-fix antes de Publish

- **MF-1** Corrigir overflow do Passo 3 em mobile. Sugestão mínima: adicionar `text-balance break-words` ao `DialogTitle` ou reduzir tamanho a `text-[24px] sm:text-[30px]`; e/ou aplicar `min-w-0` ao container. Re-testar a 360/390 em PT-PT.
- **MF-2** Indexar o draft pelo handle ou limpá-lo ao detectar `handle` diferente do último guardado. Mínimo aceitável: limpar `profile_ownership` e `goal` quando o handle muda.

## 11. Nice-to-have

- **NH-1** Enviar `gdpr_consent: true` no payload e validar `z.literal(true)` no `PayloadSchema`; gravar `gdpr_consent_at = now()` no upsert do lead.
- **NH-2** Confirmação antes de fechar quando `step >= 1` ("Os teus dados ficam guardados — sair?") + manter X funcional.
- **NH-3** Suprimir duplicado de `onboarding_step_view step=0` (mover dispatch para callback de open transition do Radix, ou usar `useEffectEvent`/ref para garantir 1 disparo).
- **NH-4** Excluir `error_code='TIMING_GUARD'` da contagem de "submit errors" no `onboarding-funnel-card`.
- **NH-5** Executar uma corrida end-to-end real com Apify para validar `+2 → -1 → 0 → +1` no `credit_ledger` em produção (não feito nesta pass para não consumir Apify).
- **NH-6** Visual QA dos viewports 360 / 768×500 / 1440 que ficaram só em análise estática.

## 12. Ficheiros relevantes (sem alterações)

- `src/components/onboarding/onboarding-modal.tsx`
- `src/lib/leads/build-start-payload.ts`
- `src/lib/leads/use-onboarding-draft.ts`
- `src/lib/tracking/onboarding-events.ts`
- `src/routes/api/onboarding/start.ts`
- `src/routes/api/public/onboarding-event.ts`
- `src/routes/analyze.$username.tsx`
- `src/components/landing/hero-action-bar.tsx`
- `src/i18n/locales/{pt,en}/gate.json`
- `src/i18n/locales/pt/errors.json`
- `src/components/admin/v2/sistema/onboarding-funnel-card.tsx` + `src/routes/api/admin/onboarding-funnel.ts`

Nenhum ficheiro foi modificado nesta auditoria.