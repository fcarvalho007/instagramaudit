## Problema

No card de "Perfis de teste" (admin / sistema), depois de clicar em **Atualizar agora**, a UI não responde a duas perguntas básicas:

a) **Quando** foi feita a última atualização da cache?
b) **Até quando** essa cache é válida?

Hoje só aparece `expira em 0h`, sem timestamp absoluto, sem hora exata e sem indicação clara da última sincronização. Quando passa de 0h o utilizador fica sem saber se está em segundos, minutos ou horas, e o cabeçalho mostra `cache válida 0h` mesmo quando há um snapshot fresco.

Os dados já existem no servidor (`latestSnapshotDate`, `snapshotExpiresAt` em `getTestProfileStatuses`); o trabalho é apenas de apresentação fiável no frontend.

## O que vai mudar (frontend, sem alterar lógica de negócio)

Ficheiro único: `src/components/admin/v2/sistema/test-profiles-card.tsx`.

### 1. Linha de metadados de cada perfil

Substituir o atual `expira em Xh` por dois campos explícitos, sempre com timestamp absoluto + tempo relativo, e com unidade adequada (segundos / minutos / horas / dias):

```text
Última atualização: há 3 min  ·  09/05 12:15
Cache válida até:    daqui a 23 h 57 min  ·  10/05 12:15
```

Quando a cache expirou, o segundo campo passa a:
```text
Cache expirada há 2 h 14 min  ·  09/05 10:01
```

Estado vazio (perfil ainda nunca foi analisado): `Sem cache · nunca atualizado`.

### 2. Tooltip com horas exatas

Cada um dos dois campos tem `title` com a data ISO completa em hora local pt-PT (ex.: `09/05/2026, 12:15:42`), para auditoria rápida sem abrir DevTools.

### 3. Cabeçalho da secção

`0 perfis prontos · cache válida 0h` é enganador. Passa a refletir o estado real:
- Se algum perfil tem cache válida: `2 perfis prontos · próxima expiração daqui a 4 h`.
- Se todos expiraram: `0 perfis prontos · todas as caches expiradas`.
- Sem perfis: `Sem perfis configurados`.

### 4. Bloco "Última tentativa"

Manter o bloco já existente, mas garantir consistência:
- Mostrar `Última tentativa: há 12 s · sucesso` (relativo + absoluto no `title`).
- Persistir a última tentativa entre re-renders enquanto o componente estiver montado (já é o comportamento, só validar).
- Após sucesso, invalidar tanto `["admin","test-profiles"]` como `["admin","preflight",handle]` (já é feito) **e** forçar `refetch()` imediato para que os timestamps mostrem a nova `updated_at` sem esperar pelo `staleTime`.

### 5. Auto-refresh dos rótulos relativos

Adicionar um `useEffect` com `setInterval` de 30 s só para forçar re-render dos labels relativos ("há X min", "daqui a Y h"). Sem refetch — apenas atualização visual via `useState` tick. Garante que "expira em 0h" não fica congelado.

### 6. Helpers locais (no mesmo ficheiro)

Pequenas funções puras, sem dependências novas:
- `formatRelative(date: Date, now: Date)` → "há 3 min", "daqui a 2 h 14 min", "há 1 d 4 h".
- `formatAbsoluteShort(date: Date)` → "09/05 12:15".
- `formatAbsoluteFull(date: Date)` → "09/05/2026, 12:15:42" (para `title`).

Tudo em pt-PT via `Intl.DateTimeFormat("pt-PT", …)`.

## Detalhes técnicos

- Não mexer no servidor. `latestSnapshotDate` e `snapshotExpiresAt` já vêm corretos.
- Não mexer em `analyze-public-v1`, `refresh-profile`, nem em RLS.
- Não introduzir bibliotecas (`date-fns` etc.) — basta `Intl` + aritmética simples.
- Sem alteração de tokens de design; usar apenas tokens existentes (`text-admin-text-tertiary`, `text-admin-text-secondary`, badges atuais).
- Mobile: a linha de metadados continua em `flex-wrap` para não causar overflow no viewport 375 px.

## Checkpoint final

☐ Card mostra "Última atualização" com tempo relativo + absoluto curto + tooltip com hora exata.
☐ Card mostra "Cache válida até" (ou "Cache expirada há") com a mesma estrutura.
☐ Cabeçalho da secção descreve corretamente o estado agregado (sem mais "0h" enganador).
☐ Após clicar em "Atualizar agora" com sucesso, os timestamps mudam imediatamente.
☐ Labels relativos atualizam-se a cada 30 s sem precisar de refresh manual.
☐ Tudo em pt-PT, sem alterações no servidor nem nos endpoints.