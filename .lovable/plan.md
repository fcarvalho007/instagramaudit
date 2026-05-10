## Âmbito

Refinar o unlock modal com 5 mudanças concretas pedidas pelo utilizador. Tudo frontend + 1 ajuste mínimo ao schema (acrescenta valores enum, sem migration).

### Diagnóstico do "Não foi possível desbloquear agora"

Os 400 vistos em `preview--instagramaudit.lovable.app` (20:11 e 20:14 UTC) são `INVALID_PAYLOAD` retornados pelo `report-unlock` server route, mas o atual build de dev funciona — testei a mesma payload e devolveu 200. A causa mais provável é que o build estático do preview publicado está stale ou que o `serverError` genérico do modal mascara o motivo real (Zod issues nunca são mostrados ao utilizador). Solução: passar a expor o motivo via `metadata.reason` quando o backend devolve `issues`, e republicar após este patch para garantir que o build do preview fica alinhado.

### Fixes

#### 1. Checkbox GDPR no Passo 1
- Acrescenta checkbox **obrigatória** abaixo do email no `Step1Email`.
- Texto:
  > "Aceito que o meu email seja guardado para criar este relatório e receber atualizações ocasionais. Posso cancelar a qualquer momento."
- Link inline para `/privacidade` (target=_blank).
- Schema: `gdpr_consent: z.literal(true, { errorMap: () => ({ message: "Tens de aceitar para continuar" }) })`.
- Server: quando true, persiste `beta_consent = true, beta_consent_at = now()` no `leads` (colunas já existem). Para leads existentes, só atualiza se ainda for false.

#### 2. Barra de progresso mais visível
- Atual: `h-[2px] bg-primary/15` — quase invisível.
- Novo: `h-1.5 bg-primary/10 rounded-full` com fill `bg-primary` + transition suave. Alinhada com o padding do header. Mantém aria attributes.

#### 3. Campo livre quando "Outro" é selecionado (Passo 3 e Passo 4)
- Acrescenta `goal_other_text` e `user_type_other_text` (string opcional, max 120) ao `unlockFormSchema` e ao `reportUnlockSchema` no servidor.
- Refinement: se `goal === "other"`, exigir `goal_other_text.trim().length >= 2`. Idem para `user_type`.
- UI: dentro do `RadioCardField`, quando a opção selecionada tiver `value === "other"`, mostrar `<Input>` inline com placeholder "Conta-nos brevemente…" + contador subtil 0/120.
- Persistência: server grava em `report_requests.metadata.goal_other_text` e `metadata.user_type_other_text`. Sem nova coluna no `leads`.

#### 4. Nova opção em "Este perfil é teu?"
- Adicionar `competitor_research` ao tuple `PROFILE_OWNERSHIPS` em **dois sítios** (parity test exige):
  - `src/lib/unlock-flow.ts` (cliente)
  - `src/lib/unlock.server.ts` (server, mesmo tuple)
- Label pt-PT: **"Estou a ver concorrência ou a explorar"** (compromisso entre as duas hipóteses do utilizador; "cuscar" é demasiado coloquial para o tom editorial).
- Sem migration — `leads.profile_ownership` é text livre.
- Atualizar `enum-mappers.ts` se mapear este campo para Brevo (verificar; mapeamento provável: `competitor_research → 4` ou texto cru).
- Atualizar testes de parity (`unlock-flow.test.ts`).

#### 5. Surface de erro mais informativa
- Em vez de mensagem fixa, ler `data.error` + `data.issues` (Zod flatten) e mostrar o primeiro fieldError encontrado em pt-PT, com fallback genérico se vazio. Continua a fechar o modal só em sucesso.
- Mantém o evento `unlock_failed` (a criar) com `metadata.reason` e `metadata.fields_invalid` para o admin diagnosticar futuros 400.

### Out of scope (explicitamente)
- Sem migrations.
- Sem mudar `report_requests` schema.
- Sem mexer em Brevo customer-sync.
- Sem alterar `report.example`.
- Sem novos eventos para além de `unlock_failed`.

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run` (ajustar `unlock-flow.test.ts` para incluir o novo enum + testes do refinement "outro requer texto")
- Smoke manual: completar o flow com (a) `competitor_research`, (b) `other` sem texto → erro inline, (c) `other` com texto → sucesso, (d) checkbox GDPR desmarcada → botão Continuar bloqueado.

### Checkpoint

- ☐ Schema cliente + servidor: `gdpr_consent`, `goal_other_text`, `user_type_other_text`, `competitor_research`
- ☐ UI Step 1: checkbox GDPR obrigatória + link `/privacidade`
- ☐ Progress bar h-1.5 com fill animado
- ☐ Campo livre inline quando opção "other" selecionada (Passo 3 e 4)
- ☐ Nova opção "Estou a ver concorrência ou a explorar" no Passo 2
- ☐ Server persiste consent + free-text em metadata
- ☐ Erro do modal mostra motivo real (Zod issues)
- ☐ Tests + tsc verdes
