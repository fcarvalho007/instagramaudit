# Refinar o resultado de perfil com leitura limitada

## Diagnóstico confirmado

- A tentativa de **10/10/2026 às 09:33 UTC** terminou com `PROFILE_RESTRICTED` e reutilizou o resultado guardado, sem repetir chamadas pagas.
- Na última leitura real, a ScrapeCreators encontrou o perfil, mas respondeu **“Profile is restricted”** e devolveu zero publicações; a Apify também devolveu zero resultados.
- A leitura complementar da página pública voltou a devolver `null` no servidor. Por isso, o cartão parcial já preparado não apareceu no ecrã enviado.
- O texto atual é demasiado conclusivo: um perfil pode abrir normalmente no navegador e, ao mesmo tempo, não disponibilizar as publicações às fontes automáticas. Não há evidência suficiente para afirmar que o proprietário ativou uma restrição de idade ou país.

## Resultado a apresentar

Substituir o atual ecrã de bloqueio por um **resultado parcial de verificação**, mesmo quando os contadores não podem ser lidos:

```text
Verificação parcial concluída

Encontrámos o perfil @maisensinomaisformacao.
A página pode estar visível no Instagram, mas as publicações não foram
fornecidas às fontes de dados usadas na análise.

Perfil encontrado                         Confirmado
Dados públicos do perfil                  [nome e contadores, quando disponíveis]
Publicações disponíveis para análise      Não
Envolvimento, frequência e benchmark      Não calculados

O que isto significa
O perfil não está necessariamente privado. O Instagram pode mostrar a página
no navegador e limitar a leitura das publicações por serviços externos, sem
indicar publicamente o motivo. Não atribuímos esta limitação ao proprietário.

[Verificar novamente]  [Analisar outro perfil]
```

- Quando nome, seguidores, contas seguidas e número de publicações estiverem disponíveis, mostrá-los no mesmo resultado.
- Quando não estiverem disponíveis, manter o resultado parcial com o `@handle`, o estado de cada verificação e a explicação — nunca voltar ao ecrã vazio atual.
- Identificar claramente que **não existe relatório completo** e que nenhuma métrica foi estimada ou inventada.

## Alterações

1. **Copy rigorosa e transparente**
   - Trocar “Perfil com acesso limitado” por “Verificação parcial concluída”.
   - Remover a afirmação sobre restrição definida pela conta.
   - Explicar a diferença entre visualizar uma página no Instagram e obter publicações para análise.

2. **Cartão parcial sempre visível**
   - Renderizar o cartão para todo o resultado `PROFILE_RESTRICTED`, mesmo se a leitura complementar falhar.
   - Mostrar estados explícitos: perfil encontrado, dados básicos disponíveis/indisponíveis, publicações indisponíveis, métricas não calculadas.
   - Manter os contadores reais como enriquecimento opcional.

3. **Nova verificação controlada**
   - Disponibilizar “Verificar novamente”, com uma chamada fresca protegida contra repetições e custos desnecessários.
   - A repetição volta a consultar as fontes configuradas; não promete ultrapassar uma limitação do Instagram.
   - Manter “Analisar outro perfil” como alternativa.

4. **Registo do que foi verificado**
   - Incluir no resultado a data/hora da última verificação e se o resultado veio de consulta recente ou de resultado guardado.
   - Não expor mensagens técnicas, custos, chaves ou detalhes internos ao cliente.

## Validação

- Testar o caso real `maisensinomaisformacao` com e sem contadores disponíveis.
- Confirmar que o resultado parcial aparece após uma resposta guardada e após uma consulta fresca.
- Confirmar que “Verificar novamente” não cria chamadas repetidas acidentais.
- Validar computador e telemóvel a 375 px, incluindo texto longo e ausência de sobreposição.
- Executar os testes de análise, traduções e verificação de tipos.

## Limites

- Não usar sessão iniciada, cookies, contas falsas, rotação de IPs ou técnicas para contornar proteções do Instagram.
- Não criar métricas a partir dos três contadores do perfil: sem publicações não é possível calcular envolvimento, frequência, formatos ou benchmark com credibilidade.
- Não alterar o relatório completo, preços, créditos, pagamentos, PDF ou comparação V2.
