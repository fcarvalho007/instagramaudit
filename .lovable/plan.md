
## Objetivo

Substituir o header do `EditorialIdentityCard` (Bloco 1) pela nova composição dos mockups, mas reescrita para refletir **exatamente** o que o backend calcula hoje — sem inventar "4 sinais", sem "mediana · 60", sem fontes não reais.

Tudo o resto do card (veredicto editorial, `MetricsStrip`, "O que já funciona / limita") fica intacto.

## Princípios

- 3 sinais (não 4): envolvimento, ritmo, conversa.
- Sem mediana de escalão (o sistema não a calcula ainda).
- "Como foi calculado" descreve a fórmula real, sem pesos inventados.
- Frase de confiança obrigatória: "Leitura comparativa — não é uma métrica oficial do Instagram."
- Sem placeholders tracejados a fingir dados — se o dado não existe, a linha não aparece.

## Faseamento

### Fase 1 — Microcopy + estrutura honesta (esta entrega)

1. **Reescrever a zona "ÍNDICE DO PERFIL"** (lado esquerdo do card)
   - Eyebrow: `ÍNDICE DO PERFIL`
   - Número grande `41` `/ 100` (mantém tipografia atual)
   - Subtítulo dinâmico baseado em dados reais:
     - Se temos `engagementBenchmark` real do escalão → "X pp abaixo/acima da referência do escalão" (baseado no delta de envolvimento, único benchmark real)
     - Se não temos → "Índice de atividade do perfil" (sem comparação)
   - Micro-linha fixa: "Índice comparativo, construído a partir de **3 sinais** do perfil."

2. **Substituir a barra de bandas** por uma régua vertical compacta com 4 estágios discretos (Líder / Competitivo / Em progresso / Emergente) — em `text-content-tertiary`, sem cor de destaque
   - Único marcador realçado: `▸ esta marca · 41` (alinhado à banda correta)
   - **Remover** "mediana · 60" (não temos esse dado)

3. **"Como foi calculado" colapsável** (`<details>` nativo estilizado, ícone chevron)
   - Texto: "Construído a partir de 3 indicadores do perfil: envolvimento, ritmo de publicação e conversa nas legendas."
   - Texto: "Comparado com o benchmark de envolvimento do escalão de referência (Nano/Micro/Mid/Macro/Mega), com base na atividade recente observada."
   - Sem caixa tracejada de "preencher com dados reais" — em vez disso, lista compacta dos dados reais usados: "Escalão: {tier} · Posts analisados: {n} · Janela: {window}d"
   - Footer: "Leitura comparativa — não é uma métrica oficial do Instagram."

4. **Corrigir a inconsistência de pesos**
   - `computeOverall` em `editorial-identity-card.tsx` usa 0,5/0,3/0,2
   - `score-utils.ts` usa 0,45/0,25/0,30
   - Unificar para os pesos de `score-utils.ts` (45/25/30) — esses são os documentados nos tooltips dos scores individuais. Garante que o número agregado é coerente com os scores que o utilizador vê noutros lados.

### Fase 2 — i18n + QA (mesma entrega)

- Adicionar chaves a `report.json` (pt-PT + en) para todos os novos textos.
- Verificar que `postsAnalyzed`, `cadenceWindowDays`, `tierLabelFromFollowers(followers)` estão a chegar ao card (já estão como props).
- Testar com `/analyze/frederico.m.carvalho` em viewport 375px e desktop.

### Fase 3 — fora desta entrega (anotar para próximo pedido)

- Adicionar 4.º sinal "consistência" (desvio do intervalo entre posts).
- Calcular e expor mediana agregada de índice por escalão (precisa de volume e job de agregação).
- Quando essas duas ficarem prontas, atualizar microcopy de "3 sinais" → "4 sinais" e reintroduzir linha "mediana · {n}" na régua.

## Ficheiros tocados

- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (header reescrito; corpo do veredicto e bullets intactos)
- `src/components/report-redesign/v2/overview/score-utils.ts` (sem alteração de assinatura; só confirmação de pesos)
- `public/locales/pt/report.json` e `public/locales/en/report.json` (novas chaves `identity.index.*` e `identity.method.*`)

## Fora de scope

- `MetricsStrip` (as 3 métricas inferiores)
- Coluna do veredicto (direita)
- "O que já funciona / limita o crescimento"
- Backend / serverFn / qualquer cálculo novo

## Checkpoint

☐ Subtítulo do índice é dinâmico e só compara quando há benchmark real
☐ Micro-linha diz "3 sinais" (não 4)
☐ Régua de estágios sem "mediana · 60"; só "esta marca · 41" realçado
☐ "Como foi calculado" abre/fecha, lista 3 indicadores reais, mostra escalão+amostra+janela reais, sem caixa tracejada
☐ Frase "não é uma métrica oficial do Instagram" presente
☐ Pesos unificados em 45/25/30 entre `computeOverall` e `score-utils`
☐ i18n pt-PT + en completos
☐ Visual ok em 375px e desktop
