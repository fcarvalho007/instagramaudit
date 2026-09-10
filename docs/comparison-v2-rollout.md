# Comparações fundamentadas — versão de ativação controlada

A nova comparação transforma os dados públicos recolhidos em observações verificáveis, hipóteses e experiências propostas. Preserva os preços, o limite de dois concorrentes manuais e a sequência das secções. A decisão de lançar depende das validações externas abaixo.

## Ativação e compatibilidade

- `COMPARISON_V2_ENABLED=true` ativa novas recolhas e a entrada opcional de objetivo, setor e mercado. Por defeito fica desligada. A aplicação continua a respeitar o controlo existente de acesso Pro, os limites de 30/90 dias, os limites por conta e os orçamentos dos fornecedores.
- A apresentação usa a versão persistida, pelo que desligar a flag não torna os relatórios já gerados ilegíveis. Relatórios históricos antigos mantêm `report.v1`; os novos usam `report.v2` com `frozen_analysis`. Não há migração nem regeneração geral.
- O identificador de cache inclui versão, contas, janela e contexto normalizado. A comparação guarda uma entrada independente por conta e janela, identificada pelo hash das evidências, modelo e versão do prompt. Reabrir a mesma entrada não chama novamente a IA. A cobrança mantém o mecanismo existente de reserva/confirmação de créditos.
- A exportação recebe uma autorização assinada para um único snapshot, com validade de dez minutos. Configurar `PDF_PRINT_SIGNING_SECRET`; quando omitida, usa a chave de serviço Supabase já existente. Nunca colocar estas chaves no frontend. PDFs gratuitos e Pro da nova versão têm caminhos distintos. Os endpoints por identificador aplicam a mesma filtragem de acesso que o endpoint por perfil.
- As janelas representam publicações desse período e interações observadas na recolha. Não reconstituem seguidores anteriores, alcance, retenção, vendas ou retorno comercial.

## Contrato analítico

As duas contas usam os contratos do normalizador, o relógio da recolha e o helper canónico de cadência. O detalhe alargado deixa de ser cortado em 12 publicações; o limite de base continua a ser 12. As publicações fixadas são tratadas pela data. Uma conta privada ou uma falha de fornecedor não apaga as outras.

Cada conta guarda limites pedidos, datas efetivamente observadas, dimensão da amostra, limite de recolha e cobertura completa/parcial/amostra. Só há equivalência temporal quando ambos os intervalos absolutos coincidem e a cobertura é completa. Cobertura parcial, desconhecida ou amostras pequenas impedem experiências comparativas automáticas e reduzem a confiança.

As métricas agregadas usam todas as publicações elegíveis; a análise editorial recebe até 24 exemplos determinísticos distribuídos por data e desempenho. Medianas e concentração de interações reduzem a dependência de uma publicação excecional. Métricas de posts não recolhidas não são convertidas em zero nas evidências. Seguidores iguais a zero não permitem calcular uma taxa por seguidores.

A validação compara cada valor com o campo indicado, recompõe os rótulos/unidades no servidor e verifica literalmente os excertos. As observações publicadas são frases determinísticas construídas a partir desses campos; a interpretação fica separada. Links provêm exclusivamente da publicação identificada. Instruções em legendas, bios e contexto são tratadas como dados não fiáveis. A prosa numérica sem associação a um campo é rejeitada, sem recuperação de texto inválido para preencher cartões.

As experiências têm hipótese, execução, esforço, duração, quantidade proposta de publicações e critério de avaliação. Os números do teste são parâmetros propostos. Não é obrigatório preencher três cartões. Sem concorrente, só há propostas conservadoras ligadas a exemplos reais do próprio perfil; uma amostra insuficiente pode produzir nenhuma.

Os comentários podem ter sinais simultâneos de pergunta, intenção comercial e reclamação. A taxa de resposta só pode ser usada quando a recolha de respostas estiver explicitamente confirmada. Perguntas detetadas não são apresentadas como perguntas sem resposta.

## Metodologia e persistência

Na nova versão, indicadores de envolvimento, cadência e cobertura substituem a apresentação do índice global. As referências atuais não têm comprovação de compatibilidade suficiente para atribuir uma classificação. A ausência de benchmark comparável fica congelada no snapshot com a fórmula observada e data de verificação. `compatibleMethodology` exige numerador, denominador, agregação, população, âmbito de formatos, fonte, data, versão e fórmula; um novo dataset deve passar essa validação antes de ser ligado ao cálculo.

O histórico só é congelado após estados terminais dos enriquecimentos, incluindo erros e resultados parciais. O consumidor das tarefas preserva patches parciais e faz uma aquisição atómica da tarefa para impedir duas execuções concorrentes. Página, histórico e PDF leem a mesma coleção persistida. Exportações enquanto a análise termina são recusadas para não guardar um PDF incompleto em cache.

## Verificação realizada e limites

- Testes automáticos de normalização, ausência/zero, datas, fixados, amostras pequenas e parciais, seleção de conta/janela, excertos inexistentes, números na métrica errada e instruções maliciosas.
- Testes com fornecedor simulado: duas contas, concorrência, falha parcial, recuperação apenas da conta que falhou, recusa por orçamento e reutilização sem novas chamadas.
- Testes de igualdade dos resultados destinados à apresentação, histórico e exportação; assinatura de acesso ao PDF; prioridade sem preenchimento artificial; renderização dos componentes e bloqueio para visitantes gratuitos.
- Vinte casos **sintéticos** exercitam os contratos numéricos. Não equivalem às vinte comparações reais de vários setores exigidas para lançamento.
- Pré-visualização local dos novos indicadores, evidências e experiências verificada no navegador. Não equivale a validar o fluxo de pagamento completo nem a paginação produzida pelo fornecedor externo de PDF.
- A bateria original tem sete falhas reproduzidas no commit `5ec724c`: uma expectativa de seleção de fornecedor ScrapeCreators, uma expectativa de texto de contexto de leads e cinco mocks desatualizados de templates de email. Estão fora deste trabalho. O lockfile original também não permite `npm ci`; a instalação local usou as dependências declaradas sem modificar o lockfile.

Resultado da verificação local: TypeScript sem erros; build de produção concluído; bateria completa com **1292 testes aprovados, 7 falhas preexistentes e 5 testes ignorados** (1304 testes). As sete falhas foram reproduzidas numa cópia intacta do commit de base.

## Condições antes de ativar em produção

1. Preparar um ambiente de teste com credenciais de teste de pagamento, armazenamento, fornecedores e PDF, e os mesmos limites de orçamento usados no produto. Executar pagamento → desbloqueio → recolha → geração → seleção entre duas contas → 30/90 dias → exportação. Repetir eventos de pagamento e reabrir resultados para confirmar que não há débitos ou chamadas duplicados.
2. Rever vinte comparações **reais**, de vários setores, incluindo imobiliário. Registar contas, período, cobertura, evidências, todas as afirmações factuais, erros materiais e decisão. Nenhum erro material pode permanecer. A verificação automática de campos e excertos não prova a correção semântica de todas as hipóteses editoriais.
3. Testar com cinco utilizadores pagantes: pelo menos quatro devem identificar uma diferença relevante e escolher uma ação concreta sem explicação adicional. Não foi realizado neste trabalho.
4. Medir por relatório a duração total, falhas, reutilização, custos reais de todos os fornecedores e margem. `provider_call_logs` mantém duração, tokens e custos estimados/reais; os testes apenas confirmam emissão e ausência de chamadas repetidas. As estimativas de tokens não substituem faturas reais.
5. Acompanhar `comparison_selected`, `comparison_evidence_opened`, avaliação de utilidade, reembolsos e recompra. Comparar esses sinais com os custos antes de mudar preços ou alargar a oferta.

A flag deve continuar desligada até estes pontos estarem concluídos. Não foi efetuado deployment nem qualquer cobrança real durante esta implementação.
