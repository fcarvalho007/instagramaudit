## Objetivo

Aplicar dois refinamentos pendentes no hero da `/` e blindá-los para não voltarem a ser revertidos.

## Mudanças

### 1. `src/components/landing/hero-action-bar.tsx`
- **Caixa do input a branco** (destaque sobre o fundo navy):
  - `backgroundColor: "#FFFFFF"` (em vez de `var(--hero-glass-bg)`).
  - `borderColor: "rgba(15, 23, 42, 0.08)"` (navy a baixa opacidade).
  - Remover `backdrop-blur-xl` (deixa de fazer sentido sobre branco).
  - Sombra mais sóbria: `0 18px 40px -22px rgba(8, 14, 32, 0.45), 0 1px 0 rgba(15, 23, 42, 0.04) inset` (sem glow ciano).
- **Ícone `@`** em navy: `color: "rgb(var(--hero-bg-base))"`.
- **Input** com texto em navy (`text-[color:rgb(var(--hero-bg-base))]`) e placeholder em slate (`placeholder:text-slate-400` substituído por classe utilitária equivalente já existente; usar `placeholder:text-[#94A3B8]`).
- **Trust list**: remover o item `publicData`. Fica apenas `freeReports`. Check a ciano mantém-se.
- Manter a animação `hero-bar-breathe` (subtil, não interfere com a leitura).

### 2. `src/i18n/locales/pt/landing.json` e `.../en/landing.json`
- Remover a chave `actionBar.trustInline.publicData` em ambos os ficheiros (já não é referenciada).

### 3. Blindagem contra regressão

Para que estes refinamentos não sejam apagados em sessões futuras:

- **`LOCKED_FILES.md`** — adicionar entrada:
  - `src/components/landing/hero-action-bar.tsx` — "Caixa branca, trust list só com freeReports. Não reverter sem confirmação."
  - `src/styles/hero-dark.css` — "Hero homepage é dark ('Editorial Tech Noir'). Não converter para light."
- **`mem://design/hero-homepage`** (nova memória) com regras:
  - Hero da `/` é **dark navy**; caixa do input é **branca** com ícone navy e texto navy; trust list mostra **apenas** "Oferta de 2 relatórios grátis".
- **`mem://index.md`** — registar referência à nova memória na secção Memories.

## Fora de âmbito
- Restantes secções da homepage (já estão light, sem alterações).
- Tokens globais, `report-theme-wrapper`, `__root.tsx`.

## Validação

1. `bunx tsc --noEmit`.
2. Screenshot em 1366×900 e 390×844 para confirmar:
   - Caixa branca com bom contraste sobre o navy.
   - Apenas uma linha de trust ("Oferta de 2 relatórios grátis").
3. Verificar que `t("actionBar.trustInline.publicData")` já não aparece em nenhum lugar (`rg publicData src`).

## Checkpoint

- ☐ Caixa do `@` a branco (fundo, ícone navy, texto navy, placeholder slate).
- ☐ "Acesso apenas a dados públicos" removido (UI + i18n PT/EN).
- ☐ `LOCKED_FILES.md` atualizado com `hero-action-bar.tsx` + `hero-dark.css`.
- ☐ Nova memória `mem://design/hero-homepage` criada e indexada.
- ☐ `tsc` passa e screenshots confirmam o resultado.
