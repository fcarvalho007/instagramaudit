
# Refinar o card "Ritmo de publicação"

## Problemas identificados

1. **Falta de clareza** — mostra "6,0 /semana" mas não desdobra em posts/dia (~0,86/dia) nem contextualiza a janela de análise de forma imediata.
2. **Sem benchmark** — não existe referência de frequência de publicação por escalão. O utilizador não sabe se 6/semana é muito ou pouco para o seu tier.
3. **Sem gráfico** — os "RhythmDots" são decorativos mas não comunicam informação útil. Falta um gráfico de barras ou gauge que compare o perfil com a referência.
4. **Sem fonte** — nenhuma citação de onde vem a referência de cadência.

## Dados de benchmark a incorporar

Fonte: Later.com, análise de 19M posts (março 2025). Publicar como referência `[1]`.

| Escalão | Feed posts/semana (média) |
|---------|--------------------------|
| Nano (0–10K) | 2 |
| Micro (10K–100K) | 3 |
| Mid (100K–500K) | 5 |

Nota: Later não segmenta Macro/Mega separadamente. Para Macro (250K–1M) usaremos 5 e para Mega (1M+) usaremos 7 como estimativas conservadoras baseadas na tendência observada.

Fonte secundária: Buffer.com, análise de 2M+ posts (2025) — recomendação geral de 3–5 posts/semana. Publicar como `[2]`.

## Alteracoes previstas

### Ficheiro: `src/components/report-redesign/v2/report-overview-cards.tsx`

**PostingRhythmCard — reestruturar:**

1. **Headline dupla**: manter "X,X /semana" como métrica principal. Adicionar "≈ Y,Y /dia" em subtexto.
2. **Benchmark bar chart inline**: um gráfico SVG simples de barras horizontais com duas barras:
   - Barra "Perfil" (cor primaria) — valor real do perfil.
   - Barra "Referência do escalão" (cor neutra) — valor do benchmark por tier.
   - Label do escalão visível (ex: "Nano · 2/sem").
3. **Gap badge**: chip tipo "Acima da referência" / "Dentro da referência" / "Abaixo da referência" com tom verde/neutro/amber.
4. **Remover RhythmDots** — substituir pelo gráfico de barras que comunica informação real.
5. **Nota de fonte compacta**: `[1] Later, 19M posts · [2] Buffer, 2M+ posts` com link numérico clicável.
6. **Nota metodológica curta**: "Frequência calculada como publicações ÷ dias da janela × 7."

**Dados de benchmark** — criar constante `POSTING_FREQUENCY_BENCHMARK` no mesmo ficheiro (ou num módulo partilhado) com os valores por tier, reutilizando o tipo `AccountTier` existente.

**Lógica de tier lookup** — reutilizar `getActiveTierIndex` ou a lógica de tiers existente em `src/lib/benchmark/tiers.ts` para determinar o escalão do perfil com base nos seguidores.

### Nenhuma alteracao a:
- Blocos 02, 03, pricing, admin, PDF, auth, providers, Supabase
- Ficheiros bloqueados
- Schema de base de dados

## Validacao

- `bunx tsc --noEmit`
- `bunx vitest run`
- Verificar desktop e 375px mobile
- Confirmar que nenhum ficheiro bloqueado foi tocado
