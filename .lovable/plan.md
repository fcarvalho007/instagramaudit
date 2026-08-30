# Activar a Auditoria Instantânea gratuita (Nível 1)

## Objectivo

A auditoria base (janela baseline, sem concorrentes) passa a ser gratuita para toda a gente — anónimos e leads identificados, mesmo com saldo 0. Créditos e entitlements ficam reservados às funcionalidades que realmente os consomem: concorrentes e janelas Pro (30d/90d).

## O que muda

### 1. Flag em produção

Definir `PUBLIC_BASELINE_NO_EMAIL=true` como secret do backend (hoje não está definida em lado nenhum, logo assume `false` e o gate de créditos dispara).

Documentar em `docs/KILL_SWITCHES.md` a nova semântica: a flag significa "baseline gratuita" (`PUBLIC_BASELINE_FREE`), não apenas "sem email". Sem renomear a variável nesta ronda, para não partir ambientes.

### 2. Baseline gratuita também para leads identificados

Em `src/routes/api/analyze-public-v1.ts` (~linha 668), a condição actual exige `readLeadIdFromRequest(request) === null`. Passa a ser:

```text
freeBaseline = flag activa && !isInternalBypass && zero concorrentes && janela baseline
```

Com lead presente:

- o `leadId` continua a ser lido, para histórico e associação;
- **não** corre `reserveCredit`, `confirmReservation` nem qualquer escrita de débito em `credit_ledger`;
- a associação `lead_reports` (`upsertLeadReport`) passa a ser feita no fim do caminho gratuito, fora do ciclo de reserva, quando existir snapshot utilizável — mantendo-se idempotente por `UNIQUE(lead_id, cache_key)`.

Os gates de concorrentes, 30d/90d, kill-switch do 90d, orçamentos Pro e bypass interno ficam exactamente como estão.

### 3. Rate limiting

O tecto apertado por IP do baseline anónimo passa a aplicar-se a todo o baseline gratuito (com ou sem lead), somado aos limites públicos já existentes e ao cache de 24 h. É esta a protecção de custo, já que o crédito deixa de o ser.

### 4. Comment Intelligence

Verificação por código e teste de que `runCommentUnlock` não toca em créditos (a leitura actual mostra apenas verificação de posse do relatório, sem reserva nem débito). Se aparecer alguma dependência de saldo, é removida.

### 5. Copy

Garantir que "Sem créditos disponíveis" e mensagens de "relatórios gratuitos esgotados" não podem surgir no caminho baseline — esses códigos só permanecem acessíveis a fluxos que consomem créditos.

## Testes

Unitários/contrato:

- baseline com lead de saldo 0 → sucesso, zero linhas novas em `credit_ledger`;
- baseline sem cookie de lead → sucesso;
- baseline repetida dentro do TTL → cache, sem chamada a provider;
- concorrentes sem entitlement → continua `COMPETITORS_REQUIRE_PRO`;
- 30d/90d sem entitlement → continua `WINDOW_REQUIRES_PRO`;
- unlock de comentários com saldo 0 → sucesso e zero débito.

E2E no preview autenticado com o teu lead a 0 créditos:

- A. browser limpo, sem email → baseline;
- B. lead com 0 créditos → baseline;
- C. lead com 0 créditos + cache miss → baseline fresh;
- D. `credit_ledger` inalterado nos casos A–C;
- E/F. email → Comment Intelligence com saldo 0, sem débito;
- G/H. concorrentes e janelas continuam bloqueados;
- I. repetição dentro do TTL serve cache.

## Entrega final

Relatório com: valor efectivo da flag em produção, resultado A–I, saldo do lead antes/depois, contagem de linhas em `credit_ledger` antes/depois, e confirmação de baseline anónima, baseline identificada e Comment Intelligence com saldo zero. A flag fica `true` no fim — não é restaurada.

## Notas técnicas

- Ficheiros tocados: `src/routes/api/analyze-public-v1.ts`, `docs/KILL_SWITCHES.md`, testes em `src/routes/api/__tests__/`.
- Sem alterações a pagamentos, Pro, `/report.example`, onboarding visual ou arquitectura de providers.
