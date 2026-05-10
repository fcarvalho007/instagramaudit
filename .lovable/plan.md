## Goal
Ligar o `UnlockModal` ao endpoint `POST /api/public/report-unlock` com fluxo progressivo de 5 passos, reutilizando o gate visual já existente.

## Current state
- `UnlockModal` só captura email e dispara `onUnlock` local.
- `analyze.$username.tsx` persiste unlock em `sessionStorage("ib_unlock_preview")` (sem backend).
- Endpoint `/api/public/report-unlock` já valida `email`, `instagram_username`, `analysis_snapshot_id` e os 4 campos qualitativos opcionais (`profile_ownership`, `goal`, `user_type`, `pricing_preference`). Devolve `{ success, lead_id, report_request_id, returning_lead, created_report_request }`.
- Enums já definidos em `src/lib/unlock.server.ts` — vamos espelhá-los num módulo client-safe.

## Architecture decisions
- **Sem partial save**: o endpoint atual é tudo-ou-nada (exige `email + instagram_username + analysis_snapshot_id`). Mantemos os 5 passos em estado local (`useState`/RHF) e fazemos **uma única chamada** no fim do passo 5. Coerente com "Save email step as soon as possible **if backend supports**; otherwise keep local".
- **react-hook-form + Zod**: o projeto já usa shadcn `Form` + RHF + zodResolver — reutilizar.
- **Marcador local de unlock**: passar a chave por snapshot — `ib_unlock:<snapshotId>` — em vez de flag global `ib_unlock_preview`. Evita que um snapshot desbloqueado destranque outro report no mesmo tab. Migração silenciosa (ler ambas no carregamento).
- **Returning lead UX**: o backend devolve `returning_lead: true` mesmo quando ainda faltam respostas. Não encurtamos o fluxo no cliente (não sabemos antes de submeter). Mostramos copy de "Bem-vindo de volta" no success state quando `returning_lead === true`.
- **Variante leve "email-first" deferida**: um endpoint `check-email` que encurte o flow para returning leads fica fora de scope (evita criar dependência nova de backend).

## UX flow
```text
Modal (Dialog, sm:max-w-md, mobile-first)
├── Header fixo: "Desbloquear relatório gratuito" + "Acesso gratuito durante a beta"
├── Progress: "Passo X de 5" + barra fina (bg-surface-muted → primary)
├── Step 1 — Email
│     Input email · CTA "Continuar"
│     Microcopy: "Sem spam. Usamos o email para guardar este report e enviar o acesso."
├── Step 2 — Profile ownership (radio cards grandes)
│     "Este perfil é teu?" → own_profile · brand_profile · client_profile
├── Step 3 — Goal
│     "Qual o teu objetivo?" → improve_content · benchmark_competitors ·
│     client_report · grow_audience · validate_brand · other
├── Step 4 — User type
│     "Como te descreves?" → creator · brand · agency · consultant · ecommerce · other
├── Step 5 — Pricing preference (radio + "outro" textarea curto)
│     "Quanto pagarias por um report mensal?" → free_only · under_10 ·
│     10_to_30 · 30_plus · not_sure
├── CTAs por passo: "Voltar" (ghost) + "Continuar" / "Desbloquear relatório" (primary)
├── Loading: botão com spinner, inputs disabled
├── Erro: Alert vermelho com mensagem + retry
└── Success state (substitui o form)
      ├── Novo lead   → "Relatório desbloqueado" + "Também guardámos este report
      │                 na tua área pessoal."
      ├── Returning   → "Bem-vindo de volta" + "Este report foi guardado na tua área."
      └── CTA "Ver relatório" fecha modal
```
"Demora cerca de 1 minuto" aparece como hint debaixo do título no Step 1.

## Data model (cliente)
Novo `src/lib/unlock-flow.ts` (client-safe):
- Re-exporta tuplos `PROFILE_OWNERSHIPS`, `GOALS`, `USER_TYPES`, `PRICING_PREFERENCES` (novo, ver abaixo).
- `unlockFormSchema` = Zod com email + 4 campos required (não opcionais — no cliente exigimos todos para passar do step 5).
- `LABELS` pt-PT por valor de enum (para os radio cards).

`PRICING_PREFERENCES` (novo, só cliente — backend aceita string livre ≤80):
`free_only | under_10 | 10_to_30 | 30_plus | not_sure`.

## Implementation phases
1. **Extrair enums para módulo client-safe** — criar `src/lib/unlock-flow.ts` com tuplos + labels + schema RHF. Importar tuplos a partir de `unlock.server.ts` é seguro? **Não**: ficheiros `*.server.ts` são bloqueados no bundle cliente. Duplicar os tuplos no novo ficheiro e adicionar teste que garante igualdade com o server (via re-import dentro do teste vitest, que corre em Node).
2. **Refazer `UnlockModal`** com state machine de 5 steps:
   - `useForm` com `defaultValues` + `mode: "onChange"`.
   - `step` em `useState<1|2|3|4|5|"success">`.
   - `submitting`, `serverError`, `result` (`{ returning_lead, lead_id }`).
   - Submit final: `fetch("/api/public/report-unlock", { method: "POST", body: JSON.stringify({...}) })`.
   - Reset ao fechar (apenas se ainda não desbloqueou).
3. **Componente `RadioCardGroup`** local ao modal (ou inline) — botões grandes, full-width, `min-h-12`, estado selected via token `border-primary` + `bg-primary/5`.
4. **Atualizar `analyze.$username.tsx`**:
   - Trocar chave para `ib_unlock:${snapshotId}` (ler legada como fallback).
   - Passar `snapshotId` + `instagramUsername` ao `UnlockModal`.
   - `onUnlock` recebe agora `{ leadId, returningLead }` — apenas para tracking opcional; unlock visual já é feito no modal antes do success state, mas marker local só grava após sucesso confirmado.
5. **Tests** (`src/components/product/unlock-modal.test.tsx`):
   - render step 1 → 2 → 5 com `userEvent`.
   - validação email.
   - submit final faz `fetch` mockado, mostra success state com copy correta consoante `returning_lead`.
   - erro 500 mostra Alert + permite retry.
   - Test de paridade dos enums client/server.
6. **Validação**: `bunx tsc --noEmit` + `bunx vitest run`. Manual: novo email completa flow → unlock; recarregar mantém unlock; reabrir noutro snapshot continua locked.

## Files to change
- `src/lib/unlock-flow.ts` (novo) — enums client + Zod schema + labels pt-PT.
- `src/components/product/unlock-modal.tsx` — reescrita completa (5 steps + submit + success).
- `src/routes/analyze.$username.tsx` — chave por snapshot, props extra ao modal.
- `src/components/product/unlock-modal.test.tsx` (novo) — cobertura do fluxo.
- `src/lib/unlock-flow.test.ts` (novo) — paridade de enums client vs server.

## Out of scope
Scoring, providers, envio de email, PDF, autenticação password, payments, encurtar fluxo para returning leads (precisaria endpoint novo).

## Risks
- **Sem encurtamento de flow** para returning leads → fricção desnecessária. Mitigação: copy clara + success state diferenciado. Endpoint `check-email` fica como follow-up.
- **Pricing preference** como string livre no backend pode acumular valores inconsistentes. Mitigação: enviar sempre os slugs do tuplo client; admin pode mais tarde migrar para enum.
- **Migração da chave sessionStorage** pode invalidar unlocks ativos de QA. Mitigação: ler chave legada como fallback durante esta fase.

## Checkpoints
☐ Modal abre no Step 1 e progride 1→5 com Voltar/Continuar funcionais  
☐ Step 5 dispara `POST /api/public/report-unlock` uma única vez  
☐ Success state mostra copy diferente para novo vs returning lead  
☐ `sessionStorage["ib_unlock:<snapshotId>"]` gravado só após `success: true`  
☐ Reload mantém unlock no mesmo snapshot; outro snapshot continua locked  
☐ Mobile 375px: sem overflow, tap targets ≥44px  
☐ `bunx tsc --noEmit` 0 erros · `bunx vitest run` verde

## Next implementation prompt
> Implementa o plano acima. Não alteres `unlock.server.ts` nem o endpoint. Cria `src/lib/unlock-flow.ts` com os tuplos duplicados + Zod + labels pt-PT, reescreve `UnlockModal` com state machine de 5 passos e RHF, atualiza `analyze.$username.tsx` para chave `ib_unlock:<snapshotId>` e adiciona testes de fluxo + paridade. Valida com `bunx tsc --noEmit` e `bunx vitest run`.
