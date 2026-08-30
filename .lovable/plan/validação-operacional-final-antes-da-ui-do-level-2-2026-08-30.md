# Validação operacional final antes da UI do Level 2

Sem alterações de arquitectura nem de interface. Apenas execução real, observação e relatório. Os únicos ficheiros criados são scripts temporários em `/tmp` (apagados no fim) e, se necessário, ajustes de variáveis de ambiente de provider.

## Estado já verificado (read-only)

Suite completa executada agora: **988 testes, 981 verdes, 7 vermelhos em 3 suites** — `send-commercial-followup` (5), `lead-context-labels` (1), `premium-cta-unification` (1). Todos fora do âmbito de providers (mocks de tabelas de email e copy de labels). Não serão corrigidos.

## 1. ScrapeCreators E2E (perfil de teste do Parity Test)

Com `SOCIAL_PROVIDER_PROFILE/POSTS/COMMENTS=scrapecreators`, executar uma auditoria real através da rota da aplicação e registar: perfil, baseline, engagement, posts, `video_plays`, janela 30d, janela 90d e Comment Intelligence.

Para poupar créditos: uma única auditoria baseline + uma janela alargada; 30d e 90d validados sobre a mesma resposta sempre que o cutoff o permitir. Sem repetições desnecessárias.

## 2. Telemetria real

Para cada chamada: `endpoint`, `credits_charged`, `credits_remaining`, `cached`, e confirmação da linha correspondente em `provider_call_logs`. A API key nunca é impressa nem registada.

Repetição controlada de **uma** chamada dentro do TTL para confirmar `cached=true` e `credits_charged=0`.

## 3. Fallback real

- A) ScrapeCreators indisponível (credencial temporariamente inválida no processo de teste) → confirmar que a operação conclui via Apify, sem duplicar chamadas.
- B) `SOCIAL_PROVIDER_*=apify` com a Apify a devolver bloqueio de budget/quota → confirmar fallback para ScrapeCreators.

Em ambos, verificar máximo de duas tentativas por operação e ausência de dados duplicados.

## 4. Comment Intelligence

Confirmar limite efectivo de 5 posts × 4 comentários na ScrapeCreators, que `COMMENT_SCRAPER_MAX_CHARGE_USD=0.05` não bloqueia a ScrapeCreators (modelo de créditos, custo monetário 0 nos créditos promocionais), que esse cap se aplica à Apify quando usada como fallback, e que comentários já obtidos não são repedidos ao segundo provider.

## 5. Relatório final

PASS/FAIL por teste operacional, chamadas reais efectuadas, créditos ScrapeCreators consumidos, chamadas Apify consumidas, fallback comprovado ou não, bloqueios remanescentes. Se tudo verde: READY FOR LEVEL 2 UI.

## Notas técnicas

- Requer `SCRAPECREATORS_API_KEY` e `APIFY_TOKEN` presentes no ambiente. Se faltar alguma, essa parte é reportada como BLOCKED em vez de simulada.
- Custo estimado: ~6–10 créditos ScrapeCreators e, no teste de fallback A, 1–2 runs Apify (aprox. $0.01–0.06).
- Nenhuma variável de ambiente de produção fica alterada no fim; overrides são apenas por processo de teste.
