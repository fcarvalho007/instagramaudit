
# Paleta · Resolver tensão cyan ↔ gold

## Diagnóstico

A tensão é real e está concentrada em **dois ficheiros**:

1. **`src/components/product/report-gate-modal.tsx`** (paywall)
   - Card "Compra pontual" usa `text-accent-luminous` (cyan, linha 335)
   - Card "Pro" ao lado usa `text-accent-gold`, `border-accent-gold`, `bg-accent-gold/5`, `shadow-glow-gold` (linhas 361–367)
   - O CTA "Ver plano Pro" dentro do card gold é `variant="primary"` (cyan) → **dupla colisão dentro do mesmo card**

2. **`src/components/product/post-analysis-conversion-layer.tsx`** (3 planos)
   - Card central "Pro" (linhas 149–181) inteiro em gold
   - CTA "Pedir acesso Pro" dentro do card gold é `variant="primary"` (cyan) → **mesma colisão**

Os outros usos de gold (`Badge variant="premium"`, `Button variant="premium"`) ficam em ecrãs onde não há CTA cyan adjacente, por isso não são problema imediato.

> Nota separada (não resolvido aqui): violet (`accent-violet*`) também coabita com cyan em vários ecrãs de landing/produto. É outra tensão de paleta que merece tratamento próprio numa próxima fase. Não está incluída neste plano.

## Regra a fixar

| Acento | Função | Quando aparece | Pode coexistir com |
|---|---|---|---|
| **Cyan** (`accent-primary` / `accent-luminous`) | Sistema | CTAs, links, focus rings, botões `variant="primary"`, ícones de interação | Tudo neutral (signal, surface, content) |
| **Gold** (`accent-gold`) | Sinal editorial premium | Selo "Pro", cards de upgrade, IA premium destacado | Apenas neutrais — **nunca** cyan no mesmo card |

Quando um card é gold, o CTA dentro dele tem de ser **`variant="premium"`** (que já existe e usa gold como acento e dourado dourado escuro como texto). O card gold passa a ser uma **ilha gold pura**.

Quando um card é cyan/sistema, segue o padrão actual (`variant="primary"`).

## Mudanças concretas

### 1) `report-gate-modal.tsx`

- **Linha 335** (card "Compra pontual"): `text-accent-luminous` → `text-content-secondary`. O ícone `FileText` é decorativo neutro; não precisa do cyan a competir com o gold do card vizinho. O cyan continua presente noutro sítio do modal (botões `variant="primary"`).
- **Linha 379–388** (CTA dentro do card Pro): `<Button variant="primary">` → `<Button variant="premium">`. Mantém o ar de destaque mas sem cyan a invadir o card gold.

### 2) `post-analysis-conversion-layer.tsx`

- **Linha 172–181** (CTA "Pedir acesso Pro"): `variant="primary"` → `variant="premium"`. Mesma lógica.

### 3) `Button` `variant="premium"` (sanity check)

A definição actual em `button.tsx` (linhas 49–54) usa `text-accent-gold`, fundo `surface-secondary`, borda gold, glow gold. Isto funciona como CTA gold-on-gold dentro de um card gold. Não precisa alterar — só validar visualmente que não fica demasiado "fantasma" sobre o fundo `bg-accent-gold/5` do card. Caso fique pouco contrastado, ajusto o background para `bg-accent-gold` (sólido) com `text-text-inverse` numa pequena tweak no `variant="premium"`.

### 4) Documentar a regra

- `mem://design/tokens` → adicionar a regra "Gold é ilha — nunca coexiste com cyan no mesmo card."
- `mem://index.md` Core → uma linha curta com a mesma regra.

## Não está no âmbito

- Repensar o uso de **violet** (terceira família de acento). Fica como follow-up explícito a discutir.
- Trocar tons de gold/cyan ou ajustar tokens em `tokens.css` / `tokens-light.css`.
- Mexer no light theme do `/report` (já é mono-azul Iconosquare e não tem gold).
- Tocar em `Badge variant="premium"` ou `Button variant="premium"` para além do possível tweak de contraste descrito acima.

## Validação

- [ ] `bunx tsc --noEmit` passa
- [ ] `bunx vitest run` passa (51/51)
- [ ] Inspeção visual no `report-gate-modal` (estado paywall) — cards lado a lado já não competem
- [ ] Inspeção visual em `post-analysis-conversion-layer` — card Pro é uma ilha gold coerente
- [ ] CTA "premium" continua legível sobre fundo `bg-accent-gold/5`
