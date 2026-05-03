
## Ativar Instagram Comment Scraper

O código já está pronto. A única ação necessária é criar o secret `COMMENT_SCRAPER_ENABLED` com o valor `true`.

### O que acontece ao ativar

1. Cada análise em `/analyze/$username` passa a invocar o actor `apify/instagram-comment-scraper`
2. Seleciona até 3 posts (os com mais comentários), extrai até 20 comentários cada, com replies
3. Guardrails ativos: max charge $1.50/run, timeout 120s, cap total 60 comentários
4. O custo real é registado em `provider_call_logs` e visível em `/admin` (Despesas + Sistema)
5. O bloco Q05 no relatório mostra os dados de comment intelligence

### Passo único

- Adicionar secret `COMMENT_SCRAPER_ENABLED` = `true`

Nenhum ficheiro precisa de ser alterado.
