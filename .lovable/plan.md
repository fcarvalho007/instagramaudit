
## Refinamento do card de benchmark de engagement (Block 1)

### Ficheiros a editar
- `src/components/report-redesign/v2/report-overview-engagement.tsx`
- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

Nenhum outro ficheiro será tocado.

---

### 1. Remover pill de fonte do header (engagement.tsx, linhas 53-60)

Atualmente o header tem dois elementos à direita: `✦ MERCADO` e uma pill dinâmica com o nome da fonte (ex: "SOCIALINSIDER"). Remover a pill da fonte, manter apenas o badge `✦ MERCADO`.

```
Antes:  ✦ MERCADO  [SOCIALINSIDER]
Depois: ✦ MERCADO
```

As fontes continuam visíveis apenas no footer do chart (`Fontes: [1] Socialinsider · ...`).

### 2. Linha de referência vertical full-height (chart.tsx)

Atualmente a dashed line existe dentro de cada bar row individualmente (linha 136-141), repetida por tier. Problema: são linhas independentes por row e não criam uma linha visual contínua.

Alteração:
- Remover a dashed line de dentro do loop de cada row.
- Adicionar uma **linha vertical absoluta** ao container pai (`div.relative.flex.flex-col.gap-2`, linha 72) que corre do topo ao fundo de todo o bloco de rows.
- A linha será posicionada com `left` calculado relativamente à área dos bars (offset pelo espaço do label à esquerda e do valor à direita).
- Estilo: `w-px border-l border-dashed border-content-secondary/25`, `top-0 bottom-0`, `z-10`.
- O label "benchmark X,XX%" (linhas 74-83) permanece acima, com posicionamento alinhado à mesma margem.

Cálculo: a posição usa o mesmo `benchmarkPct` já existente, aplicado como `left: calc(${benchmarkPct}%)` dentro do wrapper que tem o mesmo offset que as bars.

### 3. Manter o destaque do tier ativo

Sem alterações — o highlight atual (border-accent-primary/30, bg-tint-primary, badge "O TEU ESCALÃO") já está correto e será preservado.

### 4. Melhorar legibilidade da bar ativa

Ajustes à lógica existente (linhas 143-177):

**Quando profile > benchmark** (já funciona): dois segmentos (azul + verde). Sem alteração.

**Quando profile < benchmark** (precisa de melhoria):
- O segmento azul renderiza até ao valor do perfil (já funciona).
- Garantir que o label externo (profilePctVal <= 12) aparece sempre, mesmo com valores muito baixos (ex: 0.08%).
- Acrescentar margem mínima para o label não ficar colado ao zero: `left: max(profilePctVal + 1, 3)%`.

**Quando profile = 0**: manter o comportamento actual (sem bar visível).

### 5. Design tokens

Todos os estilos usam tokens semânticos existentes. Não serão introduzidos hardcoded colors novos.

### 6. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- QA visual via browser screenshot
