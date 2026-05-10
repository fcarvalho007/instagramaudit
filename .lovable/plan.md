## Objetivo

Detetar leads recorrentes **passo-a-passo**, saltando apenas os passos cuja resposta já está em BD. Hoje só sabemos saltar tudo-ou-nada via `/api/public/lookup-lead` (booleano `has_qualification`).

## Decisão de endpoint

Criar **novo** `POST /api/public/unlock-check` (mais rico) e **manter** `/api/public/lookup-lead` por enquanto (não há outros consumidores além do modal, mas ficamos com fallback durante o roll-out). Numa segunda fase fica deprecated.

### Contrato

Request:
```json
{ "email": "ana@empresa.pt" }
```

Response (200, **shape constante** em todos os ramos para minimizar enumeration):
```json
{
  "exists": true,
  "knownFields": ["profile_ownership", "goal", "user_type"],
  "missingFields": [],
  "display": { "firstName": "Ana" }
}
```

Negative branch (não existe / inválido / rate-limited / erro):
```json
{ "exists": false, "knownFields": [], "missingFields": ["profile_ownership","goal","user_type"], "display": { "firstName": null } }
```

Notas técnicas:
- BD usa coluna `purpose`; o endpoint **traduz** `purpose` → `goal` para alinhar com o formulário (`unlock-flow.ts`).
- `firstName` derivado de `leads.name` (`split(" ")[0]`, max 40 chars, trim). Só presente quando `exists=true`. Nunca devolver email, handle, IDs, timestamps, status comercial, pricing, notas internas.
- Sem cache (`Cache-Control: no-store`), sempre `200 OK`.
- Rate-limit por IP-hash, **5 req / 60 s** (igual ao `lookup-lead`, com fallback negativo se exceder).
- Validação Zod `.strict()` no body.

## Privacidade — risco de enumeration

`exists: true` + `firstName` permite confirmar se um email está registado. Mitigação:

1. Endpoint não autenticado mas **rate-limited** + shape constante.
2. `firstName` opcional no payload — só é **usado no UI** quando o modal vai mostrar boas-vindas (i.e., qualificação completa). Se houver passos por responder, o modal usa copy **neutra** ("Já temos parte destes dados, faltam só X passos.") e não exibe nome.
3. Sem `lead_id` exposto.
4. Texto de erro sempre genérico.

Trade-off: a copy "Bem-vindo de volta" inerentemente revela existência ao próprio dono do email — aceitável (o utilizador é dono do email que digitou). O risco real é ataque automatizado, mitigado por rate-limit + shape constante.

## Mudanças no modal (`src/components/product/unlock-modal.tsx`)

1. Substituir chamada de `lookup-lead` → `unlock-check` após Step 1 (Email).
2. Guardar em estado: `knownFields: Set<Field>`, `firstName: string | null`, `returningLead: boolean`.
3. Lógica de navegação `goNext`:
   - Se step atual ∈ `knownFields`, saltar automaticamente para o próximo step não-conhecido.
   - Se já não há steps por responder → submeter via `submitMinimal` (já existe).
4. **Welcome state intermédio** (opcional, único ecrã antes do submit minimal):
   - Quando `returningLead && missingFields.length === 0`, mostrar copy editorial:
     > "Bem-vindo de volta{firstName ? `, ${firstName}` : ""}. Vamos guardar este report na tua área."
   - Botão "Continuar" → submitMinimal.
5. Quando há campos parciais conhecidos: copy neutra acima do próximo passo: "Faltam só {n} passos rápidos." (sem nome).
6. Fallback robusto: qualquer erro / timeout (4 s) do `unlock-check` → flow normal de 4 passos (comportamento atual já existe).
7. Pré-preencher `defaultValues` no `react-hook-form` com `knownFields` (mantém estado consistente caso utilizador volte atrás).

## Backend (`src/lib/unlock.server.ts`)

Sem alterações funcionais. O `submitMinimal` envia só email+snapshot+handle e o servidor já faz merge conservador (nunca regride). Reuso integral.

## Tracking

Adicionar a `tracking.functions.ts` (`ALLOWED_EVENTS`):
- `unlock_check_returning_lead` — disparado quando `exists=true`
- `unlock_check_skipped_steps` — metadata `{ skipped: ["profile_ownership", ...] }`

(Não bloqueante; dispara client-side via `trackEvent` existente.)

## Testes

Novo `src/lib/__tests__/unlock-check-endpoint.test.ts` (unit do schema/payload puros, sem fetch de rede):
- payload válido com lead completo → todos `knownFields`, `missingFields` vazio, `firstName` derivado
- lead com 1 campo (ex.: só `profile_ownership`) → `knownFields=["profile_ownership"]`, restantes em `missingFields`
- email inválido → shape negativa
- lead sem `name` → `firstName=null`
- lead inexistente → shape negativa

(Refatorar a derivação `leadRow → response` para função pura `buildUnlockCheckResponse(lead)` exportada do ficheiro do route, importável no teste.)

Manter `unlock-flow.test.ts` e `unlock-schema.test.ts` intocados.

## Ficheiros tocados

Criados:
- `src/routes/api/public/unlock-check.ts`
- `src/lib/__tests__/unlock-check-endpoint.test.ts`

Editados:
- `src/components/product/unlock-modal.tsx` (lookup → unlock-check, lógica per-field, welcome state)
- `src/lib/tracking.functions.ts` (2 eventos)

Não tocados:
- `src/lib/unlock.server.ts`
- `src/lib/unlock-flow.ts`
- `src/routes/api/public/lookup-lead.ts` (mantido como fallback, marca-se deprecated em comentário)
- BD (sem migração)

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual com 3 emails de teste:
  1. Email novo → 4 passos completos
  2. Email com qualificação completa → welcome state + submit imediato
  3. Email com 1 campo conhecido → modal salta esse step e pede só os restantes 2

## Pergunta antes de avançar

(A) Avançar com este plano tal como está — novo endpoint `unlock-check`, welcome state quando qualificação completa, lookup-lead mantido como fallback deprecated.

(B) Em vez de criar endpoint novo, **estender** `lookup-lead` adicionando `knownFields`/`missingFields`/`firstName` e renomear depois (menos ficheiros, mais churn no consumidor existente).

(C) Esconder `firstName` do payload e usar copy 100 % neutra ("Bem-vindo de volta" sem nome), eliminando qualquer leak de PII.