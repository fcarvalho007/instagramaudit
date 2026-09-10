# Rever a comparação V2 em isolamento e integrar pelo GitHub

## Situação actual — a comunicar antes de mais

O pedido chega depois de a integração já ter sido aplicada. O conteúdo do PR está
neste projecto no commit `bcab66cd` ("Integrou comparação V2 do Codex"), que fica
na main e sincroniza para o repositório. Não existe forma de criar aqui uma branch
isolada: qualquer alteração de ficheiros neste projecto entra na main.

Ou seja, a condição "rever numa branch separada antes de escrever na main" não foi
cumprida, e a integração foi feita por aplicação de ficheiros, não pelo merge do
PR #1 com os commits originais.

Este plano corrige isso.

## Passo 1 — Anular a integração feita por cópia

Reverter o commit `bcab66cd`, devolvendo o projecto ao estado anterior
(`7db23e8e` + trabalho local). Fica sem a comparação V2 até o merge oficial.

## Passo 2 — Revisão isolada, fora do projecto

Clonar a branch `codex/credible-comparisons` para uma pasta temporária do
ambiente de trabalho (fora do projecto, logo sem sincronização) e correr aí:

- verificação de tipos e compilação de produção;
- bateria completa de testes, comparada com a mesma bateria na base, para separar
  as sete falhas herdadas de regressões novas.

## Passo 3 — Revisão com a flag desligada

Com `COMPARISON_V2_ENABLED` ausente, verificar explicitamente o que muda mesmo
assim, porque o PR toca em código partilhado:

- prioridades e diagnóstico do relatório pago;
- fronteiras gratuito / com email / pago em todas as secções;
- abertura de relatórios antigos (`report.v1`) sem regeneração;
- exportação em PDF, incluindo o caminho gratuito e o pago;
- normalização de métricas e janelas de 30/90 dias;
- selecção de concorrentes (máximo dois) e preços/créditos inalterados.

Qualquer diferença de números ou de acesso com a flag desligada é bloqueante.

## Passo 4 — Integração pelo GitHub

Depois da revisão aprovada, o PR #1 é integrado no GitHub preservando os commits.
Não tenho ligação autenticada ao GitHub, por isso este passo é teu: tirar o PR de
rascunho e carregar em "Merge pull request". O conteúdo volta depois para aqui
pela sincronização.

Se preferires, indico em vez disso a ordem exacta de comandos para fazeres o merge
localmente no teu clone.

## Limites desta etapa

- `COMPARISON_V2_ENABLED` fica desligada.
- Sem publicação do site e sem alterações a dados de produção.
- Nada de merge manual por cópia de ficheiros.

## Entrega final

Commit efectivamente integrado, resultado dos testes na branch e na base, resultado
das verificações com a flag desligada, e a lista do que fica por validar antes de
ligar a nova comparação (ambiente de teste de pagamentos, vinte comparações reais,
cinco utilizadores pagantes, custos e margem).
