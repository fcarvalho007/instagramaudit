# Módulo de templates de email beta (pt-PT)

Cria um módulo reutilizável com **4 templates** transacionais pt-PT, cada um a expor `subject`, `text` e `html`. Sem envio, sem alterações ao provider — só código de templating + testes.

## Estrutura de ficheiros

```
src/lib/email/
├── shared.ts                    (novo) — helpers: escapeHtml, firstName, layout HTML, footer
├── templates/
│   ├── index.ts                 (novo) — exports + types
│   ├── request-received.ts      (novo) — Template 1
│   ├── report-ready.ts          (novo) — Template 2
│   ├── feedback-request.ts      (novo) — Template 3
│   └── commercial-followup.ts   (novo) — Template 4
└── __tests__/
    └── templates.test.ts        (novo) — testes vitest
```

`report-link-email-template.ts` e `report-email-template.ts` existentes ficam **intocados** (já estão em uso). O Template 2 (Relatório pronto) é uma versão paralela na nova API uniformizada — uma fase futura pode migrar `send-report-link.ts` para usar a nova; nesta tarefa não se mexe nesses call-sites.

## API uniforme

```ts
// shared.ts
export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface BaseTemplateInput {
  firstName?: string | null;
  email?: string | null;
  instagramHandle?: string | null;
  reportUrl?: string | null;
  feedbackUrl?: string | null;
  pricingOption?: string | null;
}

export type EmailTemplate<I extends BaseTemplateInput = BaseTemplateInput> =
  (input: I) => RenderedEmail;
```

Helpers em `shared.ts`:
- `escapeHtml(s)`
- `greeting(firstName)` → `"Olá {Nome},"` ou `"Olá,"`
- `wrapHtml({ title, bodyHtml })` → layout consistente (Inter sans, fundo `#f5f5f4`, card branco, header eyebrow `INSTABENCH`, footer simples). Reaproveita o estilo já usado em `report-link-email-template.ts` mas extraído como template-base.
- `renderButton({ label, url })` → bloco HTML do CTA
- `joinLines(lines: string[])` → helper para corpo `text`

## Templates

Subjects (fixos, sem variáveis para evitar quebrar threading):

| # | Nome | Subject | Inputs usados |
|---|---|---|---|
| 1 | `requestReceived` | "Recebemos o teu pedido beta do InstaBench" | `firstName`, `instagramHandle` |
| 2 | `reportReady` | "O teu relatório InstaBench já está pronto" | `firstName`, `instagramHandle`, `reportUrl` (obrigatório) |
| 3 | `feedbackRequest` | "Podes dar feedback ao teu relatório InstaBench?" | `firstName`, `instagramHandle`, `reportUrl?`, `feedbackUrl?` |
| 4 | `commercialFollowup` | "Próximo passo para analisar melhor o teu Instagram" | `firstName`, `instagramHandle?`, `pricingOption?`, `reportUrl?` |

### Conteúdo (resumo, tom pt-PT, sem hype, tu)

**1. Pedido recebido**
- «Recebemos o teu pedido para analisar **@{handle}**.»
- «Durante a fase beta, cada relatório é revisto manualmente antes de ser enviado.»
- «Vais receber um email assim que o relatório estiver pronto. Normalmente leva entre algumas horas e um dia útil.»
- «Obrigado pela paciência — esta validação manual permite-nos garantir qualidade enquanto refinamos o produto.»

**2. Relatório pronto**
- «A análise do perfil **@{handle}** já está disponível.»
- CTA: **"Abrir relatório"** → `reportUrl`
- Fallback URL em mono
- «É um relatório beta — pode evoluir nos próximos dias.»

**3. Pedido de feedback**
- «Notámos que já consultaste o relatório de **@{handle}** — obrigado.»
- «Gostaríamos de saber, em duas ou três frases, o que foi mais útil e o que falta melhorar.»
- CTA: **"Dar feedback"** → `feedbackUrl` (se presente); fallback: «Basta responder a este email.»
- «O teu input nesta fase pesa muito na direção do produto.»

**4. Follow-up comercial**
- «Esperamos que o relatório de **@{handle}** tenha sido útil.»
- «Se quiseres aprofundar — comparar com mais concorrentes, monitorizar evolução ao longo do tempo ou receber relatórios recorrentes — podemos preparar uma proposta adaptada ao teu caso.»
- Se `pricingOption`: «Vimos que mostraste interesse na opção **{pricingOption}** — fica à vontade para responder e marcamos uma conversa curta.»
- CTA suave: **"Falar connosco"** → `mailto:` para o email do remetente, OU se `reportUrl` presente, link para rever relatório.
- Fecho cordial, sem urgência fabricada.

## Validação de inputs

- Cada template recebe um input tipado e específico (não a interface base completa).
- `reportReady` exige `reportUrl` não-vazio; sem ele, lança `Error("reportUrl is required for reportReady")`.
- `feedbackRequest` aceita `feedbackUrl` opcional — se ausente, o corpo pede resposta direta ao email.
- `commercialFollowup` lida graciosamente com todos os campos opcionais.

## Testes (`templates.test.ts`)

Para cada template:
1. **Subject correto** (string fixa)
2. **`text` contém pontos-chave**: handle, URL quando aplicável, frase de assinatura
3. **`html` é HTML válido**: começa com `<!DOCTYPE html>`, contém `<html lang="pt-PT">`
4. **Escape de HTML**: passar `firstName: "<script>"` resulta em `&lt;script&gt;` no `html`, sem `<script>` literal
5. **Saudação fallback**: sem `firstName`, contém `Olá,`; com `firstName: "Maria Silva"`, contém `Olá Maria,` (primeiro nome apenas)
6. **`reportReady` falha sem `reportUrl`**
7. **`commercialFollowup` com e sem `pricingOption`**: a frase específica aparece/desaparece conforme

Total estimado: ~12-15 asserts em ~7-8 `it()` blocks.

## Sample rendered output (pré-visualização do plano)

**Template 1 — text:**
```
Olá Maria,

Recebemos o teu pedido para analisar @frederico.m.carvalho.

Durante a fase beta, cada relatório é revisto manualmente antes de
ser enviado. Vais receber um email assim que estiver pronto —
normalmente entre algumas horas e um dia útil.

Obrigado pela paciência.

—
InstaBench
```

(Os outros três seguem a mesma estrutura visual: saudação → 1-2 parágrafos → CTA opcional → fecho.)

## Constraints respeitados

- Sem envio
- Sem alterações ao provider Resend
- Sem alterações a `send-report-link.ts`, `send-report-email.ts`, geração de relatório, PDF ou UI pública
- Sem `você`, sem hype, sem promessas exageradas
- Tom pt-PT (Acordo Ortográfico): «direta», «ação», etc.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (deve ficar em 124 + ~8 novos = ~132 testes)

## Return ao concluir

- Lista dos 4 templates + subjects
- Render de exemplo (`text` completo) de pelo menos 2 templates
- Lista de ficheiros criados
- Resultado dos testes
