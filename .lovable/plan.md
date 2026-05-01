
# Bloco 02 · Ritmo visual no diagnóstico editorial

## Problema

As 7 perguntas do diagnóstico (3 grupos: A=2, B=3, C=2) renderizam numa grelha uniforme `grid-cols-2` com `auto-rows-fr`. Todos os cards têm a mesma altura e largura — parece uma tabela. A resposta dominante (`text-[1.125rem]`) é quase do mesmo tamanho que o título da pergunta (`text-[1.05rem]`) — não há hierarquia visual.

## Estratégia

### 1) Layout com ritmo — cards marcados como `span` ou `compact`

Em vez de uma grelha uniforme, cada card ganha uma propriedade `span` que controla se ocupa largura total ou metade. As perguntas com resposta-veredicto forte (Q01 Tipo de conteúdo, Q02 Funil, Q06 Audiência, Q08 Objetivo) ocupam **largura total**. As perguntas com evidência densa (Q03 Hashtags, Q05 Captions, Q07 Integração) ficam **lado a lado** quando possível.

Implementação no `ReportDiagnosticGroup`:
- Remover `auto-rows-fr` (os cards deixam de ser forçados à mesma altura)
- Cada card pode ter `data-span="full"` ou default (half)
- A prop `span?: "full" | "half"` é passada ao `ReportDiagnosticCard` e propagada como classe `md:col-span-2`

Layout resultante por grupo:

```text
Grupo A · Identidade editorial
┌──────────────────────────────────────┐
│ Q01 · Tipo de conteúdo  (full)       │
├──────────────────┬───────────────────┤
│ Q02 · Funil      │  (agora metade   │
│  (half — funil   │   se houver Q    │
│   visual stack)  │   extra, senão   │
│                  │   full)          │
└──────────────────┴───────────────────┘

Grupo B · Como comunica
┌──────────────────┬───────────────────┐
│ Q03 · Hashtags   │ Q05 · Captions   │
│  (half)          │  (half)          │
├──────────────────┴───────────────────┤
│ Q06 · Audiência  (full — destaque)   │
└──────────────────────────────────────┘

Grupo C · Contexto estratégico
┌──────────────────┬───────────────────┐
│ Q07 · Integração │ Q08 · Objetivo   │
│  (half)          │  (half)          │
└──────────────────┴───────────────────┘
```

### 2) Tipografia da resposta dominante — 2x maior

No `ReportDiagnosticCard`, a resposta dominante passa de `text-[1.125rem] md:text-[1.25rem]` para **`text-[1.5rem] md:text-[1.75rem]`** — o dobro do tamanho do body text (`text-sm` = 0.875rem). Quando `span="full"`, escala ainda mais para `text-[1.75rem] md:text-[2rem]`.

### 3) Cards full-width: layout horizontal

Quando `span="full"`, o card reorganiza internamente: pergunta + resposta à esquerda (60%), evidência/children à direita (40%) em desktop. Isto evita que um card full-width fique com muito espaço vertical desperdiçado.

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | Adicionar prop `span`, ajustar tipografia da resposta, layout horizontal para `span="full"` |
| `src/components/report-redesign/v2/report-diagnostic-group.tsx` | Remover `auto-rows-fr`, usar children directamente (cada card controla o seu `col-span`) |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Passar `span` a cada card: Q01=full, Q02=depende do count, Q03/Q05=half, Q06=full, Q07/Q08=half |

## Fora de âmbito

- Conteúdo dos cards (copy, classifiers, builders) — não muda
- Caption Intelligence (entre grupo B e C) — não muda
- Prioridades e CTA — não mudam
- Report light tokens — não muda (este é um componente de layout, não de cor)

## Validação

- `bunx tsc --noEmit` passa
- `bunx vitest run` passa (51/51)
- Verificação visual: cards full-width visivelmente maiores que half, resposta dominante com presença editorial clara, sem "tabela"
- Responsivo: em mobile (375px) todos colapsam para 1 coluna sem quebrar
