
Refazer o modal de unlock público para ficar mais largo, mais claro e sem pricing. Sem mexer em backend, schema, Brevo, emails, payments ou cálculos.

## Ficheiros

- `src/components/product/unlock-modal.tsx` — todo o trabalho concentra-se aqui.
- `src/lib/unlock-flow.ts` — adicionar `first_name` e `last_name` opcionais no schema (validados client-side; combinados em `name` antes de enviar).
- (Opcional) `src/lib/__tests__/unlock-schema.test.ts` — actualizar se a parity-test partir.

Sem alterações de schema na BD: a tabela `leads` já tem coluna `name`, e o endpoint `/api/public/report-unlock` aceita `name` opcional. Combinamos `${first_name} ${last_name}` em `name` no payload.

## Schema (`src/lib/unlock-flow.ts`)

Adicionar:
```
first_name: z.string().trim().min(1, "Indica o teu primeiro nome").max(60),
last_name:  z.string().trim().min(1, "Indica o apelido").max(60),
```
Manter os restantes campos. Não alterar a obrigatoriedade do `gdpr_consent` nem o opcional `marketing_consent`.

## Modal — estrutura

Largura: `sm:max-w-[640px]` (era `480`). Mantém `max-h-[92vh]` e scroll. Mobile mantém-se full-width.

Total de passos: **4** (era 5). Barra de progresso passa a 4 segmentos. Sucesso = ecrã final, não conta como passo.

### Passo 1 — Como te tratamos?
- Eyebrow: `PASSO 1 DE 4` · badge `~1 MIN`
- Título: `Como te tratamos?` (sem itálico decorativo a meio para ficar limpo)
- Subtítulo: `Usamos estes dados para guardar o relatório e enviar o acesso por email.`
- Campos:
  - Linha 1 (grid 2 col em desktop, stacked em mobile): `Primeiro nome` · `Apelido`
  - Linha 2: `Email` (com check verde quando válido, igual ao actual)
- Bloco de consentimento (igual ao actual visualmente):
  - Obrigatório: `Aceito o tratamento dos meus dados para gerar e guardar este relatório, e li a política de privacidade.` (links para `/privacidade` mantidos)
  - Opcional: `Quero receber novidades e dicas sobre relatórios, análise de Instagram e marketing digital.`
- Linha de operador (DIGITALFC · Lisboa · NIF) mantém-se.

`goNext()` no passo 1 valida `["first_name","last_name","email","gdpr_consent"]` antes do `unlock-check`.

### Passo 2 — Que relação tens com este perfil?
- Eyebrow: `PASSO 2 DE 4`
- Título: `Que relação tens com este perfil?`
- Subtítulo: `Ajuda-nos a ajustar o tom da análise.`
- Opções (labels actualizadas em `PROFILE_OWNERSHIP_LABELS`):
  - own_profile → `É o meu perfil pessoal`
  - brand_profile → `É o perfil da minha marca`
  - client_profile → `É o perfil de um cliente`
  - competitor_research → `Estou a observar concorrência`
  - curiosity → `Estou só a explorar` (alterado de "Estou só a cuscar / curiosidade")

### Passo 3 — O que queres perceber?
- Eyebrow: `PASSO 3 DE 4`
- Título: `O que queres perceber?`
- Subtítulo: `Escolhe o que mais te interessa. Destacamos o que importa.`
- Labels em `GOAL_LABELS`:
  - improve_content → `Melhorar o conteúdo`
  - benchmark_competitors → `Comparar com concorrentes`
  - client_report → `Preparar uma análise para um cliente` (alterado)
  - grow_audience → `Crescer a audiência` (alterado)
  - validate_brand → `Validar a presença da marca`
  - other → `Outro` (campo livre opcional mantém-se)

### Passo 4 — Como te descreves?
- Eyebrow: `PASSO 4 DE 4`
- Título: `Como te descreves?`
- Subtítulo: `Última pergunta — depois abrimos o relatório.`
- Labels mantêm-se (`USER_TYPE_LABELS`).

CTA primário no passo 4: `Abrir relatório  →` (mantém-se).

### Welcome-back
Mantém-se inalterado funcionalmente; copy revista para `Já guardámos o teu relatório. Carrega para abrir.`

## Sucesso (passo final)

Substituir todo o `SuccessStep` atual:

- Header verde mais simples:
  - Ícone `CheckCircle2`
  - Eyebrow: `RELATÓRIO ASSOCIADO`
  - Título (display, serif): `Relatório desbloqueado`
  - Subtítulo: `O relatório ficou associado ao email indicado para poderes voltar a consultá-lo mais tarde.`
- Lista (3 linhas, ícone check verde):
  - `Visão geral desbloqueada`
  - `Diagnóstico desbloqueado`
  - `Desempenho desbloqueado`
- **Um único** botão primário, full-width: `Ver relatório gratuito agora` → `onClose()`
- Por baixo, em texto pequeno e centrado: `Este relatório foi associado diretamente à tua conta.`

Remove completamente:
- Secção "PREMIUM · POR DESBLOQUEAR"
- Cards de pricing €3 / €13 / Bundle
- Constantes `PREMIUM_SECTIONS` e `OPERATOR_INFO` no sucesso (operador continua no passo 1)
- CTA `Criar conta com este email…`
- Linha `Já tens conta? Entrar`
- Texto `Podes desbloquear o premium quando quiseres a partir do relatório.`
- Tracking `unlock_pricing_cta_seen` (já não há pricing no modal)

## Submissão

`handleFinalSubmit` passa a enviar também:
```
name: `${first_name} ${last_name}`.trim()
```
no payload para `/api/public/report-unlock`. Os outros campos mantêm-se. `submitMinimal` (welcome-back) não precisa enviar nome porque o lead já existe.

## Acessibilidade & design tokens

- `Label htmlFor` ligado a cada input.
- Erros usam `text-destructive`, `aria-invalid`.
- Sem hardcoded colors, sem `slate-*`.
- Reutilizar `bg-primary/…`, `border-border-default/…`, `text-content-*`, `bg-surface-muted/…`.
- Manter focus rings actuais.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (ajustar `unlock-schema.test.ts` se ficar fora de parity)
- Manual:
  - desktop: modal ~640px, respira;
  - mobile 375px: scroll ok, 1 col;
  - passo 1 mostra `Primeiro nome`, `Apelido`, `Email` + 2 checkboxes;
  - sem pricing visível em nenhum lado;
  - sucesso só com `Ver relatório gratuito agora` e a nota de associação;
  - unlock continua a funcionar (lead criado/actualizado);
  - sem erros na consola.

## Devoluções esperadas

- 4 passos visíveis + ecrã de sucesso;
- copy 100% pt-PT, sem "premium gate", "snapshot", "lead magnet";
- pricing removido do modal (mantém-se a possibilidade de existir noutro fluxo).
