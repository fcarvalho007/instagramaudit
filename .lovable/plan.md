## Âmbito

Apenas a **primeira secção** do `EditorialIdentityCard` — o `IndexBlock` (header esquerdo do card). Tudo o resto fica intacto: VEREDICTO + título + parágrafo, evidência, warnings, `MetricsStrip` (média de gostos / comentários / ritmo) e as duas colunas accionáveis (strengths / limits).

Ficheiro tocado: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`.

---

## O que muda

### 1. Layout — empilhado, sem coluna lateral

- O contentor `Zona macro` (linha 439) deixa de ser `flex-row` com `IndexBlock` ao lado do veredicto e passa a empilhar:
  - **Linha 1** (full-width): novo `IndexHeroRow` — herói + régua + chip de veredicto.
  - **Linha 2** (full-width): bloco editorial (eyebrow VEREDICTO + badge banda + título + parágrafo + evidência + warnings), agora a respirar à largura total.
- Remover o `sm:pl-8 sm:border-l sm:border-border-default` da coluna direita — deixa de existir divisor vertical.
- Remover o `sm:w-[300px]` e o `border-b` mobile do `IndexBlock`. Espaçamento interno do card mantém-se (`px-6 py-7 sm:px-7 sm:py-8`).

### 2. `IndexHeroRow` — nova composição

Substitui o conteúdo actual do `IndexBlock`. Estrutura visual:

```text
ÍNDICE DO PERFIL ⓘ    ↘ 2,3 pp abaixo do envolvimento típico do escalão     [Precisa de trabalho]
─────────────────────────────────────────────────────────────────────────────────────────────────
                                                              ┌─ esta marca
 31  /100             ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      0                                                                       100
```

Especificações:

- **Eyebrow** `ÍNDICE DO PERFIL` (token `text-eyebrow-sm`) seguido de ícone `Info` (`size-3.5`) — botão acessível que abre o popover de metodologia.
- **Linha de delta** à direita do eyebrow, mesma linha:
  - Seta `ArrowDownRight` ou `ArrowUpRight` consoante o sinal, cor `signal-warning` / `signal-success` / `content-tertiary` (`aligned` quando `|Δ| < 0.5 pp`).
  - Texto: `<strong>2,3 pp abaixo</strong> do envolvimento típico do escalão` (i18n; quando não há benchmark, esconde a linha e mostra apenas o microtexto existente).
  - Chip do veredicto (`bandBadgeClass(band)` + `bandLabel(band, t)`) no extremo direito da mesma linha, com `Leitura provisória` colado quando aplicável (chip pequeno, igual ao actual).
- **Número herói**: `font-display`, `text-[5.5rem]` (~88px) em mobile a 1.25rem mais pequeno (`text-[4.5rem]`), `font-bold`, `tabular-nums`, `leading-none`, `tracking-[-0.03em]`. Sobe para a posição superior-esquerda.
- **`/100`**: `text-[0.95rem]`, `text-content-tertiary`, `tabular-nums`, alinhado pelo baseline do número (`items-baseline`). Funciona como subscrita.
- **Régua 0–100**: ocupa todo o restante da linha (`flex-1`).
  - Trilho: barra `h-1.5 rounded-full bg-surface-muted` com gradiente subtil de `accent-primary/15 → accent-primary/35` da posição 0 à posição do pin (não passa do pin).
  - Marcador **esta marca**: pin sólido (círculo `h-3.5 w-3.5 bg-accent-primary ring-2 ring-white shadow`) com pequeno label flutuante acima (`esta marca` em chip `bg-accent-primary/10 text-accent-primary text-[11px]`).
  - Marcador **mediana**: linha fina vertical (`h-4 w-px bg-content-tertiary`) sem label visível; tooltip nativo `title="mediana · {valor}"`.
  - Endpoints `0` e `100` em `text-[11px] text-content-tertiary` por baixo do trilho.
  - `role="img"` + `aria-label` descritivo com ambos os valores.
- Régua não renderiza quando `!hasValue` — em vez disso mostra a mensagem actual de "sem dados suficientes".

### 3. Popover de metodologia

- Substitui o `<details>` `Como foi calculado` (linhas 761–808). Mesmo conteúdo (`identity.method.*`), nova superfície:
  - Usa `Popover` / `PopoverTrigger` / `PopoverContent` de `@/components/ui/popover` (já existente no projecto — verificar; se não, alternativa `HoverCard`).
  - Trigger é o ícone `Info` no eyebrow. `aria-label="Como foi calculado o índice"`.
  - Conteúdo: mesmo `signals_line`, `benchmark_line`, `sampleParts.join(" · ")`, `disclaimer` — sem alterações de copy.
  - `align="start"`, `side="bottom"`, `className="max-w-sm text-[13px] leading-snug space-y-2"`.

### 4. Tokens / estilos

- Tudo com tokens existentes (`content-primary/secondary/tertiary`, `accent-primary`, `signal-warning/success`, `surface-muted`, `border-default`). Sem hex novos.
- Tipografia respeita as regras: Fraunces (`font-display`) só no número herói; resto fica em Inter (`text-eyebrow-sm`, body, chip).

### 5. O que NÃO muda

- Cálculo de `overall` (`computeOverall`) — permanece.
- `MetricsStrip` (gostos / comentários / ritmo) — permanece logo abaixo, sem alteração.
- `BulletColumn` (O que já funciona / O que limita) — permanece.
- Veredicto (título + parágrafo + evidência + warnings) — mesmo texto, só muda o sítio (passa a respirar à largura total).
- `analyze.$username.tsx`, fluxo de lock, schema, copy do veredicto.

---

## Decisão de produto a confirmar (1 ponto)

A régua precisa de um valor de **mediana 0–100** para colocar o segundo marcador. O sistema actual não calcula isso — só temos a `engagementBenchmarkPct` (em pp). Três alternativas, ordenadas por preferência editorial:

1. **Mediana derivada do delta** — assumir mediana = `clamp(overall - deltaIndex, 0, 100)`, onde `deltaIndex` é a tradução do delta pp para a escala do índice (proporcional ao peso do envolvimento, 45%). Honesto e auto-corrige sem nova fonte.
2. **Mediana fixa 50** — neutra, mas pode parecer arbitrária quando o índice está perto de 50.
3. **Esconder a mediana** — régua só com o pin "esta marca". Mais conservador; perde-se o comparativo visual.

Vou avançar com a **opção 1** salvo indicação contrária, e deixar o cálculo isolado numa helper `medianIndexFromBenchmark(...)` para trocar facilmente quando houver mediana real do escalão.

---

## Validação

- `bunx tsc --noEmit`
- Inspecção manual em `/analyze/frederico.m.carvalho` (3 estados de unlock continuam OK).
- Verificar viewport 375px: herói não estoura, régua mantém-se legível (chip "esta marca" pode esconder-se em mobile e ficar só o pin com `aria-label`).
- Verificar caso sem benchmark (esconder linha de delta e marcador mediana).
- Verificar caso `!hasValue` (mostrar mensagem de fallback existente, sem régua).
