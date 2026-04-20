

# Auditoria — bugs e refinamentos

Inspeção end-to-end do código. Achados ordenados por severidade. **Nenhuma alteração feita** — auditoria apenas.

---

## A. Bugs (corrigir)

### A1. Hero viola regra de pt-PT impessoal — **alta prioridade**
`src/components/landing/hero-section.tsx:17`
```
"Analisa o teu Instagram em menos de 30 segundos."
```
Project Knowledge proíbe explicitamente "Analisa", "o teu", "tu". Deve ser:
> "Analisar qualquer perfil de Instagram em menos de 30 segundos."

Esta é a primeira frase que o utilizador vê. Quebra a identidade de tom em todo o resto do produto.

### A2. Concorrentes na hero são UI mortos
`src/components/landing/hero-action-bar.tsx:127-140`
Os dois `Input` de concorrentes não têm `value`/`onChange` nem são lidos no `handleSubmit`. O utilizador escreve `@adidas` + `@puma`, clica "Analisar", navega para `/analyze/nike` **sem `?vs=`**. Promessa visível ≠ comportamento.

Correção mínima: ligar estado + passar como `search.vs="adidas,puma"` no `navigate`.

### A3. Token Apify exposto no query string
`src/lib/analysis/apify-client.ts:57`
```ts
url.searchParams.set("token", token);
```
Apesar de server-side, o token aparece em **logs do Worker, do Apify, e em qualquer trace intermédio**. A própria UI do Apify avisa: "URLs contain your API token. Don't share." Solução: header `Authorization: Bearer <token>`.

Não é crítico funcionalmente, mas é higiene de segurança real (não cosmética).

### A4. Pipeline depende de `INTERNAL_API_TOKEN` mas não está documentado como obrigatório
`run-report-pipeline.ts:142-149` falha com `failed_pdf` se o token não existir. O secret está configurado, mas o `request_status` resultante é confuso (a falha é de email, não de PDF). Refinamento: estado `failed_config` ou `failed_email_auth`.

### A5. Race condition em `lookupSnapshot` + `storeSnapshot`
Duas requests concorrentes ao mesmo handle podem fazer dois scrapes Apify simultâneos (custo duplicado). Aceitável em v1, mas vale registar.

---

## B. Refinamentos (vale fazer)

### B1. Sender de email ainda em sandbox Resend
`send-report-email.ts:32`: `onboarding@resend.dev`. **Só consegue entregar ao dono da conta Resend**. Para enviar a `frederico.carvalho@digitalfc.pt` é preciso domínio verificado. Bloqueia o smoke test E2E mesmo após resolver o Apify.

### B2. PREMIUM_TEASERS hardcoded no dashboard
`public-analysis-dashboard.tsx:25-30`: valores fixos (`"12K – 38K"`, `3 insights`, `5 oportunidades`). Comentário admite "until the real engine ships". Risco: utilizador vê os mesmos números para perfis muito diferentes. Pode parecer pouco credível.

### B3. Falta um botão "Atualizar análise"
Cache de 24h é correto, mas se o utilizador vê dados de ontem não tem como forçar refresh. O endpoint já suporta `?refresh=1` — falta apenas o botão.

### B4. `estimated_posts_per_week` — fallback de 4 semanas é otimista
`normalize.ts:175,178`: quando há <2 timestamps ou janela <7 dias, divide por 4. Para um perfil que postou 12 posts em 1 semana, devolve `3 posts/sem` em vez de `12`. Fórmula assimétrica.

### B5. `data_source: "stale"` não é comunicado na UI
A resposta marca dados servidos por stale-while-error, mas o dashboard não mostra "dados de X dias atrás · provider indisponível". Utilizador não sabe.

### B6. Erros do orchestrator não chegam ao utilizador
Modal mostra "O relatório será enviado nos próximos minutos" e fecha. Se `request_status='failed_pdf'`, o utilizador nunca sabe — fica à espera de um email que nunca chega. Falta mecanismo de fallback (email de erro? polling de status? page de status?).

### B7. PDF: sem polling de status no cliente
Após submeter o gate, não há forma de o utilizador ver progresso. Não é bloqueio mas é UX fraca para algo que demora 60-90s.

---

## C. Observações neutras (não tocar)

- Estado da DB: `snapshots=0, leads=0, requests=0, benchmarks=15` — coerente com o bloqueio Apify atual; nada a recuperar.
- RLS habilitado em todas as 4 tabelas, sem policies — correto para o modelo "tudo via supabaseAdmin server-side". Confirmei que **nenhum componente cliente faz `supabase.from(...)`**.
- Cache de benchmarks (10 min) está bem dimensionado.
- PDF render usa `@react-pdf/renderer` no Worker — funciona com nodejs_compat.
- Idempotência do PDF (`pdf_status='ready'` short-circuit) e do email (lock `delivery_status='sending'`) está bem feita.

---

## D. Recomendação de execução

Sugiro 3 PRs pequenos, em ordem de impacto:

| # | PR | Esforço | Impacto |
|---|----|---------|---------|
| 1 | A1 (copy hero) + A2 (ligar concorrentes) | XS | Alto — primeira impressão e promessa cumprida |
| 2 | A3 (token no header) | XS | Médio — higiene de segurança |
| 3 | B5 + B6 (comunicar stale + falhas do pipeline) | S | Médio — confiança do utilizador |

B1 (domínio Resend) e o desbloqueio Apify são **decisões do utilizador**, não código — ficam fora desta auditoria.

### Checkpoint
- ☑ Auditoria completa (código, copy, segurança, DB, RLS, pipeline)
- ☑ 5 bugs identificados (A1–A5)
- ☑ 7 refinamentos propostos (B1–B7)
- ☐ Decidir qual PR avançar primeiro
- ☐ Smoke test E2E continua bloqueado por Apify (Creator) + Resend (sandbox)

