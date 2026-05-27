## Estado atual

`bunx tsc --noEmit` passa. O que falta é coerência funcional: o modal foi renumerado para 5 passos, mas headers i18n ainda dizem "PASSO X DE 4" e `step2.title/subtitle` ainda descrevem a pergunta de perfil. Backend ainda não conhece `full_name/first_name/last_name/phone`. Tests de schema partidos (3 fails). Brevo, admin e personalização de email ainda não foram atualizados.

## Ficheiros a tocar

### 1. i18n — `src/i18n/locales/{pt,en}/gate.json`

- `unlock.step1`: eyebrow → "PASSO 1 DE 5" / "STEP 1 OF 5". Confirmar `fullNameLabel`/`fullNamePlaceholder` (já existem). Remover keys mortas `firstName*`/`lastName*`? **Manter** para evitar churn no JSON; só as keys ativas mudam.
- `unlock.step2`: eyebrow → "PASSO 2 DE 5". Mudar `title` para *"Onde te enviamos o relatório?"* (PT) / *"Where do we send the report?"* (EN). Mudar `subtitle` para *"Email para guardar o acesso. Telemóvel opcional para casos excecionais."* (EN equivalente). Manter `phoneLabel/Placeholder/Hint` (já existem).
- `unlock.step3`: eyebrow → "PASSO 3 DE 5". `title`/`subtitle` mudam para a pergunta de `profile_ownership` (texto que estava em `step2`).
- `unlock.step4`: eyebrow → "PASSO 4 DE 5". `title`/`subtitle` = pergunta de `goal` (texto que estava em `step3`).
- `unlock.step5`: eyebrow → "PASSO 5 DE 5". `title`/`subtitle` = pergunta de `user_type` (texto que estava em `step4`). Migrar `otherPlaceholder/Eyebrow` etc.

Sem outras alterações ao i18n.

### 2. Schema servidor — `src/lib/unlock.server.ts`

Estender `reportUnlockSchema` (mantém `.strict()`):

- `full_name: z.string().trim().min(2).max(120).optional()`
- `first_name: z.string().trim().min(1).max(60).optional()`
- `last_name: z.string().trim().min(1).max(120).optional()`
- `phone: z.string().trim().min(3).max(40).optional()`

Helper local `normalizePhone(raw): string | null` — colapsa whitespace, remove tudo menos dígitos e `+` inicial, devolve `null` se ficar vazio ou menor que 4 chars. Sem libphonenumber.

No INSERT do lead:
- `name`: prioridade `full_name` → `first_name + ' ' + last_name` → `name` legacy → `"Sem nome"`.
- `phone`: `data.phone ?? null`.
- `phone_normalized`: `normalizePhone(data.phone) ?? null`.

No UPDATE do lead existente: também preencher conservadoramente `phone`/`phone_normalized` (apenas quando estão NULL).

`recordProductEvent("unlock_completed", …)`: acrescentar `phone_provided: Boolean(data.phone)` em `metadata`. **Nunca** persistir telefone bruto no event.

Em `sendLeadMagnetSequence`: passar `firstName: data.first_name ?? parseFullName(data.full_name ?? data.name ?? "").first_name ?? null` em vez do `name` cru atual. Import lazy de `parseFullName` no topo do ficheiro.

### 3. Brevo — `src/lib/brevo/sync.server.ts`

Sob flag `BREVO_NAME_PHONE_ATTRS_ENABLED` (default OFF — atributos podem não existir na conta Brevo). Quando ON:

- Aumentar SELECT do lead para incluir `name, phone, phone_normalized`.
- Acrescentar ao payload: `FIRSTNAME: parsed.first_name || null`, `LASTNAME: parsed.last_name || null`, `SMS: lead.phone_normalized || null` (Brevo usa `SMS` para telefone com prefixo).
- Usar `parseFullName(lead.name)` para split.

Quando flag OFF: zero alteração comportamental.

Comentário no topo a documentar atributos manuais necessários: `FIRSTNAME` (text), `LASTNAME` (text), `SMS` (text com prefixo internacional).

### 4. Admin — visibilidade do telefone

- `src/lib/admin/kanban-columns.ts` → `EnrichedLead`: adicionar `phone: string | null`.
- `src/routes/api/admin/leads-kanban.ts` (`select("*")` já traz tudo): mapear `phone: lead.phone ?? null` no objeto enriquecido (linha 348-378).
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`: no header sticky, abaixo do link de email (linha ~422), renderizar `lead.phone &&` uma linha *"Telemóvel: <tel:>"* com `mailto:` substituído por `tel:` e label PT *"Telemóvel"*. Esconder quando vazio.
- Testes de filter-chips: já criam leads parciais com `Partial<EnrichedLead>`; adicionar `phone: null` no helper do test se o TS exigir; verificar no run.

Sem mudanças à tabela kanban (não polui colunas existentes).

### 5. Tests

- `src/lib/__tests__/unlock-flow.test.ts`: adicionar `full_name: "Ana Marques"` aos 3 casos válidos partidos. Acrescentar casos novos:
  - `full_name` vazio → fail.
  - `phone` ausente é aceite.
  - `phone: "+351 912 345 678"` é aceite.
- `src/lib/__tests__/unlock-schema.test.ts`: novos casos:
  - aceita `full_name`, `first_name`, `last_name`, `phone` opcionais.
  - rejeita `phone` < 3 chars.
- `src/lib/names/__tests__/parse-full-name.test.ts`: já existe, não toco.
- (Opcional, baixo custo) `src/lib/admin/__tests__/lead-filter-chips.test.ts`: adicionar `phone: null` ao factory `lead()` para satisfazer o tipo.

Não vou criar testes de integração com Brevo / unlock.server completos (fora do scope deste fix).

### 6. Validação

```
bunx tsc --noEmit
bunx vitest run src/lib/__tests__ src/lib/names src/lib/admin/__tests__
```

## Estrutura final do modal

1. Step 1 — Nome completo (`full_name`).
2. Step 2 — Email + Telemóvel (opcional) + GDPR + Marketing.
3. Step 3 — `profile_ownership`.
4. Step 4 — `goal` (+ other text).
5. Step 5 — `user_type` (+ other text).
6. Step 6 — Success.
"welcome-back" — atalho returning lead.

## Name parsing

Cliente parseia com `parseFullName(values.full_name)` antes de submeter (já no código). Servidor confia nos campos enviados; quando só vem `full_name`, re-parseia para gerar `first_name` para o email. `last_name` cai em null para nomes de um só token.

## Phone storage

- `leads.phone` = string original trimada (mantida para CRM).
- `leads.phone_normalized` = só `[0-9+]`, primeiro char pode ser `+`, restantes só dígitos. Útil para dedup/match futuro.
- `product_events.metadata.phone_provided` = boolean. Sem telefone bruto.

## Email personalization

`sendLeadMagnetSequence` passa a receber `firstName` derivado (não `name` completo). Templates atuais já interpolam `firstName`, portanto "Olá Ana," em vez de "Olá Ana Marques,".

## Decisão Brevo

Mapeamento `FIRSTNAME`/`LASTNAME`/`SMS` implementado **atrás de flag** `BREVO_NAME_PHONE_ATTRS_ENABLED=true`. Por defeito desligado para não falhar contas Brevo que não tenham esses atributos. Quando o utilizador estiver pronto, basta criar os atributos na conta Brevo (FIRSTNAME text, LASTNAME text, SMS text) e ligar a flag.

## Constraints respeitadas

Sem mexer em pricing, providers, report generation, premium gates, payments. Sem envios reais de email (fluxo de email só toca em `firstName` passado a `sendLeadMagnetSequence`).
