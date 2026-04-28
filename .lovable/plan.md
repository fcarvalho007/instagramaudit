# Alinhar OpenAI Insights para `gpt-5.4-nano`

## Correcção do meu erro anterior

Confirmei na página oficial da OpenAI que o modelo `gpt-5.4-nano` existe — está descrito em [developers.openai.com/api/docs/models](https://developers.openai.com/api/docs/models) como variante low-latency/low-cost da família GPT-5.4. Estava errado a sugerir `gpt-4.1-mini` como única opção válida. Avançamos com `gpt-5.4-nano`.

## Estado actual

`OPENAI_API_KEY` já está configurado (verificado em `secrets--fetch_secrets` no prompt anterior). Os 5 secrets de configuração também já existem (`OPENAI_ENABLED`, `OPENAI_TESTING_MODE`, `OPENAI_ALLOWLIST`, `OPENAI_INSIGHTS_MODEL`, `OPENAI_DAILY_CAP_USD`) — estão à espera dos valores finais que vais aplicar tu manualmente em Project Settings → Secrets.

`src/lib/insights/cost.ts` actualmente:
- `DEFAULT_OPENAI_MODEL = "gpt-4.1-mini"`
- `FALLBACK_MODEL = "gpt-4.1-mini"`
- Tabela: `gpt-4.1-mini` ($0.40/$1.60), `gpt-5-mini` ($0.25/$2.00)

## O que este prompt vai fazer

### 1. Editar `src/lib/insights/cost.ts`

- Adicionar entrada `gpt-5.4-nano`: `inputPerMillion: 0.20`, `outputPerMillion: 1.25`.
- **Manter** as duas entradas existentes (`gpt-4.1-mini`, `gpt-5-mini`) intactas.
- Mudar `DEFAULT_OPENAI_MODEL` para `"gpt-5.4-nano"`.
- Mudar `FALLBACK_MODEL` para `"gpt-5.4-nano"` (ficando alinhado com o default — qualquer modelo desconhecido cai para o nano, que é o mais barato dos três e o que tens activo).
- Sem outras alterações ao módulo: continua puro, sem I/O.

### 2. Não tocar em mais nada de código

- `src/lib/insights/openai-insights.server.ts` já lê `OPENAI_INSIGHTS_MODEL` do env (linha 135) e cai para `DEFAULT_OPENAI_MODEL` se vazio. Vai herdar `gpt-5.4-nano` automaticamente.
- `src/lib/security/openai-allowlist.ts` continua igual.
- `src/routes/api/analyze-public-v1.ts` não muda.
- Sem alterações de UI, sem alterações em `/report.example`, sem tocar em `LOCKED_FILES.md`.

### 3. Sem chamadas a providers

- Sem chamadas a OpenAI, Apify, DataForSEO ou Resend.
- Apenas edição local do ficheiro `cost.ts`, typecheck e build.

### 4. Validação

- `bunx tsc --noEmit` (deve passar — só mudei strings literais e adicionei uma entrada num Record).
- `bun run build` (idem).
- `grep` rápido para confirmar que nenhum outro ficheiro tinha `"gpt-4.1-mini"` hardcoded fora de `cost.ts`. Se tiver, deixo nota mas **não** mudo (`cost.ts` é o single source of truth, mas posso ter de atualizar testes ou docs).

## Acção tua, manual (não posso fazer eu)

Os tools de write de secrets não estão disponíveis neste turno. Tens de aplicar tu, em **Project Settings → Secrets**, os valores finais:

| Secret | Valor |
|---|---|
| `OPENAI_ENABLED` | `true` |
| `OPENAI_TESTING_MODE` | `true` |
| `OPENAI_ALLOWLIST` | `frederico.m.carvalho` |
| `OPENAI_INSIGHTS_MODEL` | `gpt-5.4-nano` |
| `OPENAI_DAILY_CAP_USD` | `5` |
| `OPENAI_API_KEY` | já configurado ✅ |

`APIFY_TESTING_MODE=false` mantém-se (já configurado) — qualquer perfil Instagram público é analisável.

## O que NÃO vai fazer

- Não corre smoke test (passo 4 explicitamente: "Do not call OpenAI yet").
- Não muda UI.
- Não toca em `/report.example` nem em ficheiros listados em `LOCKED_FILES.md`.
- Não altera o pipeline de `analyze-public-v1` nem o gate de allowlist Apify.

## Validação esperada

- `bunx tsc --noEmit`: passa.
- `bun run build`: passa.
- `grep "gpt-4.1-mini\|gpt-5-mini\|gpt-5.4-nano" src/lib/insights/cost.ts`: 3 entradas distintas presentes.
- Confirmação de que nenhuma chamada a provider foi feita (não há código novo que invoque `fetch` para OpenAI; `cost.ts` é puro).

## Returns

- Diff do `cost.ts`.
- Output do typecheck e build.
- Lista de secrets que ainda precisas de configurar manualmente.
- Próximo passo único quando os secrets estiverem todos: aprovar smoke test em `frederico.m.carvalho`.
