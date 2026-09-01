# Card Review 04 (Frequência) + 05 (Formato)

Duas rondas de refinamento visual, na mesma sequência pedida. Sem tocar em cálculos, thresholds, dados, IA, gates A/B/C, posição dos cards ou analytics.

## Estado actual verificado

Frequência (`overview/frequency-card.tsx`):
- Título e verdict saem num único `<h3>` corrido ("Frequência de publicação **Alta**"), via `ReportCardSectionHeader` com `qualifier` inline.
- Três `KpiTile` em grelha `sm:grid-cols-3` — cadência, % dias activos e dia de pico têm exactamente o mesmo peso visual e o mesmo tamanho de caixa.
- Gráfico semanal dentro de um segundo card (`rounded-2xl border … bg-surface-base/60`) com `mb-8 md:mb-10` entre cabeçalho e barras, barras de 96px e contagem invisível (`color: transparent`) nos dias a zero.
- Conclusão e nota metodológica externa colam-se visualmente uma à outra.

Formato (`overview/format-card.tsx`):
- Mesmo padrão de título+verdict corrido.
- Hero com `75%` a 5.25rem e o significado ("Carrosséis · 9/12") em 13px por baixo — desequilíbrio forte entre número e contexto.
- Coluna vertical de proporções + legenda separada repete a mesma informação em dois sítios.
- Filmstrip com fallback por ícone já existente (`PostThumb` → ícone quando `thumbnailUrl` falha ou falta).

## Card Review 04 — Frequência

1. Título: passar o card a eyebrow + verdict destacado — `FREQUÊNCIA DE PUBLICAÇÃO` como eyebrow e o verdict ("Alta") como palavra editorial em destaque na linha do título, usando os tokens existentes. Sem alterar o texto nem a classificação.
2. KPI: promover posts/semana a bloco principal (número grande, unidade explícita) e passar consistência e dia de pico a duas métricas de suporte numa linha secundária, sem caixa própria. Mesmos valores, mesma origem.
3. Gráfico: retirar o wrapper "card dentro de card" (fica separador + fundo neutro), reduzir a folga cabeçalho→barras, baixar as barras para ~80px, tornar o `0` visível em cinza discreto (em vez de transparente) e reforçar as labels dos dias para 12px legíveis. Sete colunas fluidas, sem scroll horizontal a 375px.
4. Conclusão: label curto ("Leitura") + bloco encostado ao gráfico, com separação clara da nota metodológica/referência externa por baixo.
5. Densidade: reduzir paddings verticais do corpo e os `mt-8` para um ritmo compacto.
6. Mobile 375/390: KPI principal em full width, métricas de suporte lado a lado, gráfico sem overflow.

Frequência mantém-se idêntico em A, B e C — nenhuma prop nova por tier.

## Card Review 05 — Formato

1. Hierarquia: verdict primeiro, depois formato dominante com o número acompanhado do significado — reduzir o `75%` de 5.25rem para uma escala editorial equilibrada e subir o peso da linha "Carrosséis · 9/12" para leitura imediata.
2. Verdict: mesma composição eyebrow + verdict destacado do card de Frequência, para coerência entre cards. Thresholds intactos.
3. Distribuição: manter a coluna vertical e a legenda, mas afinar contraste dos segmentos pequenos, labels e wrapping da legenda; remover a duplicação de contagem entre hero e legenda onde for redundante.
4. Filmstrip: manter, com espaçamento e legibilidade de formato melhorados e fallback honesto quando não há thumbnail (ícone + rótulo do formato, sem inventar imagem).
5. Conclusão: enquadramento mais próximo da distribuição, com separação da tabela de referência externa.
6. Confirmar que nada torna o card parcialmente visível no Estado A (continua `free_email`).

## Notas técnicas

- Ficheiros: `overview/frequency-card.tsx`, `overview/format-card.tsx` e, se necessário para o padrão eyebrow+verdict, uma prop de apresentação adicional em `report-card-section-header.tsx` (opt-in, sem alterar os cards que já a usam).
- Sem alterações em `score-utils.ts`, `block-config.ts`, i18n de conteúdo (só labels novos se estritamente necessários), providers ou analytics.

## Validação

- Screenshots antes/depois em 1280 e 390 para ambos os cards.
- Testes existentes (`vitest run`) mais um teste de guarda que fixa: fórmula de posts/semana e classificação inalteradas; Formato ausente no Estado A; Frequência presente em A/B/C.
