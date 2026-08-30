# Baseline gratuita bloqueada por créditos — correcção

## O que aconteceu (confirmado)

Não é uma avaria. É a configuração actual do produto.

- Às 15:06 UTC o evento registado para `frederico.m.carvalho` foi `blocked_credits` / `INSUFFICIENT_CREDITS`. Todas as análises anteriores (14:52–14:54) tinham corrido com sucesso a partir de cache, com outro lead.
- A flag `PUBLIC_BASELINE_NO_EMAIL` não está definida em lado nenhum, logo assume `false`. Com ela desactivada, o endpoint público exige sessão de lead e cobra 1 crédito por análise, mesmo na auditoria base.
- O lead associado à sessão do browser tem saldo 0 (a tabela de leads mostra vários leads já a 0 depois de gastarem os 2 créditos iniciais).

Ou seja: as Rondas 3 e 4 construíram a auditoria anónima de nível 1, mas nunca foi ligada em produção — continua tudo a passar pelo gate de créditos antigo.

## Incoerência adicional encontrada

Mesmo activando a flag, a baseline anónima só corre quando **não existe** cookie de lead:

```text
anonymousBaseline = flag && sem concorrentes && janela baseline && lead_session === null
```

Quem já se registou (e ficou com 0 créditos) continua bloqueado na auditoria base — exactamente o cenário reportado. Um utilizador identificado ficaria com menos acesso do que um visitante anónimo.

## Alterações propostas

1. **Activar a baseline sem email em produção**: definir `PUBLIC_BASELINE_NO_EMAIL=true`.
2. **Tornar a baseline gratuita também para leads identificados**: em `src/routes/api/analyze-public-v1.ts`, deixar de exigir `lead_session === null`. A condição passa a ser: flag activa, sem concorrentes, janela baseline, sem bypass interno. Se existir lead, continua a ser lido e o snapshot associado (para histórico em `/app/reports`), mas sem reserva nem consumo de crédito.
3. **Manter os gates onde importa**: créditos e email continuam a proteger o nível 2 (Comment Intelligence), concorrentes e janelas 30d/90d. Nada muda nesses caminhos.
4. **Limites de abuso**: a baseline passa a depender apenas do rate limiting público já existente (10/dia e 4/hora por IP) e do cache de 24h, que já estão implementados.
5. **Testes**: cobrir que a baseline com lead de saldo 0 devolve sucesso e não escreve em `credit_ledger`, e que concorrentes/30d/90d continuam a exigir crédito e entitlement.

## Notas técnicas

- Ficheiro principal: `src/routes/api/analyze-public-v1.ts`, bloco do gate de créditos (~linhas 663-700).
- O caminho de reserva/confirmação/libertação de crédito mantém-se intacto para os restantes casos.
- Sem alterações a `/report.example`, pagamentos, Pro ou ao onboarding visual.
- Custo por análise base não muda; a protecção passa a ser cache + rate limit por IP + caps mensais de provider já existentes.

## Alternativa mais conservadora

Se preferires não abrir já a baseline gratuita, a opção mínima é apenas atribuir créditos adicionais ao teu lead de teste. Resolve o teste imediato, mas mantém o funil antigo (email obrigatório antes de qualquer valor) e o mesmo bloqueio para leads reais que gastem os 2 créditos.
