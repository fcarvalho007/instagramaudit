# Plano · Free vs Paid no relatório real

## Objetivo

Tornar explícita a diferença entre **Visão essencial (Free)** e **Leitura completa (Paid)** dentro da experiência real do relatório, mantendo o tom editorial premium. Sem lógica de pagamentos, sem chamadas a providers, sem tocar em ficheiros locked.

## Constraints (confirmados)

- **Locked, não tocar:** `src/components/report/*` (incluindo `report-page.tsx`, `report-mock-data.ts`, `report-section.tsx`, `report-header.tsx`, todos os componentes de secção), `src/routes/report.example.tsx`, `src/styles/tokens*.css`.
- **Sem chamadas:** Apify, DataForSEO, OpenAI, PDF, email.
- **Sem migrações, sem segredos novos.**
- **Apenas pt-PT** (acordo pós-1990, sem leaks pt-BR).
- **Tokens only** — zero cores/spacings hardcoded.

Como `report-page.tsx` é locked, não dá para "injetar" props ou secções dentro do fluxo. A diferenciação é feita por **composição na rota `/analyze/$username`**, envolvendo `<ReportPage>` com novos componentes acima e abaixo.

## Arquitetura

Novos ficheiros (nenhum locked):

```text
src/components/report-tier/
  ├── tier-strip.tsx              # Faixa no topo: explica o âmbito do gratuito
  ├── tier-comparison-block.tsx   # Bloco final: "O que muda no relatório completo"
  ├── tier-tag.tsx                # Micro-etiqueta reutilizável (Visão essencial / Disponível no completo)
  └── tier-copy.ts                # Copy centralizada pt-PT (single source of truth)
```

Edição mínima:
- `src/routes/analyze.$username.tsx` — wrappar `<ReportPage>` com `<TierStrip>` antes e `<TierComparisonBlock>` depois, dentro do mesmo `<Container>` visual.

`/report/example` **não é tocado** — continua a ser mockup editorial puro.

## Conteúdo (copy pt-PT)

### TierStrip (topo, abaixo do CoverageStrip e antes do `<ReportPage>`)

> **Visão essencial · relatório gratuito**
> Este relatório combina dados públicos do Instagram, sinais de pesquisa e leitura assistida por IA. A versão completa aprofunda concorrentes, oportunidades de conteúdo, presença no Google e recomendações prioritárias.

CTA discreto à direita: "Ver leitura completa" (apenas link visual, sem ação — `aria-disabled` ou âncora para o bloco comparativo no fim do report).

### TierComparisonBlock (rodapé, antes do `<ReportFooter>` ficar visível)

Título: **O que muda no relatório completo**
Subtítulo: *Do diagnóstico rápido à leitura estratégica.*

Duas colunas editoriais:

| Visão essencial (incluído) | Leitura completa (em breve) |
|---|---|
| Resumo do perfil e métricas principais | Comparação com até 2 concorrentes |
| Benchmark de envolvimento por escalão | Gap competitivo por formato e dia |
| Top publicações e padrão de conteúdo | Keywords de oportunidade e SERP do Google |
| 1 sinal de mercado de pesquisa | Cruzamento Instagram × Pesquisa |
| 3 insights estratégicos curtos | Recomendações prioritárias e plano de 30 dias |
|  | Exportação em PDF (em breve) |

Mensagem-chave no fundo do bloco:
> *O gratuito mostra o que está a acontecer. O completo mostra porquê, contra quem e o que fazer a seguir.*

Sem CTA de checkout (não há pagamentos ainda). Apenas: "Pedir relatório completo" → `mailto:` ou link para um futuro form (deixar como `<a href="#">` com `data-pending` se ainda não existe rota; confirmar com o utilizador antes do build).

### TierTag (micro-etiqueta)

Componente neutro, dois variantes:
- `variant="essential"` → "Visão essencial" (cinza editorial)
- `variant="complete"` → "Disponível no relatório completo" (cyan accent suave)

**Importante:** no MVP, **não inserimos as tags dentro das secções** (porque os componentes são locked). As tags ficam disponíveis para uso futuro nos novos blocos pagos quando forem adicionados (ex.: `ReportCompetitors` paga, `ReportMarketSignals` completa). No bloco comparativo final, as tags são usadas em cabeçalho de coluna.

## Design

- Faixa superior: card editorial low-emphasis — `bg-surface-secondary`, border `border-border-subtle`, padding generoso, tipografia Fraunces para o pequeno header e Inter para o corpo, mono para a etiqueta "Visão essencial".
- Bloco comparativo: layout 2 colunas em desktop (≥768px), stack em mobile (375px first). Divisor central subtil. Coluna esquerda neutra; coluna direita com ligeiro accent cyan (`text-accent-primary` no título). Sem gradientes berrantes.
- Animação: nenhuma. Editorial, estático, premium.
- Tokens only, mobile-first, dark + light (o report wrapper força light — testar).

## Validação

- `bunx tsc --noEmit` passa.
- `bun run build` passa.
- `/analyze/frederico.m.carvalho` renderiza com a faixa no topo + report normal + bloco comparativo no fim.
- `/report/example` permanece **idêntico** (smoke visual: o mockup não tem nem faixa nem bloco).
- Zero chamadas a Apify / DataForSEO / OpenAI (a rota não é alterada nesse aspeto).
- Sem novos segredos, sem migrações.

## Checkpoint

- ☐ Criados `src/components/report-tier/{tier-strip,tier-comparison-block,tier-tag,tier-copy}.tsx`
- ☐ `src/routes/analyze.$username.tsx` envolve `<ReportPage>` com a faixa antes e o bloco depois
- ☐ Copy 100% pt-PT (Acordo pós-1990, sem leaks pt-BR)
- ☐ Tokens-only, mobile-first verificado a 375px
- ☐ `/report/example` intocado
- ☐ `bunx tsc --noEmit` e `bun run build` verdes
- ☐ Confirmação explícita: nenhuma chamada a provider feita

## Pergunta antes de implementar

O CTA "Pedir relatório completo" deve apontar para:
1. `mailto:` para o teu email de admin
2. Âncora morta (`#`) com `aria-disabled` até existir fluxo
3. Outro destino (indicar)

Se preferires, avanço com a opção 2 (placeholder neutro) por defeito.
