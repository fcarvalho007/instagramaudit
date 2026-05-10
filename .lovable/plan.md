## Âmbito

Redesign editorial completo do unlock modal seguindo os 5 mockups. Mantém toda a lógica server existente (lookup de lead, dedup de eventos, Brevo best-effort, lead-magnet sequence) e acrescenta:
- 5º step de confirmação visual
- 1 nova coluna no `leads` (marketing_consent)
- Novo `student` em `USER_TYPES`
- Footer DSA hardcoded com NIF mascarado

### Migration (única, mínima)

```sql
ALTER TABLE public.leads
  ADD COLUMN marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN marketing_consent_at timestamptz NULL;
```

Sem RLS adicional (tabela já é só admin/server). Sem mudanças em Brevo sync nesta iteração — fica disponível para sincronizar como atributo `MARKETING_OPT_IN` numa próxima task.

### Schema (parity client + server)

`src/lib/unlock-flow.ts` + `src/lib/unlock.server.ts`:
- `USER_TYPES` ganha `"student"`. Label pt-PT: "Estudante / Académico".
- `unlockFormSchema` ganha `marketing_consent: z.boolean().default(false).optional()`.
- `reportUnlockSchema` ganha `marketing_consent: z.boolean().optional()`.
- Texto livre do "outro" passa de 120 → **80 chars** (alinhar com mockup "0 / 80").
- Refinements existentes mantêm-se (gdpr_consent obrigatório, goal_other_text quando goal="other", user_type_other_text quando user_type="other").

### Server (`unlock.server.ts`)

- `processReportUnlock` persiste `marketing_consent` no insert do lead e em update conservador (só preenche se ainda `false`); regista `marketing_consent_at` quando `true`.
- Acrescenta `metadata.marketing_consent` no `report_request` para auditoria por unlock.
- Sem mudanças no event flow nem na lead-magnet sequence.

### UI redesign (`unlock-modal.tsx`)

Constantes editoriais (frontend, hardcoded):
```ts
const OPERATOR_INFO = {
  name: "DIGITALFC",
  city: "Lisboa, Portugal",
  nifMasked: "509XXXXXX",
};
const PREMIUM_SECTIONS = ["Conteúdo", "Procura", "Comparação"];
const FREE_SECTIONS = [
  { id: "overview", label: "Visão geral", state: "complete" },
  { id: "diagnosis", label: "Diagnóstico", state: "complete" },
  { id: "performance", label: "Desempenho", state: "partial", badge: "3/5" },
];
```

`TOTAL_STEPS = 5`. Progress bar de 5 segmentos:
- Container: `flex gap-1.5 h-1`
- Cada segmento: `flex-1 rounded-full bg-primary/10`; segmentos 1..currentStep ganham `bg-gradient-to-r from-primary to-secondary`.

#### Header partilhado (Steps 1–4)
```
PASSO N DE 5  [~1 MIN badge]
<Title H1 Fraunces com palavra-chave em itálico texto-secondary (azul-indigo)>
<Subtitle Inter content-secondary>
<Progress 5-segmentos>
```
Botão `✕` absoluto top-right (componente `DialogClose` do shadcn) — sempre visível.

#### Step 1 — Email + RGPD/DSA
- Title: `Desbloquear <em class="italic text-primary">3 secções</em> grátis`
- Subtitle: `Continuam premium: <strong>Conteúdo · Procura · Comparação</strong>. Acesso gratuito durante a beta.`
- Input email com check verde inline quando válido (já temos `form.formState.errors`; basta condicional `!error && value` → ícone `Check`).
- **Caixa cinzenta** (`bg-surface-muted/40 rounded-xl border border-border-default/40 p-4 space-y-3`) com 2 checkboxes:
  - **Obrigatória**: checkbox + texto "Aceito o tratamento dos meus dados para guardar e aceder a este relatório, e confirmo que li a política de privacidade." + badge `OBRIG.` (rosa pastel: `bg-pink-100 text-pink-700 text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded`). Links sublinhados para `/termos` e `/privacidade` (target=_blank).
  - **Divisor tracejado**: `border-t border-dashed border-border-default/50 my-1`.
  - **Opcional**: checkbox + "Quero receber análises e dicas de marketing digital por email" + nota cinza `(cancelas quando quiseres · ~1 email/semana)`.
- Footer DSA fora da caixa, abaixo do CTA: `<Lock className="size-3" /> Operador: <strong>DIGITALFC</strong> · Lisboa, Portugal · NIF 509XXXXXX · Sem spam.`

#### Step 2 — Profile ownership com ícones
- Title dinâmico: `Que relação tens com o perfil <em class="italic text-secondary">@${instagramUsername}</em>?`
- Subtitle: `Ajuda-nos a personalizar o tom da análise.`
- 5 opções (ordem do mockup), cada uma com ícone pastel `size-7 rounded-lg flex items-center justify-center`:
  | value | label | icon (lucide) | bg / fg |
  |---|---|---|---|
  | own_profile | É o meu perfil pessoal | `User` | `bg-blue-100 text-blue-600` |
  | brand_profile | É o perfil da minha marca | `Star` | `bg-purple-100 text-purple-600` |
  | client_profile | É o perfil de um cliente | `Briefcase` | `bg-emerald-100 text-emerald-600` |
  | competitor_research | Estou a observar concorrência | `Search` | `bg-amber-100 text-amber-700` |
  | curiosity | Estou só a cuscar / curiosidade | `HelpCircle` | `bg-pink-100 text-pink-600` |
- **Nova value**: `curiosity` adicionado ao tuple `PROFILE_OWNERSHIPS` (label antiga `competitor_research` muda para "Estou a observar concorrência" — alinhar com mockup).

#### Step 3 — Goal com "Outro" expansível in-place
- Title: `O que queres <em>tirar daqui</em>?`
- Subtitle: `Selecciona o objectivo principal. Ajuda-nos a destacar o que importa.`
- Quando `value === "other"`: a card cresce; mostra micro-eyebrow à direita `descreve em poucas palavras`, `<Input>` com placeholder `ex: investigação académica sobre IA criativa`, max 80 chars, contador `0 / 80` à direita do footer da card, hint à esquerda `opcional · ajuda-nos a melhorar`.
- Já temos a infra no `RadioCardField` (otherValue/otherText) — basta refinar layout.

#### Step 4 — User type em grid 2 colunas
- Title: `Como te <em>descreves</em>?`
- Subtitle: `Última pergunta antes de abrirmos o relatório.`
- Layout: `grid grid-cols-2 gap-2` para os 6 primeiros (creator, brand, agency, consultant, ecommerce, **student**), e o 7º `Outro` em `col-span-2`.
- "Outro" expansível in-place igual ao Step 3 (placeholder genérico).
- CTA muda de "Continuar" para **"Abrir relatório →"**.

#### Step 5 — Confirmação (substitui o `SuccessState` actual)
Header com gradiente verde:
```
<div class="-mx-6 -mt-7 px-6 pt-7 pb-5 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 relative overflow-hidden">
  <div class="absolute right-0 top-0 size-32 bg-emerald-200/30 blur-3xl" />
  <CheckCircle pulsante size-10 bg-emerald-500 text-white />
  <p class="text-eyebrow-sm text-emerald-700">CONFIRMADO · OBRIGADO {firstName ?? "—"}</p>
  <h1 class="font-display text-[28px]">3 secções <em class="italic text-emerald-600">desbloqueadas</em></h1>
  <p>O teu relatório está pronto. Eis o que tens acesso já:</p>
  <Progress5Bars all-emerald />
</div>
```

Lista "INCLUÍDO · ABERTO" (eyebrow + count à direita `3`):
- 3 linhas com `monospace` rank `01/02/03`, ícone Check ou Clock, label, badge "3/5" quando `state="partial"`.
- Cores: complete → `bg-emerald-50 border-emerald-200`; partial → `bg-amber-50 border-amber-200`.

Lista "PREMIUM · POR DESBLOQUEAR" (gradient âmbar `bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200/60 rounded-xl p-3`):
- 3 linhas com `Lock` icon + label em itálico Fraunces.

Pricing inline (visual only — confirmado pelo user):
```
<div class="grid grid-cols-2 gap-2">
  <Card>UMA VEZ · €3 +IVA · só esta análise</Card>
  <Card highlighted with star badge>BUNDLE 5 · €13 +IVA · 5 análises completas</Card>
</div>
```
Sem onClick (cards `aria-disabled`, `cursor-default`). Apenas regista `unlock_pricing_cta_seen` uma vez via `recordProductEvent` ao entrar no Step 5 (best-effort, dedup pelo `eventAlreadyEmitted` existente).

CTAs finais:
- **Primário preto**: `Ver relatório agora` → `onOpenChange(false)` + scroll para report (já existe).
- **Hint cinza** abaixo: `Podes desbloquear o premium quando quiseres a partir do relatório.`
- Manter link secundário `Criar conta com este email para aceder mais tarde` (necessário para retorno).

### Welcome-back (returning lead)
Mantém o estado actual mas usa o mesmo header verde do Step 5. Apenas troca títulos/CTAs. Sem regressão funcional.

### Out of scope
- Sem checkout. Sem chamadas à API de pagamento.
- Sem alterações ao `analyze.$username.tsx` (modal recebe os mesmos props).
- Sem alterações em `lead-magnet-sequence` nem Brevo sync (fica para próxima task expor `MARKETING_OPT_IN`).
- Sem mudanças à coluna `report_requests` (o consent fica em metadata por unlock).

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run` — actualizar `unlock-flow.test.ts` para `USER_TYPES.includes("student")`, `PROFILE_OWNERSHIPS.includes("curiosity")`, e novo refinement de marketing_consent.
- Smoke manual no preview: 5 steps com handle `frederico.m.carvalho`, testar GDPR vazio (bloqueia), "Outro" sem texto (erro inline), email inválido, e returning-lead path.

### Checkpoint

- ☐ Migration: leads.marketing_consent + marketing_consent_at
- ☐ Enums: USER_TYPES + "student", PROFILE_OWNERSHIPS + "curiosity", relabel "competitor_research"
- ☐ Schemas client+server: marketing_consent opcional, "outro" 80 chars
- ☐ Server persiste marketing_consent (lead + report_request metadata)
- ☐ Modal TOTAL_STEPS = 5, progress bar 5 segmentos com gradient
- ☐ Step 1: caixa RGPD com 2 checkboxes (OBRIG. badge + opcional) + footer DSA + check verde no email
- ☐ Step 2: 5 opções com ícones pastel + título dinâmico com handle
- ☐ Step 3: "Outro" expansível com placeholder concreto + 0/80
- ☐ Step 4: grid 2 colunas, "Outro" col-span-2, CTA "Abrir relatório →"
- ☐ Step 5: header verde + 2 listas (incluído/premium) + pricing visual + CTA preto
- ☐ Welcome-back ajustado ao novo header verde
- ☐ Tests + tsc verdes
