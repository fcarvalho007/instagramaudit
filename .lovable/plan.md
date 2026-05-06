
# Refinamento visual dos gráficos P01 e P02

**Ficheiro a editar:** `src/components/report-redesign/v2/report-diagnostic-card.tsx`

Nenhum outro ficheiro é alterado. Nenhum dado, lógica, ordenação, percentagem ou copy é modificado.

---

## Task 1 — P01 `DiagnosticDistributionBar` (variant `vertical-list`)

Melhorias na lista vertical de barras horizontais:

1. **Hierarquia visual da barra dominante**
   - Barra dominante (i===0): altura `h-3`, opacidade plena, `font-semibold` na percentagem.
   - Restantes barras: altura `h-1.5`, opacidade `opacity-30`.

2. **Espaçamento entre linhas**
   - De `space-y-1.5 sm:space-y-2` para `space-y-2.5 sm:space-y-3` — mais ar entre categorias.

3. **Percentagens**
   - Dominante: `text-content-primary font-semibold` (em vez de `text-content-tertiary`).
   - Restantes: mantêm `text-content-tertiary`.

4. **Sublabels**
   - Já visíveis apenas em `sm:`. Reduzir para `text-[9px]` e `text-content-tertiary/70` para ficarem mais secundárias.

5. **Largura mínima para valores baixos**
   - Alterar `pct` para garantir um mínimo visual: `Math.max(3, pct)` — suficiente para que barras de 1-2% sejam visíveis sem parecerem equivalentes a 20%.

---

## Task 2 — P02 `DiagnosticFunnelStack`

Melhorias nas barras do funil:

1. **Altura das linhas**
   - De `h-7` para `h-8` — ligeiramente mais respiração.

2. **Dominância visual**
   - Fase activa: adicionar `ring-1 ring-signal-success/20` para destaque subtil.
   - Fases inactivas: manter aspecto actual.

3. **Coluna de percentagens**
   - Mover a `<span>` de percentagem para fora do `position: absolute` e usar um layout `flex` com a barra e o valor, evitando sobreposição com labels longos.
   - Estrutura: `<li class="flex items-center gap-2">` → barra (flex-1, max-width baseado em %) → percentagem (w-10, text-right).

4. **Estado 0% / ghost**
   - Quando `sharePct === 0`: barra com `w-0` mas linha mantém altura, percentagem mostra `0%` em `text-content-tertiary/50`, e a label aparece fora da barra (à esquerda).

5. **Espaçamento**
   - De `space-y-1.5` para `space-y-2`.

---

## Task 3 — Responsividade

- P01: `min-w-[4.5rem]` nos labels já funciona a 375px; manter.
- P02: o novo layout flex garante que label e percentagem não se sobrepõem a 375px (a barra encolhe, o texto fica fora).
- Verificação visual implícita pela estrutura flex; sem media queries adicionais.

---

## Task 4 — Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirmar que apenas `report-diagnostic-card.tsx` foi editado.
- Confirmar que P03-P07, backend, tokens globais e ficheiros locked não foram tocados.
