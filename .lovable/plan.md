## Objetivo

Transformar o Block 1 do relatório público (`EditorialIdentityCard`) numa observação editorial executiva, concisa e útil — eliminando elementos que duplicam métricas já presentes na barra superior, na grelha de KPIs e nos cards de Engagement/Frequência/Formato logo abaixo.

Sem novas chamadas a OpenAI. Sem alterações a cálculos, snapshots, unlock ou Block 2.

## Ficheiros tocados

- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` — refator visual e de conteúdo (único ficheiro alterado).
- `src/components/report-redesign/v2/report-overview-block.tsx` — sem alterações lógicas; apenas confirmar props já passadas (`aiHeroText`, `scores`, `keyMetrics`).

## Fonte de dados (sem chamadas novas)

1. **Texto IA preferencial:** `enriched.aiInsightsV2.sections.hero.text` (já passado como `aiHeroText`).
2. **Fallback determinístico** a partir do que já existe nas props:
   - `scores.envolvimento.value` / `scores.frequencia.value` / `scores.interaccao.value`
   - `keyMetrics.engagementDeltaPct` (posição vs benchmark — usado só como sinal interno, não impresso como percentagem)

Não é introduzido nenhum novo campo nem nova chamada de rede.

## Nova estrutura do card

```text
┌──────────────────────────────────────────────────┐
│ OBSERVAÇÃO                                       │
│ Título editorial (≤ 5 palavras)                  │
│ Parágrafo curto, 2–3 frases, pt-PT, pragmático.  │
│ [chip subtil opcional: "Acima do benchmark" /    │
│  "Em linha" / "Abaixo do benchmark"]             │
└──────────────────────────────────────────────────┘
```

Removido:
- Score ring `/100` + chip "Crítico/A melhorar/Forte"
- Band 2 (mini-cards "Ponto forte" e "A melhorar" com setas e `er% vs benchmark`)
- Função `buildMiniCardSubtitle` (deixa de ser usada)

Mantido / introduzido:
- Eyebrow passa de "Resumo executivo" para "Observação"
- Headline em `font-display`, agora limitado a ≤ 5 palavras (regra do fallback; texto IA é truncado por frase, ver abaixo)
- Parágrafo `text-sm leading-relaxed text-content-secondary`
- Chip discreto de posição vs benchmark (Inter, sem cores berrantes; usa tokens existentes)

A pontuação global e a comparação direta com benchmark continuam visíveis nos blocos seguintes (barra de cabeçalho, Engagement card, KPI grid) — sem regressão informativa.

## Lógica de título + parágrafo

### Quando há `aiHeroText`

1. Dividir pela primeira pontuação final (`. ! ?`).
2. **Título** = primeira frase, mas se exceder 5 palavras, usar fallback determinístico só para o título e manter o texto IA inteiro como parágrafo.
3. **Parágrafo** = resto do texto IA, limitado a ~280 caracteres (corte na fronteira da frase mais próxima).
4. Remover prefixos proibidos (`A IA concluiu`, `A IA observa`, etc.) por regex defensiva.

### Fallback determinístico (sem IA)

Mapa decisional usando apenas os scores normalizados e `engagementDeltaPct`:

| Condição                                                                 | Título (≤5 palavras)              | Parágrafo                                                                                                       |
|--------------------------------------------------------------------------|-----------------------------------|------------------------------------------------------------------------------------------------------------------|
| `eng ≥ 60` e `freq ≥ 60`                                                 | "Presença sólida e consistente"   | "Conteúdo gera resposta de forma regular e a cadência é estável. A próxima alavanca está em diversificar formatos e abrir mais conversa nos comentários." |
| `eng ≥ 60` e `freq < 40`                                                 | "Bom alcance, ritmo irregular"    | "O conteúdo funciona quando sai, mas o ritmo de publicação é descontínuo. Estabilizar a cadência semanal é o passo com maior retorno imediato."          |
| `freq ≥ 60` e `eng < 40`                                                 | "Cadência forte, sinal fraco"     | "Existe disciplina de publicação, mas o conteúdo não está a converter em interação. O foco deve ir para o conceito editorial e o gancho inicial de cada peça." |
| `eng < 40` e `inter < 40`                                                | "Audiência existe, falta direção" | "A base de seguidores não está a reagir nem a comentar de forma significativa. A prioridade é redefinir ângulo editorial e formatos antes de aumentar volume." |
| caso default (perfil misto)                                              | "Perfil ativo, oportunidade clara"| "Os indicadores estão próximos da referência do escalão. Há espaço para subir engagement ajustando formatos dominantes e reforçando a conversa nos comentários." |

Regras do parágrafo:
- 2–3 frases, pt-PT, sem hype, sem percentagens, sem repetir taxa de engagement nem número de seguidores.
- Sem "A IA …", sem elogios genéricos, sem invenção de factos.

### Chip de âncora (opcional, subtil)

Com base em `keyMetrics.engagementDeltaPct`:
- `≥ +10%` → "Acima do benchmark"
- `entre -10% e +10%` → "Em linha com benchmark"
- `≤ -10%` → "Abaixo do benchmark"

Renderizado em estilo discreto (Inter SemiBold uppercase pequeno, `bg-surface-muted text-content-secondary`), sem ícone agressivo. Se `engagementBenchmark <= 0`, o chip é omitido.

## Tipografia & tokens

- Tudo em Inter + Fraunces (regra das duas famílias do projeto).
- Sem `font-mono` (proibido no UI público).
- Cores via tokens: `content-primary`, `content-secondary`, `content-tertiary`, `surface-muted`, `border-default`.
- Sem `slate-*`. Sem cores hardcoded.

## Mobile-first (375px)

- Card único de banda única (deixa de existir Band 2 grid).
- Padding `px-5 py-6 sm:px-7 sm:py-7`.
- Headline `text-xl sm:text-2xl`, parágrafo `text-sm`, chip `text-[11px]`.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Inspeção visual em `375px` e desktop:
  - Título ≤ 5 palavras
  - Parágrafo curto e útil
  - Sem `%` de engagement nem contagem de seguidores
  - Funciona com `aiHeroText = null`

## Antes / Depois (exemplo)

**Antes (Band 1 + Band 2):**

```
RESUMO EXECUTIVO
Perfil com bom potencial de crescimento
Engagement acima do benchmark do tier, cadência consistente...
                                        ┌──────────┐
                                        │   72     │
                                        │ / 100    │
                                        │  FORTE   │
                                        └──────────┘
─────────────────────────────────────────────────────
↗ Ponto forte: Engagement  ↘ A melhorar: Comentários
  4,12% · +18% vs benchmark   2,3 coments · abaixo média
```

**Depois:**

```
OBSERVAÇÃO
Bom alcance, ritmo irregular
O conteúdo funciona quando sai, mas o ritmo de publicação
é descontínuo. Estabilizar a cadência semanal é o passo
com maior retorno imediato.
[ Acima do benchmark ]
```

## Constraints respeitadas

- Apenas Block 1 alterado.
- Sem chamadas OpenAI, sem provider, sem mudanças em snapshots, unlock, admin, emails ou cálculos.
- Componente `ScoreRing` e utilitários `getScoreFamily / computeGlobalScore` deixam de ser importados aqui (mantêm-se no projeto para uso futuro/outros sítios).
