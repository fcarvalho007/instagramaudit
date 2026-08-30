# Cinco verificações antes da UI do Level 2

Validação operacional dentro da aplicação real (rotas, snapshots, telemetria persistida), não ao nível dos adaptadores. Sem alterações de UI e sem mexer em arquitectura, salvo se uma verificação revelar um defeito real.

## 1. Auditoria end-to-end só com ScrapeCreators

Correr a rota real `POST /api/analyze-public-v1` contra o servidor local, com `SOCIAL_PROVIDER_PROFILE/POSTS/COMMENTS=scrapecreators`, em três passagens:

- baseline (sem `window`)
- `window=30d`
- `window=90d`

Para cada uma, verificar no payload devolvido e no snapshot persistido: perfil, métricas de engagement, número de publicações efectivamente dentro da janela, `analysis_window_observed_days`, `analysis_window_truncated`, formatos, heatmap e `video_plays`.

Depois, Comment Intelligence pelo caminho real: `POST /api/public/enrich-comments` com o `snapshot_id` produzido acima, confirmando o patch do snapshot, o estado do job (`success`) e o conteúdo do bloco de comentários.

Perfil: `frederico.m.carvalho` para baseline/30d/90d. Como as publicações desse perfil têm zero comentários, o Comment Intelligence é validado num segundo snapshot de um perfil público com comentários reais (`pingodoce`), senão a verificação não prova nada.

## 2. Fallback real dentro da aplicação

- **A.** Forçar falha controlada da ScrapeCreators (chave inválida no processo do servidor) e repetir uma auditoria; confirmar que o relatório conclui via Apify, que o utilizador não vê erro nem degradação visível, e que o `provider_call_logs` regista a troca.
- **B.** Colocar `SOCIAL_PROVIDER_*=apify` e simular esgotamento de orçamento/quota; confirmar conclusão via ScrapeCreators.

Em ambos: nenhuma duplicação de dados, um único snapshot, contagem de chamadas por fornecedor registada.

## 3. Telemetria de créditos observada no log da aplicação

Numa chamada real, confirmar no log e na linha de `provider_call_logs`:

```text
provider: scrapecreators
endpoint: /v1/instagram/profile
credits_charged: 1
credits_remaining: <n>
cached: false
```

Depois repetir a mesma chamada e registar o valor observado de `cached` e `credits_charged`. Nota já apurada na sessão anterior: na repetição do endpoint de perfil, a API devolveu `cached=false` e cobrou novamente. Esta verificação serve para o confirmar dentro da aplicação e documentar honestamente que não existe cache do lado do fornecedor para este endpoint — o cache efectivo é o snapshot de 24 h. Nada será afirmado sem log.

## 4. O limite de $0.05 não pode travar a ScrapeCreators

Confirmado por leitura de código: `COMMENT_SCRAPER_MAX_CHARGE_USD` só é lido dentro de `comment-scraper.server.ts`, que é o caminho Apify; a rota de comentários chama o router com apenas `perPostLimit`, sem qualquer teto em dólares. Falta a prova em execução:

- com a ScrapeCreators como fornecedor de comentários, confirmar cinco chamadas efectuadas e `budgetBlocked` ausente do fluxo;
- com a Apify como fallback, confirmar que o mesmo teto continua a ser aplicado e regista `budget plan` com `estimatedMaxCostUsd ≈ 0.046`.

Se a execução mostrar o teto a bloquear a ScrapeCreators, corrige-se nesse ponto.

## 5. Esclarecer os 7 testes vermelhos

Sem correcções. Apenas confirmar explicitamente, por execução isolada de cada suite e leitura dos respectivos imports:

| Suite | Testes vermelhos | Toca em ficheiros desta alteração? |
| --- | --- | --- |
| `src/routes/api/admin/__tests__/send-commercial-followup.test.ts` | 5 | a confirmar |
| `src/components/admin/v2/beta-leads/__tests__/lead-context-labels.test.ts` | 1 | a confirmar |
| `src/components/admin/v2/__tests__/premium-cta-unification.test.ts` | 1 | a confirmar |

Resultado esperado: 7 vermelhos, 3 suites, todos pré-existentes e nenhum a importar os ficheiros de providers/normalização alterados. Se algum tocar, é reportado como regressão em vez de ser classificado como pré-existente.

## Custos e riscos

- Estimativa: ~15 a 25 créditos ScrapeCreators e 2 a 3 runs Apify (só nos testes de fallback).
- As chamadas reais gravam linhas em `provider_call_logs` e `analysis_events`; os snapshots criados são reais e expiram pelo TTL normal.
- Chaves nunca são impressas, registadas nem incluídas no relatório final.
- Se um limite mensal ou de concorrência disparar durante os testes, é reportado como observação e não contornado.

## Entrega final

PASS/FAIL por verificação, chamadas reais efectuadas por fornecedor, créditos consumidos, evidência de telemetria (sem segredos), defeitos encontrados e o veredicto sobre avançar para a UI do Level 2.
