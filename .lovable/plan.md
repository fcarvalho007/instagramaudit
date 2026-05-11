# Final public launch smoke test — InstaBench

Read-only operational checklist. Sem implementação, sem mutação destrutiva. **1 análise pública** + **1 unlock** + **1 email controlado** são as únicas operações de escrita autorizadas; tudo o resto é leitura/inspecção.

## A. Pré-voo (5 min, antes de tocar no preview)

| # | Verificação | Como | Esperado |
|---|---|---|---|
| A1 | Secrets prod | Admin → Cloud → Secrets | `APIFY_ENABLED=true`, `APIFY_TESTING_MODE=false`, `APIFY_HARD_CAP_USD` definido, `OPENAI_ENABLED` conforme decidido, `RESEND_API_KEY` presente |
| A2 | `/admin/sistema` | abrir como admin | Card "Modo público activo" verde; APIFY_TOKEN ✓; allowlist ainda lista (dorment) |
| A3 | Cron cleanup | `psql` ou painel: `SELECT jobname, schedule, active FROM cron.job` | job `cleanup-expired-reports` (ou equivalente) presente. Migration `20260506174050…` confirma criação |
| A4 | Quota diária zerada | `/admin/sistema` ledger | `provider_call_logs` últimas 24h = 0 ou expectável |

## B. Núcleo público (1 análise real autorizada)

| # | Cenário | Passos | Esperado | Aceitação |
|---|---|---|---|---|
| B1 | Homepage anónima | abrir `/` em janela anónima | hero carrega, CTA "Analisar agora" visível, sem links partidos | UI ok, console sem erros |
| B2 | Análise pública fora da allowlist | submeter handle público real **diferente** de `frederico.m.carvalho` | `/analyze/$username` carrega; relatório base renderiza OU mensagem de erro PT clara | 200 + payload OU 4xx/5xx com `ERROR_MESSAGES` PT (sem leak Apify) |
| B3 | Cache hit | repetir B2 (≤15 dias) | resposta imediata; **sem nova linha em `provider_call_logs`** | `data_source=cache` em `analysis_events` |
| B4 | Provider down (simulado) | n/a — apenas confirmar copy de `PROVIDER_DISABLED` em `analyze-public-v1.ts` | mensagem amigável PT já mapeada | inspeção de código (sem mexer em secret) |

## C. Unlock + lead + snapshot (1 unlock real)

| # | Cenário | Passos | Esperado |
|---|---|---|---|
| C1 | Modal abre | clicar "Receber relatório completo" em `/analyze/$username` | `ReportGateModal` abre com 3 campos + 2 toggles |
| C2 | Consentimento RGPD obrigatório | submeter sem `gdpr_consent` | botão bloqueado / erro inline PT |
| C3 | Marketing opcional | submeter só com RGPD = true | aceita; `marketing_consent=false` em `leads` |
| C4 | Unlock sucesso | submeter com email novo | redirect/estado de sucesso; email é enviado |
| C5 | `leads` upsert | `SELECT * FROM leads ORDER BY created_at DESC LIMIT 1` | linha com `commercial_status=novo_pedido`, `beta_consent=true`, `marketing_consent` conforme C3/C4 |
| C6 | `report_snapshots` criado | `SELECT id, instagram_username, expires_at FROM report_snapshots ORDER BY created_at DESC LIMIT 1` | linha imutável, `expires_at` no futuro |
| C7 | `report_requests` linkado | mesma query em `report_requests` | `lead_id` + `report_snapshot_id` preenchidos, `pdf_status` evolve |
| C8 | `/reports/$snapshotId` | abrir em janela anónima com o id | snapshot imutável renderiza (sem precisar login) |

## D. Área autenticada

| # | Cenário | Passos | Esperado |
|---|---|---|---|
| D1 | Login com email do unlock | `/login` magic-link ou password (qual estiver activo) | sessão criada |
| D2 | `/app/reports` | listar | 1 entrada visível (a criada em C6) |
| D3 | `/app/reports/$id` | abrir | mesmo conteúdo de C8 |
| D4 | `/app/account` toggle | alternar consent marketing | `leads.marketing_consent` actualiza + `marketing_consent_at` |

## E. Emails (1 envio controlado)

| # | Cenário | Verificação | Esperado |
|---|---|---|---|
| E1 | Email de relatório | inbox real do email C4 + `email_send_log` ou tabela equivalente | 1 entrada `sent`, sem `error_message` |
| E2 | Welcome / boas-vindas | mesmo log | enviado se sequência configurada (ver `lead-magnet-sequence.server.ts`) |
| E3 | Link unsubscribe | inspecionar HTML do email | presente e aponta para handler válido |
| E4 | Unsubscribe funciona | clicar link | confirma desinscrição; `marketing_consent=false` em `leads` |

⚠️ **Limite estrito: enviar apenas para o email de teste do owner.** Não disparar nada para a lista existente.

## F. Anti-abuso

| # | Cenário | Passos | Esperado |
|---|---|---|---|
| F1 | Rate-limit por IP | repetir B2 com handles diferentes >`PUBLIC_MAX_FRESH_PER_IP_DAY` | 429 `RATE_LIMITED` com mensagem PT |
| F2 | Rate-limit por handle | repetir B2 com mesmo handle (forçando refresh) | 429 idem |
| F3 | Username inválido | submeter `aa$$` | 400 `INVALID_USERNAME` PT |
| F4 | Perfil privado real conhecido | submeter handle privado | 404 `PROFILE_PRIVATE` PT, sem leak |

## G. SEO / discoverability

| # | Verificação | URL | Esperado |
|---|---|---|---|
| G1 | `robots.txt` | `https://instagramaudit.lovable.app/robots.txt` | 200 + Disallow para `/admin`, `/app`, `/api` |
| G2 | `sitemap.xml` | `/sitemap.xml` (rota `sitemap[.]xml.ts`) | 200 + entradas para `/`, páginas legais, etc. |
| G3 | Meta home | view-source `/` | `<title>` único, `<meta description>`, `og:image` |

## H. Admin / CRM

| # | Verificação | Esperado |
|---|---|---|
| H1 | `/admin/beta-leads` | lead C5 visível em "Novo pedido" |
| H2 | `/admin/clientes` Pipeline + Tabela | mesma lead em ambas as vistas |
| H3 | `/admin/sistema` provider calls | última call B2 listada com custo real e `status=success` |
| H4 | `/admin/relatorios` | report C6 listado |

## I. Mobile (375×667)

Abrir `/`, `/analyze/$username` (cache), `/reports/$id`, `/login` em viewport 375. Verificar:
- sem overflow horizontal
- CTAs alcançáveis com polegar
- modal de unlock cabe no ecrã com scroll interno

## J. Critérios de decisão

```
GO          → todos os blocos A,B,C,D,E,F,G passam; H/I sem regressões
GO LIMITED  → núcleo (A,B,C,E1) ok mas falham: G (SEO), I (mobile minor),
              D2/D3 (área autenticada secundária) ou H (cosmético)
NO-GO       → qualquer falha em:
              · A1 secrets · B2 análise pública · C4/C5 unlock+lead
              · E1 email enviado · F1/F4 anti-abuso · cleanup cron ausente
```

## K. Output a devolver no fim do smoke test

1. Marcar cada linha das tabelas A–I com ✅ / ⚠️ / ❌.
2. **Veredicto único**: GO / GO LIMITED / NO-GO.
3. Lista de issues encontrados (id da linha + descrição + severidade).
4. Fixes restantes (ordem de prioridade).
5. Recomendação de lançamento (publicar agora / publicar em modo limitado / adiar com plano).

## L. Confirmações antes de correr o smoke test

Antes de eu (ou tu) executar, preciso confirmar:

1. **Email de teste autorizado** para C4/E1 (sugerido: o teu email pessoal — não a lista).
2. **Handle público** a usar em B2 que **não esteja** na allowlist nem em cache (sugestão: um handle público de baixo risco, ex.: `nasa`).
3. **Posso eu correr este checklist** com `browser--*` + `supabase--read_query` + 1 chamada autorizada à `/api/analyze-public-v1`, ou prefere correr manualmente e que eu apenas valide os resultados?
4. Confirmar que **não queres** incluir teste de pagamento (não há checkout activo — fica fora de escopo).
