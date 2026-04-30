
# Bloco 02 · Refinamento visual + sinalização IA

Objetivo: deixar claro o que é **deterministico** (calculado a partir dos posts) e o que é **interpretação por IA** (OpenAI), sem custo extra — aproveitando a chamada única que já existe (`ai_insights_v2`).

## 1. Auditoria honesta — o que é IA vs determinístico hoje

Após leitura do código:

| Elemento do Bloco 02 | Origem real | Tem IA? |
|---|---|---|
| Veredito editorial (caixa azul topo) | `aiInsightsV2.sections.hero.text`, fallback determinístico | **Sim (com fallback)** |
| Q01 Tipo conteúdo · resposta + barras | `classifyContentType(posts)` | Não |
| Q01 body | string fixa (template) | Não |
| Q02 Funil · resposta + breakdown | `classifyFunnelStage(posts)` | Não |
| Q02 body | mapa fixo `bodyByLabel` | Não |
| Q04 Temas · headline + ranking | `inferThemes(hashtags, keywords)` | Não |
| Q05 Captions · stats | `classifyCaptionPattern` (+ `classifyQuestionShare`) | Não |
| Q06 Audiência · stats + tom | `classifyAudienceResponse` | Não |
| Q07 Integração · checklist | `classifyChannelIntegration(bio, externalUrls, posts)` | Não |
| Q08 Objetivo · ranking + body | `inferProbableObjective(...)` | Não |
| Prioridades de ação | `derivePriorities(...)` | Não |

**Conclusão:** hoje, **só o veredito do topo** é IA. Tudo o resto é cálculo direto. O ícone Bot atual no veredito é correto, mas o body interpretativo de cada cartão (`bodyByLabel`, mapas fixos) **não é IA** — é template determinístico parametrizado.

## 2. Decisão proposta (alinhada com o pedido)

A. **Marcar visualmente apenas onde existe IA real**, com hover/tooltip explicando "interpretação gerada por IA com base nos dados deste perfil".
B. **Aproveitar a mesma chamada `ai_insights_v2`** (sem custo extra) para iluminar 2 secções editoriais do Bloco 02 que beneficiam genuinamente de IA: `hero` (já existe) e `language` (já é gerado, mas não está a ser usado aqui).
C. **Não pedir secções novas à OpenAI** para Q01/Q02/Q04/Q06/Q07/Q08 — esses são cálculos. Mostrar abertamente que são cálculos.

## 3. Mudanças concretas

### 3.1 Componente novo: `AiBadge` (`src/components/report-redesign/v2/ai-badge.tsx`)
Pequeno chip com ícone Bot da Lucide + label "IA" + tooltip:
- Tooltip: "Interpretação gerada por IA com base nos dados reais deste perfil. Os números são sempre calculados diretamente a partir dos posts."
- Variante `inline` (chip pequeno ao lado do título do cartão) e `corner` (canto sup. direito).
- Acessível: `aria-label`, foco visível.

### 3.2 Componente complementar: `DeterministicBadge`
Chip discreto "CÁLCULO" (cinza, sem ícone Bot) para cartões que dependem só de dados — opcional, ativo apenas quando próximo de um cartão IA, para evitar ambiguidade.

> Decisão: **só mostrar `AiBadge`**. Não poluir todos os cartões com "CÁLCULO". A ausência do badge IA = é determinístico.

### 3.3 `ReportDiagnosticVerdict` — refinamento
- Manter o ícone Bot existente.
- Substituir eyebrow `"Veredito editorial · IA"` por:
  - Lado esquerdo: `Veredito editorial`
  - Lado direito do eyebrow: `<AiBadge variant="inline" />` com tooltip explícito.
- Quando o veredito vier de fallback determinístico (sem aiHero), **esconder o AiBadge** e mudar eyebrow para `"Veredito editorial · síntese automática"`. Isto é rigor: não dizer "IA" se foi fallback.
- Detetar via prop nova `source: "ai" | "fallback"` passada pelo orquestrador (já temos `args.aiHero` para decidir).

### 3.4 `ReportDiagnosticCard` — suporte opcional a IA
Adicionar prop opcional `aiSource?: { kind: "interpretation"; text: string }`. Quando presente:
- Cartão renderiza, **abaixo do body determinístico**, uma secção destacada:
  - Linha fina divisória + eyebrow `LEITURA IA · INTERPRETAÇÃO` + ícone Bot
  - Texto curto da IA (≤ 240 chars, já garantido pelo prompt)
- Quando ausente: cartão fica exatamente como hoje (sem IA).

### 3.5 Orquestrador `ReportDiagnosticBlock` — wiring da IA existente
Aproveitar o que `aiInsightsV2.sections` já devolve:
- `sections.hero` → veredito (já feito).
- `sections.language` → injetar como `aiSource` no **Q05 Captions** (cartão de linguagem). É exatamente o que `language` cobre no prompt.
- Mais nenhuma secção do Bloco 02 recebe IA — Q01/Q02/Q04/Q06/Q07/Q08 são cálculos puros e ficam sem badge.

Sem alterações ao prompt, ao schema, ou ao número de chamadas. **Custo: zero adicional.**

### 3.6 Refinamentos visuais menores (consistência)
- Uniformizar o padding interno dos cartões (`p-5 md:p-6` já está, manter).
- Garantir que o eyebrow `Pergunta NN · LABEL` usa a mesma escala em todos os cartões (já usa).
- Remover do body do Q08 a duplicação "hipótese provável... uma inferência provável" (redundância editorial). Reduzir para 1 frase mais limpa.
- Q07: quando `bioLink.detected = true` mas é vazio, esconder a label "Link na bio · " sem URL (já está OK, validar).
- Verificar contraste do tom `slate` no cartão Q01 quando "Padrão misto" (atualmente `bg-slate-50 ring-slate-200` — está OK).
- `ReportDiagnosticGroup`: a regra de `md:col-span-2` para grupos de 1 cartão já existe (linha 42-50). Manter.

### 3.7 Acessibilidade
- `AiBadge` com `role="img"` + `aria-label="Conteúdo gerado por IA"`.
- Tooltip via shadcn `Tooltip` (já disponível) com `aria-describedby`.
- Garantir focus ring no badge quando navegado por teclado.

## 4. O que NÃO muda

- Locked files: nenhum.
- Bloco 01, 03, 04, 05, 06: intactos.
- Prompt OpenAI (`prompt-v2.ts`), schema, validators: intactos.
- Número de chamadas IA: continua **uma só** por análise.
- Custo OpenAI: zero adicional.
- `/report/example`, admin, PDF, Supabase, payments, providers (Apify/DataForSEO): intactos.
- Auth, RLS: intactos.

## 5. Validação

```text
bunx tsc --noEmit
bunx vitest run
```

Sem QA browser. Sem chamadas a providers.

## 6. Ficheiros tocados (previsão)

```text
src/components/report-redesign/v2/ai-badge.tsx                 (novo)
src/components/report-redesign/v2/report-diagnostic-verdict.tsx (badge condicional + source prop)
src/components/report-redesign/v2/report-diagnostic-card.tsx   (prop aiSource opcional + render)
src/components/report-redesign/v2/report-diagnostic-block.tsx  (wiring de hero+language; tweak Q08 body)
```

Sem migrations. Sem novas dependências (Bot já vem de lucide-react; Tooltip já existe em shadcn).

## 7. Reporte final esperado

Após implementação, devolverei:
1. Lista exata de ficheiros tocados.
2. Confirmação de que só Q05-language e veredito-hero usam IA, e que ambos vêm da chamada única já existente.
3. Confirmação de zero custo OpenAI adicional e zero novas chamadas.
4. Resultado `tsc --noEmit` + `vitest run`.
5. Confirmação de que nada fora do Bloco 02 foi tocado.
