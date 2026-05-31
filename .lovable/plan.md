## Âmbito

Três ajustes no Bloco 1 (`src/components/report-redesign/v2/overview/editorial-identity-card.tsx`).

---

### 1. Tipografia uniforme a 17px

Atualmente o bloco mistura `text-[13px]`, `text-sm`, `text-xs` e `text-[17px]`. Os eyebrows (`text-eyebrow-sm` — 12px maiúsculas) ficam como estão, porque são uma categoria de label, não corpo de texto.

Corpo de texto → todos a 17px / `leading-[1.65]`:

- **Linha delta** "2,3 pp abaixo do envolvimento típico…" (linha 744): `text-[13px]` → `text-[17px] leading-[1.6]`. Removo `truncate` e `min-w-0 flex-1` no mobile para deixar partir em 2 linhas em vez de cortar com "…".
- **Microline fallback** (sem benchmark, linha 759): igual, 17px.
- **Evidence bullets** "Sinais usados nesta leitura" (linha 491): `text-sm` → `text-[17px] leading-[1.65]`; dot sobe para `mt-[10px]`.
- **Warnings / low_confidence** (linhas 507, 527): `text-xs` → `text-[15px] leading-[1.55]`. (17px ficaria pesado para metadata de rodapé; 15px é o teto razoável e fica visivelmente do mesmo "peso" que o resto sem dominar.)
- **MetricsStrip** unit "por post" / "posts/semana" (linha 1044): `text-[14px] sm:text-[15px]` → `text-[15px]` constante.
- **MetricsStrip** subtitle "0,09% dos seguidores", "baixa conversa", "ritmo saudável" (linha 1046): `text-[13px] leading-snug` → `text-[15px] leading-[1.5]`.

(Os bullets das colunas strengths/limits já estão a 17px.)

### 2. Remover chips "Veredicto", "Leitura provisória", "Precisa de trabalho"

- **Linhas 452–470** — apagar o `div` inteiro com o eyebrow `VEREDICTO` + chip `Leitura provisória`. O título editorial passa a ser a primeira coisa abaixo do herói/régua.
- **Linhas 767–777** — apagar o `span` chip que renderiza `bandBadgeClassName` (o "PRECISA DE TRABALHO" cor-de-mostarda na linha 1 do IndexBlock). O sinal de banda continua presente implícito na cor da régua/delta.

O `aria-label` da régua continua a comunicar o veredicto a screen readers via `band` no `data-band` do hero number — adiciono `data-band={band}` no wrapper do número para preservar essa informação semântica. (`bandBadgeClass`, `bandLabel`, `isProvisional` deixam de ser usados; removo imports/props mortos e simplifico assinatura do `IndexBlock`.)

### 3. Redesign do MetricsStrip (Gostos / Comentários / Ritmo)

Objetivo: mais respiração, hierarquia clara número→contexto, e um signal pill discreto para o subtítulo qualitativo.

```text
┌──────────────────────────────────────────────────┐
│ [♥]  GOSTOS · MÉDIA                              │
│                                                  │
│  8,9  por post                                   │
│                                                  │
│  0,09% dos seguidores                            │
└──────────────────────────────────────────────────┘
```

Mudanças concretas em `MetricsStrip` (linhas 1023–1051):

- Ícone passa para chip 28×28 com fundo `bg-accent-primary/10`, ícone `text-accent-primary h-3.5 w-3.5`. Eyebrow continua à direita do chip.
- Padding sobe: `px-5 py-5 sm:px-6 sm:py-6` (era `px-4 py-3.5 sm:px-6 sm:py-5`).
- Número: `text-[2rem] sm:text-[2.25rem] font-semibold tabular-nums leading-none text-content-primary` (era `1.5rem/1.75rem/1.625rem` — desktop ficava mais pequeno que mobile, corrigir).
- Unit: 15px, `text-content-tertiary`, `font-medium`. Espaço `gap-2` em vez de `gap-1.5`.
- Subtítulo passa a ser um **signal pill** quando há classificação qualitativa (comments band, rhythm band):
  - `low` → pill neutro `bg-surface-muted text-content-secondary`
  - `medium` / `good` → pill info `bg-accent-primary/10 text-accent-primary`
  - `active` / `excess` → pill alerta apropriado (`signal-success`/`signal-warning` em alpha 10)
  - Para gostos (sem band), mantém-se texto plano "0,09% dos seguidores" em 15px `text-content-secondary`.
- Divisores mantêm-se mas finos (`divide-border-default/60`).
- Card mantém `rounded-xl border bg-white` e o grid `sm:grid-cols-3`.

Adiciono helper interno `metricBandTone(key, subtitleKey)` para mapear cada subtitle key de `i18n` ao tom certo (low/medium/active/saudável/excess). Como já temos `commentsBand` e `rhythmBand` no ficheiro, devolvo o `tone` directamente no objecto `items.push({…, tone})` em vez de adivinhar pelo texto traduzido.

---

## O que NÃO muda

- Copy / chaves i18n / lógica de derivação de strengths/limits / `computeOverall` / `IndexRuler` / régua e mediana.
- Hero number, eyebrow `ÍNDICE DO PERFIL`, popover "Como foi calculado", endpoints 0/100.
- Estrutura do card (zona macro → metrics → bullet columns).

## Validação

- `bunx tsc --noEmit`.
- QA visual em `/analyze/frederico.m.carvalho` a 411×742:
  - Bloco 1 com escala uniforme: paragraph, evidence, delta, microline, metric subtitle todos a 17/15px sem saltos visuais.
  - Sem chips "Veredicto", "Leitura provisória", "Precisa de trabalho".
  - MetricsStrip: chip-ícone, número grande, pill subtítulo.
- QA em desktop ≥1280px (régua + delta na mesma linha continua a caber).
