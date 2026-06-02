## Simplificar menu do header e corrigir ancoras

### Problema atual
- O menu tem 4 itens; o utilizador quer ~3 itens minimalistas.
- As ancoras `/#como-funciona` e `/#exemplos` estão quebradas — nenhuma secção da homepage tem esses `id`.
- "Exemplos" não tem destino válido.

### Alterações

1. **Simplificar navItems no `Header`** (`src/components/layout/header.tsx`):
   - Manter: **Analisar** → `/`
   - Manter: **Como funciona** → `/#como-funciona`
   - Remover: **Exemplos**
   - Manter: **Preços** → `/precos`

2. **Adicionar `id="como-funciona"`** à secção correspondente (`src/components/landing/dark/how-it-works-band.tsx`):
   - A secção `HowItWorksBand` tem o headline "Relatório em 3 passos." (chave `dark.how.headline`).
   - Adicionar `id="como-funciona"` ao `<section>` para que o scroll da âncora funcione.

3. **Desktop + mobile**: ambas as listas de navItems usam a mesma array, por isso a simplificação aplica-se automaticamente aos dois.

### Ficheiros a alterar
- `src/components/layout/header.tsx` — reduzir `navItems` de 4 para 3
- `src/components/landing/dark/how-it-works-band.tsx` — adicionar `id="como-funciona"` ao `<section>`

### Resultado esperado
- Menu limpo: Analisar | Como funciona | Preços
- Clicar em "Como funciona" faz scroll suave até à secção "Relatório em 3 passos." na homepage.
- "Preços" continua a navegar para `/precos`.
- "Exemplos" desaparece do menu.