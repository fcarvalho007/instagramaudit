## Auditoria: INTERNAL_API_TOKEN no fluxo de geração de relatórios beta

### 1. Comportamento atual

| Componente | O que faz com o token |
|---|---|
| `generate-beta-report.ts` (L125-136) | Lê `INTERNAL_API_TOKEN`. Se existe, envia `Authorization: Bearer {token}`. **Se não existe, faz a chamada sem header de auth.** |
| `analyze-public-v1.ts` (L386-397) | Quando `?refresh=1`, verifica o token. **Se `INTERNAL_API_TOKEN` não está definido no server, `expected` é `null` e o `if (expected && ...)` falha — o `refresh` é silenciosamente ignorado.** A análise segue pelo caminho de cache. |
| `run-report-pipeline.ts` (L142-148) | **Bloqueia** se o token não existe — marca `failed_pdf` e aborta. Correto. |
| `send-report-email.ts` (L87-91) | **Bloqueia** se o token não existe. Correto. |
| `enrich-snapshot.ts` / `enrich-comments.ts` | Verificam o token. Se não existe, rejeitam. Correto. |

### 2. Risco identificado

**Cenário crítico:** Se `INTERNAL_API_TOKEN` não estiver configurado em produção:

1. Admin clica "Gerar relatório" → `generate-beta-report` chama `/api/analyze-public-v1?refresh=1` **sem** header de auth.
2. `analyze-public-v1` vê `?refresh=1` mas o token é inválido → **ignora o refresh silenciosamente**.
3. A chamada devolve dados de cache (ou `CACHE_ONLY_NO_DATA`), não dados fresh.
4. O report request é marcado como "completed" com **dados stale ou sem dados**.
5. O admin não recebe nenhum erro explícito — **falha silenciosa**.

**Severidade: Média.** Não há fuga de dados nem exposição pública, mas há risco operacional de gerar relatórios vazios/stale sem aviso.

### 3. Rota pública?

`/api/analyze-public-v1` está em `/api/` (não em `/api/public/`), mas **não tem middleware de autenticação** a nível de rota. É acessível publicamente. Sem o token, um visitante público pode fazer `POST /api/analyze-public-v1` e receber dados de cache — o que é intencional (é a rota do relatório público). O `?refresh=1` é o gate que protege chamadas fresh, e esse gate **depende do token**.

Se alguém adivinhar o token, pode forçar refresh e gastar créditos Apify. Mas a probabilidade é baixa com um token forte.

### 4. Recomendação

**Fail-fast em produção:** `generate-beta-report` deve recusar continuar se `INTERNAL_API_TOKEN` não está definido — tal como `run-report-pipeline` já faz.

Alterações propostas (para implementação futura, **zero código agora**):

1. **`generate-beta-report.ts`** — Adicionar guarda antes da chamada (entre L122 e L123):
   ```
   if (!process.env.INTERNAL_API_TOKEN) {
     → rollback status para failed
     → devolver 409 com erro "INTERNAL_API_TOKEN não configurado"
   }
   ```

2. **Painel de diagnósticos** — Já mostra se o token está configurado. Sem alteração necessária.

3. **Sem alteração a `analyze-public-v1`** — O comportamento de ignorar `refresh` sem token é correto (protege créditos).

### 5. Prompt de implementação

Quando quiseres avançar, usa este prompt:

> "No `generate-beta-report.ts`, adiciona um pre-flight check para `INTERNAL_API_TOKEN` entre o passo 8 (set processing) e o passo 9 (call analyze). Se o token não existir, faz rollback do status para o valor original e devolve 409 com `preflight_blocked: 'internal_token_missing'`. Não alteres mais nenhum ficheiro."

### Resumo

| Aspeto | Estado |
|---|---|
| Token usado em generate-beta-report | Opcional (bug) |
| Token usado em run-report-pipeline | Obrigatório ✓ |
| Token usado em send-report-email | Obrigatório ✓ |
| Token usado em enrich-* | Obrigatório ✓ |
| analyze-public-v1 público | Sim, intencional |
| ?refresh=1 protegido | Sim, pelo token |
| Risco de falha silenciosa | Sim, se token em falta |
| Recomendação | Tornar obrigatório em generate-beta-report |
