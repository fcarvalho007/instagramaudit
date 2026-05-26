## Objetivo

Substituir o botão "Editar (em breve)" por um editor real que permite alterar **assunto, preheader, headline, corpo HTML e corpo texto** de cada um dos 7 templates de email beta. As alterações persistem em DB e passam a ser usadas em todos os envios reais, sem precisar de deploy.

## Princípio

- O código atual em `src/lib/email/templates/*.ts` continua a ser a **versão de fábrica** (fallback). Não é apagado.
- Em DB, uma nova tabela `email_template_overrides` guarda, por `template_key`, a versão editada pelo admin. Se existir override, é usada; caso contrário usa-se o default.
- O corpo aceita placeholders `{{firstName}}`, `{{instagramHandle}}`, `{{reportUrl}}`, `{{feedbackUrl}}`, `{{appUrl}}`, `{{checkoutUrl}}`, substituídos antes do envio.
- O layout exterior (`wrapHtml`) continua partilhado — o admin edita só o conteúdo, não o invólucro, para garantir consistência visual e que continua a renderizar bem em todos os clientes de email.

## Alterações

### 1. Base de dados (migração)

Nova tabela `public.email_template_overrides`:
- `template_key` text PK (corresponde a `EmailTemplateKey`)
- `subject` text nullable
- `preheader` text nullable
- `headline` text nullable
- `body_html` text nullable (conteúdo do cartão, sem `<html>` exterior)
- `body_text` text nullable
- `updated_at`, `updated_by_email`
- Trigger `set_updated_at`
- RLS ativo, sem políticas públicas (só acessível pelo service-role nas server functions admin)

Nova tabela `public.email_template_history` (auditoria simples):
- `id`, `template_key`, `snapshot` (jsonb com versão anterior), `changed_by_email`, `changed_at`
- Trigger em update/delete que insere snapshot do estado anterior.

### 2. Render com override

Novo módulo `src/lib/email/template-overrides.server.ts`:
- `loadOverride(key)` — lê de DB usando `supabaseAdmin`, cache curto in-memory (60s).
- `applyVariables(template, vars)` — substitui `{{var}}` no HTML/texto.
- `renderWithOverride(key, vars, fallbackRender)` — devolve `RenderedEmail`:
  - se há override com pelo menos `subject` definido, usa override para os campos preenchidos e default para os restantes;
  - aplica `wrapHtml` com `headline`, `preheader` e `body_html` finais;
  - se não há override, devolve `fallbackRender()`.

Atualizar os 7 call sites server-side (e.g. `send-welcome-beta.server.ts`, `send-report-summary.server.ts`, `send-personal-area-saved.server.ts`, `lead-magnet-sequence.server.ts`, `transactional-email.server.ts` para `request_received`/`report_ready`/`feedback_request`/`commercial_followup`) para passarem por `renderWithOverride(key, vars, () => renderX(input))` em vez de chamarem diretamente o `renderX`.

### 3. API admin (server functions / server routes)

Novo ficheiro `src/routes/api/admin/email-templates.ts` (servidor protegido por `requireAdmin` já existente no projeto):
- `GET /api/admin/email-templates` → lista das chaves com flag `hasOverride` e `updatedAt`.
- `GET /api/admin/email-templates/$key` → `{ default: { subject, preheader, headline, body_html, body_text }, override: same shape | null, variables: [...], samplePreview: RenderedEmail }`.
- `PUT /api/admin/email-templates/$key` body `{ subject?, preheader?, headline?, body_html?, body_text? }` → upsert + insere em `email_template_history`.
- `DELETE /api/admin/email-templates/$key` → repõe predefinido (apaga override + grava snapshot em history).
- `POST /api/admin/email-templates/$key/preview` body `{ subject, preheader, headline, body_html, body_text }` → renderiza com as variáveis SAMPLE e devolve `RenderedEmail` sem persistir.

### 4. UI em `/admin/automacoes` → tab Templates

`templates-tab.tsx`: trocar o botão desativado por `Link` para nova rota `/admin/automacoes/templates/$key`.

Nova rota `src/routes/admin.automacoes.templates.$key.tsx` (drawer/page no admin shell):
- **Coluna esquerda — formulário**:
  - Assunto (input)
  - Preheader (input, pequeno hint sobre o que é)
  - Headline (input)
  - Corpo HTML (textarea grande, monoespaçada)
  - Corpo texto (textarea, fallback texto puro)
  - Chips com as variáveis disponíveis (clicar copia `{{firstName}}` para a clipboard ou insere no campo focado)
  - Aviso quando se usa uma variável que não está na lista do template.
  - Ações: "Guardar alterações", "Pré-visualizar", "Repor predefinido" (com confirmação), link "Ver histórico".
- **Coluna direita — pré-visualização**:
  - Toggle HTML / Texto
  - iframe sandbox com `srcDoc` = HTML renderizado pelo endpoint de preview (com variáveis SAMPLE).
  - Mostra o `subject` final num cabeçalho tipo cliente de email.
- Estado salvo via `useMutation` (TanStack Query), toast em sucesso/erro, `invalidate` da lista.

Nova subpágina `/admin/automacoes/templates/$key/history` (modal ou rota) que lista as últimas alterações (data, autor, diff resumido) e permite ver snapshot anterior.

### 5. Registry

`email-template-registry.ts` fica como source-of-truth de metadados (título, categoria, variáveis disponíveis, wired). A função `render` deixa de ser usada diretamente em produção pelos call sites — passa a servir apenas o EmailLab/preview default. Acrescentar:
- `defaultParts(key)` → devolve `{ subject, preheader, headline, body_html, body_text }` extraídos a partir de render com SAMPLE (para popular o editor quando ainda não há override). Implementado caso a caso por template (precisamos de expor as partes; alternativa: incluir um campo `defaultParts` estático em cada entry do registry — preferível).

## Detalhes técnicos

- Sanitização: como apenas admins editam e o HTML é entregue dentro do nosso `wrapHtml`, não fazemos strip; mas removemos `<script>`/`<iframe>` por segurança simples antes de guardar.
- Variáveis desconhecidas (`{{xyz}}`) ficam literais — adicionar lint visual no editor.
- Os call sites continuam responsáveis por validar/inputs; nada muda nos triggers.
- `transactional-email.server.ts` e `send-*-beta.server.ts` passam a aceitar uma `templateKey` e chamar `renderWithOverride`.

## Fora de scope

- WYSIWYG visual (mantemos textarea HTML — rápido e suficiente para o teu uso).
- Versionamento per-canal (apenas EN/PT) — todos os templates são pt-PT.
- A/B testing.

## Checkpoints

- ☐ Migração `email_template_overrides` + `email_template_history` + trigger criada
- ☐ `template-overrides.server.ts` com cache + `applyVariables` + `renderWithOverride`
- ☐ Registry expõe `defaultParts` para os 7 templates
- ☐ 7 call sites passam por `renderWithOverride`
- ☐ Endpoints GET/PUT/DELETE/preview funcionais e protegidos por admin
- ☐ Rota `/admin/automacoes/templates/$key` com editor + preview ao vivo
- ☐ Botão "Editar" em `templates-tab.tsx` aponta para nova rota
- ☐ "Repor predefinido" apaga override e mantém histórico
- ☐ Histórico visível na UI
