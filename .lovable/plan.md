## Objetivo

Melhorar a validação inline do campo "URL de checkout" em `CommercialFollowupDialog`. Apenas UI — zero alterações ao backend, schema ou template.

## Ficheiro a alterar

`src/components/admin/v2/beta-leads/commercial-followup-dialog.tsx`

## Alterações

### 1. Mensagem de erro unificada (pt-PT)
Substituir as duas mensagens atuais (`"URL inválido"`, `"URL deve usar http:// ou https://"`) por uma única, clara:

> "Introduz um URL válido, começado por https://"

A regra continua a aceitar `http://` e `https://` (a mensagem promove https). Strings vazias permanecem válidas (sem erro, sem CTA).

### 2. Helper text quando campo vazio
Atualizar o texto auxiliar para preferir https:

- Vazio: "Opcional. Cola um URL https:// para ativar o botão "Desbloquear" no email."
- Com URL válido: "Email mostra botão "Desbloquear" com este URL." (mantido)
- Com erro: mostra a mensagem de erro

### 3. Estado desativado do botão de envio
Adicionar `title` ao `Button` quando `checkoutError` é truthy:

> "Corrige o URL de checkout antes de enviar."

(Apenas se `loading` for false; durante loading mantém-se sem title.)

### 4. Acessibilidade
- Adicionar `id="commercial-followup-checkout-help"` ao `<p>` do helper.
- Adicionar `aria-describedby="commercial-followup-checkout-help"` ao `<Input>`.
- `aria-invalid` já existente — manter.
- Quando há erro, mudar a cor do helper para `text-admin-signal-danger` (ou token equivalente já em uso na admin); confirmar token disponível antes (fallback: `text-red-600` é proibido pela memória → usar token semântico admin).

### 5. Comportamento de preview (manter intacto)
- Empty → `checkoutUrl: null` no template → sem CTA "Desbloquear".
- Válido → CTA visível.
- Inválido → tratado como `null` (já é o comportamento atual via `checkoutError ? null : checkoutUrl`).

## Validação

```
bunx tsc --noEmit
bunx vitest run
```

Manual:
- Campo vazio: botão "Enviar follow-up" ativo, preview sem CTA.
- `not-a-url`: erro inline em pt-PT, botão desativado com tooltip.
- `https://instabench.app/checkout/abc`: sem erro, preview mostra CTA, botão ativo.
- `ftp://x.com`: erro inline (protocolo bloqueado), botão desativado.

## Riscos

- Token de cor para erro: verificar `text-admin-signal-danger` ou equivalente em `tokens.css`/admin tokens; se não existir, usar `text-admin-text-primary` com peso `font-medium` para destacar (sem violar a regra de tokens).
- Nenhum teste atual cobre este componente — não são adicionados testes novos (fora do scope: "UI only").
