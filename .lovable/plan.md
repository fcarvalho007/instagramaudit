## Objetivo

Garantir que o Block 1 ("Observação editorial") mostra a informação completa gerada pela IA, mantendo o enquadramento numérico que hoje está a desaparecer.

## Causa raiz

Em `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`, a função `deriveCopyFromAi` parte sempre o texto da IA em primeira frase (título) + resto (parágrafo). Quando a 1ª frase tem mais de 5 palavras (o caso típico, porque traz métricas), o título cai para o determinístico e o parágrafo fica só com a 2ª frase. Resultado para `@frederico.m.carvalho`:

- IA produziu: *"Este perfil regista 0,09% de envolvimento médio, muito abaixo da referência interna de 3,70% para o tier 10–50K. Reforçar carrosséis com gancho claro e CTA para comentário."*
- O card mostra apenas: *"Reforçar carrosséis com gancho claro e CTA para comentário."*

A frase com o sinal mais importante (0,09% vs 3,70%) é cortada.

## Alteração proposta (cirúrgica, frontend-only)

Ficheiro único: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`.

Ajustar `deriveCopyFromAi` para:

1. Tentar título a partir da 1ª frase (regra atual ≤ 5 palavras).
2. **Se o título vier da IA**, parágrafo = `rest` (comportamento atual).
3. **Se o título cair para o fallback determinístico**, parágrafo = **texto completo da IA** (`cleaned`), não apenas `rest`.
4. Manter `trimParagraphToSentence` (limite ~280 chars) para evitar parágrafos demasiado longos em ecrãs pequenos, mas elevar o limite para ~320 para acomodar duas frases curtas em pt-PT.
5. Manter sanitização do prefixo proibido ("A IA concluiu…") e o chip de benchmark inalterados.

Sem alterações em:
- Componente `EditorialIdentityCard` JSX/estilos.
- `report-overview-block.tsx`.
- Pipeline de IA, snapshot, Apify, DataForSEO, OpenAI.
- Lock gate, modal de unlock.
- Outros blocos.

## Resultado esperado

Para `@frederico.m.carvalho` o card passa a mostrar:

- Eyebrow: `OBSERVAÇÃO`
- Título: `Audiência existe, falta direção` (fallback determinístico — primeira frase tem 21 palavras)
- Parágrafo: *"Este perfil regista 0,09% de envolvimento médio, muito abaixo da referência interna de 3,70% para o tier 10–50K. Reforçar carrosséis com gancho claro e CTA para comentário."*
- Chip: `ABAIXO DO BENCHMARK`

Quando a IA produzir uma 1ª frase curta (≤ 5 palavras), continua a usar essa frase como título e o resto como parágrafo (comportamento atual preservado).

Se `aiHeroText` for ausente, mantém-se o fallback determinístico atual (título + parágrafo determinísticos).

## Restrições

- Apenas UI / lógica de derivação de copy.
- Sem novas chamadas a providers.
- Sem alterar tokens nem o layout do card.
- Mobile-first preservado (mesmo card de banda única).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Verificação manual em `/analyze/frederico.m.carvalho`: confirmar que o parágrafo passa a incluir a frase com `0,09%` e `3,70%`.

## Checklist

- ☐ Editar apenas `editorial-identity-card.tsx`
- ☐ Atualizar `deriveCopyFromAi` segundo as 5 regras acima
- ☐ Confirmar título ≤ 5 palavras quando vem da IA
- ☐ Confirmar parágrafo completo quando título cai para fallback
- ☐ `bunx tsc --noEmit` sem erros
- ☐ `bunx vitest run` verde
- ☐ Validação visual em desktop e 375px
