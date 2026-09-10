# Integrar o trabalho do Codex (comparações fundamentadas)

## O que já foi verificado

- O repositório e o PR estão acessíveis publicamente e foram lidos, incluindo `docs/comparison-v2-rollout.md`.
- O PR parte exactamente do estado actual da main (`7db23e8e`, "Corrigiu preview e métricas"): está 2 commits à frente e 0 atrás.
- Conclusão: **não há conflitos** e nada do trabalho recente feito no Lovable (Editorial V2 por defeito, métricas das publicações) é substituído.
- Dimensão: 88 ficheiros, +2941 / −813. A nova experiência fica atrás de `COMPARISON_V2_ENABLED`, desligada por defeito.

## Como a integração vai ser feita

O repositório do Lovable e o GitHub estão ligados por sincronização. A integração é aplicada aqui, no projecto, e sincroniza para a main no GitHub.

1. Trazer o conteúdo da branch `codex/credible-comparisons` para o projecto (equivalente a um avanço directo, sem resolução de conflitos porque não existem).
2. Confirmar que os ficheiros tocados que também mudaram recentemente no Lovable — o ecrã de análise e a apresentação Editorial V2 — mantêm o comportamento actual.

## Revisão e validação antes de considerar concluído

- Verificação de tipos e arranque da aplicação.
- Bateria de testes completa. As **sete falhas preexistentes** documentadas (uma de escolha de fornecedor, uma de texto de leads, cinco de modelos de email) serão comparadas com o estado anterior para distinguir o que é herdado do que seria uma regressão nova. Qualquer falha nova bloqueia a integração.
- Verificação dirigida a: regras de acesso gratuito/pago, escolha de concorrentes (máximo dois), períodos de 30/90 dias e exportação em PDF.
- Confirmação de que preços, créditos e regras de desbloqueio ficam exactamente iguais.

## Limites desta etapa

- `COMPARISON_V2_ENABLED` fica **desligada**. Nada é activado para clientes.
- Sem publicação do site e sem alterações a dados de produção.
- `PDF_PRINT_SIGNING_SECRET` é opcional; sem ela o sistema usa a chave de serviço já existente. Não será adicionada agora.

## Detalhe técnico

- Origem: `codex/credible-comparisons` @ `27056ec`; base de fusão = tip da main, logo aplicação limpa.
- Áreas tocadas: pipeline de comparação (`src/lib/comparison-readings/*`, novos módulos de cobertura, validação, experiências, exportação), normalização e janelas em `src/lib/analysis/*`, snapshots (`frozen-analysis.ts`, persistência, acesso), PDF (token assinado, documento, estilos de impressão), rotas públicas de snapshot/enriquecimento e apresentação (`observed-indicators`, contexto e fontes de comparação).
- Novo interruptor: `isComparisonV2Enabled()` lê `process.env.COMPARISON_V2_ENABLED` no servidor; por omissão devolve falso.
- Relatórios antigos continuam em `report.v1`; os novos usam `report.v2` com `frozen_analysis`, sem migração nem regeneração.

## O que fica para depois

Antes de ligar a flag: percurso completo de pagamento e exportação em ambiente de teste, revisão de 20 comparações reais, teste com cinco utilizadores pagantes e medição de custos e margem.

## Se algo falhar

Se a sincronização com o GitHub não conseguir escrever na main, o passo alternativo é: no GitHub, tirar o PR #1 de rascunho e carregar em "Merge pull request" — a alteração volta depois para aqui pela sincronização.
