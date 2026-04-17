
Email já confirmado anteriormente: `frederico.carvalho@digitalfc.pt`. Plano aprovado e parcialmente executado — Passo 1 já mostrou bloqueador upstream definitivo: **Apify devolve `403 public-actor-disabled`** (plano Free não corre public Actors).

Sem upgrade da conta Apify, Passos 2–7 são impossíveis de validar (não há snapshot → não há report_request → não há PDF → não há email). Não vale a pena re-correr o que já foi diagnosticado conclusivamente.

## Opções concretas para o utilizador

**(A) Upgrade Apify Starter ($49/mês)** → re-corro smoke test completo Passos 2–7, valida tudo até entrega física de email para `frederico.carvalho@digitalfc.pt`.

**(B) Investigar alternativas ao Apify** → plano dedicado: scrapers compatíveis com Worker, custo, esforço de migração, qualidade de dados. Sem código.

**(C) Validar apenas pipeline downstream com snapshot sintético** → injectar manualmente uma `analysis_snapshots` row com `normalized_payload` real (estrutura conhecida), correr `request-full-report` + pipeline → valida PDF runtime + Resend sandbox sem depender do Apify. **Não valida Apify**, mas isola e valida tudo o resto. Útil se queres provar que `@react-pdf/renderer` no Worker funciona antes de gastar nos $49.

Qual?

## Guardrails

| | |
|---|---|
| Zero código novo | ✅ |
| Zero refactor | ✅ |
| Locked files intactos | ✅ |
| Pt-PT preservado | ✅ |
| Apenas observação + diagnóstico | ✅ |
