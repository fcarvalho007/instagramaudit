
# Redesenho do onboarding modal (4 ecrãs)

Implementa os mockups anexados: fundir Passos 2/3/4 antigos num só ecrã de contexto, corrigir bugs de copy do antigo Step 5, e adicionar persistência + anti-bot + tracking. Tudo sem mexer em Apify, OpenAI, report, pricing, thumbnails, selector temporal ou emails.

## Estrutura final do funil

```
Intro (Passo 0)  →  Passo 1 (nome)  →  Passo 2 (relação + objetivo)  →  Passo 3 (email + telefone + GDPR)
```

`user_type` sai da UI mas a coluna `leads.user_type` permanece nullable (legado, sem migração).

## 1. `src/components/onboarding/onboarding-modal.tsx` — reescrita do shell

- `TOTAL_STEPS = 3` (era 5).
- Mapping interno: `Step 0` intro, `Step 1` nome, `Step 2` contexto (relação + objetivo no mesmo formulário), `Step 3` email/telefone/GDPR.
- `goNext` valida em Passo 2 ambos os campos (`profile_ownership`, `goal`, + `goal_other_text` se aplicável). Em Passo 3, valida `email`, `phone`, `gdpr_consent`, `honeypot`, e o `formStartedAt` (rejeita se <2s).
- Payload para `/api/onboarding/start` deixa de enviar `user_type` e `user_type_other_text`.
- Botão final: `t("onboarding.cta.final")` = "Gerar o meu relatório", ícone `Sparkles`.

## 2. Intro (Passo 0)

- Eyebrow: "VAIS ANALISAR" + chip `@handle`.
- Badge à direita: "Grátis" (substitui o asterisco vermelho/badge OBRIG. de tom alarmante).
- Título e subtítulo segundo o mockup. Trustline com operador ("Fomentar Sonhos, Lda.") em vez de repetir "~1 min".
- Bloco "2 créditos grátis · esta análise usa 1" com tom calmo.
- Lista a 3 itens (corta o 4º).

## 3. Passo 2 (contexto fundido)

- Dois grupos lado a lado (md: 2 colunas, mobile: empilhado).
- Grupo 1 "Que relação tens com @handle?" — 4 chips (own / client / brand / competitor).
  Reduz "Concorrência" para "Concorrente" e remove "Explorar" para eliminar sobreposição.
- Grupo 2 "O que mais te interessa perceber?" — 4 chips (improve_content / compare_competitors / grow_audience / validate_brand).
- Banda viva por baixo (`bg-primary/[0.04]`, ícone `Sparkles`) com microcopy **suavizada** (decisão do utilizador):
  > "Vamos usar isto para evoluir o produto e personalizar próximos relatórios."
  Texto é estático (não muda por seleção) — evita overpromise enquanto o report não ajusta enquadramento.

## 4. Passo 3 (email + telefone + GDPR)

- Label telefone: `Telemóvel — opcional` (sem asterisco). Hint: "Só usamos se o email falhar (raro)."
- GDPR consent: dois links distintos
  - "tratamento de dados" → `/aviso-legal`
  - "política de privacidade" → `/privacidade`
- Marker "(obrigatório)" em texto calmo `text-content-tertiary`, não badge rosa.
- Marketing consent fica como `(Opcional.)` inline, sem destaque.
- Honeypot field (`name="website"`, `tabIndex={-1}`, `aria-hidden`, posição `absolute -left-[9999px]`).
- Microcopy por baixo do CTA: "Vamos analisar @handle (~30s) · +2 créditos na tua conta".

## 5. Persistência (sessionStorage)

Novo hook `src/lib/leads/use-onboarding-draft.ts`:
- Chave: `onboarding_draft_v1` no `sessionStorage`.
- Persiste em cada mudança de campo (debounced 300ms).
- Hidrata defaults do `useForm` no mount se existir draft válido (Zod safeParse — se falhar, limpa).
- Limpa em sucesso do submit (após `onSuccess`).

## 6. Anti-bot (honeypot only — decisão do utilizador)

Em `src/routes/api/onboarding/start.ts`:
- Schema aceita `website: z.string().max(0).optional()` (qualquer valor preenchido falha).
- Schema aceita `_t: z.number().int().positive()` (timestamp do form start enviado pelo cliente).
- Validação: se `Date.now() - _t < 2000`, devolve `INVALID_PAYLOAD` (mensagem genérica, sem revelar a regra).
- Se honeypot preenchido, devolve `200 ok=true` com `lead_id` fake e `credits:0` (não escreve nada na DB) — drena bots silenciosamente.

## 7. Tracking de funil

Novo helper `src/lib/tracking/onboarding-events.ts` que insere em `product_events` via novo endpoint público `POST /api/public/onboarding-event` (TanStack server route, `supabaseAdmin`).

- Eventos: `onboarding_step_view`, `onboarding_step_complete`, `onboarding_abandon`, `onboarding_success`.
- Payload mínimo: `{ step: 0|1|2|3, handle, marketing_consent? }`. Sem PII.
- Disparo:
  - `step_view` quando `step` muda.
  - `step_complete` em `goNext` válido.
  - `abandon` em `onOpenChange(false)` antes de `step === 3` completo (usa `navigator.sendBeacon` para sobreviver à navegação).
  - `success` após resposta 200 de `/api/onboarding/start`.
- Endpoint sem assinatura — só aceita `event_type` do enum onboarding. Rate-limit simples por IP hash (max 60/min).

## 8. Copy i18n

Atualiza `src/i18n/locales/{pt,en}/gate.json` em `onboarding.*`:
- Remove `unlock.step3/4/5` headers reaproveitados.
- Adiciona `onboarding.steps.1/2/3.{eyebrow,title,subtitle}`.
- Adiciona `onboarding.context.relationshipQuestion`, `goalQuestion`, `consequenceLine`.
- Adiciona `onboarding.final.phoneLabel`, `phoneHint`, `gdprMandatoryMarker`, `marketingOptional`, `submitCta`, `microPostCta`.
- Remove copy "Última pergunta" e "OBRIG.".

## 9. Trust bar da homepage

Em `src/components/landing/` (o componente da hero trust bar — confirmar nome ao implementar):
- Substituir "SEM REGISTO NECESSÁRIO" por "CONTA GRÁTIS EM 1 MIN".
- Manter pt/en consistentes em `landing.json`.

## 10. Testes

- Atualizar `src/i18n/__tests__/onboarding-copy.test.ts` para nova estrutura de chaves.
- Novo `src/lib/leads/__tests__/use-onboarding-draft.test.ts` (hydrate/persist/clear).
- Novo `src/routes/api/__tests__/onboarding-start-honeypot.test.ts` cobrindo:
  - honeypot preenchido → drena (ok=true credits=0, sem insert).
  - submit <2s → INVALID_PAYLOAD.
  - submit válido sem `user_type` → 200 + credits=2.

## Fora de scope (confirmado)

Apify, OpenAI, report rendering, pricing, thumbnails, selector temporal, emails. Coluna `leads.user_type` mantida. Sem Turnstile. Sem alteração ao `report.example`.

## Checkpoint

- ☐ Modal redesenhado com 3 form steps + intro.
- ☐ Passo 2 com 2 grupos + linha de consequência suavizada.
- ☐ Bugs do antigo Step 5 corrigidos (asterisco, links GDPR, badge, CTA).
- ☐ Intro com prova de créditos + trustline operador.
- ☐ sessionStorage draft hook a hidratar/persistir/limpar.
- ☐ Honeypot + timing check no endpoint, drenagem silenciosa.
- ☐ 4 eventos de tracking via endpoint público + `sendBeacon`.
- ☐ Trust bar homepage corrigida.
- ☐ Testes verdes: i18n, draft hook, honeypot, fluxo completo.
- ☐ Validação manual: `/api/onboarding/start` continua a devolver 200 + `lead_session` + 2 créditos.
