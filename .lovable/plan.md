## Auditoria

Restaurei o modal antigo (5 passos) só para resolver os erros TS. A infraestrutura do redesenho aprovado já está toda no projeto, **mas não está ligada**:

| Peça | Estado |
|---|---|
| `gate.json` PT/EN com copy de 3 passos (`onboarding.steps.1/2/3`, `compactOptions`, `cta`) | Pronto, **não usado** |
| `landing.json` trust bar "Conta grátis em 1 min" | Pronto |
| `src/lib/leads/use-onboarding-draft.ts` (sessionStorage debounced) | Pronto, **não usado** |
| `src/lib/tracking/onboarding-events.ts` (sendBeacon) + rota `/api/public/onboarding-event` | Pronto, **não usado** |
| `/api/onboarding/start` com honeypot + `_t` timing | Pronto, **não recebe os campos do modal** |
| `OnboardingModal` componente | Versão antiga de 5 passos restaurada do git |

Resultado: experiência atual ainda é a longa (6 ecrãs, incluindo `user_type`), sem persistência de rascunho, sem honeypot/anti-bot enviado, sem eventos de funil, e com copy a prometer "tom de consultor" que não é entregue.

## Plano: terminar o redesenho 3 passos

### 1. Reescrever `src/components/onboarding/onboarding-modal.tsx` (Intro + 3 passos)

- `TOTAL_STEPS = 3`. Estados: `0` (intro), `1` (nome), `2` (relação + objetivo), `3` (email + telemóvel + GDPR).
- Importar e ligar `useOnboardingDraft(form)` para persistir em `sessionStorage`; chamar `clear()` no `onSuccess`.
- Importar `trackOnboardingEvent` e disparar:
  - `onboarding_step_view` ao entrar em cada passo (incluindo 0);
  - `onboarding_step_complete` ao validar e avançar;
  - `onboarding_abandon` no `onOpenChange(false)` antes do sucesso (`sendBeacon`);
  - `onboarding_success` após `/api/onboarding/start` 200.
- Capturar `formStartedAt = Date.now()` no primeiro mount, enviar como `_t`.
- Honeypot: input `name="website"` invisível (`tabIndex={-1}`, `aria-hidden`, `autoComplete="off"`, `absolute -left-[9999px]`). Se preenchido, **não bloquear UX** — apenas envia; o servidor já drena.
- Submit final: validar todos os campos, parar se `Date.now() - formStartedAt < 2000` (mensagem genérica), e POST a `/api/onboarding/start` **sem `user_type`** (campo continua nullable na BD).
- Passo 2 mostra dois grupos lado-a-lado em ≥sm, empilhados em mobile:
  - "Que relação tens com @{{handle}}?" → 4 chips compactos (`compactOptions.profileOwnership`): `own_profile`, `client_profile`, `brand_profile`, `competitor_research`. Sem ícones pesados; chips Inter SemiBold.
  - "O que mais te interessa perceber?" → 4 chips (`compactOptions.goal`): `improve_content`, `benchmark_competitors`, `grow_audience`, `validate_brand`. Sem campo "Outro" no funil.
  - Linha de consequência: `onboarding.steps.2.consequenceLine` (copy já suavizada).
- Passo 3 reutiliza `Step5EmailPhone` (ou versão local equivalente) com label "Telemóvel — opcional", hint "Só usamos se o email falhar (raro)". Consentimento GDPR com dois links distintos (`/aviso-legal` e `/privacidade`).
- CTA final: `cta.final` ("Gerar o meu relatório") com ícone `Sparkles`.
- Botão "Voltar" mantém-se em todos os passos do form; no passo 1, volta ao intro.

### 2. Ajustes mínimos noutros ficheiros

- `src/lib/unlock-flow.ts`: **não** remover `user_type` do schema (mantém-se para o módulo `unlock-modal` legado e para `Step5EmailPhone` reutilizado). O modal novo simplesmente não envia. Sem migração de BD.
- `src/routes/api/onboarding/start.ts`: nada a mudar — já aceita `user_type` opcional.
- `src/i18n/__tests__/onboarding-copy.test.ts`: já valida `intro.handleContext`, `creditNote`, `freeValue`, `cta`. Adicionar 3 asserções:
  - `steps.1/2/3.eyebrow`, `title`, `subtitle` existem;
  - `steps.2.consequenceLine` **não** contém "consultor" nem "concorrentes" (proteção anti-overpromise);
  - `compactOptions.profileOwnership` e `compactOptions.goal` têm exatamente 4 entradas cada.

### 3. Verificações finais (sem alterar código)

- `bun run typecheck` limpa.
- Testes existentes (`onboarding-copy`, `unlock-flow`) verdes.
- Smoke manual no preview: abrir modal, navegar 0→3, fechar a meio (evento `abandon`), reabrir e confirmar hidratação do rascunho, submeter e confirmar redirect para `/analyze/$username`.

## Fora de âmbito (explicitamente)

- Apify, OpenAI, report, pricing, thumbnails, selector temporal, emails.
- `/report.example` e `unlock-modal` legado (continuam a usar o fluxo de 5 passos antigo se for chamado de outro sítio).
- Migrações de BD. `leads.user_type` permanece nullable, sem UI a preencher.
- Cloudflare Turnstile.
