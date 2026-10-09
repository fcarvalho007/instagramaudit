## Diagnóstico confirmado — @maisensinomaisformacao

Tens razão: a ScrapeCreators é a fonte principal e a Apify a de reserva. O que aconteceu foi isto:

1. A ScrapeCreators recusou o pedido porque **a conta ficou sem créditos** (resposta confirmada agora: "Looks like you're out of credits").
2. A app passou automaticamente para a Apify, como previsto.
3. A Apify não conseguiu ler este perfil e não devolveu nada. Por isso, a app mostrou "perfil não encontrado", apesar de o perfil existir e ser público.
4. Os registos só guardam a última fonte usada, que foi a Apify. Por isso, a falta de créditos não aparecia no admin. Nos últimos 30 dias, todas as análises passaram pela Apify sem se notar.

## O que precisas de fazer (fora da app)

- Comprar créditos na ScrapeCreators. A chave atual mantém-se e não é preciso alterar nada na app.

## O que vou corrigir na app

1. **Registar todas as tentativas.** Cada análise passa a registar a falha da ScrapeCreators (por exemplo, sem créditos) e também a chamada à Apify. Assim, ambas as fontes aparecem nos custos e nos erros.
2. **Alerta no admin.** Em Sistema, aparece um aviso "ScrapeCreators sem créditos — a usar Apify" sempre que isso acontecer nas últimas 24 horas.
3. **Mensagem honesta.** Quando a fonte de reserva não devolve dados, o utilizador deixa de ver "não encontrado" e passa a ver: "Não conseguimos ler este perfil neste momento. Tenta novamente mais tarde." A mensagem "não encontrado" só aparece quando a fonte principal o confirmar.
4. **Evitar cobranças repetidas.** Um resultado vazio fica guardado durante 15 minutos para o mesmo perfil. Hoje houve 4 tentativas pagas seguidas.
5. **Testes** para os pontos 1, 3 e 4.

Mantêm-se os preços, os créditos, as regras de acesso e a ordem das fontes.

## Detalhes técnicos
- Prova obtida: `GET /v1/instagram/profile` respondeu com HTTP 402. Em 30 dias, `provider_call_logs` tem apenas linhas `apify`: 31.
- `withFallback` em `providers/router.server.ts` passa a devolver as tentativas falhadas. `fetchProfileWithPostsLogged` escreve uma linha `status=error` para cada uma, com `http_status=402` e `error_excerpt`.
- Novo código `PROFILE_UNREADABLE` (pt/en em `errors.json`) quando `fellBack=true` e `row` é nulo. `PROFILE_NOT_FOUND` fica reservado para o vazio do primário.
- A cache negativa existente passa a cobrir os resultados vazios, com TTL de 15 minutos.
- O alerta do admin usa uma consulta a `provider_call_logs` (`provider=scrapecreators`, `http_status=402`, 24h).
