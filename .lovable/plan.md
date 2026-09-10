# Activar Editorial V2 e preencher as métricas das publicações

## Decisões confirmadas

- O Editorial V2 passa a ser o relatório público por omissão, apesar de a Fase K não ter recebido o veredicto `READY FOR DEFAULT SWITCH` por falta de uma compra Pro real e pela referência de envolvimento ainda divergente (4,80%/5,60%). Esta decisão substitui explicitamente essa condição anterior.
- Os valores de `Envolvimento`, `Interacções` e `vs. média` passam a estar visíveis mesmo antes da captura de email. Isto altera apenas esta fronteira de acesso; Mix de formatos, Conversas e conteúdo Pro mantêm os acessos actuais.

## Implementação

1. **Troca mínima do relatório por omissão**
   - Fazer o selector comum montar Editorial V2 quando não existe parâmetro.
   - Manter `?report_design=editorial_v2` funcional.
   - Introduzir `?report_design=legacy` como recuo explícito para o relatório anterior.
   - Aplicar o mesmo comportamento em `/analyze/$username` e `/reports/$snapshotId`, preservando os restantes parâmetros, links, partilha e retorno do checkout.
   - Não alterar Admin Preview, Report Lab nem PDF.

2. **Métricas reais em “Melhores e piores publicações”**
   - Mostrar em cada publicação:
     - `Envolvimento`: `post.engagementPct` já carregado;
     - `Interacções`: soma dos `likes + comments` já carregados;
     - `vs. média`: `computeDeltaPct(post.engagementPct, média real da amostra)` através do helper existente.
   - Usar formatação portuguesa e valores reais; sem mocks, novos pedidos, novas fórmulas ou substituição por exemplos.
   - Tornar estas três métricas visíveis no estado anónimo tanto no Editorial V2 como no modo `legacy`, para que o recuo não volte a esconder o conteúdo agora aprovado.
   - Manter o gate de email para os restantes benefícios e secções actualmente protegidas.

3. **Selo e segurança de lançamento**
   - Confirmar que o selo `Editorial V2 · Preview` continua restrito a localhost/preview e nunca aparece nos domínios públicos.
   - Não alterar preços, pagamentos, créditos, entitlement, analytics, dados, benchmarks ou cálculos do relatório.

## Validação

- Actualizar os testes do selector: omissão → Editorial V2; `legacy` → anterior; valor inválido → Editorial V2.
- Testar as duas rotas públicas e a preservação do parâmetro de recuo.
- Testar que os três valores existem no DOM anónimo e correspondem aos dados reais e aos helpers existentes.
- Confirmar que Mix de formatos e Conversas continuam protegidos conforme o contrato actual.
- Executar typecheck e testes focados do Editorial V2/relatório.
- Fazer QA real em `/analyze/frederico.m.carvalho` a 1440px e 375px: Editorial V2 por omissão, métricas preenchidas, sem overflow nem erros de consola.
- Fazer uma verificação de regressão em `/reports/:snapshotId` se existir um snapshot real acessível.

## Risco conhecido que permanece

A ausência de uma compra Pro genuína impede a validação integral das secções Pro e mantém por resolver a divergência de referência de envolvimento 4,80%/5,60%. A troca será feita por decisão expressa, sem alterar nenhum desses números.
