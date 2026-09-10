# Rever a integração da comparação V2 sem reverter

## Situação actual

O conteúdo do PR #1 já está neste projecto, no commit `bcab66cd` ("Integrou
comparação V2 do Codex"). Foi aplicado por cópia de ficheiros, não pelo merge dos
commits originais. Neste projecto não é possível criar uma branch isolada:
qualquer alteração aos ficheiros entra na main e sincroniza.

O código actual mantém-se. Nada é revertido, salvo se a revisão encontrar um
problema técnico que o justifique — e nesse caso proponho antes de agir.

## Passo 1 — Equivalência entre o integrado e o PR #1

Comparação ficheiro a ficheiro entre o estado actual do projecto e a branch
`codex/credible-comparisons`, feita numa cópia temporária fora do projecto:

- lista das diferenças reais, ficheiro e linhas;
- separação entre diferenças esperadas (trabalho recente feito aqui: apresentação
  Editorial V2 por defeito, métricas das publicações) e diferenças não explicadas;
- qualquer diferença não explicada é analisada individualmente antes de conclusões.

## Passo 2 — Falhas de teste com nomes exactos

Duas execuções da bateria completa, ambas fora do projecto sincronizado:

- na base (`7db23e8e`);
- no estado integrado actual.

Entrego o nome exacto de cada teste falhado nos dois lados — ficheiro, bloco e
título — e não apenas a contagem. Depois classifico:

- falha herdada, presente nos dois lados;
- correcção esperada, falhava na base e passa agora;
- regressão, passava na base e falha agora.

Só uma regressão justifica proposta de reversão.

## Passo 3 — Comportamento com a nova comparação desligada

Sem `COMPARISON_V2_ENABLED`, verificar o que o PR altera mesmo assim, por tocar
em código partilhado:

- prioridades e diagnóstico do relatório pago;
- fronteiras gratuito / com email / pago em cada secção;
- abertura de relatórios antigos, sem regeneração;
- exportação em PDF, no caminho gratuito e no pago;
- normalização de métricas e janelas de 30 e 90 dias;
- selecção de concorrentes (máximo dois), preços e créditos inalterados.

Qualquer alteração de números ou de acesso com a flag desligada é bloqueante.

## Limites desta etapa

- A nova comparação fica desligada.
- Sem publicação do site e sem alterações a dados de produção.
- O PR #1 fica aberto até confirmarmos a equivalência e decidirmos como encerrar.
- Sem reversão sem aprovação prévia.

## Entrega

Diferenças concretas entre o integrado e o PR, nomes exactos das falhas nos dois
lados com a respectiva classificação, resultado das verificações com a flag
desligada, e o que fica pendente para a etapa seguinte: percurso completo com
serviços de teste e avaliação de comparações reais.
