# Editorial V2 — Fase A: secção de visão geral

Migrar apenas a visão geral (Bloco 01) para a camada Editorial V2. O relatório de produção continua a ser o predefinido; o Editorial V2 só aparece com `?report_design=editorial_v2`. Nenhuma outra secção é migrada.

## Confirmações prévias (lidas nesta ronda)

- Veredicto editorial já existe em produção: `enriched.aiInsightsV2.editorialVerdict` com fallback determinístico (`deriveEditorialVerdict` + `buildFallbackVerdict`). Não é preciso nova chamada IA nem novo motor de inferência.
- Índice do perfil já existe: `computeEnvolvimento` + `computeFrequencia` + `computeGlobalScore` (pesos 0,6 / 0,4) em `overview/score-utils.ts`.
- Sinais fortes já existem: a função `computeSignals` dentro de `report-overview-attention-row.tsx` devolve até 3 sinais ordenados (gap de engagement, cadência vs resposta, concentração de formato). É o mecanismo existente para sinal primário + secundários.
- Rótulo de período já existe: `result.data.meta.windowLabel` ("últimos 30 dias", "últimos 90 dias", etc.). Nunca será escrito à mão.
- Avatar real existe em `result.data.profile.avatarUrl`; escalão via seguidores (`profile.tier`).
- **Não existe** mediana do índice 0–100 por escalão em produção. O marcador de referência da gauge fica de fora (só o valor real + legenda), conforme instrução de não inventar.

## O que vai ser construído

Dentro de `src/components/report-editorial-v2/`:

```text
overview/
  editorial-overview.tsx        // orquestra a secção (desktop + mobile)
  profile-context.tsx           // avatar, handle, seguidores, publicações, escalão, período
  editorial-verdict.tsx         // headline Fraunces 36–62px + standfirst
  primary-signal.tsx            // bloco dominante com contorno
  secondary-signals.tsx         // lista agrupada até 3 sinais
  profile-index.tsx             // valor grande + gauge horizontal + legenda
  use-count-up.ts               // count-up e fill respeitando reduced-motion
  overview-data.ts              // adapta os dados de produção já existentes
```

`editorial-v2-shell.tsx` passa a montar a banda de visão geral com estes componentes, mantendo os primitivos já criados (`ReportBand`, `SectionIntro`, `StatusPill`, `ObservationBlock`, `ReadingBlock`, `MetricDisplay`).

## Reutilização de lógica (sem duplicar regras)

Uma alteração pequena em produção, apenas mecânica: extrair `computeSignals` (e os seus helpers de formatação) de `report-overview-attention-row.tsx` para `src/lib/report/attention-signals.ts`, passando o componente actual a importar dessa nova localização. Saída idêntica, zero mudança de comportamento. O Editorial V2 consome a mesma função — o primeiro sinal é o primário, os restantes são secundários.

Score, veredicto e período são consumidos das funções/campos já existentes, sem cópias.

## Composição

Desktop (grelha 12 colunas já definida no CSS V2): coluna de contexto 1–4 com identidade do perfil e período; coluna de dados 6–12 com veredicto, standfirst, sinal primário, sinais secundários e índice do perfil (número grande à esquerda, gauge horizontal à direita).

Mobile 375: fluxo único — linha de perfil, veredicto editorial, índice como cartão branco dedicado, sinal primário a largura total, sinais secundários agrupados num só cartão. Alvos de toque ≥44px.

## Movimento

Apenas revelação (opacidade + ~14px), count-up do índice e preenchimento da gauge, via `IntersectionObserver` dentro de `useEffect` (sem globais durante SSR/hidratação) e com `matchMedia('(prefers-reduced-motion: reduce)')` a saltar directamente para o estado final. Sem novas dependências.

## Segurança de produto

Sem novos fetches, selectores, métricas, verificações de entitlement, eventos de analytics ou alterações de PDF. As props de gating (`access`, `mode`, variante, entitlement) são lidas exactamente como hoje: o que está bloqueado no gratuito continua bloqueado; nada de `internal_lab` fica visível.

## Acessibilidade

Ordem semântica de headings (h2 da secção, h3 dos sub-blocos), rótulos de texto reais para a gauge, foco visível, estado nunca dependente só de cor (ícone + texto no `StatusPill`), reduced motion.

## Testes

- Predefinição continua a renderizar o relatório actual sem alterações.
- `?report_design=editorial_v2` renderiza a visão geral editorial.
- Valores mudam quando os dados de entrada mudam (dois fixtures diferentes) — prova de ausência de números fixos.
- Nenhum literal da referência (36, 58, 98%, 0,08%, 4,80%) no código do Editorial V2.
- Caminho reduced-motion renderiza o valor final.
- Visibilidade Free/Pro idêntica entre as duas variantes.
- Validação visual com Playwright a 1440px e 375px.

## Fora de âmbito

Engagement e todas as secções seguintes, gráficos adicionais, navegação, toggle no Report Lab, PDF, gates, pagamentos, créditos e analytics.

## Ponto de menor confiança

A ausência de mediana do índice por escalão: a gauge desktop da referência mostra um marcador de referência que não pode ser alimentado por dados reais. Proposta: mostrar só a posição real com legenda textual, e registar a mediana por escalão como dependência de dados para uma ronda futura.
