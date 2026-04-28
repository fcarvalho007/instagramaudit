# Abrir análise pública a qualquer perfil Instagram

## Diagnóstico

A mensagem "Análise indisponível — este teste está limitado aos perfis definidos" vem de `/api/public/analyze-public-v1` quando o handle não está na allowlist do **Apify** (não do OpenAI). Confirmado em:

- `src/routes/api/analyze-public-v1.ts:94` — texto da mensagem (`PROFILE_NOT_ALLOWED`).
- `src/routes/api/analyze-public-v1.ts:355-373` — gate que rejeita o pedido antes de qualquer chamada ao provider.
- `src/lib/security/apify-allowlist.ts:27-29` — `isTestingModeActive()` devolve `true` por defeito (`APIFY_TESTING_MODE !== "false"`).

O secret `APIFY_ALLOWLIST` actualmente só inclui `frederico.m.carvalho`, por isso qualquer outro username é bloqueado em modo "testing".

## Implicações de abrir a qualquer perfil

Tirar a allowlist significa que **qualquer visitante anónimo** que entre em `/` e escreva um username vai disparar uma chamada paga ao Apify. Antes de fazer o flip, há três salvaguardas a confirmar:

1. **Custo por análise**: cada run do `apify/instagram-scraper` com `POSTS_LIMIT=12` para 1 perfil + até 2 concorrentes custa tipicamente entre $0.01–$0.05 (estimativa registada em `provider_call_logs.estimated_cost_usd`).
2. **Cache**: snapshots frescos são reutilizados durante o TTL — pedidos repetidos do mesmo handle não voltam a custar.
3. **Kill-switch**: `APIFY_ENABLED` continua a controlar tudo. Em qualquer momento podes pôr `APIFY_ENABLED=false` e o sistema serve só cache/stale.

O que **não** existe ainda: rate-limit por IP, captcha, ou cap diário de gastos do Apify. O modo "testing" era exactamente esse cap. Tirá-lo é uma decisão consciente.

## O que este prompt vai fazer

### 1. Flip do secret `APIFY_TESTING_MODE` para `false`

Vou pedir-te via `update_secret` para mudar `APIFY_TESTING_MODE` para o valor literal `false`.

Resultado: `isTestingModeActive()` passa a devolver `false`, o gate de allowlist é saltado para o handle primário **e** para concorrentes, e qualquer username Instagram válido (`/^[A-Za-z0-9._]{1,30}$/`) é aceite.

### 2. Manter o OpenAI travado à allowlist

Decisão importante: o OpenAI continua restrito a `frederico.m.carvalho` via `OPENAI_TESTING_MODE=true` + `OPENAI_ALLOWLIST`. Razões:

- OpenAI é mais caro por chamada que o Apify (~$0.005–$0.02 por análise com `gpt-4.1-mini`).
- Os insights ainda não foram validados em volume — abrir agora arrisca alucinações em produtos reais sem revisão humana.
- O kill-switch `OPENAI_ENABLED` continua em `false` até decidirmos o smoke test.

A consequência é que perfis novos vão ter:
- Análise Instagram completa (Apify) ✅
- Benchmarks e recomendações deterministas ✅
- Sem secção "Leitura estratégica" gerada por OpenAI (cai para o fallback existente)

### 3. Sem alterações de código

A allowlist do Apify é um simples `if (!isAllowed(primary))`. Quando `APIFY_TESTING_MODE=false`, `isAllowed()` devolve `true` para tudo. **Não é preciso mudar nem uma linha.**

### 4. Validação manual

Depois do flip, podes testar imediatamente em `/` com qualquer username (ex.: `cristiano`, `nasa`, `nike`). Se quiseres, posso fazer eu o smoke test invocando `POST /api/public/analyze-public-v1` com um handle real e mostrar a resposta + custo registado em `provider_call_logs`.

## O que NÃO vai fazer

- Alterar `APIFY_ENABLED` (já está `true` se quiseste analisar mais perfis — vou confirmar).
- Mexer em `APIFY_ALLOWLIST` (irrelevante quando testing mode está desligado).
- Tocar no OpenAI (allowlist e kill-switch ficam exactamente como estão).
- Adicionar rate-limit ou CAP de custo (proponho como follow-up, não inclui aqui).

## Follow-ups recomendados (próximos prompts, não agora)

1. **Cap diário Apify**: copiar a lógica que já existe para o OpenAI (`OPENAI_DAILY_CAP_USD`) e criar `APIFY_DAILY_CAP_USD`. Quando o ledger acumulado nas últimas 24h ultrapassar o cap, recusar pedidos novos com `PROVIDER_DISABLED`.
2. **Rate-limit por IP** (`request_ip_hash` já é registado em `analysis_events`): bloquear >5 análises distintas/hora do mesmo hash.
3. **Detecção de abuso no admin**: alertas quando o mesmo perfil é analisado >10x/dia (sintoma de scraping ou loop).

## Validação

- Secret `APIFY_TESTING_MODE` actualizado para `false`.
- `bunx tsc --noEmit` (não há código novo, só por hábito).
- Smoke test opcional via `invoke-server-function` num handle público (ex.: `nasa`) para confirmar 200 + snapshot + custo registado.

## Returns

- Confirmação de que era a allowlist do Apify, não a do OpenAI, que estava a bloquear.
- Único passo operacional: actualizar 1 secret.
- Próximo passo sugerido: ligar cap diário Apify antes de divulgar publicamente.
