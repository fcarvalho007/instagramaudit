## Pendência

`IntentOpportunitiesSection` já está alinhado (aceita `period` e usa o endpoint novo). Falta apenas a `TopProfilesSection`, que ainda não recebe `period` e por isso o ranking não acompanha o seletor de janela no topo de `/admin/perfis`.

## Plano

### 1. `src/components/admin/v2/perfis/top-profiles-section.tsx`

- Aceitar prop `period: AdminPeriod`.
- Incluir `period` na `queryKey` e na URL: `/api/admin/profiles/list?period=${period}`.
- Trocar o subtitle e o `info` para refletir a janela activa ("ranking por análises na janela"), já que `analyses` no payload é `analyses_in_window` (snapshots reais na janela).
- Ajustar fallback de UI: se `top.length === 0` mostrar copy compatível com janela seleccionada ("Sem análises nesta janela.").

### 2. `src/routes/admin.perfis.tsx`

- Passar `period={period}` ao `<TopProfilesSection />`.

### Fora de scope

- Endpoint `profiles.list.ts` já aceita `period` e devolve `analyses_in_window`. Sem alterações.

## Checkpoint

- ☐ `TopProfilesSection` aceita e propaga `period` para o endpoint e queryKey.
- ☐ `/admin/perfis` passa `period` à secção.
- ☐ Mudar a janela no topo actualiza o ranking sem refresh.
- ☐ Build verde.
