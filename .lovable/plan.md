## Objetivo

Eliminar a duplicação entre `DEFAULTS` no registry admin e os renderers reais em `src/lib/email/templates/*`. Passar a derivar as predefinições do editor a partir dos mesmos renderers usados em produção, mantendo overrides em DB e o fluxo de envio intactos.

## Diagnóstico

- `src/lib/admin/email-template-registry.ts` declara `DEFAULTS: Record<EmailTemplateKey, EmailTemplateParts>` (subject + preheader + headline + body_html + body_text por template) — esta é a cópia paralela.
- Os renderers reais (`renderRequestReceived`, `renderReportReady`, etc.) compõem `bodyHtml` localmente, chamam `wrapHtml`, e expõem só `{ subject, text, html }`. Não expõem `headline`, `preheader` ou `bodyHtml` pré-wrap.
- Quem consome `defaultParts`: `routes/api/admin/email-templates.$key.ts` (GET → `defaults`) → `template-editor.tsx` (`partsFromResponse`).
- Envio real: `renderWithOverride(key, vars, renderXxx)` em `template-overrides.server.ts`. Quando não há override, devolve `renderXxx()` intacto. As `defaultParts` do registry **não são usadas** no envio — só na pré-popularização do editor. É por isso que podem divergir silenciosamente.

## Abordagem

Adoptar o adaptador descrito no ponto 3 do pedido: cada template passa a expor explicitamente as suas *parts* internas (subject, preheader, headline, bodyHtml, bodyText) através de uma função pura `getXxxParts(vars)`. O `renderXxx` é refactorizado para compor `wrapHtml` a partir dessas parts — assim divergência fica estruturalmente impossível.

O registry deixa de declarar `DEFAULTS` e o endpoint `GET /api/admin/email-templates/$key` passa a chamar o adaptador com vars de placeholder (`{{firstName}}`, etc.) para gerar o estado inicial do editor.

## Mudanças

### 1. Refactor de cada template em `src/lib/email/templates/*`

Para cada um dos 7 ficheiros (`request-received.ts`, `report-ready.ts`, `feedback-request.ts`, `personal-area-saved.ts`, `welcome-beta.ts`, `report-summary.ts`, `commercial-followup.ts`):

- Extrair a construção de `bodyHtml` / `text` / `subject` para `getXxxParts(input): EmailTemplateParts` retornando `{ subject, preheader, headline, body_html, body_text }`.
- `renderXxx(input)` passa a chamar `getXxxParts(input)` e a aplicar `wrapHtml({ title: subject, headline, bodyHtml: body_html, preheader })`. Output `{ subject, text: body_text, html }` mantém-se exactamente igual ao actual.
- Exportar tanto `renderXxx` como `getXxxParts`.

Risco de divergência visual: zero — o HTML produzido por `renderXxx` é literalmente o `wrapHtml(getXxxParts(...))`.

### 2. Adaptador central

Novo ficheiro `src/lib/email/templates/default-parts.ts`:

```text
getTemplateDefaultParts(key, vars) -> EmailTemplateParts
```

Faz dispatch para o `getXxxParts` correcto e devolve as parts. Aceita vars com placeholders (`{{firstName}}`, etc.) para o caso "preview do editor sem override".

### 3. Registry sem `DEFAULTS`

Em `src/lib/admin/email-template-registry.ts`:

- Remover `const DEFAULTS` e o campo `defaultParts` de cada entrada.
- Remover `defaultParts` de `EmailTemplateEntry`.
- Manter `EmailTemplateParts` (continua a ser o contrato I/O do editor) — exportar como tipo partilhado.
- Restante (variables, render com SAMPLE, wired, wiredAt, wiredNote) inalterado.

### 4. Endpoint passa a chamar o adaptador

Em `src/routes/api/admin/email-templates.$key.ts`, o `GET` calcula:

```text
defaults = getTemplateDefaultParts(key, PLACEHOLDER_VARS)
```

Onde `PLACEHOLDER_VARS = { firstName: "{{firstName}}", instagramHandle: "{{instagramHandle}}", reportUrl: "{{reportUrl}}", ... }` — restitui o comportamento actual em que o admin vê placeholders no editor.

Para `report_summary` (que recebe `kpis` e `topPost` estruturados, não strings), o adaptador usa valores sample neutros (mesma estratégia que `EMAIL_TEMPLATES[].render` já usa) — não há placeholders úteis aqui porque o body não interpola esses campos como `{{var}}` (interpola-os como números formatados).

### 5. Editor — banner explicativo

Em `src/components/admin/v2/automacoes/template-editor.tsx`, na zona onde já existe o banner "Sem override", afinar copy para:

> "Sem override guardado — o editor mostra a versão de produção. Qualquer alteração que guardes passa a sobrepor-se ao fallback."

Sem mudanças de layout.

### 6. Tests

Actualizar `src/lib/email/__tests__/registry-parity.test.ts` (ou substituir):

- `getXxxParts(SAMPLE).subject === renderXxx(SAMPLE).subject` (continua a validar paridade, mas agora sobre a mesma função composta).
- `wrapHtml(getXxxParts(SAMPLE)).html === renderXxx(SAMPLE).html` — garante que o renderer e o adaptador não divergem.
- Para cada `EMAIL_TEMPLATES[k]`, confirmar `typeof getTemplateDefaultParts(key, PLACEHOLDER_VARS) === EmailTemplateParts` (sem `undefined`).
- `personal_area_saved`: `wired === false` e `wiredAt === null`.
- `request_received`: grep do call-site existente em `src/lib/beta.functions.ts` para confirmar que continua a usar `sendTransactionalEmail` (não Resend directo).

### 7. Fora de âmbito (não tocar)

- `template-overrides.server.ts` (override behaviour mantém-se exactamente igual).
- Triggers / call sites de envio.
- Schema DB e tabela `email_template_overrides`.
- Wiring de `personal_area_saved`.
- UI além do micro-copy do banner.

## Detalhes técnicos

- `EmailTemplateParts` movido (ou re-exportado) para `src/lib/email/templates/index.ts` para evitar import circular admin → email.
- `getXxxParts` é pura, sem I/O, testável isoladamente.
- `renderXxx.subject = FALLBACK_SUBJECT` (propriedade estática que alguns ficheiros têm) mantém-se.
- O `escapeHtml("{{instagramHandle}}")` devolve a string intacta (não tem caracteres reservados), por isso os placeholders sobrevivem ao caminho HTML.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`

## Checkpoint

- ☐ 7 templates refactored para `getXxxParts` + `renderXxx` composto sobre `wrapHtml`
- ☐ `getTemplateDefaultParts(key, vars)` criado e usado pelo endpoint `GET`
- ☐ `DEFAULTS` e `defaultParts` removidos do registry
- ☐ Editor consome `defaults` vindos do adaptador, sem cópia paralela
- ☐ Banner "Sem override" com copy explicativa
- ☐ Override path (parcial e completo) inalterado em runtime
- ☐ `personal_area_saved` continua `wired: false`
- ☐ `request_received` continua via `sendTransactionalEmail`
- ☐ Testes de paridade renderer ↔ parts a passar
- ☐ `tsc` e `vitest` limpos

Aprovas?
