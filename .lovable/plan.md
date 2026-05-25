## Diagnóstico

Confirmei o estado real do switch "Usar dados guardados / Buscar dados novos":

1. **Persistência: OK.** O clique grava em `app_config.analysis_execution_mode`. DB mostra `value='fresh'`, atualizado hoje às 09:39 UTC pela ação do admin.
2. **Leitura: OK.** `getAnalysisExecutionMode()` lê da DB com TTL em memória de 30 s.
3. **Enforcement em `/api/analyze-public-v1`: OK.** Quando o modo é `cache_only` e não existe snapshot válido, devolve stale ou `CACHE_ONLY_NO_DATA` — nenhuma chamada Apify/OpenAI/DataForSEO acontece.

## Por que parece que "não está a ativar/desativar a cache"

São 3 efeitos reais, nenhum deles é o switch estar partido:

### A. Quando o snapshot está fresco, os dois modos servem cache
Os últimos 15 eventos em `analysis_events` são todos `data_source=cache, outcome=success`. O perfil `frederico.m.carvalho` tem cache válido até 07/06, portanto qualquer pedido devolve cache — independentemente do modo. A diferença só é visível quando a cache expira ou está em falta. Visualmente parece que "nada muda".

### B. "Atualizar agora" nos perfis de teste IGNORA o modo (by design)
O botão "Atualizar agora" usa `/api/admin/refresh-profile` → `analyze-public-v1?refresh=1` com `INTERNAL_API_TOKEN`. Esse caminho **salta o guard de modo** propositadamente (ver comentário em `analyze-public-v1.ts:471-474`). Resultado: mesmo com "Usar dados guardados — SEM CUSTOS" ativo, clicar Atualizar agora gasta dinheiro. Isto contradiz a promessa visual do switch.

### C. Cache em memória de 30 s por Worker
Cada instância serverless tem o seu próprio cache de modo. A ação do admin invalida a instância que recebeu o POST, mas outras instâncias podem servir o modo antigo até 30 s. Aceitável, mas a UI pode dar a ilusão de "não mudou".

## Riscos adicionais encontrados

- **`getExecutionMode` / `setExecutionMode` não têm guard de admin.** São server functions sem `requireAdminSession`/middleware. Qualquer caller autenticado (ou não) que conheça o nome pode ler/alterar o modo. Devia exigir sessão de admin.

## Correções propostas (visuais + comportamentais, sem mexer em lógica de produto)

1. **Bloquear "Atualizar agora" quando o modo é `cache_only`** (`test-profiles-card.tsx`):
   - Ler `getExecutionMode` no card; quando `cache_only`, desativar o botão "Atualizar agora" com tooltip "Modo dados guardados ativo — muda para 'Buscar dados novos' para permitir chamadas pagas".
   - Alternativa mais permissiva: manter clicável mas abrir confirmação extra a avisar que vai chamar APIs pagas apesar de estar em modo cache_only. Recomendo a primeira (bloquear) porque alinha com a promessa "SEM CUSTOS".

2. **Adicionar `requireAdminSession` a `getExecutionMode` e `setExecutionMode`** (`src/server/admin/execution-mode.functions.ts`):
   - Envolver os handlers num check de sessão admin (mesmo padrão usado em `/api/admin/force-refresh.ts`). Devolver 401/403 quando não há sessão admin.

3. **Feedback visual imediato após toggle** (`execution-mode-card.tsx`):
   - Mostrar `toast.success("Modo alterado para …")` no `onSuccess` da mutation. Hoje o toggle muda silenciosamente — contribui para a sensação de "não aconteceu nada".
   - Adicionar nota inline: "Pode demorar até 30 s a propagar entre instâncias do servidor."

4. **Verificação ao vivo (opcional, mesmo turno):** depois das mudanças, fazer um teste manual:
   - Pôr o modo em `cache_only`.
   - Expirar o snapshot do `frederico.m.carvalho` via "Forçar atualização" → confirmar que o próximo `GET /api/analyze-public-v1?username=...` devolve `CACHE_ONLY_NO_DATA` (ou serve stale) e cria um `analysis_event` com `outcome='blocked_cache_only'`.
   - Voltar a pôr `fresh` e repetir → confirmar `outcome='success'` com `data_source='fresh'` e linhas em `provider_call_logs`.

## Ficheiros a tocar

- `src/server/admin/execution-mode.functions.ts` — adicionar guard admin.
- `src/components/admin/v2/sistema/execution-mode-card.tsx` — toast + nota de propagação.
- `src/components/admin/v2/sistema/test-profiles-card.tsx` — desativar "Atualizar agora" quando `cache_only`.

## Fora de âmbito

- Não tocar em `/report.example`, RLS, pipeline de enriquecimento, nem nos endpoints públicos de análise.
- Não alterar a lógica de bypass do `forceRefresh` no `analyze-public-v1` (o bypass continua válido para automações internas — o que mudamos é a UI esconder o botão quando o modo global é cache_only).
