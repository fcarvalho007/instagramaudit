# Ronda 3.5 — Validação E2E do fluxo anónimo em staging

Objectivo: provar, com execução real, que um visitante sem identificação chega ao relatório. Sem captura de email, sem unlock de Comment Intelligence, sem autenticação, sem redesenho de UI.

## Configuração de teste (apenas no ambiente de pré-visualização)

`PUBLIC_BASELINE_NO_EMAIL=true`, `PUBLIC_ANON_MAX_FRESH_PER_IP_DAY=10`, `PUBLIC_ANON_MAX_FRESH_PER_IP_HOUR=4`, aplicados só ao processo de teste. Em produção a flag mantém-se `false` e isso é reconfirmado no relatório final.

## 1. Percurso anónimo real

Sessão limpa (contexto de browser novo, sem cookies nem storage): landing → introduzir perfil → loading → Auditoria Instantânea.

Verificações: nenhum modal, nenhum pedido de email/password, nenhum utilizador de auth criado, nenhuma `lead_session` exigida, snapshot criado, provider utilizado, relatório renderizado, refresh mantém o relatório, repetição do mesmo perfil dentro do TTL serve cache.

Confirmação por base de dados: contagem de `auth.users` e `leads` antes/depois, linha em `analysis_snapshots` e linhas em `provider_call_logs` (provider, endpoint, créditos, `cached`).

## 2. Primeiro viewport

Capturas em desktop e mobile. Verificar que perfil, seguidores, publicações analisadas, período observado, engagement, leitura qualitativa e pelo menos uma descoberta concreta são identificáveis sem blur, overlay ou convite a email a tapar o resultado.

## 3. Copy (única alteração de código prevista nesta ronda)

- `report.json` PT: "Auditoria Instantânea · {{accessible}} secções disponíveis" → "… secções analisadas". EN: "sections available" → "sections analysed".
- Nova varredura PT/EN de linguagem de posse **no que é visível no estado anónimo** (landing, loader, erros, relatório público). Substituir por "este perfil", "o perfil", "os seguidores", "as publicações". Emails, checkout, beta e área privada ficam fora — aí o perfil já é declarado.
- Teste automático que falha se a copy do estado anónimo contiver "o teu perfil", "a tua conta", "os teus seguidores", "a tua marca", "o teu conteúdo".

## 4. Placeholders da Ronda 4

Recomendação: em estado anónimo, remover da UI os dois botões que hoje terminam em "disponível em breve" (`InstantAuditBar` → "Guardar esta auditoria" e `DeepenAnalysisCta` → "Aprofundar a análise"), mantendo o rótulo "Auditoria Instantânea" e os componentes/pontos de integração em código, comentados `// Ronda 4:`. Assim nada parece funcional sem o ser. A decisão fica registada no relatório final.

## 5. Limites

Com o tecto horário reduzido temporariamente no processo de teste, executar e observar contadores: fresh com sucesso conta; cache hit não conta; falha de perfil não conta; repetição dentro do TTL não conta; a análise acima do tecto horário é bloqueada com mensagem controlada; janela horária/diária expira como esperado (validada por manipulação de `now`/timestamps em teste, não por espera real).

## 6. Analytics

Ler `product_events` e confirmar a sequência `landing_view` → `instagram_handle_submitted` → `anonymous_analysis_started` → `anonymous_analysis_success` → `instant_audit_viewed`, mais marcos de scroll. Confirmar ausência de duplicados após rerender, refresh, mudança de viewport e regresso ao separador.

## 7. Mobile

Validar 320, 375, 390 e 430 px: hero, teclado, submit, loading, resultado acima da dobra, cards, erros e scroll.

## Entrega

PASS/FAIL por cenário, screenshots dos estados relevantes, chamadas de provider consumidas, eventos observados, problemas encontrados, correcções feitas (apenas defeitos reais) e confirmação de que a flag está desactivada em produção. `READY FOR ONBOARDING ROUND 4` só se o percurso anónimo completo for comprovado.

## Notas técnicas

Ficheiros previstos: `src/i18n/locales/{pt,en}/report.json` (e outros ficheiros de copy só se a varredura encontrar linguagem de posse no estado anónimo), `src/components/product/instant-audit-bar.tsx` e `deepen-analysis-cta.tsx` (ocultar acções não funcionais), novo teste de copy e testes de limites. Scripts de validação ficam em `/tmp` e são apagados. Custo estimado: 2–4 análises fresh reais.
