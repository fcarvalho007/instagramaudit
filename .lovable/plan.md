## Diagnóstico

Abri a ficha de cliente (`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`) e cruzei com os valores reais na BD e o modal de onboarding. Encontrei 4 problemas reais:

### 1. Erro "Rendered fewer hooks than expected" — bug de ordem de hooks

`LeadDetailSheet` faz `if (!lead) return null` na **linha 658**, mas chama `useMemo(nextStepCta)` na **linha 727**, depois do early-return. Quando o sheet abre/fecha (ou troca de lead), o React vê um número diferente de hooks entre renders → exactamente o erro reportado.

**Fix:** mover o `useMemo` para **antes** do `if (!lead) return null` e lidar com `lead` possivelmente nulo dentro do callback (devolver `null` se for o caso). Sem isto o "Try again" só funciona porque o ErrorBoundary descarta e remonta — o bug volta sempre.

### 2. Dados inventados que não vêm do modal (rótulos out-of-sync)

`src/lib/admin/lead-context-labels.ts` está dessincronizado com os valores que o modal de onboarding grava em `leads`. Cruzei com a BD:

| Campo | Valores reais na BD | Mapeados em PT? | O que aparece hoje |
|---|---|---|---|
| `profile_ownership` | `own_profile`, `brand_profile`, `client_profile`, `curiosity` | só os 2 primeiros (e parcialmente) | `brand_profile` → **"Brand profile"** (humanização) |
| `purpose` | `improve_content`, `grow_audience`, `validate_brand` | só `improve_content` e `grow_audience` | `validate_brand` → **"Validate brand"** (em inglês) |
| `source` | `public_report_unlock` (todos os 8 leads) | ❌ não mapeado | **"Public report unlock"** (em inglês) |

Já existem rótulos em PT bonitos em `src/i18n/locales/pt/gate.json` (linhas 107-118) — usados pelo modal que o lead vê — mas estão duplicados/divergentes do que admin mostra. Solução: alinhar `lead-context-labels.ts` com os mesmos valores PT que o modal usa, cobrindo **todos** os valores do enum + o `competitor_research`/`benchmark_competitors` em falta.

### 3. "Intenção" misturada com dados que o lead preencheu

No grid "Contexto do lead", o campo **Intenção: Baixo — sem relatório** está visualmente igual aos campos que vêm do modal (Relação/Objetivo/Origem). Mas é heurística derivada (`deriveIntentSignal`), não input do utilizador. Isto cria a percepção de "dado inventado" exactamente como o user reclama.

**Fix:** ou tirar do grid e mover para o callout do "Próximo passo" (onde o sinal pertence), ou marcar visualmente como derivado (badge "automático" + cor mais subtil). Proposta: mover, porque já temos o "Próximo passo" mesmo acima — fica naturalmente como contexto da sugestão.

### 4. Tabs com pouca legibilidade

Tabs actuais usam `text-admin-text-tertiary` (cinzento muito apagado) e só ganham cor quando activos. O user pede mais clareza/destaque.

**Fix:** subir contraste — inactivos para `text-secondary` (legível), activo para `text-primary` com **font-semibold** + underline accent já existente. Espaçamento entre tabs sobe ligeiramente para respirar.

---

## Plano de execução

### Ficheiro 1 — `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`

**A. Corrigir ordem de hooks (bug crítico)**

Mover `useMemo(nextStepCta)` para imediatamente antes de `if (!lead) return null`. Dentro do callback, devolver `null` se `!lead`. Manter as dependências como estão.

**B. Tabs com mais clareza**

No `TabsTrigger` (linha 842), trocar:

```text
text-admin-text-tertiary
hover:text-admin-text-secondary
data-[state=active]:text-admin-text-primary
```

por:

```text
text-admin-text-secondary font-medium
hover:text-admin-text-primary
data-[state=active]:text-admin-text-primary
data-[state=active]:font-semibold
```

E aumentar gap do `TabsList` de `gap-6` para `gap-7` (respiração).

**C. Tirar "Intenção" do grid de contexto**

No grid "Contexto do lead" (linhas 878-899), remover o 4º `ContextField` (Intenção). A intenção continua exposta no callout "Próximo passo" + na vista de Feedback. Grid passa a 3 campos honestos: Relação · Objetivo · Origem (todos do modal).

### Ficheiro 2 — `src/lib/admin/lead-context-labels.ts`

Alinhar com o que o modal de onboarding grava hoje e com os PT-PT do `gate.json`. Adicionar todos os valores em falta:

```ts
PROFILE_OWNERSHIP_LABELS:
  own_profile        → "É o meu perfil pessoal"
  brand_profile      → "É o perfil da minha marca"      // NOVO
  client_profile     → "É o perfil de um cliente"
  competitor_research→ "Estou a observar concorrência"   // NOVO
  curiosity          → "Estou só a explorar"             // NOVO

PURPOSE_LABELS:
  improve_content       → "Melhorar o conteúdo"          // alinhar
  benchmark_competitors → "Comparar com concorrentes"    // NOVO
  grow_audience         → "Crescer a audiência"          // alinhar
  validate_brand        → "Validar a presença da marca"  // NOVO
  client_report         → "Preparar análise para cliente" // NOVO (modal)

SOURCE_LABELS:
  public_report_unlock  → "Desbloqueio de relatório público"  // NOVO
  public_report_gate    → "Gate de relatório público"          // NOVO (default da tabela)
```

Manter alias antigos por compatibilidade (own, mine, etc.) sem alterar comportamento, mas adicionar comment explicando que os valores canónicos vêm do modal.

### Sem migração

A correcção é só de UI + tradução de rótulos. Os dados na BD estão correctos.

### Verificação

```bash
bunx tsc --noEmit
bun vitest run src/components/admin/v2/beta-leads/__tests__/
```

Smoke manual:
- Abrir kanban → clicar num card de lead → ficha abre **sem erro de hooks**
- Fechar → reabrir → continuar sem erro
- Trocar entre leads → sem erro
- Confirmar que Relação/Objetivo/Origem aparecem em PT-PT (sem "Brand profile" nem "Public report unlock")
- Confirmar que tabs "Resumo / Relatórios / Feedback / Histórico" estão legíveis em estado inactivo

## Checkpoint

- ☐ Hook order corrigido — erro "Rendered fewer hooks than expected" desaparece
- ☐ Rótulos de Relação/Objetivo/Origem em PT-PT, alinhados com os do modal
- ☐ Tabs com contraste suficiente quando inactivas + activa com peso e cor
- ☐ Grid "Contexto do lead" reduzido a 3 campos honestos (todos do modal); "Intenção" derivada deixa de se passar por input do lead
- ☐ `bunx tsc --noEmit` e vitest de beta-leads limpos
- ☐ Nenhuma alteração na BD nem nas APIs