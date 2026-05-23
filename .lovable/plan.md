## Objetivo

Reformular o **primeiro card do Bloco 1** (`EditorialIdentityCard`) para seguir o mockup: gauge circular + veredicto + barra de progresso com marca de referência + duas colunas verde/âmbar (pontos fortes / limitações). Mantendo o tom construtivo, tokens semânticos do sistema, e **sem nova chamada OpenAI** — todo o conteúdo é derivado de dados já disponíveis no snapshot.

Ficheiro tocado: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (+ pequeno ajuste de props em `report-overview-block.tsx` para passar dados adicionais que já existem em `result.data`).

## Estrutura visual (alinhada com mockup)

```text
┌──────────────────────────────────────────────────────────────┐
│  ┌──────┐  VEREDICTO  [PRECISA DE TRABALHO]                  │
│  │  21  │  Audiência existe, falta direção                   │
│  │DE 100│  Síntese em 1–2 frases, pt-PT, construtivo.        │
│  └──────┘  ▓▓▓░░░░░░░░░░░│░░░░░░░░░░░  0 · ↑ref 60 · 100     │
├──────────────────────────────────────────────────────────────┤
│  ↗ O QUE JÁ FUNCIONA          │  ↘ O QUE LIMITA O CRESCIMENTO│
│  • Publicação consistente …   │  • Poucos comentários …      │
│  • Base de seguidores …       │  • Formato repetitivo …      │
└──────────────────────────────────────────────────────────────┘
```

- Divisor horizontal (`border-t border-border-default`) separa zona macro da zona accionável.
- Mobile: gauge centrado em cima, texto abaixo; colunas pontos fortes/limitações empilham (`grid-cols-1 md:grid-cols-2`).
- Sem cores hardcoded — usar tokens já existentes (`signal-success`, `signal-warning`, `accent-primary`, `tint-success`, `tint-warning`, `surface-muted`, `border-default`).

## Pontuação e bandas

Pontuação global = média ponderada das três sub-pontuações já existentes:

```text
overall = round( 0.5 * envolvimento + 0.3 * frequencia + 0.2 * interaccao )
```

(envolvimento pesa mais por ser o sinal mais informativo; frequência é higiénica; interação é redundante com envolvimento mas adiciona granularidade).

Bandas de veredicto (referência da barra **fixa a 60** = piso de "sólido"):

| Score | Estado | Cor gauge/badge | Token base |
|------:|--------|-----------------|------------|
| 0–39 | Precisa de trabalho | âmbar | `signal-warning` / `tint-warning` |
| 40–69 | Em desenvolvimento | azul calmo | `accent-primary` / `accent-primary/10` |
| 70–100 | Sólido | verde | `signal-success` / `tint-success` |

Nunca vermelho agressivo — máximo é âmbar (tom construtivo).

## Conteúdo dos blocos

### Título + síntese
Continua a vir de `aiInsightsV2.hero.text` (já implementado em `deriveCopyFromAi`). Sem nova chamada IA. Fallback determinístico mantém-se.

### Pontos fortes (2) e limitações (2)
**Derivados deterministicamente** de sinais já presentes em `scores` + `keyMetrics` + (novo) `dominantFormatShare`, `postingFrequencyWeekly`, `followers`. Estratégia: avaliar cada sinal, atribuir-lhe categoria `forte | limite` por threshold, ordenar por magnitude e escolher os 2 melhores para cada lado.

Regras (resumo):

| Sinal | Forte se… | Limite se… |
|-------|-----------|------------|
| Frequência semanal | 3–5 posts/sem → "Publicação consistente · ~X post/dia" | <1 ou >7 → "Cadência irregular" |
| Base de seguidores | ≥ tier mid → "Base de seguidores · relevante para o nicho" | < metade tier → "Audiência ainda pequena" |
| Engagement vs benchmark | delta ≥ +10% → "Envolvimento acima do escalão" | delta ≤ −30% → "Envolvimento muito abaixo do escalão" |
| Comentários (interaccao) | score ≥ 60 → "Conversa ativa nos comentários" | score < 30 → "Poucos comentários · falta CTA claro" |
| Concentração de formato | share <55% → "Mix de formatos equilibrado" | share ≥70% → "Formato repetitivo · X% {formato}" |

Garantias:
- Sempre 2 + 2 (se faltarem fortes ou limites, completa com fallbacks neutros — ex.: "Perfil ativo na plataforma" / "Espaço para diversificar conteúdo").
- Cada bullet = `destaque` (Inter 500, content-primary) + `· detalhe` (content-secondary).
- pt-PT, sem jargão técnico.

## Implementação técnica

### Card layout (JSX)

```tsx
<article className="rounded-2xl border border-border-default bg-white shadow-card overflow-hidden">
  {/* Zona macro */}
  <div className="px-5 py-6 sm:px-7 sm:py-7 flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
    <ScoreGauge value={overall} band={band} />        {/* 124px viewBox 42×42 */}
    <div className="flex-1 min-w-0 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-eyebrow-sm text-content-tertiary">Veredicto</span>
        <VerdictBadge band={band} />
      </div>
      <h2 className="font-display text-xl sm:text-2xl …">{copy.title}</h2>
      <p className="text-sm leading-relaxed text-content-secondary">{copy.paragraph}</p>
      <ReferenceBar value={overall} reference={60} band={band} />
    </div>
  </div>

  {/* Zona accionável */}
  <div className="border-t border-border-default grid grid-cols-1 md:grid-cols-2">
    <BulletColumn tone="success" icon={ArrowUpRight}
      title="O que já funciona" items={strengths} />
    <BulletColumn tone="warning" icon={ArrowDownRight}
      title="O que limita o crescimento" items={limits}
      className="border-t md:border-t-0 md:border-l border-border-default" />
  </div>
</article>
```

### ScoreGauge
- SVG `viewBox="0 0 42 42"`, `stroke-linecap="round"`, `strokeWidth={3.5}`, `transform="rotate(-90)"`.
- Track = `text-border-default/40`; arco = `currentColor` mapeado ao token da banda.
- Texto central: número em `font-display` (Fraunces) 40px com `tabular-nums`; sublabel "DE 100" em `text-eyebrow-sm`.
- `role="img"` + `aria-label="Pontuação global X de 100"`.

### ReferenceBar
- Track horizontal `h-1.5 rounded-full bg-surface-muted`.
- Fill = `width: ${overall}%` na cor da banda.
- Marca vertical em `left: ${reference}%` (linha 2px, `h-3`, cor `border-default`).
- Labels por baixo: `0 · ↑ referência do escalão · 60 · 100` em `text-[11px] text-content-tertiary`.

### Cores semânticas (sem hardcode)
Usar tokens existentes; se `tint-success` / `tint-warning` ainda não existirem como classes Tailwind, verificar `tailwind.config.ts` antes — em caso de falta, criar via `bg-signal-success/10` / `bg-signal-warning/10` (já suportado por Tailwind v4 com cores em `--signal-*`).

## Alterações de props

`EditorialIdentityCardProps` ganha (todos opcionais):

```ts
dominantFormat?: "Reels" | "Carousels" | "Imagens";
dominantFormatShare?: number;       // %
postingFrequencyWeekly?: number;
followers?: number;
followerTierBenchmark?: number;     // p/ avaliar "base relevante"
```

Em `report-overview-block.tsx`:
```tsx
<EditorialIdentityCard
  scores={scores}
  aiHeroText={enriched.aiInsightsV2?.sections.hero?.text ?? null}
  keyMetrics={{ engagementRate, engagementBenchmark, engagementDeltaPct }}
  dominantFormat={k.dominantFormat}
  dominantFormatShare={k.dominantFormatShare}
  postingFrequencyWeekly={k.postingFrequencyWeekly}
  followers={profile.followers}
  followerTierBenchmark={…} {/* se disponível, senão omitir */}
/>
```

## Estados

- **Sem dados suficientes** (`postsAnalyzed < 5`): renderizar o gauge e o título/síntese, mas substituir a barra de referência por uma nota textual `"Baseado em apenas X posts — confiança limitada."` e mostrar apenas 1 forte + 1 limite (com texto "Análise preliminar").
- **Loading**: não aplicável aqui (o card recebe sempre dados resolvidos pelo loader).
- **AI hero text ausente**: usa fallback determinístico já existente.

## Restrições preservadas

- Sem nova chamada OpenAI / Apify / DB.
- Tokens semânticos apenas; **sem `slate-*`** e sem hex em componentes.
- Fraunces apenas em H2 e número do gauge; restante em Inter.
- Mobile-first; testado mentalmente a 375px (gauge centrado, colunas empilhadas).
- Tom construtivo — máximo de cor "negativa" é âmbar.
- Bloco apenas no card #1; **não tocar** em Admin, Emails, Unlock, cálculos a montante, ou demais cards do Bloco 1.

## Checkpoint

- ☐ `EditorialIdentityCard` reescrito com gauge + veredicto + barra de referência + duas colunas accionáveis
- ☐ Pontuação global = média ponderada 0.5/0.3/0.2 (envolvimento/frequência/interação)
- ☐ Bandas de cor: âmbar 0–39, azul 40–69, verde 70–100; referência fixa a 60 na barra
- ☐ Pontos fortes / limitações derivados deterministicamente (2 + 2 garantidos)
- ☐ Tokens semânticos apenas; Fraunces só no H2 e número do gauge
- ☐ Mobile 375px: gauge centrado, colunas empilhadas
- ☐ Estado "poucos posts": nota de confiança limitada substitui a barra
- ☐ Sem nova chamada OpenAI / Apify / DB