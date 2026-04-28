# Pré-smoke OpenAI — alinhamento e secrets

## Auditoria do estado actual

Verifiquei os 4 pontos que levantaste contra o código e a base de dados.

### 1. Migração `provider_call_logs` — JÁ APLICADA ✅

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='provider_call_logs'
  AND column_name IN ('model','prompt_tokens','completion_tokens','total_tokens');
```

Resultado:

```text
completion_tokens | integer
model             | text
prompt_tokens     | integer
total_tokens      | integer
```

Foi aplicada no prompt anterior (`20260428174855_…sql`). **Nenhuma migração nova é necessária.** O log de custo está pronto a receber dados quando o OpenAI for ligado.

### 2. Nome do secret — JÁ CORRECTO no código ✅

`rg "OPENAI_MODEL" src/` confirma que **não existe nenhuma referência a `OPENAI_MODEL`**. O código lê:

- `OPENAI_INSIGHTS_MODEL` — em `src/lib/insights/openai-insights.server.ts:135`
- `OPENAI_ENABLED` / `OPENAI_TESTING_MODE` / `OPENAI_ALLOWLIST` — em `src/lib/security/openai-allowlist.ts`
- `OPENAI_DAILY_CAP_USD` — em `src/lib/insights/openai-insights.server.ts:52`

O default em `cost.ts` é `gpt-4.1-mini`, alinhado com a tua proposta.

### 3. Tabela de preços `cost.ts`

Anotado como follow-up de revisão pré-produção. Para a fase actual de allowlist controlada com `frederico.m.carvalho` o valor estimado é aceitável. Vai ficar marcado como TODO no admin cockpit, sem alteração agora.

### 4. Mapping para o report web e PDF — JÁ FEITO ✅

- Web: `src/lib/report/snapshot-to-report-data.ts` lê `normalized_payload.ai_insights_v1` (prompt 4).
- PDF: `src/lib/pdf/render.ts` + `report-document.tsx` adicionam a página "Leitura estratégica" (prompt 5).

Quando o snapshot tiver `ai_insights_v1`, ambas as superfícies activam-se automaticamente. Sem ele, comportamento actual mantém-se.

## Sequência ainda pendente

Dos 8 passos que listaste:

| # | Passo | Estado |
|---|-------|--------|
| 1 | Esperar prompt actual | feito |
| 2 | Validar typecheck/build | a correr neste prompt |
| 3 | Migração provider_call_logs | **já aplicada** |
| 4 | Configurar secrets | **pendente — acção do utilizador** |
| 5 | Smoke test controlado | depois de (4) |
| 6 | Confirmar `ai_insights_v1` no snapshot | depois de (5) |
| 7 | Confirmar `provider_call_logs` com tokens/custo | depois de (5) |
| 8 | Ligar ao report web | **já mapeado**, activa automaticamente |

## O que este prompt vai fazer

### A. Validação de tipos e build (passo 2)

```bash
bunx tsc --noEmit
```

Sem alterações de código. Só uma confirmação de que tudo o que foi acumulado nos prompts 1–6 compila limpo.

### B. Pedido controlado dos secrets em falta (passo 4)

Já configurado no projecto: `OPENAI_API_KEY` ✅.

Ainda não configurados (todos com kill-switch a "false" por segurança):

| Secret | Valor recomendado | Função |
|---|---|---|
| `OPENAI_ENABLED` | `false` | Kill-switch hard. Mantém-se em `false` até o smoke test. |
| `OPENAI_TESTING_MODE` | `true` | Restringe à allowlist. |
| `OPENAI_ALLOWLIST` | `frederico.m.carvalho` | Único handle autorizado durante a fase beta. |
| `OPENAI_INSIGHTS_MODEL` | `gpt-4.1-mini` | Modelo. Default do código já é este, mas explícito é melhor. |
| `OPENAI_DAILY_CAP_USD` | `5` | Tecto de gasto diário (default do código também é 5). |

**Importante**: vou pedi-los **um a um** com o `add_secret` para garantir que o utilizador valida cada valor. `OPENAI_ENABLED` fica em `false` neste prompt — só é flipado para `true` no prompt seguinte, imediatamente antes do smoke test.

### C. Sem migrações, sem código novo, sem chamadas a providers

Nada de Apify, DataForSEO ou OpenAI durante este prompt. Apenas:
- typecheck;
- pedido de secrets via `add_secret`;
- relatório de o que está pronto e o que falta.

## O que NÃO vai fazer (próximo prompt)

- Flip do `OPENAI_ENABLED=true` (depende de aprovação explícita).
- Smoke test em `frederico.m.carvalho` (passos 5–7).
- Verificação SQL pós-run em `analysis_snapshots.normalized_payload->'ai_insights_v1'` e `provider_call_logs`.
- Revisão da tabela de preços `cost.ts` para produção (marcado como TODO admin).

## Validação

- `bunx tsc --noEmit` passa.
- Secrets pedidos via `add_secret`, um a um.
- Estado final: tudo pronto para correr o smoke test no próximo prompt, basta flipar `OPENAI_ENABLED=true`.

## Returns

- Confirmação que migração provider_call_logs **já foi aplicada** no prompt anterior.
- Confirmação que código já usa `OPENAI_INSIGHTS_MODEL`, não `OPENAI_MODEL`.
- Confirmação que mapping web e PDF já estão prontos.
- Lista de secrets em falta + pedidos via `add_secret`.
- Próximo passo único: flip de `OPENAI_ENABLED` para `true` + smoke test.
