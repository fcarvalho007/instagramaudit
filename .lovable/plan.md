## Goal

Realinhar o `OnboardingModal` (purpose=`checkout`) aos dois mockups: passo 1 só email (mockup 2), passo 2 pergunta de qualificação isolada, passo 3 painel final 2-col com email pré-preenchido (mockup 1).

## Fluxo actual vs. desejado

Actual: `entry (email)` → `final (nome + email + qualificação + GDPR + marketing)` → `OTP`.
Desejado:
1. `entry` — só email. Visual igual à imagem 2 ("Cria conta e vê o relatório").
2. `qualification` (novo passo dedicado) — pergunta "Qual o contexto que melhor te descreve?" com as 6 opções já existentes (`LEAD_QUALIFICATIONS`). Botão "Continuar". Voltar ao passo 1.
3. `final` — painel 2-col (igual à imagem 1):
   - Esquerda navy: eyebrow "ÚLTIMO PASSO", título "O teu relatório fica a um clique", bullets ("Relatório de @handle" só quando `purpose=analyze`; em `checkout` usar bullet genérico já existente, "Conta privada com 2 créditos grátis", "Todos os relatórios futuros guardados").
   - Direita branco: Nome, Email (pré-preenchido, readOnly visual mas editável se clicar), Telemóvel (opcional, novo), checkbox GDPR (obrigatório), checkbox marketing (opcional), CTA "Gerar o meu relatório".

## Mudanças

### `src/components/onboarding/onboarding-modal.tsx`
- Acrescentar `View` `{ kind: "qualification"; email: string }` entre `entry` e `final`.
- `handleEntrySubmit` (novo email) passa a navegar para `qualification` em vez de `final`. Caminho OTP (email existente) permanece igual.
- Novo `QualificationStepBody` (componente local): título + subtítulo curtos, `Select` com `LEAD_QUALIFICATIONS`, botões Voltar / Continuar. Ao continuar guarda em `form.setValue("qualification", ...)` e avança para `final`.
- `FinalStepBody`:
  - Remover o `Select` de qualificação (já preenchida no passo 2).
  - Adicionar campo Telemóvel opcional (`form.register("phone")`, `inputMode="tel"`, `autoComplete="tel"`, placeholder "+351 …").
  - Email passa a aparecer com estado "preenchido" (mantém input editável + ícone check; label igual ao mockup).
  - Reordenar campos para Nome → Email → Telemóvel → consents.
  - Eyebrow esquerdo: usar "ÚLTIMO PASSO" via key `onboarding.final.left.eyebrow` (ajustar copy).
- `handleClose` step tracking: actualizar mapeamento `entry=0 / qualification=1 / final=2 / otp=3`.

### `src/lib/unlock-flow.ts`
- Adicionar campo opcional `phone: z.string().trim().max(40).optional()` no `unlockFormSchema`.
- Tornar `qualification` obrigatória client-side (manter `.optional()` no schema partilhado para legacy, mas passo 2 valida antes de avançar; já funciona assim hoje).

### `src/lib/leads/build-start-payload.ts`
- Acrescentar `phone?: string` ao `OnboardingStartPayload` e propagar quando `values.phone` não estiver vazio (`trim().length > 0`).
- Actualizar `__tests__/build-start-payload.test.ts`: substituir o teste "never includes phone" por "envia phone quando preenchido / omite quando vazio".

### `src/routes/api/onboarding/start.ts`
- Aceitar `phone: z.string().trim().max(40).optional()` no `PayloadSchema`.
- No upsert (`leads` insert/update) gravar `phone` quando presente. `phone_normalized` fica nulo (normalização fora de scope deste plano).
- Actualizar comentário do header ("Phone is no longer accepted" → "Phone optional").

### i18n `src/i18n/locales/{pt,en}/gate.json`
- Adicionar bloco `onboarding.qualification.{eyebrow,title,subtitle,placeholder,back,cta,error}`.
- Adicionar `onboarding.final.right.{phoneLabel,phonePlaceholder,phoneOptional}`.
- Ajustar `onboarding.final.left.eyebrow` para "Último passo" / "Last step" e `title` para os textos do mockup ("O teu relatório fica a um clique").
- Ajustar `onboarding.final.right.cta` para "Gerar o meu relatório" (PT) / "Generate my report" (EN).
- Bullet "report" no painel navy: já existe versão com `@handle`; manter para `purpose=analyze` e reutilizar `reportCheckout` para `purpose=checkout`.

### Tracking
- `trackOnboardingEvent` step indexes (`0..3`) revistos para reflectir 4 vistas: entry, qualification, final, otp. Sem mudança de nomes de eventos.

## Visual / styling (matching mockups)

- Passo 1 (entry): manter card actual mas reduzir saturação do realce primário, aumentar arredondamento (`rounded-2xl`), eyebrow "Novo por aqui" como pill sobre a borda, conforme mockup 2 (já próximo).
- Passo 3 (final): painel esquerdo navy puro (`bg-content-primary`), bullets com check cyan-300 finas, título Fraunces 28-32px. Direita: inputs com `h-12`, label 13.5px Inter medium, CTA `bg-primary` full-width, footer "RGPD · sem spam".

## Fora de scope

- Não alterar `/api/onboarding/check-email`, `claim-existing`, OTP, server-side credit grant.
- Não alterar fluxo `purpose=analyze` (continua a funcionar com nova ordem; qualification vira passo intermédio também).
- Não normalizar telefone, não validar formato (livre, opcional).
- Não mexer em `/precos`, `CheckoutAccountGate`, ou rotas de checkout.

## QA manual

1. `/precos` em incógnito → "Obter relatório completo" → modal abre no passo 1 (só email).
2. Submeter email novo → passo 2 (qualificação) → escolher opção → passo 3 (nome + email pré-preenchido + telemóvel opcional + GDPR) → submit → OTP → conta criada + 2 créditos.
3. Submeter email existente no passo 1 → vai directo para OTP (sem qualificação, comportamento legacy preservado).
4. Voltar no passo 2 mantém email; voltar no passo 3 mantém qualificação.
5. Telemóvel deixado em branco não falha; preenchido grava em `leads.phone`.
