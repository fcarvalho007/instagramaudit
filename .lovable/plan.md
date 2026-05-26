## Plano — refinar Bloco 1 (Editorial Identity Card)

Ficheiro único: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`. Sem alteração de copy, i18n, lógica de veredito ou tokens globais. Apenas estrutura visual + espaçamentos do card de topo.

---

### 1. Separar índice do perfil ↔ análise editorial
A zona macro hoje encosta as duas colunas sem qualquer separação visual e o índice "flutua" sobre o mesmo fundo branco do veredito.

- Em desktop (≥ sm): adicionar uma **linha vertical** `border-r border-border-default` entre o `IndexBlock` e a coluna do veredito, dentro do padding existente. Largura da coluna do índice passa de `sm:w-[280px]` para `sm:w-[300px]` (+20px) e a coluna do veredito ganha `sm:pl-8` para respirar.
- Em mobile: a linha vertical não funciona; adicionar `border-b border-border-default pb-6 mb-6` ao `IndexBlock` para separar horizontalmente.
- O índice **não** ganha fundo distinto — mantém-se sobre o branco do card. A linha + o espaçamento são suficientes para criar a hierarquia "esquerda = quantitativo, direita = narrativa" sem partir o card em dois.

### 2. Aumentar e melhorar a régua de estágios
A régua atual é uma barra de 6 px com 4 segmentos colados; o "esta marca · 38" fica espremido.

- Trocar `w-1.5` por `w-2` na barra vertical e aumentar a altura mínima de `min-h-[104px]` para `min-h-[148px]`, dando ~37 px por estágio.
- Adicionar `gap-1` interno entre os 4 segmentos (via `rounded-full` em cada segmento e `bg-surface-muted` como track), para que o segmento ativo se leia como pílula e não como continuação.
- Estágios inativos: texto `text-[13px]` (atual `text-xs` = 12px é demasiado pequeno para 4 itens espaçados). Estágio ativo: `text-[14px] font-medium`.
- O ponteiro "▸ esta marca · 38" continua sob o label do estágio ativo, mas com `mt-1` e fundo subtil `bg-accent-primary/8 px-2 py-0.5 rounded-md` para destacar como "este perfil está aqui" sem competir com o número 38 do topo.

### 3. "Como foi calculado" — colapsável fixo no fundo
Hoje o `details` aparece a seguir à régua e empurra a estrutura. O utilizador quer-o mais pequeno e ancorado em baixo.

- Mudar o container do `IndexBlock` de `flex flex-col gap-5` para `flex flex-col gap-5 h-full`, e adicionar `mt-auto` ao `<details>` para o empurrar para o fundo da coluna (alinhado com o fim da paragrafo do veredito em desktop).
- Reduzir tamanho: `text-xs` → `text-[11px]` no summary, `py-2.5 px-3` (atual `py-3 px-3.5`), `chevron` de `h-3.5` → `h-3`.
- Manter o conteúdo expandido idêntico (texto de 12 px continua legível); apenas o trigger fica mais discreto.

### 4. Coluna "O que já funciona" / "O que limita o crescimento" — fundos suaves
Hoje têm border-left coloridas mas fundo branco que faz com que se misturem visualmente com o resto do card.

- **Sucesso**: trocar `bg-white border-l-2 border-signal-success` por `bg-signal-success/[0.06] border-l-2 border-signal-success`.
- **Aviso**: trocar `bg-white border-l-2 border-signal-warning` por `bg-signal-warning/[0.07] border-l-2 border-signal-warning`.
- Os tons em alpha são propositadamente baixos (~6-7%) para passarem o WCAG sobre o texto `content-primary` mantido em ~#0F172A e ficarem alinhados com o "Iconosquare-pure" do design system (sem hardcode de hex — usa os tokens semânticos).
- Adicionar `gap` visual: o `<div>` que envolve as 2 colunas troca `grid-cols-1 md:grid-cols-2` por `grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-default/60` e remove o `border-t md:border-t-0 md:border-l` redundante da coluna direita.
- Aumentar padding interno de `px-5 py-4 sm:px-6 sm:py-5` para `px-6 py-5 sm:px-7 sm:py-6` para dar mais ar.
- Bullets: `space-y-3` → `space-y-2.5` (mais compacto, com o fundo tinted a fazer agrupamento visual).

### 5. Ajustes finos de espaçamento (sem mexer em conteúdo)
- Zona macro: `gap-6 sm:gap-8` → `gap-6 sm:gap-10` para reforçar a separação entre as duas zonas (em conjunto com o border vertical).
- Título do veredito (`<h2>`): `space-y-3` do container passa para `space-y-3.5` para o título não colar ao eyebrow.
- Eyebrow de "VEREDITO" + badges: `flex-wrap gap-2` mantém-se; sem alterações.

---

### Out of scope
- Não toca em `MetricsStrip` (zona métrica gostos/comentários/ritmo) — utilizador não pediu.
- Não altera copy, fallback, ai_verdict, scoring nem ficheiros i18n.
- Não toca em `LOCKED_FILES.md`, tokens globais, nem em outros cards do report.

### Validação
- `bunx tsc --noEmit`
- Verificação visual em desktop e mobile (375px) confirmando: separação clara índice ↔ veredito; régua maior e legível; "Como foi calculado" pequeno e ancorado em baixo; bullets em fundo verde/laranja suave.

Aprovas?