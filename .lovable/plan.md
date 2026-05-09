## Contexto

O módulo `src/lib/email/` já está implementado, testado (10/10) e a passar `tsc`. Os 4 templates funcionam. Estes refinamentos elevam qualidade percebida na inbox e robustez sem mexer no provider, no schema, nem em emails de relatório existentes.

---

## Refinamentos

### R1 · Preheader / preview text (alto impacto inbox)

Atualmente os emails não têm preheader — a primeira linha que Gmail/Outlook/Apple Mail mostram **ao lado do subject** na lista de inbox cai em texto aleatório do header.

**Mudança:** estender `wrapHtml({ title, headline, bodyHtml, preheader })` com um bloco oculto logo a seguir a `<body>`:

```html
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:transparent;">
  {preheader}{ZWNJ × 100}
</div>
```

Cada renderer passa um preheader curto (≤ 90 chars), em pt-PT. Exemplos:
- requestReceived → "Vamos rever manualmente e enviamos assim que estiver pronto."
- reportReady → "Análise completa disponível para consultares."
- feedbackRequest → "Duas ou três frases chegam — ajuda-nos a melhorar."
- commercialFollowup → "Sem pressão. Respondemos quando fizer sentido para ti."

### R2 · `pricingOption` mapeado para rótulo legível

Hoje `commercialFollowup` recebe a string crua. O tracking guarda códigos (`single_3_eur`, `bundle_13_eur`, `monthly`, `agency`) — se o admin passar o código, sai literalmente "single_3_eur" no email.

**Mudança em `commercial-followup.ts`:** mapa interno opcional
```ts
const PRICING_LABELS: Record<string, string> = {
  single_3_eur: "Relatório único (€3 + IVA)",
  bundle_13_eur: "Bundle 5 relatórios (€13 + IVA)",
  monthly: "Plano mensal",
  agency: "Agência",
};
const pricingLabel = pricing ? (PRICING_LABELS[pricing] ?? pricing) : null;
```
Strings desconhecidas continuam a passar (backward-compat). Sem alteração de tipo público.

### R3 · `feedbackRequest` aceita `reportViewed?: boolean`

Hoje o copy assume sempre visualização: *"Notámos que já consultaste o relatório"*. Se admin enviar antes do `report_viewed` (o lead-detail-sheet já avisa), o email mente.

**Mudança:** novo input opcional `reportViewed?: boolean` (default `true` para não partir consumidores). Quando `false`, frase muda para:
> *"Quando tiveres oportunidade de consultar o relatório de @x, agradecíamos imenso o teu feedback."*

### R4 · Fallback de URL também no `feedbackRequest`

`reportReady` mostra a URL textual abaixo do botão (clientes que escondem botões funcionam). `feedbackRequest` não — se o `feedbackUrl` existe e o cliente esconde o CTA, o utilizador fica sem link.

**Mudança:** quando `feedbackUrl` está presente, adicionar `renderUrlFallbackHtml(feedbackUrl)` (mesmo padrão de `reportReady`). Texto plain também ganha a URL, que já tem.

### R5 · Sign-off mais cuidado + `From-name` hint

Atualmente o sign-off em `text` é apenas:
```
—
InstaBench
```

**Mudança:** acrescentar uma linha com nome próprio para soar a 1:1 (a marca é solo):
```
Obrigado,
Frederico — InstaBench
```
e `pMuted` equivalente no HTML. Aplica-se apenas aos 4 templates novos (não tocamos nos templates existentes do `report-email-template.ts`). Constante `SIGNATURE_NAME = "Frederico"` em `shared.ts`.

---

## Detalhes técnicos

- **Ficheiros tocados:**
  - `src/lib/email/shared.ts` — adicionar parâmetro `preheader`, constante `SIGNATURE_NAME`, helper `signatureBlock()` (text/html)
  - `src/lib/email/templates/request-received.ts` — preheader + sign-off
  - `src/lib/email/templates/report-ready.ts` — preheader + sign-off
  - `src/lib/email/templates/feedback-request.ts` — preheader + sign-off + R3 (`reportViewed`) + R4 (fallback)
  - `src/lib/email/templates/commercial-followup.ts` — preheader + sign-off + R2 (PRICING_LABELS)
  - `src/lib/email/__tests__/templates.test.ts` — adicionar testes:
    - preheader presente no html (oculto)
    - mapping `single_3_eur` → "Relatório único"
    - `reportViewed: false` muda copy
    - feedback fallback URL aparece em html

- **Sem mudanças de assinatura pública** que partam consumidores: todos os campos novos são `?` opcionais.
- **Sem tocar:** Resend, `send-report-email.ts`, edge functions, pipeline PDF, `/report.example`, schema.
- **Sem dependências novas.**

---

## Validação

- `bunx tsc --noEmit` limpo
- `bunx vitest run` — esperado 14/14 (10 atuais + 4 novos)
- Inspeção visual via `console.log(renderRequestReceived({...}).html)` (opcional, para confirmar preheader oculto)

---

## Não fazer agora (fora de scope)

- Wiring destes templates no `send-feedback-request.ts` ou em algum trigger comercial — pedir aprovação separada
- Adicionar `List-Unsubscribe` (responsabilidade do provider, não do template)
- Wrap a 78 chars no plain-text — boa prática RFC mas baixíssimo impacto prático

---

## Checkpoint

- ☐ `wrapHtml` aceita `preheader` e renderiza bloco oculto
- ☐ 4 templates passam preheader pt-PT específico
- ☐ `commercialFollowup` mapeia códigos `single_3_eur` / `bundle_13_eur` / `monthly` / `agency`
- ☐ `feedbackRequest` aceita `reportViewed?: boolean` com copy alternativo
- ☐ `feedbackRequest` mostra URL fallback quando há `feedbackUrl`
- ☐ Sign-off "Frederico — InstaBench" em todos os 4
- ☐ 4 testes adicionais
- ☐ `tsc --noEmit` limpo
- ☐ `vitest run` 14/14 verde